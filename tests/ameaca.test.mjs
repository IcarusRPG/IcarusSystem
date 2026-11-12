/** Ameaças (0.36.0): modelo, derivação, compêndio da fauna, tamanho do token, ataques naturais e aba Token. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Campos do Foundry só com o "initial" (para ler os padrões do schema)
class Campo { constructor(o = {}) { this.o = o; } padrao() { return typeof this.o.initial === "function" ? this.o.initial() : this.o.initial; } }
class SchemaField extends Campo { constructor(f, o) { super(o); this.f = f; } padrao() { return Object.fromEntries(Object.entries(this.f).map(([k, c]) => [k, c.padrao()])); } }
class ArrayField extends Campo { constructor(el, o = {}) { super(o); } padrao() { return this.o.initial ?? []; } }
const chat = [];
globalThis.foundry = {
  utils: { deepClone: o => structuredClone(o), getProperty: (o, p) => p.split(".").reduce((a, k) => a?.[k], o), setProperty() {}, randomID: () => "id" },
  data: { fields: { SchemaField, ArrayField, NumberField: Campo, StringField: Campo, BooleanField: Campo, HTMLField: Campo } },
  abstract: { TypeDataModel: class {} },
  applications: { api: { DialogV2: {}, ApplicationV2: class {}, DocumentSheetV2: class {}, HandlebarsApplicationMixin: c => c } }
};
globalThis.Handlebars = { escapeExpression: t => String(t ?? "") };
globalThis.Hooks = { on() {}, once() {} };
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };
globalThis.CONFIG = { sounds: { dice: "" }, statusEffects: [] };
globalThis.CONST = { ACTIVE_EFFECT_MODES: { ADD: 2 } };
globalThis.renderTemplate = async (_t, dados) => JSON.stringify(dados);
globalThis.ChatMessage = { create: async d => { chat.push(d); return d; }, getSpeaker: ({ actor } = {}) => ({ actor: actor?.id }), applyRollMode() {} };
let proximoD20 = 12;
globalThis.Roll = class {
  constructor(f) { this.formula = f; }
  async evaluate() {
    const d20 = /d20/.test(this.formula);
    this.dice = d20 ? [{ results: [{ result: proximoD20 }] }] : [];
    // Dano: soma o número de dados (cada dado vale 1) + o fixo, para conferir as partes
    this.total = d20 ? proximoD20 : this.formula.split("+").reduce((s, p) => s + (/d/.test(p) ? Number(p.trim().split("d")[0]) : Number(p) || 0), 0);
    return this;
  }
};
globalThis.game = { user: { id: "u", isGM: true, targets: new Set() }, users: [], actors: [], scenes: [], settings: { get: () => false }, i18n: { localize: k => k, format: k => k }, world: { id: "mundo" } };

const A = await import("../module/ameaca-dados.mjs");
const { AmeacaData } = await import("../module/data/actor-ameaca.mjs");
const { documentosDeAmeacas } = await import("../module/dados-compendios.mjs");
const { PERICIAS } = await import("../module/config.mjs");
const { sistemaCompleto } = await import("./simulacao.mjs");
const { rolarAtaqueNatural, rolarDanoNatural } = await import("../module/ameaca-ataques.mjs");
const { contextoDoToken, aplicarNoAtor, atualizacaoDoRetrato, tokensDoAtorNaCena } = await import("../module/token.mjs");

const DADOS = JSON.parse(fs.readFileSync(path.join(RAIZ, "tools/dados/ameacas-fauna.json"), "utf8"));
const porId = id => DADOS.ameacas.find(a => a.id === id);

/** system preparado como no Foundry: valores salvos → (Efeitos) → prepareDerivedData. */
function preparar(sistema, { efeito = null } = {}) {
  const salvo = sistemaCompleto(structuredClone(sistema));
  const s = structuredClone(salvo);
  if (efeito) efeito(s);
  Object.setPrototypeOf(s, AmeacaData.prototype);
  // parent mínimo: valores salvos (antes dos Efeitos) para o ajuste da derivação
  Object.defineProperty(s, "parent", { value: { _source: { system: salvo }, items: [], statuses: new Set() } });
  s.prepareDerivedData();
  return s;
}

test("Schema da ameaça: padrões (Defesa 10, PV 0/0, salvaguardas 0, papel solo, tamanho médio, CD vazia, sem ataques)", () => {
  const schema = AmeacaData.defineSchema();
  const p = Object.fromEntries(Object.entries(schema).map(([k, c]) => [k, c.padrao()]));
  assert.deepEqual(p.defesa, { valor: 10, outros: 0 });
  assert.deepEqual([p.pv.value, p.pv.max, p.pm.max], [0, 0, 0]);
  assert.deepEqual(p.salvaguardas, { fort: 0, ref: 0, von: 0 });
  assert.deepEqual([p.papel, p.tamanho, p.nd, p.cd, p.ndContaComo, p.iniciativa], ["solo", "medio", "1", null, null, 0]);
  assert.deepEqual(p.ataques, []);
  assert.deepEqual(schema.papel.o.choices, ["solo", "lacaio", "especial", "outro"]);
  assert.ok(schema.tamanho.o.choices.includes("colossal"));
  // O resto do personagem continua (perícias, resistências, PV temporários) para dano e condições
  assert.ok(schema.pericias && schema.resistencias && "temp" in p.pv);
});

test("Derivação: Defesa, salvaguardas e iniciativa do bestiário; perícia = atributo + treino (+ outros), sem nível", () => {
  const sistema = A.sistemaDaAmeaca(porId("ratao-de-vala"), PERICIAS);
  const s = preparar(sistema);
  assert.equal(s.defesa.total, 12);
  assert.deepEqual([s.pericias.fortitude.total, s.pericias.reflexos.total, s.pericias.vontade.total], [0, 6, -6]);
  assert.equal(s.pericias.iniciativa.total, 2);
  assert.equal(s.pericias.audicao.total, 3, "Audição +3 dos sentidos");
  assert.equal(s.pericias.atletismo.total, -2, "FOR −2, destreinado");
  // Treinado: +2; nível não entra
  const treinado = preparar({ ...sistema, nivel: 20, pericias: { ...sistema.pericias, furtividade: { treino: 1, outros: 1 } } });
  assert.equal(treinado.pericias.furtividade.total, 2 + 2 + 1, "DES 2 + treinado 2 + outros 1");
  assert.equal(treinado.pericias.reflexos.total, 6, "o nível não muda a salvaguarda");
});

test("Derivação: Efeitos somam por cima dos valores prontos; RD do bestiário passa do teto de personagem", () => {
  const sistema = A.sistemaDaAmeaca(porId("serpente-do-horizonte"), PERICIAS);
  const s = preparar(sistema, { efeito: x => { x.pericias.fortitude.outros += 2; x.defesa.outros -= 2; x.atributos.CON.base -= 1; } });
  assert.equal(s.pericias.fortitude.total, 25 + 2 - 1, "Efeito +2 em Fortitude e −1 de CON contam");
  assert.equal(s.defesa.total, 21 - 2);
  assert.equal(s.resistencias.rdGeral, 10, "RD 10 (o teto de personagem nível 1 seria 8)");
  assert.equal(s.resistencias.imunidade.veneno, true);
  assert.equal(s.pv.max, 800, "PV digitados (sem classe)");
});

test("Compêndio da fauna: 110 atores (58 + 44 + 8), IDs estáveis, pastas por papel e patamar, ordem por ND", () => {
  const imagens = Object.fromEntries(DADOS.ameacas.map(a => [a.id, a.imagem.replace(".png", ".webp")]));
  const r = documentosDeAmeacas(DADOS, { pericias: PERICIAS, imagens });
  assert.equal(r.atores.length, 110);
  const papel = p => r.atores.filter(a => a.flags["icarus-rpg"].papel === p).length;
  assert.deepEqual([papel("solo"), papel("lacaio"), papel("especial")], [58, 44, 8]);
  assert.ok(r.atores.every(a => a.type === "ameaca" && /^[A-Za-z0-9]{16}$/.test(a._id)));
  assert.equal(new Set(r.atores.map(a => a._id)).size, 110);
  assert.equal(new Set(r.atores.flatMap(a => a.items.map(i => i._id))).size, r.atores.reduce((n, a) => n + a.items.length, 0), "habilidades com IDs únicos");
  // Idempotente
  assert.deepEqual(documentosDeAmeacas(DADOS, { pericias: PERICIAS, imagens }), r);
  // Pastas
  const nomes = r.pastas.map(p => p.name);
  assert.ok(["Solo", "Lacaio", "Especial", "Iniciante (ND 1/4 a 4)", "Lenda+ (ND S e S+)"].every(n => nomes.includes(n)));
  assert.ok(r.pastas.every(p => p.type === "Actor"));
  const pastaIds = new Set(r.pastas.map(p => p._id));
  assert.ok(r.atores.every(a => pastaIds.has(a.folder)), "todo ator está numa pasta existente");
  const serpente = r.atores.find(a => a.name === "Serpente-do-Horizonte");
  assert.equal(r.pastas.find(p => p._id === serpente.folder).name, "Lenda+ (ND S e S+)");
  // Ordem: ND (1/4, 1/2, 1 … 20, S, S+) e nome
  const ordem = r.atores.map(a => A.ordemDoNd(a.system.nd));
  assert.deepEqual(ordem, [...ordem].sort((x, y) => x - y));
  assert.equal(r.atores[0].system.nd, "1/4");
  assert.equal(r.atores.at(-1).system.nd, "S+");
  // Habilidade: gatilho no começo da descrição
  const agarrar = serpente.items.find(i => i.name === "Agarrar Aprimorado");
  assert.match(agarrar.system.descricao, /^<p><em>\(livre\)<\/em> ao acertar/);
  assert.equal(r.semCd.length, 37);
  assert.equal(r.atores.find(a => a.flags["icarus-rpg"].id === "ratao-de-vala").system.cd, null, "CD nula fica vazia");
});

test("Compêndio: imagem ausente não quebra (dado azul) e o casamento de nomes é tolerante", () => {
  const r = documentosDeAmeacas(DADOS, { pericias: PERICIAS, imagens: {} });
  assert.equal(r.semImagem.length, 110);
  assert.ok(r.atores.every(a => a.img.includes("Dado") && a.prototypeToken.texture.src === a.img));
  const casado = A.casarImagens(DADOS.ameacas.slice(0, 3).concat(porId("coruja-matriarca")),
    ["Ratão-de-Vala.png", "lacaio-chacal-rubro.webp", "lacaio-morcego-dentuco.webp", "Coruja-Matriarc.png", "Sobrando.png", "leia-me.txt"]);
  assert.equal(casado.porId["ratao-de-vala"], "Ratão-de-Vala.png");
  assert.equal(casado.porId["coruja-matriarca"], "Coruja-Matriarc.png", "nome cortado casa pelo começo");
  assert.equal(casado.porId["chacal-rubro"], "lacaio-chacal-rubro.webp", "prefixo ignorado");
  assert.deepEqual(casado.orfas, ["lacaio-morcego-dentuco.webp", "Sobrando.png"], "arquivos sem criatura (o .txt nem conta)");
  assert.deepEqual(casado.semImagem, ["javali-machado"]);
});

test("Tamanho → casas do token (Pequeno/Médio 1×1, Grande 2×2, Enorme 3×3, Colossal 4×4); token hostil e não vinculado", () => {
  assert.deepEqual(["Pequeno", "Médio", "Grande", "Enorme", "Colossal"].map(A.casasDoTamanho), [1, 1, 2, 3, 4]);
  const r = documentosDeAmeacas({ ameacas: [porId("serpente-do-horizonte"), porId("ratao-de-vala")] }, { pericias: PERICIAS });
  const [ratao, serpente] = r.atores;
  assert.deepEqual([serpente.prototypeToken.width, serpente.prototypeToken.height, ratao.prototypeToken.width], [4, 4, 1]);
  assert.deepEqual([ratao.prototypeToken.actorLink, ratao.prototypeToken.disposition, ratao.prototypeToken.bar1.attribute], [false, -1, "pv"]);
});

test("Ataque natural: d20 + bônus contra a Defesa do alvo; o card guarda o ataque para o botão de dano", async () => {
  const sistema = preparar(A.sistemaDaAmeaca(porId("serpente-do-horizonte"), PERICIAS));
  const actor = { id: "s", uuid: "Actor.s", name: "Serpente", img: "s.webp", system: sistema, flags: {}, items: [] };
  game.user.targets = new Set([{ name: "Lira", document: { uuid: "Token.l" }, actor: { system: { defesa: { total: 25 } } } }]);
  proximoD20 = 12;
  await rolarAtaqueNatural(actor, 0, {});
  const msg = chat.at(-1);
  assert.deepEqual(msg.flags["icarus-rpg"].ataqueNatural, { actorUuid: "Actor.s", indice: 0, nome: "Mordida", podeCritico: false });
  const card = JSON.parse(msg.content);
  assert.equal(card.total, 12 + 13);
  assert.equal(card.alvos[0].acerta, true);
  proximoD20 = 20;
  await rolarAtaqueNatural(actor, 0, {});
  assert.equal(chat.at(-1).flags["icarus-rpg"].ataqueNatural.podeCritico, true, "20 natural: crítico");
  game.user.targets = new Set();
});

test("Dano natural: mesmas flags de dano das armas (componentes por tipo); crítico dobra só os dados da arma natural", async () => {
  const sistema = preparar(A.sistemaDaAmeaca(porId("serpente-do-horizonte"), PERICIAS));
  const actor = { id: "s", uuid: "Actor.s", name: "Serpente", img: "s.webp", system: sistema, flags: {}, items: [] };
  await rolarDanoNatural(actor, 0);
  const dano = chat.at(-1).flags["icarus-rpg"].dano;
  assert.equal(dano.rollType, "dano");
  // Roll de teste: cada dado vale 1 → 2d8+26 = 28 perfuração; 6d6 = 6 veneno
  assert.deepEqual(dano.componentes, [{ tipo: "perfuracao", valor: 28 }, { tipo: "veneno", valor: 6 }]);
  assert.equal(dano.total, 34);
  assert.deepEqual(chat.at(-1).flags["icarus-rpg"].aplicacoes, [], "pronto para os botões de aplicar");
  await rolarDanoNatural(actor, 0, { critico: true });
  const critico = chat.at(-1).flags["icarus-rpg"].dano;
  assert.equal(critico.critico, true);
  assert.deepEqual(critico.componentes, [{ tipo: "perfuracao", valor: 4 + 26 }, { tipo: "veneno", valor: 6 }], "4d8+26; o veneno não multiplica");
  assert.deepEqual(A.partesDoAtaque({ dados: "1d4", fixo: 4, tipo: "impacto, só contra alvo Caído" }), [{ formula: "1d4 + 4", tipo: "impacto" }]);
  assert.equal(A.lerTipoDoAtaque("impacto, só contra alvo Caído").nota, "só contra alvo Caído");
  assert.deepEqual(A.lerTipoDoAtaque("fogo e perfuração").tipos, ["fogo", "perfuracao"]);
});

test("Aba Token no mercador e na ameaça (mesmo template do personagem, sem cópia)", () => {
  const tokenHbs = '{{> "systems/icarus-rpg/templates/actor/parts/token.hbs"}}';
  for (const t of ["mercador.hbs", "ameaca.hbs", "personagem.hbs"]) {
    assert.ok(fs.readFileSync(path.join(RAIZ, "templates/actor", t), "utf8").includes('data-tab="token"') || fs.readFileSync(path.join(RAIZ, "templates/actor", t), "utf8").includes(tokenHbs), t);
  }
  for (const f of ["ficha-mercador.mjs", "ficha-ameaca.mjs"]) {
    const codigo = fs.readFileSync(path.join(RAIZ, "module/sheets", f), "utf8");
    assert.match(codigo, /contextoDoToken\(actor, this\.isEditable\)/, f);
    assert.match(codigo, /ligarEditor\(this\)/, f);
    assert.match(codigo, /"token"\]/, `${f}: aba "token" na lista`);
  }
});

test("Token de ator não vinculado: Aplicar muda só o prototype; as cópias na cena só com a caixa marcada", async () => {
  const atualizacoes = [];
  const actor = {
    id: "a1", name: "Lobo", img: "lobo.webp", isOwner: true, pack: null,
    prototypeToken: { actorLink: false, texture: { src: "lobo.webp" } }, flags: { "icarus-rpg": {} },
    async update(m) { for (const [k, v] of Object.entries(m)) k.split(".").reduce((o, p, i, l) => (i === l.length - 1 ? (o[p] = v) : (o[p] ??= {})), this); }
  };
  const cena = { name: "Mata", tokens: [{ id: "t1", actorId: "a1", actorLink: false }, { id: "t2", actorId: "a1", actorLink: false }, { id: "t3", actorId: "x", actorLink: false }],
    async updateEmbeddedDocuments(_t, d) { atualizacoes.push(...d); } };
  game.scenes = [cena];
  const ctx = contextoDoToken(actor, true);
  assert.deepEqual([ctx.vinculado, ctx.tokensNaCena, ctx.copiasNaCena, ctx.editavel], [false, false, 2, true]);
  assert.deepEqual(tokensDoAtorNaCena(cena.tokens, actor).map(t => t.id), ["t1", "t2"]);
  await aplicarNoAtor(actor, "p.png", { molduraId: "metal" }, { atualizarCena: true });
  assert.equal(atualizacoes.length, 0, "sem consentimento, a cena não muda");
  assert.match(actor.prototypeToken.texture.src, /^p\.png\?v=/);
  await aplicarNoAtor(actor, "p.png", { molduraId: "metal" }, { atualizarCopias: true });
  assert.deepEqual(atualizacoes.map(t => t._id), ["t1", "t2"]);
  // Compêndio: sem editor
  assert.deepEqual([contextoDoToken({ ...actor, pack: "icarus-rpg.ameacas-fauna" }, true).editavel, contextoDoToken({ ...actor, pack: "x" }, true).noCompendio], [false, true]);
  // Ficha do token não vinculado (ator sintético): sem editor
  assert.equal(contextoDoToken({ ...actor, isToken: true }, true).sintetico, true);
  game.scenes = [];
});

test("Trocar o retrato não sobrescreve um token finalizado na aba Token", () => {
  const novo = { flags: {} };
  assert.deepEqual(atualizacaoDoRetrato(novo, "r.webp"), { dados: { img: "r.webp", "prototypeToken.texture.src": "r.webp" }, avisar: false });
  const pronto = { flags: { "icarus-rpg": { token: { imagemFinal: "worlds/m/icarus-tokens/a.png?v=1" } } } };
  assert.deepEqual(atualizacaoDoRetrato(pronto, "r.webp"), { dados: { img: "r.webp" }, avisar: true });
});

test("Leitura do bestiário: RD (sem as condicionais), imunidades a tipos de dano, Visão/Audição, iniciativa e ND", () => {
  assert.equal(A.rdDasHabilidades(porId("cabeca-de-kraken").habilidades), 0, "RD só enquanto houver tentáculo: fica no texto");
  assert.equal(A.rdDasHabilidades(porId("salamandra-de-magma").habilidades), 5);
  assert.deepEqual(A.imunidadesDasHabilidades(porId("uivador-da-tundra").habilidades), [], "frio natural é condicional");
  assert.deepEqual(A.periciasDosSentidos("percepção às cegas (médio), Audição +6, visão fraca (Visão –4)"), { visao: -4, audicao: 6 });
  assert.deepEqual(["+2", "–1", "+0"].map(A.inteiroDoTexto), [2, -1, 0]);
  assert.deepEqual(["1/4", "4", "5", "16", "17", "20", "S", "S+"].map(n => A.patamarDoNd(n).id), ["iniciante", "iniciante", "veterano", "campeao", "lenda", "lenda", "lenda-mais", "lenda-mais"]);
  assert.equal(A.valorDoNd("S", 20), 20);
});
