/**
 * Regras do Anátema sem dependência do Foundry (testadas em tests/anatema.test.mjs).
 */
import { SISTEMA_ID } from "./config.mjs";

const inteiro = (v, min = 0) => Math.max(min, Math.trunc(Number(v) || 0));
const tem = (itens, id) => (itens ?? []).some(i => i?.flags?.[SISTEMA_ID]?.id === `anatema__${id}`);

/** Mana Coagulada: +valor PM a cada N níveis (classes.json pm.extraACadaNiveis; arredonda para baixo). */
export const pmExtraPorNiveis = (extra, nivel) =>
  (extra?.niveis ? Math.floor(inteiro(nivel, 1) / extra.niveis) * (Number(extra.valor) || 0) : 0);
export const MANA_COAGULADA = { niveis: 2, valor: 1 };

/**
 * Preço de Sangue (Abandonado): até 2 PM por turno pagos com PV, 3 PV cada (Preço Barato: até 3 PM,
 * 2 PV cada). Nunca deixa os PV chegarem a 0.
 */
export const precoDeSangue = ({ precoBarato = false } = {}) => ({ maxPorTurno: precoBarato ? 3 : 2, pvPorPM: precoBarato ? 2 : 3 });

/** Quantos PM dá para pagar com PV agora (custo do uso, PV atuais, já pagou neste turno?). */
export function maximoComPV(custo, pvAtual, { precoBarato = false, jaPagouNoTurno = false } = {}) {
  if (jaPagouNoTurno) return 0;
  const p = precoDeSangue({ precoBarato });
  const peloPV = Math.floor((inteiro(pvAtual) - 1) / p.pvPorPM);
  return Math.max(0, Math.min(inteiro(custo), p.maxPorTurno, peloPV));
}

/** Chave do turno atual (Preço de Sangue: uma vez por turno). Fora de combate, null (sem limite por turno). */
export const chaveDoTurno = combate => (combate?.id ? `${combate.id}:${combate.round ?? 0}:${combate.turn ?? 0}` : null);

/** CD do Sangrando causado pela Sangria de Guerra: 15; Ferida Teimosa: 10 + metade do nível + Sabedoria. */
export const cdDaSangria = (nivel, sabedoria, { feridaTeimosa = false } = {}) =>
  (feridaTeimosa ? 10 + Math.floor(inteiro(nivel, 1) / 2) + Math.trunc(Number(sabedoria) || 0) : 15);

/** Perda de PV de quem falha no teste do Sangrando causado pelo Anátema (Hemorragia Pesada: 2d6). */
export const perdaDoSangrando = ({ hemorragia = false } = {}) => (hemorragia ? "2d6" : "1d6");

/** Dados do Sangrando que o Anátema causa (vão nas flags do efeito: sangrandoPor). */
export const dadosDoSangrando = ({ uuid = null, nome = "", nivel = 1, sabedoria = 0, feridaTeimosa = false, hemorragia = false } = {}) =>
  ({ uuid, nome, cd: cdDaSangria(nivel, sabedoria, { feridaTeimosa }), perda: perdaDoSangrando({ hemorragia }) });

/**
 * Teste do Sangrando no início do turno: CD 15 e perda 1d6, ou os do Anátema que causou (flags do
 * efeito: sangrandoPor). Veias de Ferro: +5 no teste de Constituição. Praga de Sangue: +1d4 de
 * perda se o alvo também estiver Abalado.
 */
export function testeDoSangrando(sangrandoPor = null, { veiasDeFerro = false, abalado = false } = {}) {
  return {
    cd: Number(sangrandoPor?.cd) || 15,
    perda: sangrandoPor?.perda || "1d6",
    bonus: veiasDeFerro ? 5 : 0,
    praga: !!sangrandoPor?.praga && abalado ? "1d4" : null
  };
}

/**
 * Selar Feridas: 1d6 (+1d6 no 8º, 14º e 20º); +1d6 com Costura Rápida; +1d6 com Cicatriz Viva quando
 * usado em si mesmo.
 */
export function curaDoSelar(nivel, { costura = false, cicatrizEmSi = false } = {}) {
  const dados = 1 + [8, 14, 20].filter(x => inteiro(nivel, 1) >= x).length + (costura ? 1 : 0) + (cicatrizEmSi ? 1 : 0);
  return `${dados}d6`;
}

/** Carne Aberta: +1d6 contra Sangrando (+2d6 no 11º, +3d6 no 17º). */
export const danoDaCarneAberta = nivel => `${1 + [11, 17].filter(x => inteiro(nivel, 1) >= x).length}d6`;

/** Dor Fértil: no máximo metade do nível em PM por cena. */
export const limiteDaDorFertil = nivel => Math.floor(inteiro(nivel, 1) / 2);

/** Pele de Cicatrizes: RD 2, 4 com menos da metade dos PV. */
export const rdDaPele = (pv, pvMax) => (inteiro(pvMax) > 0 && Number(pv) < inteiro(pvMax) / 2 ? 4 : 2);

/** Olhar Funesto: alvos (Voz Blasfema: 2). */
export const alvosDoOlhar = ({ vozBlasfema = false } = {}) => (vozBlasfema ? 2 : 1);

/** Amortecer: reduz o dano em 3 + metade do nível. */
export const reducaoDoAmortecer = nivel => 3 + Math.floor(inteiro(nivel, 1) / 2);

/** Banquete do Vencedor: PV iguais à Sabedoria (mínimo 1). */
export const curaDoBanquete = sabedoria => Math.max(1, Math.trunc(Number(sabedoria) || 0));

/** Pano e Linha: PV temporários = metade do nível. */
export const pvTemporariosDoPano = nivel => Math.floor(inteiro(nivel, 1) / 2);

/**
 * Passivos do Anátema (derivados dos itens):
 * - Olhar Funesto: Sabedoria no lugar de Carisma em Intimidação;
 * - Voz Rouca (+2 e treinado) e Voz Blasfema (+2) em Intimidação; Veias de Ferro +2 Fortitude;
 * - Armadura Rubra: +1 Defesa com armadura pesada; Mana Coagulada: PM extra;
 * - Pele de Cicatrizes: RD 2 (4 abaixo da metade dos PV).
 * @returns {{ pmExtra:number, defesa:{valor,origem}[], pericias:Object<string,{valor,origem}[]>, treinadas:string[], atributos:Object<string,string>, rd:{tipo,valor,origem}[] }}
 */
export function passivosDoAnatema(itens, { nivel = 1, tipoArmadura = "nenhuma", pv = 0, pvMax = 0 } = {}) {
  const r = { pmExtra: 0, defesa: [], pericias: {}, treinadas: [], atributos: {}, rd: [] };
  const pericia = (chave, valor, origem) => (r.pericias[chave] ??= []).push({ valor, origem });
  if (tem(itens, "mana-coagulada")) r.pmExtra = pmExtraPorNiveis(MANA_COAGULADA, nivel);
  if (tem(itens, "olhar-funesto")) r.atributos.intimidacao = "SAB";
  if (tem(itens, "voz-rouca")) { pericia("intimidacao", 2, "Voz Rouca"); r.treinadas.push("intimidacao"); }
  if (tem(itens, "voz-blasfema")) pericia("intimidacao", 2, "Voz Blasfema");
  if (tem(itens, "veias-de-ferro")) pericia("fortitude", 2, "Veias de Ferro");
  if (tem(itens, "armadura-rubra") && tipoArmadura === "pesada") r.defesa.push({ valor: 1, origem: "Armadura Rubra" });
  if (tem(itens, "pele-de-cicatrizes")) r.rd.push({ tipo: null, valor: rdDaPele(pv, pvMax), origem: "Pele de Cicatrizes" });
  return r;
}
