/** Poderes Gerais (0.42.0): compêndio por grupo, campos do item e selo na ficha. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { documentosDePoderesGerais, dadosDoPoderGeral, htmlDosParagrafos } from "../module/dados-compendios.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ler = rel => fs.readFileSync(path.join(RAIZ, rel), "utf8");
const DADOS = JSON.parse(ler("tools/dados/poderes-gerais.json"));

test("compêndio: 10 pastas na ordem dos grupos e 71 poderes (7+12+6+7+8+12+5+5+2+7)", () => {
  const { pastas, itens } = documentosDePoderesGerais(DADOS);
  assert.deepEqual(pastas.map(p => p.name), DADOS.grupos);
  assert.deepEqual(pastas.map(p => p.sort), DADOS.grupos.map((_, i) => (i + 1) * 100000));
  assert.equal(itens.length, 71);
  const porPasta = pastas.map(p => itens.filter(i => i.folder === p._id).length);
  assert.deepEqual(porPasta, [7, 12, 6, 7, 8, 12, 5, 5, 2, 7]);
  assert.equal(new Set(itens.map(i => i._id)).size, 71);
  assert.equal(new Set([...itens, ...pastas].map(d => d._id)).size, 81);
});

test("compêndio: ordem alfabética dentro de cada pasta", () => {
  const { pastas, itens } = documentosDePoderesGerais(DADOS);
  for (const p of pastas) {
    const nomes = itens.filter(i => i.folder === p._id).sort((a, b) => a.sort - b.sort).map(i => i.name);
    assert.deepEqual(nomes, [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR")), p.name);
  }
});

test("compêndio: grupoOrdem do JSON bate com a posição do grupo na lista", () => {
  for (const p of DADOS.poderes) assert.equal(DADOS.grupos[p.grupoOrdem], p.grupo, p.id);
});

test("compêndio: id repetido ou grupo fora da lista para o build", () => {
  const p = DADOS.poderes[0];
  assert.throws(() => documentosDePoderesGerais({ grupos: DADOS.grupos, poderes: [p, p] }), /id repetido "corpo-rijo"/);
  assert.throws(() => documentosDePoderesGerais({ grupos: ["X"], poderes: [p] }), /não está em grupos/);
});

test("item: tipo poder, fonte geral, categoria Poder Geral e requisitos guardados", () => {
  const { itens } = documentosDePoderesGerais(DADOS);
  const pesada = itens.find(i => i.name === "Couraça Pesada");
  assert.equal(pesada.type, "poder");
  assert.equal(pesada.system.fonte, "geral");
  assert.equal(pesada.system.tipoPoder, "geral");
  assert.equal(pesada.system.grupo, "Aprimoramentos");
  assert.equal(pesada.system.prerequisito, "Couraça Média, Força 1");
  assert.deepEqual(pesada.system.atributoMinimo, { FOR: 1 });
  assert.deepEqual(pesada.system.requerPoderes, ["couraca-media"]);
  assert.deepEqual(pesada.system.requisitos, { poderes: ["Couraça Média"], atributos: { for: 1 } });
  assert.equal(pesada.flags["icarus-rpg"].poderGeral, "couraca-pesada");
  assert.match(pesada.system.descricao, /^<p class="icarus-prerequisito"><strong>Pré-requisitos:<\/strong> Couraça Média, Força 1\.<\/p><p>Você recebe/);
  // Nível mínimo e conjurador
  const palavra = itens.find(i => i.name === "Palavra Curta");
  assert.equal(palavra.system.nivelMinimo, 5);
  assert.equal(palavra.system.requisitos.conjurador, true);
});

test("item: 'nenhum' deixa o campo vazio e a descrição diz 'nenhum'; repetível marcado", () => {
  const estudos = dadosDoPoderGeral(DADOS.poderes.find(p => p.id === "estudos-paralelos"));
  assert.equal(estudos.system.prerequisito, "");
  assert.equal(estudos.system.repetivel, true);
  assert.match(estudos.system.descricao, /Pré-requisitos:<\/strong> nenhum\./);
  assert.match(estudos.system.descricao, /<p class="icarus-repetivel"><strong>Repetível\.<\/strong><\/p>$/);
  const repetiveis = DADOS.poderes.filter(p => p.repetivel).map(p => p.id).sort();
  assert.deepEqual(repetiveis, ["boca-de-muitas-linguas", "escola-predileta", "estudos-paralelos", "instinto-de-cacador"]);
});

test("html: parágrafos e escape", () => {
  assert.equal(htmlDosParagrafos("a\n\nb < c"), "<p>a</p><p>b &lt; c</p>");
  assert.equal(htmlDosParagrafos("linha 1\nlinha 2"), "<p>linha 1<br>linha 2</p>");
  assert.equal(htmlDosParagrafos(""), "");
});

test("system.json: pack poderes-gerais com o rótulo pedido, na pasta do sistema", () => {
  const sj = JSON.parse(ler("system.json"));
  const pack = sj.packs.find(p => p.name === "poderes-gerais");
  assert.equal(pack?.label, "Icarus: Poderes Gerais");
  assert.equal(pack.type, "Item");
  assert.ok(sj.packFolders[0].packs.includes("poderes-gerais"));
});

test("modelo e ficha: tipoPoder aceita 'geral', campo requisitos e selo Geral na lista de poderes", () => {
  const modelo = ler("module/data/item-poder.mjs");
  assert.match(modelo, /choices: \["", "habilidade", "poder", "geral"\]/);
  assert.match(modelo, /requisitos: new fields\.ObjectField/);
  assert.match(ler("templates/actor/parts/poderes.hbs"), /\{\{#if geral\}\}.*ICARUS\.Poderes\.TagGeral/);
  assert.match(ler("module/sheets/ficha-personagem.mjs"), /geral: p\.system\.tipoPoder === "geral"/);
});

test("ordem manual: põe o compêndio em 'm' só se o usuário ainda não escolheu", async () => {
  const { modosComOrdemManual } = await import("../module/compendios.mjs");
  assert.deepEqual(modosComOrdemManual({}), { "icarus-rpg.poderes-gerais": "m" });
  assert.deepEqual(modosComOrdemManual(undefined), { "icarus-rpg.poderes-gerais": "m" });
  assert.deepEqual(modosComOrdemManual({ "icarus-rpg.armas": "a" }), { "icarus-rpg.armas": "a", "icarus-rpg.poderes-gerais": "m" });
  assert.equal(modosComOrdemManual({ "icarus-rpg.poderes-gerais": "a" }), null);
});
