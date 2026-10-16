/**
 * Condições do Icarus RPG (tools/dados/condicoes.json, núcleo §10). Lógica pura, sem Foundry
 * (testada em tests/condicoes.test.mjs).
 *
 * Regras gerais:
 * - Mesmo efeito não acumula: a mesma condição aplicada duas vezes vale uma só.
 * - Efeitos de mesma natureza de condições diferentes não se somam: quando duas condições mexem
 *   no mesmo campo, vale a MAIOR penalidade (ex.: Abalado −2 e Apavorado −5 em perícias → −5).
 *   Bônus positivos (ex.: RD do Petrificado) também não somam: vale o maior.
 * - Composição: uma condição inclui outras (Agarrado = Desprevenido + Imóvel). O cálculo considera
 *   as condições incluídas mesmo que o Efeito Ativo delas ainda não exista.
 * Por isso as penalidades NÃO são Efeitos Ativos de "somar": o cálculo da ficha lê as condições
 * ativas do personagem e aplica estas regras (module/derivar.mjs).
 */
import CONDICOES from "./dados/condicoes.mjs";
import { PERICIAS } from "./config.mjs";

export const DADOS_CONDICOES = CONDICOES;
export const LISTA_CONDICOES = CONDICOES.condicoes;
export const CONDICAO_POR_ID = Object.fromEntries(LISTA_CONDICOES.map(c => [c.id, c]));

/** Atributo de cada perícia, por extenso (como no JSON: "destreza", "sabedoria"…). */
const ATRIBUTO_DA_PERICIA = CONDICOES.atributosPericias;

/** Ids das condições ativas mais todas as que elas incluem (composição, recursiva). */
export function expandirComposicao(ids) {
  const resultado = new Set();
  const visitar = id => {
    if (resultado.has(id) || !CONDICAO_POR_ID[id]) return;
    resultado.add(id);
    for (const filho of CONDICAO_POR_ID[id].compoe ?? []) visitar(filho);
  };
  for (const id of ids) visitar(id);
  return resultado;
}

/** Perícias atingidas por um modificador { t: "pericias", atributos?, excluir? }. */
function periciasDoModificador(mod) {
  return PERICIAS.map(p => p.chave).filter(k => {
    if (mod.excluir?.includes(k)) return false;
    if (mod.atributos) return mod.atributos.includes(ATRIBUTO_DA_PERICIA[k]);
    return true;
  });
}

/** Guarda o valor mais forte: a maior penalidade (negativos) ou o maior bônus (positivos). */
function maisForte(atual, valor, origem) {
  if (!atual) return { valor, origem };
  if (valor < 0 ? valor < atual.valor : valor > atual.valor) return { valor, origem };
  return atual;
}

/**
 * Modificadores somados de todas as condições ativas, já com "vale a maior penalidade".
 * @param {Iterable<string>} idsAtivos  ids das condições ativas (statuses do ator)
 */
export function modificadoresDasCondicoes(idsAtivos) {
  const ids = expandirComposicao(idsAtivos);
  const m = {
    pericias: {},          // chave → { valor, origem }
    defesa: null,          // { valor, origem }
    ataque: null,          // { valor, origem } — todos os ataques
    ataqueCorpoACorpo: null,
    rd: null,
    deslocamento: { max: null, metade: false, reduz: 0, origens: [] },
    falhaAuto: {},         // chave da perícia → nome da condição
    avisos: [],            // { condicao, texto } (flags informativas)
    pendencias: [],        // nomes das condições com regra a confirmar
    ids
  };
  for (const id of ids) {
    const c = CONDICAO_POR_ID[id];
    const origem = c.nome;
    for (const mod of c.mods ?? []) {
      switch (mod.t) {
        case "pericias":
          for (const k of periciasDoModificador(mod)) m.pericias[k] = maisForte(m.pericias[k], mod.valor, origem);
          break;
        case "pericia":
          m.pericias[mod.chave] = maisForte(m.pericias[mod.chave], mod.valor, origem);
          break;
        case "defesa":
          m.defesa = maisForte(m.defesa, mod.valor, origem);
          break;
        case "ataque":
          // "modo corpo-a-corpo" (Caído) vale só nos ataques corpo a corpo
          if (mod.modo === "corpo-a-corpo") m.ataqueCorpoACorpo = maisForte(m.ataqueCorpoACorpo, mod.valor, origem);
          else m.ataque = maisForte(m.ataque, mod.valor, origem);
          break;
        case "rd":
          m.rd = maisForte(m.rd, mod.valor, origem);
          break;
        case "deslocamentoMax":
          m.deslocamento.max = m.deslocamento.max === null ? mod.valor : Math.min(m.deslocamento.max, mod.valor);
          m.deslocamento.origens.push(origem);
          break;
        case "deslocamentoMetade":
          m.deslocamento.metade = true;
          m.deslocamento.origens.push(origem);
          break;
        case "deslocamentoReduz":
          m.deslocamento.reduz = Math.max(m.deslocamento.reduz, mod.valor);
          m.deslocamento.origens.push(origem);
          break;
      }
    }
    for (const k of c.flags?.falhaAutomatica ?? []) m.falhaAuto[k] ??= origem;
    if ((c.pendencias ?? []).length) m.pendencias.push(origem);
  }
  return m;
}

/**
 * Deslocamento com as condições: metade (Lento), reduz X (Sobrecarregado) e máximo (Caído 1,5 m,
 * Imóvel 0). Sem automação de movimento na cena: é só o número mostrado na ficha.
 */
export function deslocamentoComCondicoes(metros, d) {
  let m = Number(metros) || 0;
  if (d.metade) m = m / 2;
  if (d.reduz) m -= d.reduz;
  m = Math.max(0, m);
  if (d.max !== null) m = Math.min(m, d.max);
  return m;
}

/** Ordem alfabética (pt-BR) para listas e diálogos. */
export function condicoesEmOrdem() {
  return [...LISTA_CONDICOES].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Todos os descritores usados (Medo, Mental, Metabolismo…), em ordem. */
export function descritores() {
  return [...new Set(LISTA_CONDICOES.flatMap(c => c.descritores ?? []))].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
