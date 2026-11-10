/**
 * Nobre: regras puras (sem Foundry). Valores em Reais; o Foundry converte para centavos (moeda.mjs).
 * Fonte da riqueza inicial: tools/dados/riqueza.json.
 */
import RIQUEZA from "./dados/riqueza.mjs";

const nivelValido = n => Math.min(25, Math.max(1, Math.trunc(Number(n) || 1)));

/** Riqueza inicial do nível em Reais (21º a 25º = a do 20º). */
export const riquezaInicial = nivel => RIQUEZA.porNivel[String(Math.min(20, nivelValido(nivel)))];

/** Dote: R$ 1.500, uma vez. */
export const VALOR_DOTE = 1500;

/**
 * Rendimentos: o resultado do teste (d20 + CAR + nível), em porcentagem, da riqueza inicial do
 * nível, arredondado para baixo. Ex.: nível 5, resultado 20 → 20% de R$ 1.800 = R$ 360.
 */
export const valorDosRendimentos = (resultado, nivel) => Math.max(0, Math.floor(riquezaInicial(nivel) * Math.max(0, Math.trunc(resultado)) / 100));

/** Brio: até o Carisma em PM (mínimo 1), limitado ao PM atual; +2 no teste por PM. */
export const maximoDeBrio = (carisma, pmAtual) => Math.max(0, Math.min(Math.max(1, Math.trunc(Number(carisma) || 0)), Math.trunc(Number(pmAtual) || 0)));
export const bonusDeBrio = pm => 2 * Math.max(0, Math.trunc(Number(pm) || 0));

/** Palavra Cortante: 2d6 no 2º; 4d6 no 6º; 6d6 no 10º; 8d6 no 14º; 10d6 no 18º (Brado Tirânico: d8). */
export function danoDaPalavraCortante(nivel, { tiranico = false } = {}) {
  const n = nivelValido(nivel);
  const dados = n >= 18 ? 10 : n >= 14 ? 8 : n >= 10 ? 6 : n >= 6 ? 4 : 2;
  return `${dados}d${tiranico ? 8 : 6}`;
}

/** Majestade: CD = 10 + metade do nível + Carisma (+5 com Coroação). */
export const cdDaMajestade = (nivel, carisma, coroacao = false) => 10 + Math.floor(nivelValido(nivel) / 2) + Math.trunc(Number(carisma) || 0) + (coroacao ? 5 : 0);

/** Majestade: uma vez por cena contra cada criatura (registro por token). */
export const majestadeUsadaContra = (registro, tokenId) => !!registro?.[tokenId];

/** Brado de Comando: PM até o Carisma; o bônus nos testes de perícia dos aliados é igual ao PM. */
export const maximoDoBrado = (carisma, pmAtual) => Math.max(0, Math.min(Math.trunc(Number(carisma) || 0), Math.trunc(Number(pmAtual) || 0)));

/**
 * Cofre da Família: cada 1 PM das habilidades de Nobre pode ser pago com R$ 10 × nível
 * (5 × com Bolsa Aberta), até o Carisma em PM por cena.
 */
export const reaisPorPM = (nivel, bolsaAberta = false) => (bolsaAberta ? 5 : 10) * nivelValido(nivel);
export const restanteDoCofre = (carisma, usadoNaCena) => Math.max(0, Math.trunc(Number(carisma) || 0) - Math.max(0, Math.trunc(Number(usadoNaCena) || 0)));

/** Custos em dinheiro de poderes do Nobre (em Reais), por id do poder. */
export function custoEmDinheiro(id, nivel) {
  const n = nivelValido(nivel);
  if (id === "patrocinar") return 20 * n;
  if (id === "dinheiro-resolve") return 100 * n;
  if (id === "escolta-contratada") return Math.floor(riquezaInicial(n) / 10);
  return 0;
}

/** Estandarte da Família: objeto Pequeno, Defesa 12, RD 5, PV 10 (Reforçado: RD 10, PV 20). */
export const estandarte = reforcado => ({ defesa: 12, rd: reforcado ? 10 : 5, pvMax: reforcado ? 20 : 10, tamanho: "pequeno" });
