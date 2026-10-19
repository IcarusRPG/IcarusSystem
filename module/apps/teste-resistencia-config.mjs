/**
 * Diálogo do Mestre: configurar um Teste de Resistência.
 * Alvos (vários, PJs e NPCs misturados), exatamente um tipo (Fortitude, Reflexos ou Vontade),
 * origem (habilidade/magia com autocompletar a partir dos poderes do conjurador), conjurador
 * opcional, atributo-chave e CD. A CD é calculada por calcularCD (module/combate.mjs) quando há
 * conjurador, e continua editável: editar marca "(manual)" e "Recalcular" volta ao calculado.
 */
import { SISTEMA_ID, ATRIBUTOS } from "../config.mjs";
import { calcularCD } from "../combate.mjs";
import { PERICIAS_RESISTENCIA } from "../testes.mjs";
import { iniciarSessao, montarParticipante, resolverUuid } from "../testes-sessao.mjs";
import { candidatos, gruposDeCandidatos, uuidsSelecionados, filtrarLinhas } from "./participantes.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);
const ATRIBUTOS_DE_CONJURACAO = ["INT", "SAB", "CAR"];

export class TesteResistenciaConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  /**
   * @param {object} [pre]  pré-preenchimento: alvos, tipos de teste (padrão Fortitude/Reflexos/Vontade;
   *   ex.: Visão/Audição no Atacar nas Sombras), perícia marcada, origem e CD manual
   */
  constructor({ alvosUuids = [], tipos = PERICIAS_RESISTENCIA, pericia = null, origem = "", cd = null } = {}, options = {}) {
    super(options);
    this.alvos = new Set(alvosUuids);
    this.tipos = tipos;
    this.pericia = pericia;
    this.origem = origem;
    this.cd = cd;
    /** Vantagem/desvantagem por alvo (uuid → modo). */
    this.modos = new Map();
  }

  static DEFAULT_OPTIONS = {
    id: "icarus-teste-resistencia-config",
    classes: ["icarus", "icarus-dialogo", "icarus-teste-config"],
    window: { title: "ICARUS.Testes.Resistencia.Titulo", icon: "fa-solid fa-shield-halved", resizable: true },
    position: { width: 760, height: 780 },
    actions: {
      usarSelecionados: TesteResistenciaConfig._aoUsarSelecionados,
      todosPJs: TesteResistenciaConfig._aoTodosPJs,
      limpar: TesteResistenciaConfig._aoLimpar,
      recalcular: TesteResistenciaConfig._aoRecalcular,
      iniciar: TesteResistenciaConfig._aoIniciar,
      cancelar: TesteResistenciaConfig._aoCancelar
    }
  };

  static PARTS = { corpo: { template: `systems/${SISTEMA_ID}/templates/testes/resistencia-config.hbs` } };

  tipos = PERICIAS_RESISTENCIA;
  conjurador = "";
  atributoChave = "CAR";
  cdManual = false;
  observacao = "";
  busca = "";
  _rolagem = 0;

  /** CD calculada (ou null sem conjurador). */
  get calculo() {
    const { actor } = resolverUuid(this.conjurador);
    return actor ? calcularCD(actor.system, this.atributoChave) : null;
  }

  /** CD efetiva: manual se o Mestre editou (ou não há conjurador), senão a calculada. */
  get cdEfetiva() {
    const c = this.calculo;
    if (c && !this.cdManual) return c.cd;
    return Number.isFinite(this.cd) ? this.cd : null;
  }

  get completo() {
    return this.alvos.size > 0 && this.tipos.includes(this.pericia) && Number.isFinite(this.cdEfetiva);
  }

  async _prepareContext() {
    const lista = candidatos();
    this._lista = lista;
    const conj = resolverUuid(this.conjurador).actor;
    const calculo = this.calculo;
    const nomeAtributo = loc(`ICARUS.Atributos.${this.atributoChave}`);
    return {
      busca: this.busca,
      grupos: gruposDeCandidatos(lista, this.alvos, this.modos),
      nAlvos: this.alvos.size,
      tipos: this.tipos.map(k => ({ chave: k, rotulo: loc(`ICARUS.Pericias.${k}`), marcado: this.pericia === k })),
      origem: this.origem,
      sugestoes: conj ? conj.items.filter(i => i.type === "poder").map(i => i.name).sort((a, b) => a.localeCompare(b, "pt-BR")) : [],
      conjuradores: [{ uuid: "", nome: loc("ICARUS.Testes.Resistencia.SemConjurador") }, ...lista.map(c => ({ uuid: c.uuid, nome: c.nome }))]
        .map(c => ({ ...c, selecionado: c.uuid === this.conjurador })),
      temConjurador: !!conj,
      atributos: ATRIBUTOS.map(k => ({ chave: k, rotulo: loc(`ICARUS.Atributos.${k}`), selecionado: k === this.atributoChave })),
      cd: this.cdEfetiva ?? "",
      manual: !!calculo && this.cdManual,
      semNivel: calculo?.semNivel,
      dicaCD: calculo
        ? fmt("ICARUS.Testes.Resistencia.DicaCD", { metade: calculo.metade, nivel: calculo.nivel, mod: calculo.mod, atributo: nomeAtributo })
        : loc("ICARUS.Testes.Resistencia.CDManual"),
      observacao: this.observacao,
      completo: this.completo
    };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    const el = this.element;
    const lista = el.querySelector("[data-lista='alvo']");
    if (lista) {
      filtrarLinhas(lista, this.busca);
      lista.scrollTop = this._rolagem;
    }
    if (this._ouvindo) return;
    this._ouvindo = true;
    el.addEventListener("input", ev => {
      const t = ev.target;
      if (t.name === "busca-alvo") {
        this.busca = t.value;
        return filtrarLinhas(el.querySelector("[data-lista='alvo']"), t.value);
      }
      if (t.name === "origem") this.origem = t.value;
      else if (t.name === "observacao") this.observacao = t.value;
      else if (t.name === "cd") {
        this.cd = t.value === "" ? null : Number(t.value);
        // Editar a CD com conjurador vira manual (selo "(manual)" e botão "Recalcular")
        if (this.calculo && !this.cdManual) {
          this.cdManual = true;
          el.querySelector(".cd-manual")?.removeAttribute("hidden");
          el.querySelector("[data-action='recalcular']")?.removeAttribute("hidden");
        }
      } else return;
      this._atualizarBotao();
    });
    el.addEventListener("change", ev => {
      const t = ev.target;
      if (t.name === "alvo") {
        if (t.checked) this.alvos.add(t.value);
        else this.alvos.delete(t.value);
        el.querySelector(".n-alvos").textContent = this.alvos.size;
        return this._atualizarBotao();
      }
      if (t.name === "modo-alvo") {
        this.modos.set(t.dataset.uuid, t.value);
        return;
      }
      if (t.name === "pericia") {
        this.pericia = t.value;
        return this._atualizarBotao();
      }
      if (t.name === "conjurador") {
        this.conjurador = t.value;
        const conj = resolverUuid(t.value).actor;
        // Atributo-chave sugerido: o de PM da classe, se for de conjuração
        const pm = conj?.system?.classeConfig?.pmAtributo;
        if (ATRIBUTOS_DE_CONJURACAO.includes(pm)) this.atributoChave = pm;
        this.cdManual = false;
        return this._rerender();
      }
      if (t.name === "atributoChave") {
        this.atributoChave = t.value;
        return this._rerender();
      }
    });
  }

  _atualizarBotao() {
    const botao = this.element.querySelector("[data-action='iniciar']");
    if (botao) botao.disabled = !this.completo;
  }

  _rerender() {
    this._rolagem = this.element.querySelector("[data-lista='alvo']")?.scrollTop ?? 0;
    return this.render();
  }

  static _aoUsarSelecionados() {
    const sel = uuidsSelecionados();
    if (!sel.length) return ui.notifications.warn(loc("ICARUS.Testes.SemTokensSelecionados"));
    for (const u of sel) this.alvos.add(u);
    this._rerender();
  }

  static _aoTodosPJs() {
    for (const c of this._lista ?? candidatos()) if (c.pj) this.alvos.add(c.uuid);
    this._rerender();
  }

  static _aoLimpar() {
    this.alvos.clear();
    this._rerender();
  }

  static _aoRecalcular() {
    this.cdManual = false;
    this.cd = null;
    this._rerender();
  }

  static _aoIniciar() {
    if (!this.completo) return;
    const item = { tipo: "pericia", chave: this.pericia };
    const participantes = [...this.alvos].map((uuid, i) => montarParticipante(uuid, item, i, { modo: this.modos.get(uuid) ?? "normal" })).filter(Boolean);
    if (!participantes.length) return ui.notifications.warn(loc("ICARUS.Testes.AtorNaoEncontrado"));
    const conj = resolverUuid(this.conjurador);
    iniciarSessao({
      tipo: "resistencia", participantes,
      resistencia: {
        pericia: this.pericia, cd: this.cdEfetiva, origem: this.origem.trim(),
        conjurador: conj.actor ? (conj.token && !conj.token.actorLink ? conj.token.name : conj.actor.name) : "",
        observacao: this.observacao.trim()
      }
    });
    this.close();
  }

  static _aoCancelar() {
    this.close();
  }
}
