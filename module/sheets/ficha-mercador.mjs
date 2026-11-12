/**
 * Ficha do Mercador (ApplicationV2: ActorSheetV2 + Handlebars), compacta, com 3 abas:
 * Ficha (números digitados), Loja (estoque finito: arrastar de qualquer lugar ou criar; quantidade,
 * preço do mercador, oculto, "libera com"; e a Barganha) e Notas.
 * Quem não é Mestre nem dono não vê esta ficha: render() abre a vitrine (vitrine-mercador.mjs).
 */
import { SISTEMA_ID, ATRIBUTOS, ICONE_PADRAO } from "../config.mjs";
import { formatarPreco, precoEmOuro, totalEmCentavos } from "../moeda.mjs";
import {
  lojaDoItem, precoBase, precoUnitario, precoDoItemNaLoja, TIPOS_VENDAVEIS, LIBERA_COM, TESTES_DE_BARGANHA, RESULTADOS, textoDasFalasPadrao, ROUBO_PADRAO
} from "../loja.mjs";
import { estadoDaBarganha, efeitosDoMercador, reiniciarBarganhas, acalmarGuardas, zerarTentativasDoUsuario } from "../loja-foundry.mjs";
import { abrirVitrine } from "./vitrine-mercador.mjs";

const { HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;
// v12: ActorSheetV2 (com DocumentSheetV2 de reserva, como a ficha do animal)
const ActorSheetV2 = foundry.applications.sheets?.ActorSheetV2 ?? foundry.applications.api.DocumentSheetV2;
const F = SISTEMA_ID;
const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);
const esc = t => Handlebars.escapeExpression(t ?? "");
const reais = c => (formatarPreco(c) === "—" ? "R$ 0" : formatarPreco(c));
const centavos = v => (v === "" || v === null || v === undefined ? null : Math.max(0, Math.round(Number(String(v).replace(",", ".")) * 100) || 0));

/** Estoque novo: à venda, 1 unidade, preço do item, visível, liberado por qualquer teste. */
export const LOJA_PADRAO = { venda: true, quantidade: 1, precoBase: null, oculto: false, liberaCom: "qualquer" };

/** Diálogo ao soltar/criar: quantidade, preço (em Reais) e oculto. null se cancelou. */
async function perguntarEstoque({ titulo, preco, extras = "" }) {
  const r = await DialogV2.wait({
    window: { title: titulo },
    content: `<div class="icarus-uso">${extras}
      <label class="linha">${esc(loc("ICARUS.Mercador.Quantidade"))} <input type="number" name="quantidade" value="1" min="0" step="1" autofocus></label>
      <label class="linha">${esc(loc("ICARUS.Mercador.PrecoBase"))} <input type="number" name="preco" value="${preco / 100}" min="0" step="0.01"></label>
      <label class="chk"><input type="checkbox" name="oculto"> ${esc(loc("ICARUS.Mercador.EntraOculto"))}</label></div>`,
    buttons: [
      { action: "ok", label: loc("ICARUS.Devocao.Confirmar"), default: true,
        callback: (ev, b) => Object.fromEntries([...b.form.elements].filter(e => e.name).map(e => [e.name, e.type === "checkbox" ? e.checked : e.value])) },
      { action: "cancelar", label: loc("ICARUS.Testes.Cancelar") }
    ],
    rejectClose: false
  });
  return r && typeof r === "object" ? r : null;
}

export class FichaMercador extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["icarus", "sheet", "actor", "ficha-mercador"],
    position: { width: 680, height: 800 },
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
      removerLinha: FichaMercador._removerLinha,
      criarItem: FichaMercador._criarItem,
      restaurarFalas: FichaMercador._restaurarFalas,
      reiniciarBarganhas: FichaMercador._reiniciarBarganhas,
      acalmarGuardas: FichaMercador._acalmarGuardas,
      zerarTentativas: FichaMercador._zerarTentativas
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
    const efeitos = efeitosDoMercador(actor);
    const estoque = actor.items.filter(i => TIPOS_VENDAVEIS.includes(i.type) && i.flags?.[F]?.loja);
    const proprios = actor.items.filter(i => !estoque.includes(i));
    const porTipo = tipo => proprios.filter(i => i.type === tipo).map(i => ({ id: i.id, nome: i.name, img: i.img, equipado: !!i.system.equipado, temEquipado: "equipado" in (i.system ?? {}) }));
    const estado = estadoDaBarganha(actor);
    const b = s.loja.barganha;
    return {
      actor, aba: this.aba, editavel: this.isEditable, gm: game.user.isGM,
      img: actor.img, nome: actor.name, s,
      atributos: ATRIBUTOS.map(k => ({ chave: k, rotulo: loc(`ICARUS.Atributos.${k}`), valor: s.atributos[k] })),
      pericias: s.pericias.map((p, i) => ({ ...p, i })),
      habilidades: s.habilidades.map((h, i) => ({ ...h, i })),
      magias: porTipo("magia"),
      equipamento: [...porTipo("arma"), ...porTipo("equipamento"), ...porTipo("municao")],
      estoque: estoque.map(i => {
        const l = lojaDoItem(i);
        const final = precoUnitario(i, mult, efeitos);
        return {
          id: i.id, nome: i.name, img: i.img, quantidade: l.quantidade,
          // Preço do mercador digitado em Reais (guardado em centavos); vazio = preço do item
          precoBase: l.precoBase === null ? "" : l.precoBase / 100, precoItem: formatarPreco(precoBase(i)),
          precoFinal: formatarPreco(final), dicaOuro: precoEmOuro(final), oculto: l.oculto,
          semVenda: !!i.system.semVenda && l.precoBase === null, cdRoubo: l.cdRoubo ?? "",
          libera: LIBERA_COM.map(v => ({ valor: v, rotulo: loc(`ICARUS.Mercador.Libera.${v}`), selecionado: v === l.liberaCom }))
        };
      }),
      caixaTotal: reais(totalEmCentavos(s.caixa)),
      // Barganha: configuração, falas e o estado atual
      barganha: {
        testes: TESTES_DE_BARGANHA.map(t => ({
          chave: t, nome: loc(`ICARUS.Pericias.${t}`), ativo: b.testes[t].ativo, cd: b.testes[t].cd,
          estado: estado[t]?.feito ? fmt("ICARUS.Mercador.EstadoTeste", { por: estado[t].por, resultado: loc(`ICARUS.Loja.Barganha.Rotulos.${estado[t].resultado}`) }) : loc("ICARUS.Mercador.Livre"),
          falas: RESULTADOS.map(r => ({ chave: r, rotulo: loc(`ICARUS.Loja.Barganha.Rotulos.${r}`), texto: b.falas[t][r] }))
        })),
        efeitos: [efeitos.desconto ? `−${efeitos.desconto}%` : "", efeitos.acrescimo ? `+${efeitos.acrescimo}%` : ""].filter(Boolean).join(" · "),
        guardas: !!actor.getFlag(F, "guardas"),
        algumFeito: TESTES_DE_BARGANHA.some(t => estado[t]?.feito) || Object.keys(actor.getFlag(F, "tentativasSemDinheiro") ?? {}).length > 0
      },
      // Roubo e compra sem dinheiro: tentativas por jogador e o registro dos roubos
      roubo: {
        tentativas: Object.entries(actor.getFlag(F, "tentativasSemDinheiro") ?? {}).map(([usuarioId, n]) => ({ usuarioId, n, nome: game.users.get(usuarioId)?.name ?? usuarioId })),
        roubos: [...(actor.getFlag(F, "roubos") ?? [])].reverse().map(r => ({ ...r, texto: fmt(r.passou ? "ICARUS.Mercador.RouboPassou" : "ICARUS.Mercador.RouboPego", { por: r.por, item: r.item }) }))
      },
      descricao: await TextEditor.enrichHTML(s.descricao ?? "", { async: true }),
      notas: s.notas
    };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    const raiz = this.element;
    // Estoque: cada campo atualiza o item (nome) ou a flag da loja dele
    for (const campo of raiz.querySelectorAll("[data-loja-campo]")) {
      campo.addEventListener("change", ev => {
        const el = ev.currentTarget;
        const item = this.document.items.get(el.closest("[data-item-id]")?.dataset.itemId);
        if (!item) return;
        const chave = el.dataset.lojaCampo;
        if (chave === "nome") return el.value.trim() ? item.update({ name: el.value.trim() }) : null;
        let valor;
        if (chave === "oculto") valor = el.checked;
        else if (chave === "liberaCom") valor = LIBERA_COM.includes(el.value) ? el.value : "qualquer";
        else if (chave === "precoBase") valor = centavos(el.value);
        else if (chave === "cdRoubo") valor = el.value === "" ? null : Math.max(0, Math.trunc(Number(el.value) || 0));
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

  /**
   * Soltar um item de qualquer lugar (compêndio, diretório, inventário de outro ator ou desta
   * ficha): sempre COPIA. Na aba Loja pergunta quantidade, preço e se entra oculto.
   */
  async _soltar(event) {
    event.preventDefault();
    if (!this.isEditable) return;
    const dados = TextEditor.getDragEventData(event);
    if (dados?.type !== "Item") return;
    const item = await fromUuid(dados.uuid);
    if (!item) return;
    // Uma linha do próprio estoque arrastada sobre a ficha: nada a fazer
    if (item.parent === this.document && (item.flags?.[F]?.loja || this.aba !== "loja")) return;
    const novo = item.toObject();
    delete novo._id;
    if (this.aba === "loja") {
      if (!TIPOS_VENDAVEIS.includes(novo.type)) return ui.notifications.warn(loc("ICARUS.Loja.NaoVendavel"));
      const r = await perguntarEstoque({ titulo: fmt("ICARUS.Mercador.AdicionarAoEstoque", { item: novo.name }), preco: precoDoItemNaLoja(novo) });
      if (!r) return;
      foundry.utils.setProperty(novo, `flags.${F}.loja`, { ...LOJA_PADRAO, quantidade: Math.max(0, Math.trunc(Number(r.quantidade) || 0)), precoBase: centavos(r.preco), oculto: !!r.oculto });
      if (novo.system && "quantidade" in novo.system) novo.system.quantidade = novo.type === "municao" ? 20 : 1;
      if (novo.system && "equipado" in novo.system) novo.system.equipado = false;
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

  /** "Criar item": um equipamento novo já no estoque (para o que não existe em compêndio). */
  static async _criarItem() {
    const extras = `<label class="linha">${esc(loc("ICARUS.Mercador.NomeDoItem"))} <input type="text" name="nome" required></label>
      <label class="linha">${esc(loc("ICARUS.Mercador.Icone"))} <input type="text" name="img" value="${esc(ICONE_PADRAO)}"></label>
      <label class="linha">${esc(loc("ICARUS.Mercador.Descricao"))} <textarea name="descricao" rows="3"></textarea></label>`;
    const r = await perguntarEstoque({ titulo: loc("ICARUS.Mercador.CriarItem"), preco: 0, extras });
    if (!r || !String(r.nome ?? "").trim()) return;
    await this.document.createEmbeddedDocuments("Item", [{
      name: r.nome.trim(), type: "equipamento", img: r.img || ICONE_PADRAO,
      system: { tipo: "outro", quantidade: 1, preco: centavos(r.preco) ?? 0, descricao: r.descricao ? `<p>${esc(r.descricao)}</p>` : "" },
      flags: { [F]: { loja: { ...LOJA_PADRAO, quantidade: Math.max(0, Math.trunc(Number(r.quantidade) || 0)), precoBase: centavos(r.preco), oculto: !!r.oculto } } }
    }]);
  }

  /** Volta as 12 falas às padrão. */
  static async _restaurarFalas() {
    const ok = await DialogV2.confirm({ window: { title: loc("ICARUS.Mercador.RestaurarFalas") }, content: `<p>${esc(loc("ICARUS.Mercador.RestaurarFalasTexto"))}</p>`, rejectClose: false });
    if (!ok) return;
    const falas = Object.fromEntries(TESTES_DE_BARGANHA.map(t => [t, Object.fromEntries(RESULTADOS.map(r => [r, textoDasFalasPadrao(t, r)]))]));
    return this.document.update({
      "system.loja.barganha.falas": falas,
      "system.loja.roubo.aviso": ROUBO_PADRAO.aviso, "system.loja.roubo.falasGuardas": ROUBO_PADRAO.falasGuardas,
      "system.loja.roubo.falasFlagrante": ROUBO_PADRAO.falasFlagrante, "system.loja.roubo.sucesso": ROUBO_PADRAO.sucesso
    });
  }

  static _zerarTentativas(event, alvo) {
    return zerarTentativasDoUsuario(this.document, alvo.dataset.usuario);
  }

  static _reiniciarBarganhas() {
    return reiniciarBarganhas(this.document);
  }

  static _acalmarGuardas() {
    return acalmarGuardas(this.document);
  }
}
