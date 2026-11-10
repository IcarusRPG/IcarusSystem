/** Heranças do Feiticeiro (bônus automáticos) e Escolta Contratada do Nobre (absorção automática). */
import { test } from "node:test";
import assert from "node:assert/strict";

globalThis.foundry = { utils: { deepClone: o => structuredClone(o), escapeHTML: s => s, getProperty: () => undefined }, applications: { api: { DialogV2: {}, ApplicationV2: class {}, HandlebarsApplicationMixin: c => c } } };
globalThis.Handlebars = { escapeExpression: t => String(t ?? "") };
globalThis.Hooks = { on() {}, once() {} };
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };
globalThis.renderTemplate = async (_t, d) => JSON.stringify(d);
globalThis.ChatMessage = { create: async d => d, getSpeaker: () => ({}), applyRollMode() {} };
globalThis.CONFIG = { sounds: {}, statusEffects: [] };
globalThis.game = {
  user: { id: "mestre", isGM: true, targets: new Set() }, users: { activeGM: { isSelf: true }, filter: () => [] },
  i18n: { localize: k => k, format: (k, d) => `${k} ${JSON.stringify(d ?? {})}` },
  settings: { get: (_s, k) => (k === "danoJogadoresOutros" ? "alvos" : false) }, socket: { emit() {} }
};

const { dadosDasHerancas, passivosDeClasse } = await import("../module/classes-dados.mjs");
const { derivarPersonagem } = await import("../module/derivar.mjs");
const { sistemaCompleto } = await import("./simulacao.mjs");
await import("../module/classes/comum.mjs");
await import("../module/classes/nobre.mjs");
const { aoReceberDano } = await import("../module/dano.mjs");

const heranca = id => ({ type: "poder", flags: { "icarus-rpg": { id: `arcanista__${id}` } } });

test("Heranças: Leviatã (Frio 3, +2 Atletismo), Fênix (Fogo 3, Trevas 3, +2 Vontade), Alma do Elemento (5 no 11º)", () => {
  assert.deepEqual(dadosDasHerancas([heranca("heranca-de-leviata")]).rd, [{ tipo: "frio", valor: 3, origem: "Pele das Profundezas" }]);
  const fenix = dadosDasHerancas([heranca("heranca-de-fenix")]);
  assert.deepEqual(fenix.rd.map(r => [r.tipo, r.valor]), [["fogo", 3], ["trevas", 3]]);
  assert.deepEqual(fenix.pericias.vontade, [{ valor: 2, origem: "Coração de Brasa" }]);
  assert.deepEqual(dadosDasHerancas([heranca("heranca-de-dragao")], { nivel: 10, elementoDragao: "fogo" }).rd, []);
  assert.deepEqual(dadosDasHerancas([heranca("heranca-de-dragao")], { nivel: 11, elementoDragao: "fogo" }).rd, [{ tipo: "fogo", valor: 5, origem: "Alma do Elemento" }]);
  // Na ficha: +2 no total da perícia
  const s = derivarPersonagem(sistemaCompleto({}), [heranca("heranca-de-leviata")]);
  assert.equal(s.pericias.atletismo.total, 2);
});

test("Escamas Dracônicas: +2 Defesa sem armadura nem escudo (túnica não impede)", () => {
  const def = situacao => passivosDeClasse([heranca("heranca-de-dragao")], { tipoArmadura: "nenhuma", usandoEscudo: false, vestindoTunica: false, SAB: 0, ...situacao }).defesa;
  assert.deepEqual(def({}), [{ valor: 2, origem: "Escamas Dracônicas" }]);
  assert.deepEqual(def({ vestindoTunica: true }), [{ valor: 2, origem: "Escamas Dracônicas" }]);
  assert.deepEqual(def({ tipoArmadura: "leve" }), []);
  assert.deepEqual(def({ usandoEscudo: true }), []);
});

test("Escolta Contratada: absorve 3 × nível do dano do Nobre ou de aliado adjacente, uma vez por cena", async () => {
  /** Ator com PV, flags e classe. */
  const ator = (nome, classe, pv, nivel = 5) => {
    const flags = {};
    return {
      name: nome, uuid: `Actor.${nome}`, statuses: new Set(), isOwner: true, getFlag: (_s, k) => flags[k], async setFlag(_s, k, v) { flags[k] = v; }, flags: { "icarus-rpg": flags },
      system: { nivel, identidade: { classe }, pv: { value: pv, max: pv }, resistencias: { rdGeral: 0, reducao: {}, imunidade: {}, vulnerabilidade: {} } },
      _source: { system: { identidade: { classe } } },
      testUserPermission: () => true, async update(m) { this.system.pv.value = m["system.pv.value"]; }
    };
  };
  const nobre = ator("Nobre", "nobre", 30);
  const aliado = ator("Aliado", "guerreiro", 30);
  const longe = ator("Longe", "guerreiro", 30);
  await nobre.setFlag("icarus-rpg", "escolta", { ativa: true, usadaNaCena: false });
  const cena = { id: "c", grid: { size: 100 } };
  const tok = (a, x, y) => ({ uuid: `Scene.c.Token.${a.name}`, name: a.name, actor: a, x, y, width: 1, height: 1, parent: cena, documentName: "Token" });
  const tN = tok(nobre, 0, 0), tA = tok(aliado, 100, 0), tL = tok(longe, 500, 0);
  cena.tokens = [tN, tA, tL];
  const tokens = Object.fromEntries([tN, tA, tL].map(t => [t.uuid, t]));
  globalThis.fromUuidSync = u => tokens[u] ?? null;
  const msg = { id: "m1", flags: { "icarus-rpg": { dano: { rollType: "dano", total: 20, componentes: [{ tipo: "corte", valor: 20 }] }, aplicacoes: [] } },
    rolls: [], whisper: [], blind: false, author: { id: "mestre" }, isOwner: true,
    getFlag(_s, k) { return this.flags["icarus-rpg"][k]; }, async setFlag(_s, k, v) { this.flags["icarus-rpg"][k] = v; } };
  game.messages = { get: () => msg };
  game.users.get = () => ({ id: "mestre", isGM: true, active: true, viewedScene: "c", targets: new Set([{ document: tA }, { document: tL }]) });
  // Aliado adjacente: 20 − 15 = 5; o distante sofre os 20 (a escolta já foi usada nesta cena)
  await aoReceberDano({ acao: "dano:aplicar", botao: "dano", mensagemId: "m1", alvos: [tA.uuid, tL.uuid], origem: "alvos" }, "mestre");
  assert.equal(aliado.system.pv.value, 25);
  assert.equal(longe.system.pv.value, 10);
  assert.equal(nobre.getFlag("icarus-rpg", "escolta").usadaNaCena, true);
  // Mesma cena: o próprio Nobre já não tem absorção
  game.users.get = () => ({ id: "mestre", isGM: true, active: true, viewedScene: "c", targets: new Set([{ document: tN }]) });
  await aoReceberDano({ acao: "dano:aplicar", botao: "dano", mensagemId: "m1", alvos: [tN.uuid], origem: "alvos" }, "mestre");
  assert.equal(nobre.system.pv.value, 10);
});
