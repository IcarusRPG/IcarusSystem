/** Área da magia no mapa: leitura do texto, dados do modelo, quem fica dentro e pontos da animação. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { areaDaMagia, dadosDoTemplate, dentroDaArea } from "../module/magias-area.mjs";
import { pontosDaAnimacao } from "../module/vfx-magias.mjs";

const MAGIAS = JSON.parse(readFileSync(new URL("../tools/dados/magias.json", import.meta.url), "utf8"));
const lista = Array.isArray(MAGIAS) ? MAGIAS : MAGIAS.magias;
const magia = id => lista.find(m => m.id === id);

test("Área pelo texto: esfera (raio), cone e linha do alcance, quadrado, centrada no conjurador e opcional", () => {
  assert.deepEqual(areaDaMagia(magia("bola-de-fogo")), { forma: "esfera", tamanho: 6, noConjurador: false, opcional: false });
  assert.deepEqual(areaDaMagia(magia("cone-de-chamas")), { forma: "cone", tamanho: 4.5, noConjurador: false, opcional: false });
  assert.equal(areaDaMagia(magia("relampago")).forma, "linha");
  assert.equal(areaDaMagia(magia("teia")).forma, "quadrado");
  assert.equal(areaDaMagia(magia("coluna-flamejante")).forma, "esfera");
  assert.equal(areaDaMagia(magia("hino-de-coragem")).noConjurador, true);
  assert.equal(areaDaMagia(magia("aura-de-pureza")).noConjurador, true);
  assert.equal(areaDaMagia(magia("dissipar-magia")).opcional, true);
  assert.equal(areaDaMagia(magia("ilusao-menor")), null);
  assert.equal(areaDaMagia(magia("misseis-magicos")), null);
});

test("Dados do modelo: círculo, cone com ângulo, linha com largura, quadrado centralizado no ponto", () => {
  const o = { pxPorMetro: 100 / 1.5 };
  assert.deepEqual(dadosDoTemplate({ forma: "esfera", tamanho: 6 }, { x: 500, y: 400 }, o), { x: 500, y: 400, direction: 0, t: "circle", distance: 6 });
  assert.deepEqual(dadosDoTemplate({ forma: "cone", tamanho: 9 }, { x: 0, y: 0, direcao: 90 }, o), { x: 0, y: 0, direction: 90, t: "cone", distance: 9, angle: 53.13 });
  assert.deepEqual(dadosDoTemplate({ forma: "linha", tamanho: 18 }, { x: 0, y: 0, direcao: 180 }, o), { x: 0, y: 0, direction: 180, t: "ray", distance: 18, width: 1.5 });
  const q = dadosDoTemplate({ forma: "quadrado", tamanho: 6 }, { x: 500, y: 400 }, o);
  assert.deepEqual([q.t, q.x, q.y, q.direction, q.distance], ["rect", 300, 200, 45, 8.49]);
});

test("Quem fica dentro: esfera pelo raio, cone pelo ângulo, linha pela largura, quadrado pelo lado", () => {
  const o = { pxPorMetro: 100 / 1.5 }; // 1 quadrado = 1,5 m = 100 px
  const esfera = { forma: "esfera", tamanho: 6, x: 0, y: 0 }; // 400 px
  assert.ok(dentroDaArea(esfera, { x: 390, y: 0 }, o));
  assert.ok(!dentroDaArea(esfera, { x: 300, y: 300 }, o));
  const cone = { forma: "cone", tamanho: 9, x: 0, y: 0, direcao: 0 }; // 600 px, ±26,5°
  assert.ok(dentroDaArea(cone, { x: 500, y: 100 }, o));
  assert.ok(!dentroDaArea(cone, { x: 300, y: 300 }, o), "45° fica fora");
  assert.ok(!dentroDaArea(cone, { x: -200, y: 0 }, o), "atrás fica fora");
  assert.ok(dentroDaArea({ ...cone, direcao: 90 }, { x: 0, y: 500 }, o), "girado para baixo");
  const linha = { forma: "linha", tamanho: 18, x: 0, y: 0, direcao: 0 }; // 1200 px, 100 px de largura
  assert.ok(dentroDaArea(linha, { x: 1100, y: 40 }, o));
  assert.ok(!dentroDaArea(linha, { x: 600, y: 120 }, o));
  const quadrado = { forma: "quadrado", tamanho: 6, x: 0, y: 0 }; // 400 px de lado
  assert.ok(dentroDaArea(quadrado, { x: 190, y: -190 }, o));
  assert.ok(!dentroDaArea(quadrado, { x: 250, y: 0 }, o));
});

test("Animação: com a área posicionada, explode no ponto do modelo; cone e linha saem do modelo na direção dele", () => {
  const token = (x, y) => ({ x, y, w: 100, h: 100 });
  const sem = pontosDaAnimacao(token(0, 0), [token(400, 0), token(600, 0)]);
  assert.deepEqual([sem.meio, sem.direcao], [{ x: 550, y: 50 }, null]);
  const esfera = pontosDaAnimacao(token(0, 0), [token(400, 0)], { forma: "esfera", tamanho: 6, x: 900, y: 700 });
  assert.deepEqual([esfera.origem, esfera.meio], [{ x: 50, y: 50 }, { x: 900, y: 700 }]);
  const cone = pontosDaAnimacao(token(0, 0), [], { forma: "cone", tamanho: 9, x: 50, y: 50, direcao: 90 });
  assert.deepEqual(cone.saida, { x: 50, y: 50 });
  assert.equal(cone.direcao, Math.PI / 2);
});
