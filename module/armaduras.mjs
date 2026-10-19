/**
 * Armaduras e escudos no Foundry:
 * - só uma armadura e um escudo equipados por vez: equipar um segundo do mesmo tipo desequipa o
 *   anterior, com aviso;
 * - Escudo Acoplado: avisa (não bloqueia) quando há arma de duas mãos empunhada. As restrições
 *   completas ficam para o módulo de combate.
 * Proficiência em armadura por classe ainda não existe no sistema (fora de escopo).
 */
import { TIPOS_EQUIPAVEIS } from "./config.mjs";
import { temProficienciaArmadura } from "./combate.mjs";

const loc = k => game.i18n.localize(k);

/** Equipou o item agora? (criado equipado ou atualizado para equipado) */
function acabouDeEquipar(item, mudancas) {
  if (item.type !== "equipamento" || !TIPOS_EQUIPAVEIS.includes(item.system.tipo)) return false;
  return mudancas ? foundry.utils.getProperty(mudancas, "system.equipado") === true : item.system.equipado === true;
}

/** Arma de duas mãos empunhada junto com um escudo acoplado equipado? */
export function conflitoEscudoAcoplado(actor) {
  const acoplado = actor.items.some(i => i.type === "equipamento" && i.system.equipado && i.system.acoplado);
  const duasMaos = actor.items.some(i => i.type === "arma" && i.system.empunhada && i.system.empunhadura === "duas-maos");
  return acoplado && duasMaos;
}

async function aoEquipar(item) {
  const actor = item.parent;
  if (!actor) return;
  const outros = actor.items.filter(i => i.id !== item.id && i.type === "equipamento" && i.system.equipado && i.system.tipo === item.system.tipo);
  if (outros.length) {
    await actor.updateEmbeddedDocuments("Item", outros.map(i => ({ _id: i.id, "system.equipado": false })));
    ui.notifications.info(game.i18n.format("ICARUS.Armaduras.Desequipou", { novo: item.name, antigo: outros.map(i => i.name).join(", ") }));
  }
  if (conflitoEscudoAcoplado(actor)) ui.notifications.warn(loc("ICARUS.Armaduras.AvisoAcoplado"));
  // Sem proficiência: a penalidade vale também nos ataques (túnica tem proficiência própria)
  if (item.system.categoria && !temProficienciaArmadura(actor.system.proficiencias, item.system.categoria)) {
    ui.notifications.warn(game.i18n.format("ICARUS.Proficiencias.AvisoEquipar", { item: item.name }));
  }
}

export function registrarArmaduras() {
  // Só quem fez a mudança reage, para não repetir em todos os clientes
  Hooks.on("updateItem", (item, mudancas, opcoes, userId) => {
    if (userId !== game.user.id) return;
    if (acabouDeEquipar(item, mudancas)) aoEquipar(item);
    // Empunhar arma de duas mãos com escudo acoplado equipado
    if (item.type === "arma" && foundry.utils.getProperty(mudancas, "system.empunhada") === true && item.parent && conflitoEscudoAcoplado(item.parent)) {
      ui.notifications.warn(loc("ICARUS.Armaduras.AvisoAcoplado"));
    }
  });
  Hooks.on("createItem", (item, opcoes, userId) => {
    if (userId === game.user.id && acabouDeEquipar(item)) aoEquipar(item);
  });
}

