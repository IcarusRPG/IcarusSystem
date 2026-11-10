import { SISTEMA_ID } from "./config.mjs";
import { numero, comSinal, bonusTreino } from "./regras.mjs";
import { rolarD20, vantagemDasFlags, minimoDasFlags } from "./combate.mjs";
import { minimoD20DeHabilidades, temHabilidadeNosItens } from "./classes-dados.mjs";
import { maximoDeBrio, bonusDeBrio } from "./nobre-dados.mjs";
import { condicionaisDaPericia, temGazuas, resultadoDaFechadura, vestimentasAtivas } from "./origens-dados.mjs";

const TEMPLATE_CARTAO = `systems/${SISTEMA_ID}/templates/chat/rolagem.hbs`;

/**
 * Vantagem/desvantagem de uma rolagem: o que foi pedido (Shift = vantagem, Ctrl = desvantagem)
 * somado ao que os Efeitos Ativos do ator dão no escopo. Não acumulam; juntas se anulam.
 */
export function vantagemDaRolagem(actor, escopos, { vantagem = false, desvantagem = false } = {}) {
  const f = vantagemDasFlags(actor?.flags?.[SISTEMA_ID], escopos);
  const encorajado = !!actor?.flags?.[SISTEMA_ID]?.encorajado;
  return { vantagem: vantagem || f.vantagem || encorajado, desvantagem: desvantagem || f.desvantagem };
}

/** Atalhos do clique: Shift = vantagem, Ctrl = desvantagem. */
export const modoDoEvento = ev => ({ vantagem: !!ev?.shiftKey, desvantagem: !!ev?.ctrlKey });

/** Dados mostrados no card: os dois d20 com o descartado esmaecido, e o rótulo do modo. */
export function dadosDoCard(r) {
  return {
    d20: r.d20,
    modoRotulo: r.modo === "normal" ? "" : game.i18n.localize(`ICARUS.Rolagem.Modo.${r.modo}`),
    dados: r.dados.length > 1 ? r.dados : null,
    minimoAplicado: r.minimoAplicado ? game.i18n.format("ICARUS.Rolagem.Minimo", { natural: r.natural, d20: r.d20 }) : ""
  };
}

/**
 * Teste padrão: d20 (com vantagem/desvantagem) + modificador, enviado como cartão no chat.
 * Respeita o modo de rolagem escolhido no chat (público, privado do Mestre, cego, só para mim).
 * 20 e 1 naturais (do dado mantido) só mudam o visual do cartão: não há crítico em testes.
 *
 * @param {Actor} actor
 * @param {object} opcoes
 * @param {string} opcoes.rotulo        Nome mostrado no cartão (ex.: "Luta")
 * @param {number} opcoes.modificador   Total somado ao d20
 * @param {"atributo"|"pericia"|"resistencia"} opcoes.tipo
 * @param {string} [opcoes.chave]       Chave do atributo ou perícia, guardada nos flags da mensagem
 * @param {string[]} [opcoes.escopos]   Escopos das flags de vantagem/desvantagem e de mínimo do d20
 * @param {boolean} [opcoes.vantagem] / [opcoes.desvantagem]  pedidos no clique
 */
export async function rolarTeste(actor, { rotulo, modificador, tipo, chave, escopos = [], vantagem = false, desvantagem = false, extras = [], fechadura = null }) {
  // Bônus de itens marcados na rolagem e a penalidade sem gazuas entram no modificador
  const mod = numero(modificador) + extras.reduce((soma, e) => soma + numero(e.valor), 0);
  const v = vantagemDaRolagem(actor, escopos, { vantagem, desvantagem });
  const minimo = Math.max(minimoDasFlags(actor?.flags?.[SISTEMA_ID], escopos) ?? 0, minimoD20DeHabilidades(actor?.items ?? [], chave) ?? 0) || null;
  const r = await rolarD20({ ...v, bonus: mod, minimo });
  const quebra = fechadura ? resultadoDaFechadura({ ...fechadura, natural: r.natural }).quebra : false;

  const content = await renderTemplate(TEMPLATE_CARTAO, {
    rotulo,
    tipoRotulo: game.i18n.localize(`ICARUS.Rolagem.Tipo.${tipo}`),
    ...dadosDoCard(r),
    formula: `d20 ${comSinal(mod)}`,
    total: r.total,
    critico: r.natural === 20,
    falha: r.natural === 1,
    extras: extras.map(e => `${comSinal(e.valor)} ${e.rotulo}`),
    quebraGazuas: quebra
  });

  const dados = {
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    rolls: [r.roll],
    sound: CONFIG.sounds.dice,
    flags: { [SISTEMA_ID]: { tipo, chave, modo: r.modo, d20: r.d20, total: r.total } }
  };
  ChatMessage.applyRollMode(dados, game.settings.get("core", "rollMode"));
  // Palavra de Encorajamento vale para um teste
  if (actor?.flags?.[SISTEMA_ID]?.encorajado && actor.isOwner) await actor.unsetFlag(SISTEMA_ID, "encorajado");
  return ChatMessage.create(dados);
}

/**
 * Bônus de itens na rolagem (itens comuns): caixas para os bônus condicionais aplicáveis (todas
 * desmarcadas) e, em Prestidigitação, "Abrir fechadura/tranca" (−5 sem gazuas). Sem nada a
 * perguntar, devolve {} e rola direto. @returns {Promise<{extras, fechadura}|null>} null = cancelou
 */
export async function perguntarBonusDeItens(actor, chave) {
  const itens = [...(actor.items ?? [])];
  const condicionais = condicionaisDaPericia(itens, chave, vestimentasAtivas(itens).ativas);
  const fechadura = chave === "prestidigitacao";
  // Brio (Nobre): PM gastos no teste, +2 cada, até o Carisma (mínimo 1)
  const maxBrio = temHabilidadeNosItens(itens, "nobre", "brio") ? maximoDeBrio(actor.system?.atributos?.CAR?.total, actor.system?.pm?.value) : 0;
  // Talento de Palco (Bardo): perícia não treinada, 1 PM para receber o bônus de treino
  const talento = temHabilidadeNosItens(itens, "bardo", "talento-de-palco") && Number(actor.system?.pericias?.[chave]?.treino) === 0 && Number(actor.system?.pm?.value) >= 1;
  if (!condicionais.length && !fechadura && !maxBrio && !talento) return {};
  const esc = t => Handlebars.escapeExpression(String(t ?? ""));
  const gazuas = temGazuas(itens);
  const caixas = condicionais.map(c => `<label class="chk"><input type="checkbox" name="bonus" value="${esc(c.id)}"> ${comSinal(c.valor)} ${esc(c.condicao)} <small>(${esc(c.origem)})</small></label>`);
  if (fechadura) caixas.push(`<label class="chk"><input type="checkbox" name="fechadura"> ${esc(game.i18n.localize("ICARUS.ItensComuns.AbrirFechadura"))} <small>(${esc(game.i18n.localize(gazuas ? "ICARUS.ItensComuns.ComGazuas" : "ICARUS.ItensComuns.SemGazuasPenalidade"))})</small></label>`);
  const campoTalento = talento ? `<label class="chk"><input type="checkbox" name="talento"> ${esc(game.i18n.format("ICARUS.Bardo.TalentoCampo", { bonus: bonusTreino(1) }))}</label>` : "";
  const campoBrio = maxBrio ? `<label class="linha">${esc(game.i18n.format("ICARUS.Nobre.BrioCampo", { max: maxBrio }))} <input type="number" name="brio" value="0" min="0" max="${maxBrio}" step="1"></label>` : "";
  const r = await foundry.applications.api.DialogV2.wait({
    window: { title: game.i18n.format("ICARUS.ItensComuns.RolarTitulo", { pericia: game.i18n.localize(`ICARUS.Pericias.${chave}`) }) },
    content: `<div class="icarus-uso">${caixas.length ? `<fieldset><legend>${esc(game.i18n.localize("ICARUS.ItensComuns.BonusDeItens"))}</legend>${caixas.join("")}</fieldset>` : ""}${campoBrio}${campoTalento}</div>`,
    buttons: [
      { action: "rolar", label: game.i18n.localize("ICARUS.ItensComuns.Rolar"), icon: "fa-solid fa-dice-d20", default: true, callback: (ev, b) => {
        const marcados = new Set([...b.form.querySelectorAll("input[name=bonus]:checked")].map(i => i.value));
        const abrir = !!b.form.querySelector("input[name=fechadura]:checked");
        const extras = condicionais.filter(c => marcados.has(c.id)).map(c => ({ valor: c.valor, rotulo: c.origem }));
        const pen = resultadoDaFechadura({ abrir, gazuas, natural: 0 }).modificador;
        if (pen) extras.push({ valor: pen, rotulo: game.i18n.localize("ICARUS.ItensComuns.SemGazuasRotulo") });
        const brio = Math.min(maxBrio, Math.max(0, Math.trunc(Number(b.form.querySelector("input[name=brio]")?.value) || 0)));
        if (brio) extras.push({ valor: bonusDeBrio(brio), rotulo: game.i18n.format("ICARUS.Nobre.BrioRotulo", { pm: brio }) });
        const comTalento = talento && !!b.form.querySelector("input[name=talento]:checked");
        if (comTalento) extras.push({ valor: bonusTreino(1), rotulo: game.i18n.localize("ICARUS.Bardo.TalentoRotulo") });
        return { extras, fechadura: abrir ? { abrir, gazuas } : null, brio, talento: comTalento ? 1 : 0 };
      } },
      { action: "cancelar", label: game.i18n.localize("ICARUS.Testes.Cancelar") }
    ],
    rejectClose: false
  });
  return r && typeof r === "object" ? r : null;
}

/** "Abrir fechadura/tranca" já marcado: −5 sem gazuas; com gazuas, normal (1 natural quebra). */
export function fechaduraMarcada(actor) {
  const gazuas = temGazuas([...(actor.items ?? [])]);
  const pen = resultadoDaFechadura({ abrir: true, gazuas, natural: 0 }).modificador;
  return {
    extras: pen ? [{ valor: pen, rotulo: game.i18n.localize("ICARUS.ItensComuns.SemGazuasRotulo") }] : [],
    fechadura: { abrir: true, gazuas }
  };
}

/** Rola uma perícia do personagem (inclui as Resistências). opcoes = { vantagem, desvantagem, abrirFechadura }. */
export async function rolarPericia(actor, chave, opcoes = {}) {
  const pericia = actor.system.pericias[chave];
  if (!pericia) return null;
  // Condição com falha automática (Cego em Visão, Surdo em Audição, Indefeso em Reflexos): não rola
  if (pericia.falhaAuto) {
    const content = await renderTemplate(TEMPLATE_CARTAO, {
      rotulo: game.i18n.localize(`ICARUS.Pericias.${chave}`),
      tipoRotulo: game.i18n.format("ICARUS.Condicoes.FalhaAuto", { condicao: pericia.falhaAuto }),
      falhaAutomatica: true
    });
    return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content });
  }
  const resistencia = ["fortitude", "reflexos", "vontade"].includes(chave);
  // abrirFechadura: teste de abrir porta (module/porta-trancada.mjs) rola direto, com a caixa marcada
  const deItens = opcoes.semItens ? {} : opcoes.abrirFechadura ? fechaduraMarcada(actor) : await perguntarBonusDeItens(actor, chave);
  if (!deItens) return null;
  // Brio: o PM sai depois de confirmar
  const { brio = 0, talento = 0, ...semBrio } = deItens;
  if (brio + talento) await actor.update({ "system.pm.value": Math.max(0, actor.system.pm.value - brio - talento) });
  return rolarTeste(actor, {
    ...semBrio,
    rotulo: game.i18n.localize(`ICARUS.Pericias.${chave}`),
    modificador: pericia.total,
    tipo: resistencia ? "resistencia" : "pericia",
    chave,
    escopos: escoposDaPericia(chave),
    ...opcoes
  });
}

/** Escopos de flags de uma perícia: "pericia.<chave>" e, nas Resistências, também "resistencia.<chave>". */
export function escoposDaPericia(chave) {
  const lista = [`pericia.${chave}`];
  if (["fortitude", "reflexos", "vontade"].includes(chave)) lista.push(`resistencia.${chave}`);
  if (chave === "iniciativa") lista.push("iniciativa");
  return lista;
}

/** Rola d20 + total de um atributo. opcoes = { vantagem, desvantagem }. */
export function rolarAtributo(actor, chave, opcoes = {}) {
  const atributo = actor.system.atributos[chave];
  if (!atributo) return null;
  return rolarTeste(actor, {
    rotulo: game.i18n.localize(`ICARUS.Atributos.${chave}`),
    modificador: atributo.total,
    tipo: "atributo",
    chave,
    escopos: [`atributo.${chave}`],
    ...opcoes
  });
}
