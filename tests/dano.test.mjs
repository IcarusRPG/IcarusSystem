/** Dano recebido com resistências (critérios 7 e 8). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularDanoRecebido, textoDoDano } from "../module/combate.mjs";

const res = (extra = {}) => ({ rdGeral: 0, reducao: {}, imunidade: {}, vulnerabilidade: {}, ...extra });

test("7. Redução de fogo 5 + Vulnerável a fogo, 12 de fogo → 18 − 5 = 13", () => {
  const r = calcularDanoRecebido(res({ reducao: { fogo: 5 }, vulnerabilidade: { fogo: true } }), 12, "fogo");
  assert.equal(r.final, 13);
  assert.equal(textoDoDano(r.passos, "Fogo"), "12 Fogo → vulnerável ×1,5 = 18 → Redução de fogo 5 → 13");
});

test("7. Imune a fogo → 0; RD geral 2 reduz Corte", () => {
  assert.equal(calcularDanoRecebido(res({ imunidade: { fogo: true }, reducao: { fogo: 5 } }), 12, "fogo").final, 0);
  assert.equal(calcularDanoRecebido(res({ rdGeral: 2 }), 7, "corte").final, 5);
});

test("Dano genérico só sofre RD geral; mínimo 0; arredondamento para baixo", () => {
  assert.equal(calcularDanoRecebido(res({ rdGeral: 2, reducao: { fogo: 5 }, imunidade: { fogo: true } }), 9, "dano").final, 7);
  assert.equal(calcularDanoRecebido(res({ rdGeral: 10 }), 3, "corte").final, 0);
  assert.equal(calcularDanoRecebido(res({ vulnerabilidade: { frio: true } }), 5, "frio").final, 7);
});
