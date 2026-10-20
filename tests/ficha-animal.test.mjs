/** Ficha dos animais do Vínculo Selvagem (Parte 2): números do bloco, imagem e ficha padrão. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { blocoDoVinculo, donoDoVinculo } from "../module/classes-dados.mjs";
import { documentosDeVinculos } from "../module/dados-compendios.mjs";
import { PERICIAS, FICHA_ANIMAL, ICONE_VINCULO_PADRAO } from "../module/config.mjs";
import { derivarPersonagem } from "../module/derivar.mjs";
import { calcularAtaque, calcularDano } from "../module/combate.mjs";
import { sistemaCompleto } from "./simulacao.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DADOS = JSON.parse(fs.readFileSync(path.join(RAIZ, "tools", "dados", "vinculos.json"), "utf8"));
const atores = documentosDeVinculos(DADOS, PERICIAS).atores;
const ator = id => structuredClone(atores.find(a => a.flags["icarus-rpg"].id === id));
const mundo = nivel => new Map([["p1", { name: "Ana", system: { nivel } }]]);

/** Deriva o animal como no Foundry: bloco do dono → ficha; armas naturais sem atributo + metade do nível. */
function animal(id, nivelDono) {
  const a = ator(id);
  const flags = { ...a.flags["icarus-rpg"], ...(nivelDono ? { invocadoPor: "p1" } : {}) };
  const bloco = blocoDoVinculo(flags, mundo(nivelDono));
  const s = derivarPersonagem(sistemaCompleto(a.system), [], [], { vinculo: bloco });
  const armas = a.items.filter(i => i.type === "arma").map(i => ({
    nome: i.name, system: { ...i.system, semAtributoNoDano: true, bonusDano: i.flags["icarus-rpg"].somaNivel === false ? 0 : bloco.metade }
  }));
  return { s, bloco, armas };
}

test("Parte 2: Lobo com dono de nível 6 → Defesa 15, PV 13, Mordida +3, dano 1d6+3", () => {
  const { s, bloco, armas } = animal("lobo", 6);
  assert.equal(bloco.nivel, 6);
  assert.equal(bloco.dono.name, "Ana");
  assert.equal(s.defesa.total, 15);
  assert.equal(s.pv.max, 13);
  const mordida = armas.find(a => a.nome === "Mordida").system;
  assert.equal(calcularAtaque(s, mordida, "corpo-a-corpo").bonus, 3, "Luta do animal: FOR +1 + treino +2");
  assert.equal(calcularDano(s, mordida, "corpo-a-corpo").formula, "1d6 + 3", "dado + metade do nível, sem FOR");
});

test("Parte 2: Cobra Voadora usa DES na Luta (atributoPericia) → +6", () => {
  const { s } = animal("cobra-voadora", 6);
  assert.equal(s.pericias.luta.atributo, "DES");
  assert.equal(s.pericias.luta.total, 6);
  assert.equal(s.defesa.total, 10 + 3 + 4);
});

test("Parte 2: Texugo — só a Mordida soma a metade do nível", () => {
  const { s, armas } = animal("texugo-gigante", 8);
  assert.deepEqual(armas.map(a => calcularDano(s, a.system, "corpo-a-corpo").formula), ["1d6 + 4", "1d4"]);
});

test("Parte 2: sem dono no mundo → nível 1 e dono nulo; ajuste de defesaBonus da edição vale", () => {
  assert.deepEqual(donoDoVinculo({}, mundo(9)), { dono: null, nivel: 1, metade: 0 });
  const { s, bloco } = animal("lobo", 0);
  assert.equal(bloco.dono, null);
  assert.equal(s.defesa.total, 12);
  assert.equal(s.pv.max, 10);
  assert.equal(blocoDoVinculo({ vinculoId: "lobo", invocadoPor: "p1", ajustes: { defesaBonus: 5 } }, mundo(6)).defesa, 18);
});

test("Parte 2: atores do pacote abrem a ficha do animal, têm vinculoId e a imagem (ou a pata padrão)", () => {
  for (const a of atores) {
    assert.equal(a.flags.core.sheetClass, FICHA_ANIMAL);
    assert.equal(a.flags["icarus-rpg"].vinculoId, a.flags["icarus-rpg"].id);
  }
  const lobo = ator("lobo");
  assert.equal(lobo.img, encodeURI("systems/icarus-rpg/img/Icones/poderes e habilidades/Vinculo Selvagem - Lobo.png"));
  assert.equal(lobo.prototypeToken.texture.src, lobo.img);
  assert.ok(lobo.img.includes("%20"));
  const semImagem = documentosDeVinculos({ ...DADOS, imagens: { lobo: null } }, PERICIAS).atores.find(a => a.flags["icarus-rpg"].id === "lobo");
  assert.equal(semImagem.img, ICONE_VINCULO_PADRAO);
  // Rodar duas vezes gera os mesmos documentos
  assert.deepEqual(documentosDeVinculos(DADOS, PERICIAS), documentosDeVinculos(DADOS, PERICIAS));
});
