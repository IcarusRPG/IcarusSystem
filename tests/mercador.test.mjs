/** Mercador com as regras do personagem (0.35.0): conversão dos antigos, perícias, Defesa, poderes e ataques. */
import { test } from "node:test";
import assert from "node:assert/strict";

const chat = [];
globalThis.foundry = { utils: { deepClone: o => structuredClone(o), getProperty: (o, p) => p.split(".").reduce((a, k) => a?.[k], o), setProperty() {} },
  applications: { api: { DialogV2: {}, ApplicationV2: class {}, HandlebarsApplicationMixin: c => c } } };
globalThis.Handlebars = { escapeExpression: t => String(t ?? "") };
globalThis.Hooks = { on() {}, once() {} };
globalThis.ui = { notifications: { warn() {}, info() {} } };
globalThis.CONFIG = { sounds: { dice: "" }, statusEffects: [] };
globalThis.renderTemplate = async (_t, dados) => JSON.stringify(dados);
globalThis.ChatMessage = { create: async d => { chat.push(d); return d; }, getSpeaker: ({ actor } = {}) => ({ actor: actor?.id }), applyRollMode() {} };
globalThis.Roll = class {
  constructor(f) { this.formula = f; }
  async evaluate() { this.total = 15; this.dice = [{ results: [{ result: 12 }] }]; return this; }
};
globalThis.game = { user: { id: "u", isGM: true, targets: new Set() }, users: [], actors: [], settings: { get: () => false }, i18n: { localize: k => k, format: k => k } };

const M = await import("../module/mercador-dados.mjs");
const { derivarPersonagem } = await import("../module/derivar.mjs");
const { sistemaCompleto } = await import("./simulacao.mjs");
const { migrarMercadoresParaPersonagem } = await import("../module/migracoes.mjs");
const { itensDoAtor, executarAtaque } = await import("../module/combate-chat.mjs");
const { PERICIAS } = await import("../module/config.mjs");

const F = "icarus-rpg";
const antigo = () => ({
  nivel: 0, defesa: 14, pv: { value: 8, max: 12 }, pm: { value: 2, max: 2 },
  atributos: { FOR: 1, DES: 2, CON: 0, INT: 0, SAB: 1, CAR: 3 },
  pericias: [{ nome: "Barganha", bonus: 7 }, { nome: "intimidação", bonus: 3 }, { nome: "Lábia Antiga", bonus: 4 }, { nome: "", bonus: 1 }],
  habilidades: [{ nome: "Olho Clínico", descricao: "Sabe o preço de tudo." }], notas: "<p>Velho conhecido.</p>",
  loja: { aberta: true }, caixa: { real: 5 }
});

test("Conversão do mercador antigo: atributos viram base, Defesa digitada vira 'Defesa manual', perícias por chave e o resto nas notas", () => {
  const s = M.converterMercadorAntigo(antigo());
  assert.deepEqual(s.atributos.CAR, { base: 3, racial: 0, temp: 0 });
  assert.deepEqual([s.defesa, s.defesaManual], [{ outros: 0 }, { ativo: true, valor: 14 }]);
  assert.deepEqual(s.pericias.barganha, { treino: 1, outros: 2, atributo: "CAR" }, "7 = CAR 3 + treinado 2 + outros 2");
  assert.deepEqual(s.pericias.intimidacao, { treino: 0, outros: 0, atributo: "CAR" }, "3 = CAR 3");
  assert.match(s.notas, /Velho conhecido.*Lábia Antiga \+4/s);
  assert.equal(s.nivel, 1, "nível mínimo do personagem");
  assert.equal(s.classeConfig.manual, true, "PV e PM digitados");
  assert.equal(s.habilidades.length, 1, "habilidades ficam para a migração criar os poderes");
  assert.deepEqual(s.proficiencias.armaduras, ["leve", "media", "pesada"]);
  // Idempotente: rodar de novo não muda nada
  const de_novo = M.converterMercadorAntigo(structuredClone(s));
  assert.deepEqual(de_novo, s);
  assert.equal(M.ehMercadorAntigo(s), false);
});

test("Perícia do mercador = a do personagem com os mesmos dados (o total antigo se mantém)", () => {
  const s = M.converterMercadorAntigo(antigo());
  const pericias = Object.fromEntries(PERICIAS.map(p => [p.chave, { treino: 0, outros: 0, atributo: p.atributo, ...(s.pericias[p.chave] ?? {}) }]));
  const mercador = derivarPersonagem(sistemaCompleto({ ...s, pericias }), []);
  const personagem = derivarPersonagem(sistemaCompleto({ atributos: { CAR: { base: 3 } }, pericias: { ...pericias } }), []);
  assert.equal(mercador.pericias.barganha.total, 7);
  assert.equal(mercador.pericias.barganha.total, personagem.pericias.barganha.total);
  assert.equal(mercador.pericias.intimidacao.total, 3);
  assert.equal(M.chaveDaPericiaPorNome("Prestidigitação"), "prestidigitacao");
  assert.equal(M.chaveDaPericiaPorNome("Lábia"), null);
});

test("Defesa derivada com armadura, escudo e DES; o estoque da loja não entra na Defesa nem nos ataques", () => {
  const armadura = (loja = null) => ({ type: "equipamento", name: "Couro", system: { tipo: "armadura", categoria: "leve", equipado: true, bonusDefesa: 2, penalidade: 0 }, flags: loja ? { [F]: { loja } } : {} });
  const escudo = { type: "equipamento", name: "Escudo", system: { tipo: "escudo", equipado: true, bonusDefesa: 1, penalidade: 0 }, flags: {} };
  const base = () => sistemaCompleto({ atributos: { DES: { base: 2 } }, classeConfig: { manual: true } });
  assert.equal(derivarPersonagem(base(), [armadura(), escudo]).defesa.total, 10 + 2 + 2 + 1);
  const comEstoque = [armadura({ venda: true, quantidade: 1 }), escudo].filter(i => !M.ehEstoque(i));
  assert.equal(derivarPersonagem(base(), comEstoque).defesa.total, 10 + 2 + 1, "a armadura à venda não protege o mercador");
  const ator = { items: [{ id: "a", type: "municao", system: { tipo: "flechas", quantidade: 20 }, flags: { [F]: { loja: { venda: true } } } }, { id: "b", type: "arma", system: {}, flags: {} }] };
  assert.deepEqual(itensDoAtor(ator).map(i => i.id), ["b"], "munição do estoque não é gasta pelo mercador");
  assert.equal(M.ehEstoque({ flags: { [F]: { loja: { venda: false } } } }), false);
});

test("Migração 0.35.0: habilidades viram itens 'poder', o formato novo é gravado e rodar de novo não duplica", async () => {
  const criados = [];
  const atualizacoes = [];
  const sistema = M.converterMercadorAntigo(antigo());
  const ator = {
    type: "mercador", toObject: () => ({ system: structuredClone(sistema) }),
    async createEmbeddedDocuments(_t, l) { criados.push(...l); },
    async update(d, o) { atualizacoes.push([d, o]); sistema.habilidades = d.system.habilidades; }
  };
  assert.equal(await migrarMercadoresParaPersonagem([ator, { type: "personagem" }]), 1);
  assert.deepEqual(criados.map(c => [c.name, c.type, c.system.descricao]), [["Olho Clínico", "poder", "<p>Sabe o preço de tudo.</p>"]]);
  assert.deepEqual(atualizacoes[0][1], { diff: false, recursive: false });
  assert.deepEqual(atualizacoes[0][0].system.habilidades, []);
  assert.equal(atualizacoes[0][0].system.defesaManual.valor, 14);
  await migrarMercadoresParaPersonagem([ator]);
  assert.equal(criados.length, 1, "idempotente: sem habilidades, nenhum poder novo");
});

test("Ataque com a arma empunhada do mercador gera a mensagem de ataque com as flags certas", async () => {
  const s = derivarPersonagem(sistemaCompleto({ atributos: { FOR: { base: 2 } }, pericias: { luta: { treino: 1 } }, classeConfig: { manual: true } }), []);
  s.proficiencias = { ...M.PROFICIENCIAS_DO_MERCADOR };
  const espada = { id: "espada", name: "Espada curta", img: "", type: "arma",
    system: { grupo: "corpo-a-corpo", categoria: "marcial", empunhadura: "leve", dano: "1d6", tiposDano: ["corte"], propriedades: [], criticoMargem: 19, criticoMult: 2,
      alcance: "corpo-a-corpo", empunhada: true, proficiente: true, quantidade: 1, bonusAtaque: 0, bonusDano: 0, modos: ["corpo-a-corpo"] }, flags: {} };
  const estoque = { id: "venda", type: "arma", name: "Adaga", system: { empunhada: true }, flags: { [F]: { loja: { venda: true } } } };
  const items = Object.assign([espada, estoque], { get: id => items.find(i => i.id === id) });
  const mercador = { id: "m", uuid: "Actor.m", type: "mercador", name: "Ferreiro", system: s, items, flags: {} };
  const r = await executarAtaque(mercador, espada, "corpo-a-corpo", {});
  const flags = chat.at(-1).flags[F].ataque;
  assert.deepEqual([flags.actorUuid, flags.itemId, flags.modo], ["Actor.m", "espada", "corpo-a-corpo"]);
  assert.equal(r.total, 12 + s.pericias.luta.total, "d20 + Luta do mercador");
});
