/**
 * Testes de morte (núcleo §10). Lógica pura, sem Foundry (tests/morte.test.mjs).
 * Teste: 1d20 SEM modificador de atributo, somando só bônus gerais de testes de resistência
 * (PROVISÓRIO: esse campo ainda não existe no sistema, então nada é somado).
 *   1–9: 1 falha · 10–19: 1 sucesso · 20 natural: recupera 1 PV e age (sai de Morrendo)
 *   1 natural: 2 falhas · 3 sucessos: estável · 3 falhas: morto
 * Dano sofrido em Morrendo: 1 falha (2 se crítico).
 */

export const MAXIMO = 3;

const limitar = v => Math.max(0, Math.min(MAXIMO, v));

/** Resultado de um d20 natural, a partir do estado { sucessos, falhas, estavel }. */
export function resultadoTesteMorte(d20, estado = {}, bonus = 0) {
  const e = { sucessos: estado.sucessos ?? 0, falhas: estado.falhas ?? 0, estavel: !!estado.estavel };
  const natural = Number(d20);
  if (natural === 20) return { ...e, sucessos: 0, falhas: 0, reanima: true, resultado: "reanima" };
  if (natural === 1) {
    e.falhas = limitar(e.falhas + 2);
  } else if (natural + bonus >= 10) {
    e.sucessos = limitar(e.sucessos + 1);
  } else {
    e.falhas = limitar(e.falhas + 1);
  }
  const morto = e.falhas >= MAXIMO;
  const estavel = !morto && e.sucessos >= MAXIMO;
  return {
    ...e, estavel, morto, reanima: false,
    resultado: morto ? "morto" : estavel ? "estavel" : natural === 1 ? "duasFalhas" : natural + bonus >= 10 ? "sucesso" : "falha"
  };
}

/** Dano sofrido com 0 PV: 1 falha, ou 2 se for crítico. */
export function danoEmMorrendo(estado = {}, critico = false) {
  const falhas = limitar((estado.falhas ?? 0) + (critico ? 2 : 1));
  return { sucessos: estado.sucessos ?? 0, falhas, estavel: false, morto: falhas >= MAXIMO };
}
