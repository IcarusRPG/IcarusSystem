/** Arcanista no Foundry (simulado): escolher a Linhagem ajusta PM e conjuração e concede o ramo. */
import { test } from "node:test";
import assert from "node:assert/strict";

let resposta = "0";
class AppFalso { constructor(o) { this.options = o; } render() { return this; } }
globalThis.foundry = {
  utils: { deepClone: o => structuredClone(o), getProperty: (o, k) => k.split(".").reduce((a, p) => a?.[p], o), hasProperty: () => false },
  applications: { api: { DialogV2: { wait: async () => resposta, confirm: async () => true }, ApplicationV2: AppFalso, HandlebarsApplicationMixin: c => c } }
};
globalThis.Handlebars = { escapeExpression: t => String(t ?? "") };
globalThis.Hooks = { on() {}, once() {} };
const avisos = [];
globalThis.ui = { notifications: { warn: m => avisos.push(m), info() {}, error: m => avisos.push(m) } };
globalThis.CONFIG = { statusEffects: [] };
globalThis.game = { user: { isGM: false }, i18n: { localize: k => k, format: k => k }, settings: { get: () => null } };

await import("../module/classes/comum.mjs");
await import("../module/classes/arcanista.mjs");
const { resolverEscolha } = await import("../module/escolhas.mjs");
const { idDeClasse } = await import("../module/dados-compendios.mjs");

/** Ator simulado com itens, flags e update. */
function ator() {
  const flags = { "icarus-rpg": {} };
  const a = {
    name: "Arcanista", flags, items: [],
    system: { nivel: 5, identidade: { classe: "arcanista" }, pericias: {}, classeConfig: { pmInicial: 3, pmPorNivel: 3, pmAtributo: "INT", manual: false } },
    getFlag: (_s, k) => flags["icarus-rpg"][k],
    async setFlag(_s, k, v) { flags["icarus-rpg"][k] = v; },
    async update(m) {
      for (const [k, v] of Object.entries(m)) {
        if (k.startsWith("system.classeConfig.")) a.system.classeConfig[k.split(".").at(-1)] = v;
        else if (k.startsWith("flags.icarus-rpg.")) flags["icarus-rpg"][k.split(".").at(-1)] = v;
      }
    },
    async createEmbeddedDocuments(_t, lista) {
      const criados = lista.map((d, i) => ({ ...d, id: `i${a.items.length + i}`, async update(m) { Object.assign(this, { name: m.name ?? this.name }); for (const [k, v] of Object.entries(m)) if (k.startsWith("flags.icarus-rpg.")) this.flags["icarus-rpg"][k.split(".").at(-1)] = v; } }));
      a.items.push(...criados);
      return criados;
    }
  };
  a._source = { system: a.system };
  a.items.filter = Array.prototype.filter.bind(a.items);
  return a;
}
const itemDe = (a, id) => a.items.find(i => i.flags["icarus-rpg"].id === idDeClasse("arcanista", id));

test("Escolher Feiticeiro: PM 6/nível + CAR (uma vez), tradição Arcana e as habilidades do Feiticeiro (com Herança Ancestral)", async () => {
  const a = ator();
  // Item da Linhagem (como o assistente cria)
  const [linhagem] = await a.createEmbeddedDocuments("Item", [{ type: "poder", name: "Linhagem", system: { fonte: "classe", tipoPoder: "habilidade", classe: "arcanista" }, flags: { "icarus-rpg": { id: idDeClasse("arcanista", "linhagem"), classe: "arcanista" } } }]);
  resposta = "1"; // Feiticeiro; a Herança Ancestral (concedida em seguida) recebe a mesma resposta: Leviatã
  assert.equal(await resolverEscolha(a, linhagem), true);
  assert.deepEqual(a.system.classeConfig, { pmInicial: 6, pmPorNivel: 6, pmAtributo: "CAR", pmAtributoSoNoPrimeiroNivel: true, manual: false });
  assert.equal(a.flags["icarus-rpg"].tradicaoMagias, "arcana");
  assert.equal(a.flags["icarus-rpg"].escolhasClasse.linhagem, 1);
  assert.ok(itemDe(a, "sangue-dotado"), "habilidade do Feiticeiro");
  assert.ok(!itemDe(a, "foco-arcano"), "Foco Arcano é do Mago");
  assert.equal(a.flags["icarus-rpg"].escolhasClasse["heranca-ancestral"], 1);
  assert.ok(itemDe(a, "heranca-de-leviata"));
  assert.ok(!itemDe(a, "heranca-de-dragao"));
});

test("Linhagem é permanente: o jogador não troca; Herança Ancestral recusa quem não é Feiticeiro", async () => {
  const a = ator();
  const [linhagem] = await a.createEmbeddedDocuments("Item", [{ type: "poder", name: "Linhagem", system: {}, flags: { "icarus-rpg": { id: idDeClasse("arcanista", "linhagem"), classe: "arcanista" } } }]);
  resposta = "0";
  await resolverEscolha(a, linhagem);
  assert.equal(a.flags["icarus-rpg"].tradicaoMagias, "arcana");
  assert.ok(itemDe(a, "foco-arcano"));
  assert.equal(await resolverEscolha(a, linhagem), false, "permanente");
  const [heranca] = await a.createEmbeddedDocuments("Item", [{ type: "poder", name: "Herança", system: {}, flags: { "icarus-rpg": { id: idDeClasse("arcanista", "heranca-ancestral"), classe: "arcanista" } } }]);
  assert.equal(await resolverEscolha(a, heranca), false);
  assert.ok(avisos.includes("ICARUS.Escolhas.RequerLinhagem"));
});
