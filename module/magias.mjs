/**
 * Lançar magia (Fase 2): diálogo com aprimoramentos e custo total → debita PM → cartão no chat.
 * - PM insuficiente: o botão Lançar fica desabilitado com o motivo (e o servidor de regras confere de novo).
 * - Erro depois do débito: o PM é devolvido.
 * - Cartão: ícone, nível, escola, custo pago, execução, alcance, alvo, duração, resistência,
 *   descrição, aprimoramentos usados e CD. flags["icarus-rpg"].magia = { id, itemUuid, actorUuid,
 *   cd, custo, aprimoramentos, alvos } (as próximas fases usam essas marcas para dano, resistência e efeitos).
 * - Barra de macros: arrastar a magia da ficha cria a macro game.icarus.lancarMagia("<uuid>").
 * Regras puras: module/magias-dados.mjs.
 */
import { SISTEMA_ID } from "./config.mjs";
import { custoDoLancamento, podeLancar, metaDaMagia, CUSTO_POR_NIVEL, gruposDeMagias, ATRIBUTOS_MAGIA, NIVEIS_MAGIA } from "./magias-dados.mjs";

const F = SISTEMA_ID;
const T = `systems/${SISTEMA_ID}/templates`;
const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/* ------------------------------ Diálogo ------------------------------ */

export class DialogoMagia extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @param {{ actor: Actor, item: Item, aoConfirmar: (indices:number[]) => Promise }} dados */
  constructor(dados, options = {}) {
    super({ id: `icarus-magia-${dados.actor.id}-${dados.item.id}`, ...options });
    this.dados = dados;
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["icarus", "icarus-dialogo", "icarus-dialogo-magia"],
    window: { title: "ICARUS.Magias.Lancar", icon: "fa-solid fa-wand-sparkles" },
    position: { width: 480, height: "auto" },
    form: { handler: DialogoMagia._aoEnviar, submitOnChange: false, closeOnSubmit: true },
    actions: { cancelar: DialogoMagia._aoCancelar }
  };

  static PARTS = { form: { template: `${T}/dialogo-magia.hbs` } };

  get title() {
    return `${loc("ICARUS.Magias.Lancar")}: ${this.dados.item.name}`;
  }

  async _prepareContext() {
    const { actor, item } = this.dados;
    const s = item.system;
    return {
      img: item.img, nome: item.name, nivel: s.nivel, escola: s.escola, meta: metaDaMagia(s),
      custoBase: s.custoPM, pmAtual: actor.system.pm.value, pmMax: actor.system.pm.max, cd: actor.system.magia?.cd,
      aprimoramentos: s.aprimoramentos.map((a, i) => ({ indice: i, custo: a.custo, texto: a.texto })),
      ...this.estado([])
    };
  }

  /** Custo total e se dá para lançar com os aprimoramentos marcados. */
  estado(indices) {
    const c = custoDoLancamento(this.dados.item.system, indices);
    const p = podeLancar(this.dados.actor.system.pm.value, c.total);
    return { custoTotal: c.total, pode: p.pode, motivo: p.pode ? "" : fmt("ICARUS.Magias.SemPM", { custo: c.total, pm: this.dados.actor.system.pm.value }) };
  }

  _onRender(contexto, opcoes) {
    super._onRender?.(contexto, opcoes);
    const form = this.element;
    const atualizar = () => {
      const indices = [...form.querySelectorAll("input[name='aprimoramento']:checked")].map(i => Number(i.value));
      const e = this.estado(indices);
      form.querySelector("[data-custo-total]").textContent = e.custoTotal;
      const botao = form.querySelector("button[type='submit']");
      botao.disabled = !e.pode;
      const motivo = form.querySelector("[data-motivo]");
      motivo.textContent = e.motivo;
      motivo.hidden = e.pode;
    };
    form.querySelectorAll("input[name='aprimoramento']").forEach(i => i.addEventListener("change", atualizar));
    atualizar();
  }

  static async _aoEnviar(event, form) {
    const indices = [...form.querySelectorAll("input[name='aprimoramento']:checked")].map(i => Number(i.value));
    await this.dados.aoConfirmar(indices);
  }

  static _aoCancelar() {
    this.close();
  }
}

/* ------------------------------ Lançar ------------------------------ */

/** Alvos marcados (T) para o cartão. */
const alvosMarcados = () => [...(game.user.targets ?? [])].map(t => ({ uuid: t.document?.uuid, nome: t.name, img: t.document?.texture?.src }));

/**
 * Lança: confere PM, debita, cria o cartão; se o cartão falhar, devolve o PM.
 * @returns {Promise<ChatMessage|null>}
 */
export async function executarLancamento(actor, item, indices = []) {
  const s = item.system;
  const custo = custoDoLancamento(s, indices);
  const antes = actor.system.pm.value;
  const ok = podeLancar(antes, custo.total);
  if (!ok.pode) {
    ui.notifications.warn(fmt("ICARUS.Magias.SemPM", { custo: custo.total, pm: antes }));
    return null;
  }
  await actor.update({ "system.pm.value": antes - custo.total });
  try {
    return await cartaoDaMagia(actor, item, custo);
  } catch (erro) {
    console.error("Icarus RPG | Lançar magia", erro);
    await actor.update({ "system.pm.value": actor.system.pm.value + custo.total });
    ui.notifications.error(fmt("ICARUS.Magias.ErroDevolvido", { custo: custo.total }));
    return null;
  }
}

async function cartaoDaMagia(actor, item, custo) {
  const s = item.system;
  const cd = actor.system.magia?.cd ?? null;
  const alvos = alvosMarcados();
  const content = await renderTemplate(`${T}/chat/magia.hbs`, {
    img: item.img, nome: item.name, nivel: s.nivel, escola: s.escola,
    custo: custo.total, custoBase: custo.base, execucao: s.execucao, alcance: s.alcance, alvo: s.alvo,
    duracao: s.duracao, resistencia: s.resistencia, cd,
    descricao: await TextEditor.enrichHTML(s.descricao, { async: true }),
    aprimoramentos: custo.indices.map(i => s.aprimoramentos[i]),
    alvos
  });
  const dados = {
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    flags: { [F]: { magia: {
      id: item.flags?.[F]?.id ?? item.id, itemUuid: item.uuid, actorUuid: actor.uuid, nome: item.name, nivel: s.nivel,
      cd, custo: custo.total, aprimoramentos: custo.indices, alvos: alvos.map(a => ({ uuid: a.uuid, nome: a.nome }))
    } } }
  };
  ChatMessage.applyRollMode(dados, game.settings.get("core", "rollMode"));
  return ChatMessage.create(dados);
}

/**
 * Botão Lançar (ficha, item, macro): abre o diálogo.
 * @param {Actor|string} alvo  o ator, ou o uuid do item (macro)
 */
export async function lancarMagia(alvo, item = null) {
  let actor = alvo;
  if (typeof alvo === "string") {
    item = await fromUuid(alvo);
    actor = item?.parent ?? null;
  }
  if (!actor || item?.type !== "magia") return ui.notifications.warn(loc("ICARUS.Magias.SemConjurador"));
  if (!actor.isOwner) return ui.notifications.warn(fmt("ICARUS.Dano.SemPermissao", { nome: actor.name }));
  return new DialogoMagia({ actor, item, aoConfirmar: indices => executarLancamento(actor, item, indices) }).render(true);
}

/* ------------------------------ Aba da ficha ------------------------------ */

/** Dados da aba Magias (a busca e os filtros são aplicados no navegador, sem redesenhar a ficha). */
export function contextoDasMagias(actor) {
  const itens = actor.items.filter(i => i.type === "magia");
  const s = actor.system;
  const grupos = gruposDeMagias(itens).map(g => ({
    ...g,
    titulo: fmt("ICARUS.Magias.NivelTitulo", { n: g.nivel, custo: g.custo }),
    acessivel: g.nivel <= (s.magia?.nivelMaximo ?? 1),
    magias: g.magias.map(i => ({
      id: i.id, nome: i.name, img: i.img, custo: i.system.custoPM, escola: i.system.escola, nivel: i.system.nivel,
      meta: metaDaMagia(i.system), resistencia: i.system.resistencia, descricao: i.system.descricao,
      aprimoramentos: i.system.aprimoramentos, busca: i.name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    }))
  }));
  return {
    total: itens.length,
    grupos,
    cd: s.magia?.cd,
    atributo: s.magia?.atributo ?? "",
    atributoEfetivo: s.magia?.atributoEfetivo,
    nivelMaximo: s.magia?.nivelMaximo,
    opcoesAtributo: [{ valor: "", rotulo: fmt("ICARUS.Magias.AtributoPadrao", { atributo: s.magia?.atributoEfetivo ?? "INT" }) },
      ...ATRIBUTOS_MAGIA.map(a => ({ valor: a, rotulo: loc(`ICARUS.Atributos.${a}`) }))],
    niveis: NIVEIS_MAGIA.map(n => ({ valor: n, rotulo: fmt("ICARUS.Magias.NivelCurto", { n }) })),
    escolas: [...new Set(itens.map(i => i.system.escola).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"))
  };
}

/** Busca e filtros da aba (só esconde cartões; o estado fica na ficha enquanto ela estiver aberta). */
export function ligarFiltrosDasMagias(ficha, html) {
  const raiz = html instanceof HTMLElement ? html : html[0];
  const aba = raiz?.querySelector(".aba-magias");
  if (!aba) return;
  const estado = (ficha._filtroMagias ??= { busca: "", nivel: "", escola: "" });
  const busca = aba.querySelector("[data-filtro='busca']");
  const nivel = aba.querySelector("[data-filtro='nivel']");
  const escola = aba.querySelector("[data-filtro='escola']");
  busca.value = estado.busca; nivel.value = estado.nivel; escola.value = estado.escola;
  const aplicar = () => {
    estado.busca = busca.value; estado.nivel = nivel.value; estado.escola = escola.value;
    const termo = estado.busca.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
    for (const card of aba.querySelectorAll("[data-magia]")) {
      const ok = (!termo || card.dataset.busca.includes(termo)) && (!estado.nivel || card.dataset.nivel === estado.nivel)
        && (!estado.escola || card.dataset.escola === estado.escola);
      card.hidden = !ok;
    }
    for (const g of aba.querySelectorAll("[data-grupo-nivel]")) g.hidden = !g.querySelector("[data-magia]:not([hidden])");
  };
  busca.addEventListener("input", aplicar);
  nivel.addEventListener("change", aplicar);
  escola.addEventListener("change", aplicar);
  aplicar();
}

/* ------------------------------ Registro ------------------------------ */

export function registrarMagias() {
  // Arrastar a magia para a barra de macros: macro que abre o diálogo de lançar
  Hooks.on("hotbarDrop", (_barra, dados, slot) => {
    if (dados?.type !== "Item" || !dados.uuid) return;
    const item = fromUuidSync(dados.uuid);
    if (item?.type !== "magia" || !item.parent) return;
    criarMacro(item, slot);
    return false;
  });
}

async function criarMacro(item, slot) {
  const command = `game.icarus.lancarMagia("${item.uuid}");`;
  let macro = game.macros.find(m => m.command === command && m.isOwner);
  macro ??= await Macro.create({ name: item.name, type: "script", img: item.img, command, flags: { [F]: { magia: true } } });
  await game.user.assignHotbarMacro(macro, slot);
}

export { CUSTO_POR_NIVEL };
