/** Magias (Fase 2): custo, CD, atributo-chave, compêndio e lista da aba. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  custoDoLancamento, podeLancar, cdDaMagia, atributoDeMagia, nivelMaximoDeMagia, tipoDeDuracao,
  documentosDeMagias, gruposDeMagias, CUSTO_POR_NIVEL, iconeDaMagia
} from "../module/magias-dados.mjs";
import { idEstavel } from "../module/dados-itens.mjs";

const ler = n => JSON.parse(fs.readFileSync(new URL(`../tools/dados/${n}.json`, import.meta.url), "utf8"));
const dados = ler("magias");
const bola = dados.magias.find(m => m.id === "bola-de-fogo");

test("Custo: base + aprimoramentos (cada um uma vez); PM insuficiente bloqueia", () => {
  assert.deepEqual(custoDoLancamento(bola, []), { base: 6, extra: 0, total: 6, indices: [] });
  assert.equal(custoDoLancamento(bola, [0, 1]).total, 9);
  assert.equal(custoDoLancamento(bola, [0, 0, 0]).total, 7, "o mesmo aprimoramento conta uma vez");
  assert.equal(custoDoLancamento(bola, [9, -1, "x"]).total, 6, "índices inválidos ignorados");
  assert.deepEqual(podeLancar(5, 6), { pode: false, motivo: "semPM", falta: 1 });
  assert.equal(podeLancar(6, 6).pode, true);
});

test("CD = 10 + metade do nível + atributo-chave (escolhido, da classe ou INT)", () => {
  const s = { nivel: 5, classeConfig: { pmAtributo: "SAB" }, magia: { atributo: "" }, atributos: { INT: { total: 1 }, SAB: { total: 3 }, CAR: { total: 4 } } };
  assert.equal(atributoDeMagia(s), "SAB");
  assert.equal(cdDaMagia(s), 15);
  assert.equal(cdDaMagia({ ...s, magia: { atributo: "CAR" } }), 16);
  assert.equal(atributoDeMagia({ classeConfig: { pmAtributo: null } }), "INT");
});

test("Nível de magia pelo nível do personagem (1º, 5º, 9º, 13º, 17º) e custos por nível", () => {
  assert.deepEqual([1, 4, 5, 9, 13, 17, 20].map(nivelMaximoDeMagia), [1, 1, 2, 3, 4, 5, 5]);
  assert.deepEqual(CUSTO_POR_NIVEL, dados.custoPorNivel);
  for (const m of dados.magias) assert.equal(m.custoPM, CUSTO_POR_NIVEL[m.nivel], m.id);
});

test("Duração: sustentada, concentração, cena, instantânea", () => {
  assert.equal(tipoDeDuracao("sustentada (concentração)"), "concentracao");
  assert.equal(tipoDeDuracao("sustentada"), "sustentada");
  assert.equal(tipoDeDuracao("cena"), "cena");
  assert.equal(tipoDeDuracao("instantânea"), "instantanea");
});

test("Compêndio: árvore Divinas/Arcanas/Sangue → níveis, ids estáveis e texto igual ao JSON; build repetível", () => {
  const a = documentosDeMagias(dados, ler("magias_icones"), idEstavel);
  const b = documentosDeMagias(dados, ler("magias_icones"), idEstavel);
  assert.deepEqual(a, b);
  // Uma cópia por tradição (Divinas, Arcanas, Sangue), cada uma em 1º a 5º Nível
  const copias = dados.magias.reduce((s, m) => s + m.tradicoes.length, 0);
  assert.equal(a.itens.length, copias);
  assert.equal(a.pastas.length, 3 + 15);
  assert.deepEqual(a.pastas.filter(p => !p.folder).map(p => p.name), ["Divinas", "Arcanas", "Sangue"]);
  assert.equal(new Set(a.itens.map(i => i._id)).size, copias);
  assert.equal(new Set(a.itens.map(i => i.flags["icarus-rpg"].id)).size, 200);
  const pastaDe = id => a.pastas.find(p => p._id === id);
  // Dissipar Magia nas três tradições (uma cópia por pasta, ids diferentes, o mesmo id de magia)
  const dissipar = a.itens.filter(i => i.flags["icarus-rpg"].id === "dissipar-magia");
  assert.deepEqual(dissipar.map(d => pastaDe(pastaDe(d.folder).folder).name).sort(), ["Arcanas", "Divinas", "Sangue"]);
  assert.equal(new Set(dissipar.map(d => d._id)).size, 3);
  const porTradicao = t => dados.magias.filter(m => m.tradicoes.includes(t)).length;
  assert.deepEqual([porTradicao("arcana"), porTradicao("divina"), porTradicao("sangue")], [97, 79, 51]);
  const bolaDoc = a.itens.find(i => i.flags["icarus-rpg"].id === "bola-de-fogo");
  assert.equal(pastaDe(bolaDoc.folder).name, "3º Nível");
  assert.equal(pastaDe(pastaDe(bolaDoc.folder).folder).name, "Arcanas");
  const doc = a.itens.find(i => i.flags["icarus-rpg"].id === "bola-de-fogo");
  assert.equal(doc.img, "systems/icarus-rpg/img/magias/bola-de-fogo.png");
  assert.ok(doc.system.descricao.includes("6d6 de dano de fogo"));
  assert.deepEqual(doc.system.aprimoramentos, bola.aprimoramentos);
  assert.ok(!iconeDaMagia("nao-existe", []).includes("img/magias"), "sem ícone: padrão");
});

test("Aba: agrupa por nível, ordena por nome e filtra por busca, nível e escola", () => {
  const itens = [
    { name: "Bola de Fogo", system: { nivel: 3, escola: "Evocação" } },
    { name: "Armadura Arcana", system: { nivel: 1, escola: "Abjuração" } },
    { name: "Mísseis Mágicos", system: { nivel: 1, escola: "Evocação" } }
  ];
  const g = gruposDeMagias(itens);
  assert.deepEqual(g.map(x => [x.nivel, x.magias.map(m => m.name)]), [[1, ["Armadura Arcana", "Mísseis Mágicos"]], [3, ["Bola de Fogo"]]]);
  assert.deepEqual(gruposDeMagias(itens, { busca: "misseis" })[0].magias.map(m => m.name), ["Mísseis Mágicos"]);
  assert.deepEqual(gruposDeMagias(itens, { escola: "Evocação", nivel: 3 }).map(x => x.nivel), [3]);
});
