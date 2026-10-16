/**
 * Panteão de Icarus: as 20 divindades (tools/dados/panteao.json) e seus poderes concedidos.
 * Sem dependência do Foundry (testado em tests/panteao.test.mjs).
 */
import PANTEAO from "./dados/panteao.mjs";
import PODERES from "./dados/poderes-concedidos.mjs";
import ICONES_DIVINDADES from "./dados/icones-divindades.mjs";
import { iconeDaDivindade, dadosDoPoderConcedido, metaDoPoder } from "./dados-compendios.mjs";

export const DIVINDADES = PANTEAO.divindades;
export const GRUPOS_DIVINOS = [...new Set(DIVINDADES.map(d => d.grupo))];

const normalizar = t => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

export function divindadePorId(id) {
  return DIVINDADES.find(d => d.id === id) ?? null;
}

/** Converte o texto antigo do campo Divindade ("Draconara", "solem") no id; null se não reconhecer. */
export function idDaDivindadePorNome(texto) {
  const alvo = normalizar(texto);
  if (!alvo) return null;
  return DIVINDADES.find(d => normalizar(d.nome) === alvo || d.id === alvo)?.id ?? null;
}

/** Símbolo da divindade (o mesmo dos 3 poderes concedidos dela). */
export function simboloDaDivindade(id) {
  return iconeDaDivindade(id, ICONES_DIVINDADES);
}

/** Os 3 poderes da divindade, na ordem do panteão, com a linha de metadados. */
export function poderesDaDivindade(id) {
  const d = divindadePorId(id);
  if (!d) return [];
  return d.poderes.map(pid => PODERES.poderes.find(p => p.id === pid)).filter(Boolean).map(p => ({ ...p, meta: metaDoPoder(p) }));
}

/** Dados do item "poder" para criar na ficha (sem _id nem pasta: o Foundry gera os novos). */
export function itemDoPoderConcedido(poderId) {
  const p = PODERES.poderes.find(x => x.id === poderId);
  if (!p) return null;
  const dados = dadosDoPoderConcedido(p, divindadePorId(p.divindade), ICONES_DIVINDADES);
  delete dados._id;
  delete dados.folder;
  delete dados.sort;
  for (const e of dados.effects) delete e._id;
  return dados;
}

/**
 * Limite de poderes concedidos por devoção (só informativo, não bloqueia):
 * devoto comum 1 · Paladino 2 · Clérigo todos · Druida de Floressa todos, de outro deus 2.
 * Classe vazia ou não reconhecida: sem contagem, só a regra em texto.
 * @returns {{ limite: number|null, todos: boolean, regra: string }}
 */
export function limiteDeDevocao(classe, divindadeId) {
  const c = normalizar(classe);
  const regra = "Devoto comum: 1 · Paladino: 2 · Clérigo: todos · Druida: todos de Floressa, 2 de outro deus";
  if (!c) return { limite: null, todos: false, regra };
  if (c.startsWith("clerig")) return { limite: null, todos: true, regra };
  if (c.startsWith("paladin")) return { limite: 2, todos: false, regra };
  if (c.startsWith("druid")) return divindadeId === "floressa" ? { limite: null, todos: true, regra } : { limite: 2, todos: false, regra };
  return { limite: 1, todos: false, regra };
}
