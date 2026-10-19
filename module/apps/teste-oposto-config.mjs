/**
 * Diálogo do Mestre: configurar um Teste Oposto.
 * Duas colunas (Lado A e Lado B): personagem (PJ ou NPC) e exatamente um item, escolhido numa
 * árvore Atributos [+] / Perícias [+] (recolhidas no início), com o bônus atual lido da ficha.
 * Iniciar fecha o diálogo e abre a tela em todos os clientes.
 */
import { SISTEMA_ID } from "../config.mjs";
import { bonusDoItem, itensDeTeste } from "../testes.mjs";
import { iniciarSessao, montarParticipante, resolverUuid, rotuloDoItem, textoDosDetalhes } from "../testes-sessao.mjs";
import { candidatos, gruposDeCandidatos, uuidsSelecionados, filtrarLinhas, opcoesDeModo } from "./participantes.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const loc = k => game.i18n.localize(k);
const sinal = v => (v < 0 ? `−${Math.abs(v)}` : `+${v}`);
const LADOS = ["A", "B"];

export class TesteOpostoConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "icarus-teste-oposto-config",
    classes: ["icarus", "icarus-dialogo", "icarus-teste-config"],
    window: { title: "ICARUS.Testes.Oposto.Titulo", icon: "fa-solid fa-people-arrows", resizable: true },
    position: { width: 860, height: 720 },
    actions: {
      alternar: TesteOpostoConfig._aoAlternar,
      usarSelecionados: TesteOpostoConfig._aoUsarSelecionados,
      limparItem: TesteOpostoConfig._aoLimparItem,
      iniciar: TesteOpostoConfig._aoIniciar,
      cancelar: TesteOpostoConfig._aoCancelar
    }
  };

  static PARTS = { corpo: { template: `systems/${SISTEMA_ID}/templates/testes/oposto-config.hbs` } };

  lados = { A: { uuid: null, item: null }, B: { uuid: null, item: null } };
  abertos = { A: { atributos: false, pericias: false }, B: { atributos: false, pericias: false } };
  buscas = { A: "", B: "" };
  /** Vantagem/desvantagem escolhida pelo Mestre para cada lado. */
  modos = { A: "normal", B: "normal" };
  _rolagens = {};

  /** Pronto para iniciar: os dois lados com personagem e item, e participantes diferentes. */
  get completo() {
    const { A, B } = this.lados;
    return !!(A.uuid && B.uuid && A.item && B.item && A.uuid !== B.uuid);
  }

  async _prepareContext() {
    const lista = candidatos();
    const itens = itensDeTeste();
    const colunas = LADOS.map(lado => {
      const escolha = this.lados[lado];
      const { actor } = resolverUuid(escolha.uuid);
      const folha = item => {
        const b = actor ? bonusDoItem(actor.system, item) : null;
        const valor = `${item.tipo}:${item.chave}`;
        return {
          valor, rotulo: rotuloDoItem(item),
          bonus: b ? sinal(b.bonus) : "", dica: b ? textoDosDetalhes(b.detalhes) : "",
          falhaAuto: b?.falhaAuto ?? "",
          marcado: escolha.item && `${escolha.item.tipo}:${escolha.item.chave}` === valor
        };
      };
      const escolhido = escolha.item ? folha(escolha.item) : null;
      return {
        lado, titulo: `${loc("ICARUS.Testes.Oposto.Lado")} ${lado}`,
        busca: this.buscas[lado],
        grupos: gruposDeCandidatos(lista, new Set([escolha.uuid].filter(Boolean))),
        personagem: actor ? lista.find(c => c.uuid === escolha.uuid) : null,
        chip: escolhido ? `${loc(`ICARUS.Testes.Tipo.${escolha.item.tipo}`)}: ${escolhido.rotulo}` : "",
        chipBonus: escolhido?.bonus ?? "",
        modos: opcoesDeModo(this.modos[lado]),
        nos: [
          { id: "atributos", rotulo: loc("ICARUS.Testes.Atributos"), aberto: this.abertos[lado].atributos, folhas: itens.atributos.map(folha) },
          { id: "pericias", rotulo: loc("ICARUS.Testes.Pericias"), aberto: this.abertos[lado].pericias, folhas: itens.pericias.map(folha) }
        ]
      };
    });
    const mesmo = this.lados.A.uuid && this.lados.A.uuid === this.lados.B.uuid;
    return { colunas, completo: this.completo, avisoMesmo: mesmo };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    const el = this.element;
    for (const lado of LADOS) {
      const lista = el.querySelector(`[data-lista='participante-${lado}']`);
      if (lista) {
        filtrarLinhas(lista, this.buscas[lado]);
        lista.scrollTop = this._rolagens[lado] ?? 0;
      }
    }
    if (this._ouvindo) return;
    this._ouvindo = true;
    el.addEventListener("input", ev => {
      const m = ev.target.name?.match(/^busca-participante-([AB])$/);
      if (!m) return;
      this.buscas[m[1]] = ev.target.value;
      filtrarLinhas(el.querySelector(`[data-lista='participante-${m[1]}']`), ev.target.value);
    });
    el.addEventListener("change", ev => {
      const nome = ev.target.name ?? "";
      let m = nome.match(/^participante-([AB])$/);
      if (m) {
        this.lados[m[1]].uuid = ev.target.value;
        return this._rerender();
      }
      m = nome.match(/^modo-([AB])$/);
      if (m) {
        this.modos[m[1]] = ev.target.value;
        return;
      }
      m = nome.match(/^item-([AB])$/);
      if (m) {
        const [tipo, chave] = ev.target.value.split(":");
        this.lados[m[1]].item = { tipo, chave };
        return this._rerender();
      }
    });
  }

  /** Re-renderiza guardando a rolagem das listas. */
  _rerender() {
    for (const lado of LADOS) this._rolagens[lado] = this.element.querySelector(`[data-lista='participante-${lado}']`)?.scrollTop ?? 0;
    return this.render();
  }

  static _aoAlternar(event, alvo) {
    const { lado, no } = alvo.dataset;
    this.abertos[lado][no] = !this.abertos[lado][no];
    this._rerender();
  }

  /** Usar tokens selecionados: preenche o lado com o primeiro token selecionado que não está no outro. */
  static _aoUsarSelecionados(event, alvo) {
    const lado = alvo.dataset.lado;
    const outro = lado === "A" ? "B" : "A";
    const sel = uuidsSelecionados();
    if (!sel.length) return ui.notifications.warn(loc("ICARUS.Testes.SemTokensSelecionados"));
    // Dois tokens selecionados e o lado A pedido: preenche os dois de uma vez
    if (sel.length >= 2 && !this.lados.A.uuid && !this.lados.B.uuid) {
      this.lados.A.uuid = sel[0];
      this.lados.B.uuid = sel[1];
    } else {
      this.lados[lado].uuid = sel.find(u => u !== this.lados[outro].uuid) ?? sel[0];
    }
    this._rerender();
  }

  static _aoLimparItem(event, alvo) {
    this.lados[alvo.dataset.lado].item = null;
    this._rerender();
  }

  static _aoIniciar() {
    if (!this.completo) return;
    const participantes = LADOS.map((lado, i) => montarParticipante(this.lados[lado].uuid, this.lados[lado].item, i, { modo: this.modos[lado] }));
    if (participantes.some(p => !p)) return ui.notifications.warn(loc("ICARUS.Testes.AtorNaoEncontrado"));
    iniciarSessao({ tipo: "oposto", participantes });
    this.close();
  }

  static _aoCancelar() {
    this.close();
  }
}
