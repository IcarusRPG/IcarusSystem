/** Ícones das magias: casamento por nome (tools/build-icones-magias.mjs) e manifesto. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { casarIcones, ascii } from "../tools/build-icones-magias.mjs";

const magias = JSON.parse(fs.readFileSync(new URL("../tools/dados/magias.json", import.meta.url), "utf8")).magias;

test("Nome ASCII com hífens", () => {
  assert.equal(ascii("Bola de Fogo.png"), "bola-de-fogo");
  assert.equal(ascii("Mísseis Mágicos"), "misseis-magicos");
});

test("Casamento: exato, exceção confirmada (Manto de Sombra.png) e listas de sobras", () => {
  const r = casarIcones(
    [{ id: "bola-de-fogo", nome: "Bola de Fogo" }, { id: "manto-de-sombras", nome: "Manto de Sombras" }, { id: "x", nome: "Sem Imagem" }],
    ["Bola de Fogo.png", "Manto de Sombra.png", "Desconhecida.png"]
  );
  assert.deepEqual(r.casados, { "bola-de-fogo": "Bola de Fogo.png", "manto-de-sombras": "Manto de Sombra.png" });
  assert.deepEqual(r.semImagem, ["Sem Imagem"]);
  assert.deepEqual(r.semMagia, ["Desconhecida.png"]);
});

test("Manifesto: um ícone por magia existente em img/magias, ids únicos", () => {
  const manifesto = JSON.parse(fs.readFileSync(new URL("../tools/dados/magias_icones.json", import.meta.url), "utf8"));
  const ids = new Set(magias.map(m => m.id));
  assert.equal(magias.length, 200);
  assert.equal(ids.size, 200);
  for (const { id, arquivo } of manifesto) {
    assert.ok(ids.has(id), id);
    assert.ok(fs.existsSync(new URL(`../img/magias/${arquivo}`, import.meta.url)), arquivo);
  }
});
