/**
 * Loja do Mercador: regras puras (sem Foundry), testadas em tests/loja.test.mjs.
 * Todo preço em CENTAVOS (module/moeda.mjs). O estoque são os itens do próprio mercador, com
 * flags["icarus-rpg"].loja = { venda, quantidade (null = ∞), precoBase (null = preço do item), oculto }.
 * Munição se vende por pacote (20 unidades): o estoque e a quantidade comprada contam pacotes.
 */
import { SISTEMA_ID, TAMANHO_PACOTE, TIPOS_EQUIPAVEIS } from "./config.mjs";
import { debitar, creditar, totalEmCentavos } from "./moeda.mjs";

const n0 = v => Math.max(0, Math.trunc(Number(v) || 0));
export const TIPOS_VENDAVEIS = ["arma", "equipamento", "municao"];
export const QUANTIDADE_MAXIMA = 999;

/** Dados de loja do item (com os padrões). */
export function lojaDoItem(item) {
  const l = item?.flags?.[SISTEMA_ID]?.loja ?? {};
  return {
    venda: l.venda !== false,
    quantidade: l.quantidade === null || l.quantidade === undefined ? null : n0(l.quantidade),
    precoBase: l.precoBase === null || l.precoBase === undefined || l.precoBase === "" ? null : n0(l.precoBase),
    oculto: !!l.oculto
  };
}

/** Preço do item sem a loja: munição pelo pacote; os outros pelo preço do item. */
export const precoDoItemNaLoja = item => n0(item?.type === "municao" ? item?.system?.precoPacote : item?.system?.preco);

/** Preço base (o da loja, se definido; senão o do item). */
export const precoBase = item => lojaDoItem(item).precoBase ?? precoDoItemNaLoja(item);

/** Total: preço base × multiplicador × quantidade, arredondado em centavos. */
export function precoTotal(item, quantidade = 1, multiplicador = 1) {
  const m = Number(multiplicador);
  return Math.round(precoBase(item) * (Number.isFinite(m) && m > 0 ? m : 1) * n0(quantidade));
}

/** Preço de uma unidade na vitrine. */
export const precoUnitario = (item, multiplicador = 1) => precoTotal(item, 1, multiplicador);

/** O item aparece na vitrine? (vendável, à venda, não oculto) */
export const visivelNaVitrine = item => TIPOS_VENDAVEIS.includes(item?.type) && lojaDoItem(item).venda && !lojaDoItem(item).oculto;

/** Esgotado? (estoque contado e zero) */
export const esgotado = item => lojaDoItem(item).quantidade === 0;

/**
 * Valida uma compra e calcula o resultado (o Mestre chama com o estado atual).
 * @param {{ loja, caixa, caixaInfinita }} mercador  system do mercador
 * @param {object} item  item do estoque ({ type, system, flags })
 * @param {number} quantidade
 * @param {{ moedas }} comprador  system do comprador
 * @param {{ dono?: boolean }} [opcoes]  o usuário que pediu é dono do comprador?
 * @returns {{ ok: false, motivo: string } | { ok: true, total, moedas, estoque, caixa }}
 *   estoque: nova quantidade (null = infinito, não muda); caixa: novas moedas do mercador (null = caixa infinita)
 */
export function validarCompra(mercador, item, quantidade, comprador, { dono = true } = {}) {
  if (!dono) return { ok: false, motivo: "semPermissao" };
  if (!mercador?.loja?.aberta) return { ok: false, motivo: "lojaFechada" };
  if (!item || !TIPOS_VENDAVEIS.includes(item.type) || !lojaDoItem(item).venda) return { ok: false, motivo: "itemInvalido" };
  if (lojaDoItem(item).oculto) return { ok: false, motivo: "itemInvalido" };
  if (item.system?.semVenda) return { ok: false, motivo: "semPreco" };
  const q = quantidade;
  if (!Number.isInteger(q) || q < 1 || q > QUANTIDADE_MAXIMA) return { ok: false, motivo: "quantidadeInvalida" };
  const estoque = lojaDoItem(item).quantidade;
  if (estoque === 0) return { ok: false, motivo: "esgotado" };
  if (estoque !== null && q > estoque) return { ok: false, motivo: "semEstoque", estoque };
  const total = precoTotal(item, q, mercador.loja.multiplicadorPreco);
  if (total <= 0) return { ok: false, motivo: "semPreco" };
  const moedas = debitar(comprador?.moedas, total);
  if (!moedas) return { ok: false, motivo: "semDinheiro", total };
  return {
    ok: true, total, moedas,
    estoque: estoque === null ? null : estoque - q,
    caixa: mercador.caixaInfinita ? null : creditar(mercador.caixa, total)
  };
}

/* ---------------- Entrega e empilhamento ---------------- */

/** O item empilha (soma a quantidade em vez de duplicar)? Munição e equipamentos que não se vestem. */
export function empilha(dados) {
  if (dados?.type === "municao") return true;
  if (dados?.type !== "equipamento") return false;
  const s = dados.system ?? {};
  return !TIPOS_EQUIPAVEIS.includes(s.tipo) && !s.vestimenta;
}

/** Origem do item (para "o mesmo item"): id do compêndio do sistema ou a fonte do compêndio. */
const origemDe = dados => dados?.flags?.[SISTEMA_ID]?.id ?? dados?._stats?.compendiumSource ?? dados?.flags?.core?.sourceId ?? null;

/** Item do comprador com o qual a compra empilha (mesmo tipo, nome e origem; munição: mesmo tipo de munição), ou null. */
export function itemParaEmpilhar(itensDoComprador, dados) {
  if (!empilha(dados)) return null;
  return (itensDoComprador ?? []).find(i => i.type === dados.type && (dados.type === "municao"
    ? i.system?.tipo === dados.system?.tipo
    : i.name === dados.name && origemDe(i) === origemDe(dados))) ?? null;
}

/** Unidades que entram no inventário: munição em unidades (pacotes × 20); os outros, a quantidade. */
export const unidadesCompradas = (dados, quantidade) => (dados?.type === "municao" ? n0(quantidade) * TAMANHO_PACOTE : n0(quantidade));

/** Dados do item para o comprador: cópia sem _id, sem as flags da loja, com a quantidade comprada. */
export function dadosDaCompra(dadosDoItem, quantidade) {
  const d = structuredClone(dadosDoItem);
  delete d._id;
  delete d.folder;
  delete d.sort;
  if (d.flags?.[SISTEMA_ID]) delete d.flags[SISTEMA_ID].loja;
  d.system = { ...(d.system ?? {}), quantidade: unidadesCompradas(d, quantidade) };
  if (d.system.equipado !== undefined) d.system.equipado = false;
  return d;
}

/* ---------------- Venda ao mercador (Fase 2: loja.compra.ativo) ---------------- */

/** Quanto o mercador paga por uma unidade: precoVenda do item, ou preço × percentual. 0 = não compra. */
export function precoDeVenda(item, percentual = 0.5) {
  if (!TIPOS_VENDAVEIS.includes(item?.type) || item.system?.semVenda) return 0;
  if (item.system?.precoVenda !== null && item.system?.precoVenda !== undefined) return n0(item.system.precoVenda);
  const p = Number(percentual);
  return Math.round(precoDoItemNaLoja(item) * (Number.isFinite(p) && p > 0 ? p : 0));
}

/** Quantidade que o jogador tem para vender (munição em pacotes inteiros). */
export const quantidadeVendavel = item => (item?.type === "municao" ? Math.floor(n0(item.system?.quantidade) / TAMANHO_PACOTE) : Math.max(1, n0(item?.system?.quantidade)));

/**
 * Valida uma venda ao mercador. @returns {{ ok:false, motivo } | { ok:true, total, moedas, caixa, resta }}
 *   moedas: do vendedor; caixa: do mercador (null = infinita); resta: quantidade que fica com o vendedor
 */
export function validarVenda(mercador, item, quantidade, vendedor, { dono = true } = {}) {
  if (!dono) return { ok: false, motivo: "semPermissao" };
  if (!mercador?.loja?.aberta) return { ok: false, motivo: "lojaFechada" };
  if (!mercador.loja.compra?.ativo) return { ok: false, motivo: "naoCompra" };
  const unitario = precoDeVenda(item, mercador.loja.compra.percentual);
  if (!unitario) return { ok: false, motivo: "semVenda" };
  const q = quantidade;
  const tem = quantidadeVendavel(item);
  if (!Number.isInteger(q) || q < 1 || q > tem) return { ok: false, motivo: "quantidadeInvalida" };
  const total = unitario * q;
  let caixa = null;
  if (!mercador.caixaInfinita) {
    caixa = debitar(mercador.caixa, total);
    if (!caixa) return { ok: false, motivo: "caixaSemDinheiro", total };
  }
  const unidades = item.type === "municao" ? q * TAMANHO_PACOTE : q;
  return { ok: true, total, moedas: creditar(vendedor?.moedas, total), caixa, resta: n0(item.system?.quantidade) - unidades };
}

/* ---------------- Pedido do jogador (socket) ---------------- */

const UUID_ATOR = /^(Actor\.[A-Za-z0-9]{16}|Scene\.[A-Za-z0-9]{16}\.Token\.[A-Za-z0-9]{16}\.Actor\.[A-Za-z0-9]{16})$/;
const ID = /^[A-Za-z0-9]{16}$/;

/**
 * Valida o pedido que o jogador manda ao Mestre ({ mercadorUuid, itemId, quantidade, compradorUuid }).
 * Preço nunca vem do jogador. Devolve o pedido limpo ou null.
 */
export function validarPedidoDeLoja(msg) {
  if (!msg || typeof msg !== "object") return null;
  const { mercadorUuid, itemId, quantidade, compradorUuid } = msg;
  if (typeof mercadorUuid !== "string" || !UUID_ATOR.test(mercadorUuid)) return null;
  if (typeof compradorUuid !== "string" || !UUID_ATOR.test(compradorUuid)) return null;
  if (typeof itemId !== "string" || !ID.test(itemId)) return null;
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > QUANTIDADE_MAXIMA) return null;
  return { mercadorUuid, itemId, quantidade, compradorUuid };
}

/** Saldo em centavos (atalho para a vitrine). */
export const saldo = moedas => totalEmCentavos(moedas);
