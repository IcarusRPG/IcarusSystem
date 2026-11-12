/**
 * Rolagens grandes digitadas no chat (regras puras, sem Foundry): quantos dados uma mensagem pede.
 * Vale para os comandos de rolagem (/r, /roll, /gmr, /gmroll, /br, /broll, /blindroll, /sr,
 * /selfroll, /pr, /publicroll) e para rolagens embutidas [[...]] em qualquer mensagem. Rolagens
 * feitas pelo sistema (ataques, poderes, habilidades, magias) não passam pelo chat digitado.
 */

export const LIMITE_PADRAO = 16;
const COMANDOS = /^\/(r|roll|gmr|gmroll|br|broll|blindroll|sr|selfroll|pr|publicroll)\b/i;

/** Dados de uma fórmula: "20d6 + 2d8" → 22; "d20" → 1; "4d6kh3" → 4. */
export function contarDados(formula) {
  let total = 0;
  for (const m of String(formula ?? "").matchAll(/(\d*)\s*d\s*(\d+|%|F)/gi)) total += m[1] === "" ? 1 : Number(m[1]);
  return total;
}

/**
 * Fórmulas de rolagem que a mensagem pede: o resto do comando (sem o texto depois de #) e cada
 * rolagem embutida [[...]] (inclusive [[/r ...]]). @returns {string[]}
 */
export function formulasDaMensagem(texto) {
  const t = String(texto ?? "").trim();
  const formulas = [];
  const comando = t.match(COMANDOS);
  if (comando) formulas.push(t.slice(comando[0].length).split("#")[0]);
  for (const m of t.matchAll(/\[\[(.+?)\]\]/g)) formulas.push(m[1].replace(COMANDOS, ""));
  return formulas;
}

/** Total de dados pedidos pela mensagem (todas as fórmulas somadas). */
export const dadosDaMensagem = texto => formulasDaMensagem(texto).reduce((s, f) => s + contarDados(f), 0);

/** Precisa de aprovação do Mestre? (jogador, opção ligada, acima do limite) */
export function precisaAprovar({ texto, ehMestre, ativo, limite = LIMITE_PADRAO }) {
  if (ehMestre || !ativo) return false;
  return dadosDaMensagem(texto) > Math.max(0, Number(limite) || 0);
}
