/**
 * Regras do Druida sem dependência do Foundry (testadas em tests/druida.test.mjs).
 */
import { subirPasso } from "./combate.mjs";

const inteiro = (v, min = 0) => Math.max(min, Math.trunc(Number(v) || 0));

/**
 * Formas do Mudar de Forma (texto dos poderes "Forma de …"): custo base, tamanho, deslocamento,
 * bônus de Defesa, arma natural e o bônus especial (botão/opção no ataque).
 */
export const FORMAS = {
  lobo: { poder: "forma-de-lobo", custo: 2, tamanho: "medio", deslocamento: "12 m", defesa: 3, arma: "Mordida", dano: "1d8", tipo: "perfuracao", especial: "derrubar" },
  urso: { poder: "forma-de-urso", custo: 3, tamanho: "grande", deslocamento: "9 m", defesa: 4, arma: "Garras", dano: "1d10", tipo: "corte", especial: "abraco", pvTemporarios: 2 },
  aguia: { poder: "forma-de-aguia", custo: 3, tamanho: "pequeno", deslocamento: "voo 12 m", defesa: 2, arma: "Garras", dano: "1d6", tipo: "corte", especial: "mergulho" },
  serpente: { poder: "forma-de-serpente", custo: 2, tamanho: "medio", deslocamento: "9 m, escalada 6 m", defesa: 3, arma: "Mordida", dano: "1d6", tipo: "perfuracao", especial: "constricao" },
  aranha: { poder: "forma-de-aranha", custo: 2, tamanho: "pequeno", deslocamento: "9 m, escalada 9 m", defesa: 3, arma: "Mordida", dano: "1d4", tipo: "perfuracao", especial: "teia" },
  tubarao: { poder: "forma-de-tubarao", custo: 3, tamanho: "grande", deslocamento: "natação 15 m (terra 3 m)", defesa: 2, arma: "Dentada", dano: "1d8", tipo: "perfuracao", especial: "frenesi" }
};

/** Id da forma pelo id do poder ("forma-de-lobo" → "lobo"). */
export const formaDoPoder = poderId => Object.keys(FORMAS).find(k => FORMAS[k].poder === poderId) ?? null;

/**
 * Custo para assumir: base da forma; Instinto Bestial −1 (mínimo 1); Troca Veloz +2 (troca como
 * ação livre); sob Mil Formas, trocar não custa nada.
 */
export function custoDaForma(base, { instinto = false, trocaVeloz = false, milFormas = false } = {}) {
  if (milFormas) return 0;
  const c = instinto ? Math.max(1, inteiro(base) - 1) : inteiro(base);
  return c + (trocaVeloz ? 2 : 0);
}

/**
 * Dano da arma natural: o dado da forma, +1 passo no 11º e outro no 17º (+1 com Presas Famintas).
 */
export function danoDaForma(dado, nivel, { presas = false } = {}) {
  const n = inteiro(nivel, 1);
  const passos = (n >= 11 ? 1 : 0) + (n >= 17 ? 1 : 0) + (presas ? 1 : 0);
  return passos ? subirPasso(dado, passos) : dado;
}

/** PV temporários do Urso: 2 × nível. Fera Ancestral: 3 × nível. */
export const pvTemporariosDoUrso = nivel => 2 * inteiro(nivel, 1);
export const pvTemporariosDaFeraAncestral = nivel => 3 * inteiro(nivel, 1);

/**
 * O que a Forma bloqueia. Sob uma Forma: sem falar, sem magias, sem itens/armas/armaduras.
 * Palavra na Fera e Mil Formas liberam fala e magias (itens continuam bloqueados).
 * Mosaico Vivo não bloqueia nada.
 */
export function bloqueiosDaForma({ forma = false, palavraNaFera = false, milFormas = false } = {}) {
  if (!forma) return { fala: false, magias: false, itens: false };
  const libera = palavraNaFera || milFormas;
  return { fala: !libera, magias: !libera, itens: true };
}

/** Partes do Mosaico Vivo (Asas de Gavião só a partir do 10º nível). */
export const PARTES_DO_MOSAICO = [
  { id: "garras", nivel: 1 },
  { id: "olhos-de-coruja", nivel: 1, mudancas: [{ chave: "pericia.visao", valor: 5 }] },
  { id: "pernas-de-cervo", nivel: 1, mudancas: [{ chave: "deslocamento", valor: 6 }] },
  { id: "pele-de-rinoceronte", nivel: 1, mudancas: [{ chave: "defesa", valor: 2 }] },
  { id: "asas-de-gaviao", nivel: 10 },
  { id: "nariz-de-lobo", nivel: 1, mudancas: [{ chave: "pericia.olfato", valor: 5 }] }
];

/** Quantas partes do Mosaico Vivo por uso: 1, 2 no 10º, 3 no 16º. */
export const partesDoMosaico = nivel => 1 + [10, 16].filter(x => inteiro(nivel, 1) >= x).length;

/** Partes que o nível permite. */
export const partesDisponiveis = nivel => PARTES_DO_MOSAICO.filter(p => inteiro(nivel, 1) >= p.nivel);

/** Ervas Frescas por descanso: 1 + metade do nível (+2 Mãos de Seiva, +2 Boticário). */
export const quantasErvas = (nivel, { maosDeSeiva = false, boticario = false } = {}) =>
  1 + Math.floor(inteiro(nivel, 1) / 2) + (maosDeSeiva ? 2 : 0) + (boticario ? 2 : 0);

/** Cura da erva: 1d6, +1d6 no 8º, 14º e 20º (+1d6 com Boticário). */
export const curaDaErva = (nivel, { boticario = false } = {}) =>
  `${1 + [8, 14, 20].filter(x => inteiro(nivel, 1) >= x).length + (boticario ? 1 : 0)}d6`;

/** Condições que a erva remove (Erva Rara acrescenta Cego, Surdo, Fraco, Debilitado e Sangrando). */
export const condicoesDaErva = (rara = false) =>
  ["doente", "enjoado", "envenenado", ...(rara ? ["cego", "surdo", "fraco", "debilitado", "sangrando"] : [])];

/** Caminho das Raízes: até Sabedoria + metade do nível Árvores Conhecidas (mínimo 1). */
export const limiteDeArvores = (sabedoria, nivel) => Math.max(1, Math.trunc(Number(sabedoria) || 0) + Math.floor(inteiro(nivel, 1) / 2));

/** Marca uma árvore nova; além do limite, esquece as mais antigas. */
export function marcarArvore(lista = [], nova, limite) {
  const todas = [...(lista ?? []), nova];
  return todas.slice(Math.max(0, todas.length - Math.max(1, inteiro(limite, 1))));
}

/** Fé Selvagem: Floressa concede os 3 Poderes Concedidos (null = todos); outra divindade, 2. */
export const concedidosDoDruida = divindadeId => (divindadeId === "floressa" ? null : 2);

/** Afinidade Natural: +1 na CD das magias com afinidade Natureza. */
export const ajusteDeAfinidade = magia => (String(magia?.afinidade ?? "").toLowerCase() === "natureza" ? 1 : 0);

/** Forma ativa do ator (efeito ativo "Forma: X" com flags["icarus-rpg"].forma) ou null. */
export const formaDoAtor = actor => [...(actor?.effects ?? [])].find(e => !e.disabled && e.flags?.["icarus-rpg"]?.forma)?.flags["icarus-rpg"].forma ?? null;

/** Bloqueios do ator agora (Forma, Palavra na Fera, Mil Formas). */
export function bloqueiosDoAtor(actor) {
  const ids = new Set([...(actor?.items ?? [])].map(i => i.flags?.["icarus-rpg"]?.id));
  return bloqueiosDaForma({ forma: !!formaDoAtor(actor), palavraNaFera: ids.has("druida__palavra-na-fera"), milFormas: !!actor?.flags?.["icarus-rpg"]?.milFormas });
}

/** A arma pode ser usada na Forma? Só a arma natural da forma. */
export const armaPermitidaNaForma = item => !!item?.flags?.["icarus-rpg"]?.armaDaForma;
