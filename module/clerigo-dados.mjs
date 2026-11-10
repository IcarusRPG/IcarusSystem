/**
 * Regras do Clérigo sem dependência do Foundry (testadas em tests/clerigo.test.mjs).
 */

const inteiro = (v, min = 0) => Math.max(min, Math.trunc(Number(v) || 0));

/** Magias conhecidas: 3 no 1º nível e +1 por nível (n + 2), +2 por Teologia escolhida. */
export const limiteDeMagiasDoClerigo = (nivel, teologias = 0) => inteiro(nivel, 1) + 2 + 2 * inteiro(teologias);

/** Onda de Fé: até Sabedoria + 2 PM (mínimo 1). */
export const maximoDaOnda = sabedoria => Math.max(1, Math.trunc(Number(sabedoria) || 0) + 2);

/**
 * Onda de Fé: PM gastos (limitados ao máximo) → cura Nd6 nos vivos e Nd6 de Essência nos mortos-vivos.
 * Onda Ampla: +2 PM, alcance médio.
 * @returns {{ pm:number, dados:number, custo:number, formula:string, alcance:string }}
 */
export function planoDaOnda(pmEscolhido, sabedoria, { ampla = false } = {}) {
  const dados = Math.min(inteiro(pmEscolhido, 1), maximoDaOnda(sabedoria));
  return { pm: dados, dados, custo: dados + (ampla ? 2 : 0), formula: `${dados}d6`, alcance: ampla ? "medio" : "curto" };
}

/**
 * Intervenção Divina (10º): 1d100 ≤ nível = a divindade responde; no 20º, sempre (sem rolar).
 * @param {number} nivel  @param {number|null} d100  resultado (null no 20º)
 */
export function intervencaoAtende(nivel, d100) {
  const n = inteiro(nivel, 1);
  if (n >= 20) return true;
  if (n < 10) return false;
  return inteiro(d100, 1) <= n;
}

/** A Intervenção está disponível? (10º nível, sem bloqueio de 7 dias, sem falha esperando descanso) */
export function motivoSemIntervencao(nivel, { dias = 0, falhou = false } = {}) {
  if (inteiro(nivel, 1) < 10) return "ICARUS.Clerigo.IntervencaoNivel";
  if (inteiro(dias) > 0) return "ICARUS.Clerigo.IntervencaoBloqueada";
  if (falhou) return "ICARUS.Clerigo.IntervencaoDescanso";
  return null;
}

/**
 * Violação de Dogma: 1ª vez zera o PM e bloqueia a recuperação por 1d4 dias; 2ª vez a divindade
 * abandona o clérigo (Anátema).
 * @param {{ violacoes?:number }} atual  flags.dogma
 * @param {number} d4  resultado do 1d4 (só na 1ª vez)
 */
export function violarDogma(atual = {}, d4 = 1) {
  const violacoes = inteiro(atual?.violacoes) + 1;
  if (violacoes >= 2) return { violacoes, bloqueioPMDias: 0, anatema: true, zerarPM: false };
  return { violacoes, bloqueioPMDias: Math.min(4, inteiro(d4, 1)), anatema: false, zerarPM: true };
}

/** "Passou 1 dia": desconta 1 dos contadores (nunca abaixo de 0). */
export const passarUmDia = dias => Math.max(0, inteiro(dias) - 1);

/** Milagre: exatamente 3 magias Divinas diferentes (qualquer nível). */
export function motivoDoMilagre(magias = []) {
  const ids = magias.filter(Boolean);
  if (ids.length !== 3 || new Set(ids.map(m => m.id ?? m)).size !== 3) return "ICARUS.Clerigo.MilagreTres";
  if (magias.some(m => typeof m === "object" && !(m.tradicoes ?? []).includes("divina"))) return "ICARUS.Clerigo.MilagreDivina";
  return null;
}
