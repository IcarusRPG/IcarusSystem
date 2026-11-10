/** Sustentada × concentração (tipos separados): PM por turno, Teste de Concentração CD 10 + nível + 2. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const ganchos = {};
let confirmar = false;
let d20 = 10;
globalThis.foundry = {
  utils: { deepClone: o => structuredClone(o), getProperty: (o, p) => (p in o ? o[p] : p.split(".").reduce((a, k) => a?.[k], o)), setProperty: (o, p, v) => { o[p] = v; }, hasProperty: () => false },
  applications: { api: { DialogV2: { confirm: async () => confirmar, wait: async () => null }, ApplicationV2: class {}, HandlebarsApplicationMixin: c => c } }
};
globalThis.Handlebars = { escapeExpression: t => String(t ?? "") };
globalThis.Hooks = { on: (n, f) => { (ganchos[n] ??= []).push(f); }, once() {} };
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };
globalThis.CONFIG = { statusEffects: [], sounds: {} };
const chat = [];
globalThis.ChatMessage = { create: async d => { chat.push(d); return d; }, getSpeaker: () => ({}), applyRollMode() {} };
globalThis.Roll = class { constructor(f) { this.formula = f; } async evaluate() { this.total = d20; this.terms = [{ results: [{ result: d20, active: true }] }]; this.dice = [{ results: [{ result: d20, active: true }] }]; return this; } };
globalThis.Actor = class {};
globalThis.game = { user: { id: "u1", isGM: false, targets: new Set() }, users: [], release: { generation: 12 }, i18n: { localize: k => k, format: k => k }, settings: { get: () => null } };

const { tipoDeManutencao, cdDeConcentracao, adicionarMantida, debitoDoTurno, perderConcentracao, limiteDeConcentracao } = await import("../module/magias-dados.mjs");
const { registrarMantida, testeDeConcentracao, encerrarMantida, registrarMagiasMantidas, mantidasDoAtor } = await import("../module/magias-mantidas.mjs");
const { INICIO_DO_TURNO } = await import("../module/acoes.mjs");
registrarMagiasMantidas();

const MAGIAS = JSON.parse(fs.readFileSync(new URL("../tools/dados/magias.json", import.meta.url), "utf8")).magias;

test("magias.json: 6 magias passam a concentração; 24 sustentadas; nenhuma é das duas", () => {
  const tipos = MAGIAS.map(m => tipoDeManutencao(m)).filter(Boolean);
  assert.equal(tipos.filter(t => t === "concentracao").length, 6);
  assert.equal(tipos.filter(t => t === "sustentada").length, 24);
  assert.deepEqual(MAGIAS.filter(m => tipoDeManutencao(m) === "concentracao").map(m => m.id).sort(),
    ["assassino-fantasmagorico", "espectro-ilusorio", "inversao-da-gravidade", "moldar-pensamentos", "prisao-de-ilusoes", "projetar-consciencia"]);
  // A marca antiga "concentracao" das sustentadas não as torna de concentração
  assert.equal(tipoDeManutencao(MAGIAS.find(m => m.id === "detectar-magia")), "sustentada");
});

test("Critério: CD do Teste de Concentração = 10 + nível da magia + 2 (3º nível → 15, qualquer conjurador)", () => {
  assert.deepEqual([1, 3, 5].map(cdDeConcentracao), [13, 15, 17]);
});

test("Regras puras: limite de concentração, débito de PM, Magia Duradoura e Mente Dividida", () => {
  const s = (id, extra = {}) => ({ id, nome: id, nivel: 1, tipo: "sustentada", ...extra });
  const c = (id, nivel = 1) => ({ id, nome: id, nivel, tipo: "concentracao" });
  assert.deepEqual([limiteDeConcentracao(false), limiteDeConcentracao(true)], [1, 2]);
  let r = adicionarMantida([c("a"), s("x")], c("b"));
  assert.deepEqual([r.lista.map(m => m.id), r.encerradas.map(m => m.id)], [["x", "b"], ["a"]]);
  r = adicionarMantida([c("a")], c("b"), { menteDividida: true });
  assert.deepEqual([r.lista.map(m => m.id), r.encerradas.length], [["a", "b"], 0]);
  // Sustentadas pagam 1 PM; concentração e Magia Duradoura não; sem PM, termina
  r = debitoDoTurno([s("x"), c("a"), s("y", { duradoura: true }), s("z")], 1);
  assert.deepEqual([r.custo, r.mantidas.map(m => m.id), r.encerradas.map(m => m.id)], [1, ["x", "a", "y"], ["z"]]);
  assert.equal(debitoDoTurno([c("a")], 5).custo, 0, "concentração não paga por turno");
  // Perder a concentração: só ela; com Mente Dividida, as duas
  assert.deepEqual(perderConcentracao([c("a"), c("b"), s("x")], "a").lista.map(m => m.id), ["b", "x"]);
  assert.deepEqual(perderConcentracao([c("a"), c("b"), s("x")], "a", { menteDividida: true }).lista.map(m => m.id), ["x"]);
});

function ator({ pm = 10, itens = [] } = {}) {
  const flags = { "icarus-rpg": {} };
  const a = {
    name: "Maga", uuid: "Actor.m", flags, items: itens,
    system: { pm: { value: pm, max: 20 }, pv: { value: 20 }, pericias: { concentracao: { total: 2 } } },
    getFlag: (_s, k) => flags["icarus-rpg"][k],
    async setFlag(_s, k, v) { flags["icarus-rpg"][k] = v; },
    async unsetFlag(_s, k) { delete flags["icarus-rpg"][k]; },
    async update(m) { for (const [k, v] of Object.entries(m)) { if (k === "system.pm.value") a.system.pm.value = v; else if (k.startsWith("flags.icarus-rpg.")) flags["icarus-rpg"][k.slice(17)] = v; } },
    testUserPermission: () => true
  };
  return a;
}
const magia = (id, nivel, duracao) => ({ id: `i-${id}`, name: id, system: { nivel, duracao }, flags: { "icarus-rpg": { id } } });

test("Sustentada: entra na lista e paga 1 PM no início do turno; nunca pede teste ao sofrer dano", async () => {
  const a = ator({ pm: 1 });
  await registrarMantida(a, magia("luz-arcana", 1, "sustentada"));
  assert.equal(mantidasDoAtor(a)[0].tipo, "sustentada");
  for (const fn of INICIO_DO_TURNO) await fn(a);
  assert.equal(a.system.pm.value, 0);
  assert.equal(mantidasDoAtor(a).length, 1);
  for (const fn of INICIO_DO_TURNO) await fn(a);
  assert.equal(mantidasDoAtor(a).length, 0, "sem PM, termina");
  // Dano com só sustentada: nenhum cartão de concentração
  const b = ator();
  await registrarMantida(b, magia("luz-arcana", 1, "sustentada"));
  chat.length = 0;
  const opcoes = {};
  for (const fn of ganchos.preUpdateActor) fn(b, { "system.pv.value": 15 }, opcoes);
  b.system.pv.value = 15;
  for (const fn of ganchos.updateActor) fn(b, {}, opcoes, "u1");
  assert.equal(chat.filter(m => m.flags?.["icarus-rpg"]?.concentracao).length, 0);
});

test("Magia Duradoura: +2 PM ao lançar e a sustentada não paga mais por turno", async () => {
  const duradoura = { flags: { "icarus-rpg": { id: "arcanista__magia-duradoura" } }, system: {} };
  const a = ator({ pm: 5, itens: [duradoura] });
  confirmar = true;
  await registrarMantida(a, magia("luz-arcana", 1, "sustentada"));
  confirmar = false;
  assert.equal(a.system.pm.value, 3);
  for (const fn of INICIO_DO_TURNO) await fn(a);
  assert.equal(a.system.pm.value, 3);
  assert.equal(mantidasDoAtor(a)[0].duradoura, true);
});

test("Concentração: sem PM por turno; ao sofrer dano, cartão com o teste CD 15 (3º nível); falhou, termina", async () => {
  const a = ator({ pm: 4 });
  await registrarMantida(a, magia("espectro-ilusorio", 3, "concentração"));
  for (const fn of INICIO_DO_TURNO) await fn(a);
  assert.equal(a.system.pm.value, 4);
  chat.length = 0;
  const opcoes = {};
  for (const fn of ganchos.preUpdateActor) fn(a, { "system.pv.value": 12 }, opcoes);
  a.system.pv.value = 12;
  for (const fn of ganchos.updateActor) fn(a, {}, opcoes, "u1");
  await new Promise(r => setTimeout(r, 0));
  const cartao = chat.find(m => m.flags?.["icarus-rpg"]?.concentracao);
  assert.ok(cartao, "cartão do teste");
  d20 = 13; // 13 + 2 = 15: passa (CD 15)
  assert.deepEqual(await testeDeConcentracao(a, "espectro-ilusorio"), { passou: true, total: 15, cd: 15 });
  assert.equal(mantidasDoAtor(a).length, 1);
  d20 = 12;
  assert.equal((await testeDeConcentracao(a, "espectro-ilusorio")).passou, false);
  assert.equal(mantidasDoAtor(a).length, 0);
});

test("Concentração termina com Atordoado (e as outras condições da lista); o jogador encerra quando quiser", async () => {
  const a = Object.assign(new Actor(), ator());
  await registrarMantida(a, magia("espectro-ilusorio", 3, "concentração"));
  await registrarMantida(a, magia("luz-arcana", 1, "sustentada"));
  for (const fn of ganchos.createActiveEffect) await fn({ parent: a, name: "Atordoado", statuses: new Set(["atordoado"]) }, {}, "u1");
  await new Promise(r => setTimeout(r, 0));
  assert.deepEqual(mantidasDoAtor(a).map(m => m.id), ["luz-arcana"], "a sustentada continua");
  await encerrarMantida(a, "luz-arcana");
  assert.equal(mantidasDoAtor(a).length, 0);
});
