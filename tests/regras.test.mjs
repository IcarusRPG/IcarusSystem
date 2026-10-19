/** Ajustes de regras oficiais: túnicas, proficiências, d20 com vantagem, acerto/crítico, flanco, RD e mais. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dadosDaArmadura } from "../module/dados-compendios.mjs";
import {
  usandoArmadura, tipoArmadura, armaduraLeveOuNenhuma, vestindoTunica, temProficienciaArmadura, temProficienciaArma,
  penalidadeDeAtaque, calcularAtaque
} from "../module/combate.mjs";
import { derivarPersonagem } from "../module/derivar.mjs";
import { sistemaCompleto } from "./simulacao.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ler = nome => JSON.parse(fs.readFileSync(path.join(RAIZ, "tools", "dados", `${nome}.json`), "utf8"));
const ARMADURAS = ler("armaduras");
const ICONES = ler("icones-armaduras");
const ARMAS = ler("armas");
const vestir = id => { const d = dadosDaArmadura(ARMADURAS.itens.find(a => a.id === id), ICONES); d.system.equipado = true; return d; };
const arma = nome => ({ ...ARMAS.armas.find(a => a.nome === nome), proficiencia: "auto", bonusAtaque: 0, bonusDano: 0 });
const ficha = (parcial, itens = []) => derivarPersonagem(sistemaCompleto(parcial), itens);

test("Túnica não é armadura; escudo não é armadura; leve/média/pesada são", () => {
  assert.equal(usandoArmadura([vestir("tunica-simples")]), false);
  assert.equal(usandoArmadura([vestir("escudo-pesado")]), false);
  assert.equal(usandoArmadura([vestir("tunica-bordada"), vestir("escudo-leve")]), false);
  assert.equal(vestindoTunica([vestir("tunica-simples")]), true);
  for (const [id, tipo] of [["couro-batido", "leve"], ["cota-de-malha", "media"], ["armadura-de-placas", "pesada"]]) {
    assert.equal(usandoArmadura([vestir(id)]), true, id);
    assert.equal(tipoArmadura([vestir(id)]), tipo, id);
  }
  assert.equal(tipoArmadura([]), "nenhuma");
  assert.equal(armaduraLeveOuNenhuma([vestir("couro-batido")]), true);
  assert.equal(armaduraLeveOuNenhuma([vestir("cota-de-malha")]), false);
  const desequipada = vestir("armadura-de-placas"); desequipada.system.equipado = false;
  assert.equal(usandoArmadura([desequipada]), false);
});

test("Túnica sem proficiência: penalidade também no ataque; com proficiência: só nas perícias", () => {
  const itens = [vestir("tunica-bordada")];
  const sem = ficha({ atributos: { FOR: { base: 2 } } }, itens);
  assert.equal(penalidadeDeAtaque(sem, itens), -2);
  assert.equal(calcularAtaque(sem, arma("Clava"), "corpo-a-corpo", itens).bonus, 2 - 2);
  assert.equal(sem.pericias.acrobacia.total, -2);
  const com = ficha({ atributos: { FOR: { base: 2 } }, proficiencias: { tunicas: true } }, itens);
  assert.equal(penalidadeDeAtaque(com, itens), 0);
  assert.equal(calcularAtaque(com, arma("Clava"), "corpo-a-corpo", itens).bonus, 2);
  assert.equal(com.pericias.acrobacia.total, -2, "a penalidade nas perícias continua");
});

test("Armadura/escudo sem proficiência penalizam o ataque; hierarquia leve < média < pesada", () => {
  const prof = { armaduras: ["pesada"], escudo: true };
  assert.equal(temProficienciaArmadura(prof, "leve"), true);
  assert.equal(temProficienciaArmadura(prof, "media"), true);
  assert.equal(temProficienciaArmadura({ armaduras: ["leve"] }, "media"), false);
  assert.equal(temProficienciaArmadura({}, "tunica"), false);
  assert.equal(temProficienciaArmadura({ tunicas: true }, "tunica"), true);
  const itens = [vestir("cota-de-malha"), vestir("escudo-pesado")];
  assert.equal(penalidadeDeAtaque(ficha({}), itens), -(3 + 2));
  assert.equal(penalidadeDeAtaque(ficha({ proficiencias: { armaduras: ["media"] } }), itens), -2);
  assert.equal(penalidadeDeAtaque(ficha({ proficiencias: { armaduras: ["media"], escudo: true } }), itens), 0);
});

test("Proficiência em armas: simples sempre; marciais Leves/Ágeis (Ladino); exóticas de corte (Samurai); fogo", () => {
  assert.equal(temProficienciaArma({ armas: [] }, arma("Adaga")), true);
  assert.equal(temProficienciaArma({ armas: ["simples"] }, arma("Espada longa")), false);
  assert.equal(temProficienciaArma({ armas: ["marciais"] }, arma("Espada longa")), true);
  assert.equal(temProficienciaArma({ armas: ["marciais-leves-ageis"] }, arma("Florete")), true);
  assert.equal(temProficienciaArma({ armas: ["marciais-leves-ageis"] }, arma("Machadinha")), true);
  assert.equal(temProficienciaArma({ armas: ["marciais-leves-ageis"] }, arma("Espada longa")), false);
  assert.equal(temProficienciaArma({ armas: ["exoticas-corte"] }, arma("Katana")), true);
  assert.equal(temProficienciaArma({ armas: ["exoticas-corte"] }, arma("Nunchaku")), false);
  assert.equal(temProficienciaArma({ armas: ["fogo"] }, arma("Pistola")), true);
  assert.equal(temProficienciaArma({ armas: ["marciais"] }, arma("Pistola")), false);
});
