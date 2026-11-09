/** Lançar magia no Foundry (simulado): débito de PM, cartão com flags, devolução se o cartão falhar. */
import { test } from "node:test";
import assert from "node:assert/strict";

const avisos = [];
const chat = [];
let falharChat = false;
class AppFalso { constructor(o) { this.options = o; } render() { return this; } }
globalThis.foundry = { applications: { api: { ApplicationV2: AppFalso, HandlebarsApplicationMixin: c => c } } };
globalThis.Hooks = { on() {}, once() {} };
globalThis.ui = { notifications: { warn: m => avisos.push(m), error: m => avisos.push(m), info() {} } };
globalThis.renderTemplate = async (_t, d) => JSON.stringify(d);
globalThis.TextEditor = { enrichHTML: async t => t };
globalThis.ChatMessage = {
  create: async d => { if (falharChat) throw new Error("falhou"); chat.push(d); return d; },
  getSpeaker: () => ({}), applyRollMode() {}
};
globalThis.game = {
  user: { targets: new Set() }, i18n: { localize: k => k, format: k => k },
  settings: { get: () => "publicroll" }
};

const { executarLancamento } = await import("../module/magias.mjs");
const ator = () => ({
  uuid: "Actor.a", system: { pm: { value: 7, max: 12 }, magia: { cd: 14 } },
  async update(m) { this.system.pm.value = m["system.pm.value"]; }
});
const bola = {
  uuid: "Actor.a.Item.b", name: "Bola de Fogo", img: "bola.png", flags: { "icarus-rpg": { id: "bola-de-fogo" } },
  system: { nivel: 3, custoPM: 6, escola: "Evocação", execucao: "padrão", alcance: "longo", alvo: "esfera", duracao: "instantânea",
    resistencia: "Reflexos reduz à metade", descricao: "<p>6d6</p>", aprimoramentos: [{ custo: 1, texto: "+1d6" }, { custo: 2, texto: "Em Chamas" }] }
};

test("Lançar: debita base + aprimoramento e cria o cartão com CD e flags", async () => {
  const a = ator();
  const msg = await executarLancamento(a, bola, [0]);
  assert.equal(a.system.pm.value, 0);
  const f = msg.flags["icarus-rpg"].magia;
  assert.deepEqual([f.id, f.cd, f.custo, f.aprimoramentos], ["bola-de-fogo", 14, 7, [0]]);
  assert.match(msg.content, /"cd":14/);
});

test("PM insuficiente: não debita nem cria cartão", async () => {
  const a = ator();
  const antes = chat.length;
  assert.equal(await executarLancamento(a, bola, [0, 1]), null);
  assert.equal(a.system.pm.value, 7);
  assert.equal(chat.length, antes);
  assert.match(avisos.at(-1), /SemPM/);
});

test("Erro ao criar o cartão: o PM volta", async () => {
  const a = ator();
  falharChat = true;
  assert.equal(await executarLancamento(a, bola, []), null);
  falharChat = false;
  assert.equal(a.system.pm.value, 7);
  assert.match(avisos.at(-1), /ErroDevolvido/);
});
