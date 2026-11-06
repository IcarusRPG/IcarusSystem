/** "Atacar" rola na hora com as escolhas que o diálogo de ataque teria sem mexer em nada. */
import { test } from "node:test";
import assert from "node:assert/strict";

globalThis.Hooks ??= { on() {}, once() {} };
const { escolhasPadrao } = await import("../module/combate-chat.mjs");

test("Padrão do diálogo: flanco detectado, poderes pré-marcados, camuflagem nenhuma, desativado fica de fora", () => {
  const secoes = [
    { id: "flanco", campos: [{ tipo: "checkbox", nome: "flanco", valor: true }] },
    { id: "camuflagem", campos: [{ tipo: "select", nome: "camuflagem", opcoes: [{ valor: "nenhuma", selecionado: true }, { valor: "leve" }] }] },
    { id: "furtivo", campos: [{ tipo: "checkbox", nome: "ataqueFurtivo", valor: true, desativado: true }] },
    { id: "duas", campos: [{ tipo: "checkbox", nome: "duasArmas", valor: false }] },
    { id: "tiro", campos: [{ tipo: "number", nome: "tiroCarregado", valor: 0 }] }
  ];
  assert.deepEqual(escolhasPadrao(secoes, { vantagem: true }), {
    vantagem: true, desvantagem: false, bonusExtra: 0, flanco: true, camuflagem: "nenhuma", duasArmas: false, tiroCarregado: 0
  });
  assert.deepEqual(escolhasPadrao([]), { vantagem: false, desvantagem: false, bonusExtra: 0 });
});
