/**
 * Ficha dos animais do Vínculo Selvagem (bloco de estatísticas, Anexo B, PROVISÓRIA).
 * ApplicationV2 (ActorSheetV2 + Handlebars), registrada para "personagem" sem ser a padrão: os
 * atores do compêndio Vínculos (e os invocados) escolhem esta ficha por flags.core.sheetClass.
 * Os números que dependem do dono (Nível, Defesa, PV, dano) vêm de blocoDoVinculo
 * (classes-dados.mjs), já aplicados no derivado do ator (derivar.mjs / item-arma.mjs); o ataque e
 * o dano rolam pelo pipeline das armas (combate-chat.mjs), as perícias por rolarPericia.
 * Modo edição (lápis): atributos, treino das perícias, defesaBonus e os ataques.
 */
import { SISTEMA_ID, ATRIBUTOS, PERICIAS, ICONE_VINCULO_PADRAO } from "../config.mjs";
import { comSinal } from "../regras.mjs";
import { calcularAtaque, calcularDano } from "../combate.mjs";
import { itensDoAtor, rolarAtaque, rolarDano } from "../combate-chat.mjs";
import { rolarPericia, rolarAtributo, modoDoEvento } from "../rolls.mjs";
import { usarPoder } from "../acoes.mjs";
import { blocoDoVinculo } from "../classes-dados.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
// v12: ActorSheetV2 (com DocumentSheetV2 de reserva, para não derrubar o sistema se faltar)
const ActorSheetV2 = foundry.applications.sheets?.ActorSheetV2 ?? foundry.applications.api.DocumentSheetV2;
const loc = k => game.i18n.localize(k);
const PERCEPCAO = ["visao", "audicao", "olfato"];
const RESISTENCIAS = ["fortitude", "reflexos", "vontade"];
const MODO = "corpo-a-corpo";

export class FichaAnimal extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["icarus", "sheet", "actor", "ficha-animal"],
    position: { width: 560, height: 760 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      editar: FichaAnimal._alternarEdicao,
      imagem: FichaAnimal._imagem,
      rolarAtaque: FichaAnimal._rolarAtaque,
      rolarDano: FichaAnimal._rolarDano,
      usar: FichaAnimal._usar,
      pericia: FichaAnimal._pericia,
      atributo: FichaAnimal._atributo
    }
  };

  static PARTS = { ficha: { template: `systems/${SISTEMA_ID}/templates/actor/animal.hbs`, scrollable: [".fa-corpo"] } };

  /** Modo edição (lápis): só na janela aberta, não é salvo. */
  editando = false;

  async _prepareContext(options) {
    const actor = this.document;
    const s = actor.system;
    const f = actor.flags?.[SISTEMA_ID] ?? {};
    const bloco = blocoDoVinculo(f, game.actors);
    const animal = bloco.animal;
    const itens = itensDoAtor(actor);
    const pericia = k => ({ chave: k, nome: loc(`ICARUS.Pericias.${k}`), total: comSinal(s.pericias[k].total) });
    const ataques = actor.items.filter(i => i.type === "arma").map(i => {
      const atq = calcularAtaque(s, i.system, MODO, itens);
      return {
        id: i.id, nome: i.name, img: i.img, bonus: comSinal(atq.bonus), dano: calcularDano(s, i.system, MODO).texto,
        danoDado: i.system.dano, tipos: (i.system.tiposDano ?? []).map(t => loc(`ICARUS.TiposDano.${t}`)).join(" e "),
        nota: i.system.descricao, somaNivel: i.flags?.[SISTEMA_ID]?.somaNivel !== false
      };
    });
    const habilidades = actor.items.filter(i => i.type === "poder").map(i => ({ id: i.id, nome: i.name, texto: i.system.descricao }));
    const deslocamentos = Object.entries(animal?.deslocamentos ?? { terrestre: s.deslocamento })
      .map(([k, v]) => ({ nome: loc(`ICARUS.FichaAnimal.Deslocamentos.${k}`), valor: `${v} m` }));
    return {
      actor, editando: this.editando, editavel: this.isEditable,
      img: actor.img || ICONE_VINCULO_PADRAO,
      nome: actor.name,
      nivel: bloco.nivel,
      linha: [loc("ICARUS.FichaAnimal.Animal"), loc(`ICARUS.Tamanhos.${animal?.tamanho ?? s.tamanho}`), loc("ICARUS.FichaAnimal.Vinculo")].join(" · "),
      dono: bloco.dono?.name ?? "—",
      provisorio: !!f.provisorio,
      iniciativa: pericia("iniciativa"),
      percepcao: PERCEPCAO.map(pericia),
      defesa: s.defesa.total,
      defesaBonus: bloco.defesaBonus,
      resistencias: RESISTENCIAS.map(pericia),
      pv: { value: s.pv.value, max: s.pv.max, pct: s.pv.max ? Math.round((100 * s.pv.value) / s.pv.max) : 0 },
      deslocamentos,
      rd: s.resistencias?.rdGeral ?? 0,
      ataques, habilidades,
      atributos: ATRIBUTOS.map(k => ({ chave: k, total: comSinal(s.atributos[k].total), base: s.atributos[k].base })),
      // Perícias: só as treinadas ou com bônus ("outros"); na edição, todas (para treinar)
      pericias: PERICIAS.filter(p => this.editando || s.pericias[p.chave].treino >= 1 || Number(s.pericias[p.chave].outros))
        .map(p => ({ ...pericia(p.chave), treino: s.pericias[p.chave].treino, atributo: s.pericias[p.chave].atributo })),
      treinos: { 0: "—", 1: loc("ICARUS.FichaAnimal.Treinada"), 2: loc("ICARUS.FichaAnimal.Especialista") }
    };
  }

  /** Campos dos ataques (itens) na edição: cada mudança atualiza o item direto. */
  _onRender(context, options) {
    super._onRender?.(context, options);
    for (const campo of this.element.querySelectorAll("[data-ataque-campo]")) {
      campo.addEventListener("change", ev => {
        const el = ev.currentTarget;
        const item = this.document.items.get(el.closest("[data-item-id]")?.dataset.itemId);
        if (!item) return;
        const valor = el.type === "checkbox" ? el.checked : el.value;
        const chave = el.dataset.ataqueCampo;
        item.update({ [chave === "somaNivel" ? `flags.${SISTEMA_ID}.somaNivel` : chave]: valor });
      });
    }
  }

  static _alternarEdicao() {
    this.editando = !this.editando;
    this.render();
  }

  /** Clique no retrato: escolhe a imagem do ator e do token. */
  static _imagem() {
    const actor = this.document;
    return new FilePicker({
      type: "image", current: actor.img,
      callback: caminho => actor.update({ img: caminho, "prototypeToken.texture.src": caminho })
    }).browse();
  }

  static _rolarAtaque(event, alvo) {
    const item = this.document.items.get(alvo.closest("[data-item-id]")?.dataset.itemId);
    if (item) rolarAtaque(this.document, item, MODO, modoDoEvento(event));
  }

  static _rolarDano(event, alvo) {
    const item = this.document.items.get(alvo.closest("[data-item-id]")?.dataset.itemId);
    if (item) rolarDano(this.document, item, MODO, {});
  }

  static _usar(event, alvo) {
    const item = this.document.items.get(alvo.closest("[data-item-id]")?.dataset.itemId);
    if (item) usarPoder(this.document, item);
  }

  static _pericia(event, alvo) {
    rolarPericia(this.document, alvo.dataset.pericia, modoDoEvento(event));
  }

  static _atributo(event, alvo) {
    rolarAtributo(this.document, alvo.dataset.atributo, modoDoEvento(event));
  }
}
