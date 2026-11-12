/**
 * Ficha do Mercador (ApplicationV2: ActorSheetV2 + Handlebars), compacta, com 3 abas:
 * Ficha (números digitados), Loja (estoque: arrastar itens, quantidade/∞, preço, oculto) e Notas.
 * Quem não é Mestre nem dono não vê esta ficha: render() abre a vitrine (vitrine-mercador.mjs).
 */
import { SISTEMA_ID, ATRIBUTOS } from "../config.mjs";
import { formatarPreco, precoEmOuro, totalEmCentavos } from "../moeda.mjs";
import { lojaDoItem, precoBase, precoUnitario, TIPOS_VENDAVEIS } from "../loja.mjs";
import { abrirVitrine } from "./vitrine-mercador.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
// v12: ActorSheetV2 (com DocumentSheetV2 de reserva, como a ficha do animal)
const ActorSheetV2 = foundry.applications.sheets?.ActorSheetV2 ?? foundry.applications.api.DocumentSheetV2;
const F = SISTEMA_ID;
const loc = k => game.i18n.localize(k);

/** Estoque novo: à venda, 1 unidade, preço do item, visível. */
export const LOJA_PADRAO = { venda: true, quantidade: 1, precoBase: null, oculto: false };

export class FichaMercador extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["icarus", "sheet", "actor", "ficha-mercador"],
    position: { width: 640, height: 760 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      aba: FichaMercador._aba,
      imagem: FichaMercador._imagem,
      verComoJogador: FichaMercador._verComoJogador,
      alternarLoja: FichaMercador._alternarLoja,
      removerItem: FichaMercador._removerItem,
      abrirItem: FichaMercador._abrirItem,
      adicionarLinha: FichaMercador._adicionarLinha,
      removerLinha: FichaMercador._removerLinha
    }
  };

  static PARTS = { ficha: { template: `systems/${SISTEMA_ID}/templates/actor/mercador.hbs`, scrollable: [".fm-corpo"] } };

  /** Aba aberta (só nesta janela). */
  aba = "ficha";

  /** Jogador sem posse não vê a ficha: abre a vitrine. */
  render(options, _options) {
    if (!this.document.isOwner) {
      abrirVitrine(this.document);
      return Promise.resolve(this);
    }
    return super.render(options, _options);
  }

  async _prepareContext(options) {
    const actor = this.document;
    const s = actor.system;
    const mult = s.loja.multiplicadorPreco;
    const estoque = actor.items.filter(i => TIPOS_VENDAVEIS.includes(i.type) && i.flags?.[F]?.loja);
    const proprios = actor.items.filter(i => !estoque.includes(i));
    const porTipo = tipo => proprios.filter(i => i.type === tipo).map(i => ({ id: i.id, nome: i.name, img: i.img, equipado: !!i.system.equipado, temEquipado: "equipado" in (i.system ?? {}) }));
    return {
      actor, aba: this.aba, editavel: this.isEditable,
      img: actor.img, nome: actor.name, s,
      atributos: ATRIBUTOS.map(k => ({ chave: k, rotulo: loc(`ICARUS.Atributos.${k}`), valor: s.atributos[k] })),
      pericias: s.pericias.map((p, i) => ({ ...p, i })),
      habilidades: s.habilidades.map((h, i) => ({ ...h, i })),
      magias: porTipo("magia"),
      equipamento: [...porTipo("arma"), ...porTipo("equipamento"), ...porTipo("municao")],
      estoque: estoque.map(i => {
        const l = lojaDoItem(i);
        return {
          id: i.id, nome: i.name, img: i.img, infinito: l.quantidade === null, quantidade: l.quantidade ?? "",
          // Preço base digitado em Reais (guardado em centavos); vazio = preço do item
          precoBase: l.precoBase === null ? "" : l.precoBase / 100, precoItem: formatarPreco(precoBase(i)), precoFinal: formatarPreco(precoUnitario(i, mult)),
          dicaOuro: precoEmOuro(precoUnitario(i, mult)), oculto: l.oculto, semVenda: !!i.system.semVenda
        };
      }),
      caixaTotal: formatarPreco(totalEmCentavos(s.caixa)) === "—" ? "R$ 0" : formatarPreco(totalEmCentavos(s.caixa)),
      descricao: await TextEditor.enrichHTML(s.descricao ?? "", { async: true }),
      notas: s.notas
    };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    const raiz = this.element;
    // Estoque: cada campo atualiza a flag da loja do item
    for (const campo of raiz.querySelectorAll("[data-loja-campo]")) {
      campo.addEventListener("change", ev => {
        const el = ev.currentTarget;
        const item = this.document.items.get(el.closest("[data-item-id]")?.dataset.itemId);
        if (!item) return;
        const chave = el.dataset.lojaCampo;
        let valor;
        if (chave === "infinito") return item.update({ [`flags.${F}.loja.quantidade`]: el.checked ? null : 1 });
        if (chave === "oculto") valor = el.checked;
        else if (chave === "precoBase") valor = el.value === "" ? null : Math.max(0, Math.round(Number(el.value) * 100));
        else valor = Math.max(0, Math.trunc(Number(el.value) || 0));
        return item.update({ [`flags.${F}.loja.${chave}`]: valor });
      });
    }
    // Perícias e habilidades: listas simples (o formulário não monta arrays sozinho)
    for (const campo of raiz.querySelectorAll("[data-lista]")) {
      campo.addEventListener("change", ev => {
        const el = ev.currentTarget;
        const lista = foundry.utils.deepClone(this.document.system[el.dataset.lista]);
        const linha = lista[Number(el.dataset.indice)];
        if (!linha) return;
        linha[el.dataset.campo] = el.type === "number" ? Math.trunc(Number(el.value) || 0) : el.value;
        this.document.update({ [`system.${el.dataset.lista}`]: lista });
      });
    }
    // Equipado (lista simples)
    for (const caixa of raiz.querySelectorAll("[data-equipado]")) {
      caixa.addEventListener("change", ev => this.document.items.get(ev.currentTarget.closest("[data-item-id]")?.dataset.itemId)?.update({ "system.equipado": ev.currentTarget.checked }));
    }
  }

  /** Arrastar itens (uma vez por janela): na aba Loja entram no estoque; nas outras, como itens do mercador. */
  _onFirstRender(context, options) {
    super._onFirstRender?.(context, options);
    this.element.addEventListener("dragover", ev => ev.preventDefault());
    this.element.addEventListener("drop", ev => this._soltar(ev));
  }

  async _soltar(event) {
    event.preventDefault();
    if (!this.isEditable) return;
    const dados = TextEditor.getDragEventData(event);
    if (dados?.type !== "Item") return;
    const item = await fromUuid(dados.uuid);
    if (!item || item.parent === this.document) return;
    const novo = item.toObject();
    delete novo._id;
    if (this.aba === "loja") {
      if (!TIPOS_VENDAVEIS.includes(novo.type)) return ui.notifications.warn(loc("ICARUS.Loja.NaoVendavel"));
      foundry.utils.setProperty(novo, `flags.${F}.loja`, { ...LOJA_PADRAO });
      if (novo.system && "quantidade" in novo.system) novo.system.quantidade = novo.type === "municao" ? 20 : 1;
    }
    await this.document.createEmbeddedDocuments("Item", [novo]);
  }

  static _aba(event, alvo) {
    this.aba = alvo.dataset.aba;
    this.render();
  }

  static _imagem() {
    const actor = this.document;
    return new FilePicker({ type: "image", current: actor.img, callback: caminho => actor.update({ img: caminho, "prototypeToken.texture.src": caminho }) }).browse();
  }

  static _verComoJogador() {
    abrirVitrine(this.document, { comoJogador: true });
  }

  static _alternarLoja() {
    return this.document.update({ "system.loja.aberta": !this.document.system.loja.aberta });
  }

  static async _removerItem(event, alvo) {
    const item = this.document.items.get(alvo.closest("[data-item-id]")?.dataset.itemId);
    if (item) await item.delete();
  }

  static _abrirItem(event, alvo) {
    this.document.items.get(alvo.closest("[data-item-id]")?.dataset.itemId)?.sheet?.render(true);
  }

  static _adicionarLinha(event, alvo) {
    const lista = alvo.dataset.lista;
    const nova = lista === "pericias" ? { nome: "", bonus: 0 } : { nome: "", descricao: "" };
    return this.document.update({ [`system.${lista}`]: [...foundry.utils.deepClone(this.document.system[lista]), nova] });
  }

  static _removerLinha(event, alvo) {
    const lista = alvo.dataset.lista;
    const nova = foundry.utils.deepClone(this.document.system[lista]).filter((_, i) => i !== Number(alvo.dataset.indice));
    return this.document.update({ [`system.${lista}`]: nova });
  }
}
