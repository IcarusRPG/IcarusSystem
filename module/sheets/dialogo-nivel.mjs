import { SISTEMA_ID, ATRIBUTOS, ATRIBUTOS_CHAVE_PM } from "../config.mjs";
import { numero, maximoPelaClasse, maximoFinal } from "../regras.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Diálogo "Configuração de Nível" (botão Nível da ficha).
 * Edita system.classeConfig num rascunho e só grava ao clicar em Salvar.
 */
export class DialogoNivel extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(actor, options = {}) {
    super({ id: `icarus-nivel-${actor.id}`, ...options });
    this.actor = actor;
    const src = actor._source.system;
    this.rascunho = {
      ...foundry.utils.deepClone(src.classeConfig),
      pvMax: src.classeConfig.manual ? src.pv.max : actor.system.pv.formula,
      pmMax: src.classeConfig.manual ? src.pm.max : actor.system.pm.formula
    };
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["icarus", "icarus-dialogo"],
    window: { title: "ICARUS.NivelDialogo.Titulo", icon: "fa-solid fa-gear" },
    position: { width: 640, height: "auto" },
    form: { handler: DialogoNivel._aoSalvar, submitOnChange: false, closeOnSubmit: true },
    actions: {
      passo: DialogoNivel._aoPasso,
      chip: DialogoNivel._aoChip,
      cancelar: DialogoNivel._aoCancelar
    }
  };

  static PARTS = {
    form: { template: `systems/${SISTEMA_ID}/templates/dialogo-nivel.hbs` }
  };

  /** PV e PM máximos calculados com o rascunho, no nível atual. */
  _previa() {
    const r = this.rascunho;
    const s = this.actor.system;
    const total = k => (ATRIBUTOS.includes(k) ? s.atributos[k].total : null);
    const pvForm = maximoPelaClasse({ inicial: r.pvInicial, porNivel: r.pvPorNivel, atributoTotal: total(r.pvAtributo), nivel: s.nivel });
    const pmForm = maximoPelaClasse({ inicial: r.pmInicial, porNivel: r.pmPorNivel, atributoTotal: total(r.pmAtributo), nivel: s.nivel });
    return {
      pvMax: maximoFinal({ manual: r.manual, maximoManual: r.pvMax, maximoFormula: pvForm, bonus: r.bonusPv }),
      pmMax: maximoFinal({ manual: r.manual, maximoManual: r.pmMax, maximoFormula: pmForm, bonus: r.bonusPm })
    };
  }

  async _prepareContext(options) {
    const r = this.rascunho;
    const s = this.actor.system;
    const chips = (campo, opcoes) => [null, ...opcoes].map(k => ({
      campo, valor: k ?? "", rotulo: k ?? game.i18n.localize("ICARUS.NivelDialogo.Nenhum"), ativo: r[campo] === k
    }));
    return {
      r,
      classe: this.actor.system.identidade.classe || "—",
      passos: [
        ["pvInicial", "ICARUS.NivelDialogo.PvInicial"], ["pvPorNivel", "ICARUS.NivelDialogo.PvPorNivel"],
        ["pmInicial", "ICARUS.NivelDialogo.PmInicial"], ["pmPorNivel", "ICARUS.NivelDialogo.PmPorNivel"]
      ].map(([campo, rotulo]) => ({ campo, rotulo: game.i18n.localize(rotulo), valor: r[campo] })),
      chipsPv: chips("pvAtributo", ATRIBUTOS),
      chipsPm: chips("pmAtributo", ATRIBUTOS_CHAVE_PM),
      totalPv: game.i18n.format("ICARUS.NivelDialogo.TotalPv", { n: s.nivel }),
      totalPm: game.i18n.format("ICARUS.NivelDialogo.TotalPm", { n: s.nivel }),
      ...this._previa()
    };
  }

  /**
   * Campos digitados atualizam o rascunho. Só a caixa "Manual" redesenha a janela
   * (mostra ou esconde campos); nos números basta atualizar a prévia, o que evita
   * perder o clique em Salvar logo depois de digitar.
   */
  _onFirstRender(context, options) {
    super._onFirstRender?.(context, options);
    this.element.addEventListener("change", ev => {
      const el = ev.target;
      if (!el.name) return;
      if (el.type === "checkbox") {
        this.rascunho[el.name] = el.checked;
        return this.render();
      }
      this.rascunho[el.name] = Math.trunc(numero(el.value));
      const { pvMax, pmMax } = this._previa();
      this.element.querySelector(".cor-pv").textContent = pvMax;
      this.element.querySelector(".cor-pm").textContent = pmMax;
    });
  }

  static _aoPasso(event, alvo) {
    const campo = alvo.dataset.campo;
    this.rascunho[campo] = Math.max(0, numero(this.rascunho[campo]) + Number(alvo.dataset.delta));
    this.render();
  }

  static _aoChip(event, alvo) {
    this.rascunho[alvo.dataset.campo] = alvo.dataset.valor || null;
    this.render();
  }

  static _aoCancelar() {
    this.close();
  }

  static async _aoSalvar() {
    const { pvMax, pmMax, ...classeConfig } = this.rascunho;
    const dados = { "system.classeConfig": classeConfig };
    if (classeConfig.manual) {
      dados["system.pv.max"] = Math.max(0, numero(pvMax));
      dados["system.pm.max"] = Math.max(0, numero(pmMax));
    }
    await this.actor.update(dados);
  }
}
