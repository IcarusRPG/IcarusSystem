/** Bardo: PV/PM, Caminho e Estilo, magias (escolas, nível até o 4º, limite), Chama da Musa, Talento de Palco e Obra-Prima. */
import { test } from "node:test";
import assert from "node:assert/strict";

let botoesVistos = [];
const historico = [];
let resposta = "0";
globalThis.foundry = {
  utils: { deepClone: o => structuredClone(o), getProperty: () => undefined, hasProperty: () => false },
  applications: { api: {
    DialogV2: {
      confirm: async () => true,
      wait: async cfg => {
        botoesVistos = cfg.buttons.map(b => b.label);
        historico.push(botoesVistos);
        const b = cfg.buttons.find(x => x.action === resposta) ?? cfg.buttons[0];
        return b.callback?.(null, { form: { querySelector: s => (s.includes(":checked") ? (s.includes("talento") ? {} : null) : { value: 0 }), querySelectorAll: () => [], elements: {} } }) ?? b.action;
      }
    },
    ApplicationV2: class {}, HandlebarsApplicationMixin: c => c
  } }
};
globalThis.Handlebars = { escapeExpression: t => String(t ?? "") };
globalThis.Hooks = { on() {}, once() {} };
const avisos = [];
globalThis.ui = { notifications: { warn: m => avisos.push(m), info() {}, error() {} } };
globalThis.CONFIG = { statusEffects: [], sounds: {} };
globalThis.ChatMessage = { create: async d => d, getSpeaker: () => ({}), applyRollMode() {} };
globalThis.game = { user: { isGM: false, targets: new Set() }, i18n: { localize: k => k, format: k => k }, settings: { get: () => null } };

const { classePorId, gruposEscolhidos, atendeGrupo, habilidadesAteNivel } = await import("../module/classes-dados.mjs");
const { derivarPersonagem } = await import("../module/derivar.mjs");
const { sistemaCompleto } = await import("./simulacao.mjs");
const { limiteDeMagiasDoBardo, motivoParaNaoAprender, bonusDaChama, dadoDoLouvor, custoComObraPrima, nivelMaximoDeMagia } = await import("../module/magias-dados.mjs");
await import("../module/classes/comum.mjs");
await import("../module/classes/bardo.mjs");
const { resolverEscolha } = await import("../module/escolhas.mjs");
const { GANCHOS_DE_PODER } = await import("../module/acoes.mjs");
const { custoFinal } = await import("../module/magias.mjs");
const { perguntarBonusDeItens } = await import("../module/rolls.mjs");
const { idDeClasse } = await import("../module/dados-compendios.mjs");

const bardo = classePorId("bardo");

test("Critério 4a: Bardo nível 5, CON +1, CAR +3 → PV 35 e PM 30; magia até o 4º nível (nunca o 5º)", () => {
  const s = derivarPersonagem(sistemaCompleto({
    nivel: 5, identidade: { classe: "bardo" }, magia: { atributo: "" },
    atributos: { CON: { base: 1 }, CAR: { base: 3 } },
    classeConfig: { pvInicial: 14, pvPorNivel: 4, pvAtributo: "CON", pmInicial: 3, pmPorNivel: 3, pmAtributo: "CAR" }
  }), []);
  assert.deepEqual([s.pv.max, s.pm.max, s.magia.atributoEfetivo, s.magia.cd], [35, 30, "CAR", 15]);
  const s17 = derivarPersonagem(sistemaCompleto({ nivel: 17, identidade: { classe: "bardo" }, magia: { atributo: "" } }), []);
  assert.equal(s17.magia.nivelMaximo, 4);
  assert.equal(nivelMaximoDeMagia(12, { teto: 4 }), 3);
  assert.equal(motivoParaNaoAprender({ nivel: 5, escola: "Encantamento", tradicoes: ["arcana"] }, { nivel: 20, tradicao: "arcana", conhecidas: 0, limite: 12, escolas: ["Encantamento"], teto: 4 }).chave, "ICARUS.Magias.Conhecidas.Nivel");
});

test("Magias do Bardo: 2 + ⌊nível/2⌋ (+2 por Repertório), só das escolas escolhidas", () => {
  assert.deepEqual([1, 2, 3, 4, 20].map(n => limiteDeMagiasDoBardo(n)), [2, 3, 3, 4, 12]);
  assert.equal(limiteDeMagiasDoBardo(4, 1), 6);
  const p = { nivel: 5, tradicao: "arcana", conhecidas: 0, limite: 4, escolas: ["Encantamento", "Ilusão", "Evocação"], teto: 4 };
  assert.equal(motivoParaNaoAprender({ nivel: 1, escola: "Ilusão", tradicoes: ["arcana"] }, p), null);
  assert.equal(motivoParaNaoAprender({ nivel: 1, escola: "Necromancia", tradicoes: ["arcana"] }, p).chave, "ICARUS.Magias.Conhecidas.Escola");
});

test("Critério 4a: Caminho e Estilo permanentes; o Estilo só lista as opções do Caminho; poderes do Estilo só para ele", async () => {
  const flags = { "icarus-rpg": {} };
  const ator = {
    name: "Bardo", flags, items: [], system: { nivel: 9, identidade: { classe: "bardo" }, pericias: {} },
    getFlag: (_s, k) => flags["icarus-rpg"][k], async setFlag(_s, k, v) { flags["icarus-rpg"][k] = v; },
    async update() {}, async createEmbeddedDocuments(_t, l) { const c = l.map((d, i) => ({ ...d, id: `i${ator.items.length + i}`, async update(m) { for (const [k, v] of Object.entries(m)) if (k.startsWith("flags.icarus-rpg.")) this.flags["icarus-rpg"][k.split(".").at(-1)] = v; } })); ator.items.push(...c); return c; }
  };
  ator._source = { system: ator.system };
  ator.items.filter = Array.prototype.filter.bind(ator.items);
  const item = id => { const i = ({ type: "poder", name: id, system: { fonte: "classe", tipoPoder: "habilidade", classe: "bardo" }, flags: { "icarus-rpg": { id: idDeClasse("bardo", id), classe: "bardo" } }, async update(m) { for (const [k, v] of Object.entries(m)) if (k.startsWith("flags.icarus-rpg.")) this.flags["icarus-rpg"][k.split(".").at(-1)] = v; } }); ator.items.push(i); return i; };
  // Estilo antes do Caminho: recusa
  assert.equal(await resolverEscolha(ator, item("estilo")), false);
  resposta = "1"; // Caminho da Música
  assert.equal(await resolverEscolha(ator, item("caminho")), true);
  assert.equal(flags["icarus-rpg"].caminho, "musica");
  historico.length = 0;
  resposta = "4"; // MPB
  assert.equal(await resolverEscolha(ator, item("estilo")), true);
  // A tela do Estilo (a primeira depois do Caminho) só mostra os Estilos da Música
  assert.deepEqual(historico[0], ["Heavy Metal", "MPB", "Clássica"]);
  assert.ok(!historico.some(h => h.includes("Poeta Épico")));
  assert.equal(flags["icarus-rpg"].estilo, "mpb");
  assert.ok(ator.items.some(i => i.flags["icarus-rpg"].id === "bardo__gingado"), "habilidade de 3º do MPB");
  assert.ok(!ator.items.some(i => i.flags["icarus-rpg"].id === "bardo__riff-pesado"));
  const grupos = gruposEscolhidos(bardo, flags["icarus-rpg"].escolhasClasse);
  assert.ok(atendeGrupo("Estilo MPB", grupos));
  assert.ok(!atendeGrupo("Estilo Heavy Metal", grupos));
  assert.ok(atendeGrupo("Caminho da Música", grupos));
  assert.ok(!atendeGrupo("Caminho da Poesia", grupos));
  // Habilidades do Estilo nos níveis 3, 9 e 15
  assert.deepEqual(habilidadesAteNivel(bardo, 20, { caminho: 1, estilo: 4 }).filter(h => ["gingado", "roda-de-samba", "carnaval"].includes(h.id)).map(h => h.nivel), [3, 9, 15]);
});

test("Critério 4a: Chama da Musa não fica ativa em duplicata; bônus pelo nível; Louvor pelo nível", async () => {
  assert.deepEqual([1, 5, 9, 13, 17].map(bonusDaChama), [1, 2, 3, 4, 5]);
  assert.deepEqual([1, 5, 11, 17].map(dadoDoLouvor), ["1d6", "1d8", "1d10", "1d12"]);
  const ativa = { getFlag: (_s, k) => (k === "chamaAtiva" ? { bonus: 2 } : null) };
  assert.equal(GANCHOS_DE_PODER.get("bardo__chama-da-musa").antes(ativa), false);
  assert.ok(avisos.includes("ICARUS.Bardo.ChamaJaAtiva"));
});

test("Obra-Prima: com a Chama ativa, magia custa metade (para cima); Talento de Palco dá o bônus de treino por 1 PM", async () => {
  assert.deepEqual([0, 1, 3, 6].map(custoComObraPrima), [0, 1, 2, 3]);
  const habilidade = id => ({ type: "poder", flags: { "icarus-rpg": { id: `bardo__${id}` } } });
  const ator = (chama, itens) => ({ system: { identidade: { classe: "bardo" }, pm: { value: 5 }, pericias: { atuacao: { treino: 0 }, diplomacia: { treino: 1 } } }, items: itens, getFlag: (_s, k) => (k === "chamaAtiva" ? chama : undefined) });
  const magia = { system: { custoPM: 6, aprimoramentos: [] } };
  assert.equal(custoFinal(ator({ bonus: 1 }, [habilidade("obra-prima")]), magia, []).total, 3);
  assert.equal(custoFinal(ator(null, [habilidade("obra-prima")]), magia, []).total, 6);
  const r = await perguntarBonusDeItens(ator(null, [habilidade("talento-de-palco")]), "atuacao");
  assert.equal(r.talento, 1);
  assert.equal(r.extras.at(-1).rotulo, "ICARUS.Bardo.TalentoRotulo");
  assert.deepEqual(await perguntarBonusDeItens(ator(null, [habilidade("talento-de-palco")]), "diplomacia"), {}, "treinada: sem Talento");
});
