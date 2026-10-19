/**
 * Diálogo "Perícias da classe" (ao escolher a classe):
 * - obrigatórias já marcadas e travadas; "(Luta ou Pontaria)" vira um seletor de uma das duas;
 * - mais N à escolha da lista da classe;
 * - só ADICIONA treino (nunca tira o que veio de raça, origem ou profissão);
 * - obrigatória que já era treinada dá um treinamento extra (escolher outra da lista), com aviso.
 */
import { SISTEMA_ID } from "../config.mjs";
import { parseObrigatorias, chaveDaPericia } from "../classes-dados.mjs";
import { marcarTreinoDaClasse } from "../assistente.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const loc = k => game.i18n.localize(k);
const nome = chave => loc(`ICARUS.Pericias.${chave}`);

export class DialogoPericiasClasse extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(actor, classe, options = {}) {
    super({ id: `icarus-pericias-classe-${actor.id}`, ...options });
    this.actor = actor;
    this.classe = classe;
    this.obrigatorias = parseObrigatorias(classe.pericias.obrigatorias);
    // Escolha das obrigatórias "A ou B": a primeira que ainda não é treinada
    this.escolhaObrigatoria = this.obrigatorias.map(o => (o.tipo === "escolha" ? (o.opcoes.find(k => !this._treinada(k)) ?? o.opcoes[0]) : o.chave));
    this.marcadas = new Set();
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["icarus", "icarus-dialogo", "icarus-pericias-classe"],
    window: { title: "ICARUS.Classe.PericiasTitulo", icon: "fa-solid fa-list-check" },
    position: { width: 560, height: "auto" },
    form: { handler: DialogoPericiasClasse._aoConfirmar, submitOnChange: false, closeOnSubmit: true },
    actions: { cancelar: DialogoPericiasClasse._aoCancelar }
  };

  static PARTS = { form: { template: `systems/${SISTEMA_ID}/templates/dialogo-pericias-classe.hbs` } };

  get title() {
    return `${loc("ICARUS.Classe.PericiasTitulo")}: ${this.classe.nome}`;
  }

  _treinada(chave) {
    return (this.actor.system.pericias[chave]?.treino ?? 0) >= 1;
  }

  /** Obrigatórias que já eram treinadas viram treinamento extra. */
  get extras() {
    return this.escolhaObrigatoria.filter(k => this._treinada(k)).length;
  }

  get limite() {
    return this.classe.pericias.escolha + this.extras;
  }

  async _prepareContext() {
    const obrigatorias = this.obrigatorias.map((o, i) => o.tipo === "escolha"
      ? { escolha: true, indice: i, opcoes: o.opcoes.map(k => ({ chave: k, nome: nome(k), selecionada: this.escolhaObrigatoria[i] === k })), jaTreinada: this._treinada(this.escolhaObrigatoria[i]) }
      : { escolha: false, chave: o.chave, nome: nome(o.chave), jaTreinada: this._treinada(o.chave) });
    const fixas = new Set(this.escolhaObrigatoria);
    const lista = this.classe.pericias.lista.map(chaveDaPericia).filter(Boolean)
      .filter(k => !fixas.has(k))
      .map(k => ({ chave: k, nome: nome(k), jaTreinada: this._treinada(k), marcada: this.marcadas.has(k) }));
    return {
      obrigatorias, lista,
      limite: this.limite, marcadas: this.marcadas.size,
      extras: this.extras ? game.i18n.format("ICARUS.Classe.TreinoExtra", { n: this.extras }) : "",
      contador: game.i18n.format("ICARUS.Classe.PericiasContador", { n: this.marcadas.size, max: this.limite })
    };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    if (this._ouvindo) return;
    this._ouvindo = true;
    this.element.addEventListener("change", ev => {
      const t = ev.target;
      if (t.name === "pericia") {
        if (t.checked && this.marcadas.size >= this.limite) { t.checked = false; return ui.notifications.warn(game.i18n.format("ICARUS.Classe.PericiasLimite", { max: this.limite })); }
        if (t.checked) this.marcadas.add(t.value); else this.marcadas.delete(t.value);
        this.element.querySelector(".contador-pericias").textContent = game.i18n.format("ICARUS.Classe.PericiasContador", { n: this.marcadas.size, max: this.limite });
      } else if (t.name?.startsWith("obrigatoria-")) {
        this.escolhaObrigatoria[Number(t.name.split("-")[1])] = t.value;
        this.marcadas.delete(t.value);
        this.render();
      }
    });
  }

  /** Marca como treinadas (treino 1 = +2) as obrigatórias e as escolhidas; nunca reduz o treino. */
  static async _aoConfirmar() {
    const chaves = [...new Set([...this.escolhaObrigatoria, ...this.marcadas])];
    const src = this.actor._source.system.pericias;
    const dados = {};
    for (const k of chaves) if ((src[k]?.treino ?? 0) < 1) dados[`system.pericias.${k}.treino`] = 1;
    dados[`flags.${SISTEMA_ID}.periciasClasse`] = { classe: this.classe.id, pericias: chaves };
    Object.assign(dados, marcarTreinoDaClasse(this.actor, chaves.filter(k => (src[k]?.treino ?? 0) < 1)));
    await this.actor.update(dados);
    ui.notifications.info(game.i18n.format("ICARUS.Classe.PericiasFeitas", { lista: chaves.map(nome).join(", ") }));
  }

  static _aoCancelar() {
    this.close();
  }
}
