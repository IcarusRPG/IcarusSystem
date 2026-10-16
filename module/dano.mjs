/**
 * Aplicar dano e perda de PV nos tokens selecionados (botões dos cards de dano).
 * - Dano: passa por Imunidade, Vulnerabilidade, Redução do tipo e RD geral (calcularDanoRecebido).
 * - Perda de PV ("Perde X PV"): não é dano; ignora resistências, imunidade e vulnerabilidade.
 * PV temporários ainda não existem no modelo (fora de escopo).
 */
import { SISTEMA_ID, REGRAS_DANO } from "./config.mjs";
import { calcularDanoRecebido, textoDoDano } from "./combate.mjs";

const loc = k => game.i18n.localize(k);
const T = `systems/${SISTEMA_ID}/templates/chat`;

export const nomeDoTipo = tipo => loc(`ICARUS.TiposDano.${tipo || "dano"}`);

/** Atores dos tokens selecionados (sem repetir o mesmo ator vinculado). */
function atoresSelecionados() {
  const atores = new Map();
  for (const t of canvas?.tokens?.controlled ?? []) if (t.actor) atores.set(t.actor.uuid, t.actor);
  return [...atores.values()];
}

/**
 * Aplica num ator. Devolve a linha do resumo, ou null se não puder.
 * @param {"dano"|"perda"} modo
 */
export async function aplicarNoAtor(actor, valor, tipo, { modo = "dano", multiplicador = 1 } = {}) {
  if (!actor.isOwner) return { linha: game.i18n.format("ICARUS.Dano.SemPermissao", { nome: actor.name }), ok: false };
  const bruto = Math.floor(Math.max(0, Number(valor) || 0) * multiplicador);
  let final, detalhe;
  if (modo === "perda") {
    final = bruto;
    detalhe = game.i18n.format("ICARUS.Dano.PerdaDetalhe", { n: bruto });
  } else {
    const r = calcularDanoRecebido(actor.system.resistencias, bruto, tipo, REGRAS_DANO);
    final = r.final;
    detalhe = textoDoDano(r.passos, nomeDoTipo(tipo));
  }
  const antes = actor.system.pv.value;
  const depois = Math.max(0, antes - final);
  await actor.update({ "system.pv.value": depois });
  return { linha: game.i18n.format("ICARUS.Dano.Linha", { nome: actor.name, detalhe, antes, depois }), ok: true };
}

/** Botões "Aplicar dano / metade / dobro / perda de PV": usa os tokens selecionados. */
export async function aplicarNosSelecionados(valor, tipo, opcoes = {}) {
  const atores = atoresSelecionados();
  if (!atores.length) return ui.notifications.warn(loc("ICARUS.Dano.SemSelecao"));
  const linhas = [];
  for (const a of atores) linhas.push((await aplicarNoAtor(a, valor, tipo, opcoes)).linha);
  const titulo = opcoes.modo === "perda" ? loc("ICARUS.Dano.TituloPerda") : loc("ICARUS.Dano.TituloAplicado");
  const content = await renderTemplate(`${T}/dano-aplicado.hbs`, { titulo, linhas });
  return ChatMessage.create({ speaker: ChatMessage.getSpeaker(), content });
}

/** Aplica num ator específico (pelo uuid) e posta o resumo. */
async function aplicarNoAlvo(uuid, valor, tipo, opcoes) {
  const actor = fromUuidSync(uuid);
  if (!actor) return ui.notifications.warn(loc("ICARUS.Dano.SemSelecao"));
  const { linha } = await aplicarNoAtor(actor, valor, tipo, opcoes);
  const titulo = opcoes.modo === "perda" ? loc("ICARUS.Dano.TituloPerda") : loc("ICARUS.Dano.TituloAplicado");
  const content = await renderTemplate(`${T}/dano-aplicado.hbs`, { titulo, linhas: [linha] });
  return ChatMessage.create({ speaker: ChatMessage.getSpeaker(), content });
}

/**
 * Rolagem de dano sem arma (ex.: Em Chamas 1d6 de fogo), com os botões de aplicar.
 * alvoUuid: aplica direto nesse ator (lembretes de turno); sem ele, nos tokens selecionados.
 */
export async function rolarDanoAvulso({ formula, tipo = "dano", titulo, img = "icons/svg/fire.svg", actor = null, perda = false, alvoUuid = null }) {
  const roll = await new Roll(formula).evaluate();
  const content = await renderTemplate(`${T}/dano.hbs`, {
    arma: { nome: titulo, img },
    texto: formula,
    total: roll.total,
    tipos: perda ? loc("ICARUS.Dano.PerdaDePV") : nomeDoTipo(tipo),
    botoes: true,
    perda
  });
  const dados = {
    speaker: actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker(),
    content,
    rolls: [roll],
    sound: CONFIG.sounds.dice,
    flags: { [SISTEMA_ID]: { dano: { total: roll.total, tipo, perda, alvoUuid } } }
  };
  ChatMessage.applyRollMode(dados, game.settings.get("core", "rollMode"));
  return ChatMessage.create(dados);
}

/** Liga os botões de aplicar dos cards de dano (Foundry v12: hook renderChatMessage). */
export function registrarBotoesDeDano() {
  Hooks.on("renderChatMessage", (message, html) => {
    const dano = message.flags?.[SISTEMA_ID]?.dano;
    if (!dano) return;
    const raiz = html instanceof HTMLElement ? html : html[0];
    raiz.querySelectorAll("[data-icarus-aplicar]").forEach(botao => {
      botao.addEventListener("click", ev => {
        ev.preventDefault();
        const acao = botao.dataset.icarusAplicar;
        const multiplicador = acao === "metade" ? 0.5 : acao === "dobro" ? 2 : 1;
        const modo = acao === "perda" ? "perda" : "dano";
        // Lembretes (Em Chamas, Sangrando) já sabem quem sofre; os demais usam os tokens selecionados
        if (dano.alvoUuid) return aplicarNoAlvo(dano.alvoUuid, dano.total, dano.tipo, { modo, multiplicador });
        return aplicarNosSelecionados(dano.total, dano.tipo, { modo, multiplicador });
      });
    });
  });
}
