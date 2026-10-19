/**
 * Classes: dados (tools/dados/classes.json, embutido em module/dados/classes.mjs), ícones e regras
 * puras de progressão, patamares e pré-requisitos. Sem Foundry (testado em tests/classes.test.mjs).
 * Novas classes entram só acrescentando ao JSON (e o ícone em icones-classes.json).
 */
import { SISTEMA_ID, ICONE_PADRAO } from "./config.mjs";
import CLASSES_JSON from "./dados/classes.mjs";
import ICONES_CLASSES from "./dados/icones-classes.mjs";
import PROFICIENCIAS_CLASSES from "./dados/proficiencias-classes.mjs";

export const CLASSES = CLASSES_JSON.classes;
export const PASTA_ICONES_CLASSES = `systems/${SISTEMA_ID}/img/Icones/classes`;

export const classePorId = id => CLASSES.find(c => c.id === id) ?? null;

/** Normaliza um nome para comparação (sem acento, minúsculo). */
export const normalizarNome = t => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Id da classe a partir do nome digitado ("Bárbaro", "barbaro") — ou null. */
export const idDaClassePorNome = nome => CLASSES.find(c => normalizarNome(c.nome) === normalizarNome(nome) || c.id === nome)?.id ?? null;

/** Ícone da classe (img do item classe, das habilidades e dos poderes dela). */
export function iconeDaClasse(id, mapa = ICONES_CLASSES) {
  const arquivo = mapa?.[id];
  return arquivo ? encodeURI(`${PASTA_ICONES_CLASSES}/${arquivo}`) : ICONE_PADRAO;
}

/** Proficiências estruturadas da classe ({ armas, armaduras, escudo, tunicas }). */
export const proficienciasDaClasse = id => PROFICIENCIAS_CLASSES[id] ?? { armas: ["simples"], armaduras: [], escudo: false, tunicas: false };

/** Confere no servidor os ícones das classes (só o Mestre, no início); avisa no console o que faltar. */
export async function verificarIconesClasses() {
  const faltando = [];
  for (const c of CLASSES) {
    const url = iconeDaClasse(c.id);
    if (url === ICONE_PADRAO) { faltando.push(`${c.nome} (sem entrada em icones-classes.json)`); continue; }
    const ok = await fetch(url, { method: "HEAD" }).then(r => r.ok).catch(() => false);
    if (!ok) faltando.push(decodeURI(url));
  }
  if (faltando.length) console.warn(`Icarus RPG | Ícones de classe não encontrados (usam o dado azul): ${faltando.join(", ")}`);
  return faltando;
}
