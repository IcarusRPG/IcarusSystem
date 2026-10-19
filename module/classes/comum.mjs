/**
 * Base das mecânicas de classe (aba Classe):
 * - escolhas permanentes entre subitens de habilidades (Senda, Caminho, Vínculo), que liberam os
 *   poderes do grupo e criam o item da escolha (também nos níveis que seguem a escolha);
 * - botões "Usar" das habilidades/poderes de classe com ação ou custo (usarPoder);
 * - status visuais das classes (Em Fúria, Presa, Braços Astrais) no Token HUD.
 * Cada classe acrescenta as próprias linhas em module/classes/<classe>.mjs.
 */
import { SISTEMA_ID } from "../config.mjs";
import { CLASSES, classePorId, habilidadesComEscolha, escolhaDaHabilidade, ESCOLHA_SEGUE, iconeDaClasse } from "../classes-dados.mjs";
import { MECANICAS_DE_CLASSE, ACOES_DE_MECANICA, APOS_CONCEDER, classeDoAtor, itensDeClasse } from "../classes.mjs";
import { usarPoder } from "../acoes.mjs";
import { resolverEscolha, APOS_CAMINHO, pendentesDoAtor } from "../escolhas.mjs";

const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);
const esc = t => Handlebars.escapeExpression(t ?? "");

/** Item da habilidade/poder de classe que o ator tem (ou undefined). */
export const itemDeClasse = (actor, classeId, id) => actor.items.find(i => i.flags?.[SISTEMA_ID]?.id === `${classeId}__${id}`);

/** Escolhas permanentes guardadas: { [habilidadeId]: índice do subitem }. */
export const escolhasDoAtor = actor => actor.getFlag(SISTEMA_ID, "escolhasClasse") ?? {};

/** Status visuais das classes (entram no Token HUD junto com as condições). */
export const STATUS_DE_CLASSE = [
  { id: "furia", name: "ICARUS.Barbaro.EmFuria", img: "icons/svg/explosion.svg" },
  { id: "presa", name: "ICARUS.Patrulheiro.Presa", img: "icons/svg/target.svg" },
  { id: "bracos-astrais", name: "ICARUS.Monge.BracosAstrais", img: "icons/svg/aura.svg" }
];

/**
 * Linhas da aba Classe por classe: cada módulo de classe registra uma função; aqui elas se
 * somam às escolhas permanentes e aos botões "Usar".
 */
const LINHAS = new Map();
export function registrarLinhas(classeId, fn) {
  LINHAS.set(classeId, fn);
}

/* ---------------- Escolhas permanentes ---------------- */

/** Cria o item da escolha (ex.: "Caminho do Monge: Caminho Astral") para a habilidade e as que a seguem. */
async function criarItensDaEscolha(actor, classe, indice, baseId) {
  const ids = [baseId, ...Object.entries(ESCOLHA_SEGUE).filter(([, b]) => b === baseId).map(([id]) => id)];
  const novos = [];
  for (const habId of ids) {
    const h = classe.habilidades.find(x => x.id === habId);
    const sub = h?.subs?.[indice];
    if (!h || !sub || !itemDeClasse(actor, classe.id, habId)) continue;
    if (itemDeClasse(actor, classe.id, `${habId}__escolha`)) continue;
    novos.push({
      name: `${h.nome}: ${sub.nome}`, type: "poder", img: iconeDaClasse(classe.id),
      system: { fonte: "classe", classe: classe.id, tipoPoder: "habilidade", nivel: h.nivel, descricao: sub.descricao },
      flags: { [SISTEMA_ID]: { id: `${classe.id}__${habId}__escolha`, classe: classe.id, escolhaDe: habId, auto: true } }
    });
  }
  if (novos.length) await actor.createEmbeddedDocuments("Item", novos);
}

/** Depois de escolher (por habilidade): (actor, índice) => Promise. Ex.: Monge guarda o caminho. */
export const DEPOIS_DA_ESCOLHA = new Map();

// Habilidades que seguem uma escolha (Caminho Aprofundado, Ápice da Senda…) recebem o item da escolha
for (const [habId, baseId] of Object.entries(ESCOLHA_SEGUE)) {
  APOS_CONCEDER.set(habId, async actor => {
    const classe = classeDoAtor(actor);
    const i = escolhaDaHabilidade(habId, escolhasDoAtor(actor));
    if (classe && i !== null) await criarItensDaEscolha(actor, classe, i, baseId);
  });
}

// Ação de cada escolha: "escolha:<habilidade>" → tela de caminho (escolhas.mjs); depois dela, o
// ator guarda o caminho, roda os ganchos da classe e cria o item da escolha
for (const classe of CLASSES) {
  for (const h of habilidadesComEscolha(classe)) {
    ACOES_DE_MECANICA.set(`escolha:${h.id}`, actor => {
      const item = itemDeClasse(actor, classe.id, h.id);
      return item ? resolverEscolha(actor, item) : null;
    });
    APOS_CAMINHO.set(h.id, async (actor, i) => {
      await DEPOIS_DA_ESCOLHA.get(h.id)?.(actor, i);
      await criarItensDaEscolha(actor, classe, i, h.id);
    });
  }
}

/* ---------------- Linhas da aba Classe ---------------- */

/** Monta as linhas de uma classe: escolhas + linhas da classe + "Usar" das habilidades ativas. */
function linhasDaClasse(actor) {
  const classe = classeDoAtor(actor);
  if (!classe) return [];
  const linhas = [];
  const escolhas = escolhasDoAtor(actor);
  for (const h of habilidadesComEscolha(classe)) {
    if (!itemDeClasse(actor, classe.id, h.id)) continue;
    const i = escolhaDaHabilidade(h.id, escolhas);
    linhas.push(i === null
      ? { id: `escolha:${h.id}`, rotulo: fmt("ICARUS.Classe.EscolherSub", { habilidade: h.nome }), botao: true, ativo: true, info: loc("ICARUS.Classe.EscolhaPendente") }
      : { id: `escolha:${h.id}`, rotulo: h.nome, info: h.subs[i]?.nome });
  }
  // Escolhas pendentes (itens criados sem a escolha feita)
  for (const item of pendentesDoAtor(actor)) {
    if (habilidadesComEscolha(classe).some(h => item.flags?.[SISTEMA_ID]?.id === `${classe.id}__${h.id}`)) continue;
    linhas.push({ id: `pendente:${item.id}`, rotulo: item.name, botao: true, ativo: true, info: loc("ICARUS.Classe.EscolhaPendente") });
  }
  linhas.push(...(LINHAS.get(classe.id)?.(actor) ?? []));
  // "Usar": habilidades e poderes de classe com ação (não passivos) ou com custo em PM
  for (const item of itensDeClasse(actor)) {
    const s = item.system;
    if (!((s.acao && s.acao !== "passivo") || s.custoPM)) continue;
    if (USO_PROPRIO.has(item.flags?.[SISTEMA_ID]?.id)) continue;
    linhas.push({ id: `usar:${item.id}`, rotulo: item.name, botao: true, info: [s.custoPM ? `${s.custoPM} PM` : "", s.acao && s.acao !== "passivo" ? loc(`ICARUS.Poderes.Acoes.${s.acao}`) : ""].filter(Boolean).join(" · ") });
  }
  return linhas;
}

/** Poderes com botão próprio na classe (não repetem no "Usar" genérico). */
export const USO_PROPRIO = new Set();

for (const classe of CLASSES) MECANICAS_DE_CLASSE.set(classe.id, linhasDaClasse);

/** "usar:<itemId>" → usarPoder. A ficha chama ACOES_DE_MECANICA pelo id; o prefixo é tratado aqui. */
export function acaoDaMecanica(id) {
  if (id?.startsWith("usar:")) return actor => usarPoder(actor, actor.items.get(id.slice(5)));
  if (id?.startsWith("pendente:")) return actor => resolverEscolha(actor, actor.items.get(id.slice(9)));
  return ACOES_DE_MECANICA.get(id);
}

/* ---------------- Status visuais ---------------- */

Hooks.once("setup", () => {
  for (const s of STATUS_DE_CLASSE) if (!CONFIG.statusEffects.some(e => e.id === s.id)) CONFIG.statusEffects.push({ ...s });
});

/** Liga/desliga um status visual do ator (se tiver permissão; senão, só o estado na ficha). */
export async function marcarStatus(actor, id, ativo) {
  if (!actor?.isOwner) return;
  if (!!actor.statuses?.has(id) !== !!ativo) await actor.toggleStatusEffect(id, { active: !!ativo });
}

/** Card simples no chat com o texto da mecânica. */
export function avisarNoChat(actor, texto, { rolls = [] } = {}) {
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }), rolls,
    content: `<div class="icarus-rolagem icarus-lembrete"><p class="condicao-descricao">${esc(texto)}</p></div>`
  });
}

export { classePorId };
