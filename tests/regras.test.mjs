/**
 * Testes das fórmulas (seção 6 do prompt da ficha). Rode com:  node --test tests/
 * Reproduz o prepareDerivedData com as funções de module/regras.mjs, sem o Foundry.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ATRIBUTOS, PERICIAS } from "../module/config.mjs";
import {
  totalAtributo, totalPericia, maximoPelaClasse, maximoFinal, calcularDefesa, emQuadrados,
  nivelValido, ehParagon, comSinal
} from "../module/regras.mjs";
import { dadosKaelen, compararKaelen, ESPERADO_KAELEN } from "../module/dev/kaelen.mjs";

/** Mesma sequência de cálculo do PersonagemData.prepareDerivedData. */
function derivar(dados) {
  const s = structuredClone(dados.system);
  const nivel = nivelValido(s.nivel);
  const atributos = {};
  for (const k of ATRIBUTOS) atributos[k] = { ...s.atributos[k], total: totalAtributo(s.atributos[k]) };
  const cc = s.classeConfig;
  const tot = k => (k ? atributos[k].total : null);
  const pvMax = maximoFinal({ manual: cc.manual, maximoManual: s.pv.max, bonus: cc.bonusPv,
    maximoFormula: maximoPelaClasse({ inicial: cc.pvInicial, porNivel: cc.pvPorNivel, atributoTotal: tot(cc.pvAtributo), nivel }) });
  const pmMax = maximoFinal({ manual: cc.manual, maximoManual: s.pm.max, bonus: cc.bonusPm,
    maximoFormula: maximoPelaClasse({ inicial: cc.pmInicial, porNivel: cc.pmPorNivel, atributoTotal: tot(cc.pmAtributo), nivel }) });
  const equipado = tipo => dados.items
    .filter(i => i.type === "equipamento" && i.system.equipado && i.system.tipo === tipo)
    .reduce((soma, i) => soma + i.system.bonusDefesa, 0);
  const pericias = {};
  for (const p of PERICIAS) {
    const d = { treino: 0, outros: 0, atributo: p.atributo, ...s.pericias[p.chave] };
    pericias[p.chave] = { ...d, total: totalPericia(atributos[d.atributo].total, d.treino, d.outros) };
  }
  return {
    atributos, pericias,
    pv: { max: pvMax }, pm: { max: pmMax },
    defesa: { total: calcularDefesa({ des: atributos.DES.total, armadura: equipado("armadura"), escudo: equipado("escudo"), outros: s.defesa.outros }) }
  };
}

test("Kaelen Vorhal confere com todos os valores da seção 6", () => {
  assert.deepEqual(compararKaelen(derivar(dadosKaelen())), []);
});

test("PV máx 42 = 16 + 4×4 + 2×5 e PM máx 20 (sem atributo-chave)", () => {
  const d = derivar(dadosKaelen());
  assert.equal(d.pv.max, ESPERADO_KAELEN.pvMax);
  assert.equal(d.pm.max, ESPERADO_KAELEN.pmMax);
});

test("Defesa 19 = 10 + DES 1 + Armadura 5 + Escudo 2 + Outros 1; sem armadura cai para 14", () => {
  const dados = dadosKaelen();
  assert.equal(derivar(dados).defesa.total, 19);
  dados.items.find(i => i.name === "Armadura de Placas").system.equipado = false;
  assert.equal(derivar(dados).defesa.total, 14);
});

test("Bônus de treino: Destreinado +0, Treinado +2, Especialista +4", () => {
  assert.equal(totalPericia(1, 0, 0), 1);
  assert.equal(totalPericia(1, 1, 0), 3);
  assert.equal(totalPericia(1, 2, 0), 5);
  assert.equal(totalPericia(1, 2, -2), 3);
});

test("Modo manual usa o máximo digitado e ainda soma o bônus", () => {
  assert.equal(maximoFinal({ manual: true, maximoManual: 50, maximoFormula: 42, bonus: 3 }), 53);
  assert.equal(maximoFinal({ manual: false, maximoManual: 50, maximoFormula: 42, bonus: 3 }), 45);
  assert.equal(maximoFinal({ manual: false, maximoManual: 0, maximoFormula: -5, bonus: 0 }), 0);
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
