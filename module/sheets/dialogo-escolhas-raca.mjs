import { SISTEMA_ID, ATRIBUTOS } from "../config.mjs";
import { comSinal } from "../regras.mjs";
import { periciasPermitidas, atributosLivresValidos } from "../data/racas.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Diálogo de escolhas da raça (atributos livres, variante, perícia, texto).
 * Uso: const escolhas = await DialogoEscolhasRaca.escolher(actor, raca, escolhasAnteriores);
 * Devolve null se o jogador fechar ou cancelar: a raça é aplicada sem as escolhas (ficam pendentes).
 */
export class DialogoEscolhasRaca extends HandlebarsApplicationMixin(ApplicationV2) {
  /** Abre o diálogo e espera o jogador confirmar ou cancelar. */
  static escolher(actor, raca, anteriores = {}) {
    return new Promise(resolve => new this(actor, raca, anteriores, resolve).render(true));
  }

  constructor(actor, raca, anteriores, resolve) {
    super({ id: `icarus-escolhas-raca-${actor.id}` });
    this.actor = actor;
    this.raca = raca;
    this.anteriores = anteriores ?? {};
    this._resolve = resolve;
    this._resultado = null;
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["icarus", "icarus-dialogo"],
    window: { title: "ICARUS.Racas.Escolhas.Titulo", icon: "fa-solid fa-dna" },
    position: { width: 560, height: "auto" },
    form: { handler: DialogoEscolhasRaca._aoConfirmar, submitOnChange: false, closeOnSubmit: true },
    actions: { cancelar: DialogoEscolhasRaca._aoCancelar }
  };

  static PARTS = {
    form: { template: `systems/${SISTEMA_ID}/templates/dialogo-escolhas-raca.hbs` }
  };

  get title() {
    return `${game.i18n.localize("ICARUS.Racas.Escolhas.Titulo")} — ${this.raca.nome}`;
  }

  async _prepareContext(options) {
    const a = this.anteriores;
    const nomePericia = k => game.i18n.localize(`ICARUS.Pericias.${k}`);
    const escolhas = (this.raca.escolhas ?? []).map((e, i) => {
      const base = { indice: i, tipo: e.tipo, [`eh_${e.tipo}`]: true };
      switch (e.tipo) {
        case "atributosLivres":
          return {
            ...base,
            rotulo: game.i18n.format("ICARUS.Racas.Escolhas.Atributos", { distribuicao: e.distribuicao.map(comSinal).join(" / ") }),
            linhas: e.distribuicao.map((valor, j) => ({
              nome: `e${i}-${j}`,
              valor: comSinal(valor),
              opcoes: ATRIBUTOS.map(k => ({ valor: k, rotulo: `${k} · ${game.i18n.localize(`ICARUS.Atributos.${k}`)}`, selecionado: a.atributos?.[j] === k }))
            }))
          };
        case "variante":
          return {
            ...base,
            rotulo: e.rotulo,
            opcoes: e.opcoes.map(o => ({ nome: `e${i}`, valor: o.id, rotulo: o.rotulo, marcado: a.variante === o.id }))
          };
        case "periciaEspecialista":
        case "periciaTreinada":
          return {
            ...base,
            eh_pericia: true,
            rotulo: game.i18n.format(e.tipo === "periciaEspecialista" ? "ICARUS.Racas.Escolhas.Especialista" : "ICARUS.Racas.Escolhas.Treinada", { poder: e.poder }),
            nome: `e${i}`,
            opcoes: periciasPermitidas(e)
              .map(k => ({ valor: k, rotulo: nomePericia(k), selecionado: a.pericias?.[e.poder] === k }))
              .sort((x, y) => x.rotulo.localeCompare(y.rotulo, "pt-BR"))
          };
        case "texto":
          return { ...base, rotulo: `${e.poder}: ${e.rotulo}`, nome: `e${i}`, valor: a.textos?.[e.poder] ?? "" };
        default:
          return base;
      }
    });
    return { raca: this.raca, escolhas };
  }

  /** Lê o formulário no formato que resolverRaca espera. */
  _lerEscolhas() {
    const dados = new FormData(this.element);
    const escolhas = { pericias: {}, textos: {} };
    (this.raca.escolhas ?? []).forEach((e, i) => {
      const valor = String(dados.get(`e${i}`) ?? "").trim();
      if (e.tipo === "atributosLivres") escolhas.atributos = e.distribuicao.map((_, j) => String(dados.get(`e${i}-${j}`) ?? ""));
      else if (e.tipo === "variante") escolhas.variante = valor;
      else if (e.tipo === "periciaEspecialista" || e.tipo === "periciaTreinada") escolhas.pericias[e.poder] = valor;
      else if (e.tipo === "texto") escolhas.textos[e.poder] = valor;
    });
    return escolhas;
  }

  /** Confirmar só fica liberado com os atributos livres completos e diferentes. */
  _validar() {
    const escolhas = this._lerEscolhas();
    const livres = (this.raca.escolhas ?? []).find(e => e.tipo === "atributosLivres");
    const ok = !livres || atributosLivresValidos(livres, escolhas.atributos);
    const botao = this.element.querySelector("button[type='submit']");
    if (botao) botao.disabled = !ok;
    const aviso = this.element.querySelector(".aviso-atributos");
    if (aviso) aviso.hidden = ok;
  }

  _onFirstRender(context, options) {
    super._onFirstRender?.(context, options);
    this.element.addEventListener("change", () => this._validar());
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    this._validar();
  }

  static _aoConfirmar() {
    this._resultado = this._lerEscolhas();
  }

  static _aoCancelar() {
    this.close();
  }

  _onClose(options) {
    super._onClose?.(options);
    this._resolve?.(this._resultado);
    this._resolve = null;
  }
}

