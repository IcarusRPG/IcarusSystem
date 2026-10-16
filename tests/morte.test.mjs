/** Testes de morte (critério 14). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { resultadoTesteMorte, danoEmMorrendo } from "../module/morte.mjs";

test("14. Tabela: 1–9 falha, 10–19 sucesso, 20 reanima com 1 PV, 1 natural = 2 falhas", () => {
  assert.equal(resultadoTesteMorte(9).falhas, 1);
  assert.equal(resultadoTesteMorte(10).sucessos, 1);
  assert.equal(resultadoTesteMorte(19).sucessos, 1);
  assert.equal(resultadoTesteMorte(20, { sucessos: 2, falhas: 2 }).reanima, true);
  assert.equal(resultadoTesteMorte(1).falhas, 2);
});

test("14. 3 sucessos = estável; 3 falhas = morto (1 natural com 1 falha já mata)", () => {
  const estavel = resultadoTesteMorte(15, { sucessos: 2, falhas: 1 });
  assert.equal(estavel.estavel, true);
  assert.equal(estavel.morto, false);
  assert.equal(resultadoTesteMorte(5, { sucessos: 0, falhas: 2 }).morto, true);
  assert.equal(resultadoTesteMorte(1, { sucessos: 0, falhas: 1 }).morto, true);
});

test("Dano em Morrendo: 1 falha, 2 se crítico", () => {
  assert.deepEqual(danoEmMorrendo({ sucessos: 1, falhas: 0 }), { sucessos: 1, falhas: 1, estavel: false, morto: false });
  assert.equal(danoEmMorrendo({ falhas: 1 }, true).morto, true);
});
