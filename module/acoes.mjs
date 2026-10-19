/**
 * Ações no Foundry: usar poderes (PM e reação), reação por rodada e Aguardar.
 *
 * Reações (regra oficial): 1 por rodada, renovada no início do turno da criatura. Desprevenido
 * ou Surpreendido não reage. Poderes "quando…" (acao: "reacao") gastam a reação; só pagam PM
 * quando o poder diz (custoPM).
 * Aguardar (ação completa): gatilho + ação padrão ou de movimento. Fica marcado até disparar ou
 * até o início do próximo turno do personagem (aí a ação se perde). Sem automação do gatilho.
 */
import { SISTEMA_ID } from "./config.mjs";
import { podeReagir } from "./combate.mjs";

const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);
const esc = t => Handlebars.escapeExpression(t ?? "");
const T = `systems/${SISTEMA_ID}/templates/chat`;

/** Status visual de quem está aguardando (entra em CONFIG.statusEffects junto com as condições). */
export const STATUS_AGUARDANDO = { id: "aguardando", name: "ICARUS.Aguardar.Status", img: "icons/svg/clockwork.svg" };

/** Situação de reação do ator: { pode, motivo } (motivo = "usada" | condição que impede). */
export const reacaoDoAtor = actor => podeReagir(actor.system, actor.statuses ?? new Set());

/* ------------------------------ Usar poder ------------------------------ */

/**
 * Antes/depois de usar um poder, por id do poder (flags["icarus-rpg"].id): automações de classe
 * acrescentam aqui. antes(actor, item, uso) pode devolver false para cancelar; depois(actor, item, uso).
 */
export const GANCHOS_DE_PODER = new Map();

/**
 * Usar um poder pela ficha: confirmação com o custo em PM editável (o custo do item é sugestão),
 * reação conferida e gasta, PM descontado e card no chat. Nada é gasto sem confirmar.
 * @returns {Promise<object|null>} o uso { pm, reacao, forcado } ou null se cancelou
 */
export async function usarPoder(actor, item, { custo = null } = {}) {
  if (!actor || !item) return null;
  const s = item.system;
  const reacao = s.acao === "reacao";
  const situacao = reacao ? reacaoDoAtor(actor) : { pode: true };
  if (reacao && !situacao.pode && !game.user.isGM) {
    ui.notifications.warn(fmt("ICARUS.Reacao.NaoPode", { nome: actor.name, motivo: motivoReacao(situacao.motivo) }));
    return null;
  }
  const sugerido = custo ?? s.custoPM ?? 0;
  const inferido = !!item.flags?.[SISTEMA_ID]?.inferido;
  const acao = s.acao ? loc(`ICARUS.Poderes.Acoes.${s.acao}`) : "";
  const avisoReacao = reacao && !situacao.pode
    ? `<p class="aviso">${esc(fmt("ICARUS.Reacao.NaoPode", { nome: actor.name, motivo: motivoReacao(situacao.motivo) }))}</p>` : "";
  const content = `<div class="icarus-uso">
    <p>${acao ? `<b>${esc(acao)}</b> · ` : ""}${reacao ? esc(loc("ICARUS.Reacao.Gasta")) : ""}</p>
    <label class="linha">${esc(loc("ICARUS.Poderes.CustoPM"))}
      <input type="number" name="pm" value="${Number(sugerido) || 0}" min="0" step="1" autofocus></label>
    ${inferido ? `<p class="dica">${esc(loc("ICARUS.Poderes.CustoInferido"))}</p>` : ""}
    <p class="dica">${esc(fmt("ICARUS.Poderes.PMAtual", { pm: actor.system.pm.value, max: actor.system.pm.max }))}</p>
    ${avisoReacao}
  </div>`;
  const forcado = reacao && !situacao.pode;
  const pm = await foundry.applications.api.DialogV2.wait({
    window: { title: fmt("ICARUS.Poderes.UsarTitulo", { nome: item.name }) },
    content,
    buttons: [
      { action: "usar", label: forcado ? loc("ICARUS.Reacao.UsarMesmoAssim") : loc("ICARUS.Poderes.Usar"), default: true,
        callback: (ev, botao) => Math.max(0, Math.trunc(Number(botao.form.elements.pm.value) || 0)) },
      { action: "cancelar", label: loc("ICARUS.Testes.Cancelar") }
    ],
    rejectClose: false
  });
  if (pm === null || pm === undefined || pm === "cancelar") return null;
  if (pm > actor.system.pm.value) {
    ui.notifications.warn(fmt("ICARUS.Poderes.SemPM", { nome: actor.name, pm, atual: actor.system.pm.value }));
    return null;
  }
  const uso = { pm, reacao, forcado };
  const gancho = GANCHOS_DE_PODER.get(item.flags?.[SISTEMA_ID]?.id);
  if (gancho?.antes && (await gancho.antes(actor, item, uso)) === false) return null;
  const mudancas = {};
  if (pm) mudancas["system.pm.value"] = actor.system.pm.value - pm;
  if (reacao) mudancas["system.reacao.disponivel"] = false;
  if (Object.keys(mudancas).length) await actor.update(mudancas);
  await cardDeUso(actor, item, uso);
  await gancho?.depois?.(actor, item, uso);
  return uso;
}

const motivoReacao = m => (m === "usada" ? loc("ICARUS.Reacao.JaUsada") : m || "");

async function cardDeUso(actor, item, uso) {
  const descricao = await TextEditor.enrichHTML(item.system.descricao, { async: true, relativeTo: item });
  const content = await renderTemplate(`${T}/poder-uso.hbs`, {
    nome: item.name, img: item.img, ator: actor.name,
    acao: item.system.acao ? loc(`ICARUS.Poderes.Acoes.${item.system.acao}`) : "",
    pm: uso.pm, reacao: uso.reacao, forcado: uso.forcado, descricao
  });
  return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content });
}

/* ------------------------------ Reação ------------------------------ */

/** Alterna a reação manualmente (dono ou Mestre). */
export function alternarReacao(actor) {
  return actor.update({ "system.reacao.disponivel": !actor.system.reacao.disponivel });
}

/** Renova a reação (início do turno, fim do combate ou botão "Renovar reação"). */
export function renovarReacao(actor) {
  if (actor?.system?.reacao && !actor.system.reacao.disponivel) return actor.update({ "system.reacao.disponivel": true });
}

/* ------------------------------ Aguardar ------------------------------ */

/** Diálogo do Aguardar: gatilho + ação (padrão ou movimento). Marca o ator e avisa no chat. */
export async function aguardar(actor) {
  const content = `<div class="icarus-uso">
    <p class="dica">${esc(loc("ICARUS.Aguardar.Dica"))}</p>
    <label class="linha">${esc(loc("ICARUS.Aguardar.Gatilho"))}<input type="text" name="gatilho" autofocus placeholder="${esc(loc("ICARUS.Aguardar.Exemplo"))}"></label>
    <label class="linha">${esc(loc("ICARUS.Aguardar.Acao"))}<select name="acao">
      <option value="padrao">${esc(loc("ICARUS.Poderes.Acoes.padrao"))}</option>
      <option value="movimento">${esc(loc("ICARUS.Poderes.Acoes.movimento"))}</option>
    </select></label>
  </div>`;
  const escolha = await foundry.applications.api.DialogV2.wait({
    window: { title: fmt("ICARUS.Aguardar.Titulo", { nome: actor.name }) },
    content,
    buttons: [
      { action: "ok", label: loc("ICARUS.Aguardar.Confirmar"), default: true,
        callback: (ev, botao) => ({ gatilho: botao.form.elements.gatilho.value.trim(), acao: botao.form.elements.acao.value }) },
      { action: "cancelar", label: loc("ICARUS.Testes.Cancelar") }
    ],
    rejectClose: false
  });
  if (!escolha || typeof escolha !== "object" || !escolha.gatilho) return null;
  const combate = game.combat;
  const dados = { ...escolha, desde: combate ? { round: combate.round, turn: combate.turn } : null };
  await actor.setFlag(SISTEMA_ID, "aguardando", dados);
  await actor.toggleStatusEffect(STATUS_AGUARDANDO.id, { active: true });
  await avisar(actor, fmt("ICARUS.Aguardar.Chat", { nome: actor.name, acao: loc(`ICARUS.Poderes.Acoes.${dados.acao}`), gatilho: dados.gatilho }));
  return dados;
}

/** O gatilho aconteceu: faz a ação (sem gastar reação), posta e limpa. */
export async function dispararAguardar(actor) {
  const dados = actor.getFlag(SISTEMA_ID, "aguardando");
  if (!dados) return;
  await limparAguardar(actor);
  return avisar(actor, fmt("ICARUS.Aguardar.Disparou", { nome: actor.name, acao: loc(`ICARUS.Poderes.Acoes.${dados.acao}`), gatilho: dados.gatilho }));
}

async function limparAguardar(actor) {
  await actor.unsetFlag(SISTEMA_ID, "aguardando");
  if (actor.statuses?.has(STATUS_AGUARDANDO.id)) await actor.toggleStatusEffect(STATUS_AGUARDANDO.id, { active: false });
}

function avisar(actor, texto) {
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="icarus-rolagem icarus-lembrete"><p class="condicao-descricao">${esc(texto)}</p></div>`
  });
}

/* ------------------------------ Início do turno ------------------------------ */

/**
 * O que acontece no início do turno de um ator (só o Mestre executa). Outras partes do sistema
 * (classes) acrescentam funções aqui: (actor, combate) => Promise.
 */
export const INICIO_DO_TURNO = [
  async actor => renovarReacao(actor),
  async actor => {
    if (!actor.getFlag(SISTEMA_ID, "aguardando")) return;
    const dados = actor.getFlag(SISTEMA_ID, "aguardando");
    await limparAguardar(actor);
    await avisar(actor, fmt("ICARUS.Aguardar.Perdeu", { nome: actor.name, gatilho: dados.gatilho }));
  }
];

/** Fim do combate: reações de todos renovadas (outras partes podem acrescentar). */
export const FIM_DO_COMBATE = [async actor => renovarReacao(actor)];

/** O Mestre ativo executa (evita repetir em vários Mestres conectados). */
const souMestreAtivo = () => game.user.isGM && (game.users.activeGM ? game.users.activeGM.isSelf : true);

export function registrarAcoes() {
  Hooks.on("updateCombat", async (combate, mudancas) => {
    if (!souMestreAtivo() || !("turn" in mudancas || "round" in mudancas)) return;
    const actor = combate.combatant?.actor;
    if (!actor) return;
    for (const fn of INICIO_DO_TURNO) await fn(actor, combate);
  });
  Hooks.on("deleteCombat", async combate => {
    if (!souMestreAtivo()) return;
    for (const c of combate.combatants) if (c.actor) for (const fn of FIM_DO_COMBATE) await fn(c.actor, combate);
  });

  // Ícone de reação no Combat Tracker (dono ou Mestre alternam com um clique)
  Hooks.on("renderCombatTracker", (app, html) => {
    const raiz = html instanceof HTMLElement ? html : html?.[0];
    const combate = app.viewed;
    if (!raiz || !combate) return;
    for (const li of raiz.querySelectorAll("li.combatant[data-combatant-id]")) {
      const actor = combate.combatants.get(li.dataset.combatantId)?.actor;
      if (!actor?.system?.reacao) continue;
      const situacao = reacaoDoAtor(actor);
      const icone = document.createElement("a");
      icone.className = `icarus-reacao-tracker${actor.system.reacao.disponivel ? " disponivel" : ""}${situacao.pode ? "" : " impedida"}`;
      icone.innerHTML = `<i class="fa-solid fa-bolt" aria-hidden="true"></i>`;
      icone.dataset.tooltip = textoReacao(actor);
      icone.setAttribute("aria-label", icone.dataset.tooltip);
      if (actor.isOwner) icone.addEventListener("click", ev => { ev.preventDefault(); ev.stopPropagation(); alternarReacao(actor); });
      (li.querySelector(".combatant-controls") ?? li).prepend(icone);
    }
  });
}

/** Texto da dica da reação: disponível / gasta / impedida por condição. */
export function textoReacao(actor) {
  const s = reacaoDoAtor(actor);
  if (s.pode) return loc("ICARUS.Reacao.Disponivel");
  return s.motivo === "usada" ? loc("ICARUS.Reacao.Usada") : fmt("ICARUS.Reacao.Impedida", { motivo: s.motivo });
}
