/**
 * Objetos no Foundry: item de ator destruído (0 PV) sai de "em mãos"/"equipado" e avisa no chat.
 * O foco arcano destruído avisa que o Mago só volta a lançar ao empunhar outro.
 * Regras puras: module/objetos-dados.mjs.
 */
import { SISTEMA_ID } from "./config.mjs";
import { ehFoco } from "./objetos-dados.mjs";

const F = SISTEMA_ID;
const fmt = (k, d) => game.i18n.format(k, d);
const esc = t => Handlebars.escapeExpression(t ?? "");

/** Aviso no chat de item destruído (foco: aviso do Mago). */
export function avisarDestruido(item) {
  const actor = item.parent;
  const texto = ehFoco(item) && actor
    ? fmt("ICARUS.Arcanista.FocoDestruido", { item: item.name, nome: actor.name })
    : fmt("ICARUS.Objetos.Destruido", { item: item.name, nome: actor?.name ?? "" });
  return ChatMessage.create({
    speaker: actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker(),
    content: `<div class="icarus-rolagem icarus-lembrete"><p class="condicao-descricao">${esc(texto)}</p></div>`
  });
}

export function registrarObjetos() {
  // Destruído por edição (o Mestre zerou os PV ou marcou): tira de "em mãos" e avisa (só quem mudou)
  Hooks.on("preUpdateItem", (item, mudancas) => {
    const pv = foundry.utils.getProperty(mudancas, `flags.${F}.pvObjeto`);
    if (Number.isFinite(pv) && pv <= 0 && !item.flags?.[F]?.destruido) foundry.utils.setProperty(mudancas, `flags.${F}.destruido`, true);
    if (foundry.utils.getProperty(mudancas, `flags.${F}.destruido`) === true) {
      if (item.type === "arma") foundry.utils.setProperty(mudancas, "system.empunhada", false);
      else if (item.type === "equipamento") foundry.utils.setProperty(mudancas, "system.equipado", false);
    }
  });
  Hooks.on("updateItem", (item, mudancas, opcoes, userId) => {
    if (userId !== game.user.id) return;
    if (foundry.utils.getProperty(mudancas, `flags.${F}.destruido`) === true) avisarDestruido(item);
  });
}
