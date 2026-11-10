/** Tabela validada de RD/PV (objetos.json) aplicada aos compêndios e os 6 focos arcanos. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const ler = n => JSON.parse(fs.readFileSync(new URL(`../tools/dados/${n}.json`, import.meta.url), "utf8"));
const { objetoDoCompendio, documentosDeFocos, ehFoco, objetoDoItem } = await import("../module/objetos-dados.mjs");
const { idEstavel } = await import("../module/dados-itens.mjs");
const dados = ler("objetos");

test("Todas as 46 armas e os 12 itens de armaduras e escudos têm RD/PV pela tabela (por nome)", () => {
  const armas = ler("armas").armas;
  const a = ler("armaduras");
  const armaduras = a.armaduras ?? a.itens ?? a;
  assert.equal(armas.filter(x => !objetoDoCompendio(dados, "arma", x.nome)).length, 0);
  assert.equal(armaduras.filter(x => !objetoDoCompendio(dados, "armadura", x.nome, x.categoria)).length, 0);
  assert.deepEqual(objetoDoCompendio(dados, "arma", "Adaga"), { rd: 10, pvMax: 2, tamanho: "pequeno" });
  assert.deepEqual(objetoDoCompendio(dados, "arma", "Montante").pvMax, 10);
  assert.deepEqual(objetoDoCompendio(dados, "arma", "Chicote").rd, 0);
  assert.deepEqual([objetoDoCompendio(dados, "armadura", "Escudo Leve (Broquel)").rd, objetoDoCompendio(dados, "armadura", "Escudo Leve (Broquel)").pvMax], [5, 10]);
  assert.equal(objetoDoCompendio(dados, "armadura", "Túnica Bordada").pvMax, 10);
  assert.equal(objetoDoCompendio(dados, "armadura", "Armadura nova", "media").rd, 8, "sem linha: pela categoria");
});

test("6 focos: preços, RD/PV por material; o Bordão Arcano é arma e foco (RD 5, PV 10)", () => {
  const bordao = { _id: "x", name: "Bordão", type: "arma", system: { dano: "1d6", danoExtra: "1d6", propriedades: ["duas-maos", "dupla"], preco: 0 }, flags: { "icarus-rpg": { id: "bordao" } } };
  const { itens } = documentosDeFocos(dados, idEstavel, { bordao });
  assert.deepEqual(itens.map(i => [i.name, i.system.preco / 100]), [["Varinha", 20], ["Cetro de Osso", 40], ["Grimório", 60], ["Cetro de Ferro", 90], ["Orbe de Prata", 150], ["Bordão Arcano", 45]]);
  const orbe = itens.find(i => i.name === "Orbe de Prata");
  assert.deepEqual([objetoDoItem(orbe).rd, objetoDoItem(orbe).pvMax], [10, 5]);
  const arcano = itens.at(-1);
  assert.equal(arcano.type, "arma");
  assert.equal(arcano.system.dano, "1d6");
  assert.ok(ehFoco(arcano));
  assert.deepEqual([objetoDoItem(arcano).rd, objetoDoItem(arcano).pvMax], [5, 10]);
  assert.equal(ehFoco(bordao), false, "Bordão comum não é foco");
  assert.equal(new Set(itens.map(i => i._id)).size, 6);
});
