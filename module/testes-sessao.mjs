/**
 * Teste Oposto e Teste de Resistência no Foundry: sessão sincronizada por socket.
 *
 * Canal "system.icarus-rpg" (system.json → "socket": true). O Mestre que inicia é o anfitrião:
 * guarda o estado autoritativo e só ele aceita rolagens (module/testes.mjs valida permissão,
 * d20 e total). Mensagens:
 *   testes:abrir        anfitrião → todos   abre a tela com o estado (também "Reenviar tela")
 *   testes:estado       anfitrião → todos   estado novo (rolagem aceita, resolução, rolar de novo)
 *   testes:rolou        cliente → anfitrião rolagem de um participante
 *   testes:pedirEstado  cliente → anfitrião quem (re)conectou pede o estado atual
 *   testes:cancelar     anfitrião → todos   fecha as telas, sem resultado
 *   testes:fechar       anfitrião → todos   "Fechar para todos" (depois do resultado)
 * O emissor não recebe a própria mensagem: o anfitrião aplica localmente o que emite.
 * Se o anfitrião sair, a sessão se perde: os outros veem um aviso e a tela fecha.
 */
import { SISTEMA_ID, PERICIAS, ICONE_PADRAO } from "./config.mjs";
import { registrarRolagem, resolver, rolarNovamente, resultadoInicial, todosRolaram, podeRolar, bonusDoItem } from "./testes.mjs";
import { TelaTeste } from "./apps/teste-tela.mjs";
import { abrirPainelDoMestre } from "./sheets/painel-condicoes.mjs";
import { rolarD20, modoD20, minimoDasFlags, efeitoDaManobra } from "./combate.mjs";
import { vantagemDaRolagem, escoposDaPericia } from "./rolls.mjs";
import { minimoD20DeHabilidades } from "./classes-dados.mjs";

const CANAL = `system.${SISTEMA_ID}`;
const TEMPLATE_CHAT = `systems/${SISTEMA_ID}/templates/testes/chat.hbs`;
const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);

/** Estado da sessão neste cliente (no anfitrião, é o autoritativo). */
let sessao = null;

export const sessaoAtual = () => sessao;
export const souAnfitriao = () => !!sessao && sessao.gmId === game.user.id;
const opcoesDeRolagem = () => ({ mestreRolaPorJogador: game.settings.get(SISTEMA_ID, "mestreRolaPorJogador") });

function emitir(acao, dados = {}) {
  game.socket.emit(CANAL, { acao, ...dados, userId: game.user.id });
}

/* ---------------------------- Participantes ---------------------------- */

/** Rótulo de um item de teste ("Atletismo", "Força"). */
export function rotuloDoItem(item) {
  if (!item) return "";
  if (item.tipo === "ataque") return fmt("ICARUS.Manobra.ItemAtaque", { pericia: loc(`ICARUS.Pericias.${item.chave === "pontaria" ? "pontaria" : "luta"}`) });
  return item.tipo === "atributo" ? loc(`ICARUS.Atributos.${item.chave}`) : loc(`ICARUS.Pericias.${item.chave}`);
}

/** Dica com as parcelas do bônus ("Destreza +3 · Treinado +2 · Abalado −2"). */
export function textoDosDetalhes(detalhes = []) {
  const sinal = v => (v < 0 ? `−${Math.abs(v)}` : `+${v}`);
  return detalhes.map(d => {
    const nome = d.chave === "atributo" ? loc(`ICARUS.Atributos.${d.origem}`)
      : d.chave === "condicao" && d.origem ? d.origem
      : loc(`ICARUS.Testes.Parcelas.${d.chave}`);
    return `${nome} ${sinal(d.valor)}`;
  }).join(" · ");
}

/** Ator e token de um uuid (token da cena ou ator do mundo). */
export function resolverUuid(uuid) {
  const doc = uuid ? fromUuidSync(uuid) : null;
  if (!doc) return { actor: null, token: null };
  if (doc.documentName === "Token") return { actor: doc.actor, token: doc };
  if (doc.documentName === "Actor") return { actor: doc, token: null };
  return { actor: null, token: null };
}

/** Jogadores (não-Mestre) donos do ator. */
export const donosJogadores = actor => game.users.filter(u => !u.isGM && actor?.testUserPermission(u, "OWNER"));

/**
 * Nome mostrado: o do token quando é um token não vinculado com nome próprio ("Goblin 1"),
 * senão o do ator.
 */
export function nomeDoParticipante(actor, token) {
  if (token && !token.actorLink && token.name) return token.name;
  return actor?.name ?? token?.name ?? "?";
}

export const retratoDoParticipante = (actor, token) => token?.texture?.src || actor?.img || ICONE_PADRAO;

/** Escopos das flags de vantagem/mínimo para o item testado. */
const escoposDoItem = item => (item?.tipo === "pericia" ? escoposDaPericia(item.chave) : item?.tipo === "atributo" ? [`atributo.${item.chave}`] : item?.tipo === "ataque" ? ["ataque"] : []);

/**
 * Monta um participante a partir de um uuid e do item testado (lê o bônus da ficha).
 * modo: "normal" | "vantagem" | "desvantagem" escolhido pelo Mestre; soma com as flags do ator
 * (não acumulam; vantagem + desvantagem se anulam).
 */
export function montarParticipante(uuid, item, indice, { modo = "normal" } = {}) {
  const { actor, token } = resolverUuid(uuid);
  if (!actor) return null;
  const donos = donosJogadores(actor);
  const itens = actor.items.map(i => ({ id: i.id, type: i.type, system: i.system }));
  const b = bonusDoItem(actor.system, item, itens) ?? { bonus: 0, detalhes: [], falhaAuto: null };
  const p = {
    id: `p${indice}`, uuid, nome: nomeDoParticipante(actor, token), img: retratoDoParticipante(actor, token),
    donos: donos.map(u => u.id), jogadores: donos.map(u => u.name),
    item: { ...item, rotulo: rotuloDoItem(item) },
    bonus: b.bonus, detalhes: b.detalhes, dica: textoDosDetalhes(b.detalhes), falhaAuto: b.falhaAuto
  };
  const v = vantagemDaRolagem(actor, escoposDoItem(item), { vantagem: modo === "vantagem", desvantagem: modo === "desvantagem" });
  p.vantagem = v.vantagem;
  p.desvantagem = v.desvantagem;
  p.modo = modoD20(v);
  p.minimo = Math.max(minimoDasFlags(actor.flags?.[SISTEMA_ID], escoposDoItem(item)) ?? 0,
    item?.tipo === "pericia" ? minimoD20DeHabilidades(actor.items, item.chave) ?? 0 : 0) || null;
  p.resultado = resultadoInicial(p);
  return p;
}

/* ------------------------------ Anfitrião ------------------------------ */

/** Começa uma sessão (o Mestre, pelos diálogos de configuração). */
export function iniciarSessao({ tipo, participantes, resistencia = null, manobra = null }) {
  if (!game.user.isGM) return ui.notifications.warn(loc("ICARUS.Testes.SoMestre"));
  if (sessao && sessao.status === "rolando" && souAnfitriao()) cancelar({ silencioso: true });
  sessao = {
    sessaoId: foundry.utils.randomID(), tipo, gmId: game.user.id, status: "rolando", rodada: 1,
    resistencia, participantes, resolucao: null, manobra
  };
  // Quem tem falha automática em todos (ex.: todos Indefesos) resolve na hora
  if (todosRolaram(sessao)) return concluir(sessao, { abrir: true });
  emitir("testes:abrir", { estado: sessao });
  TelaTeste.mostrar(sessao);
}

/** Aplica um estado novo no anfitrião e espalha. */
function publicar(estado) {
  sessao = estado;
  emitir("testes:estado", { estado });
  TelaTeste.atualizar(estado);
}

async function concluir(estado, { abrir = false } = {}) {
  const resolvido = resolver(estado);
  sessao = resolvido;
  if (abrir) {
    emitir("testes:abrir", { estado: resolvido });
    TelaTeste.mostrar(resolvido);
  } else publicar(resolvido);
  await postarResultado(resolvido);
}

/** Anfitrião recebe uma rolagem (de outro cliente ou dele mesmo). */
async function processarRolagem({ sessaoId, participanteId, d20, total, dados }, userId) {
  if (!souAnfitriao() || sessao.sessaoId !== sessaoId) return;
  const usuario = game.users.get(userId);
  const r = registrarRolagem(sessao, { participanteId, d20, total, dados }, usuario, opcoesDeRolagem());
  if (r.erro) {
    console.warn(`Icarus RPG | Rolagem descartada (${r.erro}) de ${usuario?.name ?? userId} para ${participanteId}.`);
    if (r.erro === "permissao") ui.notifications.warn(fmt("ICARUS.Testes.RolagemDescartada", { nome: usuario?.name ?? "?" }));
    return;
  }
  if (todosRolaram(r.estado)) return concluir(r.estado);
  publicar(r.estado);
}

/** Cancela o teste: fecha as telas de todos, aviso só para o Mestre. */
export async function cancelar({ silencioso = false } = {}) {
  if (!souAnfitriao()) return;
  emitir("testes:cancelar", { sessaoId: sessao.sessaoId });
  sessao = null;
  TelaTeste.fechar();
  if (!silencioso) {
    await ChatMessage.create({
      content: `<div class="icarus-rolagem"><div class="rolagem-tipo">${loc("ICARUS.Testes.Cancelado")}</div></div>`,
      whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id)
    });
  }
}

/** Reabre a tela em todos os clientes com o estado atual. */
export function reenviarTela() {
  if (!souAnfitriao()) return;
  emitir("testes:abrir", { estado: sessao });
  TelaTeste.mostrar(sessao);
}

/** Fecha a tela de todos (depois do resultado). */
export function fecharParaTodos() {
  if (!souAnfitriao()) return;
  emitir("testes:fechar", { sessaoId: sessao.sessaoId });
  sessao = null;
  TelaTeste.fechar();
}

/** Empate no Teste Oposto: os dois rolam de novo na mesma tela. */
export function repetirEmpate() {
  if (!souAnfitriao() || sessao.status !== "resolvido" || sessao.resolucao?.vencedorId) return;
  publicar(rolarNovamente(sessao));
}

/* ------------------------------ Rolagem ------------------------------- */

/** Este usuário pode rolar o dado deste participante? */
export const permissaoLocal = participante => podeRolar(participante, game.user, opcoesDeRolagem());

/**
 * Rola o d20 de um participante neste cliente: Roll real (1d20 + bônus da sessão), Dice So Nice
 * se existir, e envia ao anfitrião.
 */
export async function rolarParticipante(participanteId) {
  const p = sessao?.participantes.find(x => x.id === participanteId);
  if (!p || p.resultado || sessao.status !== "rolando") return null;
  if (!permissaoLocal(p).pode) return null;
  // d20 com vantagem/desvantagem (2d20kh / 2d20kl) e mínimo (Perícia Infalível) do participante
  const r = await rolarD20({ vantagem: p.vantagem, desvantagem: p.desvantagem, bonus: p.bonus, minimo: p.minimo });
  if (game.dice3d) await game.dice3d.showForRoll(r.roll, game.user, true);
  const dados = { sessaoId: sessao.sessaoId, participanteId, d20: r.d20, total: r.total, dados: r.dados };
  if (souAnfitriao()) await processarRolagem(dados, game.user.id);
  else emitir("testes:rolou", dados);
  return { d20: r.d20, total: r.total };
}

/* -------------------------------- Chat -------------------------------- */

async function postarResultado(estado) {
  const nomeDe = id => game.users.get(id)?.name ?? "";
  const linhas = estado.participantes.map(p => ({
    ...p,
    vencedor: estado.resolucao?.vencedorId === p.id,
    peloMestre: p.resultado?.peloMestre,
    rolouPor: p.resultado?.peloMestre ? nomeDe(p.resultado.rolouPor) : "",
    natural20: p.resultado?.d20 === 20, natural1: p.resultado?.d20 === 1
  }));
  const vencedor = linhas.find(l => l.vencedor);
  const r = estado.resistencia;
  // Manobra: o atacante (lado A) venceu? Efeito e botão do Mestre para aplicar a condição
  let manobra = null;
  if (estado.manobra) {
    const [a, b] = estado.participantes;
    const venceu = estado.resolucao?.vencedorId === a.id;
    const efeito = efeitoDaManobra(estado.manobra.id, venceu ? (a.resultado?.total ?? 0) - (b.resultado?.total ?? 0) : 0);
    manobra = {
      nome: loc(`ICARUS.Manobra.Tipos.${estado.manobra.id}`),
      venceu,
      efeito: venceu ? textoDoEfeito(estado.manobra.id, efeito, a.nome, b.nome) : fmt("ICARUS.Manobra.Resistiu", { alvo: b.nome }),
      condicao: venceu ? efeito.condicao : null,
      condicaoNome: efeito.condicao ? loc(`ICARUS.Manobra.Condicoes.${efeito.condicao}`) : "",
      alvoUuid: b.uuid
    };
  }
  const content = await renderTemplate(TEMPLATE_CHAT, {
    oposto: estado.tipo === "oposto",
    titulo: loc(estado.tipo === "oposto" ? "ICARUS.Testes.Oposto.Titulo" : "ICARUS.Testes.Resistencia.Titulo"),
    subtitulo: estado.tipo === "oposto"
      ? linhas.map(l => l.item.rotulo).join(" × ")
      : loc(`ICARUS.Pericias.${r.pericia}`),
    linhas, vencedor,
    empate: estado.tipo === "oposto" && !vencedor,
    motivoBonus: estado.resolucao?.motivo === "bonus",
    resistencia: r, resumo: estado.resolucao,
    falharamUuids: estado.tipo === "resistencia" ? linhas.filter(l => !l.passou).map(l => l.uuid).join(",") : "",
    manobra
  });
  return ChatMessage.create({
    content,
    speaker: { alias: loc(estado.tipo === "oposto" ? "ICARUS.Testes.Oposto.Titulo" : "ICARUS.Testes.Resistencia.Titulo") },
    flags: { [SISTEMA_ID]: { teste: estado } }
  });
}

/** Texto do efeito da manobra vencida pelo atacante. */
function textoDoEfeito(id, efeito, atacante, alvo) {
  if (id === "empurrar") return fmt("ICARUS.Manobra.Efeitos.empurrar", { alvo, metros: String(efeito.metros).replace(".", ",") });
  if (id === "desarmar") return fmt(efeito.empurraItem ? "ICARUS.Manobra.Efeitos.desarmarLonge" : "ICARUS.Manobra.Efeitos.desarmar", { alvo, atacante });
  return fmt(`ICARUS.Manobra.Efeitos.${id}`, { alvo, atacante });
}

/**
 * Inicia uma manobra (teste oposto: ataque do atacante × Fortitude do alvo). O Mestre inicia
 * direto; um jogador pede ao Mestre (que precisa estar conectado).
 * @param {{ manobra: string, atacanteUuid: string, alvoUuid: string, pericia: "luta"|"pontaria" }} pedido
 */
export function iniciarManobra(pedido) {
  if (!game.user.isGM) {
    if (!game.users.activeGM) return ui.notifications.warn(loc("ICARUS.Manobra.SemMestre"));
    emitir("testes:pedirManobra", { pedido });
    return ui.notifications.info(loc("ICARUS.Manobra.Pedido"));
  }
  const participantes = [
    montarParticipante(pedido.atacanteUuid, { tipo: "ataque", chave: pedido.pericia === "pontaria" ? "pontaria" : "luta" }, 0),
    montarParticipante(pedido.alvoUuid, { tipo: "pericia", chave: "fortitude" }, 1)
  ];
  if (participantes.some(p => !p)) return ui.notifications.warn(loc("ICARUS.Testes.AtorNaoEncontrado"));
  return iniciarSessao({ tipo: "oposto", participantes, manobra: { id: pedido.manobra } });
}

/* ------------------------------- Socket ------------------------------- */

function aoReceber(msg, remetente) {
  if (!msg?.acao?.startsWith("testes:")) return;
  // O servidor do Foundry acrescenta o id de quem enviou; sem ele, usa o que veio na mensagem
  const userId = typeof remetente === "string" ? remetente : msg.userId;
  switch (msg.acao) {
    case "testes:abrir":
      if (!game.users.get(userId)?.isGM) return;
      sessao = msg.estado;
      TelaTeste.mostrar(sessao);
      break;
    case "testes:estado":
      if (!game.users.get(userId)?.isGM || sessao?.sessaoId !== msg.estado?.sessaoId && !msg.para) return;
      if (msg.para && msg.para !== game.user.id) return;
      sessao = msg.estado;
      if (msg.para) TelaTeste.mostrar(sessao);
      else TelaTeste.atualizar(sessao);
      break;
    case "testes:pedirManobra":
      // Só o Mestre ativo atende, e só pedidos de quem é dono do atacante
      if (!game.user.isGM || (game.users.activeGM && !game.users.activeGM.isSelf)) return;
      if (!resolverUuid(msg.pedido?.atacanteUuid).actor?.testUserPermission(game.users.get(userId), "OWNER")) return;
      iniciarManobra(msg.pedido);
      break;
    case "testes:rolou":
      processarRolagem(msg, userId);
      break;
    case "testes:pedirEstado":
      if (souAnfitriao()) emitir("testes:estado", { estado: sessao, para: userId });
      break;
    case "testes:cancelar":
    case "testes:fechar":
      if (!game.users.get(userId)?.isGM || sessao?.sessaoId !== msg.sessaoId) return;
      if (msg.acao === "testes:cancelar") ui.notifications.info(loc("ICARUS.Testes.CanceladoPeloMestre"));
      sessao = null;
      TelaTeste.fechar();
      break;
  }
}

/* ------------------------------ Registro ------------------------------ */

/** Abre o diálogo de configuração do Teste Oposto (só o Mestre). */
export async function abrirOposto() {
  if (!game.user.isGM) return ui.notifications.warn(loc("ICARUS.Testes.SoMestre"));
  const { TesteOpostoConfig } = await import("./apps/teste-oposto-config.mjs");
  return new TesteOpostoConfig().render(true);
}

/** Abre o diálogo de configuração do Teste de Resistência (só o Mestre). */
export async function abrirResistencia(opcoes = {}) {
  if (!game.user.isGM) return ui.notifications.warn(loc("ICARUS.Testes.SoMestre"));
  const { TesteResistenciaConfig } = await import("./apps/teste-resistencia-config.mjs");
  return new TesteResistenciaConfig(opcoes).render(true);
}

/** Registra configurações, socket e hooks; devolve a API pública (game.icarus.testes). */
export function registrarTestes() {
  game.settings.register(SISTEMA_ID, "mestreRolaPorJogador", {
    name: "ICARUS.Config.MestreRolaPorJogador.Nome", hint: "ICARUS.Config.MestreRolaPorJogador.Dica",
    scope: "world", config: true, type: Boolean, default: false
  });
  game.settings.register(SISTEMA_ID, "animacoesTestes", {
    name: "ICARUS.Config.AnimacoesTestes.Nome", hint: "ICARUS.Config.AnimacoesTestes.Dica",
    scope: "client", config: true, type: Boolean, default: true
  });
  game.settings.register(SISTEMA_ID, "testesMostrarJogador", {
    name: "ICARUS.Config.TestesMostrarJogador.Nome", hint: "ICARUS.Config.TestesMostrarJogador.Dica",
    scope: "client", config: true, type: Boolean, default: true
  });

  Hooks.once("ready", () => {
    game.socket.on(CANAL, aoReceber);
    // Quem entra (ou volta) com um teste em andamento pede o estado ao Mestre
    if (!game.user.isGM) emitir("testes:pedirEstado");
  });

  // Card do Teste de Resistência: "Aplicar condição aos que falharam" (só o Mestre)
  Hooks.on("renderChatMessage", (mensagem, html) => {
    const raiz = html instanceof HTMLElement ? html : html?.[0];
    const botao = raiz?.querySelector("[data-icarus-teste-condicao]");
    if (!botao) return;
    if (!game.user.isGM) return botao.remove();
    botao.addEventListener("click", ev => {
      ev.preventDefault();
      abrirPainelDoMestre({ alvosUuids: botao.dataset.icarusTesteCondicao.split(",").filter(Boolean) });
    });
  });

  // Card da manobra: "Aplicar Agarrado/Caído" (só o Mestre, com um clique de confirmação)
  Hooks.on("renderChatMessage", (mensagem, html) => {
    const raiz = html instanceof HTMLElement ? html : html?.[0];
    const botao = raiz?.querySelector("[data-icarus-manobra-condicao]");
    if (!botao) return;
    if (!game.user.isGM) return botao.remove();
    botao.addEventListener("click", async ev => {
      ev.preventDefault();
      botao.disabled = true;
      const { aplicarCondicao } = await import("./condicoes-foundry.mjs");
      const doc = fromUuidSync(botao.dataset.uuid);
      if (doc) await aplicarCondicao(doc, botao.dataset.icarusManobraCondicao, { origem: "manobra" });
    });
  });

  // O anfitrião saiu: a sessão se perde
  Hooks.on("userConnected", (usuario, conectado) => {
    if (conectado || !sessao || usuario.id !== sessao.gmId || souAnfitriao()) return;
    sessao = null;
    TelaTeste.fechar();
    ui.notifications.warn(loc("ICARUS.Testes.MestreSaiu"));
  });

  return {
    abrirOposto, abrirResistencia, iniciarSessao, iniciarManobra, cancelar, reenviarTela, fecharParaTodos,
    rolarNovamente: repetirEmpate, sessaoAtual, pericias: () => PERICIAS
  };
}
