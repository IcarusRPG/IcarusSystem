/**
 * Diálogo "Escolher poder de classe": poderes da classe agrupados por grupo (linha/caminho), com
 * busca, filtro por grupo e "só os disponíveis". Cada card mostra os pré-requisitos com
 * ✓ (atende) / ✗ (falta) / ⚠ (confirme manualmente). Nada é bloqueado, exceto escolher de novo
 * um poder não repetível: "Escolher mesmo assim" registra no chat. Poderes de caminho/senda só
 * aparecem para quem fez a escolha.
 */
import { SISTEMA_ID, ATRIBUTOS, PERICIAS } from "../config.mjs";
import { validarPoder, gruposEscolhidos, normalizarNome } from "../classes-dados.mjs";
import { dadosDoPoderDeClasse } from "../dados-compendios.mjs";
import { classeDoAtor, idsDeClasseDoAtor, contagemDeClasseDoAtor, contadorDePoderes } from "../classes.mjs";
import ICONES_CLASSES from "../dados/icones-classes.mjs";
import { resolverEscolha } from "../escolhas.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);

/** Situação do personagem para validar poderes. */
export function situacaoParaValidar(actor, classe) {
  const s = actor.system;
  return {
    nivel: s.nivel,
    atributos: Object.fromEntries(ATRIBUTOS.map(k => [k, s.atributos[k].total])),
    treino: Object.fromEntries(PERICIAS.map(p => [p.chave, s.pericias[p.chave].treino])),
    tem: idsDeClasseDoAtor(actor),
    contagem: contagemDeClasseDoAtor(actor),
    grupos: gruposEscolhidos(classe, actor.getFlag(SISTEMA_ID, "escolhasClasse") ?? {})
  };
}

/** Cria o item do poder de classe na ficha (com os ganchos de escolha). */
export async function escolherPoderDeClasse(actor, classe, poder, { forcado = false } = {}) {
  const dados = dadosDoPoderDeClasse(classe, poder, ICONES_CLASSES);
  delete dados._id;
  delete dados.folder;
  const [item] = await actor.createEmbeddedDocuments("Item", [dados]);
  if (item && poder.escolha) await resolverEscolha(actor, item, { forcado });
  if (forcado) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="icarus-rolagem icarus-lembrete"><p class="condicao-descricao">${Handlebars.escapeExpression(fmt("ICARUS.Classe.EscolhidoMesmoAssim", { nome: actor.name, poder: item?.name ?? poder.nome, usuario: game.user.name }))}</p></div>`
    });
  }
  return item;
}

export class DialogoPoderesClasse extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(actor, options = {}) {
    super({ id: `icarus-poderes-classe-${actor.id}`, ...options });
    this.actor = actor;
    this.filtros = { busca: "", grupo: "", soDisponiveis: true };
  }

  static DEFAULT_OPTIONS = {
    classes: ["icarus", "icarus-dialogo", "icarus-poderes-classe"],
    window: { title: "ICARUS.Classe.EscolherPoderTitulo", icon: "fa-solid fa-star", resizable: true },
    position: { width: 760, height: 760 },
    actions: { escolher: DialogoPoderesClasse._aoEscolher, fechar: DialogoPoderesClasse._aoFechar }
  };

  static PARTS = { corpo: { template: `systems/${SISTEMA_ID}/templates/dialogo-poderes-classe.hbs` } };

  get title() {
    const classe = classeDoAtor(this.actor);
    return `${loc("ICARUS.Classe.EscolherPoderTitulo")}${classe ? ` — ${classe.nome}` : ""}`;
  }

  async _prepareContext() {
    const classe = classeDoAtor(this.actor);
    if (!classe) return { semClasse: true };
    const situacao = situacaoParaValidar(this.actor, classe);
    const icone = { ok: "✓", falta: "✗", conferir: "⚠" };
    const grupos = classe.grupos.map(g => ({
      nome: g,
      poderes: classe.poderes.filter(p => p.grupo === g).map(p => {
        const v = validarPoder(classe, p, situacao);
        return {
          id: p.id, nome: p.nome, custo: p.custoPM, acao: p.acao && p.acao !== "passivo" ? loc(`ICARUS.Poderes.Acoes.${p.acao}`) : "",
          descricao: p.descricao, repetivel: p.repetivel,
          itens: v.itens.map(i => ({ ...i, icone: icone[i.estado], titulo: i.estado === "conferir" ? loc("ICARUS.Classe.ConfirmeManual") : "" })),
          ok: v.ok, jaEscolhido: v.jaEscolhido, visivel: v.visivel, disponivel: v.disponivel,
          busca: normalizarNome(`${p.nome} ${g}`)
        };
      }).filter(p => p.visivel)
    })).filter(g => g.poderes.length);
    const c = contadorDePoderes(this.actor);
    return {
      grupos, nomesGrupos: grupos.map(g => g.nome),
      filtros: this.filtros,
      contador: c ? fmt("ICARUS.Classe.ContadorTexto", { x: c.escolhidos, y: c.total }) : "",
      img: this.actor.img
    };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    this._filtrar();
    if (this._ouvindo) return;
    this._ouvindo = true;
    const ler = ev => {
      const t = ev.target;
      if (t.name === "busca") this.filtros.busca = t.value;
      else if (t.name === "grupo") this.filtros.grupo = t.value;
      else if (t.name === "soDisponiveis") this.filtros.soDisponiveis = t.checked;
      else return;
      this._filtrar();
    };
    this.element.addEventListener("input", ler);
    this.element.addEventListener("change", ler);
  }

  /** Filtra os cards sem redesenhar (busca, grupo e "só disponíveis"). */
  _filtrar() {
    const termo = normalizarNome(this.filtros.busca);
    for (const g of this.element.querySelectorAll(".grupo-poderes-classe")) {
      let algum = false;
      for (const card of g.querySelectorAll(".card-poder-classe")) {
        const mostra = (!termo || card.dataset.busca.includes(termo))
          && (!this.filtros.grupo || g.dataset.grupo === this.filtros.grupo)
          && (!this.filtros.soDisponiveis || card.dataset.disponivel === "1");
        card.hidden = !mostra;
        algum ||= mostra;
      }
      g.hidden = !algum;
    }
  }

  static async _aoEscolher(event, alvo) {
    const classe = classeDoAtor(this.actor);
    const poder = classe?.poderes.find(p => p.id === alvo.dataset.id);
    if (!poder) return;
    const v = validarPoder(classe, poder, situacaoParaValidar(this.actor, classe));
    if (v.jaEscolhido) return ui.notifications.warn(fmt("ICARUS.Classe.JaEscolhido", { poder: poder.nome }));
    let forcado = false;
    if (!v.ok) {
      const faltam = v.itens.filter(i => i.estado === "falta").map(i => i.texto).join(", ");
      const ok = await foundry.applications.api.DialogV2.confirm({
        window: { title: loc("ICARUS.Classe.MesmoAssimTitulo") },
        content: `<p>${Handlebars.escapeExpression(fmt("ICARUS.Classe.MesmoAssimTexto", { poder: poder.nome, faltam }))}</p>`,
        yes: { label: loc("ICARUS.Classe.EscolherMesmoAssim") },
        rejectClose: false
      });
      if (!ok) return;
      forcado = true;
    }
    const c = contadorDePoderes(this.actor);
    if (c && !c.disponiveis) ui.notifications.warn(loc("ICARUS.Classe.SemEscolhas"));
    const item = await escolherPoderDeClasse(this.actor, classe, poder, { forcado });
    if (item) ui.notifications.info(fmt("ICARUS.Classe.Escolhido", { poder: item.name }));
    this.render();
  }

  static _aoFechar() {
    this.close();
  }
}
