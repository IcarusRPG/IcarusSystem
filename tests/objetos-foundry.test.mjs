/** Quebrar objetos no Foundry (simulado): Defesa pelo tamanho, RD sem teto, item destruído e manobra Quebrar. */
import { test } from "node:test";
import assert from "node:assert/strict";

const chat = [];
let d20 = 10, dano = 20;
globalThis.foundry = { utils: { deepClone: o => structuredClone(o), getProperty: () => undefined, setProperty() {} }, applications: { api: { DialogV2: {} } } };
globalThis.Handlebars = { escapeExpression: t => String(t ?? "") };
globalThis.Hooks = { on() {}, once() {} };
globalThis.ui = { notifications: { warn() {}, info() {} } };
globalThis.CONFIG = { sounds: {} };
// d20: valor fixo (d20); outras fórmulas: o dano fixo
globalThis.Roll = class {
  constructor(f) { this.formula = f; }
  async evaluate() {
    const ehD20 = /d20/.test(this.formula);
    const bonus = ehD20 ? Number(this.formula.replace(/\s/g, "").match(/[+-]\d+$/)?.[0] ?? 0) : 0;
    this.dice = ehD20 ? [{ results: [{ result: d20 }] }] : [];
    this.total = ehD20 ? d20 + bonus : dano;
    return this;
  }
};
globalThis.ChatMessage = { create: async d => { const m = { ...d, isOwner: true, async setFlag(_s, k, v) { this.flags["icarus-rpg"][k] = v; } }; chat.push(m); return m; }, getSpeaker: () => ({}) };
globalThis.game = { user: { isGM: true, targets: new Set() }, i18n: { localize: k => k, format: (k, d) => `${k} ${JSON.stringify(d ?? {})}` } };

const { atacarObjeto, objetoEscolhido, itensQuebraveis } = await import("../module/objetos.mjs");

/** Atacante com uma espada longa (Luta +5). */
const espada = { id: "e1", type: "arma", name: "Espada", flags: {}, system: { modos: ["corpo-a-corpo"], dano: "1d8", criticoMargem: 19, criticoMult: 2, empunhada: true, propriedades: [], categoria: "marcial" } };
const atacante = {
  name: "Ana", items: Object.assign([espada], { get: id => (id === "e1" ? espada : null) }),
  system: { pericias: { luta: { total: 5, atributo: "FOR" } }, atributos: { FOR: { total: 0 }, DES: { total: 0 } }, proficiencias: { armas: ["simples", "marciais"] }, bonus: { ataque: 0 } }
};

/** Mago alvo com um cetro de metal (RD 10, PV 5) em mãos e Defesa 14. */
function alvoComFoco() {
  const cetro = {
    id: "c1", uuid: "Actor.m.Item.c1", type: "equipamento", name: "Cetro de metal", isOwner: true,
    system: { tipo: "foco", equipado: true },
    flags: { "icarus-rpg": { focoArcano: { material: "metal" }, objeto: { rd: 10, pvMax: 5, tamanho: "minusculo" }, pvObjeto: 5 } },
    async update(m) { for (const [k, v] of Object.entries(m)) { if (k === "system.equipado") this.system.equipado = v; else this.flags["icarus-rpg"][k.split(".").at(-1)] = v; } }
  };
  const actor = { uuid: "Actor.m", name: "Mago", isOwner: true, system: { defesa: { total: 14 } }, items: Object.assign([cetro], { get: id => (id === "c1" ? cetro : null) }), getFlag: () => null };
  globalThis.fromUuidSync = u => (u === cetro.uuid ? cetro : null);
  return { actor, cetro, token: { name: "Mago", actor } };
}

test("Critério 10: Defesa pelo tamanho (+5 em movimento); porta de ferro RD 10 sem teto", async () => {
  assert.equal(objetoEscolhido({ objeto: "tabela:porta-de-ferro", movimento: false }).defesa, 8);
  assert.equal(objetoEscolhido({ objeto: "tabela:porta-de-ferro", movimento: true }).defesa, 13);
  assert.equal(objetoEscolhido({ objeto: "manual", tamanho: "pequeno", rd: 2, pv: 4 }).defesa, 12);
  d20 = 10; dano = 25;
  const r = await atacarObjeto(atacante, { arma: "e1", objeto: "tabela:porta-de-ferro", movimento: false });
  assert.equal(r.acertou, true);
  assert.deepEqual(r.res, { efetivo: 15, pv: 85, destruido: false });
  // Em movimento: 15 contra Defesa 13 acerta; d20 2 (7) erra
  d20 = 2;
  assert.equal((await atacarObjeto(atacante, { arma: "e1", objeto: "tabela:porta-de-ferro", movimento: true })).acertou, false);
});

test("Critério 11 e 10: Quebrar contra item empunhado usa a Defesa do alvo; foco de metal (RD 10/PV 5) com 20 de dano é destruído e sai das mãos", async () => {
  const { actor, cetro, token } = alvoComFoco();
  assert.deepEqual(itensQuebraveis(actor).map(i => i.id), ["c1"]);
  assert.equal(objetoEscolhido({ objeto: "item:c1" }, actor).defesa, 14, "Defesa do alvo, não Fortitude");
  d20 = 8; dano = 20; // 8 + 5 = 13 < 14: erra
  assert.equal((await atacarObjeto(atacante, { arma: "e1", objeto: "item:c1", alvo: token })).acertou, false);
  assert.equal(cetro.flags["icarus-rpg"].pvObjeto, 5);
  d20 = 9; // 14: acerta
  const r = await atacarObjeto(atacante, { arma: "e1", objeto: "item:c1", alvo: token });
  assert.deepEqual(r.res, { efetivo: 10, pv: -5, destruido: true });
  assert.equal(cetro.flags["icarus-rpg"].destruido, true);
  assert.equal(cetro.system.equipado, false);
  assert.equal(chat.at(-1).flags["icarus-rpg"].objeto.aplicado, true);
});
