/**
 * PV temporários (system.pv.temp):
 * - não se acumulam: vale o maior (novosTemporarios); a fonte que vale fica em flags.pvTempOrigem;
 * - o dano consome primeiro os temporários (module/dano.mjs); cura e perda de PV não mexem neles;
 * - somem no fim da cena ("Encerrar cena") ou quando o efeito de origem termina (origem = id do
 *   efeito ativo: Forma do Druida, Ascensão do Místico).
 * Quem não controla o ator (aliado de outro jogador) deixa um card com "Aplicar" para o Mestre.
 */
import { SISTEMA_ID } from "./config.mjs";
import { novosTemporarios } from "./dano-aplicacao.mjs";
import { FIM_DA_CENA } from "./condicoes-foundry.mjs";

const F = SISTEMA_ID;
const fmt = (k, d) => game.i18n.format(k, d);
const esc = t => Handlebars.escapeExpression(t ?? "");

/** Origem ligada a um efeito ativo: os PV temporários somem quando ele sai. */
export const origemDoEfeito = efeito => (efeito?.id ? `efeito:${efeito.id}` : "cena");

/** Aplica no ator (quem chama controla o ator). Devolve o texto do resultado. */
async function aplicar(actor, valor, origem, fonte) {
  const atual = Math.max(0, Number(actor.system?.pv?.temp) || 0);
  const r = novosTemporarios(atual, valor);
  if (!r.trocou) return fmt("ICARUS.PV.TempMantem", { nome: actor.name, atual, valor, fonte });
  await actor.update({ "system.pv.temp": r.valor, [`flags.${F}.pvTempOrigem`]: origem });
  return fmt("ICARUS.PV.TempRecebe", { nome: actor.name, valor: r.valor, fonte });
}

/**
 * Concede PV temporários (não acumulam: vale o maior).
 * @param {Actor} actor  @param {number} valor
 * @param {{ origem?: string, fonte?: string, autor?: Actor }} [opcoes]  origem: "cena" ou origemDoEfeito(efeito)
 */
export async function concederPVTemporarios(actor, valor, { origem = "cena", fonte = "", autor = null } = {}) {
  const v = Math.max(0, Math.trunc(Number(valor) || 0));
  if (!actor || !v) return null;
  const quem = autor ?? actor;
  if (actor.isOwner) {
    const texto = await aplicar(actor, v, origem, fonte);
    return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: quem }), content: `<div class="icarus-rolagem icarus-lembrete"><p class="condicao-descricao">${esc(texto)}</p></div>` });
  }
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: quem }),
    content: `<div class="icarus-rolagem icarus-lembrete"><p class="condicao-descricao">${esc(fmt("ICARUS.PV.TempPendente", { nome: actor.name, valor: v, fonte }))}</p></div>`,
    flags: { [F]: { pvTemp: { actorUuid: actor.uuid, valor: v, origem, fonte, aplicado: false } } }
  });
}

/** Tira os PV temporários (todos, ou só se vieram dessa origem). */
export async function limparPVTemporarios(actor, origem = null) {
  if (!actor?.isOwner || !(Number(actor.system?.pv?.temp) > 0)) return;
  if (origem && actor.getFlag(F, "pvTempOrigem") !== origem) return;
  await actor.update({ "system.pv.temp": 0, [`flags.${F}.-=pvTempOrigem`]: null });
}

function aoRenderizar(mensagem, html) {
  const d = mensagem.flags?.[F]?.pvTemp;
  if (!d || d.aplicado) return;
  const actor = fromUuidSync(d.actorUuid);
  if (!actor?.isOwner) return;
  const raiz = html instanceof HTMLElement ? html : html?.[0];
  const conteudo = raiz?.querySelector(".message-content");
  if (!conteudo) return;
  const el = document.createElement("button");
  el.type = "button";
  el.className = "btn";
  el.textContent = fmt("ICARUS.PV.TempAplicar", { nome: actor.name, valor: d.valor });
  el.addEventListener("click", async () => {
    el.disabled = true;
    ui.notifications.info(await aplicar(actor, d.valor, d.origem, d.fonte));
    if (mensagem.isOwner) await mensagem.setFlag(F, "pvTemp.aplicado", true);
  });
  const caixa = document.createElement("div");
  caixa.className = "icarus-aplicar";
  caixa.appendChild(el);
  conteudo.appendChild(caixa);
}

// Fim da cena: somem
FIM_DA_CENA.push(actor => limparPVTemporarios(actor));

Hooks.once("init", () => {
  if ((game.release?.generation ?? 12) >= 13) Hooks.on("renderChatMessageHTML", aoRenderizar);
  else Hooks.on("renderChatMessage", aoRenderizar);
  // O efeito de origem terminou (voltar da Forma, sair da Ascensão, Encerrar cena, apagado à mão)
  Hooks.on("deleteActiveEffect", (efeito, opcoes, userId) => {
    const actor = efeito.parent;
    if (userId !== game.user.id || !actor?.system?.pv) return;
    limparPVTemporarios(actor, origemDoEfeito(efeito));
  });
});
