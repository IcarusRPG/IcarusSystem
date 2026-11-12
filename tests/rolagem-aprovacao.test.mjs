/** Rolagens grandes digitadas no chat: contagem de dados e quando pedir aprovação do Mestre. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { contarDados, formulasDaMensagem, dadosDaMensagem, precisaAprovar, LIMITE_PADRAO } from "../module/rolagem-aprovacao-dados.mjs";

test("Contagem de dados: NdX somados, d20 sozinho vale 1, modificadores não contam", () => {
  assert.equal(contarDados("20d6 + 2d8 + 5"), 22);
  assert.equal(contarDados("d20 + 4"), 1);
  assert.equal(contarDados("4d6kh3"), 4);
  assert.equal(contarDados("1d100 + d%"), 2);
  assert.equal(contarDados("5"), 0);
});

test("Fórmulas da mensagem: comandos de rolagem (sem o texto depois de #) e rolagens embutidas [[...]]", () => {
  assert.deepEqual(formulasDaMensagem("/r 17d6 # bola de fogo de 10d6"), [" 17d6 "]);
  assert.equal(dadosDaMensagem("/gmroll 10d6 + 7d4"), 17);
  assert.equal(dadosDaMensagem("Eu ataco! [[/r 9d6]] e [[8d8]]"), 17);
  assert.equal(dadosDaMensagem("olá, quero rolar 20d6 depois"), 0, "texto comum não rola nada");
  assert.equal(dadosDaMensagem("/w Mestre 30d6"), 0, "sussurro não é rolagem");
});

test("Aprovação: só jogador, com a opção ligada e acima do limite (16 por padrão)", () => {
  assert.equal(LIMITE_PADRAO, 16);
  assert.equal(precisaAprovar({ texto: "/r 17d6", ehMestre: false, ativo: true }), true);
  assert.equal(precisaAprovar({ texto: "/r 16d6", ehMestre: false, ativo: true }), false, "16 ainda pode");
  assert.equal(precisaAprovar({ texto: "/r 17d6", ehMestre: true, ativo: true }), false, "o Mestre rola o que quiser");
  assert.equal(precisaAprovar({ texto: "/r 17d6", ehMestre: false, ativo: false }), false, "opção desligada");
  assert.equal(precisaAprovar({ texto: "/r 12d6", ehMestre: false, ativo: true, limite: 10 }), true, "limite configurável");
});
