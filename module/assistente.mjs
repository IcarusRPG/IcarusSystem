/**
 * Assistente de ficha (§5.5): troca de classe com reset limpo e "Desfazer troca de classe".
 *
 * Reset de classe:
 * 1. remove os itens de origem de classe (habilidades, poderes, itens de escolha, ataque desarmado
 *    do Monge) — com eles somem os Efeitos Ativos, os Aumentos de Atributo, Perícia Refinada/
 *    Especializada, Treino Extra, terreno, arma exótica, tipo de dano (tudo derivado dos itens);
 *    tira o token do animal invocado do Vínculo;
 * 2. perícias, pela fonte de cada treino (flags treinoPor = { pericia: ["classe" | "raca" | "origem"
 *    | "profissao" | "outro"] }): sai a fonte "classe"; sobrando origem/profissão/outro, o treino
 *    salvo fica; sobrando só raça (ou nada), o treino salvo volta a 0 — o treino racial vem dos
 *    Efeitos Ativos dos poderes raciais e continua valendo. Fichas antigas sem treinoPor: o
 *    diálogo pergunta perícia por perícia ("Manter"), com as raciais já marcadas;
 * 3. limpa classeConfig, identidade.classe, flags da classe e estados (Fúria, Presa, Braços…);
 *    proficiências voltam ao que eram antes da classe;
 * 4. guarda um snapshot (itens, campos, flags, perícias e treinoPor) para "Desfazer troca de classe".
 */
import { SISTEMA_ID, PERICIAS } from "./config.mjs";

const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);
const esc = t => Handlebars.escapeExpression(t ?? "");

/** Fontes de treino válidas. "raca" vem dos Efeitos Ativos raciais; as outras ficam no valor salvo. */
export const FONTES_DE_TREINO = ["classe", "raca", "origem", "profissao", "outro"];

/** Flags que a classe e as mecânicas de classe gravam no ator. */
export const FLAGS_DE_CLASSE = [
  "classeId", "escolhasClasse", "caminho", "vinculoAnimal", "furia", "presa", "bracosAstrais",
  "furtivoUsadoNaRodada", "kiaiUsadoNaRodada", "tiroLendarioUsado", "saqueUsadoNoTurno", "folegoUsado", "agredirExtra",
  "periciasClasse", "treinoAntesClasse", "proficienciasAntesClasse", "periciaRefinada", "periciaEspecializada"
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

/** Perícias que poderes raciais treinam ou bonificam (pelos Efeitos Ativos dos itens raciais). */
export function periciasRaciais(actor) {
  const set = new Set();
  for (const i of actor.items ?? []) {
    if (i.type !== "poder" || i.system?.fonte !== "raca") continue;
    for (const e of i.effects ?? []) for (const c of e.changes ?? []) {
      const m = String(c.key).match(/^system\.pericias\.(\w+)\.(treino|outros)$/);
      if (m) set.add(m[1]);
    }
  }
  return set;
}

/**
 * Novo treino salvo de cada perícia no reset (puro, testado em tests/assistente.test.mjs).
 * @param {{ treinos: {pericia: number}, treinoPor: object|null, manter?: Set<string>, raciais?: Set<string> }} p
 *   treinos = treino SALVO hoje; treinoPor = fontes registradas (null = ficha antiga);
 *   manter = perícias marcadas no diálogo (ficha antiga); raciais = perícias de poderes raciais
 * @returns {{ treinos: {pericia: number}, treinoPor: object }}
 */
export function planoDePericias({ treinos, treinoPor, manter = new Set(), raciais = new Set() }) {
  const novos = {};
  const fontes = {};
  for (const [k, valor] of Object.entries(treinos)) {
    if (!valor) {
      // Treino salvo 0: só tira a fonte "classe" (raça continua pelos efeitos)
      const resto = (treinoPor?.[k] ?? []).filter(f => f !== "classe");
      if (resto.length) fontes[k] = resto;
      continue;
    }
    if (!treinoPor) {
      // Ficha antiga: vale o que o jogador/Mestre marcou em "Manter"
      if (manter.has(k)) fontes[k] = [raciais.has(k) ? "raca" : "outro"];
      else novos[k] = 0;
      continue;
    }
    const lista = treinoPor[k];
    if (!lista) { fontes[k] = ["outro"]; continue; }      // treino sem fonte de classe: não é da classe
    const resto = lista.filter(f => f !== "classe");
    if (resto.some(f => f !== "raca")) fontes[k] = resto; // origem/profissão/outro: o treino salvo fica
    else {
      novos[k] = 0;                                        // só classe (ou classe + raça): salvo volta a 0
      if (resto.length) fontes[k] = resto;                 // raça segue treinando pelos Efeitos Ativos
    }
  }
  return { treinos: novos, treinoPor: fontes };
}

/**
 * Confirmação listando o que sai. Ficha antiga (sem treinoPor): lista as perícias treinadas com
 * "Manter" (raciais já marcadas). @returns {Promise<{ manter: Set<string> }|null>}
 */
export async function confirmarReset(actor, novaClasse) {
  const itens = itensDeOrigemDeClasse(actor);
  const lista = itens.length ? `<ul class="lista-reset">${itens.map(i => `<li>${esc(i.name)}</li>`).join("")}</ul>` : `<p>${esc(loc("ICARUS.Assistente.NadaARemover"))}</p>`;
  const animal = atorDoAnimal(actor)?.getActiveTokens().length ? `<p>${esc(loc("ICARUS.Assistente.AnimalSai"))}</p>` : "";
  const antiga = !actor.getFlag(SISTEMA_ID, "treinoPor");
  const raciais = periciasRaciais(actor);
  const treinadas = PERICIAS.filter(p => (actor._source.system.pericias[p.chave]?.treino ?? 0) >= 1);
  const manter = antiga && treinadas.length ? `<fieldset class="manter-pericias"><legend>${esc(loc("ICARUS.Assistente.ManterTitulo"))}</legend>
    <p class="dica">${esc(loc("ICARUS.Assistente.ManterDica"))}</p>
    ${treinadas.map(p => `<label class="chk"><input type="checkbox" name="manter" value="${p.chave}"${raciais.has(p.chave) ? " checked" : ""}> ${esc(loc(`ICARUS.Pericias.${p.chave}`))}${raciais.has(p.chave) ? ` <small>(${esc(loc("ICARUS.Assistente.Racial"))})</small>` : ""}</label>`).join("")}</fieldset>` : "";
  const r = await foundry.applications.api.DialogV2.wait({
    window: { title: loc("ICARUS.Assistente.TrocarTitulo") },
    content: `<div class="icarus-uso"><p>${esc(fmt("ICARUS.Assistente.TrocarTexto", { nova: novaClasse }))}</p>${lista}${animal}${manter}
      <p class="dica">${esc(loc("ICARUS.Assistente.TrocarDica"))}</p></div>`,
    buttons: [
      { action: "ok", label: loc("ICARUS.Assistente.TrocarConfirmar"), default: true,
        callback: (ev, b) => ({ manter: new Set([...b.form.querySelectorAll("input[name=manter]:checked")].map(i => i.value)) }) },
      { action: "cancelar", label: loc("ICARUS.Testes.Cancelar") }
    ],
    rejectClose: false
  });
  return r && typeof r === "object" ? r : null;
}

/**
 * Reset de classe (quem chama confirma antes). Guarda o snapshot.
 * @param {{ manter?: Set<string> }} [opcoes]  perícias a manter (ficha antiga)
 */
export async function resetarClasse(actor, { manter = new Set() } = {}) {
  const src = actor._source.system;
  const flags = actor.flags?.[SISTEMA_ID] ?? {};
  const itens = itensDeOrigemDeClasse(actor);
  const treinos = Object.fromEntries(PERICIAS.map(p => [p.chave, src.pericias[p.chave]?.treino ?? 0]));
  const snapshot = {
    data: Date.now(),
    classe: src.identidade.classe,
    itens: itens.map(i => i.toObject()),
    flags: Object.fromEntries(FLAGS_DE_CLASSE.filter(k => k in flags).map(k => [k, foundry.utils.deepClone(flags[k])])),
    treinoPor: foundry.utils.deepClone(flags.treinoPor ?? null),
    system: {
      classeConfig: foundry.utils.deepClone(src.classeConfig),
      proficiencias: foundry.utils.deepClone(src.proficiencias),
      treinos
    }
  };
  const plano = planoDePericias({ treinos, treinoPor: flags.treinoPor ?? null, manter, raciais: periciasRaciais(actor) });
  if (itens.length) await actor.deleteEmbeddedDocuments("Item", itens.map(i => i.id));
  for (const t of atorDoAnimal(actor)?.getActiveTokens() ?? []) await t.document.delete();
  for (const s of STATUS_DE_CLASSE) if (actor.statuses?.has(s)) await actor.toggleStatusEffect(s, { active: false });
  const mudancas = {
    "system.identidade.classe": "",
    "system.classeConfig.pvInicial": 0, "system.classeConfig.pvPorNivel": 0,
    "system.classeConfig.pmInicial": 0, "system.classeConfig.pmPorNivel": 0,
    "system.classeConfig.pvAtributo": "CON", "system.classeConfig.pmAtributo": null,
    "system.classeConfig.pmAtributoSoNoPrimeiroNivel": false,
    [`flags.${SISTEMA_ID}.snapshotTrocaClasse`]: snapshot,
    // A ficha passa a ter o rastreio (mesmo se era antiga)
    [`flags.${SISTEMA_ID}.-=treinoPor`]: null
  };
  for (const [k, v] of Object.entries(plano.treinos)) mudancas[`system.pericias.${k}.treino`] = v;
  if (flags.proficienciasAntesClasse) mudancas["system.proficiencias"] = flags.proficienciasAntesClasse;
  for (const k of FLAGS_DE_CLASSE) if (k in flags) mudancas[`flags.${SISTEMA_ID}.-=${k}`] = null;
  await actor.update(mudancas);
  await actor.update({ [`flags.${SISTEMA_ID}.treinoPor`]: plano.treinoPor });
  return snapshot;
}

/** Desfaz a última troca de classe (volta itens, campos, flags, perícias e treinoPor do snapshot). */
export async function desfazerTrocaDeClasse(actor) {
  const snap = actor.getFlag(SISTEMA_ID, "snapshotTrocaClasse");
  if (!snap) return ui.notifications.warn(loc("ICARUS.Assistente.SemSnapshot"));
  const ok = await foundry.applications.api.DialogV2.confirm({
    window: { title: loc("ICARUS.Assistente.Desfazer") },
    content: `<p>${esc(fmt("ICARUS.Assistente.DesfazerTexto", { n: snap.itens.length }))}</p>`,
    rejectClose: false
  });
  if (!ok) return;
  // Sai o que a classe nova trouxe; voltam os itens, os campos e as perícias da anterior
  const atuais = itensDeOrigemDeClasse(actor);
  if (atuais.length) await actor.deleteEmbeddedDocuments("Item", atuais.map(i => i.id));
  const flagsAtuais = actor.flags?.[SISTEMA_ID] ?? {};
  const mudancas = {
    "system.identidade.classe": snap.classe ?? "",
    "system.classeConfig": snap.system.classeConfig,
    "system.proficiencias": snap.system.proficiencias,
    [`flags.${SISTEMA_ID}.-=snapshotTrocaClasse`]: null,
    [`flags.${SISTEMA_ID}.-=treinoPor`]: null
  };
  for (const [k, v] of Object.entries(snap.system.treinos ?? {})) mudancas[`system.pericias.${k}.treino`] = v;
  for (const k of FLAGS_DE_CLASSE) if (k in flagsAtuais) mudancas[`flags.${SISTEMA_ID}.-=${k}`] = null;
  await actor.update(mudancas);
  const voltar = Object.fromEntries(Object.entries(snap.flags ?? {}).map(([k, v]) => [`flags.${SISTEMA_ID}.${k}`, v]));
  if (snap.treinoPor) voltar[`flags.${SISTEMA_ID}.treinoPor`] = snap.treinoPor;
  if (Object.keys(voltar).length) await actor.update(voltar);
  if (snap.itens.length) await actor.createEmbeddedDocuments("Item", snap.itens, { keepId: true });
  ui.notifications.info(loc("ICARUS.Assistente.Desfeito"));
}

/**
 * Registra fontes de treino (para o reset): treinoPor[pericia] ganha a fonte. A fonte "classe"
 * também guarda o treino salvo de antes (treinoAntesClasse), usado só como referência.
 * @returns {object} mudanças para actor.update
 */
export function marcarTreino(actor, pericias, fonte = "classe") {
  const flags = actor.flags?.[SISTEMA_ID] ?? {};
  const treinoPor = foundry.utils.deepClone(flags.treinoPor ?? {});
  for (const k of pericias) treinoPor[k] = [...new Set([...(treinoPor[k] ?? []), fonte])];
  return { [`flags.${SISTEMA_ID}.treinoPor`]: treinoPor };
}

/** Compatibilidade: treino dado pela classe (diálogo de perícias da classe). */
export const marcarTreinoDaClasse = (actor, pericias) => marcarTreino(actor, pericias, "classe");

/**
 * Raça: troca a fonte "raca" de todas as perícias pelas que os poderes raciais treinam agora.
 * @param {string[]} pericias  perícias treinadas pela raça
 */
export function marcarTreinoDaRaca(actor, pericias) {
  const treinoPor = foundry.utils.deepClone(actor.flags?.[SISTEMA_ID]?.treinoPor ?? {});
  for (const k of Object.keys(treinoPor)) {
    treinoPor[k] = treinoPor[k].filter(f => f !== "raca");
    if (!treinoPor[k].length) delete treinoPor[k];
  }
  for (const k of pericias) treinoPor[k] = [...new Set([...(treinoPor[k] ?? []), "raca"])];
  return { [`flags.${SISTEMA_ID}.treinoPor`]: treinoPor };
}
