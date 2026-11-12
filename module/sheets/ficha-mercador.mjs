/**
 * Ficha do Mercador (ApplicationV2: ActorSheetV2 + Handlebars), compacta, com 7 abas:
 * Resumo (nível, Defesa derivada ou manual, PV, PM, atributos, proficiências), Perícias (as do
 * Icarus, com rolagem), Poderes/Magias (itens, como no personagem), Equipamento e Ataques (o que o
 * mercador usa: equipar, empunhar, atacar), Loja (estoque finito e Barganha), Notas e Token (o mesmo
 * editor de token do personagem, module/token.mjs).
 * Equipamento × estoque: o estoque tem flags["icarus-rpg"].loja; o resto é do mercador.
 * Quem não é Mestre nem dono não vê esta ficha: render() abre a vitrine (vitrine-mercador.mjs).
 */
import { SISTEMA_ID, ATRIBUTOS, ICONE_PADRAO, PERICIAS, PROFICIENCIAS_ARMA, CATEGORIAS_ARMADURA_CORPO, TIPOS_EQUIPAVEIS } from "../config.mjs";
import { comSinal } from "../regras.mjs";
import { calcularAtaque, calcularDano, totalMunicao } from "../combate.mjs";
import { itensDoAtor, rolarAtaque, rolarDano, recarregar } from "../combate-chat.mjs";
import { rolarPericia, rolarAtributo, modoDoEvento } from "../rolls.mjs";
import { usarPoder } from "../acoes.mjs";
import { lancarMagia } from "../magias.mjs";
import { alternarVestido } from "../itens-comuns.mjs";
import { ehVestimenta } from "../origens-dados.mjs";
import { ehEstoque } from "../mercador-dados.mjs";
import { formatarPreco, precoEmOuro, totalEmCentavos } from "../moeda.mjs";
import {
  lojaDoItem, precoBase, precoUnitario, precoDoItemNaLoja, TIPOS_VENDAVEIS, LIBERA_COM, TESTES_DE_BARGANHA, RESULTADOS, textoDasFalasPadrao, ROUBO_PADRAO
} from "../loja.mjs";
import { estadoDaBarganha, efeitosDoMercador, reiniciarBarganhas, acalmarGuardas, zerarTentativasDoUsuario } from "../loja-foundry.mjs";
import { abrirVitrine } from "./vitrine-mercador.mjs";
import { contextoDoToken, ligarEditor, trocarRetrato } from "../token.mjs";

const { HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;
// v12: ActorSheetV2 (com DocumentSheetV2 de reserva, como a ficha do animal)
const ActorSheetV2 = foundry.applications.sheets?.ActorSheetV2 ?? foundry.applications.api.DocumentSheetV2;
const F = SISTEMA_ID;
const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);
const esc = t => Handlebars.escapeExpression(t ?? "");
const reais = c => (formatarPreco(c) === "—" ? "R$ 0" : formatarPreco(c));
const centavos = v => (v === "" || v === null || v === undefined ? null : Math.max(0, Math.round(Number(String(v).replace(",", ".")) * 100) || 0));

/** Abas da ficha do mercador (a Token usa o editor de module/token.mjs). */
export const ABAS_MERCADOR = ["resumo", "pericias", "poderes", "equipamento", "loja", "notas", "token"];

/** Estoque novo: à venda, 1 unidade, preço do item, visível, liberado por qualquer teste. */
export const LOJA_PADRAO = { venda: true, quantidade: 1, precoBase: null, oculto: false, liberaCom: "qualquer" };

/** Diálogo ao soltar/criar: quantidade, preço (em Reais) e oculto. null se cancelou. */
async function perguntarEstoque({ titulo, preco, extras = "" }) {
  const r = await DialogV2.wait({
    window: { title: titulo },
    content: `<div class="icarus-uso">${extras}
      <label class="linha">${esc(loc("ICARUS.Mercador.Quantidade"))} <input type="number" name="quantidade" value="1" min="0" step="1" autofocus></label>
      <label class="linha">${esc(loc("ICARUS.Mercador.PrecoBase"))} <input type="number" name="preco" value="${preco / 100}" min="0" step="0.01"></label>
      <label class="chk"><input type="checkbox" name="oculto"> ${esc(loc("ICARUS.Mercador.EntraOculto"))}</label></div>`,
    buttons: [
      { action: "ok", label: loc("ICARUS.Devocao.Confirmar"), default: true,
        callback: (ev, b) => Object.fromEntries([...b.form.elements].filter(e => e.name).map(e => [e.name, e.type === "checkbox" ? e.checked : e.value])) },
      { action: "cancelar", label: loc("ICARUS.Testes.Cancelar") }
    ],
    rejectClose: false
  });
  return r && typeof r === "object" ? r : null;
}

export class FichaMercador extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["icarus", "sheet", "actor", "ficha-mercador"],
    position: { width: 680, height: 800 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      aba: FichaMercador._aba,
      imagem: FichaMercador._imagem,
      verComoJogador: FichaMercador._verComoJogador,
      alternarLoja: FichaMercador._alternarLoja,
      removerItem: FichaMercador._removerItem,
      abrirItem: FichaMercador._abrirItem,
      criarItem: FichaMercador._criarItem,
      restaurarFalas: FichaMercador._restaurarFalas,
      reiniciarBarganhas: FichaMercador._reiniciarBarganhas,
      acalmarGuardas: FichaMercador._acalmarGuardas,
      zerarTentativas: FichaMercador._zerarTentativas,
      rolarPericia: FichaMercador._rolarPericia,
      rolarAtributo: FichaMercador._rolarAtributo,
      usarPoder: FichaMercador._usarPoder,
      lancarMagia: FichaMercador._lancarMagia,
      atacar: FichaMercador._atacar,
      dano: FichaMercador._dano,
      recarregar: FichaMercador._recarregar,
      equipar: FichaMercador._equipar,
      empunhar: FichaMercador._empunhar,
      paraLoja: FichaMercador._paraLoja,
      paraMercador: FichaMercador._paraMercador
    }
  };

  static PARTS = { ficha: { template: `systems/${SISTEMA_ID}/templates/actor/mercador.hbs`, scrollable: [".fm-corpo"] } };

  /** Aba aberta (só nesta janela). */
  aba = "resumo";

  /** Jogador sem posse não vê a ficha: abre a vitrine. */
  render(options, _options) {
    if (!this.document.isOwner) {
      abrirVitrine(this.document);
      return Promise.resolve(this);
    }
    return super.render(options, _options);
  }

  async _prepareContext(options) {
    const actor = this.document;
    const s = actor.system;
    const mult = s.loja.multiplicadorPreco;
    const efeitos = efeitosDoMercador(actor);
    const src = actor._source.system;
    // Estoque (vende) × itens do mercador (usa): o critério é a flag da loja
    const estoque = actor.items.filter(i => TIPOS_VENDAVEIS.includes(i.type) && ehEstoque(i));
    const proprios = actor.items.filter(i => !ehEstoque(i));
    const itens = itensDoAtor(actor);
    const estado = estadoDaBarganha(actor);
    const b = s.loja.barganha;
    const resumoDe = html => String(html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 140);
    // Perícias do Icarus: as treinadas, com bônus ou usadas pela loja em cima; o resto em "Todas"
    const DA_LOJA = ["barganha", "diplomacia", "intimidacao", "prestidigitacao"];
    const treinos = t => [0, 1, 2].map(v => ({ valor: v, rotulo: loc(`ICARUS.Mercador.Treinos.${v}`), selecionado: v === t }));
    const linhas = PERICIAS.map(p => {
      const d = s.pericias[p.chave];
      return { chave: p.chave, nome: p.nome, atributo: d.atributo, total: comSinal(d.total), treinos: treinos(src.pericias[p.chave]?.treino ?? 0),
        outros: src.pericias[p.chave]?.outros ?? 0, loja: DA_LOJA.includes(p.chave), destaque: (src.pericias[p.chave]?.treino ?? 0) > 0 || (src.pericias[p.chave]?.outros ?? 0) !== 0 };
    });
    const ataques = proprios.filter(i => i.type === "arma" && i.system.empunhada).map(i => {
      const a = i.system;
      const atq = calcularAtaque(s, a, a.modos[0], itens);
      return {
        id: i.id, nome: i.name, img: i.img, ataque: comSinal(atq.bonus), dano: calcularDano(s, a, a.modos[0]).texto,
        ataqueDica: loc(`ICARUS.Pericias.${atq.pericia}`) + (a.proficiente ? "" : ` · ${loc("ICARUS.Mercador.SemProficiencia")}`),
        municao: a.grupo === "fogo" ? `${a.carregados}/${a.capacidadeDisparos}` : a.municaoTipo ? `${totalMunicao(itens, a.municaoTipo)} ${loc(`ICARUS.Municao.Tipos.${a.municaoTipo}`)}` : "",
        ehFogo: a.grupo === "fogo",
        modos: a.modos.map(m => ({ modo: m, rotulo: loc(`ICARUS.Armas.Botoes.${m}`), detalhado: loc("ICARUS.Mercador.AtaqueDica") }))
      };
    });
    const ehEquipavel = i => i.type === "equipamento" && (TIPOS_EQUIPAVEIS.includes(i.system.tipo) || ehVestimenta(i));
    return {
      actor, aba: this.aba, editavel: this.isEditable, gm: game.user.isGM,
      img: actor.img, nome: actor.name, s, src,
      abas: ABAS_MERCADOR.map(id => ({ id, rotulo: loc(`ICARUS.Mercador.Abas.${id}`), ativa: id === this.aba })),
      defesa: {
        total: s.defesa.total, manual: !!src.defesaManual?.ativo,
        formula: `10 + ${s.defesa.atributo} ${comSinal(s.atributos[s.defesa.atributo].total)}${s.defesa.armadura ? ` + ${s.defesa.armadura}` : ""}${s.defesa.escudo ? ` + ${s.defesa.escudo}` : ""}${s.defesa.outros ? ` ${comSinal(s.defesa.outros)}` : ""}`,
        dica: src.defesaManual?.ativo ? loc("ICARUS.Mercador.DefesaManualDica") : loc("ICARUS.Mercador.DefesaDerivadaDica")
      },
      atributos: ATRIBUTOS.map(k => ({ chave: k, rotulo: loc(`ICARUS.Atributos.${k}`), base: src.atributos[k].base, total: comSinal(s.atributos[k].total) })),
      proficiencias: {
        armas: PROFICIENCIAS_ARMA.map(v => ({ valor: v, rotulo: loc(`ICARUS.Proficiencias.ArmasOp.${v}`), marcado: src.proficiencias.armas.includes(v) })),
        armaduras: CATEGORIAS_ARMADURA_CORPO.map(v => ({ valor: v, rotulo: loc(`ICARUS.Proficiencias.ArmadurasOp.${v}`), marcado: src.proficiencias.armaduras.includes(v) }))
      },
      pericias: { principais: linhas.filter(l => l.loja || l.destaque), outras: linhas.filter(l => !l.loja && !l.destaque) },
      poderes: proprios.filter(i => i.type === "poder").map(i => ({ id: i.id, nome: i.name, img: i.img, resumo: resumoDe(i.system.descricao) })),
      magias: proprios.filter(i => i.type === "magia").map(i => ({ id: i.id, nome: i.name, img: i.img, info: fmt("ICARUS.Mercador.MagiaInfo", { nivel: i.system.nivel, custo: i.system.custoPM }) })),
      ataques,
      equipamento: proprios.filter(i => TIPOS_VENDAVEIS.includes(i.type)).map(i => ({
        id: i.id, nome: i.name, img: i.img, ehArma: i.type === "arma", empunhada: !!i.system.empunhada,
        equipavel: ehEquipavel(i), equipado: ehVestimenta(i) && i.system.tipo === "item-comum" ? !!i.system.vestido : !!i.system.equipado,
        info: i.type === "equipamento" && i.system.bonusDefesa ? `+${i.system.bonusDefesa} ${loc("ICARUS.Defesa.Rotulo")}` : i.type === "municao" ? `×${i.system.quantidade}` : ""
      })),
      estoque: estoque.map(i => {
        const l = lojaDoItem(i);
        const final = precoUnitario(i, mult, efeitos);
        return {
          id: i.id, nome: i.name, img: i.img, quantidade: l.quantidade,
          // Preço do mercador digitado em Reais (guardado em centavos); vazio = preço do item
          precoBase: l.precoBase === null ? "" : l.precoBase / 100, precoItem: formatarPreco(precoBase(i)),
          precoFinal: formatarPreco(final), dicaOuro: precoEmOuro(final), oculto: l.oculto,
          semVenda: !!i.system.semVenda && l.precoBase === null, cdRoubo: l.cdRoubo ?? "",
          libera: LIBERA_COM.map(v => ({ valor: v, rotulo: loc(`ICARUS.Mercador.Libera.${v}`), selecionado: v === l.liberaCom }))
        };
      }),
      caixaTotal: reais(totalEmCentavos(s.caixa)),
      // Barganha: configuração, falas e o estado atual
      barganha: {
        testes: TESTES_DE_BARGANHA.map(t => ({
          chave: t, nome: loc(`ICARUS.Pericias.${t}`), ativo: b.testes[t].ativo, cd: b.testes[t].cd,
          estado: estado[t]?.feito ? fmt("ICARUS.Mercador.EstadoTeste", { por: estado[t].por, resultado: loc(`ICARUS.Loja.Barganha.Rotulos.${estado[t].resultado}`) }) : loc("ICARUS.Mercador.Livre"),
          falas: RESULTADOS.map(r => ({ chave: r, rotulo: loc(`ICARUS.Loja.Barganha.Rotulos.${r}`), texto: b.falas[t][r] }))
        })),
        efeitos: [efeitos.desconto ? `−${efeitos.desconto}%` : "", efeitos.acrescimo ? `+${efeitos.acrescimo}%` : ""].filter(Boolean).join(" · "),
        guardas: !!actor.getFlag(F, "guardas"),
        algumFeito: TESTES_DE_BARGANHA.some(t => estado[t]?.feito) || Object.keys(actor.getFlag(F, "tentativasSemDinheiro") ?? {}).length > 0
      },
      // Roubo e compra sem dinheiro: tentativas por jogador e o registro dos roubos
      roubo: {
        tentativas: Object.entries(actor.getFlag(F, "tentativasSemDinheiro") ?? {}).map(([usuarioId, n]) => ({ usuarioId, n, nome: game.users.get(usuarioId)?.name ?? usuarioId })),
        roubos: [...(actor.getFlag(F, "roubos") ?? [])].reverse().map(r => ({ ...r, texto: fmt(r.passou ? "ICARUS.Mercador.RouboPassou" : "ICARUS.Mercador.RouboPego", { por: r.por, item: r.item }) }))
      },
      descricao: await TextEditor.enrichHTML(s.descricao ?? "", { async: true }),
      notas: s.notas,
      token: contextoDoToken(actor, this.isEditable)
    };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    const raiz = this.element;
    // Estoque: cada campo atualiza o item (nome) ou a flag da loja dele
    for (const campo of raiz.querySelectorAll("[data-loja-campo]")) {
      campo.addEventListener("change", ev => {
        const el = ev.currentTarget;
        const item = this.document.items.get(el.closest("[data-item-id]")?.dataset.itemId);
        if (!item) return;
        const chave = el.dataset.lojaCampo;
        if (chave === "nome") return el.value.trim() ? item.update({ name: el.value.trim() }) : null;
        let valor;
        if (chave === "oculto") valor = el.checked;
        else if (chave === "liberaCom") valor = LIBERA_COM.includes(el.value) ? el.value : "qualquer";
        else if (chave === "precoBase") valor = centavos(el.value);
        else if (chave === "cdRoubo") valor = el.value === "" ? null : Math.max(0, Math.trunc(Number(el.value) || 0));
        else valor = Math.max(0, Math.trunc(Number(el.value) || 0));
        return item.update({ [`flags.${F}.loja.${chave}`]: valor });
      });
    }
    // Proficiências (listas de marcar: o formulário não monta arrays sozinho)
    for (const caixa of raiz.querySelectorAll("[data-proficiencia]")) {
      caixa.addEventListener("change", ev => {
        const lista = ev.currentTarget.dataset.proficiencia;
        const marcados = [...raiz.querySelectorAll(`[data-proficiencia="${lista}"]:checked`)].map(e => e.value);
        this.document.update({ [`system.proficiencias.${lista}`]: marcados });
      });
    }
    // Aba Token: liga o editor (refaz a cada render, o canvas é novo)
    if (this.aba === "token") ligarEditor(this);
  }

  async close(options) {
    this._editorToken?.destruir();
    this._editorToken = null;
    return super.close(options);
  }

  /** Arrastar itens (uma vez por janela): na aba Loja entram no estoque; nas outras, como itens do mercador. */
  _onFirstRender(context, options) {
    super._onFirstRender?.(context, options);
    this.element.addEventListener("dragover", ev => ev.preventDefault());
    this.element.addEventListener("drop", ev => this._soltar(ev));
  }

  /**
   * Soltar um item de qualquer lugar (compêndio, diretório, inventário de outro ator ou desta
   * ficha): sempre COPIA. Na aba Loja pergunta quantidade, preço e se entra oculto.
   */
  async _soltar(event) {
    event.preventDefault();
    if (!this.isEditable || event.target.closest?.(".token-aba")) return;
    const dados = TextEditor.getDragEventData(event);
    if (dados?.type !== "Item") return;
    const item = await fromUuid(dados.uuid);
    if (!item) return;
    // Uma linha do próprio estoque arrastada sobre a ficha: nada a fazer
    if (item.parent === this.document && (item.flags?.[F]?.loja || this.aba !== "loja")) return;
    const novo = item.toObject();
    delete novo._id;
    if (!["poder", "magia", ...TIPOS_VENDAVEIS].includes(novo.type)) return ui.notifications.warn(loc("ICARUS.Mercador.TipoNaoAceito"));
    if (this.aba === "loja") {
      if (!TIPOS_VENDAVEIS.includes(novo.type)) return ui.notifications.warn(loc("ICARUS.Loja.NaoVendavel"));
      const r = await perguntarEstoque({ titulo: fmt("ICARUS.Mercador.AdicionarAoEstoque", { item: novo.name }), preco: precoDoItemNaLoja(novo) });
      if (!r) return;
      foundry.utils.setProperty(novo, `flags.${F}.loja`, { ...LOJA_PADRAO, quantidade: Math.max(0, Math.trunc(Number(r.quantidade) || 0)), precoBase: centavos(r.preco), oculto: !!r.oculto });
      if (novo.system && "quantidade" in novo.system) novo.system.quantidade = novo.type === "municao" ? 20 : 1;
      if (novo.system && "equipado" in novo.system) novo.system.equipado = false;
    }
    else if (novo.flags?.[F]?.loja) delete novo.flags[F].loja;
    await this.document.createEmbeddedDocuments("Item", [novo]);
  }

  static _aba(event, alvo) {
    if (this.aba === "token" && alvo.dataset.aba !== "token") { this._editorToken?.destruir(); this._editorToken = null; }
    this.aba = alvo.dataset.aba;
    this.render();
  }

  /** Retrato: muda img e o token (se o token não foi finalizado na aba Token; senão avisa). */
  static _imagem() {
    return trocarRetrato(this.document);
  }

  static _verComoJogador() {
    abrirVitrine(this.document, { comoJogador: true });
  }

  static _alternarLoja() {
    return this.document.update({ "system.loja.aberta": !this.document.system.loja.aberta });
  }

  static async _removerItem(event, alvo) {
    const item = this.document.items.get(alvo.closest("[data-item-id]")?.dataset.itemId);
    if (item) await item.delete();
  }

  static _abrirItem(event, alvo) {
    this.document.items.get(alvo.closest("[data-item-id]")?.dataset.itemId)?.sheet?.render(true);
  }

  /** Item da linha clicada. */
  _itemDe(alvo) {
    return this.document.items.get(alvo.closest("[data-item-id]")?.dataset.itemId);
  }

  static _rolarPericia(event, alvo) {
    return rolarPericia(this.document, alvo.dataset.pericia, modoDoEvento(event));
  }

  static _rolarAtributo(event, alvo) {
    return rolarAtributo(this.document, alvo.dataset.atributo, modoDoEvento(event));
  }

  static _usarPoder(event, alvo) {
    const item = this._itemDe(alvo);
    return item ? usarPoder(this.document, item) : null;
  }

  static _lancarMagia(event, alvo) {
    const item = this._itemDe(alvo);
    return item ? lancarMagia(this.document, item, { aprimorado: true }) : null;
  }

  /** Atacar: clique rola na hora; Shift/Ctrl: vantagem/desvantagem (como na ficha do personagem). */
  static _atacar(event, alvo) {
    const item = this._itemDe(alvo);
    return item ? rolarAtaque(this.document, item, alvo.dataset.modo, { ...modoDoEvento(event), rapido: !event.altKey }) : null;
  }

  static _dano(event, alvo) {
    const item = this._itemDe(alvo);
    return item ? rolarDano(this.document, item, item.system.modos[0]) : null;
  }

  static _recarregar(event, alvo) {
    const item = this._itemDe(alvo);
    return item ? recarregar(this.document, item) : null;
  }

  /** Equipar: a mesma regra da ficha do personagem (armadura e túnica no Limite de Vestimentas). */
  static _equipar(event, alvo) {
    const item = this._itemDe(alvo);
    if (!item) return null;
    if (ehVestimenta(item)) return alternarVestido(this.document, item);
    return item.update({ "system.equipado": !item.system.equipado });
  }

  static _empunhar(event, alvo) {
    const item = this._itemDe(alvo);
    return item?.update({ "system.empunhada": !item.system.empunhada });
  }

  /** Passa um item do mercador para o estoque da loja (desequipado). */
  static _paraLoja(event, alvo) {
    const item = this._itemDe(alvo);
    if (!item) return null;
    return item.update({ [`flags.${F}.loja`]: { ...LOJA_PADRAO }, ...("equipado" in item.system ? { "system.equipado": false } : {}), ...("empunhada" in item.system ? { "system.empunhada": false } : {}), ...("vestido" in item.system ? { "system.vestido": false } : {}) });
  }

  /** Tira um item do estoque: passa a ser do mercador (ele mesmo usa). */
  static _paraMercador(event, alvo) {
    const item = this._itemDe(alvo);
    return item?.update({ [`flags.${F}.-=loja`]: null });
  }

  /** "Criar item": um equipamento novo já no estoque (para o que não existe em compêndio). */
  static async _criarItem() {
    const extras = `<label class="linha">${esc(loc("ICARUS.Mercador.NomeDoItem"))} <input type="text" name="nome" required></label>
      <label class="linha">${esc(loc("ICARUS.Mercador.Icone"))} <input type="text" name="img" value="${esc(ICONE_PADRAO)}"></label>
      <label class="linha">${esc(loc("ICARUS.Mercador.Descricao"))} <textarea name="descricao" rows="3"></textarea></label>`;
    const r = await perguntarEstoque({ titulo: loc("ICARUS.Mercador.CriarItem"), preco: 0, extras });
    if (!r || !String(r.nome ?? "").trim()) return;
    await this.document.createEmbeddedDocuments("Item", [{
      name: r.nome.trim(), type: "equipamento", img: r.img || ICONE_PADRAO,
      system: { tipo: "outro", quantidade: 1, preco: centavos(r.preco) ?? 0, descricao: r.descricao ? `<p>${esc(r.descricao)}</p>` : "" },
      flags: { [F]: { loja: { ...LOJA_PADRAO, quantidade: Math.max(0, Math.trunc(Number(r.quantidade) || 0)), precoBase: centavos(r.preco), oculto: !!r.oculto } } }
    }]);
  }

  /** Volta as 12 falas às padrão. */
  static async _restaurarFalas() {
    const ok = await DialogV2.confirm({ window: { title: loc("ICARUS.Mercador.RestaurarFalas") }, content: `<p>${esc(loc("ICARUS.Mercador.RestaurarFalasTexto"))}</p>`, rejectClose: false });
    if (!ok) return;
    const falas = Object.fromEntries(TESTES_DE_BARGANHA.map(t => [t, Object.fromEntries(RESULTADOS.map(r => [r, textoDasFalasPadrao(t, r)]))]));
    return this.document.update({
      "system.loja.barganha.falas": falas,
      "system.loja.roubo.aviso": ROUBO_PADRAO.aviso, "system.loja.roubo.falasGuardas": ROUBO_PADRAO.falasGuardas,
      "system.loja.roubo.falasFlagrante": ROUBO_PADRAO.falasFlagrante, "system.loja.roubo.sucesso": ROUBO_PADRAO.sucesso
    });
  }

  static _zerarTentativas(event, alvo) {
    return zerarTentativasDoUsuario(this.document, alvo.dataset.usuario);
  }

  static _reiniciarBarganhas() {
    return reiniciarBarganhas(this.document);
  }

  static _acalmarGuardas() {
    return acalmarGuardas(this.document);
  }
}
