/**
 * Magias que dão bônus, penalidade ou condição: botões no cartão da magia.
 * - "Aplicar condição" / "Aplicar efeito": nos alvos marcados (T); sem alvo, nos tokens selecionados
 *   (efeito pessoal: no próprio conjurador). Condições vão pelo sistema de condições que já existe;
 *   bônus e penalidades viram um Efeito Ativo com o ícone e o nome da magia (aparece no token), só
 *   em campos que o sistema já tem (Defesa, perícias, resistências, RD e Redução por tipo).
 * - Bônus de Defesa de magias não acumulam: vale o maior (os menores ficam desligados).
 * - Aplicar de novo no mesmo alvo não duplica (mesma magia, mesmo conjurador).
 * - "Voltar": desfaz a última aplicação do cartão (remove o que ela criou e religa o que ela desligou).
 *   O Mestre volta qualquer uma; o jogador, a que ele aplicou.
 * - Tokens de outros jogadores: pedido ao Mestre ativo pelo socket ("magia:efeito" / "magia:voltar"),
 *   que confere (usuário ligado, mensagem visível, efeito existe na mensagem, token na cena vista).
 * - Duração: rodadas (com combate), cena/sustentada (somem no "Encerrar cena" e ao terminar o combate).
 */
import { SISTEMA_ID } from "./config.mjs";
import { aplicarCondicao } from "./condicoes-foundry.mjs";
import { mudancasParaEfeito, duracaoDoEfeito } from "./magias-dados.mjs";
import { CONDICAO_POR_ID } from "./condicoes.mjs";

const F = SISTEMA_ID;
const CANAL = `system.${SISTEMA_ID}`;
const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

/* ------------------------------ Aplicar num alvo ------------------------------ */

/** Efeitos de magia do ator que dão bônus de Defesa (para não acumular). */
const efeitosDeDefesa = actor => actor.effects.filter(e => (e.flags?.[F]?.magia?.defesaMagia ?? 0) > 0);

/**
 * Aplica um efeito da magia (acao do bloco de automação) no ator. Devolve o registro ou null.
 * @param {TokenDocument|Actor} alvo
 */
export async function aplicarEfeitoNoAlvo(alvo, acao, magia, usuarioId) {
  const actor = alvo?.documentName === "Token" ? alvo.actor : alvo;
  if (!actor) return null;
  const criados = [];
  const desligados = [];
  const dur = duracaoDoEfeito(acao.duracao, game.combat);
  const marca = { id: magia.id, conjurador: magia.actorUuid, mensagemId: magia.mensagemId };

  // Condições: pelo sistema de condições (sem duplicar: se já tem, não mexe)
  for (const id of acao.condicoes ?? []) {
    if (!CONDICAO_POR_ID[id] || actor.statuses?.has(id)) continue;
    const ef = await aplicarCondicao(actor, id, { duracao: dur.flag, rodadas: dur.duration.rounds ?? 1 });
    if (ef) { await ef.setFlag(F, "magia", marca); criados.push(ef.id); }
  }

  // Bônus e penalidades: um Efeito Ativo com o ícone da magia
  const { changes, defesaMagia } = mudancasParaEfeito(acao.mudancas);
  if (changes.length) {
    const jaTem = actor.effects.find(e => e.flags?.[F]?.magia?.id === magia.id && e.flags[F].magia.conjurador === magia.actorUuid && !e.flags[F].condicao);
    if (!jaTem) {
      let ligado = true;
      if (defesaMagia > 0) {
        const outros = efeitosDeDefesa(actor).filter(e => !e.disabled);
        const maior = Math.max(0, ...outros.map(e => e.flags[F].magia.defesaMagia));
        if (maior >= defesaMagia) ligado = false;
        else for (const e of outros) { await e.update({ disabled: true }); desligados.push(e.id); }
      }
      const [ef] = await actor.createEmbeddedDocuments("ActiveEffect", [{
        name: magia.nome, img: magia.img, origin: magia.itemUuid, disabled: !ligado, transfer: false,
        changes, duration: dur.duration,
        // Status próprio: o Foundry desenha o ícone da magia no token (efeito temporário)
        statuses: [`icarus-magia-${magia.id}`],
        description: acao.mudancas.filter(m => !changes.length || m).map(m => `${m.valor > 0 ? "+" : ""}${m.valor} ${m.chave}`).join(", "),
        flags: { [F]: { magia: { ...marca, defesaMagia }, duracao: dur.flag } }
      }]);
      if (ef) criados.push(ef.id);
    }
  }
  if (!criados.length && !desligados.length) return null;
  return {
    alvo: alvo.name ?? actor.name, tokenUuid: alvo.documentName === "Token" ? alvo.uuid : null, actorUuid: actor.uuid,
    criados, desligados, usuario: usuarioId, quando: Date.now(), desfeita: false
  };
}

/** Desfaz um registro: apaga o que criou e religa o que desligou. */
async function desfazerRegistro(r) {
  const alvo = r.tokenUuid ? fromUuidSync(r.tokenUuid) : null;
  const actor = alvo?.actor ?? fromUuidSync(r.actorUuid);
  if (!actor) return;
  const existentes = r.criados.filter(id => actor.effects.has(id));
  if (existentes.length) await actor.deleteEmbeddedDocuments("ActiveEffect", existentes);
  for (const id of r.desligados ?? []) await actor.effects.get(id)?.update({ disabled: false });
}

/* ------------------------------ Mensagem: registro ------------------------------ */

let fila = Promise.resolve();
const emFila = fn => (fila = fila.then(fn, fn).catch(err => console.error("Icarus RPG | efeitos de magia", err)));

const registrar = (mensagem, registros) => emFila(async () => {
  const atual = mensagem.getFlag(F, "efeitosAplicados") ?? [];
  await mensagem.setFlag(F, "efeitosAplicados", [...atual, ...registros].slice(-100));
});

const ultimaAtiva = lista => { for (let i = lista.length - 1; i >= 0; i--) if (!lista[i].desfeita) return i; return -1; };

/** Aplica (quem tem permissão sobre os atores: o próprio usuário ou o Mestre). */
async function aplicarEmVarios(mensagem, alvos, indice, usuarioId) {
  const magia = { ...mensagem.flags[F].magia, mensagemId: mensagem.id };
  const acao = magia.efeitos?.[indice];
  if (!acao) return;
  const registros = [];
  for (const alvo of alvos) {
    const r = await aplicarEfeitoNoAlvo(alvo, acao, magia, usuarioId);
    if (r) registros.push(r);
  }
  if (registros.length) {
    if (mensagem.isOwner) await registrar(mensagem, registros);
    else game.socket.emit(CANAL, { acao: "magia:registro", mensagemId: mensagem.id, registros });
  } else if (usuarioId === game.user.id) ui.notifications.info(loc("ICARUS.Magias.Efeitos.NadaNovo"));
}

async function voltar(mensagem, usuarioId = game.user.id) {
  const lista = foundry.utils.deepClone(mensagem.getFlag(F, "efeitosAplicados") ?? []);
  const i = ultimaAtiva(lista);
  if (i < 0) return;
  if (!game.user.isGM) {
    if (lista[i].usuario !== game.user.id) return;
    if (!game.users.activeGM) return ui.notifications.warn(loc("ICARUS.Dano.SemMestre"));
    return game.socket.emit(CANAL, { acao: "magia:voltar", mensagemId: mensagem.id });
  }
  if (usuarioId !== game.user.id && lista[i].usuario !== usuarioId) return;
  await desfazerRegistro(lista[i]);
  lista[i].desfeita = true;
  await emFila(() => mensagem.setFlag(F, "efeitosAplicados", lista));
}

/* ------------------------------ Clique ------------------------------ */

async function aoClicar(mensagem, indice) {
  const magia = mensagem.flags[F].magia;
  const acao = magia.efeitos?.[indice];
  if (!acao) return;
  let tokens;
  if (acao.alvo === "pessoal") {
    const conjurador = fromUuidSync(magia.actorUuid);
    tokens = conjurador ? [conjurador.getActiveTokens?.(false, true)?.[0] ?? conjurador] : [];
  } else {
    const marcados = [...(game.user.targets ?? [])].map(t => t.document).filter(Boolean);
    tokens = marcados.length ? marcados : (canvas?.tokens?.controlled ?? []).map(t => t.document);
  }
  if (!tokens.length) return ui.notifications.warn(loc("ICARUS.Dano.SemSelecao"));
  const ator = t => (t.documentName === "Token" ? t.actor : t);
  const proprios = tokens.filter(t => game.user.isGM || ator(t)?.isOwner);
  const outros = tokens.filter(t => !proprios.includes(t) && t.documentName === "Token");
  if (outros.length) {
    if (!game.users.activeGM) ui.notifications.warn(loc("ICARUS.Dano.SemMestre"));
    else game.socket.emit(CANAL, { acao: "magia:efeito", mensagemId: mensagem.id, indice, alvos: outros.map(t => t.uuid) });
  }
  if (proprios.length) await aplicarEmVarios(mensagem, proprios, indice, game.user.id);
}

/* ------------------------------ Socket (Mestre) ------------------------------ */

function podeVer(mensagem, usuario) {
  if (usuario.isGM) return true;
  if (mensagem.blind) return false;
  return !mensagem.whisper?.length || mensagem.whisper.includes(usuario.id) || mensagem.author?.id === usuario.id;
}

/** Mensagens do socket (exportada para os testes). */
export async function aoReceberMagia(msg, remetente) {
  if (!msg?.acao?.startsWith("magia:")) return;
  if (!game.users.activeGM?.isSelf) return;
  const de = typeof remetente === "string" ? remetente : msg.userId;
  const usuario = game.users.get(de);
  if (!usuario?.active) return;
  const mensagem = typeof msg.mensagemId === "string" ? game.messages.get(msg.mensagemId) : null;
  if (!mensagem?.flags?.[F]?.magia || !podeVer(mensagem, usuario)) return;
  if (msg.acao === "magia:voltar") return voltar(mensagem, de);
  if (msg.acao === "magia:registro") {
    const registros = (Array.isArray(msg.registros) ? msg.registros : []).slice(0, 50).filter(r =>
      r && typeof r.actorUuid === "string" && fromUuidSync(r.actorUuid)?.testUserPermission?.(usuario, "OWNER")
      && Array.isArray(r.criados) && r.criados.every(id => typeof id === "string"))
      .map(r => ({ alvo: String(r.alvo ?? "").slice(0, 80), tokenUuid: typeof r.tokenUuid === "string" ? r.tokenUuid : null, actorUuid: r.actorUuid,
        criados: r.criados.slice(0, 20), desligados: (r.desligados ?? []).filter(id => typeof id === "string").slice(0, 20), usuario: de, quando: Date.now(), desfeita: false }));
    if (registros.length) await registrar(mensagem, registros);
    return;
  }
  if (msg.acao !== "magia:efeito") return;
  const indice = Number(msg.indice);
  if (!Number.isInteger(indice) || !mensagem.flags[F].magia.efeitos?.[indice]) return;
  if (!Array.isArray(msg.alvos) || !msg.alvos.length || msg.alvos.length > 50) return;
  const alvos = [];
  for (const uuid of msg.alvos) {
    const token = typeof uuid === "string" && /^Scene\.[A-Za-z0-9]{1,32}\.Token\.[A-Za-z0-9]{1,32}$/.test(uuid) ? fromUuidSync(uuid) : null;
    if (!token?.actor || token.parent?.id !== usuario.viewedScene) return;
    alvos.push(token);
  }
  await aplicarEmVarios(mensagem, alvos, indice, de);
}

/* ------------------------------ Botões no cartão ------------------------------ */

/** HTML dos botões e do registro (exportada para os testes). */
export function htmlDosEfeitos(efeitos = [], aplicados = [], { mestre = false, usuario = null } = {}) {
  const botoes = efeitos.map((a, i) => {
    const temCondicao = (a.condicoes ?? []).length > 0;
    const rotulo = loc(temCondicao ? "ICARUS.Magias.Efeitos.AplicarCondicao" : "ICARUS.Magias.Efeitos.AplicarEfeito");
    const partes = [
      ...(a.condicoes ?? []).map(c => CONDICAO_POR_ID[c]?.nome ?? c),
      ...(a.mudancas ?? []).map(m => `${m.valor > 0 ? "+" : ""}${m.valor} ${loc(`ICARUS.Magias.Efeitos.Chaves.${String(m.chave).split(":")[0]}`)}${String(m.chave).includes(":") ? ` (${String(m.chave).split(":")[1]})` : ""}`)
    ];
    const res = a.resistencia ? fmt("ICARUS.Magias.Efeitos.SoQuemFalha", { teste: loc(`ICARUS.Pericias.${a.resistencia.atributo}`) }) : "";
    const dica = `${partes.join(", ")}${res ? ` · ${res}` : ""}`;
    return `<button type="button" class="ap-efeito${temCondicao ? " ap-condicao" : ""}" data-icarus-efeito="${i}" title="${esc(dica)}" aria-label="${esc(`${rotulo}: ${dica}`)}">`
      + `<i class="fa-solid ${temCondicao ? "fa-person-burst" : "fa-shield-heart"}" aria-hidden="true"></i><span>${esc(rotulo)}</span><small>${esc(partes.join(", "))}</small></button>`;
  }).join("");
  const i = ultimaAtiva(aplicados);
  const voltar = i >= 0 && (mestre || aplicados[i].usuario === usuario)
    ? `<button type="button" class="ap-desfazer" data-icarus-voltar-efeito title="${esc(loc("ICARUS.Magias.Efeitos.VoltarDica"))}"><i class="fa-solid fa-rotate-left" aria-hidden="true"></i><span>${esc(loc("ICARUS.Dano.Voltar"))}</span></button>`
    : "";
  const registro = aplicados.length
    ? `<div class="icarus-aplicacoes">${esc(loc("ICARUS.Dano.AplicadoEm"))} ${aplicados.slice(-8).map(a => `<span class="${a.desfeita ? "desfeita" : ""}">${esc(a.alvo)}</span>`).join(", ")}</div>`
    : "";
  return `<div class="icarus-aplicar icarus-aplicar-efeitos" role="group" aria-label="${esc(loc("ICARUS.Magias.Efeitos.Grupo"))}">${botoes}${voltar}</div>${registro}`;
}

function aoRenderizar(mensagem, html) {
  const magia = mensagem.flags?.[F]?.magia;
  if (!magia?.efeitos?.length || !magia.itemUuid) return;
  const raiz = html instanceof HTMLElement ? html : html?.[0];
  const conteudo = raiz?.querySelector(".icarus-magia") ?? raiz?.querySelector(".message-content");
  if (!conteudo) return;
  const caixa = document.createElement("div");
  caixa.className = "icarus-aplicar-caixa";
  caixa.innerHTML = htmlDosEfeitos(magia.efeitos, mensagem.flags[F].efeitosAplicados ?? [], { mestre: game.user.isGM, usuario: game.user.id });
  conteudo.appendChild(caixa);
  caixa.querySelectorAll("[data-icarus-efeito]").forEach(b => b.addEventListener("click", async ev => {
    ev.preventDefault();
    if (b.disabled) return;
    b.disabled = true;
    setTimeout(() => { b.disabled = false; }, 500);
    try { await aoClicar(mensagem, Number(b.dataset.icarusEfeito)); } catch (err) { console.error("Icarus RPG | aplicar efeito de magia", err); }
  }));
  caixa.querySelector("[data-icarus-voltar-efeito]")?.addEventListener("click", ev => {
    ev.preventDefault();
    ev.currentTarget.disabled = true;
    voltar(mensagem);
  });
}

/* ------------------------------ Registro ------------------------------ */

export function registrarEfeitosDeMagias() {
  Hooks.once("setup", () => {
    if ((game.release?.generation ?? 12) >= 13) Hooks.on("renderChatMessageHTML", aoRenderizar);
    else Hooks.on("renderChatMessage", aoRenderizar);
  });
  Hooks.once("ready", () => game.socket.on(CANAL, aoReceberMagia));
  // Fim do combate: efeitos de magia que duram a cena terminam (o Mestre remove)
  Hooks.on("deleteCombat", async combate => {
    if (!game.users.activeGM?.isSelf) return;
    for (const c of combate.combatants) {
      const actor = c.actor;
      const ids = actor?.effects.filter(e => e.flags?.[F]?.magia && e.flags[F].duracao === "cena").map(e => e.id) ?? [];
      if (ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
    }
  });
}
