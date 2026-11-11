/** Paladino: PV/PM, Fé Jurada (2 de 3), Punição, Toque Restaurador, Voto, Preces de Guerra e poderes. */
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
globalThis.game = { user: { id: "u1", isGM: false, targets: new Set() }, users: [], actors: [], release: { generation: 12 }, i18n: { localize: k => k, format: k => k }, settings: { get: () => null } };

const { classePorId, pmDaLinhagem, gruposEscolhidos, validarPoder, habilidadesAteNivel, proficienciasDaClasse } = await import("../module/classes-dados.mjs");
const { derivarPersonagem } = await import("../module/derivar.mjs");
const { sistemaCompleto } = await import("./simulacao.mjs");
const { nivelMaximoDaClasse, motivoParaNaoAprender, limiteDeMagiasDoPaladino, atributoDeMagia } = await import("../module/magias-dados.mjs");
const { limiteDaPunicao, planoDaPunicao, planoDoToque, dadosDoToque, jaCuradoNaCena, bonusDaAura, raioDaAura, reducaoDoCorpoEscudo, pvDaHoraFinal } = await import("../module/paladino-dados.mjs");
await import("../module/classes/comum.mjs");
await import("../module/classes/clerigo.mjs");
await import("../module/classes/paladino.mjs");
const { resolverEscolha } = await import("../module/escolhas.mjs");
const { GANCHOS_DE_PODER } = await import("../module/acoes.mjs");
const { idDeClasse } = await import("../module/dados-compendios.mjs");
const { poderesDaDivindade } = await import("../module/panteao.mjs");

const paladino = classePorId("paladino");

test("Critério 11: PV nível 5 com CON +1 = 39; PM nível 5 = 20 (fixo, sem atributo); CD das magias com Carisma", () => {
  const s = derivarPersonagem(sistemaCompleto({
    nivel: 5, identidade: { classe: "paladino" }, magia: { atributo: "" },
    atributos: { CON: { base: 1 }, CAR: { base: 3 } },
    classeConfig: { pvInicial: 18, pvPorNivel: 4, pvAtributo: "CON", ...pmDaLinhagem(paladino, null) }
  }), []);
  assert.deepEqual([s.pv.max, s.pm.max], [39, 20]);
  assert.equal(atributoDeMagia(s), "CAR");
  assert.equal(s.magia.cd, 10 + 2 + 3);
  assert.deepEqual(proficienciasDaClasse("paladino"), { armas: ["simples", "marciais"], armaduras: ["pesada"], escudo: true, tunicas: false });
  assert.deepEqual([paladino.habilidades.length, paladino.poderes.length], [19, 30]);
});

test("Critério 11: Punição Consagrada respeita 1/2/3/4/5 por ataque (+1 contra a sentenciada; sem limite na Hora Final)", () => {
  assert.deepEqual([1, 4, 5, 9, 10, 15, 20].map(n => limiteDaPunicao(n)), [1, 1, 2, 2, 3, 4, 5]);
  assert.equal(limiteDaPunicao(5, { sentenciada: true }), 3);
  assert.equal(limiteDaPunicao(5, { horaFinal: true }), null);
  assert.deepEqual(planoDaPunicao(9, 5), { pm: 2, partes: [{ formula: "2d6", tipo: "essencia" }] }, "corta no limite");
  assert.equal(planoDaPunicao(1, 1, { mortoVivo: true }).partes[0].formula, "1d8");
  assert.equal(planoDaPunicao(2, 5, { lamina: true }).partes[0].formula, "2d8");
  assert.equal(planoDaPunicao(2, 5, { lamina: true, mortoVivo: true }).partes[0].formula, "2d10");
  assert.equal(planoDaPunicao(7, 5, { horaFinal: true }).pm, 7);
  assert.equal(planoDaPunicao(1, 5, { golpeFinal: true }).partes.length, 2);
});

test("Critério 11: Toque Restaurador 2 PM (1 com Mãos Abertas), 1d8 + CAR no 2º e 3d8 + CAR no 9º; uma vez por cena por criatura", () => {
  assert.deepEqual([2, 5, 9, 13, 17].map(dadosDoToque), [1, 2, 3, 4, 5]);
  assert.deepEqual(planoDoToque(2, 3), { custo: 2, formula: "1d8 + 3" });
  assert.deepEqual(planoDoToque(9, 3), { custo: 2, formula: "3d8 + 3" });
  assert.equal(planoDoToque(2, 3, { maosAbertas: true }).custo, 1);
  assert.equal(planoDoToque(2, -1).formula, "1d8 + 1", "Carisma: mínimo +1");
  assert.deepEqual(planoDoToque(9, 2, { alivio: true, remedio: true }), { custo: 6, formula: "6d8 + 2" });
  assert.equal(jaCuradoNaCena(["Actor.a"], "Actor.a"), true);
  assert.equal(jaCuradoNaCena(["Actor.a"], "Actor.b"), false);
});

test("Critério 11: o Voto escolhido libera só as habilidades e os poderes dele", () => {
  const ids = escolhas => habilidadesAteNivel(paladino, 20, escolhas).map(h => h.id);
  assert.ok(ids({ voto: 2 }).includes("veredito"));
  assert.ok(!ids({ voto: 2 }).includes("aurora-de-esperanca"));
  assert.ok(!ids({}).some(id => ["interpor-se", "maos-abertas", "olhar-do-juiz"].includes(id)), "sem Voto, nenhuma");
  const ctx = escolhas => ({ nivel: 20, atributos: { FOR: 5, DES: 5, CON: 5, INT: 5, SAB: 5, CAR: 5 }, treino: {}, tem: new Set(), grupos: gruposEscolhidos(paladino, escolhas) });
  const visiveis = escolhas => paladino.poderes.filter(p => validarPoder(paladino, p, ctx(escolhas)).visivel).map(p => p.id);
  assert.ok(visiveis({ voto: 0 }).includes("corpo-escudo"));
  assert.ok(!visiveis({ voto: 0 }).includes("lamina-de-essencia"));
  assert.ok(visiveis({ voto: 2 }).includes("lamina-de-essencia"));
  assert.ok(visiveis({ voto: 1 }).includes("preces-de-guerra"), "poderes gerais para todos");
});

test("Critério 11: Preces de Guerra — sem ela não lança; 2 magias por escolha; nível 12 até o 2º, 3º só no 13º, nunca o 5º", () => {
  assert.deepEqual([4, 5, 8, 9, 12, 13, 17, 20].map(n => nivelMaximoDaClasse("paladino", n)), [0, 1, 1, 2, 2, 3, 4, 4]);
  assert.deepEqual([limiteDeMagiasDoPaladino(0), limiteDeMagiasDoPaladino(1), limiteDeMagiasDoPaladino(2)], [0, 2, 4]);
  const p = { nivel: 12, tradicao: "divina", conhecidas: 0, limite: 2, max: nivelMaximoDaClasse("paladino", 12) };
  assert.equal(motivoParaNaoAprender({ nivel: 2, tradicoes: ["divina"] }, p), null);
  assert.equal(motivoParaNaoAprender({ nivel: 3, tradicoes: ["divina"] }, p).chave, "ICARUS.Magias.Conhecidas.Nivel");
  assert.equal(motivoParaNaoAprender({ nivel: 1, tradicoes: ["arcana"] }, p).chave, "ICARUS.Magias.Conhecidas.Tradicao");
});

/** Ator simulado (Paladino). */
function ator(nivel = 5) {
  const flags = { "icarus-rpg": {} };
  const system = { nivel, identidade: { classe: "paladino", divindade: "" }, pm: { value: 20, max: 20 }, pv: { value: 10, max: 40 }, pericias: {}, atributos: { CAR: { total: 3 } } };
  const a = {
    name: "Paladina", uuid: "Actor.p", type: "personagem", flags, system, items: [], effects: [],
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
      const criados = lista.map((d, i) => ({ ...d, id: `i${a.items.length + i}`, flags: d.flags ?? {},
        async update(m) { for (const [k, v] of Object.entries(m)) if (k.startsWith("flags.icarus-rpg.")) this.flags["icarus-rpg"][k.slice(17)] = v; else if (k === "name") this.name = v; } }));
      if (t === "Item") a.items.push(...criados); else a.effects.push(...criados);
      return criados;
    },
    async deleteEmbeddedDocuments(_t, ids) { a.items = a.items.filter(i => !ids.includes(i.id)); }
  };
  a._source = { system };
  return a;
}
const itemDe = (a, id) => a.createEmbeddedDocuments("Item", [{ type: "poder", name: id, system: { fonte: "classe", tipoPoder: "habilidade", classe: "paladino" }, flags: { "icarus-rpg": { id: idDeClasse("paladino", id), classe: "paladino" } } }]).then(r => r[0]);

test("Critério 11: Fé Jurada do Paladino concede 2 dos 3 Poderes Concedidos, à escolha (permanente)", async () => {
  const a = ator();
  const fe = await itemDe(a, "fe-jurada");
  const [p1, , p3] = poderesDaDivindade("justar");
  respostaDialogo = cfg => {
    const b = cfg.buttons[0];
    if (cfg.content.includes("select")) return b.callback(null, { form: { elements: { divindade: { value: "justar" } } } });
    return b.callback(null, { form: { querySelectorAll: () => [{ value: p1.id }, { value: p3.id }] } });
  };
  assert.equal(await resolverEscolha(a, fe), true);
  assert.equal(a.system.identidade.divindade, "justar");
  assert.deepEqual(a.items.filter(i => i.flags["icarus-rpg"].concedido).map(i => i.flags["icarus-rpg"].id).sort(), [p1.id, p3.id].sort());
  assert.equal(await resolverEscolha(a, fe), false, "permanente para o jogador");
});

test("Critério 11: Retribuição só com criatura marcada; Fôlego da Fé cura só o próprio Paladino (1 vez por cena)", async () => {
  const a = ator();
  assert.equal(GANCHOS_DE_PODER.get("paladino__retribuicao").antes(a), false);
  assert.ok(avisos.includes("ICARUS.Paladino.SemMarca"));
  await a.setFlag("icarus-rpg", "marca", { uuid: "Actor.x", nome: "Ogro" });
  assert.equal(GANCHOS_DE_PODER.get("paladino__retribuicao").antes(a), undefined);
  // Fôlego: a rolagem simulada (1d8 + nível) dá 5, curada no próprio Paladino, mesmo com aliado marcado
  game.user.targets = new Set([{ name: "Aliado", actor: { uuid: "Actor.aliado", system: { pv: { value: 1, max: 30 } } } }]);
  await GANCHOS_DE_PODER.get("paladino__folego-da-fe").depois(a);
  assert.equal(a.system.pv.value, 15);
  assert.equal(GANCHOS_DE_PODER.get("paladino__folego-da-fe").antes(a), false, "uma vez por cena");
  game.user.targets = new Set();
});

test("Hora Final: na primeira vez que cairia a 0, fica com 1 PV; Corpo Escudo reduz 1 + nível; Aura +1 (+2 no 13º)", () => {
  assert.equal(pvDaHoraFinal(0, { ativa: true, salvou: false }), 1);
  assert.equal(pvDaHoraFinal(0, { ativa: true, salvou: true }), null);
  assert.equal(pvDaHoraFinal(5, { ativa: true }), null);
  assert.equal(pvDaHoraFinal(0, null), null);
  const a = ator(20);
  a.flags["icarus-rpg"].horaFinal = { ativa: true, salvou: false };
  const mudancas = { "system.pv.value": 0 };
  for (const fn of ganchos.preUpdateActor) fn(a, mudancas, {}, "u1");
  assert.equal(mudancas["system.pv.value"], 1);
  assert.equal(mudancas["flags.icarus-rpg.horaFinal.salvou"], true);
  assert.equal(reducaoDoCorpoEscudo(5), 6);
  assert.deepEqual([bonusDaAura(12), bonusDaAura(13), raioDaAura(false), raioDaAura(true)], [1, 2, 3, 6]);
});

test("Coragem Inabalável: Abalado e Apavorado não pegam no Paladino; outras condições sim", async () => {
  const a = ator(10);
  await itemDe(a, "coragem-inabalavel");
  const pre = statuses => ganchos.preCreateActiveEffect.map(fn => fn({ parent: a, statuses: new Set(statuses) }, {}, {}, "u1")).find(r => r === false);
  assert.equal(pre(["abalado"]), false);
  assert.equal(pre(["apavorado"]), false);
  assert.equal(pre(["caido"]), undefined);
});

test("Preces de Guerra: sem o poder, o jogador não aprende magia; com uma, aprende 2 Divinas do nível que alcança", async () => {
  const a = ator(9);
  const magia = (nivel, tradicoes) => ({ type: "magia", parent: a, system: { nivel, tradicoes } });
  const pre = item => ganchos.preCreateItem.map(fn => fn(item, {}, {}, "u1")).find(r => r === false);
  assert.equal(pre(magia(1, ["divina"])), false);
  assert.ok(avisos.includes("ICARUS.Paladino.SemPreces"));
  a.items.push({ type: "poder", flags: { "icarus-rpg": { id: "paladino__preces-de-guerra", magiasExtras: 2 } } });
  assert.equal(pre(magia(2, ["divina"])), undefined);
  assert.equal(pre(magia(3, ["divina"])), false, "9º nível: até o 2º");
  a.items.push({ type: "magia", flags: {} }, { type: "magia", flags: {} });
  assert.equal(pre(magia(1, ["divina"])), false, "limite 2");
});

test("Último Aviso: +4 só no primeiro ataque contra cada sentenciada na cena; outra sentenciada ganha de novo; o fim da cena zera", async () => {
  const { MODIFICADORES_ATAQUE } = await import("../module/combate-chat.mjs");
  const { FIM_DA_CENA } = await import("../module/condicoes-foundry.mjs");
  const a = ator(9);
  await itemDe(a, "ultimo-aviso");
  const alvo = uuid => [{ token: { actor: { uuid } } }];
  const ataque = async uuid => (await Promise.all(MODIFICADORES_ATAQUE.map(m => m({ actor: a, item: { type: "arma", system: {} }, modo: "distancia", opcoes: {}, alvos: alvo(uuid) }))))
    .find(x => x?.linhas?.includes("ICARUS.Paladino.ContraSentenciada"));
  await a.setFlag("icarus-rpg", "sentenciada", { uuid: "Actor.ogro", nome: "Ogro" });
  assert.equal((await ataque("Actor.ogro")).extrasDano.length, 1, "primeiro ataque: +4");
  assert.equal((await ataque("Actor.ogro")).extrasDano.length, 0, "segundo: nada");
  await a.setFlag("icarus-rpg", "sentenciada", { uuid: "Actor.troll", nome: "Troll" });
  assert.deepEqual((await ataque("Actor.troll")).extrasDano.map(e => e.formula), ["4"], "nova sentenciada: +4 de novo");
  for (const fn of FIM_DA_CENA) await fn(a);
  await a.setFlag("icarus-rpg", "sentenciada", { uuid: "Actor.ogro", nome: "Ogro" });
  assert.equal((await ataque("Actor.ogro")).extrasDano.length, 1, "cena nova: +4 de novo");
});

test("Dívida Paga é ganho de PM: sem custo no JSON (o '2 PM' era do texto)", () => {
  assert.ok(!paladino.habilidades.find(h => h.id === "divida-paga").custoPM);
});
