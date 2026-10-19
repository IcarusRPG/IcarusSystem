/**
 * Assistente de ficha (§5.5): troca de classe com reset limpo e "Desfazer troca de classe".
 *
 * Reset de classe:
 * 1. remove os itens de origem de classe (habilidades, poderes, itens de escolha, ataque desarmado
 *    do Monge) — com eles somem os Efeitos Ativos, os Aumentos de Atributo, Perícia Refinada/
 *    Especializada, Treino Extra, terreno, arma exótica, tipo de dano (tudo derivado dos itens);
 *    tira o token do animal invocado do Vínculo;
 * 2. perícias: desfaz só o treino gravado pela classe (flags treinoPor/treinoAntesClasse); o treino
 *    de raça vem de Efeitos Ativos dos poderes raciais e não é tocado;
 * 3. limpa classeConfig, identidade.classe, flags da classe e estados (Fúria, Presa, Braços…);
 *    proficiências voltam ao que eram antes da classe;
 * 4. guarda um snapshot (itens + campos + flags) para "Desfazer troca de classe".
 */
import { SISTEMA_ID } from "./config.mjs";

const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);
const esc = t => Handlebars.escapeExpression(t ?? "");

/** Flags que a classe e as mecânicas de classe gravam no ator. */
export const FLAGS_DE_CLASSE = [
  "classeId", "escolhasClasse", "caminho", "vinculoAnimal", "furia", "presa", "bracosAstrais",
  "furtivoUsadoNaRodada", "kiaiUsadoNaRodada", "tiroLendarioUsado", "saqueUsadoNoTurno", "folegoUsado", "agredirExtra",
  "periciasClasse", "treinoPor", "treinoAntesClasse", "proficienciasAntesClasse"
];
const STATUS_DE_CLASSE = ["furia", "bracos-astrais"];

/** Itens de origem de classe (e o que eles criaram). */
export function itensDeOrigemDeClasse(actor) {
  return actor.items.filter(i => {
    const f = i.flags?.[SISTEMA_ID] ?? {};
    if (i.type === "poder") return i.system.fonte === "classe" || !!i.system.classe || !!f.classe;
    return !!f.desarmadoMonge;
  });
}

/** Ator do animal do Vínculo deste personagem. */
const atorDoAnimal = actor => game.actors?.find(a => a.getFlag(SISTEMA_ID, "vinculo")?.patrulheiro === actor.uuid) ?? null;

/** Confirmação listando o que sai. */
export async function confirmarReset(actor, novaClasse) {
  const itens = itensDeOrigemDeClasse(actor);
  const lista = itens.length ? `<ul class="lista-reset">${itens.map(i => `<li>${esc(i.name)}</li>`).join("")}</ul>` : `<p>${esc(loc("ICARUS.Assistente.NadaARemover"))}</p>`;
  const animal = atorDoAnimal(actor)?.getActiveTokens().length ? `<p>${esc(loc("ICARUS.Assistente.AnimalSai"))}</p>` : "";
  return foundry.applications.api.DialogV2.confirm({
    window: { title: loc("ICARUS.Assistente.TrocarTitulo") },
    content: `<div class="icarus-uso"><p>${esc(fmt("ICARUS.Assistente.TrocarTexto", { nova: novaClasse }))}</p>${lista}${animal}
      <p class="dica">${esc(loc("ICARUS.Assistente.TrocarDica"))}</p></div>`,
    rejectClose: false
  });
}

/**
 * Reset de classe (sem perguntar: quem chama confirma antes). Guarda o snapshot.
 * @returns {Promise<object>} o snapshot
 */
export async function resetarClasse(actor) {
  const src = actor._source.system;
  const flags = actor.flags?.[SISTEMA_ID] ?? {};
  const itens = itensDeOrigemDeClasse(actor);
  const treinoAntes = flags.treinoAntesClasse ?? {};
  const snapshot = {
    data: Date.now(),
    classe: src.identidade.classe,
    itens: itens.map(i => i.toObject()),
    flags: Object.fromEntries(FLAGS_DE_CLASSE.filter(k => k in flags).map(k => [k, foundry.utils.deepClone(flags[k])])),
    system: {
      classeConfig: foundry.utils.deepClone(src.classeConfig),
      proficiencias: foundry.utils.deepClone(src.proficiencias),
      treinos: Object.fromEntries(Object.keys(treinoAntes).map(k => [k, src.pericias[k]?.treino ?? 0]))
    }
  };
  if (itens.length) await actor.deleteEmbeddedDocuments("Item", itens.map(i => i.id));
  for (const t of atorDoAnimal(actor)?.getActiveTokens() ?? []) await t.document.delete();
  for (const s of STATUS_DE_CLASSE) if (actor.statuses?.has(s)) await actor.toggleStatusEffect(s, { active: false });
  const mudancas = {
    "system.identidade.classe": "",
    "system.classeConfig.pvInicial": 0, "system.classeConfig.pvPorNivel": 0,
    "system.classeConfig.pmInicial": 0, "system.classeConfig.pmPorNivel": 0,
    "system.classeConfig.pvAtributo": "CON", "system.classeConfig.pmAtributo": null,
    "system.classeConfig.pmAtributoSoNoPrimeiroNivel": false,
    [`flags.${SISTEMA_ID}.snapshotTrocaClasse`]: snapshot
  };
  // Perícias: volta só o treino que a classe gravou (raça e outras fontes ficam)
  for (const [k, antes] of Object.entries(treinoAntes)) mudancas[`system.pericias.${k}.treino`] = antes;
  if (flags.proficienciasAntesClasse) mudancas["system.proficiencias"] = flags.proficienciasAntesClasse;
  for (const k of FLAGS_DE_CLASSE) if (k in flags) mudancas[`flags.${SISTEMA_ID}.-=${k}`] = null;
  await actor.update(mudancas);
  return snapshot;
}

/** Desfaz a última troca de classe (volta itens, campos e flags do snapshot). */
export async function desfazerTrocaDeClasse(actor) {
  const snap = actor.getFlag(SISTEMA_ID, "snapshotTrocaClasse");
  if (!snap) return ui.notifications.warn(loc("ICARUS.Assistente.SemSnapshot"));
  const ok = await foundry.applications.api.DialogV2.confirm({
    window: { title: loc("ICARUS.Assistente.Desfazer") },
    content: `<p>${esc(fmt("ICARUS.Assistente.DesfazerTexto", { n: snap.itens.length }))}</p>`,
    rejectClose: false
  });
  if (!ok) return;
  // Sai o que a classe nova trouxe; voltam os itens e os campos da anterior
  const atuais = itensDeOrigemDeClasse(actor);
  if (atuais.length) await actor.deleteEmbeddedDocuments("Item", atuais.map(i => i.id));
  const flagsAtuais = actor.flags?.[SISTEMA_ID] ?? {};
  const mudancas = {
    "system.identidade.classe": snap.classe ?? "",
    "system.classeConfig": snap.system.classeConfig,
    "system.proficiencias": snap.system.proficiencias,
    [`flags.${SISTEMA_ID}.-=snapshotTrocaClasse`]: null
  };
  // Treinos gravados pela classe nova voltam ao que eram; os da anterior, ao que o snapshot guardou
  for (const [k, antes] of Object.entries(flagsAtuais.treinoAntesClasse ?? {})) mudancas[`system.pericias.${k}.treino`] = antes;
  for (const [k, v] of Object.entries(snap.system.treinos ?? {})) mudancas[`system.pericias.${k}.treino`] = v;
  for (const k of FLAGS_DE_CLASSE) if (k in flagsAtuais) mudancas[`flags.${SISTEMA_ID}.-=${k}`] = null;
  await actor.update(mudancas);
  if (Object.keys(snap.flags ?? {}).length) await actor.update(Object.fromEntries(Object.entries(snap.flags).map(([k, v]) => [`flags.${SISTEMA_ID}.${k}`, v])));
  if (snap.itens.length) await actor.createEmbeddedDocuments("Item", snap.itens, { keepId: true });
  ui.notifications.info(loc("ICARUS.Assistente.Desfeito"));
}

/**
 * Registra o treino que a classe deu (para o reset): treinoPor[pericia] ganha "classe" e
 * treinoAntesClasse[pericia] guarda o treino salvo antes (só na primeira vez).
 */
export function marcarTreinoDaClasse(actor, pericias) {
  const flags = actor.flags?.[SISTEMA_ID] ?? {};
  const treinoPor = foundry.utils.deepClone(flags.treinoPor ?? {});
  const antes = foundry.utils.deepClone(flags.treinoAntesClasse ?? {});
  for (const k of pericias) {
    treinoPor[k] = [...new Set([...(treinoPor[k] ?? []), "classe"])];
    if (!(k in antes)) antes[k] = actor._source.system.pericias[k]?.treino ?? 0;
  }
  return { [`flags.${SISTEMA_ID}.treinoPor`]: treinoPor, [`flags.${SISTEMA_ID}.treinoAntesClasse`]: antes };
}
