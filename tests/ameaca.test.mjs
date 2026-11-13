/** Ameaças (0.36.0): modelo, derivação, compêndio da fauna, tamanho do token, ataques naturais e aba Token. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Campos do Foundry só com o "initial" (para ler os padrões do schema)
class Campo { constructor(o = {}) { this.o = o; } padrao() { return typeof this.o.initial === "function" ? this.o.initial() : this.o.initial; } }
class SchemaField extends Campo { constructor(f, o) { super(o); this.f = f; this.fields = f; } padrao() { return Object.fromEntries(Object.entries(this.f).map(([k, c]) => [k, c.padrao()])); } }
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
const { idEstavel } = await import("../module/dados-itens.mjs");
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

/** Tema da fauna como o build monta (imagens casadas com os nomes do JSON, em .webp). */
const fauna = (arquivos = Object.fromEntries(DADOS.ameacas.map(a => [a.id, a.imagem.replace(".png", ".webp")]))) =>
  ({ id: "fauna", nome: "Fauna", imagens: "Fauna", ameacas: DADOS.ameacas, arquivos });
/** Caminho de pastas de um ator: ["Fauna", "Solo", "ND S+"]. */
const caminho = (r, folder) => {
  const nomes = [];
  for (let p = r.pastas.find(x => x._id === folder); p; p = r.pastas.find(x => x._id === p.folder)) nomes.unshift(p.name);
  return nomes;
};

test("Compêndio Icarus: Ameaças — fauna: 110 atores (58 + 44 + 8), IDs estáveis de sempre, idempotente", () => {
  const r = documentosDeAmeacas([fauna()], { pericias: PERICIAS });
  assert.equal(r.atores.length, 110);
  const papel = p => r.atores.filter(a => a.flags["icarus-rpg"].papel === p).length;
  assert.deepEqual([papel("solo"), papel("lacaio"), papel("especial")], [58, 44, 8]);
  assert.ok(r.atores.every(a => a.type === "ameaca" && a.flags["icarus-rpg"].tema === "fauna"));
  assert.ok(r.atores.every(a => a._id === idEstavel(`ameaca:${a.flags["icarus-rpg"].id}`)), "o _id do ator não mudou com as pastas");
  assert.equal(new Set(r.atores.map(a => a._id)).size, 110);
  assert.equal(new Set(r.atores.flatMap(a => a.items.map(i => i._id))).size, r.atores.reduce((n, a) => n + a.items.length, 0), "habilidades com IDs únicos");
  assert.deepEqual(documentosDeAmeacas([fauna()], { pericias: PERICIAS }), r, "idempotente");
  const serpente = r.atores.find(a => a.name === "Serpente-do-Horizonte");
  assert.match(serpente.items.find(i => i.name === "Agarrar Aprimorado").system.descricao, /^<p><em>\(livre\)<\/em> ao acertar/);
  assert.equal(r.semCd.length, 37);
  assert.equal(r.atores.find(a => a.flags["icarus-rpg"].id === "ratao-de-vala").system.cd, null, "CD nula fica vazia");
});

test("Pastas: Tema > Papel (Especial, Lacaio, Solo) > ND, sem pasta vazia, ND na ordem real, atores em ordem alfabética", () => {
  const r = documentosDeAmeacas([fauna()], { pericias: PERICIAS });
  const filhas = mae => r.pastas.filter(p => p.folder === mae).sort((a, b) => a.sort - b.sort);
  const [tema] = filhas(null);
  assert.equal(tema.name, "Fauna");
  assert.ok(r.pastas.every(p => p.type === "Actor" && p.sorting === "m"));
  assert.deepEqual(filhas(tema._id).map(p => p.name), ["Especial", "Lacaio", "Solo"]);
  const solo = filhas(tema._id)[2];
  const nds = filhas(solo._id).map(p => p.name);
  assert.deepEqual(nds.slice(0, 3), ["ND 1/4", "ND 1/2", "ND 1"]);
  assert.deepEqual(nds.slice(-2), ["ND S", "ND S+"]);
  // Nenhuma pasta de ND vazia; profundidade 3
  const pastasNd = r.pastas.filter(p => p.name.startsWith("ND "));
  assert.ok(pastasNd.every(p => r.atores.some(a => a.folder === p._id)), "sem pasta vazia");
  assert.ok(r.atores.every(a => caminho(r, a.folder).length === 3));
  assert.equal(r.pastas.length, 1 + 3 + pastasNd.length);
  // Cada ator está na pasta do seu tema/papel/ND
  const serpente = r.atores.find(a => a.name === "Serpente-do-Horizonte");
  assert.deepEqual(caminho(r, serpente.folder), ["Fauna", "Solo", "ND S+"]);
  assert.ok(r.atores.every(a => caminho(r, a.folder)[2] === `ND ${a.system.nd}`));
  // Dentro da pasta: alfabética (pt-BR)
  for (const p of pastasNd) {
    const nomes = r.atores.filter(a => a.folder === p._id).sort((a, b) => a.sort - b.sort).map(a => a.name);
    assert.deepEqual(nomes, [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR")), p.name);
  }
  // IDs das pastas pelo caminho
  assert.equal(solo._id, idEstavel("pasta:ameacas:fauna:solo"));
  assert.equal(serpente.folder, idEstavel("pasta:ameacas:fauna:solo:S+"));
});

test("Vários temas: cada um na sua pasta (ordem de TEMAS), tema sem criaturas não cria pasta, id repetido entre temas falha", () => {
  assert.deepEqual(A.TEMAS.map(t => [t.id, t.dados, t.imagens]), [["fauna", "ameacas-fauna", "Fauna"], ["espectros", "ameacas-espectros", "Espectros"]]);
  const espectro = { ...porId("ratao-de-vala"), id: "vulto-de-teste", nome: "Vulto de Teste", tipo: "Espírito", papel: "lacaio", nd: "2" };
  const r = documentosDeAmeacas([fauna(), { id: "espectros", nome: "Espectros", imagens: "Espectros", ameacas: [espectro], arquivos: {} }, { id: "vazio", nome: "Vazio", imagens: "Vazio", ameacas: [] }], { pericias: PERICIAS });
  assert.deepEqual(r.pastas.filter(p => !p.folder).sort((a, b) => a.sort - b.sort).map(p => p.name), ["Fauna", "Espectros"]);
  const vulto = r.atores.find(a => a.name === "Vulto de Teste");
  assert.deepEqual(caminho(r, vulto.folder), ["Espectros", "Lacaio", "ND 2"]);
  assert.equal(vulto.flags["icarus-rpg"].tema, "espectros");
  assert.equal(vulto.system.tipo, "Espírito");
  assert.match(vulto.img, /Dado/, "sem imagem: dado azul");
  assert.ok(r.semImagem.includes("vulto-de-teste"));
  assert.throws(() => documentosDeAmeacas([fauna(), { id: "espectros", nome: "Espectros", imagens: "Espectros", ameacas: [porId("ratao-de-vala")] }]), /ratao-de-vala.*repetido/);
});

test("Compêndio: imagem ausente não quebra (dado azul) e o casamento de nomes é tolerante", () => {
  const r = documentosDeAmeacas([fauna({})], { pericias: PERICIAS });
  assert.equal(r.semImagem.length, 110);
  assert.ok(r.atores.every(a => a.img.includes("Dado") && a.prototypeToken.texture.src === a.img));
  const comImagem = documentosDeAmeacas([fauna()], { pericias: PERICIAS }).atores.find(a => a.name === "Serpente-do-Horizonte");
  assert.equal(comImagem.img, "systems/icarus-rpg/img/Ameacas/Fauna/ameaca-serpente-do-horizonte.webp", "pasta de imagens do tema");
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
  const r = documentosDeAmeacas([{ id: "fauna", nome: "Fauna", imagens: "Fauna", ameacas: [porId("serpente-do-horizonte"), porId("ratao-de-vala")] }], { pericias: PERICIAS });
  const ratao = r.atores.find(a => a.name === "Ratão-de-Vala");
  const serpente = r.atores.find(a => a.name === "Serpente-do-Horizonte");
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
  assert.deepEqual([contextoDoToken({ ...actor, pack: "icarus-rpg.ameacas" }, true).editavel, contextoDoToken({ ...actor, pack: "x" }, true).noCompendio], [false, true]);
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

/* ------------------------------ Espectros (tema 2) ------------------------------ */

const ESPECTROS = JSON.parse(fs.readFileSync(path.join(RAIZ, "tools/dados/ameacas-espectros.json"), "utf8"));
const espectro = id => ESPECTROS.ameacas.find(a => a.id === id);
const temaEspectros = () => ({ id: "espectros", nome: "Espectros", imagens: "Espectros", ameacas: ESPECTROS.ameacas, arquivos: {} });

test("Espectros: 32 atores (14 Solo, 13 Lacaio, 5 Especial), tipo Espírito, em Espectros > Papel > ND, sem colidir com a fauna", () => {
  const r = documentosDeAmeacas([fauna(), temaEspectros()], { pericias: PERICIAS });
  const esp = r.atores.filter(a => a.flags["icarus-rpg"].tema === "espectros");
  assert.equal(esp.length, 32);
  const papel = p => esp.filter(a => a.flags["icarus-rpg"].papel === p).length;
  assert.deepEqual([papel("solo"), papel("lacaio"), papel("especial")], [14, 13, 5]);
  assert.ok(esp.every(a => a.system.tipo === "Espírito"));
  assert.equal(new Set(r.atores.map(a => a._id)).size, 142, "IDs únicos entre os temas");
  assert.ok(esp.every(a => caminho(r, a.folder)[0] === "Espectros" && caminho(r, a.folder)[2] === `ND ${a.system.nd}`));
  assert.ok(esp.every(a => a.items[0].name === "Forma Espectral"), "Forma Espectral é a primeira habilidade");
  assert.ok(esp.every(a => a.prototypeToken.actorLink === false && a.prototypeToken.disposition === -1));
  assert.ok(esp.every(a => /Dado/.test(a.img)), "sem imagem: dado azul, o build não quebra");
  const lacaio = esp.find(a => a.flags["icarus-rpg"].papel === "lacaio");
  assert.ok(lacaio.system.acompanha, "lacaios trazem 'Costuma acompanhar'");
});

test("Forma Espectral: RD só contra ataques não mágicos (rdNaoMagico), fora da RD geral; Sentinela 5 + 3; imune a veneno", () => {
  for (const a of ESPECTROS.ameacas) {
    const s = A.sistemaDaAmeaca(a, PERICIAS);
    assert.equal(s.resistencias.rdGeral, 0, `${a.id}: a RD da Forma Espectral não vale contra tudo`);
    assert.equal(s.resistencias.rdNaoMagico, a.rdNaoMagico);
    assert.equal(s.resistencias.imunidade.veneno, true, `${a.id}: imune a veneno`);
    assert.equal(Object.keys(s.resistencias.imunidade).length, 1, "Agarrar, Derrubar, Doente… ficam só no texto");
  }
  const sentinela = A.sistemaDaAmeaca(espectro("sentinela-sem-descanso"), PERICIAS);
  assert.equal(sentinela.resistencias.rdNaoMagico, 5 + 3);
  // A RD comum continua sendo lida (fauna)
  assert.equal(A.rdDasHabilidades([{ texto: "Redução de Dano 10; imune a veneno." }]), 10);
  assert.equal(A.rdDasHabilidades([{ texto: "Redução de Dano 10 contra ataques não mágicos." }]), 0);
  // Schema da ameaça tem o campo novo (padrão 0)
  assert.equal(AmeacaData.defineSchema().resistencias.padrao().rdNaoMagico, 0);
  assert.ok("rdGeral" in AmeacaData.defineSchema().resistencias.padrao(), "as resistências do personagem continuam");
});

test("Aplicar dano num espectro: arma e ataque natural sofrem a RD não mágica; magia ignora; RD geral soma", async () => {
  const { calcularAplicacao, dadosDaMensagem } = await import("../module/dano-aplicacao.mjs");
  const resistencias = { rdGeral: 0, rdNaoMagico: 3, reducao: {}, imunidade: { veneno: true }, vulnerabilidade: {} };
  const pv = { value: 40, max: 40 };
  const arma = calcularAplicacao({ acao: "dano", componentes: [{ tipo: "corte", valor: 10 }], resistencias, pv });
  assert.equal(arma.final, 7);
  assert.match(arma.detalhe, /RD não mágica: −3/);
  const magia = calcularAplicacao({ acao: "dano", componentes: [{ tipo: "frio", valor: 10 }], resistencias, pv, magico: true });
  assert.equal(magia.final, 10);
  assert.match(magia.detalhe, /dano mágico: ignora/);
  const comGeral = calcularAplicacao({ acao: "dano", componentes: [{ tipo: "corte", valor: 10 }], resistencias: { ...resistencias, rdGeral: 2 }, pv });
  assert.equal(comGeral.final, 10 - 2 - 3, "RD geral + RD não mágica");
  assert.equal(calcularAplicacao({ acao: "dano", componentes: [{ tipo: "veneno", valor: 9 }], resistencias, pv }).final, 0, "imune a veneno");
  // Quem não tem RD não mágica (personagem): nada muda
  assert.equal(calcularAplicacao({ acao: "dano", componentes: [{ tipo: "corte", valor: 10 }], resistencias: { rdGeral: 2 }, pv }).final, 8);
  // Mensagens: magia (flags.magia) ou flags.dano.magico são mágicas; o resto não
  assert.equal(dadosDaMensagem({ dano: { total: 5, componentes: [] }, magia: { id: "raio" } }).magico, true);
  assert.equal(dadosDaMensagem({ dano: { total: 5, componentes: [], magico: true } }).magico, true);
  assert.equal(dadosDaMensagem({ dano: { total: 5, componentes: [] } }).magico, false);
});

test("Ataques de espectros: frio e psíquico lidos como tipos de dano e rolados com as partes certas", async () => {
  assert.equal(A.lerTipoDoAtaque("frio").tipo, "frio");
  assert.equal(A.lerTipoDoAtaque("psíquico").tipo, "psiquico");
  const comFrio = ESPECTROS.ameacas.find(a => a.ataques.some(x => x.tipo === "frio"));
  const s = preparar(A.sistemaDaAmeaca(comFrio, PERICIAS));
  const actor = { id: "e", uuid: "Actor.e", name: comFrio.nome, img: "e.webp", system: s, flags: {}, items: [] };
  const i = comFrio.ataques.findIndex(x => x.tipo === "frio");
  await rolarDanoNatural(actor, i);
  const dano = chat.at(-1).flags["icarus-rpg"].dano;
  assert.deepEqual(dano.componentes.map(c => c.tipo), ["frio"]);
  assert.equal(dano.magico, false, "ataque natural não é mágico");
});
