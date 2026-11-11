/** PV temporários: o dano consome primeiro, não acumulam, cura não restaura, somem no fim da cena ou com o efeito de origem. */
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
globalThis.Roll = class { constructor(f) { this.formula = f; } async evaluate() { this.total = 9; return this; } };
globalThis.TextEditor = { enrichHTML: async t => t };
globalThis.renderTemplate = async () => "";
globalThis.game = { user: { id: "u1", isGM: false, targets: new Set() }, users: [], actors: [], combat: null, packs: { get: () => null },
  release: { generation: 12 }, i18n: { localize: k => k, format: (k, d) => `${k} ${JSON.stringify(d)}` }, settings: { get: () => null } };
globalThis.canvas = { tokens: { controlled: [] } };

const { consumirTemporarios, novosTemporarios, calcularAplicacao } = await import("../module/dano-aplicacao.mjs");
const { aplicarNosSelecionados } = await import("../module/dano.mjs");
const { concederPVTemporarios, limparPVTemporarios, origemDoEfeito } = await import("../module/pv-temporarios.mjs");
const { FIM_DA_CENA } = await import("../module/condicoes-foundry.mjs");
await import("../module/classes/comum.mjs");
await import("../module/classes/anatema.mjs");
await import("../module/classes/mistico.mjs");
await import("../module/classes/druida.mjs");
const { GANCHOS_DE_PODER } = await import("../module/acoes.mjs");
const { ACOES_DE_MECANICA } = await import("../module/classes.mjs");

/** Ator simulado com PV, PV temporários e efeitos. */
function ator({ pv = 20, max = 30, temp = 0, classe = "anatema", nivel = 15, itens = [] } = {}) {
  const flags = { "icarus-rpg": {} };
  const system = { nivel, identidade: { classe }, pv: { value: pv, max, temp }, pm: { value: 20, max: 20 },
    resistencias: { rdGeral: 0, reducao: {}, imunidade: {}, vulnerabilidade: {} }, atributos: { SAB: { total: 2 } }, reacao: { disponivel: true } };
  const a = {
    name: "Alvo", uuid: "Actor.a", documentName: "Actor", isOwner: true, flags, system, effects: [], statuses: new Set(),
    items: itens.map(id => ({ type: "poder", name: id, system: {}, flags: { "icarus-rpg": { id, classe } } })),
    getFlag: (_s, k) => flags["icarus-rpg"][k], async setFlag(_s, k, v) { flags["icarus-rpg"][k] = v; }, async unsetFlag(_s, k) { delete flags["icarus-rpg"][k]; },
    async update(m) {
      for (const [k, v] of Object.entries(m)) {
        if (k.startsWith("flags.icarus-rpg.-=")) delete flags["icarus-rpg"][k.slice(19)];
        else if (k.startsWith("flags.icarus-rpg.")) flags["icarus-rpg"][k.slice(17)] = v;
        else if (k.startsWith("system.")) { const p = k.slice(7).split("."); p.slice(0, -1).reduce((o, x) => o[x], system)[p.at(-1)] = v; }
      }
    },
    async createEmbeddedDocuments(t, lista) {
      const criados = lista.map((d, i) => ({ ...d, id: `e${a.effects.length + i}`, parent: a }));
      if (t === "ActiveEffect") a.effects.push(...criados);
      return criados;
    },
    async deleteEmbeddedDocuments(_t, ids) { a.effects = a.effects.filter(e => !ids.includes(e.id)); }
  };
  return a;
}

test("Regra: o dano consome primeiro os temporários; não se acumulam (vale o maior)", () => {
  assert.deepEqual(consumirTemporarios(10, 6), { usados: 6, resto: 4, temp: 0 });
  assert.deepEqual(consumirTemporarios(3, 6), { usados: 3, resto: 0, temp: 3 });
  assert.deepEqual(consumirTemporarios(5, 0), { usados: 0, resto: 5, temp: 0 });
  assert.deepEqual(novosTemporarios(8, 5), { valor: 8, trocou: false });
  assert.deepEqual(novosTemporarios(5, 8), { valor: 8, trocou: true });
  const cura = calcularAplicacao({ acao: "cura", componentes: [{ tipo: "dano", valor: 50 }], pv: { value: 10, max: 30, temp: 4 } });
  assert.equal(cura.depois, 30, "cura só nos PV, até o máximo");
});

test("Aplicar dano: 10 com 6 temporários → temp 0 e PV −4; 3 com 6 → só os temporários; perda de PV não mexe neles", async () => {
  const a = ator({ pv: 20, temp: 6 });
  canvas.tokens.controlled = [{ document: { documentName: "Token", uuid: "Scene.s.Token.t", name: "Alvo", actor: a } }];
  await aplicarNosSelecionados(10, "corte");
  assert.deepEqual([a.system.pv.value, a.system.pv.temp], [16, 0]);
  a.system.pv.temp = 6;
  await aplicarNosSelecionados(3, "corte");
  assert.deepEqual([a.system.pv.value, a.system.pv.temp], [16, 3]);
  await aplicarNosSelecionados(5, "dano", { modo: "perda" });
  assert.deepEqual([a.system.pv.value, a.system.pv.temp], [11, 3], "perda de PV não mexe nos temporários");
  canvas.tokens.controlled = [];
});

test("Conceder: vale o maior e a origem dele; limpar só pela origem; fim da cena e efeito de origem apagam", async () => {
  const a = ator();
  await concederPVTemporarios(a, 8, { origem: "efeito:x", fonte: "Urso" });
  await concederPVTemporarios(a, 5, { fonte: "Pano e Linha" });
  assert.deepEqual([a.system.pv.temp, a.getFlag("icarus-rpg", "pvTempOrigem")], [8, "efeito:x"]);
  assert.match(chat.at(-1).content, /TempMantem/);
  await limparPVTemporarios(a, "efeito:outro");
  assert.equal(a.system.pv.temp, 8, "outra origem não apaga");
  for (const f of ganchos.deleteActiveEffect) f({ id: "x", parent: a, flags: {} }, {}, "u1");
  await new Promise(r => setTimeout(r, 0));
  assert.equal(a.system.pv.temp, 0, "o efeito de origem terminou");
  await concederPVTemporarios(a, 7, { fonte: "Não Caio" });
  for (const f of FIM_DA_CENA) await f(a);
  assert.equal(a.system.pv.temp, 0, "fim da cena");
  const outro = { ...ator(), isOwner: false, name: "Aliado", uuid: "Actor.b" };
  await concederPVTemporarios(outro, 4, { fonte: "Pano e Linha" });
  assert.deepEqual(chat.at(-1).flags["icarus-rpg"].pvTemp, { actorUuid: "Actor.b", valor: 4, origem: "cena", fonte: "Pano e Linha", aplicado: false }, "aliado de outro jogador: botão para o Mestre");
});

test("Não Caio: PV em 1 e 4d8 PV temporários no campo", async () => {
  const a = ator({ pv: 0, itens: ["anatema__nao-caio"] });
  await GANCHOS_DE_PODER.get("anatema__nao-caio").depois(a);
  assert.deepEqual([a.system.pv.value, a.system.pv.temp], [1, 9]);
});

test("Forma Ancestral: 3 × nível PV temporários, que somem quando a Ascensão termina", async () => {
  const a = ator({ classe: "mistico", nivel: 17, itens: ["mistico__harmonia"] });
  a.items.push({ type: "poder", name: "Ascensão", system: { custoPM: 8, acao: "padrao", descricao: "" }, flags: { "icarus-rpg": { id: "mistico__ascensao-espiritual", classe: "mistico", forma: "ancestral" } } });
  respostaDialogo = 8;
  await ACOES_DE_MECANICA.get("mistico:ascensao")(a);
  const efeito = a.effects.find(e => e.flags["icarus-rpg"].mistico === "ascensao");
  assert.deepEqual([a.system.pv.temp, a.getFlag("icarus-rpg", "pvTempOrigem")], [51, origemDoEfeito(efeito)]);
  for (const f of ganchos.deleteActiveEffect) f(efeito, {}, "u1");
  await new Promise(r => setTimeout(r, 0));
  assert.equal(a.system.pv.temp, 0);
});

test("Forma de Urso: 2 × nível PV temporários ligados à Forma; voltar da Forma apaga", async () => {
  const a = ator({ classe: "druida", nivel: 6, itens: ["druida__mudar-de-forma", "druida__forma-de-urso"] });
  a.items.find(i => i.name === "druida__forma-de-urso").system.custoPM = 3;
  a.items.push = Array.prototype.push;
  const criar = a.createEmbeddedDocuments.bind(a);
  a.createEmbeddedDocuments = async (t, l) => (t === "Item" ? l.map((d, i) => ({ ...d, id: `w${i}` })) : criar(t, l));
  respostaDialogo = { forma: "urso", ancestral: false };
  await ACOES_DE_MECANICA.get("druida:forma")(a);
  const efeito = a.effects.find(e => e.flags["icarus-rpg"].forma);
  assert.deepEqual([a.system.pv.temp, a.getFlag("icarus-rpg", "pvTempOrigem")], [12, origemDoEfeito(efeito)]);
  for (const f of ganchos.deleteActiveEffect) f(efeito, {}, "u1");
  await new Promise(r => setTimeout(r, 0));
  assert.equal(a.system.pv.temp, 0);
});
