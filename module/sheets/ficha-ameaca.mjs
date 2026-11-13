/**
 * Ficha da Ameaça (ApplicationV2: ActorSheetV2 + Handlebars), compacta para o Mestre usar várias
 * ao mesmo tempo. Aba Ficha: cabeçalho (retrato, nome, subtítulo, papel, ND, tipo, tamanho), faixa de
 * números (Defesa, PV, PM se houver, Iniciativa, CD, Deslocamento), salvaguardas, ataques naturais
 * (Atacar / Dano: module/ameaca-ataques.mjs), habilidades (itens "poder", texto sempre visível),
 * atributos, perícias (recolhidas), sentidos, tesouro e notas. Aba Token: o mesmo editor do
 * personagem (module/token.mjs).
 * Rolar vale para o dono com a ficha travada (como no personagem); Shift = vantagem, Ctrl = desvantagem.
 */
import { SISTEMA_ID, ATRIBUTOS, PERICIAS, ICONE_PADRAO } from "../config.mjs";
import { comSinal } from "../regras.mjs";
import { rolarPericia, rolarAtributo, modoDoEvento } from "../rolls.mjs";
import { usarPoder } from "../acoes.mjs";
import { contextoDoToken, ligarEditor, trocarRetrato } from "../token.mjs";
import { PAPEIS, TAMANHOS_AMEACA, textoDoDano } from "../ameaca-dados.mjs";
import { rolarAtaqueNatural, rolarDanoNatural, bonusDoAtaqueNatural } from "../ameaca-ataques.mjs";
import { nomeDoTipo } from "../dano.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const ActorSheetV2 = foundry.applications.sheets?.ActorSheetV2 ?? foundry.applications.api.DocumentSheetV2;
const loc = k => game.i18n.localize(k);
/** Perícias que a ficha mostra à parte (salvaguardas e iniciativa têm o valor pronto). */
const A_PARTE = ["fortitude", "reflexos", "vontade", "iniciativa"];
const SALVAGUARDAS = [["fort", "fortitude"], ["ref", "reflexos"], ["von", "vontade"]];
const ALCANCES = ["corpo-a-corpo", "distancia"];
export const ABAS_AMEACA = ["ficha", "token"];

export class FichaAmeaca extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["icarus", "sheet", "actor", "ficha-mercador", "ficha-ameaca"],
    position: { width: 600, height: 820 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      aba: FichaAmeaca._aba,
      imagem: FichaAmeaca._imagem,
      rolarPericia: FichaAmeaca._rolarPericia,
      rolarAtributo: FichaAmeaca._rolarAtributo,
      atacar: FichaAmeaca._atacar,
      dano: FichaAmeaca._dano,
      adicionarAtaque: FichaAmeaca._adicionarAtaque,
      removerAtaque: FichaAmeaca._removerAtaque,
      usarPoder: FichaAmeaca._usarPoder,
      abrirItem: FichaAmeaca._abrirItem,
      removerItem: FichaAmeaca._removerItem,
      criarHabilidade: FichaAmeaca._criarHabilidade
    }
  };

  static PARTS = { ficha: { template: `systems/${SISTEMA_ID}/templates/actor/ameaca.hbs`, scrollable: [".fm-corpo"] } };

  /** Aba aberta (só nesta janela). */
  aba = "ficha";

  async _prepareContext(options) {
    const actor = this.document;
    const s = actor.system;
    const src = actor._source.system;
    const treinos = t => [0, 1, 2].map(v => ({ valor: v, rotulo: loc(`ICARUS.Mercador.Treinos.${v}`), selecionado: v === t }));
    const linhas = PERICIAS.filter(p => !A_PARTE.includes(p.chave)).map(p => {
      const d = s.pericias[p.chave];
      const salvo = src.pericias?.[p.chave] ?? {};
      return { chave: p.chave, nome: p.nome, atributo: d.atributo, total: comSinal(d.total), treinos: treinos(salvo.treino ?? 0), outros: salvo.outros ?? 0,
        destaque: (salvo.treino ?? 0) > 0 || (salvo.outros ?? 0) !== 0 };
    });
    const habilidades = [];
    for (const i of actor.items.filter(x => x.type === "poder").sort((a, b) => (a.sort || 0) - (b.sort || 0))) {
      habilidades.push({ id: i.id, nome: i.name, texto: await TextEditor.enrichHTML(i.system.descricao ?? "", { async: true, relativeTo: i }) });
    }
    const imunes = Object.entries(s.resistencias?.imunidade ?? {}).filter(([, v]) => v).map(([t]) => nomeDoTipo(t));
    return {
      actor, aba: this.aba, editavel: this.isEditable, gm: game.user.isGM,
      img: actor.img, nome: actor.name, s, src,
      abas: ABAS_AMEACA.map(id => ({ id, rotulo: loc(`ICARUS.Ameaca.Abas.${id}`), ativa: id === this.aba })),
      papelRotulo: loc(`ICARUS.Ameaca.Papeis.${src.papel}`),
      tamanhoRotulo: loc(`ICARUS.Ameaca.Tamanhos.${src.tamanho}`),
      mostrarAcompanha: !!src.acompanha,
      mostrarPM: (src.pm?.max ?? 0) > 0 || (src.pm?.value ?? 0) > 0,
      defesa: { total: s.defesa.total, dica: s.defesa.total !== src.defesa.valor ? game.i18n.format("ICARUS.Ameaca.DefesaAlterada", { valor: src.defesa.valor }) : "" },
      iniciativa: comSinal(s.pericias.iniciativa.total),
      cdTexto: src.cd ?? "",
      salvaguardas: SALVAGUARDAS.map(([chave, pericia]) => ({ chave, pericia, rotulo: loc(`ICARUS.Pericias.${pericia}`), valor: src.salvaguardas?.[chave] ?? 0, total: comSinal(s.pericias[pericia].total) })),
      ataques: (src.ataques ?? []).map((a, indice) => ({
        indice, ...a,
        bonusTexto: comSinal(bonusDoAtaqueNatural(s, a).bonus),
        danoTexto: textoDoDano(a),
        alcances: ALCANCES.map(v => ({ valor: v, rotulo: loc(`ICARUS.Ameaca.Alcances.${v}`), selecionado: v === (a.alcance || "corpo-a-corpo") }))
      })),
      habilidades,
      atributos: ATRIBUTOS.map(k => ({ chave: k, rotulo: loc(`ICARUS.Atributos.${k}`), base: src.atributos[k].base, total: comSinal(s.atributos[k].total) })),
      pericias: { principais: linhas.filter(l => l.destaque), outras: linhas.filter(l => !l.destaque) },
      papeis: PAPEIS.map(v => ({ valor: v, rotulo: loc(`ICARUS.Ameaca.Papeis.${v}`), selecionado: v === src.papel })),
      tamanhos: Object.keys(TAMANHOS_AMEACA).map(v => ({ valor: v, rotulo: loc(`ICARUS.Ameaca.Tamanhos.${v}`), selecionado: v === src.tamanho })),
      imunidades: imunes.join(", "),
      // "RD 5" e/ou "RD 3 (só ataques não mágicos)"
      rdTexto: [s.resistencias?.rdGeral ? `RD ${s.resistencias.rdGeral}` : "", src.resistencias?.rdNaoMagico ? game.i18n.format("ICARUS.Ameaca.RdNaoMagicoTexto", { n: src.resistencias.rdNaoMagico }) : ""].filter(Boolean).join(" · "),
      token: contextoDoToken(actor, this.isEditable)
    };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    const raiz = this.element;
    // Campos dos ataques: refazem a lista inteira (o formulário não monta a lista sozinho)
    for (const campo of raiz.querySelectorAll("[data-ataque-campo]")) {
      campo.addEventListener("change", ev => {
        ev.stopPropagation();
        const el = ev.currentTarget;
        const indice = Number(el.closest("[data-indice]")?.dataset.indice);
        const lista = foundry.utils.deepClone(this.document._source.system.ataques ?? []);
        if (!lista[indice]) return;
        const chave = el.dataset.ataqueCampo;
        lista[indice][chave] = ["bonus", "fixo"].includes(chave) ? Math.trunc(Number(el.value) || 0) : el.value;
        return this.document.update({ "system.ataques": lista });
      });
    }
    // Aba Token: liga o editor (refaz a cada render, o canvas é novo)
    if (this.aba === "token") ligarEditor(this);
  }

  /** Arrastar poderes e magias para a ficha (sempre copia). */
  _onFirstRender(context, options) {
    super._onFirstRender?.(context, options);
    this.element.addEventListener("dragover", ev => ev.preventDefault());
    this.element.addEventListener("drop", ev => this._soltar(ev));
  }

  async _soltar(event) {
    if (!this.isEditable || event.target.closest?.(".token-aba")) return;
    event.preventDefault();
    const dados = TextEditor.getDragEventData(event);
    if (dados?.type !== "Item") return;
    const item = await fromUuid(dados.uuid);
    if (!item || item.parent === this.document) return;
    const novo = item.toObject();
    delete novo._id;
    await this.document.createEmbeddedDocuments("Item", [novo]);
  }

  async close(options) {
    this._editorToken?.destruir();
    this._editorToken = null;
    return super.close(options);
  }

  _itemDe(alvo) {
    return this.document.items.get(alvo.closest("[data-item-id]")?.dataset.itemId);
  }

  static _aba(event, alvo) {
    if (this.aba === "token" && alvo.dataset.aba !== "token") { this._editorToken?.destruir(); this._editorToken = null; }
    this.aba = alvo.dataset.aba;
    this.render();
  }

  static _imagem() {
    if (!this.isEditable) return null;
    return trocarRetrato(this.document);
  }

  static _rolarPericia(event, alvo) {
    return rolarPericia(this.document, alvo.dataset.pericia, { ...modoDoEvento(event), semItens: true });
  }

  static _rolarAtributo(event, alvo) {
    return rolarAtributo(this.document, alvo.dataset.atributo, modoDoEvento(event));
  }

  static _atacar(event, alvo) {
    return rolarAtaqueNatural(this.document, Number(alvo.closest("[data-indice]")?.dataset.indice), modoDoEvento(event));
  }

  /** Dano direto (sem card de ataque); Shift = dano crítico. */
  static _dano(event, alvo) {
    return rolarDanoNatural(this.document, Number(alvo.closest("[data-indice]")?.dataset.indice), { critico: !!event.shiftKey });
  }

  static _adicionarAtaque() {
    const lista = foundry.utils.deepClone(this.document._source.system.ataques ?? []);
    lista.push({ nome: loc("ICARUS.Ameaca.NovoAtaque"), bonus: 0, dados: "1d6", fixo: 0, tipo: "impacto", alcance: "corpo-a-corpo" });
    return this.document.update({ "system.ataques": lista });
  }

  static _removerAtaque(event, alvo) {
    const indice = Number(alvo.closest("[data-indice]")?.dataset.indice);
    const lista = (this.document._source.system.ataques ?? []).filter((_, i) => i !== indice);
    return this.document.update({ "system.ataques": lista });
  }

  static _usarPoder(event, alvo) {
    const item = this._itemDe(alvo);
    return item ? usarPoder(this.document, item) : null;
  }

  static _abrirItem(event, alvo) {
    this._itemDe(alvo)?.sheet?.render(true);
  }

  static async _removerItem(event, alvo) {
    const item = this._itemDe(alvo);
    if (item) await item.delete();
  }

  static async _criarHabilidade() {
    const [item] = await this.document.createEmbeddedDocuments("Item", [{ name: loc("ICARUS.Ameaca.NovaHabilidade"), type: "poder", img: ICONE_PADRAO, system: { descricao: "" } }]);
    item?.sheet?.render(true);
  }
}
