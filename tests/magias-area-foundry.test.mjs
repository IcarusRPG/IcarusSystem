/** Lançar magia de área no Foundry (simulado): modelo criado, alvos dentro da área e a área na animação. */
import { test } from "node:test";
import assert from "node:assert/strict";

const chat = [];
const modelos = [];
class AppFalso { constructor(o) { this.options = o; } render() { return this; } }
globalThis.foundry = { applications: { api: { ApplicationV2: AppFalso, HandlebarsApplicationMixin: c => c } }, utils: { deepClone: o => structuredClone(o) } };
globalThis.Hooks = { on() {}, once() {} };
globalThis.ui = { notifications: { warn() {}, error() {}, info() {} } };
globalThis.renderTemplate = async (_t, d) => JSON.stringify(d);
globalThis.TextEditor = { enrichHTML: async t => t };
globalThis.CONFIG = { sounds: {}, MeasuredTemplate: { defaults: { angle: 53.13 } } };
globalThis.Roll = class { constructor(f) { this.formula = f; } async evaluate() { this.total = 21; return this; } };
let n = 0;
globalThis.ChatMessage = {
  create: async d => { const m = { id: `m${++n}`, ...d }; chat.push(m); return m; },
  getSpeaker: () => ({}), applyRollMode() {}
};
const alvos = new Set();
/** Token simulado (centro em px). */
const token = (id, x, y) => {
  const t = { id, center: { x, y }, visible: true, document: { uuid: `Scene.cena.Token.${id}`, hidden: false },
    setTarget(v) { if (v) alvos.add(t); else alvos.delete(t); } };
  return t;
};
const conj = token("conj", 500, 500);
const tokens = [conj, token("perto", 700, 500), token("longe", 1200, 500)];
globalThis.canvas = {
  ready: true, grid: { size: 100 }, tokens: { placeables: tokens },
  scene: { id: "cena", grid: { distance: 1.5 }, templates: { has: () => true },
    async createEmbeddedDocuments(_t, lista) { modelos.push(...lista); return lista.map((d, i) => ({ ...d, id: `t${i}`, uuid: `Scene.cena.MeasuredTemplate.t${i}`, delete: async () => {} })); } }
};
let posicionar = true;
globalThis.game = {
  user: { id: "u1", isGM: true, color: "#fff", targets: alvos },
  users: { activeGM: { isSelf: true } }, combat: null,
  i18n: { localize: k => k, format: k => k },
  settings: { get: (_s, k) => k === "magiasPosicionarArea" ? posicionar : "publicroll" }
};

const { executarLancamento } = await import("../module/magias.mjs");
const ator = () => ({
  uuid: "Actor.a", system: { pm: { value: 20, max: 20 }, magia: { cd: 14 } },
  getActiveTokens: () => [{ uuid: "Scene.cena.Token.conj", parent: { id: "cena" }, object: conj }],
  async update(m) { this.system.pm.value = m["system.pm.value"]; }
});
// Bola de Fogo "centrada em você": posiciona sozinha no conjurador (sem precisar do mouse)
const magia = { uuid: "Actor.a.Item.b", name: "Bola de Fogo", img: "b.png", flags: { "icarus-rpg": { id: "bola-de-fogo" } },
  system: { nivel: 3, custoPM: 6, escola: "Evocação", execucao: "padrão", alcance: "pessoal", alvo: "esfera de 6 m de raio, centrada em você",
    duracao: "instantânea", resistencia: "Reflexos reduz à metade", descricao: "", aprimoramentos: [] } };

test("Área no conjurador: cria o modelo, marca quem está dentro (sem o conjurador) e a animação recebe o ponto", async () => {
  await executarLancamento(ator(), magia, []);
  assert.equal(modelos.length, 1);
  assert.deepEqual([modelos[0].t, modelos[0].x, modelos[0].y, modelos[0].distance], ["circle", 500, 500, 6]);
  assert.equal(modelos[0].flags["icarus-rpg"].magia.id, "bola-de-fogo");
  assert.deepEqual([...alvos].map(t => t.id), ["perto"]);
  const vfx = chat.find(m => m.flags["icarus-rpg"].magiaVfx).flags["icarus-rpg"].magiaVfx;
  assert.deepEqual([vfx.area.x, vfx.area.y, vfx.area.forma, vfx.area.cena], [500, 500, "esfera", "cena"]);
  assert.deepEqual(vfx.alvos, ["Scene.cena.Token.perto"]);
});

test("Opção desligada: lança sem modelo (como antes)", async () => {
  posicionar = false;
  modelos.length = 0;
  await executarLancamento(ator(), magia, []);
  assert.equal(modelos.length, 0);
  posicionar = true;
});

test("Os alvos que a área marcou valem para a própria magia; outro dano depois não os usa (a não ser que o usuário mude os alvos)", async () => {
  const { ultimaAreaMarcada, alvosDaAreaDeOutraMagia } = await import("../module/magias-area.mjs");
  posicionar = true;
  await executarLancamento(ator(), magia, []);
  assert.deepEqual(ultimaAreaMarcada(), { magiaId: "bola-de-fogo", ids: ["Scene.cena.Token.perto"] });
  assert.equal(alvosDaAreaDeOutraMagia(["Scene.cena.Token.perto"], "bola-de-fogo"), false, "dano da própria Bola de Fogo");
  assert.equal(alvosDaAreaDeOutraMagia(["Scene.cena.Token.perto"], undefined), true, "outro dano (sem magia)");
  assert.equal(alvosDaAreaDeOutraMagia(["Scene.cena.Token.perto"], "raio"), true, "dano de outra magia");
  assert.equal(alvosDaAreaDeOutraMagia(["Scene.cena.Token.longe"], undefined), false, "o usuário marcou outro alvo");
  assert.equal(alvosDaAreaDeOutraMagia(["Scene.cena.Token.perto", "Scene.cena.Token.longe"], undefined), false);
});
