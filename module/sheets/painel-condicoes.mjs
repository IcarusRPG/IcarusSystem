import { SISTEMA_ID } from "../config.mjs";
import { condicoesEmOrdem, descritores, CONDICAO_POR_ID } from "../condicoes.mjs";
import { aplicarCondicao, removerCondicao, removerTodas, encerrarCena } from "../condicoes-foundry.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Painel de condições.
 * - Modo "ator" (botão "+ Condição" da ficha): aplica só no próprio personagem.
 * - Modo "mestre" (botão "Condições do Mestre" / macro "Aplicar Condição"): só o Mestre. Alvos =
 *   tokens selecionados; sem seleção, todos os tokens da cena com caixas de marcar. Funciona em
 *   token não vinculado (aplica no ator do próprio token). Tem "Encerrar cena".
 */
export class PainelCondicoes extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor({ actor = null } = {}, options = {}) {
    super({ id: actor ? `icarus-condicoes-${actor.id}` : "icarus-condicoes-mestre", ...options });
    this.actor = actor;
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["icarus", "icarus-dialogo", "icarus-painel-condicoes"],
    window: { title: "ICARUS.Condicoes.Painel", icon: "fa-solid fa-person-falling-burst", resizable: true },
    position: { width: 640, height: 720 },
    form: { handler: () => {}, submitOnChange: false, closeOnSubmit: false },
    actions: {
      aplicar: PainelCondicoes._aoAplicar,
      remover: PainelCondicoes._aoRemover,
      removerTodas: PainelCondicoes._aoRemoverTodas,
      encerrarCena: PainelCondicoes._aoEncerrarCena,
      filtro: PainelCondicoes._aoFiltro
    }
  };

  static PARTS = { form: { template: `systems/${SISTEMA_ID}/templates/painel-condicoes.hbs` } };

  get title() {
    return this.actor
      ? game.i18n.format("ICARUS.Condicoes.PainelDe", { nome: this.actor.name })
      : game.i18n.localize("ICARUS.Condicoes.PainelMestre");
  }

  /** Alvos: o ator (modo ficha) ou os tokens da cena (modo Mestre). */
  _alvos() {
    if (this.actor) return [{ id: this.actor.id, token: null, actor: this.actor, nome: this.actor.name, img: this.actor.img, marcado: true }];
    const selecionados = new Set((canvas?.tokens?.controlled ?? []).map(t => t.id));
    const tokens = selecionados.size ? canvas.tokens.controlled : (canvas?.tokens?.placeables ?? []);
    return tokens.filter(t => t.actor).map(t => ({
      id: t.id, token: t, actor: t.actor, nome: t.name, img: t.document.texture.src,
      marcado: selecionados.has(t.id), vinculado: t.document.actorLink
    }));
  }

  async _prepareContext(options) {
    const alvos = this._alvos().map(a => ({
      ...a,
      ativas: [...(a.actor.statuses ?? [])].map(id => CONDICAO_POR_ID[id]).filter(Boolean).map(c => c.nome).join(", ")
    }));
    return {
      mestre: !this.actor,
      alvos,
      descritores: descritores(),
      condicoes: condicoesEmOrdem().map(c => ({
        id: c.id, nome: c.nome, img: c.iconeCore, descricao: c.descricao,
        descritores: (c.descritores ?? []).join(" "), tags: c.descritores ?? [],
        pendente: (c.pendencias ?? []).length > 0,
        compoe: (c.compoe ?? []).map(id => CONDICAO_POR_ID[id]?.nome ?? id).join(" + ")
      }))
    };
  }

  _onFirstRender(context, options) {
    super._onFirstRender?.(context, options);
    // Busca por nome
    this.element.addEventListener("input", ev => {
      if (ev.target.name === "busca") this._filtrar();
    });
  }

  /** Mostra só as condições que batem com a busca e o descritor escolhido. */
  _filtrar() {
    const termo = (this.element.querySelector("[name='busca']")?.value ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const descritor = this._descritor ?? "";
    for (const li of this.element.querySelectorAll(".condicao-opcao")) {
      const nome = li.dataset.nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
      const okTermo = !termo || nome.includes(termo);
      const okDescritor = !descritor || li.dataset.descritores.split(" ").includes(descritor);
      li.hidden = !(okTermo && okDescritor);
    }
  }

  /** Lê o formulário: alvos marcados, condições marcadas e duração. */
  _ler() {
    const f = new FormData(this.element);
    const idsAlvos = f.getAll("alvo");
    const alvos = this._alvos().filter(a => this.actor || idsAlvos.includes(a.id)).map(a => a.token ?? a.actor);
    return {
      alvos,
      condicoes: f.getAll("condicao"),
      duracao: f.get("duracao") || "remover",
      rodadas: Number(f.get("rodadas")) || 1
    };
  }

  _validar({ alvos, condicoes }, precisaCondicao = true) {
    if (!alvos.length) { ui.notifications.warn(game.i18n.localize("ICARUS.Condicoes.SemAlvo")); return false; }
    if (precisaCondicao && !condicoes.length) { ui.notifications.warn(game.i18n.localize("ICARUS.Condicoes.SemCondicao")); return false; }
    return true;
  }

  static async _aoAplicar() {
    const l = this._ler();
    if (!this._validar(l)) return;
    for (const alvo of l.alvos) for (const id of l.condicoes) await aplicarCondicao(alvo, id, { duracao: l.duracao, rodadas: l.rodadas });
    if (this.actor) return this.close();
    this.render();
  }

  static async _aoRemover() {
    const l = this._ler();
    if (!this._validar(l)) return;
    for (const alvo of l.alvos) for (const id of l.condicoes) await removerCondicao(alvo, id);
    this.render();
  }

  static async _aoRemoverTodas() {
    const l = this._ler();
    if (!this._validar(l, false)) return;
    for (const alvo of l.alvos) await removerTodas(alvo);
    this.render();
  }

  static async _aoEncerrarCena() {
    await encerrarCena();
    this.render();
  }

  static _aoFiltro(event, alvo) {
    this._descritor = this._descritor === alvo.dataset.descritor ? "" : alvo.dataset.descritor;
    for (const b of this.element.querySelectorAll("[data-action='filtro']")) b.classList.toggle("ativo", b.dataset.descritor === this._descritor);
    this._filtrar();
  }
}

/** Abre o painel do Mestre (só GM). */
export function abrirPainelDoMestre() {
  if (!game.user.isGM) return ui.notifications.warn(game.i18n.localize("ICARUS.Condicoes.SoMestre"));
  return new PainelCondicoes().render(true);
}

