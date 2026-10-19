/**
 * Patrulheiro:
 * - Marca da Presa (ação de movimento, 1 PM): marca o alvo (T) como presa (flags presa = uuid do
 *   token), status "Presa" no token (quando houver permissão). No diálogo de ataque do Patrulheiro,
 *   "Contra a presa (Nd4)" (1d4 +1d4 a cada 4 níveis), pré-marcado contra a presa. Só nos ataques
 *   do Patrulheiro (o animal não recebe).
 * - Vínculo Selvagem (3º): escolha permanente do animal (comum.mjs) e "Invocar" (ação de
 *   movimento, 1 PM): cria/atualiza o ator do animal (compêndio Vínculos) com PV = 10 + metade do
 *   nível, Defesa = 10 + DES do patrulheiro + bônus, ataque e resistências iguais aos do
 *   patrulheiro e dano + metade do nível; o token surge ao lado. O animal não pode ser curado; a
 *   0 PV o token some e ele pode ser invocado de novo com todos os PV.
 */
import { SISTEMA_ID } from "../config.mjs";
import { dadosPorNivel, estatisticasDoVinculo } from "../classes-dados.mjs";
import { calcularAtaque } from "../combate.mjs";
import { PROVEDORES_ATAQUE, MODIFICADORES_ATAQUE, alvosMarcados, itensDoAtor } from "../combate-chat.mjs";
import { GANCHOS_DE_PODER, usarPoder } from "../acoes.mjs";
import { ACOES_DE_MECANICA } from "../classes.mjs";
import { tokenDoAtor } from "../regras-ataque.mjs";
import { registrarLinhas, itemDeClasse, marcarStatus, avisarNoChat, escolhasDoAtor, DEPOIS_DA_ESCOLHA, USO_PROPRIO } from "./comum.mjs";
import VINCULOS from "../dados/vinculos.mjs";

const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);

/* ---------------- Marca da Presa ---------------- */

const presaDe = actor => actor.getFlag(SISTEMA_ID, "presa");

USO_PROPRIO.add("patrulheiro__marca-da-presa");
GANCHOS_DE_PODER.set("patrulheiro__marca-da-presa", {
  antes: () => {
    if (Array.from(game.user.targets ?? []).length !== 1) { ui.notifications.warn(loc("ICARUS.Patrulheiro.UmAlvo")); return false; }
    return true;
  },
  depois: async actor => {
    const alvo = Array.from(game.user.targets)[0];
    const anterior = presaDe(actor) ? fromUuidSync(presaDe(actor)) : null;
    if (anterior?.actor && anterior.actor !== alvo.actor) await marcarStatus(anterior.actor, "presa", false);
    await actor.setFlag(SISTEMA_ID, "presa", alvo.document.uuid);
    await marcarStatus(alvo.actor, "presa", true);
    await avisarNoChat(actor, fmt("ICARUS.Patrulheiro.Marcou", { nome: actor.name, presa: alvo.name, n: dadosPorNivel(actor.system.nivel) }));
  }
});

ACOES_DE_MECANICA.set("patrulheiro:marca", actor => {
  const item = itemDeClasse(actor, "patrulheiro", "marca-da-presa");
  return item ? usarPoder(actor, item) : null;
});

PROVEDORES_ATAQUE.push(actor => {
  if (!itemDeClasse(actor, "patrulheiro", "marca-da-presa") || actor.getFlag(SISTEMA_ID, "vinculo")?.animal) return null;
  const presa = presaDe(actor);
  const alvo = alvosMarcados()[0];
  const contra = !!presa && !!alvo && (alvo.id === presa || alvo.token?.actor?.uuid === fromUuidSync(presa)?.actor?.uuid);
  const n = dadosPorNivel(actor.system.nivel);
  return {
    id: "presa", titulo: loc("ICARUS.Patrulheiro.MarcaDaPresa"),
    campos: [{ tipo: "checkbox", nome: "contraPresa", valor: contra, rotulo: fmt("ICARUS.Patrulheiro.ContraPresa", { n }),
      dica: presa ? fmt("ICARUS.Patrulheiro.PresaAtual", { presa: fromUuidSync(presa)?.name ?? "?" }) : loc("ICARUS.Patrulheiro.SemPresa") }]
  };
});
MODIFICADORES_ATAQUE.push(({ actor, opcoes }) => {
  if (!opcoes.contraPresa || !itemDeClasse(actor, "patrulheiro", "marca-da-presa")) return null;
  const n = dadosPorNivel(actor.system.nivel);
  return { extrasDano: [{ rotulo: loc("ICARUS.Patrulheiro.MarcaDaPresa"), formula: `${n}d4` }], linhas: [fmt("ICARUS.Patrulheiro.LinhaPresa", { n })] };
});

/* ---------------- Vínculo Selvagem ---------------- */

/** Animal escolhido (vinculos.json) ou null. */
function animalDoAtor(actor) {
  const hab = itemDeClasse(actor, "patrulheiro", "vinculo-selvagem");
  const i = escolhasDoAtor(actor)["vinculo-selvagem"];
  if (!hab || !Number.isInteger(i)) return null;
  return VINCULOS.animais[i] ?? null;
}

DEPOIS_DA_ESCOLHA.set("vinculo-selvagem", (actor, i) => actor.setFlag(SISTEMA_ID, "vinculoAnimal", VINCULOS.animais[i]?.id ?? null));

/** Ator do animal deste patrulheiro no mundo (ou null). */
const atorDoAnimal = actor => game.actors.find(a => a.getFlag(SISTEMA_ID, "vinculo")?.patrulheiro === actor.uuid) ?? null;

/** Cria/atualiza o ator do animal com os valores do patrulheiro e põe o token ao lado. */
export async function invocarAnimal(actor) {
  const animal = animalDoAtor(actor);
  if (!animal) return ui.notifications.warn(loc("ICARUS.Patrulheiro.SemAnimal"));
  const s = actor.system;
  const atqPatrulheiro = calcularAtaque(s, { categoria: "simples", propriedades: [], proficiencia: "sim" }, "corpo-a-corpo", itensDoAtor(actor)).bonus;
  const e = estatisticasDoVinculo(animal, {
    nivel: s.nivel, DES: s.atributos.DES.total, ataque: atqPatrulheiro,
    fortitude: s.pericias.fortitude.total, reflexos: s.pericias.reflexos.total, vontade: s.pericias.vontade.total
  });
  let animalAtor = atorDoAnimal(actor);
  if (!animalAtor) {
    const pack = game.packs.get(`${SISTEMA_ID}.vinculos`);
    const indice = await pack?.getIndex({ fields: [`flags.${SISTEMA_ID}.id`] });
    const entrada = indice?.find(x => foundry.utils.getProperty(x, `flags.${SISTEMA_ID}.id`) === animal.id);
    const base = entrada ? (await pack.getDocument(entrada._id)).toObject() : { name: animal.nome, type: "personagem", img: "icons/svg/pawprint.svg", items: [] };
    delete base._id;
    base.name = fmt("ICARUS.Patrulheiro.NomeAnimal", { animal: animal.nome, nome: actor.name });
    base.ownership = foundry.utils.deepClone(actor.ownership);
    foundry.utils.setProperty(base, `flags.${SISTEMA_ID}.vinculo`, { patrulheiro: actor.uuid, animal: animal.id });
    animalAtor = await Actor.create(base, { renderSheet: false });
  }
  // Valores do patrulheiro (ataque, resistências, Defesa, PV cheios)
  const mudancas = {
    "system.nivel": s.nivel,
    "system.classeConfig.manual": true,
    "system.pv.max": e.pv,
    "system.pv.value": e.pv,
    "system.defesa.outros": e.defesaOutros,
    "system.deslocamento": e.deslocamento,
    "system.resistencias.rdGeral": e.rd,
    "system.pericias.fortitude.outros": e.resistencias.fortitude,
    "system.pericias.reflexos.outros": e.resistencias.reflexos,
    "system.pericias.vontade.outros": e.resistencias.vontade
  };
  await animalAtor.update(mudancas, { icarusInvocacao: true });
  const armas = animalAtor.items.filter(i => i.type === "arma");
  await animalAtor.updateEmbeddedDocuments("Item", armas.map((arma, j) => ({
    _id: arma.id, "system.bonusAtaque": e.ataques[j]?.bonusAtaque ?? e.ataques[0].bonusAtaque, "system.bonusDano": e.ataques[j]?.bonusDano ?? 0
  })));
  // Token ao lado do patrulheiro (se houver cena e token)
  const meu = tokenDoAtor(actor);
  if (meu && canvas?.scene && !animalAtor.getActiveTokens().length) {
    const g = canvas.grid.size;
    const dados = await animalAtor.getTokenDocument({ x: meu.document.x + g * meu.document.width, y: meu.document.y, actorLink: true });
    await canvas.scene.createEmbeddedDocuments("Token", [dados.toObject()]);
  }
  await avisarNoChat(actor, fmt("ICARUS.Patrulheiro.Invocou", { nome: actor.name, animal: animal.nome, pv: e.pv }));
  return animalAtor;
}

USO_PROPRIO.add("patrulheiro__vinculo-selvagem");
GANCHOS_DE_PODER.set("patrulheiro__vinculo-selvagem", {
  antes: actor => { if (!animalDoAtor(actor)) { ui.notifications.warn(loc("ICARUS.Patrulheiro.SemAnimal")); return false; } return true; },
  depois: actor => invocarAnimal(actor)
});
ACOES_DE_MECANICA.set("patrulheiro:invocar", actor => {
  const item = itemDeClasse(actor, "patrulheiro", "vinculo-selvagem");
  return item ? usarPoder(actor, item) : null;
});

/** Dispensar o animal (ação livre): o token some. */
ACOES_DE_MECANICA.set("patrulheiro:dispensar", async actor => {
  const animal = atorDoAnimal(actor);
  for (const t of animal?.getActiveTokens() ?? []) await t.document.delete();
});

// O animal não pode ser curado (só a invocação devolve os PV); a 0 PV ele desaparece
Hooks.on("preUpdateActor", (ator, mudancas, opcoes) => {
  if (!ator.getFlag(SISTEMA_ID, "vinculo") || opcoes.icarusInvocacao) return;
  const novo = foundry.utils.getProperty(mudancas, "system.pv.value");
  if (novo !== undefined && novo > ator.system.pv.value) {
    ui.notifications.warn(fmt("ICARUS.Patrulheiro.NaoCura", { animal: ator.name }));
    return false;
  }
});
Hooks.on("updateActor", async (ator, mudancas, opcoes, userId) => {
  if (userId !== game.user.id || !ator.getFlag(SISTEMA_ID, "vinculo")) return;
  if (foundry.utils.getProperty(mudancas, "system.pv.value") === 0) {
    for (const t of ator.getActiveTokens()) await t.document.delete();
    ui.notifications.info(fmt("ICARUS.Patrulheiro.Sumiu", { animal: ator.name }));
  }
});

registrarLinhas("patrulheiro", actor => {
  const linhas = [];
  if (itemDeClasse(actor, "patrulheiro", "marca-da-presa")) {
    const presa = presaDe(actor) ? fromUuidSync(presaDe(actor)) : null;
    linhas.push({ id: "patrulheiro:marca", botao: true, rotulo: loc("ICARUS.Patrulheiro.Marcar"),
      info: presa ? fmt("ICARUS.Patrulheiro.PresaAtual", { presa: presa.name }) : fmt("ICARUS.Patrulheiro.MarcaInfo", { n: dadosPorNivel(actor.system.nivel) }) });
  }
  const animal = animalDoAtor(actor);
  if (animal) {
    const invocado = atorDoAnimal(actor)?.getActiveTokens().length > 0;
    linhas.push({ id: "patrulheiro:invocar", botao: true, rotulo: fmt("ICARUS.Patrulheiro.Invocar", { animal: animal.nome }),
      info: fmt("ICARUS.Patrulheiro.InvocarInfo", { pv: 10 + Math.floor(actor.system.nivel / 2) }) });
    if (invocado) linhas.push({ id: "patrulheiro:dispensar", botao: true, rotulo: loc("ICARUS.Patrulheiro.Dispensar") });
  }
  return linhas;
});
