/**
 * Botões de dano e cura nas mensagens do chat.
 *
 * Mensagens: toda rolagem de dano/cura do sistema passa por criarMensagemDeDano, que grava
 *   flags["icarus-rpg"].dano = { rollType: "dano"|"cura", total, tipo, componentes: [{tipo, valor}],
 *   perda, critico, alvoUuid }. A barra de botões é montada na renderização (não fica no HTML salvo),
 *   então mensagens recarregadas e antigas mostram a barra certa.
 * Botões: Aplicar dano · Metade · Dobro (opção do mundo) · Curar · Perda de PV (ignora resistências).
 * Alvos: os tokens marcados (T); sem alvo, os selecionados. Lembretes de turno já sabem o ator.
 * Permissão: o jogador altera direto os atores que possui; para os outros, pede ao Mestre ativo pelo
 *   socket (ação "dano:aplicar"). O Mestre recalcula o valor pela mensagem (o jogador não manda número).
 * Registro: flags["icarus-rpg"].aplicacoes (alvo, antes, depois, cálculo, quem), mostrado na própria
 *   mensagem ("Aplicado em X (−11)", cálculo na dica); sem mensagem de confirmação. O Mestre desfaz a última.
 * Regras do cálculo: module/dano-aplicacao.mjs. PV temporários ainda não existem no modelo.
 */
import { SISTEMA_ID, REGRAS_DANO } from "./config.mjs";
import {
  ACOES, calcularAplicacao, validarPedido, dadosDaMensagem, botoesDaBarra, valorDoBotao,
  ultimaDesfazivel, textoDoRegistro
} from "./dano-aplicacao.mjs";
import { registrarDanoEmMorrendo } from "./morte-foundry.mjs";
import { aplicarCondicao } from "./condicoes-foundry.mjs";
import { alvosDaAreaDeOutraMagia } from "./magias-area.mjs";

const F = SISTEMA_ID;
const CANAL = `system.${SISTEMA_ID}`;
const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);
const T = `systems/${SISTEMA_ID}/templates/chat`;
const cfg = k => game.settings.get(F, k);
const esc = s => foundry.utils.escapeHTML?.(String(s)) ?? String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

export const nomeDoTipo = tipo => loc(`ICARUS.TiposDano.${tipo || "dano"}`);

/* ------------------------------ Criar as mensagens ------------------------------ */

/**
 * Única função que cria mensagens de dano/cura do sistema.
 * @param {object} p
 * @param {Actor|null} p.actor
 * @param {Roll[]} p.rolls
 * @param {"dano"|"cura"} [p.rollType]
 * @param {{tipo:string, valor:number}[]} p.componentes  um por tipo de dano
 * @param {object} p.card      dados do templates/chat/dano.hbs (arma, texto, tipos, critico, mult, extra)
 * @param {boolean} [p.perda]  perda de PV (ignora resistências)
 * @param {string|null} [p.alvoUuid]  aplica direto nesse ator (lembretes de turno)
 * @param {object} [p.flags]   outras flags do sistema
 */
export async function criarMensagemDeDano({ actor = null, rolls = [], rollType = "dano", componentes, card, perda = false, critico = false, alvoUuid = null, flags = {} }) {
  const total = componentes.reduce((s, c) => s + c.valor, 0);
  const content = await renderTemplate(`${T}/dano.hbs`, { ...card, total, cura: rollType === "cura", critico: !!critico || !!card.critico });
  const dados = {
    speaker: actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker(),
    content,
    rolls,
    flags: { [F]: { ...flags, dano: { rollType, total, tipo: componentes[0]?.tipo || "dano", componentes, perda: !!perda, critico: !!critico, alvoUuid }, aplicacoes: [] } }
  };
  if (rolls.length) dados.sound = CONFIG.sounds.dice;
  ChatMessage.applyRollMode(dados, game.settings.get("core", "rollMode"));
  return ChatMessage.create(dados);
}

/**
 * Rolagem de dano ou cura sem arma, com os botões de aplicar.
 * - formula + tipo: um tipo só (ex.: Em Chamas 1d6 de fogo).
 * - partes: [{ formula, tipo }] para dano de vários tipos (ex.: 6d6 elétrico + 6d6 impacto).
 * - cura: true para rolagens de cura (botão Curar).
 * - alvoUuid: aplica direto nesse ator (lembretes de turno); sem ele, nos alvos/selecionados.
 */
export async function rolarDanoAvulso({ formula, tipo = "dano", partes = null, titulo, img = "icons/svg/fire.svg", actor = null, perda = false, cura = false, alvoUuid = null, flags = {} }) {
  const lista = partes?.length ? partes : [{ formula, tipo }];
  const rolls = [];
  for (const p of lista) rolls.push(await new Roll(p.formula).evaluate());
  const componentes = lista.map((p, i) => ({ tipo: cura ? "dano" : p.tipo || "dano", valor: Math.max(0, rolls[i].total) }));
  const tipos = cura ? "" : perda ? loc("ICARUS.Dano.PerdaDePV") : [...new Set(componentes.map(c => nomeDoTipo(c.tipo)))].join(" e ");
  return criarMensagemDeDano({
    actor, rolls, rollType: cura ? "cura" : "dano", componentes, perda, alvoUuid, flags,
    card: {
      arma: { nome: titulo, img: cura && img === "icons/svg/fire.svg" ? "icons/svg/regen.svg" : img },
      texto: lista.map((p, i) => (lista.length > 1 && !cura ? `${p.formula} (${nomeDoTipo(componentes[i].tipo)})` : p.formula)).join(" + "),
      tipos,
      partes: lista.length > 1 ? componentes.map(c => ({ nome: nomeDoTipo(c.tipo), valor: c.valor })) : null
    }
  });
}

/** Rolagem de cura (botão Curar). */
export const rolarCura = ({ formula, titulo, img = "icons/svg/regen.svg", actor = null, flags = {} }) => rolarDanoAvulso({ formula, titulo, img, actor, cura: true, flags });

/* ------------------------------ Aplicar ------------------------------ */

/** Ator e nome de um alvo (TokenDocument ou Actor). */
const atorDe = alvo => (alvo?.documentName === "Token" ? alvo.actor : alvo);
const nomeDe = alvo => alvo?.name ?? atorDe(alvo)?.name ?? "?";

/**
 * Aplica um botão num alvo (quem chama já tem permissão sobre o ator). Devolve linha e registro.
 */
/**
 * Quem pode absorver parte de um dano antes de aplicar (ex.: Escolta Contratada do Nobre):
 * async (alvo, actor, calc) => ({ absorvido: number, texto: string } | null). Só o modo "dano".
 */
export const ABSORVEDORES_DE_DANO = [];

/** Depois de aplicar dano (não cura) num ator: async (actor, dano) => void. Ex.: Teste de Concentração. */
export const AO_SOFRER_DANO = [];

async function aplicarNoAlvo(alvo, botao, dados, usuarioId) {
  const actor = atorDe(alvo);
  const nome = nomeDe(alvo);
  if (!actor?.system?.pv) return { linha: fmt("ICARUS.Dano.SemPV", { nome }) };
  if (botao === "cura") {
    if (actor.statuses?.has("dead")) return { linha: fmt("ICARUS.Dano.MortoNaoCura", { nome }) };
    // Animal do Vínculo Selvagem: só a invocação devolve os PV (regra do Patrulheiro)
    if (actor.getFlag?.(F, "vinculo")) return { linha: fmt("ICARUS.Patrulheiro.NaoCura", { animal: nome }) };
  }
  const calc = calcularAplicacao({
    acao: botao, componentes: dados.componentes, resistencias: actor.system.resistencias,
    pv: actor.system.pv, regras: REGRAS_DANO, nomeDoTipo
  });
  // Absorção (Escolta Contratada): tira do dano final antes de mexer nos PV
  let absorcao = "";
  if (calc.modo === "dano" && calc.final > 0) {
    for (const fn of ABSORVEDORES_DE_DANO) {
      const r = await fn(alvo, actor, calc);
      if (!r?.absorvido) continue;
      const a = Math.min(r.absorvido, calc.final);
      calc.final -= a;
      calc.depois = Math.max(0, calc.antes - calc.final);
      calc.detalhe += ` → ${r.texto} −${a} → ${calc.final}`;
      absorcao = r.texto;
      if (!calc.final) break;
    }
  }
  const morrendo = actor.statuses?.has("morrendo");
  const naoLetal = calc.modo !== "cura" && dados.naoLetal;
  // Não letal: não deixa Morrendo (opção lida em morte-foundry.mjs)
  if (calc.depois !== calc.antes) await actor.update({ "system.pv.value": calc.depois }, naoLetal ? { icarusNaoLetal: true } : {});
  const depois = actor.system.pv.value;
  // Dano sofrido em Morrendo: 1 falha no teste de morte (2 se crítico), como no botão da ficha
  if (calc.modo !== "cura" && calc.final > 0 && calc.antes === 0 && morrendo && !naoLetal) await registrarDanoEmMorrendo(actor, dados.critico);
  if (calc.modo !== "cura" && calc.final > 0) {
    for (const fn of AO_SOFRER_DANO) { try { await fn(actor, calc.final); } catch (erro) { console.error("Icarus RPG | ao sofrer dano", erro); } }
  }
  // A 0 PV por dano não letal: se rende (Diplomacia) ou fica Apavorado e foge (Intimidação)
  let rendeu = "";
  if (naoLetal && depois === 0 && calc.antes > 0) {
    if (dados.naoLetal.pericia === "intimidacao") await aplicarCondicao(actor, "apavorado");
    rendeu = loc(dados.naoLetal.pericia === "intimidacao" ? "ICARUS.Nobre.Foge" : "ICARUS.Nobre.SeRende");
  }
  const diff = depois - calc.antes;
  const sinal = diff > 0 ? `+${diff}` : diff < 0 ? `−${-diff}` : "0";
  const linha = fmt("ICARUS.Dano.Linha", { nome, sinal, detalhe: calc.detalhe, antes: calc.antes, depois })
    + (depois === 0 && calc.modo !== "cura" ? ` · ${rendeu || loc("ICARUS.Dano.ZeroPV")}` : "");
  return {
    linha,
    registro: {
      alvo: nome, tokenUuid: alvo?.documentName === "Token" ? alvo.uuid : null, actorUuid: actor.uuid,
      botao, antes: calc.antes, depois, detalhe: linha, usuario: usuarioId, quando: Date.now(), desfeita: false
    }
  };
}

/**
 * Aplica em vários alvos e grava o registro na própria mensagem (sem mensagem nova no chat:
 * o cálculo fica na dica do "Aplicado em …"). Só o que não pôde ser aplicado vira aviso.
 */
async function aplicarEmVarios(mensagem, alvos, botao, dados, usuarioId) {
  const falhas = [];
  const registros = [];
  for (const alvo of alvos) {
    const r = await aplicarNoAlvo(alvo, botao, dados, usuarioId);
    if (r.registro) registros.push(r.registro);
    else falhas.push(r.linha);
  }
  if (registros.length) await registrar(mensagem, registros);
  avisarFalhas(falhas, usuarioId);
  return registros;
}

function avisarFalhas(falhas, usuarioId) {
  if (!falhas.length) return;
  const texto = falhas.join(" · ");
  if (usuarioId === game.user.id) ui.notifications.warn(texto);
  else game.socket.emit(CANAL, { acao: "dano:recusa", para: usuarioId, texto });
}

/* Gravações nas flags da mensagem: uma de cada vez neste cliente (não perde registro em cliques rápidos). */
let fila = Promise.resolve();
const emFila = fn => (fila = fila.then(fn, fn).catch(err => console.error("Icarus RPG | registro de dano", err)));

/** Acrescenta registros na mensagem (direto, se pode; senão pelo Mestre). */
function registrar(mensagem, registros) {
  if (mensagem.isOwner) {
    return emFila(async () => {
      const atual = mensagem.getFlag(F, "aplicacoes") ?? [];
      await mensagem.setFlag(F, "aplicacoes", [...atual, ...registros].slice(-100));
    });
  }
  game.socket.emit(CANAL, { acao: "dano:registro", mensagemId: mensagem.id, registros });
}

/** Clique num botão: escolhe os alvos e aplica (direto ou pelo Mestre). */
async function aoClicar(mensagem, botao) {
  const dados = dadosDaMensagem(mensagem.flags?.[F], mensagem.rolls, { qualquerRolagem: cfg("danoQualquerRolagem") });
  if (!dados) return;

  // Lembretes de turno: o ator já é conhecido
  if (dados.alvoUuid) {
    const actor = fromUuidSync(dados.alvoUuid);
    if (!actor) return ui.notifications.warn(loc("ICARUS.Dano.SemSelecao"));
    if (!actor.isOwner) return ui.notifications.warn(fmt("ICARUS.Dano.SemPermissao", { nome: actor.name }));
    return aplicarEmVarios(mensagem, [actor], botao, dados, game.user.id);
  }

  let marcados = [...(game.user.targets ?? [])].map(t => t.document).filter(Boolean);
  // Alvos que a área de OUTRA magia marcou: não valem para este dano (usa os tokens selecionados)
  if (alvosDaAreaDeOutraMagia(marcados.map(t => t.uuid), mensagem.flags?.[F]?.magia?.id)) {
    marcados = [];
    ui.notifications.info(loc("ICARUS.Dano.IgnorouAlvosDaArea"));
  }
  const origem = marcados.length ? "alvos" : "selecionados";
  const tokens = marcados.length ? marcados : (canvas?.tokens?.controlled ?? []).map(t => t.document);
  if (!tokens.length) return ui.notifications.warn(loc("ICARUS.Dano.SemSelecao"));

  // Um ator vinculado com dois tokens sofre uma vez só
  const vistos = new Set();
  const unicos = tokens.filter(t => {
    const chave = t.actorLink ? t.actor?.uuid : t.uuid;
    if (!t.actor || vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });
  const proprios = unicos.filter(t => game.user.isGM || t.actor.isOwner);
  const outros = unicos.filter(t => !proprios.includes(t));

  if (outros.length) {
    const modo = cfg("danoJogadoresOutros");
    const nomes = outros.map(t => t.name).join(", ");
    if (modo === "nunca") ui.notifications.warn(fmt("ICARUS.Dano.SemPermissao", { nome: nomes }));
    else if (modo === "alvos" && origem !== "alvos") ui.notifications.warn(fmt("ICARUS.Dano.MarqueOAlvo", { nome: nomes }));
    else if (!game.users.activeGM) ui.notifications.warn(loc("ICARUS.Dano.SemMestre"));
    else game.socket.emit(CANAL, { acao: "dano:aplicar", botao, mensagemId: mensagem.id, alvos: outros.map(t => t.uuid), origem });
  }
  if (proprios.length) await aplicarEmVarios(mensagem, proprios, botao, dados, game.user.id);
}

/**
 * Voltar: desfaz a última aplicação desta mensagem (PV volta ao valor anterior).
 * O Mestre desfaz qualquer uma; o jogador, só a que ele mesmo aplicou (pelo Mestre, que confere).
 */
async function desfazer(mensagem, usuarioId = game.user.id) {
  const lista = foundry.utils.deepClone(mensagem.getFlag(F, "aplicacoes") ?? []);
  const i = ultimaDesfazivel(lista);
  if (i < 0) return;
  const a = lista[i];
  if (!game.user.isGM) {
    if (a.usuario !== game.user.id) return;
    if (!game.users.activeGM) return ui.notifications.warn(loc("ICARUS.Dano.SemMestre"));
    return game.socket.emit(CANAL, { acao: "dano:desfazer", mensagemId: mensagem.id });
  }
  if (usuarioId !== game.user.id && a.usuario !== usuarioId) return recusar(usuarioId, "ICARUS.Dano.PedidoInvalido");
  const alvo = a.tokenUuid ? fromUuidSync(a.tokenUuid) : null;
  const actor = alvo?.actor ?? fromUuidSync(a.actorUuid);
  if (actor) await actor.update({ "system.pv.value": a.antes }, { icarusDesfazer: true });
  else ui.notifications.warn(fmt("ICARUS.Dano.DesfazerSemAlvo", { nome: a.alvo }));
  lista[i].desfeita = true;
  await emFila(() => mensagem.setFlag(F, "aplicacoes", lista));
  if (usuarioId === game.user.id) ui.notifications.info(fmt("ICARUS.Dano.Desfeito", { nome: a.alvo, pv: a.antes }));
}

/* ------------------------------ Socket (lado do Mestre) ------------------------------ */

/** O jogador pode ver esta mensagem? (sussurros e rolagens às cegas) */
function podeVerMensagem(mensagem, usuario) {
  if (usuario.isGM) return true;
  if (mensagem.blind) return false;
  return !mensagem.whisper?.length || mensagem.whisper.includes(usuario.id) || mensagem.author?.id === usuario.id;
}

function recusar(para, chave, dados = {}) {
  game.socket.emit(CANAL, { acao: "dano:recusa", para, texto: fmt(chave, dados) });
}

/** Mensagens do socket (exportada para os testes). */
export async function aoReceberDano(msg, remetente) {
  if (!msg?.acao?.startsWith("dano:")) return;
  const de = typeof remetente === "string" ? remetente : msg.userId;
  if (msg.acao === "dano:recusa") {
    if (msg.para === game.user.id && game.users.get(de)?.isGM) ui.notifications.warn(String(msg.texto ?? ""));
    return;
  }
  // Daqui para baixo, só o Mestre ativo executa (um só, mesmo com dois Mestres)
  if (!game.users.activeGM?.isSelf) return;
  const usuario = game.users.get(de);
  if (!usuario?.active) return;
  const mensagem = game.messages.get(msg?.mensagemId);
  if (!mensagem || !podeVerMensagem(mensagem, usuario)) return recusar(de, "ICARUS.Dano.PedidoInvalido");

  if (msg.acao === "dano:registro") {
    // Registro de aplicações que o jogador fez nos próprios atores (mensagem de outra pessoa)
    const registros = (Array.isArray(msg.registros) ? msg.registros : []).slice(0, 50).filter(r => {
      const actor = r && typeof r.actorUuid === "string" ? fromUuidSync(r.actorUuid) : null;
      return actor?.testUserPermission?.(usuario, "OWNER") && ["antes", "depois"].every(k => Number.isInteger(r[k]) && r[k] >= 0 && r[k] <= 99999);
    }).map(r => ({
      alvo: fromUuidSync(r.tokenUuid ?? "")?.name ?? fromUuidSync(r.actorUuid).name, tokenUuid: typeof r.tokenUuid === "string" ? r.tokenUuid : null,
      actorUuid: r.actorUuid, botao: ACOES.includes(r.botao) ? r.botao : "dano",
      antes: r.antes, depois: r.depois, detalhe: typeof r.detalhe === "string" ? r.detalhe.slice(0, 300) : "", usuario: de, quando: Date.now(), desfeita: false
    }));
    if (registros.length) await registrar(mensagem, registros);
    return;
  }

  // Jogador pede para voltar a última aplicação que ele fez
  if (msg.acao === "dano:desfazer") return desfazer(mensagem, de);

  if (msg.acao !== "dano:aplicar") return;
  const pedido = validarPedido(msg);
  if (!pedido) return recusar(de, "ICARUS.Dano.PedidoInvalido");
  const modo = cfg("danoJogadoresOutros");
  if (modo === "nunca") return recusar(de, "ICARUS.Dano.OutrosProibido");
  // O valor vem da mensagem, nunca do pedido
  const dados = dadosDaMensagem(mensagem.flags?.[F], mensagem.rolls, { qualquerRolagem: cfg("danoQualquerRolagem") });
  if (!dados || dados.alvoUuid) return recusar(de, "ICARUS.Dano.PedidoInvalido");
  const cena = usuario.viewedScene;
  const marcados = new Set([...(usuario.targets ?? [])].map(t => t.document?.uuid));
  const alvos = [];
  for (const uuid of pedido.alvos) {
    const token = fromUuidSync(uuid);
    if (!token?.actor || token.parent?.id !== cena) return recusar(de, "ICARUS.Dano.ForaDaCena");
    // "Só alvos marcados": o Mestre confere os alvos que o Foundry sincroniza para cada usuário
    if (modo === "alvos" && marcados.size && !marcados.has(uuid)) return recusar(de, "ICARUS.Dano.MarqueOAlvo", { nome: token.name });
    alvos.push(token);
  }
  await aplicarEmVarios(mensagem, alvos, pedido.botao, dados, de);
}

/* ------------------------------ Barra de botões ------------------------------ */

const ICONES = { dano: "fa-droplet", metade: "fa-shield-halved", dobro: "fa-angles-up", cura: "fa-hand-holding-medical", perda: "fa-heart-crack" };
const DICAS = { dano: "ICARUS.Dano.DicaAplicar", metade: "ICARUS.Dano.DicaAplicar", dobro: "ICARUS.Dano.DicaAplicar", cura: "ICARUS.Dano.DicaCurar", perda: "ICARUS.Dano.DicaPerda" };
const ROTULOS = { dano: "ICARUS.Dano.Aplicar", metade: "ICARUS.Dano.Metade", dobro: "ICARUS.Dano.Dobro", cura: "ICARUS.Dano.Curar", perda: "ICARUS.Dano.AplicarPerda" };

/** HTML da barra e do registro (exportada para os testes do navegador). */
export function htmlDaBarra(dados, aplicacoes = [], { dobro = false, mestre = false, usuario = null } = {}) {
  const botoes = botoesDaBarra(dados.rollType, { dobro }).map(b => {
    const n = valorDoBotao(dados.total, b);
    const dica = esc(fmt(DICAS[b], { n }));
    return `<button type="button" class="ap-${b}" data-icarus-botao="${b}" title="${dica}" aria-label="${esc(loc(ROTULOS[b]))}: ${dica}">`
      + `<i class="fa-solid ${ICONES[b]}" aria-hidden="true"></i><span>${esc(loc(ROTULOS[b]))}</span></button>`;
  }).join("");
  // Voltar: o Mestre sempre; o jogador, se a última aplicação foi dele
  const ultima = aplicacoes[ultimaDesfazivel(aplicacoes)];
  const desfazer = ultima && (mestre || (usuario && ultima.usuario === usuario))
    ? `<button type="button" class="ap-desfazer" data-icarus-desfazer title="${esc(loc("ICARUS.Dano.Desfazer"))}" aria-label="${esc(loc("ICARUS.Dano.Desfazer"))}"><i class="fa-solid fa-rotate-left" aria-hidden="true"></i><span>${esc(loc("ICARUS.Dano.Voltar"))}</span></button>`
    : "";
  const registro = aplicacoes.length
    ? `<div class="icarus-aplicacoes">${esc(loc("ICARUS.Dano.AplicadoEm"))} ${aplicacoes.slice(-8).map(a => `<span class="${a.desfeita ? "desfeita" : ""}"${a.detalhe ? ` title="${esc(a.detalhe)}"` : ""}>${esc(textoDoRegistro(a))}</span>`).join(", ")}${aplicacoes.length > 8 ? " …" : ""}</div>`
    : "";
  return `<div class="icarus-aplicar" role="group" aria-label="${esc(loc("ICARUS.Dano.Grupo"))}">${botoes}${desfazer}</div>${registro}`;
}

function aoRenderizar(mensagem, html) {
  const raiz = html instanceof HTMLElement ? html : html?.[0];
  if (!raiz) return;
  const flags = mensagem.flags?.[F];
  const dados = dadosDaMensagem(flags, mensagem.rolls, { qualquerRolagem: cfg("danoQualquerRolagem") && mensagem.isRoll });
  if (!dados) return;
  if (mensagem.isContentVisible === false) return;
  // Mensagens antigas tinham os botões no HTML salvo: saem e entra a barra nova
  raiz.querySelectorAll(".rolagem-botoes:has([data-icarus-aplicar])").forEach(b => {
    if (b.nextElementSibling?.matches(".linha-municao")) b.nextElementSibling.remove();
    b.remove();
  });
  const conteudo = raiz.querySelector(".icarus-rolagem") ?? raiz.querySelector(".message-content") ?? raiz;
  const caixa = document.createElement("div");
  caixa.className = "icarus-aplicar-caixa";
  caixa.innerHTML = htmlDaBarra(dados, flags?.aplicacoes ?? [], { dobro: cfg("danoBotaoDobro"), mestre: game.user.isGM, usuario: game.user.id });
  conteudo.appendChild(caixa);
  caixa.querySelectorAll("[data-icarus-botao]").forEach(botao => {
    botao.addEventListener("click", async ev => {
      ev.preventDefault();
      if (botao.disabled) return;
      // Evita o duplo clique acidental
      botao.disabled = true;
      setTimeout(() => { botao.disabled = false; }, 500);
      try { await aoClicar(mensagem, botao.dataset.icarusBotao); } catch (err) { console.error("Icarus RPG | aplicar dano", err); }
    });
  });
  caixa.querySelector("[data-icarus-desfazer]")?.addEventListener("click", ev => {
    ev.preventDefault();
    ev.currentTarget.disabled = true;
    desfazer(mensagem);
  });
}

/* ------------------------------ Registro ------------------------------ */

export function registrarBotoesDeDano() {
  Hooks.once("init", () => {
    game.settings.register(F, "danoJogadoresOutros", {
      name: "ICARUS.Dano.Config.Outros", hint: "ICARUS.Dano.Config.OutrosDica",
      scope: "world", config: true, type: String, default: "alvos",
      choices: { alvos: "ICARUS.Dano.Config.OutrosAlvos", sempre: "ICARUS.Dano.Config.OutrosSempre", nunca: "ICARUS.Dano.Config.OutrosNunca" }
    });
    game.settings.register(F, "danoBotaoDobro", {
      name: "ICARUS.Dano.Config.Dobro", hint: "ICARUS.Dano.Config.DobroDica",
      scope: "world", config: true, type: Boolean, default: false, onChange: () => ui.chat?.render?.()
    });
    game.settings.register(F, "danoQualquerRolagem", {
      name: "ICARUS.Dano.Config.Qualquer", hint: "ICARUS.Dano.Config.QualquerDica",
      scope: "world", config: true, type: Boolean, default: false, onChange: () => ui.chat?.render?.()
    });
  });
  Hooks.once("ready", () => game.socket.on(CANAL, aoReceberDano));
  // v13: renderChatMessageHTML (HTMLElement); v12: renderChatMessage (jQuery)
  Hooks.once("setup", () => {
    if ((game.release?.generation ?? 12) >= 13) Hooks.on("renderChatMessageHTML", aoRenderizar);
    else Hooks.on("renderChatMessage", aoRenderizar);
  });
}

/** Compatibilidade: aplica o dano informado nos tokens selecionados (API antiga game.icarus.aplicarDano). */
export async function aplicarNosSelecionados(valor, tipo, { modo = "dano", multiplicador = 1 } = {}) {
  const total = Math.max(0, Math.trunc(Number(valor) || 0));
  const botao = modo === "perda" ? "perda" : multiplicador === 0.5 ? "metade" : multiplicador === 2 ? "dobro" : "dano";
  const tokens = (canvas?.tokens?.controlled ?? []).map(t => t.document).filter(t => t.actor?.isOwner);
  if (!tokens.length) return ui.notifications.warn(loc("ICARUS.Dano.SemSelecao"));
  const linhas = [];
  for (const t of tokens) linhas.push((await aplicarNoAlvo(t, botao, { componentes: [{ tipo: tipo || "dano", valor: total }], critico: false }, game.user.id)).linha);
  ui.notifications.info(linhas.join(" · "));
  return linhas;
}
