import { SISTEMA_ID } from "./config.mjs";
import { numero, comSinal } from "./regras.mjs";

const TEMPLATE_CARTAO = `systems/${SISTEMA_ID}/templates/chat/rolagem.hbs`;

/**
 * Teste padrão: 1d20 + modificador, enviado como cartão no chat do Foundry.
 * Respeita o modo de rolagem escolhido no chat (público, privado do Mestre, cego, só para mim).
 * 20 e 1 naturais só mudam o visual do cartão: não há mecânica de crítico em testes.
 *
 * @param {Actor} actor
 * @param {object} opcoes
 * @param {string} opcoes.rotulo        Nome mostrado no cartão (ex.: "Luta")
 * @param {number} opcoes.modificador   Total somado ao d20
 * @param {"atributo"|"pericia"|"resistencia"} opcoes.tipo
 * @param {string} [opcoes.chave]       Chave do atributo ou perícia, guardada nos flags da mensagem
 */
export async function rolarTeste(actor, { rotulo, modificador, tipo, chave }) {
  const mod = numero(modificador);
  const formula = `1d20 ${mod < 0 ? "-" : "+"} ${Math.abs(mod)}`;
  const roll = await new Roll(formula).evaluate();
  const d20 = roll.dice[0]?.total ?? roll.total - mod;

  const content = await renderTemplate(TEMPLATE_CARTAO, {
    rotulo,
    tipoRotulo: game.i18n.localize(`ICARUS.Rolagem.Tipo.${tipo}`),
    d20,
    formula: `1d20 ${comSinal(mod)}`,
    total: roll.total,
    critico: d20 === 20,
    falha: d20 === 1
  });

  const dados = {
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    rolls: [roll],
    sound: CONFIG.sounds.dice,
    flags: { [SISTEMA_ID]: { tipo, chave } }
  };
  ChatMessage.applyRollMode(dados, game.settings.get("core", "rollMode"));
  return ChatMessage.create(dados);
}

/** Rola uma perícia do personagem (inclui as Resistências). */
export function rolarPericia(actor, chave) {
  const pericia = actor.system.pericias[chave];
  if (!pericia) return null;
  const resistencia = ["fortitude", "reflexos", "vontade"].includes(chave);
  return rolarTeste(actor, {
    rotulo: game.i18n.localize(`ICARUS.Pericias.${chave}`),
    modificador: pericia.total,
    tipo: resistencia ? "resistencia" : "pericia",
    chave
  });
}

/** Rola 1d20 + total de um atributo. */
export function rolarAtributo(actor, chave) {
  const atributo = actor.system.atributos[chave];
  if (!atributo) return null;
  return rolarTeste(actor, {
    rotulo: game.i18n.localize(`ICARUS.Atributos.${chave}`),
    modificador: atributo.total,
    tipo: "atributo",
    chave
  });
}
