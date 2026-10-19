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

test("Compêndios de classes: 7 classes, 44 habilidades e 245 poderes; pastas por classe > grupo; idempotente", async () => {
  const { documentosDeClasses } = await import("../module/dados-compendios.mjs");
  const ler = n => JSON.parse(fs.readFileSync(path.join(RAIZ, "tools", "dados", `${n}.json`), "utf8"));
  const d = { classes: ler("classes"), iconesClasses: ler("icones-classes"), proficienciasClasses: ler("proficiencias-classes") };
  const docs = documentosDeClasses(d);
  assert.equal(docs.classes.itens.length, 7);
  assert.equal(docs["habilidades-classe"].itens.length, 44);
  assert.equal(docs["poderes-classe"].itens.length, 245);
  const pastas = new Set(docs["poderes-classe"].pastas.map(p => p._id));
  for (const p of docs["poderes-classe"].itens) assert.ok(pastas.has(p.folder), `${p.name} sem pasta (${p.system.grupo})`);
  const ids = docs["poderes-classe"].itens.map(p => p._id);
  assert.equal(new Set(ids).size, ids.length, "ids repetidos");
  assert.equal(new Set(docs["habilidades-classe"].itens.map(p => p._id)).size, 44);
  assert.deepEqual(documentosDeClasses(d), docs);
  // Poderes comuns em cada classe, com ids diferentes
  const comuns = docs["poderes-classe"].itens.filter(p => p.name === "Aumento de Atributo");
  assert.equal(comuns.length, 7);
  assert.equal(new Set(comuns.map(p => p._id)).size, 7);
  // Ícone da classe em todos
  const monge = docs.classes.itens.find(c => c.system.classeId === "monge");
  assert.ok(docs["poderes-classe"].itens.filter(p => p.system.classe === "monge").every(p => p.img === monge.img));
  assert.deepEqual([monge.system.proficiencias.tunicas, monge.system.pm.atributoSoNoPrimeiroNivel], [true, true]);
});
