/**
 * Regras do Místico sem dependência do Foundry (testadas em tests/mistico.test.mjs).
 */
import { SISTEMA_ID } from "./config.mjs";

const inteiro = (v, min = 0) => Math.max(min, Math.trunc(Number(v) || 0));
const sem = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const idDoItem = i => i?.flags?.[SISTEMA_ID]?.id;
const tem = (itens, id) => (itens ?? []).some(i => idDoItem(i) === `mistico__${id}`);

/** Elementos da Dobra Elemental: tipo de dano e poder de Domínio. */
export const ELEMENTOS = {
  chama: { nome: "Chama", tipo: "fogo", dominio: "dominio-da-chama" },
  mare: { nome: "Maré", tipo: "frio", dominio: "dominio-da-mare" },
  rocha: { nome: "Rocha", tipo: "impacto", dominio: "dominio-da-rocha" },
  vento: { nome: "Vento", tipo: "corte", dominio: "dominio-do-vento" }
};

/** Id do elemento pelo nome ("Maré" → "mare"), ou null. */
export const elementoPorNome = nome => Object.keys(ELEMENTOS).find(k => sem(ELEMENTOS[k].nome) === sem(nome)) ?? null;

/**
 * Elementos que o Místico conhece: o da Dobra Elemental (flags.elemento do item), os dos poderes
 * de Domínio e, com Harmonia (20º), os quatro.
 */
export function elementosDosItens(itens) {
  if (tem(itens, "harmonia")) return Object.keys(ELEMENTOS);
  const r = new Set();
  for (const i of itens ?? []) {
    if (idDoItem(i) === "mistico__dobra-elemental" && i.flags[SISTEMA_ID].elemento) r.add(i.flags[SISTEMA_ID].elemento);
  }
  for (const [k, e] of Object.entries(ELEMENTOS)) if (tem(itens, e.dominio)) r.add(k);
  return Object.keys(ELEMENTOS).filter(k => r.has(k));
}

/**
 * Pré-requisito de elemento no texto do poder ("elemento Chama", "dois elementos"):
 * { elementos: ids exigidos, minimo: quantos elementos } ou null se o poder não exige.
 */
export function requisitoDeElemento(prerequisito) {
  const t = sem(prerequisito);
  const elementos = [...t.matchAll(/elemento (chama|mare|rocha|vento)/g)].map(m => m[1]);
  const minimo = /dois elementos/.test(t) ? 2 : 0;
  return elementos.length || minimo ? { elementos, minimo } : null;
}

/** O Místico atende ao pré-requisito de elemento? */
export const atendeElemento = (req, conhecidos = []) =>
  !req || (req.elementos.every(e => conhecidos.includes(e)) && conhecidos.length >= req.minimo);

/**
 * Rajada Elemental: 1d8 (+1d8 no 5º, 9º, 13º e 17º); d10 com Rajada Potente; +2 com o Domínio do
 * elemento usado.
 */
export function danoDaRajada(nivel, { potente = false, dominio = false } = {}) {
  const dados = 1 + [5, 9, 13, 17].filter(x => inteiro(nivel, 1) >= x).length;
  return `${dados}d${potente ? 10 : 8}${dominio ? " + 2" : ""}`;
}

/** Custo da Rajada: 1 PM; +2 com Rajada Dupla; +1 como ação de movimento (Rajada Veloz). */
export const custoDaRajada = ({ dupla = false, veloz = false } = {}) => 1 + (dupla ? 2 : 0) + (veloz ? 1 : 0);

/** Magias conhecidas da Conjuração Mística: 3 no 1º, +1 a cada nível ímpar a partir do 3º. */
export const magiasConhecidasDoMistico = nivel => 3 + Math.floor((inteiro(nivel, 1) - 1) / 2);

/** Magias Divinas pelos Ecos dos Ancestrais: 2 por escolha. */
export const magiasDivinasDoMistico = ecos => 2 * inteiro(ecos);

/** Maior nível de magia Divina (Ecos dos Ancestrais): 1º no 5º, 2º no 9º, 3º no 13º, 4º no 17º. */
export const nivelMaximoDivinoDoMistico = nivel => Math.min(4, Math.max(0, Math.floor((inteiro(nivel, 1) - 1) / 4)));

/** Meditação: 1d6 + Sabedoria PM, com Concentração CD 15. */
export const MEDITACAO_CD = 15;
export const curaDaMeditacao = sabedoria => `1d6 + ${Math.trunc(Number(sabedoria) || 0)}`.replace("+ -", "- ");

/** Ascensão Espiritual: 1 vez por dia (2 com Harmonia). */
export const usosDaAscensao = ({ harmonia = false } = {}) => (harmonia ? 2 : 1);

/** Mudanças do efeito da Ascensão (o resto do texto vai para o chat). */
export const FORMAS_DA_ASCENSAO = {
  ancestral: [{ chave: "defesa", valor: 2 }, { chave: "rd", valor: 5 }, { chave: "deslocamento", valor: 6 }],
  divina: [{ chave: "resistencia", valor: 5 }]
};
export const formaPorNome = nome => (sem(nome).includes("ancestral") ? "ancestral" : sem(nome).includes("divina") ? "divina" : null);

/**
 * Extras do familiar pelos poderes do dono: Familiar Robusto +10 PV e +1 Defesa; Evolução do
 * Familiar (13º) +2 Defesa e o dado de dano um passo maior.
 */
export function extrasDoFamiliar(itensDoDono) {
  const robusto = tem(itensDoDono, "familiar-robusto");
  const evolucao = tem(itensDoDono, "evolucao-do-familiar");
  return { pv: robusto ? 10 : 0, defesa: (robusto ? 1 : 0) + (evolucao ? 2 : 0), passoDano: evolucao ? 1 : 0 };
}

/** Familiares que o Místico conhece (Familiar Elemental + Segundo Familiar): ids, sem repetir. */
export function familiaresDosItens(itens) {
  const ids = (itens ?? []).filter(i => ["mistico__familiar-elemental", "mistico__segundo-familiar"].includes(idDoItem(i)))
    .map(i => i.flags[SISTEMA_ID].familiar).filter(Boolean);
  return [...new Set(ids)];
}

/**
 * Passivos do Místico: Mente Calma (+2 Vontade e Concentração); Domínio do Vento (+3 m);
 * Domínio da Chama (Redução de Fogo 5) e Domínio da Maré (Redução de Frio 5).
 */
export function passivosDoMistico(itens) {
  const r = { pericias: {}, deslocamento: 0, rd: [] };
  const pericia = (k, v, origem) => (r.pericias[k] ??= []).push({ valor: v, origem });
  if (tem(itens, "mente-calma")) { pericia("vontade", 2, "Mente Calma"); pericia("concentracao", 2, "Mente Calma"); }
  if (tem(itens, "dominio-do-vento")) r.deslocamento = 3;
  if (tem(itens, "dominio-da-chama")) r.rd.push({ tipo: "fogo", valor: 5, origem: "Domínio da Chama" });
  if (tem(itens, "dominio-da-mare")) r.rd.push({ tipo: "frio", valor: 5, origem: "Domínio da Maré" });
  return r;
}
