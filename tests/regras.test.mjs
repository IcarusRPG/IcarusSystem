/**
 * Testes das fórmulas (seção 6 do prompt da ficha). Rode com:  node --test tests/*.test.mjs
 * Usa a mesma função de cálculo do sistema (module/derivar.mjs).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { PERICIAS } from "../module/config.mjs";
import {
  totalAtributo, totalPericia, maximoFinal, calcularDefesa, emQuadrados,
  nivelValido, ehParagon, comSinal, niveisImpares, bonusDeNivel
} from "../module/regras.mjs";
import { dadosKaelen, compararKaelen, ESPERADO_KAELEN } from "../module/dev/kaelen.mjs";
import { simular } from "./simulacao.mjs";

const kaelen = () => simular(dadosKaelen(), "koruma").system;

test("Kaelen Vorhal (Koruma automático) confere com todos os valores esperados", () => {
  assert.deepEqual(compararKaelen(kaelen()), []);
});

test("PV máx 42 = 16 + 4×4 + 2×5 e PM máx 20 (sem atributo-chave)", () => {
  const s = kaelen();
  assert.equal(s.pv.max, ESPERADO_KAELEN.pvMax);
  assert.equal(s.pm.max, ESPERADO_KAELEN.pmMax);
});

test("Defesa 19 = 10 + DES 1 + Armadura 5 + Escudo 2 + Couro Brutal 1; sem armadura cai para 14", () => {
  const dados = dadosKaelen();
  assert.equal(simular(dados, "koruma").system.defesa.total, 19);
  dados.items.find(i => i.name === "Armadura de Placas").system.equipado = false;
  assert.equal(simular(dados, "koruma").system.defesa.total, 14);
});

test("Bônus de treino: Destreinado +0, Treinado +2, Especialista +4", () => {
  assert.equal(totalPericia(1, 0, 0), 1);
  assert.equal(totalPericia(1, 1, 0), 3);
  assert.equal(totalPericia(1, 2, 0), 5);
  assert.equal(totalPericia(1, 2, -2), 3);
});

test("Modo manual usa o máximo digitado, soma o bônus fixo e ignora o bônus por nível", () => {
  assert.equal(maximoFinal({ manual: true, maximoManual: 50, maximoFormula: 42, bonus: 3, bonusNivel: 5 }), 53);
  assert.equal(maximoFinal({ manual: false, maximoManual: 50, maximoFormula: 42, bonus: 3, bonusNivel: 5 }), 50);
  assert.equal(maximoFinal({ manual: false, maximoManual: 0, maximoFormula: -5, bonus: 0 }), 0);
});

test("Bônus de PV/PM por nível e por nível ímpar", () => {
  assert.equal(niveisImpares(1), 1);
  assert.equal(niveisImpares(5), 3);
  assert.equal(niveisImpares(6), 3);
  assert.deepEqual(bonusDeNivel({ nivel: 5, bonusPvPorNivel: 1, bonusPmPorNivel: 1, bonusPmNivelImpar: 1 }), { pv: 5, pm: 8 });
});

test("Nível fica entre 1 e 25 e Paragon começa no 21", () => {
  assert.equal(nivelValido(0), 1);
  assert.equal(nivelValido(30), 25);
  assert.equal(nivelValido("abc"), 1);
  assert.equal(ehParagon(20), false);
  assert.equal(ehParagon(21), true);
});

test("Deslocamento em quadrados de 1,5 m", () => {
  assert.equal(emQuadrados(9), 6);
  assert.equal(emQuadrados(12), 8);
  assert.equal(emQuadrados(6), 4);
});

test("Valores vazios ou inválidos viram 0", () => {
  assert.equal(totalAtributo({ base: null, racial: "", temp: undefined }), 0);
  assert.equal(calcularDefesa({ des: null, armadura: undefined, escudo: "x", outros: 2 }), 12);
});

test("Modificador com sinal", () => {
  assert.equal(comSinal(3), "+3");
  assert.equal(comSinal(0), "+0");
  assert.equal(comSinal(-2), "−2");
});

test("Lista tem 30 perícias, em ordem alfabética, com 3 Resistências", () => {
  assert.equal(PERICIAS.length, 30);
  const chaves = PERICIAS.map(p => p.chave);
  assert.deepEqual([...chaves].sort((a, b) => a.localeCompare(b, "pt-BR")), chaves);
  assert.deepEqual(PERICIAS.filter(p => p.resistencia).map(p => p.chave), ["fortitude", "reflexos", "vontade"]);
});
