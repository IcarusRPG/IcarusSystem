/**
 * Diálogo de ataque com arma: aparece antes de rolar.
 * - Rolagem Normal / Vantagem / Desvantagem (Shift/Ctrl no clique já pré-seleciona);
 * - bônus extra (situacional);
 * - alvos marcados (game.user.targets) com a Defesa de cada um;
 * - opções de regra que entram por "seções" (flanco, camuflagem, duas armas, poderes de classe):
 *   cada seção é montada por opcoesDoAtaque (module/combate-chat.mjs).
 * Confirmar chama aoConfirmar(opcoes) e fecha; Cancelar só fecha (nada é gasto).
 */
import { SISTEMA_ID } from "../config.mjs";
import { opcoesDeModo } from "./participantes.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class DialogoAtaque extends HandlebarsApplicationMixin(ApplicationV2) {
  /**
   * @param {object} dados { actor, item, modo, contexto (de opcoesDoAtaque), preset {vantagem, desvantagem}, aoConfirmar }
   */
  constructor(dados, options = {}) {
    super({ id: `icarus-ataque-${dados.actor.id}-${dados.item.id}`, ...options });
    this.dados = dados;
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["icarus", "icarus-dialogo", "icarus-dialogo-ataque"],
    window: { title: "ICARUS.Ataque.Titulo", icon: "fa-solid fa-khanda" },
    position: { width: 460, height: "auto" },
    form: { handler: DialogoAtaque._aoEnviar, submitOnChange: false, closeOnSubmit: true },
    actions: { cancelar: DialogoAtaque._aoCancelar }
  };

  static PARTS = { form: { template: `systems/${SISTEMA_ID}/templates/dialogo-ataque.hbs` } };

  get title() {
    return `${game.i18n.localize("ICARUS.Ataque.Titulo")}: ${this.dados.item.name}`;
  }

  async _prepareContext() {
    const { contexto, preset = {} } = this.dados;
    const modo = preset.vantagem && !preset.desvantagem ? "vantagem" : preset.desvantagem && !preset.vantagem ? "desvantagem" : "normal";
    return { ...contexto, modos: opcoesDeModo(modo) };
  }

  /** Lê o formulário e devolve as opções do ataque. */
  static async _aoEnviar(event, form, formData) {
    const f = formData.object;
    const opcoes = {
      vantagem: f.modo === "vantagem",
      desvantagem: f.modo === "desvantagem",
      bonusExtra: Math.trunc(Number(f.bonusExtra) || 0)
    };
    // Campos das seções: checkboxes (true/false), selects e números chegam pelo nome
    for (const [chave, valor] of Object.entries(f)) {
      if (chave.startsWith("op.")) opcoes[chave.slice(3)] = valor;
    }
    await this.dados.aoConfirmar(opcoes);
  }

  static _aoCancelar() {
    this.close();
  }
}
