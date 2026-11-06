/** Números flutuantes de PV/PM: regras puras (module/numeros-pv-dados.mjs). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mudancas, estiloDoNumero, podeVerNumero, deslocamento, quadro, excedentes, MAX_SIMULTANEOS } from "../module/numeros-pv-dados.mjs";

test("Mudanças: só diferenças reais; PM só se ligado", () => {
  assert.deepEqual(mudancas({ pv: 30, pm: 5 }, { pv: 19, pm: 3 }), [{ recurso: "pv", diff: -11 }]);
  assert.deepEqual(mudancas({ pv: 30, pm: 5 }, { pv: 30, pm: 3 }, { pm: true }), [{ recurso: "pm", diff: -2 }]);
  assert.deepEqual(mudancas({ pv: 10 }, { pv: 10 }), []);
  assert.deepEqual(mudancas(null, { pv: 10 }), [], "sem retrato anterior (carga da cena): não anima");
});

test("Estilo: dano vermelho −N, cura verde +N, PM azul; grande acima de 25%; caveira em 0 PV", () => {
  const d = estiloDoNumero({ diff: -11, max: 30, depois: 19 });
  assert.equal(d.texto, "−11");
  assert.equal(d.tipo, "dano");
  assert.equal(d.grande, true);
  assert.equal(estiloDoNumero({ diff: 8, max: 100, depois: 50 }).texto, "+8");
  assert.equal(estiloDoNumero({ diff: 8, max: 100 }).grande, false);
  assert.equal(estiloDoNumero({ recurso: "pm", diff: -2 }).tipo, "pm");
  assert.equal(estiloDoNumero({ diff: -5, max: 30, depois: 0 }).texto, "−5 ☠");
  assert.equal(estiloDoNumero({ diff: -5, max: 0, tamanho: "g" }).escala, 1.3);
});

test("Quem vê: Mestre sempre; PJ visível; NPC conforme a opção; nunca token invisível", () => {
  assert.equal(podeVerNumero({ ehMestre: true, ehPJ: false, npcsParaJogadores: false, visivel: false }), true);
  assert.equal(podeVerNumero({ ehMestre: false, ehPJ: true, visivel: true }), true);
  assert.equal(podeVerNumero({ ehMestre: false, ehPJ: false, npcsParaJogadores: true, visivel: true }), true);
  assert.equal(podeVerNumero({ ehMestre: false, ehPJ: false, npcsParaJogadores: false, visivel: true }), false);
  assert.equal(podeVerNumero({ ehMestre: false, ehPJ: true, visivel: false }), false);
});

test("Sem sobreposição: deslocamentos alternados e limite de simultâneos", () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(deslocamento), [0, 0.55, -0.55, 1.1, -1.1]);
  assert.equal(excedentes(MAX_SIMULTANEOS - 1), 0);
  assert.equal(excedentes(MAX_SIMULTANEOS), 1);
});

test("Quadro: dano com pop e tremida, sobe e some; movimento reduzido só aparece e some", () => {
  const ini = quadro(0.02, { tipo: "dano" });
  assert.ok(ini.escala > 1.3 && ini.subida < 0.1);
  assert.notEqual(quadro(0.1, { tipo: "dano" }).tremida, 0);
  assert.equal(quadro(0.5, { tipo: "dano" }).tremida, 0);
  assert.equal(quadro(1, { tipo: "dano" }).alpha, 0);
  assert.ok(quadro(0.9, { tipo: "cura" }).subida > 0.9);
  const r = quadro(0.5, { tipo: "dano", reduzido: true });
  assert.deepEqual([r.subida, r.escala, r.tremida, r.alpha], [0, 1, 0, 1]);
});
