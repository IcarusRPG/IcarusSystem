/** Assistente de ficha: reset de classe e "Desfazer troca de classe" (com um ator simulado). */
import { test } from "node:test";
import assert from "node:assert/strict";

// Mínimo do Foundry usado pelo assistente
const getP = (o, k) => k.split(".").reduce((a, p) => a?.[p], o);
function setP(o, k, v) {
  const partes = k.split(".");
  const ultimo = partes.pop();
  const alvo = partes.reduce((a, p) => (a[p] ??= {}), o);
  if (ultimo.startsWith("-=")) delete alvo[ultimo.slice(2)];
  else alvo[ultimo] = structuredClone(v);
}
globalThis.foundry = { utils: { deepClone: x => (x === undefined ? x : structuredClone(x)), getProperty: getP, setProperty: setP } };
globalThis.game = { actors: [], i18n: { localize: k => k, format: k => k } };
globalThis.Handlebars = { escapeExpression: t => t };

const { resetarClasse, desfazerTrocaDeClasse, marcarTreinoDaClasse, itensDeOrigemDeClasse } = await import("../module/assistente.mjs");
globalThis.foundry.applications = { api: { DialogV2: { confirm: async () => true } } };
globalThis.ui = { notifications: { info() {}, warn() {} } };

/** Ator simulado: _source.system, flags, itens e update com chaves pontuadas. */
function atorFalso() {
  let n = 0;
  const ator = {
    uuid: "Actor.x", statuses: new Set(),
    _source: { system: { identidade: { classe: "ladino" }, classeConfig: { pvInicial: 16, pvPorNivel: 4, pmInicial: 4, pmPorNivel: 4, pvAtributo: "CON", pmAtributo: null, pmAtributoSoNoPrimeiroNivel: false, manual: false },
      proficiencias: { armas: ["simples", "marciais-leves-ageis"], armaduras: ["leve"], escudo: false, tunicas: false, texto: "" },
      pericias: { furtividade: { treino: 0 }, prestidigitacao: { treino: 0 }, atletismo: { treino: 0 } } } },
    flags: { "icarus-rpg": {} },
    items: [],
    getFlag(s, k) { return this.flags[s]?.[k]; },
    async update(m) {
      for (const [k, v] of Object.entries(m)) {
        if (k.startsWith("system.")) setP(this._source, k, v);
        else if (k.startsWith("flags.")) setP(this, k, v);
      }
    },
    async deleteEmbeddedDocuments(_t, ids) { this.items = this.items.filter(i => !ids.includes(i.id)); },
    async createEmbeddedDocuments(_t, dados) {
      const novos = dados.map(d => item({ ...d, id: d._id ?? `i${++n}` }));
      this.items.push(...novos);
      return novos;
    }
  };
  return ator;
}
function item(d) { return { ...d, toObject() { const { toObject, ...resto } = this; return structuredClone({ ...resto, _id: resto.id }); } }; }

test("14. Trocar Ladino → reset: sai o que é da classe, fica o que é da raça; Desfazer volta tudo", async () => {
  const ator = atorFalso();
  // Poder racial (fica) e itens do Ladino (saem)
  ator.items.push(
    item({ id: "r1", name: "Furtivo (racial)", type: "poder", system: { fonte: "raca" }, flags: {} }),
    item({ id: "c1", name: "Ataque Furtivo", type: "poder", system: { fonte: "classe", classe: "ladino" }, flags: { "icarus-rpg": { id: "ladino__ataque-furtivo", classe: "ladino" } } }),
    item({ id: "c2", name: "Aumento de Atributo (Destreza)", type: "poder", system: { fonte: "classe", classe: "ladino" }, flags: { "icarus-rpg": { aumentoAtributo: { atributo: "DES" } } } })
  );
  // Perícias da classe: Prestidigitação treinada pela classe; Furtividade já vinha da raça (efeito), não foi gravada
  await ator.update({ "system.pericias.prestidigitacao.treino": 1, ...marcarTreinoDaClasse(ator, ["prestidigitacao"]) });
  await ator.update({ "flags.icarus-rpg.furia": true, "flags.icarus-rpg.classeId": "ladino", "flags.icarus-rpg.proficienciasAntesClasse": { armas: ["simples"], armaduras: [], escudo: false, tunicas: false, texto: "" } });
  assert.deepEqual(ator.flags["icarus-rpg"].treinoPor, { prestidigitacao: ["classe"] });
  assert.equal(itensDeOrigemDeClasse(ator).length, 2);

  await resetarClasse(ator);
  assert.deepEqual(ator.items.map(i => i.id), ["r1"], "só o poder racial fica");
  assert.equal(ator._source.system.pericias.prestidigitacao.treino, 0, "treino da classe sai");
  assert.equal(ator._source.system.identidade.classe, "");
  assert.equal(ator._source.system.classeConfig.pvInicial, 0);
  assert.deepEqual(ator._source.system.proficiencias.armas, ["simples"], "proficiências de antes da classe");
  assert.equal(ator.flags["icarus-rpg"].furia, undefined);
  assert.ok(ator.flags["icarus-rpg"].snapshotTrocaClasse);

  await desfazerTrocaDeClasse(ator);
  assert.deepEqual(ator.items.map(i => i.id).sort(), ["c1", "c2", "r1"]);
  assert.equal(ator._source.system.pericias.prestidigitacao.treino, 1);
  assert.equal(ator._source.system.identidade.classe, "ladino");
  assert.equal(ator._source.system.classeConfig.pvInicial, 16);
  assert.equal(ator.flags["icarus-rpg"].furia, true);
  assert.equal(ator.flags["icarus-rpg"].snapshotTrocaClasse, undefined);
});
