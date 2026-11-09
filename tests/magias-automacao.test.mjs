/** Proposta de automação das magias (tools/extrair-automacao-magias.mjs): casos do prompt. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { propostaDaMagia, resistenciaDe, areaDe, mudancasDe, condicoesDe } from "../tools/extrair-automacao-magias.mjs";

const magias = JSON.parse(fs.readFileSync(new URL("../tools/dados/magias.json", import.meta.url), "utf8")).magias;
const p = id => propostaDaMagia(magias.find(m => m.id === id));
const acao = (prop, tipo) => prop.acoes.find(a => a.tipo === tipo);

test("Bola de Fogo: 6d6 fogo, esfera 6 m, Reflexos metade, +1d6 no aprimoramento, explosão de fogo", () => {
  const b = p("bola-de-fogo");
  const d = acao(b, "dano");
  assert.deepEqual(d.componentes, [{ formula: "6d6", tipoDano: "fogo" }]);
  assert.deepEqual(d.area, { forma: "esfera", tamanho: 6 });
  assert.deepEqual(d.resistencia, { atributo: "reflexos", efeito: "metade" });
  assert.deepEqual(d.aprimoramentos[0], { indice: 0, extras: [{ tipo: "dano", formulaExtra: "1d6", tipoDano: "fogo" }] });
  assert.equal(b.vfx.preset, "explosao");
  assert.equal(b.revisao, "auto");
});

test("Ira dos Céus: dois componentes (elétrico e impacto) e aprimoramento por tipo", () => {
  const d = acao(p("ira-dos-ceus"), "dano");
  assert.deepEqual(d.componentes.map(c => c.tipoDano), ["eletrico", "impacto"]);
  assert.deepEqual(d.aprimoramentos[0].extras.map(e => e.tipoDano), ["eletrico", "impacto"]);
});

test("Armadura Arcana: +4 Defesa pessoal na cena, grupo que não acumula", () => {
  const e = acao(p("armadura-arcana"), "efeito");
  assert.equal(e.alvo, "pessoal");
  assert.equal(e.duracao.tipo, "cena");
  assert.deepEqual(e.mudancas, [{ chave: "defesa", valor: 4, modo: "somar", grupoAcumulo: "defesa-magia" }]);
});

test("Condição com resistência: Hipnotismo (Fascinado, Vontade anula) e Relâmpago (Ofuscado por 1 rodada)", () => {
  const h = acao(p("hipnotismo"), "efeito");
  assert.deepEqual(h.condicoes, ["fascinado"]);
  assert.deepEqual(h.resistencia, { atributo: "vontade", efeito: "anula" });
  const r = acao(p("relampago"), "efeito");
  assert.deepEqual(r.condicoes, ["ofuscado"]);
  assert.deepEqual(r.duracao, { tipo: "rodadas", rodadas: 1 });
  assert.equal(r.resistencia.efeito, "anula", "no efeito, passar no teste evita a condição");
});

test("Cura, dano condicional fora e magias só de texto", () => {
  assert.equal(acao(p("curar-ferimentos"), "cura").formula, "2d8+2");
  const teia = p("teia");
  assert.equal(acao(teia, "dano"), undefined, "o 2d6 de fogo da teia é condicional");
  assert.equal(teia.revisao, "manual");
  assert.equal(p("detectar-magia").revisao, "somente-texto");
});

test("Peças: resistência, área, bônus, RD por tipo e condições", () => {
  assert.deepEqual(resistenciaDe("Vontade anula (se involuntário)"), { atributo: "vontade", efeito: "anula", nota: "se involuntário" });
  assert.equal(resistenciaDe(null), null);
  assert.deepEqual(areaDe({ alvo: "criaturas na linha", alcance: "linha de 18 m" }), { forma: "linha", tamanho: 18 });
  assert.deepEqual(areaDe({ alvo: "x", alcance: "cone de 4,5 m a partir de você" }), { forma: "cone", tamanho: 4.5 });
  const m = mudancasDe("Recebe +2 em ataque e dano corpo a corpo, +3 m de deslocamento, mas –2 na Defesa.").mudancas;
  assert.deepEqual(m.map(x => [x.chave, x.valor]), [["ataque", 2], ["dano", 2], ["defesa", -2]]);
  assert.equal(m.find(x => x.chave === "defesa").grupoAcumulo, undefined, "penalidade não entra no grupo que não acumula");
  assert.deepEqual(mudancasDe("Ele recebe RD 2 contra dano de corte e perfuração.").mudancas.map(x => x.chave), ["reducao:corte", "reducao:perfuracao"]);
  assert.deepEqual(condicoesDe("Criaturas que falharem ficam Enredadas e ficam Em Chamas."), ["enredado", "em-chamas"]);
});

test("Arquivo gerado: 200 blocos, nenhum validado sem revisão", () => {
  const json = JSON.parse(fs.readFileSync(new URL("../tools/dados/magias_automacao.json", import.meta.url), "utf8")).magias;
  assert.equal(json.length, 200);
  assert.ok(json.every(x => ["auto", "manual", "somente-texto"].includes(x.revisao)));
});
