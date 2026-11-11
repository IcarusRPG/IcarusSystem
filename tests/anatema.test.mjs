/** Anátema: PV/PM (Mana Coagulada), Abandonado, Preço de Sangue, Sangria, Selar, Ruptura, Palavras de Sangue e passivos. */
import { test } from "node:test";
import assert from "node:assert/strict";

const ganchos = {};
let respostaDialogo = null;
const avisos = [];
globalThis.foundry = {
  utils: { deepClone: o => structuredClone(o), getProperty: (o, p) => (p in o ? o[p] : p.split(".").reduce((a, k) => a?.[k], o)), setProperty: (o, p, v) => { o[p] = v; }, hasProperty: () => false },
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
globalThis.game = { user: { id: "u1", isGM: false, targets: new Set() }, users: [], actors: [], combat: null, release: { generation: 12 }, i18n: { localize: k => k, format: k => k }, settings: { get: () => null } };

const { classePorId, pmDaLinhagem, gruposEscolhidos, validarPoder, habilidadesAteNivel, proficienciasDaClasse, iconeDaClasse } = await import("../module/classes-dados.mjs");
const { derivarPersonagem } = await import("../module/derivar.mjs");
const { sistemaCompleto } = await import("./simulacao.mjs");
const { nivelMaximoDaClasse, atributoDeMagia, motivoParaNaoAprender, limiteDeMagiasDoAnatema } = await import("../module/magias-dados.mjs");
const A = await import("../module/anatema-dados.mjs");
await import("../module/classes/comum.mjs");
const { magiasDoAnatema, devocaoBloqueada } = await import("../module/classes/anatema.mjs");
const { usarPoder, pagamentoComPV } = await import("../module/acoes.mjs");
const { idDeClasse } = await import("../module/dados-compendios.mjs");

const anatema = classePorId("anatema");
const comHab = (...ids) => ids.map(id => ({ type: "poder", flags: { "icarus-rpg": { id: `anatema__${id}` } } }));

test("Critério 13: PV nível 5 com CON +1 = 55; PM nível 9 com SAB +3 = 25 (Mana Coagulada); nível 1 = 5", () => {
  const ficha = (nivel, itens) => derivarPersonagem(sistemaCompleto({
    nivel, identidade: { classe: "anatema" }, magia: { atributo: "" },
    atributos: { CON: { base: 1 }, SAB: { base: 3 } },
    classeConfig: { pvInicial: 26, pvPorNivel: 6, pvAtributo: "CON", ...pmDaLinhagem(anatema, null) }
  }), itens);
  assert.equal(ficha(5, comHab("mana-coagulada")).pv.max, 55);
  assert.equal(ficha(9, comHab("mana-coagulada")).pm.max, 25);
  assert.equal(ficha(1, comHab("mana-coagulada")).pm.max, 5);
  assert.equal(ficha(9, []).pm.max, 21, "sem a habilidade, sem o extra");
  assert.deepEqual(anatema.pm.extraACadaNiveis, A.MANA_COAGULADA);
  assert.equal(A.pmExtraPorNiveis(A.MANA_COAGULADA, 20), 10);
  assert.equal(atributoDeMagia(ficha(5, [])), "SAB");
  assert.deepEqual(proficienciasDaClasse("anatema"), { armas: ["simples", "marciais"], armaduras: ["pesada"], escudo: true, tunicas: false });
  assert.deepEqual([anatema.habilidades.length, anatema.poderes.length], [21, 25]);
  assert.ok(decodeURI(iconeDaClasse("anatema")).endsWith("Anátema.png"));
});

test("Critério 13: Preço de Sangue: 3 PV por PM (2 com Preço Barato), até 2 (3) por turno, nunca a 0 PV", () => {
  assert.equal(A.maximoComPV(4, 30), 2);
  assert.equal(A.maximoComPV(4, 30, { precoBarato: true }), 3);
  assert.equal(A.maximoComPV(1, 30), 1, "não paga mais que o custo");
  assert.equal(A.maximoComPV(4, 7), 2, "7 PV: 6 de perda deixa 1");
  assert.equal(A.maximoComPV(4, 6), 1, "6 PV: 2 PM levaria a 0");
  assert.equal(A.maximoComPV(4, 3), 0);
  assert.equal(A.maximoComPV(4, 30, { jaPagouNoTurno: true }), 0, "uma vez por turno");
  assert.equal(A.chaveDoTurno(null), null);
  assert.equal(A.chaveDoTurno({ id: "c", round: 2, turn: 1 }), "c:2:1");
});

test("Critério 13: Sangria de Guerra: CD 15 (Ferida Teimosa: 10 + metade + SAB); Hemorragia Pesada 2d6; lembrete do turno", () => {
  assert.equal(A.cdDaSangria(6, 3), 15);
  assert.equal(A.cdDaSangria(6, 3, { feridaTeimosa: true }), 16);
  assert.equal(A.perdaDoSangrando(), "1d6");
  assert.equal(A.perdaDoSangrando({ hemorragia: true }), "2d6");
  assert.deepEqual(A.testeDoSangrando(null), { cd: 15, perda: "1d6", bonus: 0, praga: null });
  const por = A.dadosDoSangrando({ nivel: 10, sabedoria: 4, feridaTeimosa: true, hemorragia: true });
  assert.deepEqual(A.testeDoSangrando({ ...por, praga: true }, { veiasDeFerro: true, abalado: true }), { cd: 19, perda: "2d6", bonus: 5, praga: "1d4" });
  assert.equal(A.testeDoSangrando({ ...por, praga: true }).praga, null, "Praga só com Abalado");
});

test("Critério 13: Selar Feridas: 1d6 no 2º, 2d6 no 8º, 4d6 no 20º; Costura Rápida e Cicatriz Viva", () => {
  assert.equal(A.curaDoSelar(2), "1d6");
  assert.equal(A.curaDoSelar(8), "2d6");
  assert.equal(A.curaDoSelar(14), "3d6");
  assert.equal(A.curaDoSelar(20), "4d6");
  assert.equal(A.curaDoSelar(2, { costura: true, cicatrizEmSi: true }), "3d6");
  assert.equal(A.danoDaCarneAberta(3), "1d6");
  assert.equal(A.danoDaCarneAberta(17), "3d6");
  assert.equal(A.limiteDaDorFertil(9), 4);
  assert.equal(A.reducaoDoAmortecer(9), 7);
  assert.deepEqual([A.rdDaPele(30, 50), A.rdDaPele(24, 50)], [2, 4]);
  assert.deepEqual([A.alvosDoOlhar(), A.alvosDoOlhar({ vozBlasfema: true })], [1, 2]);
  assert.equal(A.curaDoBanquete(0), 1);
});

test("Critério 13: Palavras de Sangue: sem o poder não lança; nível 12 só até o 2º; lista Sangue; nunca o 5º", () => {
  assert.deepEqual([4, 5, 9, 12, 13, 17, 20].map(n => nivelMaximoDaClasse("anatema", n)), [0, 1, 2, 2, 3, 4, 4]);
  assert.equal(limiteDeMagiasDoAnatema(0), 0);
  assert.equal(limiteDeMagiasDoAnatema(2), 4);
  const p = { nivel: 12, tradicao: "sangue", conhecidas: 0, limite: 2, max: nivelMaximoDaClasse("anatema", 12) };
  assert.equal(motivoParaNaoAprender({ nivel: 2, tradicoes: ["sangue"] }, p), null);
  assert.equal(motivoParaNaoAprender({ nivel: 3, tradicoes: ["sangue"] }, p).chave, "ICARUS.Magias.Conhecidas.Nivel");
  assert.equal(motivoParaNaoAprender({ nivel: 1, tradicoes: ["divina"] }, p).chave, "ICARUS.Magias.Conhecidas.Tradicao");
  const palavras = anatema.poderes.find(x => x.id === "palavras-de-sangue");
  assert.deepEqual([palavras.repetivel, palavras.escolha.tipo, palavras.escolha.lista], [true, "magias", "sangue"]);
});

test("Critério 13: cada Ruptura libera só os poderes dela; pré-requisitos de Armadura Rubra, Dente por Dente e Banquete", () => {
  const ctx = (escolhas, extra = {}) => ({ nivel: 20, atributos: { FOR: 5, DES: 5, CON: 5, INT: 5, SAB: 5, CAR: 5 }, treino: {}, tem: new Set(), grupos: gruposEscolhidos(anatema, escolhas), ...extra });
  const visiveis = escolhas => anatema.poderes.filter(p => validarPoder(anatema, p, ctx(escolhas)).visivel).map(p => p.id);
  assert.ok(visiveis({ ruptura: 0 }).includes("mao-pesada"));
  assert.ok(!visiveis({ ruptura: 1 }).includes("mao-pesada"));
  assert.ok(visiveis({ ruptura: 1 }).includes("amortecer"));
  assert.ok(visiveis({ ruptura: 2 }).includes("insulto-ao-ceu") && !visiveis({ ruptura: 2 }).includes("amortecer"));
  assert.ok(visiveis({ ruptura: 2 }).includes("ferida-teimosa"), "poderes gerais para todas");
  const ids = escolhas => habilidadesAteNivel(anatema, 20, escolhas).map(h => h.id);
  assert.ok(ids({ ruptura: 1 }).includes("nao-caio") && !ids({ ruptura: 1 }).includes("sangria-total"));
  const req = id => anatema.poderes.find(p => p.id === id);
  assert.equal(req("armadura-rubra").nivelMinimo, 4);
  assert.equal(req("dente-por-dente").nivelMinimo, 7);
  assert.deepEqual(req("banquete-do-vencedor").atributoMinimo, { SAB: 1 });
  assert.equal(validarPoder(anatema, req("dente-por-dente"), ctx({}, { nivel: 6 })).ok, false);
  assert.equal(validarPoder(anatema, req("banquete-do-vencedor"), ctx({}, { atributos: { FOR: 0, DES: 0, CON: 0, INT: 0, SAB: 0, CAR: 0 } })).ok, false);
});

test("Critério 13: Olhar Funesto (SAB em Intimidação), Voz Rouca, Veias de Ferro e Armadura Rubra (+1 só em armadura pesada)", () => {
  const armadura = categoria => ({ type: "equipamento", system: { tipo: "armadura", categoria, equipado: true, bonusDefesa: 0, penalidade: 0 } });
  const ficha = itens => derivarPersonagem(sistemaCompleto({ nivel: 10, identidade: { classe: "anatema" }, atributos: { SAB: { base: 4 }, CAR: { base: 0 } } }), itens);
  const s = ficha([...comHab("olhar-funesto", "voz-rouca", "veias-de-ferro", "armadura-rubra"), armadura("pesada")]);
  assert.equal(s.pericias.intimidacao.atributo, "SAB");
  assert.equal(s.pericias.intimidacao.treino, 1, "Voz Rouca: treinado");
  assert.ok(s.pericias.intimidacao.bonusHeranca.some(b => b.origem === "Voz Rouca" && b.valor === 2));
  assert.ok(s.pericias.fortitude.bonusHeranca.some(b => b.origem === "Veias de Ferro" && b.valor === 2));
  assert.ok(s.defesa.passivos.some(p => p.origem === "Armadura Rubra" && p.valor === 1));
  assert.ok(!ficha([...comHab("armadura-rubra"), armadura("media")]).defesa.passivos.some(p => p.origem === "Armadura Rubra"));
  assert.deepEqual(A.passivosDoAnatema(comHab("pele-de-cicatrizes"), { pv: 10, pvMax: 50 }).rd, [{ tipo: null, valor: 4, origem: "Pele de Cicatrizes" }]);
});

/** Ator simulado (Anátema). */
function ator(nivel = 5) {
  const flags = { "icarus-rpg": {} };
  const system = { nivel, identidade: { classe: "anatema", divindade: "" }, pm: { value: 3, max: 20 }, pv: { value: 30, max: 50 }, pericias: {}, atributos: { SAB: { total: 3 } }, reacao: { disponivel: true } };
  const a = {
    name: "Anátema", uuid: "Actor.a", type: "personagem", flags, system, items: [], effects: [], statuses: new Set(),
    isOwner: true,
    getFlag: (_s, k) => flags["icarus-rpg"][k],
    async setFlag(_s, k, v) { flags["icarus-rpg"][k] = v; },
    async unsetFlag(_s, k) { delete flags["icarus-rpg"][k]; },
    async update(m) {
      for (const [k, v] of Object.entries(m)) {
        if (k.startsWith("flags.icarus-rpg.")) flags["icarus-rpg"][k.slice(17)] = v;
        else if (k.startsWith("system.")) { const p = k.slice(7).split("."); p.slice(0, -1).reduce((o, x) => o[x], system)[p.at(-1)] = v; }
      }
    },
    async createEmbeddedDocuments(t, lista) {
      const criados = lista.map((d, i) => ({ ...d, id: `i${a.items.length + i}`, flags: d.flags ?? {} }));
      if (t === "Item") a.items.push(...criados); else a.effects.push(...criados);
      return criados;
    }
  };
  a._source = { system };
  return a;
}
const darHab = (a, ...ids) => a.createEmbeddedDocuments("Item", ids.map(id => ({ type: "poder", name: id, system: { fonte: "classe", classe: "anatema", tipoPoder: "habilidade" }, flags: { "icarus-rpg": { id: idDeClasse("anatema", id), classe: "anatema" } } })));

test("Critério 13: Abandonado bloqueia a divindade e os Poderes Concedidos (o Mestre é só avisado)", async () => {
  const a = ator();
  await darHab(a, "abandonado");
  assert.equal(devocaoBloqueada(a), true);
  const pre = (nome, ...args) => ganchos[nome].map(f => f(...args));
  assert.ok(pre("preUpdateActor", a, { "system.identidade.divindade": "justar" }, {}, "u1").includes(false));
  assert.ok(pre("preCreateItem", { parent: a, type: "poder", flags: { "icarus-rpg": { concedido: true } }, system: {} }, {}, {}, "u1").includes(false));
  game.user.isGM = true;
  assert.ok(!pre("preUpdateActor", a, { "system.identidade.divindade": "justar" }, {}, "u1").includes(false));
  game.user.isGM = false;
});

test("Critério 13: sem Palavras de Sangue não aprende magia; com ele, 2 de Sangue por escolha", async () => {
  const a = ator(9);
  const pre = item => ganchos.preCreateItem.map(f => f(item, {}, {}, "u1"));
  const magia = (nivel, tradicoes) => ({ parent: a, type: "magia", flags: {}, system: { nivel, tradicoes } });
  assert.ok(pre(magia(1, ["sangue"])).includes(false));
  await a.createEmbeddedDocuments("Item", [{ type: "poder", flags: { "icarus-rpg": { id: "anatema__palavras-de-sangue", magiasExtras: 2 } } }]);
  assert.deepEqual(magiasDoAnatema(a), { conhecidas: 0, limite: 2, palavras: 1 });
  assert.ok(!pre(magia(2, ["sangue"])).includes(false));
  assert.ok(pre(magia(3, ["sangue"])).includes(false), "nível 9: até o 2º");
  assert.ok(pre(magia(1, ["divina"])).includes(false), "só a lista Sangue");
});

test("Critério 13: usar poder pagando PM com PV (3 PV cada, até 2) e uma vez por turno", async () => {
  const a = ator();
  await darHab(a, "abandonado");
  game.combat = { id: "c", round: 1, turn: 0 };
  const p = pagamentoComPV(a);
  assert.equal(p.pvPorPM, 3);
  assert.equal(p.maximo(4), 2);
  const poder = { name: "Insulto", system: { acao: "padrao", custoPM: 4, descricao: "" }, flags: { "icarus-rpg": { id: "anatema__teste" } } };
  respostaDialogo = { pm: 4, comPV: 2 };
  const uso = await usarPoder(a, poder);
  assert.deepEqual([uso.comPV, a.system.pm.value, a.system.pv.value], [2, 1, 24]);
  assert.equal(a.getFlag("icarus-rpg", "precoTurno"), "c:1:0");
  assert.equal(pagamentoComPV(a).maximo(4), 0, "já pagou neste turno");
  respostaDialogo = { pm: 2, comPV: 2 };
  assert.equal(await usarPoder(a, poder), null, "sem PM e sem poder pagar com PV de novo");
  game.combat = null;
});

test("Critério 13: Dor Fértil: +1 PM ao perder PV, uma vez por rodada, até metade do nível por cena", async () => {
  const a = ator(4);
  await darHab(a, "dor-fertil");
  game.combat = { id: "c", round: 1, turn: 0 };
  const perder = pv => { const m = { "system.pv.value": pv }; for (const f of ganchos.preUpdateActor) f(a, m, {}, "u1"); return m; };
  const m1 = perder(25);
  assert.equal(m1["system.pm.value"], 4);
  await a.update(m1);
  assert.equal(perder(20)["system.pm.value"], undefined, "uma vez por rodada");
  game.combat.round = 2;
  await a.update(perder(15));
  game.combat.round = 3;
  assert.equal(perder(10)["system.pm.value"], undefined, "nível 4: no máximo 2 por cena");
  game.combat = null;
});
