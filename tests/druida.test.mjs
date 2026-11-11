/** Druida: PV/PM, Fé Selvagem (Floressa 3, outra 2), Conjuração Divina, Formas, Mosaico, Ervas, Círculo e Árvores. */
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

const { classePorId, pmDaLinhagem, gruposEscolhidos, validarPoder, habilidadesAteNivel, proficienciasDaClasse, iconeDaClasse } = await import("../module/classes-dados.mjs");
const { derivarPersonagem } = await import("../module/derivar.mjs");
const { sistemaCompleto } = await import("./simulacao.mjs");
const { nivelMaximoDaClasse, motivoParaNaoAprender, atributoDeMagia } = await import("../module/magias-dados.mjs");
const { limiteDeMagiasDoClerigo } = await import("../module/clerigo-dados.mjs");
const D = await import("../module/druida-dados.mjs");
await import("../module/classes/comum.mjs");
const { concedidosDaClasse } = await import("../module/classes/clerigo.mjs");
await import("../module/classes/druida.mjs");
const { resolverEscolha } = await import("../module/escolhas.mjs");
const { ACOES_DE_MECANICA } = await import("../module/classes.mjs");
const { idDeClasse } = await import("../module/dados-compendios.mjs");
const { poderesDaDivindade } = await import("../module/panteao.mjs");
const { bloqueiosDoAtor } = D;

const druida = classePorId("druida");

test("Critério 12: PV nível 5 com CON +1 = 37; PM nível 5 com SAB +3 = 28; CD de Sabedoria; proficiências", () => {
  const s = derivarPersonagem(sistemaCompleto({
    nivel: 5, identidade: { classe: "druida" }, magia: { atributo: "" },
    atributos: { CON: { base: 1 }, SAB: { base: 3 } },
    classeConfig: { pvInicial: 16, pvPorNivel: 4, pvAtributo: "CON", ...pmDaLinhagem(druida, null) }
  }), []);
  assert.deepEqual([s.pv.max, s.pm.max], [37, 28]);
  assert.equal(atributoDeMagia(s), "SAB");
  assert.equal(s.magia.cd, 10 + 2 + 3);
  assert.deepEqual(proficienciasDaClasse("druida"), { armas: ["simples"], armaduras: ["leve"], escudo: true, tunicas: true });
  assert.deepEqual([druida.habilidades.length, druida.poderes.length], [20, 33]);
  assert.ok(iconeDaClasse("druida").endsWith("Druida.png"));
});

test("Critério 12: Floressa concede os 3 Poderes Concedidos; outra divindade, 2", () => {
  assert.equal(D.concedidosDoDruida("floressa"), null);
  assert.equal(D.concedidosDoDruida("justar"), 2);
  assert.equal(concedidosDaClasse("druida", "floressa"), null);
  assert.equal(concedidosDaClasse("druida", "sólem"), 2);
  assert.equal(concedidosDaClasse("clerigo"), null);
  assert.equal(concedidosDaClasse("paladino", "floressa"), 2);
});

test("Critério 12: Conjuração Divina — nível 12 só até o 3º nível de magia; conhecidas n + 2 (+2 por Sementes); Afinidade Natural +1", () => {
  assert.deepEqual([1, 5, 9, 12, 13, 17].map(n => nivelMaximoDaClasse("druida", n)), [1, 2, 3, 3, 4, 5]);
  assert.deepEqual([limiteDeMagiasDoClerigo(1), limiteDeMagiasDoClerigo(12), limiteDeMagiasDoClerigo(12, 1)], [3, 14, 16]);
  const p = { nivel: 12, tradicao: "divina", conhecidas: 0, limite: 14, teto: 5 };
  assert.equal(motivoParaNaoAprender({ nivel: 3, tradicoes: ["divina"] }, p), null);
  assert.equal(motivoParaNaoAprender({ nivel: 4, tradicoes: ["divina"] }, p).chave, "ICARUS.Magias.Conhecidas.Nivel");
  assert.equal(D.ajusteDeAfinidade({ afinidade: "natureza" }), 1);
  assert.equal(D.ajusteDeAfinidade({ afinidade: "" }), 0);
});

test("Critério 12: sob uma Forma, magias e itens bloqueados; Palavra na Fera devolve magia e fala; Mosaico não bloqueia", () => {
  assert.deepEqual(D.bloqueiosDaForma({}), { fala: false, magias: false, itens: false }, "Mosaico Vivo / forma normal");
  assert.deepEqual(D.bloqueiosDaForma({ forma: true }), { fala: true, magias: true, itens: true });
  assert.deepEqual(D.bloqueiosDaForma({ forma: true, palavraNaFera: true }), { fala: false, magias: false, itens: true });
  assert.deepEqual(D.bloqueiosDaForma({ forma: true, milFormas: true }), { fala: false, magias: false, itens: true });
});

test("Formas: custo (Instinto −1, mín. 1; Troca Veloz +2; Mil Formas 0), dano +1 passo no 11º e 17º, Defesa sem armadura", () => {
  assert.equal(D.custoDaForma(3), 3);
  assert.equal(D.custoDaForma(3, { instinto: true }), 2);
  assert.equal(D.custoDaForma(1, { instinto: true }), 1);
  assert.equal(D.custoDaForma(2, { instinto: true, trocaVeloz: true }), 3);
  assert.equal(D.custoDaForma(3, { milFormas: true }), 0);
  assert.deepEqual([1, 11, 17].map(n => D.danoDaForma("1d8", n)), ["1d8", "1d10", "1d12"]);
  assert.equal(D.danoDaForma("1d8", 11, { presas: true }), "1d12");
  assert.equal(D.formaDoPoder("forma-de-urso"), "urso");
  assert.equal(D.pvTemporariosDoUrso(7), 14);
  // Defesa = 10 + DES + bônus da forma; a armadura vestida não conta
  const armadura = { type: "equipamento", name: "Couro", system: { tipo: "armadura", equipado: true, bonusDefesa: 2, penalidade: 0 } };
  const base = () => sistemaCompleto({ nivel: 5, identidade: { classe: "druida" }, atributos: { DES: { base: 2 } } });
  assert.equal(derivarPersonagem(base(), [armadura]).defesa.total, 14);
  assert.equal(derivarPersonagem(base(), [armadura], [], { forma: { id: "urso", defesa: 4 } }).defesa.total, 16);
});

test("Critério 12: Ervas Frescas — nível 8 → 5 ervas de 2d6; Mãos de Seiva e Boticário +2 cada", () => {
  assert.equal(D.quantasErvas(8), 5);
  assert.equal(D.curaDaErva(8), "2d6");
  assert.deepEqual([2, 8, 14, 20].map(n => D.curaDaErva(n)), ["1d6", "2d6", "3d6", "4d6"]);
  assert.equal(D.curaDaErva(8, { boticario: true }), "3d6");
  assert.equal(D.quantasErvas(8, { maosDeSeiva: true, boticario: true }), 9);
  assert.deepEqual(D.condicoesDaErva(), ["doente", "enjoado", "envenenado"]);
  assert.equal(D.condicoesDaErva(true).length, 8);
});

test("Critério 12: Caminho das Raízes respeita o limite (SAB + metade do nível, mín. 1) e esquece a mais antiga", () => {
  assert.equal(D.limiteDeArvores(3, 9), 7);
  assert.equal(D.limiteDeArvores(-2, 1), 1);
  assert.deepEqual(D.marcarArvore([{ nome: "a" }, { nome: "b" }], { nome: "c" }, 2).map(x => x.nome), ["b", "c"]);
  assert.deepEqual(D.marcarArvore([], { nome: "a" }, 2).map(x => x.nome), ["a"]);
});

test("Mosaico Vivo: 1 parte, 2 no 10º, 3 no 16º; Asas de Gavião só no 10º", () => {
  assert.deepEqual([1, 9, 10, 16].map(D.partesDoMosaico), [1, 1, 2, 3]);
  assert.ok(!D.partesDisponiveis(9).some(p => p.id === "asas-de-gaviao"));
  assert.ok(D.partesDisponiveis(10).some(p => p.id === "asas-de-gaviao"));
});

test("Critério 12: o Círculo da Mata não vê poderes do Círculo da Fera; habilidades do Círculo escolhido", () => {
  const ids = escolhas => habilidadesAteNivel(druida, 20, escolhas).map(h => h.id);
  assert.ok(ids({ circulo: 1 }).includes("raizes-vigilantes"));
  assert.ok(!ids({ circulo: 1 }).includes("instinto-bestial"));
  assert.ok(!ids({}).some(id => ["instinto-bestial", "raizes-vigilantes", "maos-de-seiva"].includes(id)), "sem Círculo, nenhuma");
  const ctx = escolhas => ({ nivel: 20, atributos: { FOR: 5, DES: 5, CON: 5, INT: 5, SAB: 5, CAR: 5 }, treino: {}, tem: new Set(), grupos: gruposEscolhidos(druida, escolhas) });
  const visiveis = escolhas => druida.poderes.filter(p => validarPoder(druida, p, ctx(escolhas)).visivel).map(p => p.id);
  assert.ok(visiveis({ circulo: 1 }).includes("jardim-bravio"));
  assert.ok(!visiveis({ circulo: 1 }).includes("presas-famintas"));
  assert.ok(visiveis({ circulo: 0 }).includes("presas-famintas"));
  assert.ok(visiveis({ circulo: 2 }).includes("forma-de-lobo"), "poderes gerais para todos");
});

/** Ator simulado (Druida). */
function ator(nivel = 5) {
  const flags = { "icarus-rpg": {} };
  const system = { nivel, identidade: { classe: "druida", divindade: "" }, pm: { value: 20, max: 20 }, pv: { value: 10, max: 40 }, pericias: {}, atributos: { SAB: { total: 3 } } };
  const a = {
    name: "Druida", uuid: "Actor.d", type: "personagem", flags, system, items: [], effects: [],
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
      const criados = lista.map((d, i) => ({ ...d, id: `i${a.items.length + a.effects.length + i}`, flags: d.flags ?? {},
        async update(m) { for (const [k, v] of Object.entries(m)) if (k.startsWith("flags.icarus-rpg.")) this.flags["icarus-rpg"][k.slice(17)] = v; else if (k === "name") this.name = v; } }));
      if (t === "Item") a.items.push(...criados); else a.effects.push(...criados);
      return criados;
    },
    async deleteEmbeddedDocuments(t, ids) {
      if (t === "Item") a.items = a.items.filter(i => !ids.includes(i.id));
      else a.effects = a.effects.filter(e => !ids.includes(e.id));
    }
  };
  a._source = { system };
  return a;
}
const itemDe = (a, id, extra = {}) => a.createEmbeddedDocuments("Item", [{ type: "poder", name: id, system: { fonte: "classe", tipoPoder: "habilidade", classe: "druida", ...extra }, flags: { "icarus-rpg": { id: idDeClasse("druida", id), classe: "druida" } } }]).then(r => r[0]);

test("Critério 12: Fé Selvagem com Floressa concede os 3; com outra divindade, 2 à escolha", async () => {
  const escolher = div => cfg => {
    const b = cfg.buttons[0];
    if (cfg.content.includes("select")) return b.callback(null, { form: { elements: { divindade: { value: div } } } });
    const [p1, p2] = poderesDaDivindade(div);
    return b.callback(null, { form: { querySelectorAll: () => [{ value: p1.id }, { value: p2.id }] } });
  };
  const a = ator();
  respostaDialogo = escolher("floressa");
  assert.equal(await resolverEscolha(a, await itemDe(a, "fe-selvagem")), true);
  assert.equal(a.items.filter(i => i.flags["icarus-rpg"].concedido).length, 3);
  const b = ator();
  respostaDialogo = escolher("justar");
  const fe = await itemDe(b, "fe-selvagem");
  assert.equal(await resolverEscolha(b, fe), true);
  assert.equal(b.system.identidade.divindade, "justar");
  assert.equal(b.items.filter(i => i.flags["icarus-rpg"].concedido).length, 2);
  assert.equal(await resolverEscolha(b, fe), false, "permanente para o jogador");
  respostaDialogo = null;
});

test("Critério 12: Instinto Bestial dá 2 Formas de graça (não contam como escolha de poder)", async () => {
  const a = ator(3);
  respostaDialogo = cfg => cfg.buttons[0].callback(null, { form: { querySelectorAll: () => [{ value: "Forma de Lobo" }, { value: "Forma de Urso" }] } });
  assert.equal(await resolverEscolha(a, await itemDe(a, "instinto-bestial")), true);
  const formas = a.items.filter(i => i.flags["icarus-rpg"].gratis);
  assert.deepEqual(formas.map(i => i.flags["icarus-rpg"].id).sort(), ["druida__forma-de-lobo", "druida__forma-de-urso"]);
  respostaDialogo = null;
});

test("Assumir Forma: gasta o PM (−1 com Instinto), cria o efeito e a arma natural; voltar tira os dois; magia bloqueada", async () => {
  const a = ator(11);
  await itemDe(a, "mudar-de-forma");
  await itemDe(a, "instinto-bestial");
  await itemDe(a, "forma-de-urso", { custoPM: 3 });
  respostaDialogo = cfg => cfg.buttons[0].callback(null, { form: { elements: { forma: { value: "urso" } } } });
  await ACOES_DE_MECANICA.get("druida:forma")(a);
  assert.equal(a.system.pm.value, 18);
  assert.equal(D.formaDoAtor(a)?.id, "urso");
  const arma = a.items.find(i => i.flags["icarus-rpg"].armaDaForma);
  assert.equal(arma.system.dano, "1d12", "1d10 + 1 passo no 11º");
  assert.deepEqual(bloqueiosDoAtor(a), { fala: true, magias: true, itens: true });
  await itemDe(a, "palavra-na-fera");
  assert.equal(bloqueiosDoAtor(a).magias, false);
  await ACOES_DE_MECANICA.get("druida:voltar")(a);
  assert.equal(D.formaDoAtor(a), null);
  assert.ok(!a.items.some(i => i.flags["icarus-rpg"].armaDaForma));
  respostaDialogo = null;
});

test("Sangue Verde: Doente não pega", () => {
  const a = ator(10);
  a.items.push({ flags: { "icarus-rpg": { id: "druida__sangue-verde" } } });
  globalThis.game.actors = [];
  const r = (ganchos.preCreateActiveEffect ?? []).map(f => f({ parent: a, statuses: new Set(["doente"]) }, {}, {}, "u1"));
  assert.ok(r.includes(false));
});
