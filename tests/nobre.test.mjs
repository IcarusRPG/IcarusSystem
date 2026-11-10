/** Nobre: Postura Altiva, Dote, Brio, Rendimentos, Palavra Cortante (não letal), Majestade, Cofre e dinheiro. */
import { test } from "node:test";
import assert from "node:assert/strict";

const chat = [];
const avisos = [];
let respostaDialogo = null;
globalThis.foundry = {
  utils: { deepClone: o => structuredClone(o), escapeHTML: s => s, getProperty: () => undefined },
  applications: { api: {
    DialogV2: {
      confirm: async () => true,
      // Roda o primeiro botão com um formulário falso (campos de respostaDialogo)
      wait: async cfg => cfg.buttons[0].callback?.(null, { form: { querySelector: s => (s.includes(":checked") ? null : { value: respostaDialogo?.[s.match(/name=(\w+)/)?.[1]] ?? 0 }), querySelectorAll: () => [], elements: {} } }) ?? cfg.buttons[0].action
    },
    ApplicationV2: class {}, HandlebarsApplicationMixin: c => c
  } }
};
globalThis.Handlebars = { escapeExpression: t => String(t ?? "") };
globalThis.Hooks = { on() {}, once() {} };
globalThis.ui = { notifications: { warn: m => avisos.push(m), info() {}, error: m => avisos.push(m) } };
globalThis.renderTemplate = async (_t, d) => JSON.stringify(d);
globalThis.ChatMessage = { create: async d => { chat.push(d); return d; }, getSpeaker: () => ({}), applyRollMode() {} };
globalThis.CONFIG = { sounds: {}, statusEffects: [] };
globalThis.game = {
  user: { id: "mestre", isGM: true, targets: new Set() }, users: { activeGM: { isSelf: true }, get: () => ({ id: "mestre", isGM: true, active: true }), filter: () => [] },
  i18n: { localize: k => k, format: (k, d) => `${k} ${JSON.stringify(d ?? {})}` },
  settings: { get: (_s, k) => (k === "rollMode" ? "publicroll" : k === "danoJogadoresOutros" ? "alvos" : false) },
  socket: { emit() {} }
};

const { derivarPersonagem } = await import("../module/derivar.mjs");
const { sistemaCompleto } = await import("./simulacao.mjs");
const nobreDados = await import("../module/nobre-dados.mjs");
await import("../module/classes/comum.mjs");
const { pagarEmDinheiro } = await import("../module/classes/nobre.mjs");
const { APOS_CONCEDER } = await import("../module/classes.mjs");
const { perguntarBonusDeItens } = await import("../module/rolls.mjs");
const { dadosDaMensagem } = await import("../module/dano-aplicacao.mjs");

const habilidade = id => ({ type: "poder", flags: { "icarus-rpg": { id: `nobre__${id}` } } });

test("Critério 8: Postura Altiva troca DES por CAR na Defesa (armadura não muda isso)", () => {
  const s = (flag, itens = [habilidade("postura-altiva")]) => derivarPersonagem(sistemaCompleto({ atributos: { DES: { base: 1 }, CAR: { base: 4 } } }), itens, [], { defesaAtributo: flag }).defesa;
  assert.deepEqual([s("CAR").total, s("CAR").atributo], [14, "CAR"]);
  assert.equal(s("DES").total, 11);
  assert.equal(s("CAR", []).total, 11, "sem a habilidade, a flag não vale");
  const armadura = { type: "equipamento", system: { tipo: "armadura", equipado: true, bonusDefesa: 5, categoria: "pesada", penalidade: 0 }, flags: {} };
  assert.equal(s("CAR", [habilidade("postura-altiva"), armadura]).total, 19);
});

/** Nobre simulado com moedas, PM e flags. */
function nobre({ real = 0, pm = 10, CAR = 3, itens = [] } = {}) {
  const flags = {};
  const a = {
    name: "Nobre", items: itens,
    system: { identidade: { classe: "nobre" }, nivel: 5, pm: { value: pm, max: 20 }, atributos: { CAR: { total: CAR } }, moedas: { ouroReal: 0, real, centavo: 0 } },
    getFlag: (_s, k) => flags[k], async setFlag(_s, k, v) { flags[k] = v; }, async unsetFlag(_s, k) { delete flags[k]; },
    async update(m) {
      if (m["system.moedas"]) { a.system.moedas = m["system.moedas"]; a._source.system.moedas = m["system.moedas"]; }
      if ("system.pm.value" in m) a.system.pm.value = m["system.pm.value"];
    }
  };
  a._source = { system: { moedas: { ...a.system.moedas }, identidade: { classe: "nobre" } } };
  return a;
}

test("Critério 8: Dote dá R$ 1.500 uma única vez", async () => {
  const a = nobre({ real: 100 });
  await APOS_CONCEDER.get("dote")(a);
  await APOS_CONCEDER.get("dote")(a);
  assert.equal(a.system.moedas.real, 1600);
});

test("Critério 9: pagar com dinheiro nunca deixa saldo negativo; Cofre limitado ao Carisma por cena", async () => {
  const a = nobre({ real: 40 });
  assert.equal(await pagarEmDinheiro(a, 50), false);
  assert.equal(a.system.moedas.real, 40);
  assert.equal(await pagarEmDinheiro(a, 30), true);
  assert.equal(a.system.moedas.real, 10);
  assert.deepEqual([nobreDados.reaisPorPM(5), nobreDados.reaisPorPM(5, true)], [50, 25]);
  assert.deepEqual([nobreDados.restanteDoCofre(3, 0), nobreDados.restanteDoCofre(3, 2), nobreDados.restanteDoCofre(3, 5)], [3, 1, 0]);
  assert.deepEqual(["patrocinar", "dinheiro-resolve", "escolta-contratada"].map(id => nobreDados.custoEmDinheiro(id, 5)), [100, 500, 180]);
});

test("Critério 8: Brio +2 por PM, limitado ao Carisma (mínimo 1) e ao PM atual", async () => {
  assert.deepEqual([nobreDados.maximoDeBrio(3, 10), nobreDados.maximoDeBrio(0, 10), nobreDados.maximoDeBrio(-1, 10), nobreDados.maximoDeBrio(4, 2)], [3, 1, 1, 2]);
  const a = nobre({ CAR: 2, itens: [habilidade("brio")] });
  respostaDialogo = { brio: 5 };
  const r = await perguntarBonusDeItens(a, "diplomacia");
  assert.equal(r.brio, 2, "limitado ao Carisma");
  assert.deepEqual(r.extras, [{ valor: 4, rotulo: 'ICARUS.Nobre.BrioRotulo {"pm":2}' }]);
  assert.deepEqual(await perguntarBonusDeItens(nobre({ CAR: 2 }), "diplomacia"), {}, "sem Brio: sem diálogo");
});

test("Critério 8: Rendimentos (nível 5, resultado 20 → R$ 360); Palavra Cortante; Majestade uma vez por criatura", () => {
  assert.equal(nobreDados.valorDosRendimentos(20, 5), 360);
  assert.equal(nobreDados.riquezaInicial(23), 220000);
  assert.deepEqual([2, 6, 10, 14, 18].map(n => nobreDados.danoDaPalavraCortante(n)), ["2d6", "4d6", "6d6", "8d6", "10d6"]);
  assert.equal(nobreDados.danoDaPalavraCortante(6, { tiranico: true }), "4d8");
  assert.deepEqual([nobreDados.cdDaMajestade(7, 3), nobreDados.cdDaMajestade(20, 5, true)], [16, 30]);
  assert.equal(nobreDados.majestadeUsadaContra({ t1: true }, "t1"), true);
  assert.equal(nobreDados.majestadeUsadaContra({ t1: true }, "t2"), false);
});

test("Critério 8: dano não letal da Palavra Cortante: a 0 PV o alvo se rende e não fica Morrendo", async () => {
  const d = dadosDaMensagem({ dano: { rollType: "dano", total: 9, componentes: [{ tipo: "psiquico", valor: 9 }] }, naoLetal: { pericia: "diplomacia" } });
  assert.deepEqual(d.naoLetal, { pericia: "diplomacia" });
  // Aplicação pelo Mestre: o update leva icarusNaoLetal (morte-foundry.mjs não aplica Morrendo)
  const opcoesDoUpdate = [];
  const alvo = {
    name: "Guarda", uuid: "Actor.g", statuses: new Set(), system: { pv: { value: 5, max: 12 }, resistencias: { rdGeral: 0, reducao: {}, imunidade: {}, vulnerabilidade: {} } },
    getFlag: () => null, testUserPermission: () => true,
    async update(m, o) { this.system.pv.value = m["system.pv.value"]; opcoesDoUpdate.push(o); }
  };
  const token = { uuid: "Scene.c.Token.g", name: "Guarda", actor: alvo, parent: { id: "c" }, documentName: "Token" };
  globalThis.fromUuidSync = u => (u === token.uuid ? token : null);
  const msg = { id: "m1", flags: { "icarus-rpg": { dano: { rollType: "dano", total: 9, componentes: [{ tipo: "psiquico", valor: 9 }] }, naoLetal: { pericia: "diplomacia" }, aplicacoes: [] } },
    rolls: [], whisper: [], blind: false, author: { id: "mestre" }, isOwner: true,
    getFlag(_s, k) { return this.flags["icarus-rpg"][k]; }, async setFlag(_s, k, v) { this.flags["icarus-rpg"][k] = v; } };
  game.messages = { get: () => msg };
  game.user.viewedScene = "c";
  game.users.get = () => ({ id: "mestre", isGM: true, active: true, viewedScene: "c", targets: new Set([{ document: token }]) });
  const { aoReceberDano } = await import("../module/dano.mjs");
  await aoReceberDano({ acao: "dano:aplicar", botao: "dano", mensagemId: "m1", alvos: [token.uuid], origem: "alvos" }, "mestre");
  assert.equal(alvo.system.pv.value, 0);
  assert.deepEqual(opcoesDoUpdate[0], { icarusNaoLetal: true });
  assert.match(msg.flags["icarus-rpg"].aplicacoes[0].detalhe, /ICARUS.Nobre.SeRende/);
});
