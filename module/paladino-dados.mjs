/**
 * Regras do Paladino sem dependência do Foundry (testadas em tests/paladino.test.mjs).
 */

const inteiro = (v, min = 0) => Math.max(min, Math.trunc(Number(v) || 0));

/**
 * Máximo de PM da Punição Consagrada por ataque: 1 (1º), 2 (5º), 3 (10º), 4 (15º), 5 (20º);
 * +1 contra a sentenciada (Olhar do Juiz). Na Hora Final, sem limite (null).
 */
export function limiteDaPunicao(nivel, { sentenciada = false, horaFinal = false } = {}) {
  if (horaFinal) return null;
  const n = inteiro(nivel, 1);
  const base = 1 + [5, 10, 15, 20].filter(x => n >= x).length;
  return base + (sentenciada ? 1 : 0);
}

/** Dado da Punição: d6 (mortos-vivos d8); com Lâmina de Essência d8 (mortos-vivos d10). */
export const dadoDaPunicao = ({ mortoVivo = false, lamina = false } = {}) => (lamina ? (mortoVivo ? 10 : 8) : (mortoVivo ? 8 : 6));

/**
 * Partes de dano (Essência) da Punição: N PM = N dados; Golpe Final +1d6 (sentenciada com menos
 * da metade dos PV). PM acima do limite são cortados.
 * @returns {{ pm:number, partes:{formula:string, tipo:string}[] }}
 */
export function planoDaPunicao(pm, nivel, opcoes = {}) {
  const limite = limiteDaPunicao(nivel, opcoes);
  const gasto = Math.max(1, Math.min(inteiro(pm, 1), limite ?? Infinity));
  const partes = [{ formula: `${gasto}d${dadoDaPunicao(opcoes)}`, tipo: "essencia" }];
  if (opcoes.golpeFinal) partes.push({ formula: "1d6", tipo: "essencia" });
  return { pm: gasto, partes };
}

/** Dados de cura do Toque Restaurador: 1d8, +1d8 no 5º, 9º, 13º e 17º (5d8 no 17º). */
export const dadosDoToque = nivel => 1 + [5, 9, 13, 17].filter(x => inteiro(nivel, 1) >= x).length;

/**
 * Toque Restaurador: custo (2 PM; 1 com Mãos Abertas; +1 Alívio Imediato; +3 Remédio dos Fiéis) e
 * fórmula (Nd8 + Carisma, mínimo +1; Remédio dobra os dados).
 */
export function planoDoToque(nivel, carisma, { maosAbertas = false, alivio = false, remedio = false } = {}) {
  const dados = dadosDoToque(nivel) * (remedio ? 2 : 1);
  return {
    custo: (maosAbertas ? 1 : 2) + (alivio ? 1 : 0) + (remedio ? 3 : 0),
    formula: `${dados}d8 + ${Math.max(1, Math.trunc(Number(carisma) || 0))}`
  };
}

/** Condições que o Alívio Imediato e a Aurora de Esperança removem. */
export const CONDICOES_DO_ALIVIO = ["abalado", "doente", "enjoado", "envenenado", "fatigado", "fraco"];

/** Toque Restaurador: cada criatura só uma vez por cena (lista de uuids já curados). */
export const jaCuradoNaCena = (curados = [], uuid) => (curados ?? []).includes(uuid);

/** Aura de Resguardo: +1 nos testes de resistência (+2 no 13º); raio 3 m (6 m com Aura Alargada). */
export const bonusDaAura = nivel => (inteiro(nivel, 1) >= 13 ? 2 : 1);
export const raioDaAura = alargada => (alargada ? 6 : 3);

/** Corpo Escudo: reduz o dano em 1 + nível. */
export const reducaoDoCorpoEscudo = nivel => 1 + inteiro(nivel, 1);

/** Hora Final: a primeira vez que os PV chegariam a 0, ficam em 1. */
export function pvDaHoraFinal(novoPV, horaFinal) {
  if (!horaFinal?.ativa || horaFinal.salvou || Number(novoPV) > 0) return null;
  return 1;
}
