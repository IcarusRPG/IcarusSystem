/** Clérigo e a regra nova do PM dos conjuradores (Núcleo, seção 4). */
import { test } from "node:test";
import assert from "node:assert/strict";

const caminho = (o, p) => p.split(".").reduce((a, k) => a?.[k], o);
let respostaDivindade = "solem";
const ganchos = {};
globalThis.foundry = {
  utils: {
    deepClone: o => structuredClone(o), hasProperty: () => false,
    getProperty: (o, p) => (p in o ? o[p] : caminho(o, p)),
    setProperty: (o, p, v) => { o[p] = v; }
  },
  applications: { api: {
    DialogV2: {
      confirm: async () => true,
      wait: async cfg => {
        const b = cfg.buttons[0];
        return b.callback?.(null, { form: { elements: { divindade: { value: respostaDivindade } }, querySelector: () => null, querySelectorAll: () => [] } }) ?? b.action;
      }
    },
    ApplicationV2: class {}, HandlebarsApplicationMixin: c => c
  } }
};
globalThis.Handlebars = { escapeExpression: t => String(t ?? "") };
globalThis.Hooks = { on: (n, f) => { (ganchos[n] ??= []).push(f); }, once: (n, f) => { if (n === "init") f(); } };
const avisos = [];
const erros = [];
globalThis.ui = { notifications: { warn: m => avisos.push(m), info() {}, error: m => erros.push(m) } };
globalThis.CONFIG = { statusEffects: [], sounds: {} };
const chat = [];
globalThis.ChatMessage = { create: async d => { chat.push(d); return d; }, getSpeaker: () => ({}), applyRollMode() {} };
globalThis.Roll = class { constructor(f) { this.formula = f; } async evaluate() { this.total = 3; return this; } };
globalThis.game = { user: { id: "u1", isGM: false, targets: new Set() }, i18n: { localize: k => k, format: k => k }, settings: { get: () => null }, packs: { get: () => null } };

const { classePorId, pmDaLinhagem } = await import("../module/classes-dados.mjs");
const { derivarPersonagem } = await import("../module/derivar.mjs");
const { sistemaCompleto } = await import("./simulacao.mjs");
const { motivoParaNaoAprender, nivelMaximoDeMagia } = await import("../module/magias-dados.mjs");
const { limiteDeMagiasDoClerigo, maximoDaOnda, planoDaOnda, intervencaoAtende, motivoSemIntervencao, violarDogma, passarUmDia, motivoDoMilagre } = await import("../module/clerigo-dados.mjs");
await import("../module/classes/comum.mjs");
const { divindadeTravada } = await import("../module/classes/clerigo.mjs");
const { resolverEscolha } = await import("../module/escolhas.mjs");
const { ACOES_DE_MECANICA } = await import("../module/classes.mjs");
const { idDeClasse } = await import("../module/dados-compendios.mjs");
const { mudancasDePM } = await import("../module/migracoes.mjs");
const { poderesDaDivindade } = await import("../module/panteao.mjs");

const clerigo = classePorId("clerigo");

/** PV e PM máximos (classeConfig como a ficha grava ao aplicar a classe / linhagem). */
function maximos(classeId, nivel, atributos, linhagem = null) {
  const c = classePorId(classeId);
  const s = derivarPersonagem(sistemaCompleto({
    nivel, identidade: { classe: classeId }, magia: { atributo: "" },
    atributos: Object.fromEntries(Object.entries(atributos).map(([k, v]) => [k, { base: v }])),
    classeConfig: { pvInicial: c.pv.inicial, pvPorNivel: c.pv.porNivel, pvAtributo: "CON", ...pmDaLinhagem(c, linhagem) }
  }), []);
  return { pv: s.pv.max, pm: s.pm.max, s };
}

test("Critério 2: PM = base × nível + atributo (uma vez) em todos os conjuradores; subir de nível soma só o incremento", () => {
  assert.equal(maximos("arcanista", 5, { INT: 3 }, "mago").pm, 28);
  assert.equal(maximos("arcanista", 5, { CAR: 2 }, "feiticeiro").pm, 32);
  assert.equal(maximos("arcanista", 5, { INT: 1 }, "sangue").pm, 26);
  assert.equal(maximos("bardo", 5, { CAR: 3 }).pm, 23);
  assert.equal(maximos("clerigo", 5, { SAB: 3 }).pm, 23);
  assert.equal(maximos("monge", 5, { SAB: 3 }).pm, 23);
  assert.equal(maximos("clerigo", 6, { SAB: 3 }).pm - maximos("clerigo", 5, { SAB: 3 }).pm, 4);
  assert.equal(maximos("clerigo", 5, { SAB: 4 }).pm, 24, "Aumento de Atributo depois do 1º: +1");
});

test("Migração do PM: fichas antigas de Arcanista e Bardo recebem a regra nova; manual e outras classes ficam", () => {
  const ator = (classe, cc, flags = {}) => ({ type: "personagem", flags: { "icarus-rpg": flags }, _source: { system: { identidade: { classe }, classeConfig: cc } } });
  const antigo = { pmInicial: 3, pmPorNivel: 3, pmAtributo: "INT", pmAtributoSoNoPrimeiroNivel: false, manual: false };
  assert.deepEqual(mudancasDePM(ator("arcanista", antigo, { escolhasClasse: { linhagem: 0 } })), {
    "system.classeConfig.pmInicial": 5, "system.classeConfig.pmPorNivel": 5, "system.classeConfig.pmAtributoSoNoPrimeiroNivel": true });
  assert.deepEqual(mudancasDePM(ator("arcanista", { ...antigo, pmInicial: 4, pmPorNivel: 4, pmAtributo: "CAR" }, { escolhasClasse: { linhagem: 1 } })), {
    "system.classeConfig.pmInicial": 6, "system.classeConfig.pmPorNivel": 6, "system.classeConfig.pmAtributoSoNoPrimeiroNivel": true });
  assert.deepEqual(Object.keys(mudancasDePM(ator("bardo", { ...antigo, pmAtributo: "CAR" }))).length, 3);
  assert.equal(mudancasDePM(ator("bardo", { ...antigo, manual: true })), null, "manual");
  assert.equal(mudancasDePM(ator("guerreiro", { ...antigo, pmAtributo: null })), null, "não conjurador");
  assert.equal(mudancasDePM(ator("bardo", { pmInicial: 4, pmPorNivel: 4, pmAtributo: "CAR", pmAtributoSoNoPrimeiroNivel: true, manual: false })), null, "já na regra");
});

test("Critério 3: Clérigo — PV 16 + CON e +4 + CON (nível 5, CON +1 = 37); Religião e Vontade; proficiências", async () => {
  assert.equal(maximos("clerigo", 5, { CON: 1 }).pv, 37);
  assert.equal(clerigo.pericias.obrigatorias, "Religião e Vontade");
  assert.equal(clerigo.pericias.escolha, 4);
  const { proficienciasDaClasse } = await import("../module/classes-dados.mjs");
  assert.deepEqual(proficienciasDaClasse("clerigo"), { armas: ["simples"], armaduras: ["pesada"], escudo: true, tunicas: false });
  assert.deepEqual([clerigo.habilidades.length, clerigo.poderes.length], [5, 28]);
});

test("Critério 4: Conjuração Divina — lista Divina, nível 12 nunca vê o 5º (só no 17º; o 4º no 13º), conhecidas n + 2 (+2 por Teologia), CD de Sabedoria", () => {
  assert.deepEqual([1, 5, 9, 13, 17].map(n => nivelMaximoDeMagia(n)), [1, 2, 3, 4, 5]);
  assert.equal(maximos("clerigo", 12, {}).s.magia.nivelMaximo, 3);
  assert.equal(maximos("clerigo", 16, {}).s.magia.nivelMaximo, 4);
  assert.equal(maximos("clerigo", 17, {}).s.magia.nivelMaximo, 5);
  assert.deepEqual([1, 5, 20].map(n => limiteDeMagiasDoClerigo(n)), [3, 7, 22]);
  assert.equal(limiteDeMagiasDoClerigo(5, 1), 9);
  const p = { nivel: 16, tradicao: "divina", conhecidas: 0, limite: 18, teto: 5 };
  assert.equal(motivoParaNaoAprender({ nivel: 4, tradicoes: ["divina"] }, p), null);
  assert.equal(motivoParaNaoAprender({ nivel: 5, tradicoes: ["divina"] }, p).chave, "ICARUS.Magias.Conhecidas.Nivel");
  assert.equal(motivoParaNaoAprender({ nivel: 1, tradicoes: ["arcana"] }, p).chave, "ICARUS.Magias.Conhecidas.Tradicao");
  const s = maximos("clerigo", 5, { SAB: 3 }).s;
  assert.deepEqual([s.magia.atributoEfetivo, s.magia.cd], ["SAB", 15]);
});

test("Critério 5: Intervenção Divina — a partir do 10º; 1d100 ≤ nível; 20º sempre; 7 dias; falha espera o descanso", () => {
  assert.equal(motivoSemIntervencao(9), "ICARUS.Clerigo.IntervencaoNivel");
  assert.equal(motivoSemIntervencao(10), null);
  assert.equal(motivoSemIntervencao(12, { dias: 7 }), "ICARUS.Clerigo.IntervencaoBloqueada");
  assert.equal(motivoSemIntervencao(12, { falhou: true }), "ICARUS.Clerigo.IntervencaoDescanso");
  assert.deepEqual([intervencaoAtende(12, 12), intervencaoAtende(12, 13), intervencaoAtende(20, null), intervencaoAtende(9, 1)], [true, false, true, false]);
  assert.deepEqual([passarUmDia(7), passarUmDia(0)], [6, 0]);
});

test("Critério 6 e 7: Milagre (3 Divinas diferentes) e Onda de Fé (até SAB + 2 PM, Onda Ampla +2 PM)", () => {
  const m = id => ({ id, tradicoes: ["divina"] });
  assert.equal(motivoDoMilagre([m("a"), m("b"), m("c")]), null);
  assert.equal(motivoDoMilagre([m("a"), m("a"), m("c")]), "ICARUS.Clerigo.MilagreTres");
  assert.equal(motivoDoMilagre([m("a"), m("b")]), "ICARUS.Clerigo.MilagreTres");
  assert.equal(motivoDoMilagre([m("a"), m("b"), { id: "x", tradicoes: ["arcana"] }]), "ICARUS.Clerigo.MilagreDivina");
  assert.equal(maximoDaOnda(3), 5);
  assert.deepEqual(planoDaOnda(9, 3), { pm: 5, dados: 5, custo: 5, formula: "5d6", alcance: "curto" });
  assert.deepEqual(planoDaOnda(2, 3, { ampla: true }), { pm: 2, dados: 2, custo: 4, formula: "2d6", alcance: "medio" });
});

/** Ator simulado com itens, flags e update por caminhos. */
function atorSimulado() {
  const flags = { "icarus-rpg": {} };
  const system = { nivel: 5, identidade: { classe: "clerigo", divindade: "" }, pm: { value: 20, max: 23 }, pericias: {}, atributos: { SAB: { total: 3 } } };
  const ator = {
    name: "Clérigo", type: "personagem", flags, system, items: [],
    getFlag: (_s, k) => flags["icarus-rpg"][k],
    async setFlag(_s, k, v) { flags["icarus-rpg"][k] = v; },
    async unsetFlag(_s, k) { delete flags["icarus-rpg"][k]; },
    async update(m) {
      for (const [k, v] of Object.entries(m)) {
        if (k.startsWith("flags.icarus-rpg.")) { const p = k.slice(17).split("."); p.slice(0, -1).reduce((o, x) => (o[x] ??= {}), flags["icarus-rpg"])[p.at(-1)] = v; }
        else if (k.startsWith("system.")) { const p = k.slice(7).split("."); p.slice(0, -1).reduce((o, x) => o[x], system)[p.at(-1)] = v; }
      }
    },
    async createEmbeddedDocuments(_t, lista) {
      const criados = lista.map((d, i) => ({ ...d, id: `i${ator.items.length + i}`, flags: d.flags ?? {},
        async update(m) { for (const [k, v] of Object.entries(m)) if (k.startsWith("flags.icarus-rpg.")) this.flags["icarus-rpg"][k.slice(17)] = v; else if (k === "name") this.name = v; } }));
      ator.items.push(...criados);
      return criados;
    },
    async deleteEmbeddedDocuments(_t, ids) { ator.items = ator.items.filter(i => !ids.includes(i.id)); }
  };
  ator._source = { system };
  return ator;
}

test("Critério 3: Fé Jurada concede os 3 Poderes Concedidos, é permanente para o jogador; o Mestre troca", async () => {
  const a = atorSimulado();
  const [fe] = await a.createEmbeddedDocuments("Item", [{ type: "poder", name: "Fé Jurada", system: { fonte: "classe", tipoPoder: "habilidade", classe: "clerigo" }, flags: { "icarus-rpg": { id: idDeClasse("clerigo", "fe-jurada"), classe: "clerigo" } } }]);
  respostaDivindade = "solem";
  assert.equal(await resolverEscolha(a, fe), true);
  assert.equal(a.system.identidade.divindade, "solem");
  const concedidos = a.items.filter(i => i.flags["icarus-rpg"].concedido).map(i => i.flags["icarus-rpg"].id);
  assert.deepEqual(concedidos.sort(), poderesDaDivindade("solem").map(p => p.id).sort());
  assert.equal(concedidos.length, 3);
  assert.equal(fe.name, "Fé Jurada (Sólem)");
  // Jogador: não troca
  assert.equal(divindadeTravada(a), true);
  assert.equal(await resolverEscolha(a, fe), false);
  // Mestre: troca e os poderes da antiga saem
  game.user.isGM = true;
  respostaDivindade = "nocturna";
  assert.equal(await resolverEscolha(a, fe), true);
  assert.equal(a.system.identidade.divindade, "nocturna");
  assert.deepEqual(a.items.filter(i => i.flags["icarus-rpg"].concedido).map(i => i.flags["icarus-rpg"].divindade), ["nocturna", "nocturna", "nocturna"]);
  game.user.isGM = false;
});

test("Critério 3: violar um Dogma — 1ª vez zera o PM e bloqueia 1d4 dias; 2ª vez Anátema (sai a devoção e os Concedidos)", async () => {
  assert.deepEqual(violarDogma({}, 3), { violacoes: 1, bloqueioPMDias: 3, anatema: false, zerarPM: true });
  assert.equal(violarDogma({ violacoes: 1 }, 2).anatema, true);
  const a = atorSimulado();
  const [fe] = await a.createEmbeddedDocuments("Item", [{ type: "poder", name: "Fé Jurada", system: {}, flags: { "icarus-rpg": { id: idDeClasse("clerigo", "fe-jurada"), classe: "clerigo" } } }]);
  respostaDivindade = "irae";
  await resolverEscolha(a, fe);
  // Só o Mestre registra
  await ACOES_DE_MECANICA.get("clerigo:dogma")(a);
  assert.ok(avisos.includes("ICARUS.Clerigo.SoMestre"));
  assert.equal(a.system.pm.value, 20);
  game.user.isGM = true;
  await ACOES_DE_MECANICA.get("clerigo:dogma")(a);
  assert.equal(a.system.pm.value, 0);
  assert.deepEqual(a.flags["icarus-rpg"].dogma, { violacoes: 1, bloqueioPMDias: 3 });
  // Bloqueio: o jogador não recupera PM
  game.user.isGM = false;
  const mudancas = { "system.pm.value": 5 };
  for (const fn of ganchos.preUpdateActor) fn(a, mudancas, {}, "u1");
  assert.equal(mudancas["system.pm.value"], 0);
  // Passou 1 dia (Mestre)
  game.user.isGM = true;
  await ACOES_DE_MECANICA.get("clerigo:dia")(a);
  assert.equal(a.flags["icarus-rpg"].dogma.bloqueioPMDias, 2);
  // 2ª violação
  await ACOES_DE_MECANICA.get("clerigo:dogma")(a);
  assert.equal(a.flags["icarus-rpg"].anatema, true);
  assert.equal(a.system.identidade.divindade, "");
  assert.equal(a.items.filter(i => i.flags["icarus-rpg"].concedido).length, 0);
  assert.ok(erros.includes("ICARUS.Clerigo.AnatemaAviso"));
  game.user.isGM = false;
});

test("Magias do Clérigo: o jogador não passa do limite nem pega magia Arcana; o Mestre só é avisado", () => {
  const a = atorSimulado();
  const magia = (nivel, tradicoes) => ({ type: "magia", parent: a, system: { nivel, tradicoes } });
  const pre = item => ganchos.preCreateItem.map(fn => fn(item, {}, {}, "u1")).find(r => r === false);
  assert.equal(pre(magia(1, ["divina"])), undefined);
  assert.equal(pre(magia(1, ["arcana"])), false);
  assert.equal(pre(magia(3, ["divina"])), false, "nível 5: só até o 2º");
  for (let i = 0; i < 7; i++) a.items.push({ type: "magia", flags: {} });
  assert.equal(pre(magia(1, ["divina"])), false, "limite 7 no 5º nível");
  game.user.isGM = true;
  assert.equal(pre(magia(1, ["divina"])), undefined);
  game.user.isGM = false;
});

test("Migração 0.25.0: focos nas fichas com o ícone padrão recebem a imagem; ícone escolhido fica", async () => {
  const { iconeNovoDoFoco } = await import("../module/migracoes.mjs");
  const foco = (id, img) => ({ img, flags: { "icarus-rpg": { id } } });
  assert.equal(iconeNovoDoFoco(foco("foco:grimorio", "icons/svg/item-bag.svg")), "systems/icarus-rpg/img/Icones/itens/equipamentos/focos%20arcanos/Grim%C3%B3rio.png");
  assert.ok(iconeNovoDoFoco(foco("foco:bordao-arcano", "systems/icarus-rpg/img/Icones/itens/equipamentos/armas/Bord%C3%A3o.png")).includes("Bord%C3%A3o%20Arcano"));
  assert.equal(iconeNovoDoFoco(foco("foco:grimorio", "worlds/x/meu.png")), null);
  assert.equal(iconeNovoDoFoco(foco("adaga", "icons/svg/item-bag.svg")), null);
});

test("Arma Consagrada: +1 passo no dado da arma, Sabedoria no ataque e no dano, só na arma consagrada", async () => {
  const { subirPasso, calcularDano } = await import("../module/combate.mjs");
  const { PROVEDORES_ATAQUE, MODIFICADORES_ATAQUE } = await import("../module/combate-chat.mjs");
  assert.deepEqual(["1d4", "1d6", "1d8", "1d10", "1d12", "3d6", "4d6", "2d6", "2d12", "1d3"].map(d => subirPasso(d)),
    ["1d6", "1d8", "1d10", "1d12", "3d6", "4d6", "4d8", "2d8", "3d12", "1d4"]);
  assert.equal(subirPasso("1d6", 2), "1d10");
  assert.equal(subirPasso("2d4+1"), "2d4+1", "fórmula composta fica");
  const sistema = { atributos: { FOR: { total: 1 }, SAB: { total: 4 } } };
  assert.equal(calcularDano(sistema, { dano: "1d8" }, "corpo-a-corpo", { atributo: "SAB", passosDano: 1 }).formula, "1d10 + 4");
  // Ator com a maça consagrada
  const flags = { "icarus-rpg": { armaConsagrada: "maca" } };
  const ator = { flags, getFlag: (_s, k) => flags["icarus-rpg"][k], items: [], system: {
    atributos: { FOR: { total: 1 }, DES: { total: 0 }, SAB: { total: 4 } }, pericias: { luta: { total: 3, atributo: "FOR" } }, proficiencias: { armas: ["simples"], armaduras: [] }, bonus: {} } };
  const maca = { id: "maca", type: "arma", system: { dano: "1d8", propriedades: [], categoria: "simples" } };
  const adaga = { id: "adaga", type: "arma", system: { dano: "1d4", propriedades: [], categoria: "simples" } };
  const secoes = arma => PROVEDORES_ATAQUE.map(p => p(ator, arma, "corpo-a-corpo")).filter(s => s?.id === "arma-consagrada");
  assert.equal(secoes(maca).length, 1);
  assert.equal(secoes(maca)[0].campos[0].valor, true, "marcada por padrão");
  assert.equal(secoes(adaga).length, 0, "só a arma consagrada");
  const mods = await Promise.all(MODIFICADORES_ATAQUE.map(m => m({ actor: ator, item: maca, modo: "corpo-a-corpo", opcoes: { armaConsagrada: true }, alvos: [] })));
  const m = mods.find(x => x?.passosDano);
  assert.deepEqual([m.bonus, m.atributoDano, m.passosDano], [3, "SAB", 1]);
  const desmarcado = await Promise.all(MODIFICADORES_ATAQUE.map(f => f({ actor: ator, item: maca, modo: "corpo-a-corpo", opcoes: {}, alvos: [] })));
  assert.ok(!desmarcado.some(x => x?.passosDano), "desmarcada no diálogo: nada muda");
});
