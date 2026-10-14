/**
 * Moeda do Icarus RPG (documento-núcleo, seção 12):
 * 1 Ouro Real = 1.000 Reais = 100.000 Centavos; 1 Real = 100 Centavos.
 * Todo preço é guardado em CENTAVOS (inteiro). Sem dependência do Foundry.
 */
import { numero } from "./regras.mjs";

export const CENTAVOS_POR_REAL = 100;
export const CENTAVOS_POR_OURO = 100000;

const inteiroPositivo = v => Math.max(0, Math.trunc(numero(v)));
const fmtNumero = (v, casas = 0) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(v);

/**
 * Preço para exibir: 0 → "—" (não se compra), < 1 Real → "50 Centavos",
 * Reais inteiros → "R$ 1.500", com centavos → "R$ 12,50".
 */
export function formatarPreco(centavos) {
  const c = inteiroPositivo(centavos);
  if (c === 0) return "—";
  if (c < CENTAVOS_POR_REAL) return `${c} ${c === 1 ? "Centavo" : "Centavos"}`;
  const reais = c / CENTAVOS_POR_REAL;
  return `R$ ${fmtNumero(reais, Number.isInteger(reais) ? 0 : 2)}`;
}

/** Valor em Ouro Real para a dica do preço ("0,9 Ouro Real"); vazio abaixo de R$ 100. */
export function precoEmOuro(centavos) {
  const c = inteiroPositivo(centavos);
  if (c < 100 * CENTAVOS_POR_REAL) return "";
  const ouro = c / CENTAVOS_POR_OURO;
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(ouro)} Ouro Real`;
}

/** Total das moedas do personagem em centavos. */
export function totalEmCentavos(moedas = {}) {
  return inteiroPositivo(moedas.ouroReal) * CENTAVOS_POR_OURO
    + inteiroPositivo(moedas.real) * CENTAVOS_POR_REAL
    + inteiroPositivo(moedas.centavo);
}

/**
 * Paga um valor com as moedas, quebrando moedas maiores só quando preciso
 * (paga primeiro com Centavos, depois Reais, depois Ouro Real, e devolve o troco em moedas menores).
 * @returns {{ouroReal:number, real:number, centavo:number}|null} null se faltar dinheiro
 */
export function debitar(moedas, centavos) {
  let p = inteiroPositivo(centavos);
  let o = inteiroPositivo(moedas?.ouroReal), r = inteiroPositivo(moedas?.real), c = inteiroPositivo(moedas?.centavo);
  if (totalEmCentavos({ ouroReal: o, real: r, centavo: c }) < p) return null;

  // 1. Centavos
  const comCentavos = Math.min(c, p);
  c -= comCentavos;
  p -= comCentavos;
  // 2. Reais (o troco volta em Centavos)
  const reais = Math.min(r, Math.ceil(p / CENTAVOS_POR_REAL));
  r -= reais;
  p -= reais * CENTAVOS_POR_REAL;
  if (p < 0) { c += -p; p = 0; }
  // 3. Ouro Real (o troco volta em Reais e Centavos)
  if (p > 0) {
    const ouro = Math.ceil(p / CENTAVOS_POR_OURO);
    o -= ouro;
    const troco = ouro * CENTAVOS_POR_OURO - p;
    r += Math.floor(troco / CENTAVOS_POR_REAL);
    c += troco % CENTAVOS_POR_REAL;
  }
  return { ouroReal: o, real: r, centavo: c };
}

/** Recebe um valor em centavos (entra como Reais e Centavos; Ouro Real não é criado sozinho). */
export function creditar(moedas, centavos) {
  const v = inteiroPositivo(centavos);
  let c = inteiroPositivo(moedas?.centavo) + (v % CENTAVOS_POR_REAL);
  let r = inteiroPositivo(moedas?.real) + Math.floor(v / CENTAVOS_POR_REAL) + Math.floor(c / CENTAVOS_POR_REAL);
  c %= CENTAVOS_POR_REAL;
  return { ouroReal: inteiroPositivo(moedas?.ouroReal), real: r, centavo: c };
}
