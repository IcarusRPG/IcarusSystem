/**
 * Vitrine do Mercador (ApplicationV2): o que o jogador vê ao abrir o mercador. Retrato grande,
 * nome, fala de abertura e a lista à venda (preço, estoque, quantidade, Comprar). Sem Defesa, PV,
 * PM, atributos nem notas. Com loja.compra.ativo, a aba "Vender" (o mercador compra do jogador).
 * A compra é feita pelo Mestre (loja-foundry.mjs); a vitrine se atualiza com o estoque e o dinheiro.
 */
import { SISTEMA_ID } from "../config.mjs";
import { formatarPreco, precoEmOuro, totalEmCentavos } from "../moeda.mjs";
import { lojaDoItem, precoUnitario, visivelNaVitrine, precoDeVenda, quantidadeVendavel, TIPOS_VENDAVEIS } from "../loja.mjs";
import { pedirNaLoja } from "../loja-foundry.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const F = SISTEMA_ID;
const loc = k => game.i18n.localize(k);
const reais = c => (formatarPreco(c) === "—" ? "R$ 0" : formatarPreco(c));

/** Vitrines abertas (para atualizar com o estoque e o dinheiro). */
const ABERTAS = new Set();

/**
 * Quem pode comprar: o personagem do usuário, os tokens controlados e, para o Mestre, os
 * personagens dos jogadores. Só atores "personagem" que o usuário controla (o Mestre, todos).
 */
export function compradoresPossiveis() {
  const lista = [game.user.character, ...(canvas?.tokens?.controlled ?? []).map(t => t.actor)];
  if (game.user.isGM) lista.push(...game.actors.filter(a => a.type === "personagem" && a.hasPlayerOwner));
  else lista.push(...game.actors.filter(a => a.type === "personagem" && a.isOwner));
  const vistos = new Set();
  return lista.filter(a => a?.type === "personagem" && a.isOwner && !vistos.has(a.uuid) && vistos.add(a.uuid));
}

export class VitrineMercador extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(mercador, opcoes = {}) {
    super({ id: `icarus-vitrine-${mercador.id}`, ...opcoes });
    this.mercador = mercador;
    this.compradorUuid = compradoresPossiveis()[0]?.uuid ?? null;
    this.aba = "comprar";
  }

  static DEFAULT_OPTIONS = {
    classes: ["icarus", "icarus-dialogo", "vitrine-mercador"],
    position: { width: 760, height: 860 },
    window: { resizable: true, icon: "fa-solid fa-store" },
    actions: { comprar: VitrineMercador._comprar, vender: VitrineMercador._vender, aba: VitrineMercador._aba }
  };

  static PARTS = { vitrine: { template: `systems/${SISTEMA_ID}/templates/vitrine-mercador.hbs`, scrollable: [".vm-lista"] } };

  get title() {
    return this.mercador.name;
  }

  get comprador() {
    return this.compradorUuid ? fromUuidSync(this.compradorUuid) : null;
  }

  async _prepareContext() {
    const m = this.mercador;
    const s = m.system;
    const mult = s.loja.multiplicadorPreco;
    const aberta = !!s.loja.aberta;
    const comprador = this.comprador;
    const saldo = comprador ? totalEmCentavos(comprador.system.moedas) : 0;
    const itens = m.items.filter(visivelNaVitrine).map(i => {
      const l = lojaDoItem(i);
      const preco = precoUnitario(i, mult);
      const semEstoque = l.quantidade === 0;
      return {
        id: i.id, nome: i.name, img: i.img, dica: (i.system.descricao ?? "").replace(/<[^>]+>/g, "").trim(),
        estoque: l.quantidade === null ? "∞" : l.quantidade, max: l.quantidade ?? 999,
        preco: formatarPreco(preco), precoOuro: precoEmOuro(preco), esgotado: semEstoque,
        desativado: !aberta || !comprador || semEstoque || preco <= 0 || i.system.semVenda
      };
    });
    const compra = s.loja.compra;
    const venda = compra?.ativo && comprador
      ? comprador.items.filter(i => TIPOS_VENDAVEIS.includes(i.type)).map(i => ({ item: i, preco: precoDeVenda(i, compra.percentual) }))
        .filter(x => x.preco > 0 && quantidadeVendavel(x.item) > 0)
        .map(x => ({ id: x.item.id, nome: x.item.name, img: x.item.img, tem: quantidadeVendavel(x.item), preco: formatarPreco(x.preco), desativado: !aberta }))
      : [];
    return {
      img: m.img, nome: m.name, saudacao: s.loja.saudacao, aberta,
      itens, venda, podeVender: !!compra?.ativo, aba: this.aba,
      compradores: compradoresPossiveis().map(a => ({ uuid: a.uuid, nome: a.name, selecionado: a.uuid === this.compradorUuid })),
      comprador: comprador?.name ?? "", saldo: reais(saldo), semComprador: !comprador
    };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    this.element.querySelector("[data-comprador]")?.addEventListener("change", ev => {
      this.compradorUuid = ev.currentTarget.value || null;
      this.render();
    });
  }

  _onFirstRender(context, options) {
    super._onFirstRender?.(context, options);
    ABERTAS.add(this);
  }

  _onClose(options) {
    super._onClose?.(options);
    ABERTAS.delete(this);
    // Despedida do mercador ao fechar (só para quem fecha)
    const despedida = this.mercador.system.loja.despedida;
    if (despedida && !this._semDespedida) ui.notifications.info(`${this.mercador.name}: ${despedida}`);
  }

  static _aba(event, alvo) {
    this.aba = alvo.dataset.aba;
    this.render();
  }

  static async _comprar(event, alvo) {
    const linha = alvo.closest("[data-item-id]");
    const quantidade = Math.trunc(Number(linha.querySelector("[data-quantidade]")?.value) || 1);
    if (!this.comprador) return ui.notifications.warn(loc("ICARUS.Loja.SemComprador"));
    alvo.disabled = true;
    await pedirNaLoja("comprar", { mercador: this.mercador, itemId: linha.dataset.itemId, quantidade, comprador: this.comprador });
    alvo.disabled = false;
  }

  static async _vender(event, alvo) {
    const linha = alvo.closest("[data-item-id]");
    const quantidade = Math.trunc(Number(linha.querySelector("[data-quantidade]")?.value) || 1);
    if (!this.comprador) return ui.notifications.warn(loc("ICARUS.Loja.SemComprador"));
    alvo.disabled = true;
    await pedirNaLoja("vender", { mercador: this.mercador, itemId: linha.dataset.itemId, quantidade, comprador: this.comprador });
    alvo.disabled = false;
  }
}

/** Abre (ou traz para frente) a vitrine do mercador. */
export function abrirVitrine(mercador, { comoJogador = false } = {}) {
  const aberta = [...ABERTAS].find(v => v.mercador === mercador);
  if (aberta) return aberta.render(true);
  const v = new VitrineMercador(mercador);
  if (comoJogador) v.comoJogador = true;
  return v.render(true);
}

/** Atualiza as vitrines quando muda o mercador, o estoque ou o dinheiro/inventário do comprador. */
function atualizarVitrines(actor) {
  for (const v of ABERTAS) if (actor && (v.mercador === actor || v.comprador === actor)) v.render();
}

export function registrarVitrine() {
  Hooks.on("updateActor", actor => atualizarVitrines(actor));
  for (const h of ["createItem", "updateItem", "deleteItem"]) Hooks.on(h, item => atualizarVitrines(item.parent));
  Hooks.on("controlToken", () => { for (const v of ABERTAS) v.render(); });
}

