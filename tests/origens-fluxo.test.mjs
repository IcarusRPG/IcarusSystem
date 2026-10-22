/** Origens no Foundry (ator simulado): aplicar, trocar, desfazer e a troca de classe preservando a origem. */
import { test } from "node:test";
import assert from "node:assert/strict";

const getP = (o, k) => k.split(".").reduce((a, p) => a?.[p], o);
function setP(o, k, v) {
  const partes = k.split(".");
  const ultimo = partes.pop();
  const alvo = partes.reduce((a, p) => (a[p] ??= {}), o);
  if (ultimo.startsWith("-=")) delete alvo[ultimo.slice(2)];
  else alvo[ultimo] = structuredClone(v);
}
let respostaDialogo = null;
globalThis.foundry = {
  utils: { deepClone: x => (x === undefined ? x : structuredClone(x)), getProperty: getP, setProperty: setP },
  applications: { api: { DialogV2: { confirm: async () => true, wait: async () => respostaDialogo }, ApplicationV2: class {}, HandlebarsApplicationMixin: c => c } }
};
globalThis.game = { actors: [], packs: new Map(), i18n: { localize: k => k, format: k => k } };
globalThis.Handlebars = { escapeExpression: t => t };
globalThis.ui = { notifications: { info() {}, warn() {} } };

const { trocarOrigem, desfazerTrocaDeOrigem, ehPoderDeOrigemAuto, reaplicarOrigem } = await import("../module/origens.mjs");
const { resetarClasse } = await import("../module/assistente.mjs");
const { ehPoderRacialAuto } = await import("../module/racas.mjs");

const PERICIAS = ["acrobacia","adestramento","atletismo","atuacao","audicao","barganha","cavalgar","concentracao","cura","diplomacia","enganacao","fortitude","furtividade","historia","iniciativa","intimidacao","intuicao","investigacao","luta","misticismo","navegacao","nobreza","olfato","pontaria","prestidigitacao","reflexos","religiao","sobrevivencia","visao","vontade"];

function item(d) { return { ...d, toObject() { const { toObject, ...resto } = this; return structuredClone({ ...resto, _id: resto.id }); } }; }
function atorFalso() {
  let n = 0;
  return {
    uuid: "Actor.x", statuses: new Set(),
    _source: { system: {
      identidade: { classe: "ladino", origem: "" }, recursos: [],
      classeConfig: { pvInicial: 16, pvPorNivel: 4, pmInicial: 4, pmPorNivel: 4, pvAtributo: "CON", pmAtributo: null, pmAtributoSoNoPrimeiroNivel: false, manual: false },
      proficiencias: { armas: ["simples"], armaduras: [], escudo: false, tunicas: false, texto: "" },
      pericias: Object.fromEntries(PERICIAS.map(k => [k, { treino: 0 }]))
    } },
    get system() { return this._source.system; },
    flags: { "icarus-rpg": {} },
    items: [],
    getFlag(s, k) { return this.flags[s]?.[k]; },
    async setFlag(s, k, v) { setP(this.flags, `${s}.${k}`, v); },
    async update(m) {
      for (const [k, v] of Object.entries(m)) {
        if (k.startsWith("system.")) setP(this._source, k, v);
        else if (k.startsWith("flags.")) setP(this, k, v);
      }
    },
    async deleteEmbeddedDocuments(_t, ids) { this.items = this.items.filter(i => !ids.includes(i.id)); },
    async createEmbeddedDocuments(_t, dados) {
      const novos = dados.map(d => item({ ...structuredClone(d), id: d._id ?? `i${++n}` }));
      this.items.push(...novos);
      return novos;
    }
  };
}
const nomes = ator => ator.items.map(i => i.name).sort();

test("2/3. Escolher Músico: Atuação treinada (origem), poder, recurso e 2 itens grátis com o texto livre", async () => {
  const ator = atorFalso();
  respostaDialogo = { pericia: "atuacao", grupos: [], itens: { "instrumento-musical": { texto: "alaúde" }, "traje-de-apresentacao": {} } };
  assert.equal(await trocarOrigem(ator, "musico"), true);
  const s = ator._source.system;
  assert.equal(s.identidade.origem, "musico");
  assert.equal(s.pericias.atuacao.treino, 1);
  assert.deepEqual(ator.flags["icarus-rpg"].treinoPor, { atuacao: ["origem"] });
  assert.deepEqual(nomes(ator), ["Canção de Marcha", "Instrumento musical (alaúde)", "Traje de apresentação"]);
  const poder = ator.items.find(ehPoderDeOrigemAuto);
  assert.equal(poder.system.fonte, "origem");
  assert.equal(ehPoderRacialAuto(poder), false, "trocar de raça não apaga o poder de origem");
  assert.deepEqual(s.recursos.map(r => [r.id, r.recarga, r.max]), [["origem-cancao-de-marcha", "cena", 1]]);
  assert.ok(ator.items.filter(i => i.type === "equipamento").every(i => i.system.origemItem && i.system.quantidade === 1));
});

test("3. Circense: escolhe 1 de 2 itens e o bônus do Traje colorido", async () => {
  const ator = atorFalso();
  respostaDialogo = { pericia: "acrobacia", grupos: [1], itens: { "traje-colorido": { bonus: "enganacao" } } };
  await trocarOrigem(ator, "circense");
  assert.deepEqual(nomes(ator), ["Cair de Pé", "Corda fina de equilíbrio", "Traje colorido"]);
  assert.equal(ator.items.find(i => i.name === "Traje colorido").flags["icarus-rpg"].escolhaBonus, "enganacao");
});

test("4. Trocar de origem: sai o poder e os itens não editados; editado fica; Desfazer volta; troca de classe preserva", async () => {
  const ator = atorFalso();
  respostaDialogo = { pericia: "atuacao", grupos: [], itens: { "instrumento-musical": { texto: "flauta" } } };
  await trocarOrigem(ator, "musico");
  // Classe também treina Luta; trocar de classe não mexe na Atuação da origem
  await ator.update({ "system.pericias.luta.treino": 1, "flags.icarus-rpg.treinoPor": { ...ator.flags["icarus-rpg"].treinoPor, luta: ["classe"] } });
  await resetarClasse(ator);
  assert.equal(ator._source.system.pericias.atuacao.treino, 1, "a troca de classe preserva o treino de origem");
  assert.equal(ator._source.system.pericias.luta.treino, 0);
  // O jogador renomeia o traje (editado: fica na troca)
  ator.items.find(i => i.name === "Traje de apresentação").name = "Traje de palco da Lira";
  respostaDialogo = { pericia: "investigacao", grupos: [], itens: {} };
  await trocarOrigem(ator, "guarda");
  assert.equal(ator._source.system.pericias.atuacao.treino, 0, "só a origem treinava: volta a 0");
  assert.equal(ator._source.system.pericias.investigacao.treino, 1);
  assert.deepEqual(nomes(ator), ["Algemas", "Apito", "Faro para Mentiras", "Traje de palco da Lira"]);
  assert.deepEqual(ator._source.system.recursos, [], "Faro para Mentiras não tem uso limitado");
  assert.ok(ator.flags["icarus-rpg"].snapshotTrocaOrigem);

  await desfazerTrocaDeOrigem(ator);
  assert.equal(ator._source.system.identidade.origem, "musico");
  assert.equal(ator._source.system.pericias.atuacao.treino, 1);
  assert.equal(ator._source.system.pericias.investigacao.treino, 0);
  assert.deepEqual(nomes(ator), ["Canção de Marcha", "Instrumento musical (flauta)", "Traje de palco da Lira"]);
  assert.equal(ator.flags["icarus-rpg"].treinoPor.atuacao.includes("origem"), true);
  assert.equal(ator.flags["icarus-rpg"].snapshotTrocaOrigem, undefined);
});

test("2. Já treinado na perícia da origem: escolhe outra; Reaplicar não duplica", async () => {
  const ator = atorFalso();
  await ator.update({ "system.pericias.atuacao.treino": 1, "flags.icarus-rpg.treinoPor": { atuacao: ["classe"] } });
  respostaDialogo = { pericia: "diplomacia", grupos: [], itens: { "instrumento-musical": { texto: "tambor" } } };
  await trocarOrigem(ator, "musico");
  assert.equal(ator._source.system.pericias.diplomacia.treino, 1);
  assert.deepEqual(ator.flags["icarus-rpg"].treinoPor, { atuacao: ["classe"], diplomacia: ["origem"] });
  await reaplicarOrigem(ator);
  assert.equal(ator.items.length, 3, "reaplicar não duplica poder nem itens");
  assert.equal(ator._source.system.recursos.length, 1);
  assert.equal(ator._source.system.pericias.diplomacia.treino, 1);
});

test("8/9. Usar gasta 1 uso (Saco de ervas: 2); a trava bloqueia a 6ª vestimenta, salvo a exceção do Mestre", async () => {
  const cards = [];
  const ganchos = {};
  globalThis.TextEditor = { enrichHTML: async t => t };
  globalThis.ChatMessage = { create: async d => cards.push(d), getSpeaker: () => ({}) };
  globalThis.Hooks = { on: (n, f) => { ganchos[n] = f; } };
  foundry.utils.hasProperty = (o, k) => getP(o, k) !== undefined;
  const { usarItemComum, registrarItensComuns } = await import("../module/itens-comuns.mjs");
  const { dadosDoItemComum, itemComumPorId } = await import("../module/origens-dados.mjs");
  const doc = (id, extra = {}) => {
    const d = dadosDoItemComum(itemComumPorId(id));
    const it = { ...d, id: `${id}-${Math.random()}`, system: { ...d.system, ...extra },
      async update(m) { for (const [k, v] of Object.entries(m)) setP(this, k, v); } };
    return it;
  };
  const ervas = doc("saco-de-ervas");
  assert.deepEqual(ervas.system.usos, { max: 2, atual: 2 });
  await usarItemComum({}, ervas);
  await usarItemComum({}, ervas);
  assert.equal(ervas.system.usos.atual, 0);
  assert.equal(cards.length, 2);
  await usarItemComum({}, ervas);
  assert.equal(cards.length, 2, "sem usos: não posta");

  registrarItensComuns();
  const vestidas = ["capa-de-viagem", "manto-de-pele", "traje-elegante", "anel-de-sinete", "simbolo-sagrado"].map(id => doc(id, { vestido: true }));
  const sexta = doc("traje-real");
  const ator = { items: [...vestidas, sexta] };
  sexta.parent = ator;
  assert.equal(ganchos.preUpdateItem(sexta, { system: { vestido: true } }, {}), false, "6ª bloqueada");
  const m = { system: { vestido: true } };
  assert.notEqual(ganchos.preUpdateItem(sexta, m, { icarusExcecaoVestimenta: true }), false, "exceção do Mestre passa");
  assert.ok(m.flags["icarus-rpg"].vestidoEm, "registra quando foi vestida");
  vestidas[0].system.vestido = false;
  assert.notEqual(ganchos.preUpdateItem(sexta, { system: { vestido: true } }, {}), false, "com uma a menos, veste");
});
