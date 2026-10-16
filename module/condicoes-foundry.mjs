/**
 * Condições no Foundry: viram Status Effects (Token HUD, ícone no token) e são aplicadas/removidas
 * sempre por aplicarCondicao / removerCondicao (ficha, painel do Mestre, HUD e uso programático).
 *
 * - Composição: aplicar Agarrado aplica também Desprevenido e Imóvel (flag origem = agarrado) e
 *   removê-lo remove os dois junto (a não ser que outra condição ativa também os inclua).
 * - Duração: Até remover (padrão), Rodadas (n) ou Fim da cena ("Encerrar cena" do Mestre remove).
 * - Penalidades: calculadas na ficha a partir das condições ativas (module/condicoes.mjs).
 */
import { SISTEMA_ID, PERICIAS } from "./config.mjs";
import { LISTA_CONDICOES, CONDICAO_POR_ID } from "./condicoes.mjs";
import { textosDasFlags } from "./dados-compendios.mjs";
import ICONES_CONDICOES from "./dados/icones-condicoes.mjs";

const loc = k => game.i18n.localize(k);
const nomePericia = k => PERICIAS.find(p => p.chave === k)?.nome ?? k;
export const iconeDaCondicao = c => (ICONES_CONDICOES[c.id] ? `systems/${SISTEMA_ID}/${encodeURI(ICONES_CONDICOES[c.id])}` : c.iconeCore);

/** Ator a partir de ator, token (placeable) ou TokenDocument. */
export function atorDe(alvo) {
  if (!alvo) return null;
  if (alvo.documentName === "Actor") return alvo;
  return alvo.actor ?? alvo.document?.actor ?? null;
}

/** Efeitos de condição do ator (status do Icarus). */
function efeitosDaCondicao(actor, id) {
  return actor.effects.filter(e => e.statuses?.has(id));
}

/**
 * Aplica uma condição (não duplica: se já estiver ativa, mantém a existente).
 * @param {object} [opcoes]  { duracao: "remover"|"rodadas"|"cena", rodadas, origem }
 */
export async function aplicarCondicao(alvo, id, { duracao = "remover", rodadas = 1, origem = null } = {}) {
  const actor = atorDe(alvo);
  const c = CONDICAO_POR_ID[id];
  if (!actor || !c) return null;
  if (actor.statuses?.has(id)) return null;
  const dados = {
    name: c.nome,
    img: iconeDaCondicao(c),
    statuses: [id],
    description: c.descricao,
    flags: { [SISTEMA_ID]: { condicao: id, duracao, origem, descritores: c.descritores ?? [], pendencias: c.pendencias ?? [] } }
  };
  if (duracao === "rodadas") {
    dados.duration = { rounds: Math.max(1, Number(rodadas) || 1), startRound: game.combat?.round ?? 0, startTurn: game.combat?.turn ?? 0, combat: game.combat?.id ?? null };
  }
  const [efeito] = await actor.createEmbeddedDocuments("ActiveEffect", [dados]);
  return efeito;
}

/** Remove a condição (e, pelo hook, as que ela incluía). */
export async function removerCondicao(alvo, id) {
  const actor = atorDe(alvo);
  if (!actor) return;
  const ids = efeitosDaCondicao(actor, id).map(e => e.id);
  if (ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
}

/** Remove todas as condições do Icarus do ator. */
export async function removerTodas(alvo) {
  const actor = atorDe(alvo);
  if (!actor) return;
  const ids = actor.effects.filter(e => e.flags?.[SISTEMA_ID]?.condicao && !e.flags[SISTEMA_ID].origem).map(e => e.id);
  if (ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
}

/** Escalar: aplica a próxima condição da escala e remove a atual (Abalado → Apavorado). */
export async function escalarCondicao(alvo, id) {
  const proxima = CONDICAO_POR_ID[id]?.escala;
  if (!proxima) return;
  const efeito = efeitosDaCondicao(atorDe(alvo), id)[0];
  await aplicarCondicao(alvo, proxima, { duracao: efeito?.flags?.[SISTEMA_ID]?.duracao ?? "remover" });
  await removerCondicao(alvo, id);
}

/** Uso programático: game.icarus.condicoes.aplicar(tokens, "cego", { rodadas: 3 }). */
async function aplicarEmVarios(alvos, id, opcoes = {}) {
  const lista = Array.isArray(alvos) ? alvos : [alvos];
  const duracao = opcoes.duracao ?? (opcoes.rodadas ? "rodadas" : "remover");
  for (const a of lista) await aplicarCondicao(a, id, { ...opcoes, duracao });
}

/** "Encerrar cena": remove as condições com duração "fim da cena" de todos os tokens da cena. */
export async function encerrarCena({ confirmar = true } = {}) {
  if (!game.user.isGM) return;
  if (confirmar) {
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: loc("ICARUS.Condicoes.EncerrarCena") },
      content: `<p>${loc("ICARUS.Condicoes.EncerrarCenaTexto")}</p>`,
      rejectClose: false
    });
    if (!ok) return;
  }
  let n = 0;
  const atores = new Map((canvas?.tokens?.placeables ?? []).filter(t => t.actor).map(t => [t.actor.uuid, t.actor]));
  for (const actor of atores.values()) {
    const ids = actor.effects.filter(e => e.flags?.[SISTEMA_ID]?.duracao === "cena" && !e.flags[SISTEMA_ID].origem).map(e => e.id);
    if (ids.length) { await actor.deleteEmbeddedDocuments("ActiveEffect", ids); n += ids.length; }
  }
  ui.notifications.info(game.i18n.format("ICARUS.Condicoes.CenaEncerrada", { n }));
}

/* ------------------------------ Aviso no chat ------------------------------ */

async function anunciar(actor, c, aplicada) {
  const modo = game.settings.get(SISTEMA_ID, "anunciarCondicoes");
  if (modo === "nunca") return;
  const content = await renderTemplate(`systems/${SISTEMA_ID}/templates/chat/condicao.hbs`, {
    titulo: game.i18n.format(aplicada ? "ICARUS.Condicoes.Aplicada" : "ICARUS.Condicoes.Removida", { condicao: c.nome, alvo: actor.name }),
    img: iconeDaCondicao(c),
    descricao: aplicada ? c.descricao : "",
    avisos: aplicada ? textosDasFlags(c, nomePericia) : [],
    pendente: aplicada && (c.pendencias ?? []).length > 0
  });
  const dados = { speaker: ChatMessage.getSpeaker({ actor }), content };
  if (modo === "gm") dados.whisper = ChatMessage.getWhisperRecipients("GM").map(u => u.id);
  return ChatMessage.create(dados);
}

/* ------------------------------ Registro ------------------------------ */

export function registrarCondicoes() {
  game.settings.register(SISTEMA_ID, "anunciarCondicoes", {
    name: "ICARUS.Config.AnunciarCondicoes.Nome",
    hint: "ICARUS.Config.AnunciarCondicoes.Dica",
    scope: "world",
    config: true,
    type: String,
    choices: { nunca: "ICARUS.Config.AnunciarCondicoes.Nunca", gm: "ICARUS.Config.AnunciarCondicoes.Gm", todos: "ICARUS.Config.AnunciarCondicoes.Todos" },
    default: "gm"
  });

  // As 36 condições no Token HUD (com nome em pt-BR); mantém o "morto" do Foundry para os testes de morte
  const morto = CONFIG.statusEffects.find(s => s.id === "dead");
  CONFIG.statusEffects = [
    ...LISTA_CONDICOES.map(c => ({
      id: c.id,
      name: c.nome,
      img: iconeDaCondicao(c),
      description: c.descricao,
      flags: { [SISTEMA_ID]: { condicao: c.id, descritores: c.descritores ?? [], pendencias: c.pendencias ?? [] } }
    })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    ...(morto ? [morto] : [])
  ];

  // Composição e aviso: só o cliente de quem fez a mudança reage
  Hooks.on("createActiveEffect", async (efeito, opcoes, userId) => {
    if (userId !== game.user.id || efeito.parent?.documentName !== "Actor") return;
    const actor = efeito.parent;
    for (const id of efeito.statuses ?? []) {
      const c = CONDICAO_POR_ID[id];
      if (!c) continue;
      const duracao = efeito.flags?.[SISTEMA_ID]?.duracao ?? "remover";
      for (const filho of c.compoe ?? []) {
        if (!actor.statuses?.has(filho)) await aplicarCondicao(actor, filho, { duracao, origem: id });
      }
      if (!efeito.flags?.[SISTEMA_ID]?.origem) await anunciar(actor, c, true);
    }
  });

  Hooks.on("deleteActiveEffect", async (efeito, opcoes, userId) => {
    if (userId !== game.user.id || efeito.parent?.documentName !== "Actor") return;
    const actor = efeito.parent;
    for (const id of efeito.statuses ?? []) {
      const c = CONDICAO_POR_ID[id];
      if (!c) continue;
      // Remove as condições que vieram desta; se outra condição ativa também as inclui, passam a ser dela
      for (const filho of actor.effects.filter(e => e.flags?.[SISTEMA_ID]?.origem === id)) {
        const outroPai = actor.effects.find(e => e.id !== efeito.id && [...(e.statuses ?? [])].some(s => (CONDICAO_POR_ID[s]?.compoe ?? []).some(f => filho.statuses.has(f))));
        if (outroPai) await filho.setFlag(SISTEMA_ID, "origem", [...outroPai.statuses][0]);
        else await filho.delete();
      }
      if (!efeito.flags?.[SISTEMA_ID]?.origem) await anunciar(actor, c, false);
    }
  });

  // Duração em rodadas: o Mestre remove as que expiraram ao mudar de rodada
  Hooks.on("updateCombat", async (combate, mudancas) => {
    if (!game.user.isGM || !("round" in mudancas)) return;
    for (const c of combate.combatants) {
      const actor = c.actor;
      if (!actor) continue;
      const expiradas = actor.effects.filter(e => e.flags?.[SISTEMA_ID]?.duracao === "rodadas" && e.duration?.remaining !== null && e.duration?.remaining <= 0);
      if (expiradas.length) await actor.deleteEmbeddedDocuments("ActiveEffect", expiradas.map(e => e.id));
    }
  });

  return {
    aplicar: aplicarEmVarios,
    remover: async (alvos, id) => { for (const a of (Array.isArray(alvos) ? alvos : [alvos])) await removerCondicao(a, id); },
    removerTodas: async alvos => { for (const a of (Array.isArray(alvos) ? alvos : [alvos])) await removerTodas(a); },
    escalar: escalarCondicao,
    encerrarCena
  };
}
