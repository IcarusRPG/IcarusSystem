/** Arcanista: foco arcano, magias conhecidas, escolas, Pacto de Sangue e Canalização Arcana. */
import { test } from "node:test";
import assert from "node:assert/strict";

const avisos = [];
const chat = [];
class AppFalso { constructor(o) { this.options = o; } render() { return this; } }
globalThis.foundry = { applications: { api: { ApplicationV2: AppFalso, HandlebarsApplicationMixin: c => c } }, utils: { deepClone: o => structuredClone(o) } };
globalThis.Hooks = { on() {}, once() {} };
globalThis.ui = { notifications: { warn: m => avisos.push(m), error: m => avisos.push(m), info() {} } };
globalThis.renderTemplate = async (_t, d) => JSON.stringify(d);
globalThis.TextEditor = { enrichHTML: async t => t };
globalThis.CONFIG = { sounds: {} };
globalThis.canvas = { scene: { id: "cena" } };
globalThis.Roll = class { constructor(f) { this.formula = f; } async evaluate() { this.total = 10; return this; } };
let n = 0;
globalThis.ChatMessage = { create: async d => { const m = { id: `m${++n}`, ...d }; chat.push(m); return m; }, getSpeaker: () => ({}), applyRollMode() {} };
globalThis.game = { user: { id: "u1", isGM: false, targets: new Set() }, users: { activeGM: { isSelf: true } }, i18n: { localize: k => k, format: k => k }, settings: { get: () => "publicroll" } };

const { executarLancamento, custoFinal } = await import("../module/magias.mjs");
const { focoEmpunhado, objetoDoItem, mudancasDoDanoNoItem, danoNoObjeto, defesaDoObjeto } = await import("../module/objetos-dados.mjs");
const { limiteDeMagiasConhecidas, motivoParaNaoAprender, maximoDoPacto, ajustesDoArcanista } = await import("../module/magias-dados.mjs");

const LINHAGEM = { mago: 0, feiticeiro: 1, sangue: 2 };
/** Arcanista simulado (linhagem, itens, PV/PM). */
function arcanista(linhagem, itens = [], { pm = 20, pv = 30, INT = 3, CAR = 2, focoLiberado = false } = {}) {
  const flags = { escolhasClasse: { linhagem: LINHAGEM[linhagem] }, focoLiberado };
  return {
    name: "Ana", uuid: "Actor.a", items: itens,
    system: { identidade: { classe: "arcanista" }, nivel: 5, pm: { value: pm, max: 30 }, pv: { value: pv, max: 33 },
      atributos: { INT: { total: INT }, CAR: { total: CAR } }, magia: { cd: 15, atributoEfetivo: linhagem === "feiticeiro" ? "CAR" : "INT" } },
    getFlag: (_s, k) => flags[k],
    getActiveTokens: () => [],
    async update(m) { if ("system.pm.value" in m) this.system.pm.value = m["system.pm.value"]; if ("system.pv.value" in m) this.system.pv.value = m["system.pv.value"]; }
  };
}
const habilidade = id => ({ type: "poder", flags: { "icarus-rpg": { id: `arcanista__${id}` } } });
const foco = (extra = {}) => ({ type: "equipamento", name: "Cetro de metal", system: { tipo: "foco", equipado: true }, flags: { "icarus-rpg": { focoArcano: { material: "metal" }, objeto: { rd: 10, pvMax: 5, tamanho: "minusculo" }, pvObjeto: 5, ...extra } } });
const bolaDeFogo = { uuid: "I.b", name: "Bola de Fogo", img: "", flags: { "icarus-rpg": { id: "bola-de-fogo" } },
  system: { nivel: 3, custoPM: 6, escola: "Evocação", execucao: "", alcance: "longo", alvo: "", duracao: "instantânea", resistencia: "", descricao: "", aprimoramentos: [] } };

test("Critério 6: Mago sem foco não lança; com foco em mãos lança; Feiticeiro e Mago de Sangue sem foco lançam; Mestre libera", async () => {
  avisos.length = 0;
  assert.equal(await executarLancamento(arcanista("mago"), bolaDeFogo), null);
  assert.ok(avisos.includes("ICARUS.Arcanista.SemFoco"));
  assert.ok(await executarLancamento(arcanista("mago", [foco()]), bolaDeFogo));
  assert.ok(await executarLancamento(arcanista("feiticeiro"), bolaDeFogo));
  assert.ok(await executarLancamento(arcanista("sangue"), bolaDeFogo));
  assert.ok(await executarLancamento(arcanista("mago", [], { focoLiberado: true }), bolaDeFogo));
  // Foco guardado (não equipado) ou destruído não vale; o Bordão Arcano empunhado vale, o Bordão comum não
  assert.equal(focoEmpunhado([{ ...foco(), system: { tipo: "foco", equipado: false } }]), null);
  assert.equal(focoEmpunhado([foco({ destruido: true })]), null);
  assert.ok(focoEmpunhado([{ type: "arma", name: "Bordão Arcano", system: { empunhada: true }, flags: { "icarus-rpg": { focoArcano: { material: "madeira" } } } }]));
  assert.equal(focoEmpunhado([{ type: "arma", name: "Bordão", system: { empunhada: true }, flags: {} }]), null);
});

test("Critério 10 (foco): metal RD 10 / PV 5 com 20 de dano → 10 efetivo, destruído e fora de 'em mãos'", () => {
  const r = mudancasDoDanoNoItem(foco(), 20);
  assert.deepEqual([r.efetivo, r.pv, r.destruido], [10, -5, true]);
  assert.equal(r.mudancas["flags.icarus-rpg.destruido"], true);
  assert.equal(r.mudancas["system.equipado"], false);
  // Madeira (padrão do foco sem dado gravado): RD 5 / PV 5; RD de objeto sem teto (porta de ferro RD 10)
  assert.deepEqual(objetoDoItem({ type: "equipamento", system: { tipo: "foco" }, flags: {} }), { rd: 5, pvMax: 5, pv: 5, tamanho: "minusculo", destruido: false });
  assert.deepEqual(danoNoObjeto({ pv: 100, rd: 10 }, 25), { efetivo: 15, pv: 85, destruido: false });
  assert.deepEqual([defesaDoObjeto({ tamanho: "grande" }), defesaDoObjeto({ tamanho: "grande", emMovimento: true }), defesaDoObjeto({ tamanho: "minusculo" })], [8, 13, 15]);
});

test("Magias conhecidas: Mago 3 + 1/nível; Feiticeiro 3 + 1 nos ímpares a partir do 3º; lista, nível e limite", () => {
  assert.deepEqual([1, 2, 5].map(n => limiteDeMagiasConhecidas("mago", n)), [3, 4, 7]);
  assert.deepEqual([1, 2, 3, 4, 5].map(n => limiteDeMagiasConhecidas("feiticeiro", n)), [3, 3, 4, 4, 5]);
  assert.equal(limiteDeMagiasConhecidas("sangue", 5, 1), 8, "Escola Predileta: +1");
  const p = { nivel: 5, tradicao: "arcana", conhecidas: 2, limite: 7 };
  assert.equal(motivoParaNaoAprender({ nivel: 2, tradicoes: ["arcana"] }, p), null);
  assert.equal(motivoParaNaoAprender({ nivel: 2, tradicoes: ["sangue"] }, p).chave, "ICARUS.Magias.Conhecidas.Tradicao");
  assert.equal(motivoParaNaoAprender({ nivel: 3, tradicoes: ["arcana"] }, p).chave, "ICARUS.Magias.Conhecidas.Nivel");
  assert.equal(motivoParaNaoAprender({ nivel: 1, tradicoes: ["arcana"] }, { ...p, conhecidas: 7 }).chave, "ICARUS.Magias.Conhecidas.Limite");
});

test("Escola Predileta +1 CD; Maestria −1 PM (mínimo 1); Mana Transbordante +2 CD", () => {
  assert.deepEqual(ajustesDoArcanista({ escola: "Evocação" }, { escolas: ["Evocação"], maestria: true, manaTransbordante: true }), { cd: 3, desconto: 1 });
  assert.deepEqual(ajustesDoArcanista({ escola: "Ilusão" }, { escolas: ["Evocação"], maestria: true }), { cd: 0, desconto: 0 });
  const escola = { type: "poder", flags: { "icarus-rpg": { id: "arcanista__escola-predileta", escola: "Evocação" } } };
  const a = arcanista("mago", [foco(), escola, habilidade("maestria-de-escola")]);
  assert.deepEqual([custoFinal(a, bolaDeFogo, []).total, custoFinal(a, bolaDeFogo, []).ajusteCd], [5, 1]);
  assert.equal(custoFinal(a, { ...bolaDeFogo, system: { ...bolaDeFogo.system, custoPM: 1 } }, []).total, 1, "mínimo 1 PM");
});

test("Pacto de Sangue: até metade do custo (para cima), 2 PV por PM, sem chegar a 0 PV", async () => {
  assert.equal(maximoDoPacto(6, 30), 3);
  assert.equal(maximoDoPacto(7, 30), 4);
  assert.equal(maximoDoPacto(6, 5), 2, "5 PV: no máximo 4 PV de perda");
  const a = arcanista("sangue", [habilidade("pacto-de-sangue")], { pm: 10, pv: 30 });
  const cartao = await executarLancamento(a, bolaDeFogo, [], { pacto: 9 });
  assert.ok(cartao);
  assert.deepEqual([a.system.pm.value, a.system.pv.value], [7, 24], "3 PM + 6 PV");
  // Sem o poder, o pedido de Pacto é ignorado
  const b = arcanista("sangue", [], { pm: 10, pv: 30 });
  await executarLancamento(b, bolaDeFogo, [], { pacto: 3 });
  assert.deepEqual([b.system.pm.value, b.system.pv.value], [4, 30]);
});

test("Canalização Arcana: soma o atributo-chave ao dano total da magia (uma vez)", async () => {
  chat.length = 0;
  await executarLancamento(arcanista("feiticeiro", [habilidade("canalizacao-arcana")], { CAR: 4 }), bolaDeFogo);
  const dano = chat.find(m => m.flags["icarus-rpg"].dano);
  assert.equal(dano.rolls[0].formula, "6d6+4");
});
