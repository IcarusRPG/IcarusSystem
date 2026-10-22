/**
 * Itens comuns no Foundry: "Usar" (itens com usos e o Kit de viagem), "Quebrar gazuas" e o
 * Limite de Vestimentas (vestir/tirar, bloqueio da 6ª peça com a exceção do Mestre).
 * Nada aqui automatiza o efeito do item: o card no chat traz o texto e o Mestre aplica.
 */
import { SISTEMA_ID } from "./config.mjs";
import { ehVestimenta, estaVestido, vestimentasAtivas, LIMITE_VESTIMENTAS } from "./origens-dados.mjs";

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

/* ------------------------------ Limite de Vestimentas ------------------------------ */

/** Campo que diz se a peça está vestida: "vestido" (itens comuns) ou "equipado" (armadura/túnica). */
export const campoVestido = item => (item.system.tipo === "item-comum" ? "system.vestido" : "system.equipado");

/**
 * Vestir/Tirar. Vestir a 6ª peça: bloqueia com aviso; o Mestre pode "Vestir mesmo assim"
 * (fica fora do limite: não vale nada até outra sair) e isso vai para o chat.
 */
export async function alternarVestido(actor, item) {
  if (!ehVestimenta(item)) return null;
  if (estaVestido(item)) return item.update({ [campoVestido(item)]: false });
  return vestir(actor, item);
}

async function vestir(actor, item) {
  const { vestidas } = vestimentasAtivas(actor.items.contents ?? [...actor.items]);
  if (vestidas < LIMITE_VESTIMENTAS) return item.update({ [campoVestido(item)]: true, [`flags.${F}.vestidoEm`]: Date.now() });
  const aviso = fmt("ICARUS.ItensComuns.Limite", { n: LIMITE_VESTIMENTAS });
  if (!game.user.isGM) return ui.notifications.warn(aviso);
  const r = await DialogV2.wait({
    window: { title: loc("ICARUS.ItensComuns.LimiteTitulo") },
    content: `<p>${esc(aviso)}</p><p class="dica">${esc(loc("ICARUS.ItensComuns.LimiteExcecaoDica"))}</p>`,
    buttons: [
      { action: "mesmo", label: loc("ICARUS.ItensComuns.VestirMesmoAssim"), icon: "fa-solid fa-shirt" },
      { action: "cancelar", label: loc("ICARUS.Testes.Cancelar"), default: true }
    ],
    rejectClose: false
  });
  if (r !== "mesmo") return null;
  await item.update({ [campoVestido(item)]: true, [`flags.${F}.vestidoEm`]: Date.now() }, { icarusExcecaoVestimenta: true });
  return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<p>${esc(fmt("ICARUS.ItensComuns.Excecao", { item: item.name, nome: actor.name, n: LIMITE_VESTIMENTAS }))}</p>` });
}

/**
 * Trava central: qualquer caminho que tente vestir a 6ª peça (ficha do item, outra tela) é
 * bloqueado, salvo a exceção do Mestre. Registra a hora em que a peça foi vestida.
 */
export function registrarItensComuns() {
  Hooks.on("preUpdateItem", (item, mudancas, opcoes) => {
    const actor = item.parent;
    if (!actor || !ehVestimenta(item) || estaVestido(item)) return;
    const vai = foundry.utils.getProperty(mudancas, campoVestido(item)) === true;
    if (!vai) return;
    if (!foundry.utils.hasProperty(mudancas, `flags.${F}.vestidoEm`)) foundry.utils.setProperty(mudancas, `flags.${F}.vestidoEm`, Date.now());
    if (opcoes.icarusExcecaoVestimenta) return;
    const { vestidas } = vestimentasAtivas([...actor.items]);
    if (vestidas >= LIMITE_VESTIMENTAS) {
      ui.notifications.warn(fmt("ICARUS.ItensComuns.Limite", { n: LIMITE_VESTIMENTAS }));
      return false;
    }
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
