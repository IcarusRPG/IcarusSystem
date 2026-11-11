/** Místico: PV/PM, Conjuração Mística e Ecos dos Ancestrais, Dobra Elemental e Rajada, Familiares, Meditação e Ascensão. */
import { test } from "node:test";
import assert from "node:assert/strict";

const ganchos = {};
let respostaDialogo = null;
const avisos = [];
globalThis.foundry = {
  utils: {
    deepClone: o => structuredClone(o), getProperty: (o, p) => (p in o ? o[p] : p.split(".").reduce((a, k) => a?.[k], o)),
    setProperty: (o, p, v) => { const k = p.split("."); k.slice(0, -1).reduce((a, x) => (a[x] ??= {}), o)[k.at(-1)] = v; }, hasProperty: () => false
  },
  applications: { api: {
    DialogV2: { confirm: async () => true, wait: async cfg => (typeof respostaDialogo === "function" ? respostaDialogo(cfg) : respostaDialogo) },
    ApplicationV2: class {}, HandlebarsApplicationMixin: c => c
  } }
};
globalThis.Handlebars = { escapeExpression: t => String(t ?? "") };
globalThis.Hooks = { on: (n, f) => { (ganchos[n] ??= []).push(f); }, once: (n, f) => { if (n === "init") f(); } };
globalThis.ui = { notifications: { warn: m => avisos.push(m), info: m => avisos.push(m), error() {} } };
globalThis.CONFIG = { statusEffects: [], sounds: {} };
const chat = [];
globalThis.ChatMessage = { create: async d => { chat.push(d); return d; }, getSpeaker: () => ({}), applyRollMode() {} };
globalThis.Roll = class { constructor(f) { this.formula = f; } async evaluate() { this.total = 5; return this; } };
globalThis.TextEditor = { enrichHTML: async t => t };
globalThis.renderTemplate = async () => "";
const criados = [];
globalThis.Actor = { create: async d => {
  const a = { ...d, items: (d.items ?? []).map((i, k) => ({ ...i, id: `w${k}` })), getFlag: (_s, k) => d.flags?.["icarus-rpg"]?.[k], getActiveTokens: () => [],
    async update(m) { this.atualizado = { ...(this.atualizado ?? {}), ...m }; }, async updateEmbeddedDocuments(_t, l) { this.armas = l; } };
  criados.push(a);
  return a;
} };
globalThis.game = { user: { id: "u1", isGM: false, targets: new Set() }, users: [], actors: { find: f => criados.find(f), get: () => null }, packs: { get: () => null }, combat: null,
  release: { generation: 12 }, i18n: { localize: k => k, format: k => k }, settings: { get: () => null } };
globalThis.canvas = null;

const { classePorId, pmDaLinhagem, gruposEscolhidos, validarPoder, habilidadesAteNivel, proficienciasDaClasse, iconeDaClasse, estatisticasDoVinculo, blocoDoVinculo, familiarPorId } = await import("../module/classes-dados.mjs");
const { derivarPersonagem } = await import("../module/derivar.mjs");
const { sistemaCompleto } = await import("./simulacao.mjs");
const { atributoDeMagia } = await import("../module/magias-dados.mjs");
const { documentosDeVinculos } = await import("../module/dados-compendios.mjs");
const { PERICIAS } = await import("../module/config.mjs");
const FAMILIARES = (await import("../module/dados/familiares.mjs")).default;
const M = await import("../module/mistico-dados.mjs");
await import("../module/classes/comum.mjs");
const { motivoDoMistico, magiasDoMistico, escolasDoMistico, estatisticasDoFamiliar } = await import("../module/classes/mistico.mjs");
const { ACOES_DE_MECANICA } = await import("../module/classes.mjs");
const { idDeClasse } = await import("../module/dados-compendios.mjs");

const mistico = classePorId("mistico");
const hab = (id, flags = {}) => ({ type: "poder", name: id, system: { fonte: "classe", classe: "mistico" }, flags: { "icarus-rpg": { id: `mistico__${id}`, classe: "mistico", ...flags } } });

test("Critério 14: PV nível 5 com CON +1 = 35; PM nível 5 com SAB +3 = 28 (nível 1 = 8); túnicas sem armadura", () => {
  const ficha = nivel => derivarPersonagem(sistemaCompleto({
    nivel, identidade: { classe: "mistico" }, magia: { atributo: "" }, atributos: { CON: { base: 1 }, SAB: { base: 3 } },
    classeConfig: { pvInicial: 14, pvPorNivel: 4, pvAtributo: "CON", ...pmDaLinhagem(mistico, null) }
  }), []);
  assert.deepEqual([ficha(5).pv.max, ficha(5).pm.max, ficha(1).pm.max], [35, 28, 8]);
  assert.equal(atributoDeMagia(ficha(5)), "SAB");
  assert.deepEqual(proficienciasDaClasse("mistico"), { armas: ["simples"], armaduras: [], escudo: false, tunicas: true });
  assert.deepEqual([mistico.habilidades.length, mistico.poderes.length], [9, 29]);
  assert.ok(decodeURI(iconeDaClasse("mistico")).endsWith("Místico.png"));
});

test("Critério 14: Conjuração Mística (4 escolas com a Espiritual; 3 + 1 por nível ímpar); Divinas só com Ecos dos Ancestrais", () => {
  const conj = mistico.habilidades.find(h => h.id === "conjuracao-mistica").escolha;
  assert.deepEqual([conj.tipo, conj.quantidade, conj.obrigatorias, conj.permanente], ["escolas", 4, ["Espiritual"], true]);
  assert.deepEqual([1, 2, 3, 5, 12, 20].map(M.magiasConhecidasDoMistico), [3, 3, 4, 5, 8, 12]);
  assert.deepEqual([4, 5, 9, 12, 13, 17, 20].map(M.nivelMaximoDivinoDoMistico), [0, 1, 2, 2, 3, 4, 4]);
  const ator = (nivel, extra = []) => ({ system: { nivel }, items: [hab("conjuracao-mistica", { escolas: ["Espiritual", "Evocação", "Ilusão", "Abjuração"] }), hab("escola-estendida", { escola: "Necromancia" }), ...extra] });
  const a = ator(12);
  assert.deepEqual(escolasDoMistico(a), ["Espiritual", "Evocação", "Ilusão", "Abjuração", "Necromancia"]);
  assert.equal(motivoDoMistico(a, { nivel: 3, escola: "Evocação", tradicoes: ["arcana"] }), null);
  assert.equal(motivoDoMistico(a, { nivel: 1, escola: "Transmutação", tradicoes: ["arcana"] }).chave, "ICARUS.Magias.Conhecidas.Escola");
  assert.equal(motivoDoMistico(a, { nivel: 1, escola: "Espiritual", tradicoes: ["divina"] }).chave, "ICARUS.Mistico.SemEcos");
  const b = ator(12, [hab("ecos-dos-ancestrais", { magiasExtras: 2 })]);
  assert.equal(motivoDoMistico(b, { nivel: 2, escola: "Espiritual", tradicoes: ["divina"] }), null);
  assert.equal(motivoDoMistico(b, { nivel: 3, escola: "Espiritual", tradicoes: ["divina"] }).chave, "ICARUS.Magias.Conhecidas.Nivel");
  assert.equal(motivoDoMistico(b, { nivel: 1, escola: "Transmutação", tradicoes: ["divina"] }).chave, "ICARUS.Magias.Conhecidas.Escola");
  assert.deepEqual([magiasDoMistico(b).limiteArcanas, magiasDoMistico(b).limiteDivinas], [8, 2]);
});

test("Critério 14: Dobra Elemental, Rajada nível 9 = 3d8 (Potente d10, Domínio +2); técnicas só com o elemento", () => {
  assert.equal(M.danoDaRajada(9), "3d8");
  assert.equal(M.danoDaRajada(17, { potente: true, dominio: true }), "5d10 + 2");
  assert.deepEqual([M.custoDaRajada(), M.custoDaRajada({ dupla: true, veloz: true })], [1, 4]);
  assert.deepEqual(M.elementosDosItens([hab("dobra-elemental", { elemento: "mare" }), hab("dominio-da-rocha")]), ["mare", "rocha"]);
  assert.deepEqual(M.elementosDosItens([hab("harmonia")]), ["chama", "mare", "rocha", "vento"]);
  assert.deepEqual(Object.values(M.ELEMENTOS).map(e => e.tipo), ["fogo", "frio", "impacto", "corte"]);
  const ctx = elementos => ({ nivel: 20, atributos: {}, treino: {}, tem: new Set(), grupos: gruposEscolhidos(mistico, {}), elementos });
  const visivel = (id, el) => validarPoder(mistico, mistico.poderes.find(p => p.id === id), ctx(el)).visivel;
  assert.equal(visivel("sopro-abrasador", ["chama"]), true);
  assert.equal(visivel("tremor", ["chama"]), false);
  assert.equal(visivel("dobra-combinada", ["chama"]), false);
  assert.equal(visivel("dobra-combinada", ["chama", "vento"]), true);
  assert.equal(visivel("rajada-potente", ["chama"]), true, "sem exigência de elemento");
  assert.equal(mistico.habilidades.find(h => h.id === "dobra-elemental").escolha.tipo, "elemento");
});

test("Critério 14: Meditação (Concentração CD 15, 1d6 + SAB) e Ascensão no 17º (8 PM, 1/dia; 2 com Harmonia)", () => {
  assert.equal(M.curaDaMeditacao(3), "1d6 + 3");
  const ids = n => habilidadesAteNivel(mistico, n, {}).map(h => h.id);
  assert.ok(!ids(16).includes("ascensao-espiritual"));
  assert.ok(ids(17).includes("ascensao-espiritual"));
  assert.equal(mistico.habilidades.find(h => h.id === "ascensao-espiritual").custoPM, 8);
  assert.deepEqual([M.usosDaAscensao(), M.usosDaAscensao({ harmonia: true })], [1, 2]);
  assert.equal(M.formaPorNome("Forma Ancestral"), "ancestral");
  assert.ok(!JSON.stringify(M.FORMAS_DA_ASCENSAO).includes("fatigado"));
});

test("Critério 15: pack com 4 familiares, idêntico em 2 builds, com a imagem Familiar Elemental - <Nome>.png", () => {
  const imagens = Object.fromEntries(FAMILIARES.familiares.map(f => [f.id, `Familiar Elemental - ${f.nome}.png`]));
  const docs = documentosDeVinculos({ ...FAMILIARES, imagens }, PERICIAS, "familiar");
  assert.deepEqual(docs.atores.map(a => a.name), ["Raposa de Brasa", "Lontra de Maré", "Tatu de Pedra", "Ave de Vendaval"]);
  assert.deepEqual(documentosDeVinculos({ ...FAMILIARES, imagens }, PERICIAS, "familiar"), docs, "idempotente");
  const vinculos = documentosDeVinculos({ vinculos: [{ id: "raposa-de-brasa", nome: "X", ataques: [] }] }, PERICIAS);
  assert.notEqual(vinculos.atores[0]._id, docs.atores[0]._id, "ids diferentes dos vínculos");
  const raposa = docs.atores[0];
  assert.equal(decodeURI(raposa.img), "systems/icarus-rpg/img/Icones/poderes e habilidades/Familiar Elemental - Raposa de Brasa.png");
  assert.equal(raposa.prototypeToken.texture.src, raposa.img);
  assert.equal(raposa.system.resistencias.imunidade.fogo, true);
  const jato = docs.atores[1].items.find(i => i.name === "Jato");
  assert.deepEqual([jato.system.grupo, jato.system.alcance, jato.system.tiposDano[0]], ["distancia", "curto", "frio"]);
  assert.equal(documentosDeVinculos({ ...FAMILIARES, imagens: { "raposa-de-brasa": null } }, PERICIAS, "familiar").atores[0].img, "icons/svg/pawprint.svg");
});

test("Critério 15: familiar no nível 9: PV 14, Defesa 10 + 4 + bônus (Raposa 17), CD 10 + 4 + SAB; Robusto e Evolução", () => {
  const raposa = familiarPorId("raposa-de-brasa");
  const e = estatisticasDoVinculo(raposa, { nivel: 9, atributoCd: 3 });
  assert.deepEqual([e.pv, e.defesa, e.cd, e.bonusDano], [14, 17, 17, 4]);
  assert.deepEqual(M.extrasDoFamiliar([hab("familiar-robusto"), hab("evolucao-do-familiar")]), { pv: 10, defesa: 3, passoDano: 1 });
  const dono = { system: { nivel: 13 }, items: [hab("familiar-robusto")] };
  const b = blocoDoVinculo({ vinculo: { animal: "tatu-de-pedra", familiar: true }, invocadoPor: "m" }, { get: () => dono });
  assert.deepEqual([b.familiar, b.pv, b.defesa], [true, 26, 10 + 6 + 1 + 1]);
  const m = { system: { nivel: 9, atributos: { SAB: { total: 2 } } }, items: [hab("familiar-robusto")] };
  assert.deepEqual([estatisticasDoFamiliar(m, raposa).e.pv, estatisticasDoFamiliar(m, raposa).e.defesa], [24, 18]);
});

test("Critério 15: invocar custa 1 PM e o ator surge com a imagem do familiar; Segundo Familiar dá outro invocável", async () => {
  const flags = { "icarus-rpg": {} };
  const system = { nivel: 9, identidade: { classe: "mistico" }, pm: { value: 5, max: 20 }, pv: { value: 30, max: 30 }, atributos: { SAB: { total: 3 } }, reacao: { disponivel: true } };
  const a = { name: "Místico", uuid: "Actor.m", id: "m", flags, system, effects: [], ownership: {},
    items: [hab("familiar-elemental", { familiar: "raposa-de-brasa", escolhaFeita: true }), hab("segundo-familiar", { familiar: "ave-de-vendaval", escolhaFeita: true })],
    getFlag: (_s, k) => flags["icarus-rpg"][k], async setFlag(_s, k, v) { flags["icarus-rpg"][k] = v; },
    async update(m) { for (const [k, v] of Object.entries(m)) if (k === "system.pm.value") system.pm.value = v; } };
  a.items[0].system = { ...a.items[0].system, custoPM: 1, acao: "movimento", descricao: "" };
  assert.ok(ACOES_DE_MECANICA.has("mistico:invocar:raposa-de-brasa") && ACOES_DE_MECANICA.has("mistico:invocar:ave-de-vendaval"));
  respostaDialogo = 1;
  await ACOES_DE_MECANICA.get("mistico:invocar:ave-de-vendaval")(a);
  assert.equal(system.pm.value, 4);
  const ave = criados.at(-1);
  assert.equal(decodeURI(ave.img), "systems/icarus-rpg/img/Icones/poderes e habilidades/Familiar Elemental - Ave de Vendaval.png");
  assert.deepEqual(ave.flags["icarus-rpg"].vinculo, { patrulheiro: "Actor.m", animal: "ave-de-vendaval", familiar: true });
  assert.equal(ave.atualizado["system.pv.max"], 14);
  assert.equal(ave.atualizado["flags.icarus-rpg.cd"], 17);
  await ACOES_DE_MECANICA.get("mistico:invocar:raposa-de-brasa")(a);
  assert.equal(criados.at(-1).flags["icarus-rpg"].vinculo.animal, "raposa-de-brasa", "o segundo não apaga o primeiro");
  assert.equal(criados.length, 2);
});

test("Telas: Conjuração Mística grava 4 escolas com a Espiritual; Segundo Familiar não repete o primeiro; elemento e forma", async () => {
  const { resolverEscolha } = await import("../module/escolhas.mjs");
  const ator = () => {
    const flags = { "icarus-rpg": {} };
    const a = { name: "M", flags, system: { nivel: 20, identidade: { classe: "mistico" } }, items: [],
      getFlag: (_s, k) => flags["icarus-rpg"][k], async setFlag(_s, k, v) { flags["icarus-rpg"][k] = v; } };
    return a;
  };
  const item = (a, id) => {
    const i = { name: id, type: "poder", system: { classe: "mistico" }, flags: { "icarus-rpg": { id: idDeClasse("mistico", id), classe: "mistico" } },
      async update(m) { for (const [k, v] of Object.entries(m)) if (k.startsWith("flags.icarus-rpg.")) this.flags["icarus-rpg"][k.slice(17)] = v; else if (k === "name") this.name = v; } };
    a.items.push(i);
    return i;
  };
  const a = ator();
  respostaDialogo = cfg => cfg.buttons[0].callback(null, { form: { querySelectorAll: () => ["Evocação", "Ilusão", "Abjuração"].map(value => ({ value })) } });
  const conj = item(a, "conjuracao-mistica");
  assert.equal(await resolverEscolha(a, conj), true);
  assert.deepEqual(conj.flags["icarus-rpg"].escolas, ["Espiritual", "Evocação", "Ilusão", "Abjuração"]);
  let botoes = null;
  respostaDialogo = cfg => { botoes = cfg.buttons.map(b => b.action); return cfg.buttons[0].action; };
  const fam = item(a, "familiar-elemental");
  await resolverEscolha(a, fam);
  assert.equal(fam.flags["icarus-rpg"].familiar, "raposa-de-brasa");
  await resolverEscolha(a, item(a, "segundo-familiar"));
  assert.ok(!botoes.includes("raposa-de-brasa"), "o Segundo Familiar não oferece o que já conhece");
  respostaDialogo = cfg => String(cfg.buttons.findIndex(b => b.label === "Maré"));
  const dobra = item(a, "dobra-elemental");
  await resolverEscolha(a, dobra);
  assert.equal(dobra.flags["icarus-rpg"].elemento, "mare");
  respostaDialogo = "1";
  const asc = item(a, "ascensao-espiritual");
  await resolverEscolha(a, asc);
  assert.equal(asc.flags["icarus-rpg"].forma, "divina");
});
