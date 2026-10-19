import { SISTEMA_ID } from "./config.mjs";
import { numero, comSinal } from "./regras.mjs";
import { rolarD20, vantagemDasFlags, minimoDasFlags } from "./combate.mjs";

const TEMPLATE_CARTAO = `systems/${SISTEMA_ID}/templates/chat/rolagem.hbs`;

/**
 * Vantagem/desvantagem de uma rolagem: o que foi pedido (Shift = vantagem, Ctrl = desvantagem)
 * somado ao que os Efeitos Ativos do ator dão no escopo. Não acumulam; juntas se anulam.
 */
export function vantagemDaRolagem(actor, escopos, { vantagem = false, desvantagem = false } = {}) {
  const f = vantagemDasFlags(actor?.flags?.[SISTEMA_ID], escopos);
  return { vantagem: vantagem || f.vantagem, desvantagem: desvantagem || f.desvantagem };
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
export async function rolarTeste(actor, { rotulo, modificador, tipo, chave, escopos = [], vantagem = false, desvantagem = false }) {
  const mod = numero(modificador);
  const v = vantagemDaRolagem(actor, escopos, { vantagem, desvantagem });
  const minimo = minimoDasFlags(actor?.flags?.[SISTEMA_ID], escopos);
  const r = await rolarD20({ ...v, bonus: mod, minimo });

  const content = await renderTemplate(TEMPLATE_CARTAO, {
    rotulo,
    tipoRotulo: game.i18n.localize(`ICARUS.Rolagem.Tipo.${tipo}`),
    ...dadosDoCard(r),
    formula: `d20 ${comSinal(mod)}`,
    total: r.total,
    critico: r.natural === 20,
    falha: r.natural === 1
  });

  const dados = {
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    rolls: [r.roll],
    sound: CONFIG.sounds.dice,
    flags: { [SISTEMA_ID]: { tipo, chave, modo: r.modo, d20: r.d20, total: r.total } }
  };
  ChatMessage.applyRollMode(dados, game.settings.get("core", "rollMode"));
  return ChatMessage.create(dados);
}

/** Rola uma perícia do personagem (inclui as Resistências). opcoes = { vantagem, desvantagem }. */
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
  return rolarTeste(actor, {
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
