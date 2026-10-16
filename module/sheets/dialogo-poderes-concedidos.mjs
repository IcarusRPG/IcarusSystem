import { SISTEMA_ID } from "../config.mjs";
import { divindadePorId, poderesDaDivindade, simboloDaDivindade, itemDoPoderConcedido, limiteDeDevocao } from "../panteao.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Janela "Poderes Concedidos de <Divindade>": o jogador marca quais poderes recebe.
 * Nada é criado antes de Confirmar. Poderes que a ficha já tem aparecem marcados e desativados.
 * O limite de devoção é só informativo (não bloqueia).
 */
export class DialogoPoderesConcedidos extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(actor, divindadeId, options = {}) {
    super({ id: `icarus-poderes-concedidos-${actor.id}`, ...options });
    this.actor = actor;
    this.divindade = divindadePorId(divindadeId);
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["icarus", "icarus-dialogo"],
    window: { title: "ICARUS.Devocao.TituloJanela", icon: "fa-solid fa-hands-praying" },
    position: { width: 620, height: "auto" },
    form: { handler: DialogoPoderesConcedidos._aoConfirmar, submitOnChange: false, closeOnSubmit: true },
    actions: { cancelar: DialogoPoderesConcedidos._aoCancelar }
  };

  static PARTS = {
    form: { template: `systems/${SISTEMA_ID}/templates/dialogo-poderes-concedidos.hbs` }
  };

  get title() {
    return game.i18n.format("ICARUS.Devocao.TituloJanela", { divindade: this.divindade?.nome ?? "" });
  }

  /** Ids (do JSON) dos poderes concedidos que a ficha já tem. */
  _possuidos() {
    return new Set(this.actor.items.map(i => i.flags?.[SISTEMA_ID]?.concedido && i.flags[SISTEMA_ID].id).filter(Boolean));
  }

  async _prepareContext(options) {
    const possuidos = this._possuidos();
    const limite = limiteDeDevocao(this.actor.system.identidade.classe, this.divindade?.id);
    return {
      divindade: { ...this.divindade, simbolo: simboloDaDivindade(this.divindade?.id) },
      poderes: poderesDaDivindade(this.divindade?.id).map(p => ({
        id: p.id, nome: p.nome, meta: p.meta, descricao: p.descricao, possui: possuidos.has(p.id)
      })),
      limite,
      total: poderesDaDivindade(this.divindade?.id).length
    };
  }

  _onFirstRender(context, options) {
    super._onFirstRender?.(context, options);
    this.element.addEventListener("change", () => this._atualizarContador());
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    this._atualizarContador();
  }

  /** "Selecionados X de N" (com o limite de devoção, se houver). */
  _atualizarContador() {
    const marcados = this.element.querySelectorAll("input[name='poder']:checked").length;
    const el = this.element.querySelector(".contador-devocao");
    if (!el) return;
    const limite = limiteDeDevocao(this.actor.system.identidade.classe, this.divindade?.id);
    const de = limite.todos ? poderesDaDivindade(this.divindade?.id).length : limite.limite;
    el.textContent = de === null
      ? game.i18n.format("ICARUS.Devocao.Selecionados", { n: marcados })
      : game.i18n.format("ICARUS.Devocao.SelecionadosDe", { n: marcados, de });
    el.classList.toggle("acima", de !== null && marcados > de);
  }

  static async _aoConfirmar() {
    const possuidos = this._possuidos();
    const ids = [...this.element.querySelectorAll("input[name='poder']:checked")].map(el => el.value).filter(id => !possuidos.has(id));
    const dados = ids.map(itemDoPoderConcedido).filter(Boolean);
    if (dados.length) {
      await this.actor.createEmbeddedDocuments("Item", dados);
      ui.notifications.info(game.i18n.format("ICARUS.Devocao.Adicionados", { n: dados.length }));
    }
  }

  static _aoCancelar() {
    this.close();
  }
}

/**
 * Troca a divindade pela combobox da ficha. Se a anterior deixou poderes concedidos na ficha,
 * pergunta se remove ou mantém (padrão: manter). Depois abre a janela de seleção da nova divindade.
 * "Nenhum(a)" não abre a janela e não remove nada sozinho.
 */
export async function trocarDivindade(actor, novoId) {
  const atual = actor._source.system.identidade.divindade;
  if (novoId === atual) return;
  const daAnterior = actor.items.filter(i => i.flags?.[SISTEMA_ID]?.concedido && i.flags[SISTEMA_ID].divindade === atual);
  if (atual && daAnterior.length) {
    const anterior = divindadePorId(atual)?.nome ?? atual;
    const escolha = await foundry.applications.api.DialogV2.wait({
      window: { title: game.i18n.localize("ICARUS.Devocao.TrocarTitulo") },
      content: `<p>${game.i18n.format("ICARUS.Devocao.TrocarTexto", { divindade: Handlebars.escapeExpression(anterior), n: daAnterior.length })}</p>`,
      buttons: [
        { action: "manter", label: game.i18n.localize("ICARUS.Devocao.Manter"), default: true },
        { action: "remover", label: game.i18n.localize("ICARUS.Devocao.Remover") }
      ],
      rejectClose: false
    });
    if (escolha === "remover") await actor.deleteEmbeddedDocuments("Item", daAnterior.map(i => i.id));
  }
  await actor.update({ "system.identidade.divindade": novoId });
  if (novoId && divindadePorId(novoId)) new DialogoPoderesConcedidos(actor, novoId).render(true);
}
