/** Classes: dados, ícones, progressão, PV/PM, pré-requisitos e poderes comuns. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CLASSES, classePorId, iconeDaClasse, idDaClassePorNome } from "../module/classes-dados.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("7 classes, 44 habilidades e 245 poderes no JSON", () => {
  assert.deepEqual(CLASSES.map(c => c.id), ["guerreiro", "samurai", "barbaro", "ladino", "patrulheiro", "monge", "pistoleiro"]);
  assert.equal(CLASSES.reduce((s, c) => s + c.habilidades.length, 0), 44);
  assert.equal(CLASSES.reduce((s, c) => s + c.poderes.length, 0), 245);
});

test("Ícones das classes existem no disco (Bárbaro com acento)", () => {
  for (const c of CLASSES) {
    const url = iconeDaClasse(c.id);
    assert.ok(url.includes("img/Icones/classes/"), c.id);
    assert.ok(fs.existsSync(path.join(RAIZ, decodeURI(url).replace("systems/icarus-rpg/", ""))), url);
  }
  assert.equal(idDaClassePorNome("Bárbaro"), "barbaro");
  assert.equal(idDaClassePorNome("barbaro"), "barbaro");
  assert.equal(classePorId("monge").pm.atributoSoNoPrimeiroNivel, true);
});
