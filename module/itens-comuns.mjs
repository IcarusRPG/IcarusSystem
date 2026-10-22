/**
 * Itens comuns no Foundry: "Usar" (itens com usos e o Kit de viagem), "Quebrar gazuas" e o
 * Limite de Vestimentas (vestir/tirar; a 6ª peça é sempre bloqueada, para todos).
 * Nada aqui automatiza o efeito do item: o card no chat traz o texto e o Mestre aplica.
 */
import { SISTEMA_ID } from "./config.mjs";
import { ehVestimenta, estaVestido, vestimentasAtivas, LIMITE_VESTIMENTAS } from "./origens-dados.mjs";
import { MODIFICADORES_ATAQUE } from "./combate-chat.mjs";

const { DialogV2 } = foundry.applications.api;
const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);
const esc = t => Handlebars.escapeExpression(String(t ?? ""));
const F = SISTEMA_ID;

/** Itens que só postam o card ao usar (sem contador de usos). */
export const USO_SEM_CONTADOR = new Set(["kit-de-viagem-odre-e-panela"]);

/** O item tem botão "Usar"? */
export const temUsar = item => item.type === "equipamento" && item.system.tipo === "item-comum"
  && (Number(item.system.usos?.max) > 0 || USO_SEM_CONTADOR.has(item.flags?.[F]?.id));

/** Card do item no chat (nome, linha extra e descrição). */
async function cardDoItem(actor, item, linha = "") {
  const descricao = await TextEditor.enrichHTML(item.system.descricao, { async: true, relativeTo: item });
  const content = `<div class="icarus-rolagem icarus-poder"><div class="arma-cab"><img src="${item.img}" alt="" width="36" height="36"><div>
    <h3 class="rolagem-nome">${esc(item.name)}</h3><div class="rolagem-tipo">${esc(linha)}</div></div></div><div class="poder-descricao">${descricao}</div></div>`;
  return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content });
}

/** "Usar": gasta 1 uso (se o item tiver usos) e posta o card. Sem usos restantes, avisa. */
export async function usarItemComum(actor, item) {
  if (!temUsar(item)) return null;
  const usos = item.system.usos ?? { max: 0, atual: 0 };
  if (usos.max > 0) {
    if (usos.atual <= 0) return ui.notifications.warn(fmt("ICARUS.ItensComuns.SemUsos", { item: item.name }));
    await item.update({ "system.usos.atual": usos.atual - 1 });
    return cardDoItem(actor, item, fmt("ICARUS.ItensComuns.UsoGasto", { atual: usos.atual - 1, max: usos.max }));
  }
  return cardDoItem(actor, item, loc("ICARUS.ItensComuns.Usou"));
}

/** "Quebrar gazuas" (1 natural ao abrir fechadura com elas): tira 1 unidade ou o item, com confirmação. */
export async function quebrarGazuas(actor) {
  const gazuas = actor?.items.find(i => i.type === "equipamento" && i.flags?.[F]?.id === "gazuas" && i.system.quantidade > 0);
  if (!gazuas) return ui.notifications.warn(loc("ICARUS.ItensComuns.SemGazuas"));
  const ok = await DialogV2.confirm({
    window: { title: loc("ICARUS.ItensComuns.QuebrarGazuas") },
    content: `<p>${esc(fmt("ICARUS.ItensComuns.QuebrarConfirmar", { nome: actor.name }))}</p>`,
    rejectClose: false
  });
  if (!ok) return null;
  if (gazuas.system.quantidade > 1) await gazuas.update({ "system.quantidade": gazuas.system.quantidade - 1 });
  else await gazuas.delete();
  return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<p>${esc(fmt("ICARUS.ItensComuns.Quebrou", { nome: actor.name }))}</p>` });
}

/** Ataque desarmado? (arma natural marcada, ex.: Monge, ou arma chamada "Desarmado") */
export const ehAtaqueDesarmado = item => !!item?.flags?.[F]?.desarmado || /^desarmad/i.test(item?.name ?? "");

// Bandagens de luta e Elo de corrente quebrada (opção ataque desarmado): somam sozinhos nos
// testes de ataque desarmado (itens diferentes somam; o mesmo item, uma vez)
MODIFICADORES_ATAQUE.push(({ actor, item }) => {
  const bonus = actor.system.bonusDesarmado ?? [];
  if (!bonus.length || !ehAtaqueDesarmado(item)) return null;
  return { bonus: bonus.reduce((soma, b) => soma + b.valor, 0), linhas: bonus.map(b => `+${b.valor} ${b.origem}`) };
});

/* ------------------------------ Limite de Vestimentas ------------------------------ */

/** Campo que diz se a peça está vestida: "vestido" (itens comuns) ou "equipado" (armadura/túnica). */
export const campoVestido = item => (item.system.tipo === "item-comum" ? "system.vestido" : "system.equipado");

/**
 * Peças vestidas que contam para vestir esta: trocar de armadura não conta a antiga, que o
 * equipar desveste sozinho (só uma armadura equipada por vez, module/armaduras.mjs).
 */
export function vestidasParaVestir(itens, item) {
  const troca = item.system.tipo === "armadura" ? itens.filter(i => i.id !== item.id && i.type === "equipamento" && i.system.tipo === "armadura" && i.system.equipado) : [];
  return vestimentasAtivas(itens.filter(i => !troca.includes(i))).vestidas;
}

/** Vestir/Tirar. Com 5 peças vestidas, a 6ª é bloqueada para todos (regra do núcleo, sem exceção). */
export async function alternarVestido(actor, item) {
  if (!ehVestimenta(item)) return null;
  if (estaVestido(item)) return item.update({ [campoVestido(item)]: false });
  if (vestidasParaVestir([...actor.items], item) >= LIMITE_VESTIMENTAS) return ui.notifications.warn(fmt("ICARUS.ItensComuns.Limite", { n: LIMITE_VESTIMENTAS }));
  return item.update({ [campoVestido(item)]: true, [`flags.${F}.vestidoEm`]: Date.now() });
}

/**
 * Trava central: nenhum caminho (ficha do item, outra tela, item que chega já vestido) deixa
 * passar de 5 vestimentas. Registra a hora em que a peça foi vestida.
 */
export function registrarItensComuns() {
  Hooks.on("preUpdateItem", (item, mudancas) => {
    const actor = item.parent;
    if (!actor || !ehVestimenta(item) || estaVestido(item)) return;
    const vai = foundry.utils.getProperty(mudancas, campoVestido(item)) === true;
    if (!vai) return;
    if (vestidasParaVestir([...actor.items], item) >= LIMITE_VESTIMENTAS) {
      ui.notifications.warn(fmt("ICARUS.ItensComuns.Limite", { n: LIMITE_VESTIMENTAS }));
      return false;
    }
    if (!foundry.utils.hasProperty(mudancas, `flags.${F}.vestidoEm`)) foundry.utils.setProperty(mudancas, `flags.${F}.vestidoEm`, Date.now());
  });
  // Item que chega vestido (arrastado de outra ficha) com o limite cheio: entra tirado
  Hooks.on("preCreateItem", item => {
    const actor = item.parent;
    if (!actor || !ehVestimenta(item) || !estaVestido(item)) return;
    if (vestidasParaVestir([...actor.items], item) < LIMITE_VESTIMENTAS) return;
    item.updateSource({ [campoVestido(item)]: false });
    ui.notifications.warn(fmt("ICARUS.ItensComuns.EntrouTirado", { item: item.name, n: LIMITE_VESTIMENTAS }));
  });
  // Card de rolagem: "Quebrar gazuas"
  Hooks.on("renderChatMessage", (mensagem, html) => {
    const raiz = html[0] ?? html;
    raiz.querySelector?.("[data-action='quebrar-gazuas']")?.addEventListener("click", ev => {
      ev.preventDefault();
      const actor = ChatMessage.getSpeakerActor(mensagem.speaker);
      if (!actor?.isOwner) return ui.notifications.warn(loc("ICARUS.ItensComuns.SoDono"));
      return quebrarGazuas(actor);
    });
  });
}
