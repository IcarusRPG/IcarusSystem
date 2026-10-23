/** Origens no Foundry (ator simulado): aplicar, trocar, desfazer, migração do bônus e a troca de classe preservando a origem. */
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

const { trocarOrigem, desfazerTrocaDeOrigem, ehPoderDeOrigemAuto, reaplicarOrigem, migrarBonusDeOrigem } = await import("../module/origens.mjs");
const { resetarClasse } = await import("../module/assistente.mjs");
const { ehPoderRacialAuto } = await import("../module/racas.mjs");

const PERICIAS = ["acrobacia","adestramento","atletismo","atuacao","audicao","barganha","cavalgar","concentracao","cura","diplomacia","enganacao","fortitude","furtividade","historia","iniciativa","intimidacao","intuicao","investigacao","luta","misticismo","navegacao","nobreza","olfato","pontaria","prestidigitacao","reflexos","religiao","sobrevivencia","visao","vontade"];

function item(d) { return { ...d, toObject() { const { toObject, ...resto } = this; return structuredClone({ ...resto, _id: resto.id }); } }; }
function atorFalso() {
  let n = 0;
  return {
    uuid: "Actor.x", type: "personagem", name: "Lira", statuses: new Set(),
    _source: { system: {
      identidade: { classe: "ladino", origem: "" }, recursos: [],
      classeConfig: { pvInicial: 16, pvPorNivel: 4, pmInicial: 4, pmPorNivel: 4, pvAtributo: "CON", pmAtributo: null, pmAtributoSoNoPrimeiroNivel: false, manual: false },
      proficiencias: { armas: ["simples"], armaduras: [], escudo: false, tunicas: false, texto: "" },
      pericias: Object.fromEntries(PERICIAS.map(k => [k, { treino: 0, outros: 0 }]))
    } },
    get system() { return this._source.system; },
    flags: { "icarus-rpg": {} },
    items: [],
    effects: [],
    getFlag(s, k) { return this.flags[s]?.[k]; },
    async setFlag(s, k, v) { setP(this.flags, `${s}.${k}`, v); },
    async unsetFlag(s, k) { delete this.flags[s]?.[k]; },
    async update(m) {
      for (const [k, v] of Object.entries(m)) {
        if (k.startsWith("system.")) setP(this._source, k, v);
        else if (k.startsWith("flags.")) setP(this, k, v);
      }
    },
    async deleteEmbeddedDocuments(tipo, ids) {
      if (tipo === "ActiveEffect") this.effects = this.effects.filter(e => !ids.includes(e.id));
      else this.items = this.items.filter(i => !ids.includes(i.id));
    },
    async createEmbeddedDocuments(tipo, dados) {
      const novos = dados.map(d => item({ ...structuredClone(d), id: d._id ?? `i${++n}` }));
      (tipo === "ActiveEffect" ? this.effects : this.items).push(...novos);
      return novos;
    }
  };
}
const nomes = ator => ator.items.map(i => i.name).sort();
/** Bônus somado pelos Efeitos Ativos em "outros" (o que o Foundry aplicaria). */
const bonus = (ator, k) => ator.effects.flatMap(e => e.changes).filter(c => c.key === `system.pericias.${k}.outros`).reduce((s, c) => s + Number(c.value), 0);

test("2/3. Curandeiro não treinado: Cura +2 e continua não treinada; poder, recurso e 2 itens grátis", async () => {
  const ator = atorFalso();
  respostaDialogo = { grupos: [], itens: {} };
  assert.equal(await trocarOrigem(ator, "curandeiro"), true);
  const s = ator._source.system;
  assert.equal(s.identidade.origem, "curandeiro");
  assert.equal(s.pericias.cura.treino, 0, "a origem não treina");
  assert.equal(bonus(ator, "cura"), 2);
  assert.equal(ator.effects[0].flags["icarus-rpg"].fonte, "origem");
  assert.deepEqual(ator.flags["icarus-rpg"].treinoPor, undefined, "não usa treinoPor");
  assert.deepEqual(nomes(ator), ["Maleta de curandeiro", "Primeiros Socorros", "Saco de ervas"]);
  const poder = ator.items.find(ehPoderDeOrigemAuto);
  assert.equal(ehPoderRacialAuto(poder), false, "trocar de raça não apaga o poder de origem");
  assert.deepEqual(s.recursos.map(r => [r.id, r.recarga, r.max]), [["origem-primeiros-socorros", "cena", 1]]);
});

test("2. Curandeiro já treinado em Cura: +2 da origem soma com o treino (+4), sem trocar de perícia", async () => {
  const ator = atorFalso();
  await ator.update({ "system.pericias.cura.treino": 1, "flags.icarus-rpg.treinoPor": { cura: ["classe"] } });
  respostaDialogo = { grupos: [], itens: {} };
  await trocarOrigem(ator, "curandeiro");
  assert.equal(ator._source.system.pericias.cura.treino, 1);
  assert.equal(2 * ator._source.system.pericias.cura.treino + bonus(ator, "cura"), 4);
  assert.deepEqual(ator.flags["icarus-rpg"].treinoPor, { cura: ["classe"] });
  await reaplicarOrigem(ator);
  assert.equal(ator.items.length, 3, "reaplicar não duplica poder nem itens");
  assert.equal(ator.effects.length, 1, "nem o bônus");
});

test("3. Circense: escolhe 1 de 2 itens e o bônus do Traje colorido", async () => {
  const ator = atorFalso();
  respostaDialogo = { grupos: [1], itens: { "traje-colorido": { bonus: "enganacao" } } };
  await trocarOrigem(ator, "circense");
  assert.deepEqual(nomes(ator), ["Cair de Pé", "Corda fina de equilíbrio", "Traje colorido"]);
  assert.equal(ator.items.find(i => i.name === "Traje colorido").flags["icarus-rpg"].escolhaBonus, "enganacao");
});

test("4/5. Trocar de origem tira o +2 antigo e põe o novo; treino intacto; troca de classe mantém o +2; Desfazer volta", async () => {
  const ator = atorFalso();
  respostaDialogo = { grupos: [], itens: { "instrumento-musical": { texto: "flauta" } } };
  await trocarOrigem(ator, "musico");
  await ator.update({ "system.pericias.luta.treino": 1, "flags.icarus-rpg.treinoPor": { luta: ["classe"] } });
  await resetarClasse(ator);
  assert.equal(bonus(ator, "atuacao"), 2, "a troca de classe mantém o bônus de origem");
  assert.equal(ator._source.system.pericias.luta.treino, 0);
  ator.items.find(i => i.name === "Traje de apresentação").name = "Traje de palco da Lira";
  await ator.update({ "system.pericias.atuacao.treino": 1 });
  respostaDialogo = { grupos: [], itens: {} };
  await trocarOrigem(ator, "guarda");
  assert.equal(bonus(ator, "atuacao"), 0);
  assert.equal(bonus(ator, "investigacao"), 2);
  assert.equal(ator._source.system.pericias.atuacao.treino, 1, "treino intacto");
  assert.equal(ator._source.system.pericias.investigacao.treino, 0);
  assert.deepEqual(nomes(ator), ["Algemas", "Apito", "Faro para Mentiras", "Traje de palco da Lira"]);

  await desfazerTrocaDeOrigem(ator);
  assert.equal(ator._source.system.identidade.origem, "musico");
  assert.equal(bonus(ator, "atuacao"), 2);
  assert.equal(bonus(ator, "investigacao"), 0);
  assert.deepEqual(nomes(ator), ["Canção de Marcha", "Instrumento musical (flauta)", "Traje de palco da Lira"]);
  assert.equal(ator.flags["icarus-rpg"].snapshotTrocaOrigem, undefined);
});

test("6. Migração das fichas antigas: tira a fonte origem, põe o +2 na perícia da origem; rodar 2× não muda; Desfazer volta", async () => {
  const antigo = (origem, treinoPor, treinos) => {
    const a = atorFalso();
    a._source.system.identidade.origem = origem;
    a.flags["icarus-rpg"].treinoPor = treinoPor;
    for (const [k, v] of Object.entries(treinos)) a._source.system.pericias[k].treino = v;
    a.items.push(item({ id: "p1", name: "Poder", type: "poder", img: "x.png", system: { fonte: "origem" }, flags: { "icarus-rpg": { auto: true, origemId: origem } } }));
    return a;
  };
  // Músico: Atuação só pela origem; Diplomacia pela classe e pela origem
  const a = antigo("musico", { atuacao: ["origem"], diplomacia: ["classe", "origem"] }, { atuacao: 1, diplomacia: 1 });
  // Guarda que já era treinado em Investigação e escolheu Luta ("outra perícia")
  const b = antigo("guarda", { investigacao: ["classe"], luta: ["origem"] }, { investigacao: 1, luta: 1 });
  const semOrigem = atorFalso();
  assert.equal(await migrarBonusDeOrigem([a, b, semOrigem]), 2);
  assert.equal(a._source.system.pericias.atuacao.treino, 0, "só a origem treinava");
  assert.equal(a._source.system.pericias.diplomacia.treino, 1, "outra fonte: continua treinada");
  assert.deepEqual(a.flags["icarus-rpg"].treinoPor, { diplomacia: ["classe"] });
  assert.equal(bonus(a, "atuacao"), 2);
  assert.equal(b._source.system.pericias.luta.treino, 0);
  assert.equal(b._source.system.pericias.investigacao.treino, 1);
  assert.equal(bonus(b, "investigacao"), 2, "o bônus vai para a perícia da origem");
  assert.equal(b.effects[0].img, "x.png");
  assert.equal(await migrarBonusDeOrigem([a, b]), 0, "rodar de novo não muda nada");
  assert.equal(a.effects.length, 1);
  await desfazerTrocaDeOrigem(a);
  assert.equal(a._source.system.pericias.atuacao.treino, 1);
  assert.deepEqual(a.flags["icarus-rpg"].treinoPor, { atuacao: ["origem"], diplomacia: ["classe", "origem"] });
  assert.equal(a.effects.length, 0);
  assert.equal(a.items.length, 1, "o poder volta");
  assert.equal(a.flags["icarus-rpg"].migracaoOrigemBonus, undefined, "a migração volta a ser oferecida");
});

test("8/9. Usar gasta 1 uso (Saco de ervas: 2); a 6ª vestimenta é sempre bloqueada", async () => {
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
  assert.equal(ganchos.preUpdateItem(sexta, { system: { vestido: true } }, { icarusExcecaoVestimenta: true }), false, "sem exceção, nem para o Mestre");
  // Item que chega já vestido com o limite cheio entra tirado
  const chegando = doc("capuz-escuro", { vestido: true });
  chegando.parent = ator;
  chegando.updateSource = function (m) { for (const [k, v] of Object.entries(m)) setP(this, k, v); };
  ganchos.preCreateItem(chegando);
  assert.equal(chegando.system.vestido, false);
  // Trocar de armadura no limite: a antiga sai, então passa
  const armadura = n => ({ id: `arm${n}`, name: "Couro", type: "equipamento", flags: {}, system: { tipo: "armadura", categoria: "leve", equipado: n === 1, quantidade: 1 } });
  const nova = armadura(2);
  const atorArm = { items: [...vestidas.slice(0, 4), armadura(1), nova] };
  nova.parent = atorArm;
  assert.notEqual(ganchos.preUpdateItem(nova, { system: { equipado: true } }, {}), false, "troca de armadura no limite");
  const m = { system: { vestido: true } };
  vestidas[0].system.vestido = false;
  assert.notEqual(ganchos.preUpdateItem(sexta, m, {}), false, "com uma a menos, veste");
  assert.ok(m.flags["icarus-rpg"].vestidoEm, "registra quando foi vestida");
});
