/**
 * Fórmulas do Icarus RPG (documento-núcleo, seções 1 a 9).
 * Funções puras, sem dependência do Foundry: o DataModel usa estas funções
 * e os testes em tests/ as verificam no Node.
 */
import { BONUS_TREINO, NIVEL_MAXIMO, NIVEL_PARAGON, METROS_POR_QUADRADO } from "./config.mjs";

/** Converte qualquer valor em número; vazio, null ou texto inválido viram 0. */
export function numero(valor) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

export function limitar(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}

/** Nível inteiro entre 1 e 25. */
export function nivelValido(nivel) {
  return limitar(Math.trunc(numero(nivel)) || 1, 1, NIVEL_MAXIMO);
}

/** Níveis 21–25 são o tier Paragon. */
export function ehParagon(nivel) {
  return nivelValido(nivel) >= NIVEL_PARAGON;
}

/** Total do atributo = Base + Raça + Temp. É o valor usado em tudo. */
export function totalAtributo({ base, racial, temp } = {}) {
  return numero(base) + numero(racial) + numero(temp);
}

/** Bônus de treino: 0 Destreinado (+0), 1 Treinado (+2), 2 Especialista (+4). */
export function bonusTreino(treino) {
  return BONUS_TREINO[treino] ?? 0;
}

/** Perícia = Atributo (total) + Bônus de treino + Outros. */
export function totalPericia(atributoTotal, treino, outros) {
  return numero(atributoTotal) + bonusTreino(treino) + numero(outros);
}

/**
 * Máximo de PV ou PM pela fórmula da classe:
 * inicial + por nível × (nível − 1) + atributo × nível.
 * Sem atributo (null), a parte do atributo não entra — é o caso do PM das classes não conjuradoras.
 * atributoUmaVez: o atributo soma uma única vez, no 1º nível (PM do Monge: 4 + SAB + 4 × (nível − 1)).
 */
export function maximoPelaClasse({ inicial, porNivel, atributoTotal = null, nivel, atributoUmaVez = false }) {
  const n = nivelValido(nivel);
  const parteAtributo = atributoTotal === null ? 0 : numero(atributoTotal) * (atributoUmaVez ? 1 : n);
  return numero(inicial) + numero(porNivel) * (n - 1) + parteAtributo;
}

/**
 * Máximo final de PV ou PM. No modo manual vale o valor digitado; o bônus soma nos dois casos.
 * bonusNivel (bônus por nível vindos de poderes, ex.: Sangue de Aço) só entra fora do modo manual.
 * Nunca fica negativo.
 */
export function maximoFinal({ manual, maximoManual, maximoFormula, bonus, bonusNivel = 0 }) {
  const base = manual ? numero(maximoManual) : numero(maximoFormula) + numero(bonusNivel);
  return Math.max(0, base + numero(bonus));
}

/** Quantidade de níveis ímpares até o nível atual (1º, 3º, 5º…) = ceil(nível / 2). */
export function niveisImpares(nivel) {
  return Math.ceil(nivelValido(nivel) / 2);
}

/**
 * Bônus de PV e PM que crescem com o nível (vêm de Efeitos Ativos de poderes):
 * PV: bonusPvPorNivel × nível
 * PM: bonusPmPorNivel × nível + bonusPmNivelImpar × ceil(nível / 2)
 */
export function bonusDeNivel({ nivel, bonusPvPorNivel, bonusPmPorNivel, bonusPmNivelImpar }) {
  const n = nivelValido(nivel);
  return {
    pv: numero(bonusPvPorNivel) * n,
    pm: numero(bonusPmPorNivel) * n + numero(bonusPmNivelImpar) * niveisImpares(n)
  };
}

/** Defesa = 10 + DES + Armadura + Escudo + Outros. */
export function calcularDefesa({ des, armadura, escudo, outros }) {
  return 10 + numero(des) + numero(armadura) + numero(escudo) + numero(outros);
}

/** Deslocamento em quadrados de 1,5 m (arredondado para baixo). */
export function emQuadrados(metros) {
  return Math.floor(numero(metros) / METROS_POR_QUADRADO);
}

/** Modificador com sinal: +3, +0, −2 (usa o sinal de menos tipográfico). */
export function comSinal(n) {
  const v = numero(n);
  return (v >= 0 ? "+" : "−") + Math.abs(v);
}

/** Número sem "+", mas com o sinal de menos tipográfico: 3, 0, −2. */
export function semMais(n) {
  const v = numero(n);
  return v < 0 ? `−${Math.abs(v)}` : String(v);
}
