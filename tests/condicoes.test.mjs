/** Condições: não acumular, composição e modificadores (critérios 9 e 10). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { modificadoresDasCondicoes, expandirComposicao, deslocamentoComCondicoes, LISTA_CONDICOES } from "../module/condicoes.mjs";
import { derivarPersonagem } from "../module/derivar.mjs";
import { sistemaCompleto } from "./simulacao.mjs";

const personagem = ids => derivarPersonagem(sistemaCompleto({ atributos: { DES: { base: 2 } }, deslocamento: 9 }), [], ids);

test("36 condições", () => assert.equal(LISTA_CONDICOES.length, 36));

test("9. Abalado (−2) + Apavorado (−5) em perícias = −5, não −7; a mesma condição duas vezes não duplica", () => {
  assert.equal(modificadoresDasCondicoes(["abalado", "apavorado"]).pericias.luta.valor, -5);
  assert.equal(modificadoresDasCondicoes(["abalado", "abalado"]).pericias.luta.valor, -2);
  const s = personagem(["abalado", "apavorado"]);
  assert.equal(s.pericias.luta.total, 0 - 5);
  assert.equal(s.pericias.luta.origemCondicao, "Apavorado");
});

test("10. Cego: Visão falha automática; Surdo: Audição falha automática e Iniciativa −5", () => {
  const cego = personagem(["cego"]);
  assert.equal(cego.pericias.visao.falhaAuto, "Cego");
  assert.equal(cego.pericias.audicao.falhaAuto, undefined);
  const surdo = personagem(["surdo"]);
  assert.equal(surdo.pericias.audicao.falhaAuto, "Surdo");
  assert.equal(surdo.pericias.iniciativa.total, 2 - 5);
});

test("10. Desprevenido: Defesa −5 e Reflexos −5", () => {
  const s = personagem(["desprevenido"]);
  assert.equal(s.defesa.total, 10 + 2 - 5);
  assert.equal(s.pericias.reflexos.total, 2 - 5);
});

test("10. Agarrado inclui Desprevenido e Imóvel (e o ataque −2)", () => {
  assert.deepEqual([...expandirComposicao(["agarrado"])].sort(), ["agarrado", "desprevenido", "imovel"]);
  const s = personagem(["agarrado"]);
  assert.equal(s.defesa.total, 10 + 2 - 5);
  assert.equal(s.deslocamento, 0);
  assert.equal(s.condicoes.ataque.valor, -2);
});

test("Composição em cadeia: Morrendo → Inconsciente → Indefeso → Desprevenido; vale a maior penalidade de Defesa", () => {
  assert.deepEqual([...expandirComposicao(["morrendo"])].sort(), ["desprevenido", "inconsciente", "indefeso", "morrendo"]);
  const s = personagem(["morrendo"]);
  assert.equal(s.defesa.total, 10 + 2 - 10);
  assert.equal(s.pericias.reflexos.falhaAuto, "Indefeso");
});

test("Perícias por atributo e exclusões: Fraco só FOR/DES/CON; Frustrado sem os sentidos", () => {
  const fraco = modificadoresDasCondicoes(["fraco"]).pericias;
  assert.equal(fraco.atletismo.valor, -2);
  assert.equal(fraco.acrobacia.valor, -2);
  assert.equal(fraco.diplomacia, undefined);
  const frustrado = modificadoresDasCondicoes(["frustrado"]).pericias;
  assert.equal(frustrado.diplomacia.valor, -2);
  assert.equal(frustrado.visao, undefined);
  assert.equal(frustrado.vontade.valor, -2);
});

test("Deslocamento: Lento metade, Sobrecarregado −3, Caído máximo 1,5 m, Imóvel 0", () => {
  const d = ids => deslocamentoComCondicoes(9, modificadoresDasCondicoes(ids).deslocamento);
  assert.equal(d(["lento"]), 4.5);
  assert.equal(d(["sobrecarregado"]), 6);
  assert.equal(d(["caido"]), 1.5);
  assert.equal(d(["imovel", "lento"]), 0);
});

test("Petrificado: RD 8 entra na RD geral; Caído −5 só no corpo a corpo", () => {
  assert.equal(personagem(["petrificado"]).resistencias.rdGeral, 8);
  const caido = personagem(["caido"]);
  assert.equal(caido.condicoes.ataqueCorpoACorpo.valor, -5);
  assert.equal(caido.condicoes.ataque, null);
});
