/**
 * Classes: dados (tools/dados/classes.json, embutido em module/dados/classes.mjs), ícones e regras
 * puras de progressão, patamares e pré-requisitos. Sem Foundry (testado em tests/classes.test.mjs).
 * Novas classes entram só acrescentando ao JSON (e o ícone em icones-classes.json).
 */
import { SISTEMA_ID, ICONE_PADRAO, PERICIAS } from "./config.mjs";
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

/* ------------------------------ Perícias da classe ------------------------------ */

/** Chave da perícia pelo nome ("Prestidigitação" → "prestidigitacao"), ou null. */
export function chaveDaPericia(nome) {
  const n = normalizarNome(nome);
  return PERICIAS.find(p => normalizarNome(p.nome) === n)?.chave ?? null;
}

/**
 * Perícias obrigatórias a partir do texto da classe: "Fortitude e (Luta ou Pontaria)" →
 * [{ tipo: "fixa", chave: "fortitude" }, { tipo: "escolha", opcoes: ["luta", "pontaria"] }].
 */
export function parseObrigatorias(texto) {
  const partes = [];
  const re = /\(([^)]*)\)|([^()]+)/g;
  for (const m of String(texto ?? "").matchAll(re)) {
    if (m[1]) {
      const opcoes = m[1].split(/\s+ou\s+/i).map(chaveDaPericia).filter(Boolean);
      if (opcoes.length) partes.push({ tipo: "escolha", opcoes });
    } else {
      for (const nome of m[2].split(/\s*(?:,|\be\b)\s*/i)) {
        const chave = chaveDaPericia(nome);
        if (chave) partes.push({ tipo: "fixa", chave });
      }
    }
  }
  return partes;
}

/* ------------------------------ Progressão ------------------------------ */

/** Nível em que a habilidade é recebida (null no JSON = 1º nível, ex.: Restrição de Equipamento). */
export const nivelDaHabilidade = h => h.nivel ?? 1;

/** Habilidades da classe recebidas até um nível (uma por habilidade; versões por nível ficam na descrição). */
export const habilidadesAteNivel = (classe, nivel) => (classe?.habilidades ?? []).filter(h => nivelDaHabilidade(h) <= nivel);

/** Quantos poderes de classe a classe concede até o nível (linhas com poder: true). */
export const poderesConcedidosAteNivel = (classe, nivel) => (classe?.progressao ?? []).filter(p => p.poder && p.nivel <= nivel).length;

/**
 * Contador "Poderes de classe X / Y": escolhidos e concedidos até o nível; disponiveis = Y − X.
 * @param {number} escolhidos  quantos poderes de classe (tipoPoder "poder") o personagem tem
 */
export function contagemDePoderes(classe, nivel, escolhidos) {
  const total = poderesConcedidosAteNivel(classe, nivel);
  return { escolhidos, total, disponiveis: Math.max(0, total - escolhidos) };
}

/** Linhas da tabela de progressão (1º–20º) com o nível atual marcado. */
export function tabelaDeProgressao(classe, nivel) {
  return (classe?.progressao ?? []).map(p => ({ ...p, atual: p.nivel === nivel, alcancado: p.nivel <= nivel }));
}

/* ------------------------------ Patamares ------------------------------ */

/** Patamares (Tormenta 20 até o 20º; Paragon é o seguinte). */
export const PATAMARES = [
  { id: "iniciante", de: 1, ate: 4 },
  { id: "veterano", de: 5, ate: 10 },
  { id: "campeao", de: 11, ate: 16 },
  { id: "lenda", de: 17, ate: 20 },
  { id: "paragon", de: 21, ate: 25 }
];

/** Patamar de um nível ("iniciante", "veterano", "campeao", "lenda", "paragon"). */
export const patamarDe = nivel => (PATAMARES.find(p => nivel >= p.de && nivel <= p.ate) ?? PATAMARES[0]).id;
