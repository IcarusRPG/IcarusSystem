/** Lançar magia no Foundry (simulado): débito de PM, cartão, dano rolado com animação, efeitos e Voltar. */
import { test } from "node:test";
import assert from "node:assert/strict";

const avisos = [];
const chat = [];
let falharChat = false;
class AppFalso { constructor(o) { this.options = o; } render() { return this; } }
globalThis.foundry = { applications: { api: { ApplicationV2: AppFalso, HandlebarsApplicationMixin: c => c } }, utils: { deepClone: o => structuredClone(o) } };
globalThis.Hooks = { on() {}, once() {} };
globalThis.ui = { notifications: { warn: m => avisos.push(m), error: m => avisos.push(m), info: m => avisos.push(m) } };
globalThis.renderTemplate = async (_t, d) => JSON.stringify(d);
globalThis.TextEditor = { enrichHTML: async t => t };
globalThis.CONFIG = { sounds: {} };
globalThis.canvas = { scene: { id: "cena" } };
globalThis.Roll = class { constructor(f) { this.formula = f; } async evaluate() { this.total = 21; return this; } };
let n = 0;
globalThis.ChatMessage = {
  create: async d => { if (falharChat) throw new Error("falhou"); const m = { id: `m${++n}`, ...d }; chat.push(m); return m; },
  getSpeaker: () => ({}), applyRollMode() {}
};
globalThis.game = {
  user: { id: "u1", isGM: true, targets: new Set([{ document: { uuid: "Scene.cena.Token.alvo" } }]) },
  users: { activeGM: { isSelf: true } }, combat: null,
  i18n: { localize: k => k, format: k => k },
  settings: { get: () => "publicroll" }
};

const { executarLancamento } = await import("../module/magias.mjs");
const { aplicarEfeitoNoAlvo, htmlDosEfeitos } = await import("../module/magias-efeitos.mjs");
const ator = () => ({
  uuid: "Actor.a", system: { pm: { value: 7, max: 12 }, magia: { cd: 14 } },
  getActiveTokens: () => [{ uuid: "Scene.cena.Token.conj", parent: { id: "cena" } }],
  async update(m) { this.system.pm.value = m["system.pm.value"]; }
});
const magia = (id, extra = {}) => ({
  uuid: `Actor.a.Item.${id}`, name: id, img: `${id}.png`, flags: { "icarus-rpg": { id } },
  system: { nivel: 3, custoPM: 6, escola: "Evocação", execucao: "padrão", alcance: "longo", alvo: "esfera", duracao: "instantânea",
    resistencia: "Reflexos reduz à metade", descricao: "<p>6d6</p>", aprimoramentos: [{ custo: 1, texto: "+1d6" }, { custo: 2, texto: "Em Chamas" }] },
  ...extra
});

test("Lançar Bola de Fogo: debita, cartão com CD e dano rolado (6d6+1d6 fogo) com a animação de explosão", async () => {
  chat.length = 0;
  const a = ator();
  const cartao = await executarLancamento(a, magia("bola-de-fogo"), [0]);
  assert.equal(a.system.pm.value, 0);
  assert.deepEqual([cartao.flags["icarus-rpg"].magia.cd, cartao.flags["icarus-rpg"].magia.custo], [14, 7]);
  const dano = chat.find(m => m.flags["icarus-rpg"].dano);
  assert.ok(dano, "mensagem de dano criada");
  assert.equal(dano.rolls[0].formula, "6d6+1d6");
  assert.deepEqual(dano.flags["icarus-rpg"].dano.componentes, [{ tipo: "fogo", valor: 21 }]);
  const vfx = dano.flags["icarus-rpg"].magiaVfx;
  assert.deepEqual([vfx.preset, vfx.elemento, vfx.origem, vfx.alvos], ["explosao", "fogo", "Scene.cena.Token.conj", ["Scene.cena.Token.alvo"]]);
});

test("Magia de cura rola a cura; magia só de texto só manda o cartão", async () => {
  chat.length = 0;
  await executarLancamento(ator(), magia("curar-ferimentos", { system: { ...magia("x").system, custoPM: 1, aprimoramentos: [] } }), []);
  assert.equal(chat.find(m => m.flags["icarus-rpg"].dano)?.flags["icarus-rpg"].dano.rollType, "cura");
  chat.length = 0;
  await executarLancamento(ator(), magia("detectar-magia", { system: { ...magia("x").system, custoPM: 1, aprimoramentos: [] } }), []);
  assert.equal(chat.length, 1);
});

test("PM insuficiente: não debita nem cria cartão; erro no cartão devolve o PM", async () => {
  const a = ator();
  chat.length = 0;
  assert.equal(await executarLancamento(a, magia("bola-de-fogo"), [0, 1]), null);
  assert.equal(a.system.pm.value, 7);
  assert.equal(chat.length, 0);
  falharChat = true;
  assert.equal(await executarLancamento(a, magia("bola-de-fogo"), []), null);
  falharChat = false;
  assert.equal(a.system.pm.value, 7);
});

/** Ator com efeitos (Collection simulada). */
function atorComEfeitos() {
  const efeitos = new Map();
  let id = 0;
  const a = {
    name: "Alvo", uuid: "Actor.alvo", statuses: new Set(),
    effects: Object.assign([], { get: k => efeitos.get(k), has: k => efeitos.has(k) }),
    async createEmbeddedDocuments(_t, lista) {
      return lista.map(d => {
        const e = { ...d, id: `e${++id}`, disabled: !!d.disabled, async update(m) { Object.assign(this, m); }, async setFlag() {} };
        efeitos.set(e.id, e); a.effects.push(e); return e;
      });
    },
    async deleteEmbeddedDocuments(_t, ids) { for (const i of ids) { efeitos.delete(i); a.effects.splice(a.effects.findIndex(e => e.id === i), 1); } }
  };
  return a;
}
const base = { actorUuid: "Actor.a", itemUuid: "Actor.a.Item.x", mensagemId: "m1" };

test("Armadura Arcana: Efeito Ativo com ícone e +4 na Defesa; outra magia de Defesa menor fica desligada; não duplica", async () => {
  const alvo = atorComEfeitos();
  const acao = { tipo: "efeito", alvo: "pessoal", duracao: { tipo: "cena" }, mudancas: [{ chave: "defesa", valor: 4, modo: "somar", grupoAcumulo: "defesa-magia" }] };
  const r = await aplicarEfeitoNoAlvo(alvo, acao, { ...base, id: "armadura-arcana", nome: "Armadura Arcana", img: "aa.png" }, "u1");
  const ef = alvo.effects[0];
  assert.deepEqual(ef.changes, [{ key: "system.defesa.outros", mode: 2, value: "4" }]);
  assert.equal(ef.img, "aa.png");
  assert.deepEqual(ef.statuses, ["icarus-magia-armadura-arcana"]);
  assert.equal(ef.flags["icarus-rpg"].duracao, "cena");
  assert.equal(r.criados.length, 1);
  assert.equal(await aplicarEfeitoNoAlvo(alvo, acao, { ...base, id: "armadura-arcana", nome: "Armadura Arcana", img: "aa.png" }, "u1"), null, "não duplica");
  // Escudo da Fé +2: menor, entra desligado (vale o maior)
  const menor = { ...acao, mudancas: [{ chave: "defesa", valor: 2, modo: "somar", grupoAcumulo: "defesa-magia" }] };
  await aplicarEfeitoNoAlvo(alvo, menor, { ...base, id: "escudo-da-fe", nome: "Escudo da Fé", img: "ef.png" }, "u1");
  assert.equal(alvo.effects[1].disabled, true);
  // Uma de +6: maior, desliga a de +4
  const maior = { ...acao, mudancas: [{ chave: "defesa", valor: 6, modo: "somar", grupoAcumulo: "defesa-magia" }] };
  const r3 = await aplicarEfeitoNoAlvo(alvo, maior, { ...base, id: "outra", nome: "Outra", img: "o.png" }, "u1");
  assert.equal(alvo.effects[0].disabled, true);
  assert.deepEqual(r3.desligados, [alvo.effects[0].id]);
});

test("Botões do cartão: Aplicar condição com a dica do teste; Voltar só para o Mestre ou quem aplicou", () => {
  const efeitos = [{ condicoes: ["fascinado"], resistencia: { atributo: "vontade", efeito: "anula" } }];
  const html = htmlDosEfeitos(efeitos, [{ alvo: "Goblin", usuario: "u2", desfeita: false }], { mestre: false, usuario: "u1" });
  assert.match(html, /ICARUS\.Magias\.Efeitos\.AplicarCondicao/);
  assert.doesNotMatch(html, /data-icarus-voltar-efeito/);
  assert.match(htmlDosEfeitos(efeitos, [{ alvo: "Goblin", usuario: "u1", desfeita: false }], { usuario: "u1" }), /data-icarus-voltar-efeito/);
  assert.match(htmlDosEfeitos(efeitos, [{ alvo: "Goblin", usuario: "u2", desfeita: false }], { mestre: true }), /data-icarus-voltar-efeito/);
});
