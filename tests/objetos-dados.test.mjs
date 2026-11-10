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

test("Ícones dos focos: casamento tolerante (acento, caixa, plural), manifesto e imagem no item", async () => {
  const { chaveDoFoco, casarFocos, focosDosDados, iconesDosFocos } = await import("../tools/build-icones-focos.mjs");
  assert.equal(chaveDoFoco("Cetro de ossos.png"), chaveDoFoco("Cetro de Osso"));
  assert.equal(chaveDoFoco("GRIMÓRIO.PNG"), "grimorio");
  const focos = focosDosDados(dados);
  assert.deepEqual(focos.map(f => f.nome), ["Varinha", "Cetro de Osso", "Grimório", "Cetro de Ferro", "Orbe de Prata", "Bordão Arcano"]);
  const { manifesto, sobrando } = casarFocos(focos, ["Varinha.png", "Cetro de ossos.png", "Orbe de prata.png", "Dragão.png"]);
  assert.deepEqual(manifesto.filter(m => !m.arquivo).map(m => m.nome), ["Grimório", "Cetro de Ferro", "Bordão Arcano"]);
  assert.deepEqual(sobrando, ["Dragão.png"]);
  // O manifesto do repositório tem os 6, e os arquivos existem
  const repo = ler("focos_icones");
  assert.equal(repo.filter(m => m.arquivo).length, 6);
  for (const m of repo) assert.ok(fs.existsSync(new URL(`../img/Icones/itens/equipamentos/focos arcanos/${m.arquivo}`, import.meta.url)), m.arquivo);
  const bordao = { _id: "x", name: "Bordão", type: "arma", img: "b.png", system: { dano: "1d6", propriedades: [], preco: 0 }, flags: { "icarus-rpg": { id: "bordao" } } };
  const { itens } = documentosDeFocos(dados, idEstavel, { bordao, icones: iconesDosFocos(repo) });
  assert.ok(itens.every(i => i.img.includes("focos%20arcanos/")), "todos com a imagem própria");
  assert.equal(itens.find(i => i.name === "Grimório").img, "systems/icarus-rpg/img/Icones/itens/equipamentos/focos%20arcanos/Grim%C3%B3rio.png");
  const sem = documentosDeFocos(dados, idEstavel, { bordao }).itens;
  assert.equal(sem[0].img, "icons/svg/item-bag.svg", "sem manifesto: ícone padrão");
});
