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
import { custoDoLancamento, podeLancar, metaDaMagia, CUSTO_POR_NIVEL, gruposDeMagias, ATRIBUTOS_MAGIA, NIVEIS_MAGIA, planoDoLancamento, tipoDeDuracao, ajustesDoArcanista, maximoDoPacto, custoComObraPrima } from "./magias-dados.mjs";
import { temHabilidadeNosItens, linhagemDasEscolhas } from "./classes-dados.mjs";
import { focoEmpunhado, linhagemPrecisaDeFoco } from "./objetos-dados.mjs";
import { areaNoMapa } from "./magias-area.mjs";
import { rolarDanoAvulso, rolarCura } from "./dano.mjs";
import AUTOMACAO from "./dados/magias_automacao.mjs";

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
    const arc = arcanistaDoAtor(actor);
    return {
      img: item.img, nome: item.name, nivel: s.nivel, escola: s.escola, meta: metaDaMagia(s),
      custoBase: s.custoPM, pmAtual: actor.system.pm.value, pmMax: actor.system.pm.max,
      cd: (actor.system.magia?.cd ?? 0) + (arc ? ajustesDoArcanista(s, arc).cd : 0) || null,
      aprimoramentos: s.aprimoramentos.map((a, i) => ({ indice: i, custo: a.custo, texto: a.texto })),
      // Pacto de Sangue (Mago de Sangue): pagar parte do custo com PV (2 PV por PM)
      pacto: !!arc?.pacto, pvAtual: actor.system.pv?.value,
      ...this.estado([], 0)
    };
  }

  /** Custo total, PM e PV a pagar e se dá para lançar com os aprimoramentos e o Pacto marcados. */
  estado(indices, pacto = 0) {
    const { actor, item } = this.dados;
    const c = custoFinal(actor, item, indices);
    const maxPacto = arcanistaDoAtor(actor)?.pacto ? maximoDoPacto(c.total, actor.system.pv?.value ?? 0) : 0;
    const comSangue = Math.min(Math.max(0, Math.trunc(pacto) || 0), maxPacto);
    const pm = c.total - comSangue;
    const p = podeLancar(actor.system.pm.value, pm);
    return { custoTotal: c.total, maxPacto, comSangue, pvPacto: comSangue * 2, pmAPagar: pm, pode: p.pode,
      motivo: p.pode ? "" : fmt("ICARUS.Magias.SemPM", { custo: pm, pm: actor.system.pm.value }) };
  }

  _onRender(contexto, opcoes) {
    super._onRender?.(contexto, opcoes);
    const form = this.element;
    const atualizar = () => {
      const indices = [...form.querySelectorAll("input[name='aprimoramento']:checked")].map(i => Number(i.value));
      const campoPacto = form.querySelector("input[name='pacto']");
      const e = this.estado(indices, Number(campoPacto?.value) || 0);
      form.querySelector("[data-custo-total]").textContent = e.custoTotal;
      if (campoPacto) {
        campoPacto.max = e.maxPacto;
        if (Number(campoPacto.value) > e.maxPacto) campoPacto.value = e.maxPacto;
        form.querySelector("[data-pacto-info]").textContent = fmt("ICARUS.Magias.PactoInfo", { pm: e.pmAPagar, pv: e.pvPacto, max: e.maxPacto });
      }
      const botao = form.querySelector("button[type='submit']");
      botao.disabled = !e.pode;
      const motivo = form.querySelector("[data-motivo]");
      motivo.textContent = e.motivo;
      motivo.hidden = e.pode;
    };
    form.querySelectorAll("input[name='aprimoramento'], input[name='pacto']").forEach(i => i.addEventListener("input", atualizar));
    form.querySelectorAll("input[name='aprimoramento']").forEach(i => i.addEventListener("change", atualizar));
    atualizar();
  }

  static async _aoEnviar(event, form) {
    const indices = [...form.querySelectorAll("input[name='aprimoramento']:checked")].map(i => Number(i.value));
    await this.dados.aoConfirmar(indices, { pacto: Number(form.querySelector("input[name='pacto']")?.value) || 0 });
  }

  static _aoCancelar() {
    this.close();
  }
}

/* ------------------------------ Lançar ------------------------------ */

/** Alvos marcados (T) para o cartão. */
const alvosMarcados = () => [...(game.user.targets ?? [])].map(t => ({ uuid: t.document?.uuid, nome: t.name, img: t.document?.texture?.src }));

/** Bloco de automação da magia (tools/dados/magias_automacao.json), pelo id do compêndio. */
export function automacaoDaMagia(item) {
  const id = item.flags?.[F]?.id;
  return id ? AUTOMACAO.magias.find(m => m.id === id) ?? null : null;
}

/** Token do conjurador na cena exibida (origem da animação). */
const tokenDoConjurador = actor => (actor.getActiveTokens?.(false, true) ?? []).find(t => t.parent?.id === canvas?.scene?.id) ?? null;

/**
 * Lança: confere PM, debita, manda o cartão e, conforme a automação da magia, rola o dano (com os
 * botões Aplicar dano / Metade / Curar / Perda de PV / Voltar) e a cura; efeitos e condições ficam
 * no cartão (Aplicar / Voltar). Se algo falhar, devolve o PM.
 * @returns {Promise<ChatMessage|null>}  o cartão da magia
 */
export async function executarLancamento(actor, item, indices = [], { pacto = 0 } = {}) {
  const s = item.system;
  // Mago sem foco arcano em mãos não lança (o Mestre pode liberar na aba Classe)
  const semFoco = bloqueioDeFoco(actor);
  if (semFoco) {
    ui.notifications.warn(fmt(semFoco, { nome: actor.name }));
    return null;
  }
  const arc = arcanistaDoAtor(actor);
  const custo = custoFinal(actor, item, indices);
  const comSangue = arc?.pacto ? Math.min(Math.max(0, Math.trunc(pacto) || 0), maximoDoPacto(custo.total, actor.system.pv?.value ?? 0)) : 0;
  const pmAPagar = custo.total - comSangue;
  const antes = actor.system.pm.value;
  const ok = podeLancar(antes, pmAPagar);
  if (!ok.pode) {
    ui.notifications.warn(fmt("ICARUS.Magias.SemPM", { custo: pmAPagar, pm: antes }));
    return null;
  }
  const plano = planoDoLancamento(automacaoDaMagia(item), custo.indices);
  // Canalização Arcana: soma o atributo-chave ao dano total (uma vez, não por dado)
  if (arc?.canalizacao && plano.dano?.partes?.length) {
    const atr = Math.trunc(Number(actor.system.atributos?.[actor.system.magia?.atributoEfetivo]?.total) || 0);
    if (atr > 0) plano.dano.partes[0] = { ...plano.dano.partes[0], formula: `${plano.dano.partes[0].formula}+${atr}` };
  }
  // Magia de área: posicionar no mapa antes de gastar o PM (cancelar = não lança)
  const area = await areaNoMapa({ actor, item, tokenConjurador: tokenDoConjurador(actor), cor: plano.vfx?.cor ?? null,
    instantanea: tipoDeDuracao(s.duracao) === "instantanea" });
  if (area === null) return null;
  // Pacto de Sangue: 2 PV por PM, perda de PV (sem RD)
  const pvAntes = actor.system.pv?.value ?? 0;
  await actor.update({ "system.pm.value": antes - pmAPagar, ...(comSangue ? { "system.pv.value": pvAntes - comSangue * 2 } : {}) });
  let cartao = null;
  try {
    cartao = await cartaoDaMagia(actor, item, { ...custo, comSangue, pmAPagar }, plano);
    await rolagensDaMagia(actor, item, plano, cartao, area ?? null, custo.ajusteCd);
    return cartao;
  } catch (erro) {
    console.error("Icarus RPG | Lançar magia", erro);
    if (!cartao) {
      await actor.update({ "system.pm.value": actor.system.pm.value + pmAPagar, ...(comSangue ? { "system.pv.value": actor.system.pv.value + comSangue * 2 } : {}) });
      ui.notifications.error(fmt("ICARUS.Magias.ErroDevolvido", { custo: pmAPagar }));
    } else ui.notifications.error(loc("ICARUS.Magias.ErroRolagem"));
    return cartao;
  }
}

/* ------------------------------ Arcanista ------------------------------ */

const temDoArcanista = (itens, id) => temHabilidadeNosItens([...(itens ?? [])], "arcanista", id);

/** Situação do Arcanista para lançar (null fora do Arcanista). */
export function arcanistaDoAtor(actor) {
  if (actor?.system?.identidade?.classe !== "arcanista") return null;
  const itens = [...(actor.items ?? [])];
  const escolas = itens.filter(i => ["arcanista__escola-predileta", "arcanista__segunda-escola"].includes(i.flags?.[F]?.id))
    .map(i => i.flags[F].escola).filter(Boolean);
  return {
    linhagem: linhagemDasEscolhas(actor.getFlag?.(F, "escolhasClasse")),
    escolas,
    maestria: temDoArcanista(itens, "maestria-de-escola"),
    pacto: temDoArcanista(itens, "pacto-de-sangue"),
    canalizacao: temDoArcanista(itens, "canalizacao-arcana")
  };
}

/** Custo do lançamento com os ajustes do Arcanista (Maestria −1 PM, mínimo 1) e o ajuste de CD. */
export function custoFinal(actor, item, indices) {
  const c = custoDoLancamento(item.system, indices);
  const arc = arcanistaDoAtor(actor);
  const aj = arc ? ajustesDoArcanista(item.system, arc) : { cd: 0, desconto: 0 };
  let total = aj.desconto ? Math.max(1, c.total - aj.desconto) : c.total;
  // Obra-Prima (Bardo, 20º): com a Chama da Musa ativa, metade do custo (depois das outras reduções)
  if (obraPrimaAtiva(actor)) total = custoComObraPrima(total);
  return { ...c, total, ajusteCd: aj.cd };
}

/** Bardo com Obra-Prima e a Chama da Musa ativa? */
export const obraPrimaAtiva = actor => actor?.system?.identidade?.classe === "bardo" && !!actor.getFlag?.(F, "chamaAtiva")
  && temHabilidadeNosItens([...(actor.items ?? [])], "bardo", "obra-prima");

/** Motivo (chave) para o Mago não lançar: sem foco em mãos e sem liberação do Mestre. */
export function bloqueioDeFoco(actor) {
  const arc = arcanistaDoAtor(actor);
  if (!arc || !linhagemPrecisaDeFoco(arc.linhagem) || actor.getFlag?.(F, "focoLiberado")) return null;
  return focoEmpunhado(actor.items ?? []) ? null : "ICARUS.Arcanista.SemFoco";
}

/** Dano e cura da magia, com a marca da animação (tocada em todos os clientes). */
async function rolagensDaMagia(actor, item, plano, cartao, areaPosicionada = null, ajusteCd = 0) {
  const token = tokenDoConjurador(actor);
  const alvos = [...(game.user.targets ?? [])].map(t => t.document?.uuid).filter(Boolean);
  const cdBase = actor.system.magia?.cd ?? null;
  const marca = { magia: { id: item.flags?.[F]?.id ?? item.id, cartaoId: cartao?.id ?? null, cd: cdBase === null ? null : cdBase + ajusteCd, resistencia: plano.dano?.resistencia ?? null } };
  const vfx = plano.vfx ? { magiaVfx: { ...plano.vfx, id: item.flags?.[F]?.id ?? null, origem: token?.uuid ?? null, alvos, area: areaPosicionada ?? plano.dano?.area ?? null } } : {};
  if (plano.dano) {
    await rolarDanoAvulso({ partes: plano.dano.partes, titulo: item.name, img: item.img, actor, flags: { ...marca, ...vfx } });
  }
  if (plano.cura) {
    await rolarCura({ formula: plano.cura.formula, titulo: item.name, img: item.img, actor, flags: { ...marca, ...(plano.dano ? {} : vfx) } });
  }
}

async function cartaoDaMagia(actor, item, custo, plano = { efeitos: [] }) {
  const s = item.system;
  const cd = actor.system.magia?.cd === undefined || actor.system.magia?.cd === null ? null : actor.system.magia.cd + (custo.ajusteCd ?? 0);
  const alvos = alvosMarcados();
  const content = await renderTemplate(`${T}/chat/magia.hbs`, {
    img: item.img, nome: item.name, nivel: s.nivel, escola: s.escola,
    custo: custo.total, custoBase: custo.base, comSangue: custo.comSangue ?? 0, pvSangue: (custo.comSangue ?? 0) * 2, execucao: s.execucao, alcance: s.alcance, alvo: s.alvo,
    duracao: s.duracao, resistencia: s.resistencia, cd,
    descricao: await TextEditor.enrichHTML(s.descricao, { async: true }),
    aprimoramentos: custo.indices.map(i => s.aprimoramentos[i]),
    alvos, arma: plano.arma
  });
  const dados = {
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    flags: { [F]: { magia: {
      id: item.flags?.[F]?.id ?? item.id, itemUuid: item.uuid, actorUuid: actor.uuid, nome: item.name, img: item.img, nivel: s.nivel,
      cd, custo: custo.total, aprimoramentos: custo.indices, alvos: alvos.map(a => ({ uuid: a.uuid, nome: a.nome })),
      // Efeitos (bônus, penalidade, condição): botões Aplicar / Voltar no cartão (module/magias-efeitos.mjs)
      efeitos: plano.efeitos
    }, efeitosAplicados: [] } }
  };
  ChatMessage.applyRollMode(dados, game.settings.get("core", "rollMode"));
  return ChatMessage.create(dados);
}

/**
 * Lançar (ficha, item, macro): como o ataque, lança na hora, sem aprimoramentos.
 * Lançar aprimorado: abre o diálogo com os aprimoramentos e o custo total.
 * @param {Actor|string} alvo  o ator, ou o uuid do item (macro)
 * @param {Item|null} item
 * @param {{ aprimorado?: boolean }} [opcoes]
 */
export async function lancarMagia(alvo, item = null, { aprimorado = false } = {}) {
  let actor = alvo;
  if (typeof alvo === "string") {
    item = await fromUuid(alvo);
    actor = item?.parent ?? null;
  }
  if (!actor || item?.type !== "magia") return ui.notifications.warn(loc("ICARUS.Magias.SemConjurador"));
  if (!actor.isOwner) return ui.notifications.warn(fmt("ICARUS.Dano.SemPermissao", { nome: actor.name }));
  if (!aprimorado) return executarLancamento(actor, item, []);
  return new DialogoMagia({ actor, item, aoConfirmar: (indices, opcoes) => executarLancamento(actor, item, indices, opcoes) }).render(true);
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
      aprimoramentos: i.system.aprimoramentos, temAprimoramentos: i.system.aprimoramentos.length > 0, busca: i.name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
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
