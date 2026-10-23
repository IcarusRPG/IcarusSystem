/** Interação por proximidade: distância do token (retângulo) à porta (segmento), tiles e notas. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  distanciaRetanguloSegmento, distanciaAoAlvo, alcanceEmPixels, dentroDoAlcance, distanciaPontoSegmento
} from "../module/interacao-geometria.mjs";

const Q = 100; // px por quadrado (cena a 1,5 m por quadrado)
const ALCANCE = alcanceEmPixels({ tamanhoQuadrado: Q, distanciaQuadrado: 1.5, distanciaMaxima: 1.5 });
/** Token 1×1 na casa (col, lin). */
const token = (col, lin, tam = 1) => ({ x: col * Q, y: lin * Q, w: tam * Q, h: tam * Q });
const perto = (t, porta) => dentroDoAlcance(distanciaRetanguloSegmento(t, porta), ALCANCE);
/** As 8 casas em volta da casa (col, lin). */
const vizinhas = (col, lin) => [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]].map(([a, b]) => [col + a, lin + b]);

test("Alcance: 1,5 m = 1 quadrado; cena a 3 m por quadrado = meio quadrado", () => {
  assert.equal(ALCANCE, 100);
  assert.equal(alcanceEmPixels({ tamanhoQuadrado: 100, distanciaQuadrado: 3, distanciaMaxima: 1.5 }), 50);
});

test("Porta deslocada meio quadrado (no meio da casa 5,5): as 8 casas em volta alcançam; 2 casas longe, não", () => {
  const porta = [5.5 * Q, 5 * Q, 5.5 * Q, 6 * Q]; // vertical, passando pelo meio da casa (5,5)
  for (const [c, l] of vizinhas(5, 5)) assert.ok(perto(token(c, l), porta), `(${c},${l})`);
  assert.ok(perto(token(5, 5), porta), "em cima da porta");
  for (const [c, l] of [[3, 5], [7, 5], [5, 2], [5, 8], [3, 3], [7, 7]]) assert.ok(!perto(token(c, l), porta), `longe (${c},${l})`);
  // Limite da regra (≤ 1 quadrado da borda): uma casa vazia entre o token e a ponta da porta ainda alcança
  assert.equal(distanciaRetanguloSegmento(token(5, 3), porta), Q);
  assert.ok(perto(token(5, 3), porta));
});

test("Porta na linha do grid (entre as casas 4 e 5 da linha 5): as 8 em volta das duas casas alcançam, inclusive na diagonal", () => {
  const porta = [5 * Q, 5 * Q, 5 * Q, 6 * Q];
  for (const [c, l] of [...vizinhas(4, 5), ...vizinhas(5, 5)]) assert.ok(perto(token(c, l), porta), `(${c},${l})`);
  // Diagonal: só o canto encosta na ponta da porta
  assert.equal(distanciaRetanguloSegmento(token(4, 4), porta), 0);
  assert.equal(distanciaRetanguloSegmento(token(6, 6), porta), Q);
  for (const [c, l] of [[2, 5], [7, 5], [5, 2], [4, 8]]) assert.ok(!perto(token(c, l), porta), `longe (${c},${l})`);
});

test("Token grande (2×2) usa a borda do retângulo", () => {
  const porta = [5.5 * Q, 5 * Q, 5.5 * Q, 6 * Q];
  assert.ok(perto(token(3, 5, 2), porta), "a borda direita está a meio quadrado da porta");
  assert.ok(!perto(token(1, 5, 2), porta));
});

test("Tile (retângulo) e nota (ponto)", () => {
  const t = token(2, 2);
  assert.equal(distanciaAoAlvo(t, { tipo: "retangulo", r: { x: 3 * Q, y: 2 * Q, w: Q, h: Q } }), 0);
  assert.ok(dentroDoAlcance(distanciaAoAlvo(t, { tipo: "retangulo", r: { x: 4 * Q, y: 2 * Q, w: Q, h: Q } }), ALCANCE));
  assert.ok(!dentroDoAlcance(distanciaAoAlvo(t, { tipo: "retangulo", r: { x: 5 * Q, y: 2 * Q, w: Q, h: Q } }), ALCANCE));
  assert.ok(dentroDoAlcance(distanciaAoAlvo(t, { tipo: "ponto", x: 4.5 * Q, y: 2.5 * Q }), ALCANCE) === false);
  assert.ok(dentroDoAlcance(distanciaAoAlvo(t, { tipo: "ponto", x: 3.5 * Q, y: 2.5 * Q }), ALCANCE));
  assert.equal(distanciaPontoSegmento(0, 0, 3, 4, 3, 4), 5);
});
