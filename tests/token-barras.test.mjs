/** Barras de PV/PM e escudo de Defesa no token: visibilidade e geometria. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fracao, pvBaixo, visibilidade, layoutDoHud, textoDaBarra } from "../module/token-barras-dados.mjs";

const config = { npcModo: "mestre", mostrarPM: true, mostrarDefesa: true, texto: "passarMouse" };

test("Frações e PV baixo (≤ 25%)", () => {
  assert.equal(fracao(5, 20), 0.25);
  assert.equal(fracao(30, 20), 1);
  assert.equal(fracao(3, 0), 0);
  assert.equal(pvBaixo(5, 20), true);
  assert.equal(pvBaixo(6, 20), false);
  assert.equal(pvBaixo(0, 20), false, "a 0 PV não pulsa (derrotado)");
});

test("PJ: todos veem PV, PM e Defesa; NPC: só o Mestre, ou PV em % para jogadores", () => {
  assert.deepEqual(visibilidade({ ehMestre: false, ehPJ: true, config }), { pv: true, pm: true, defesa: true, numeros: true, texto: "passarMouse" });
  assert.deepEqual(visibilidade({ ehMestre: false, ehPJ: false, config }), { pv: false, pm: false, defesa: false, numeros: false, texto: "passarMouse" });
  assert.deepEqual(visibilidade({ ehMestre: true, ehPJ: false, config }).pm, true);
  const pct = visibilidade({ ehMestre: false, ehPJ: false, config: { ...config, npcModo: "porcentagem" } });
  assert.deepEqual([pct.pv, pct.numeros, pct.pm, pct.defesa], [true, false, false, false]);
  assert.equal(visibilidade({ ehMestre: false, ehPJ: true, config: { ...config, mostrarPM: false, mostrarDefesa: false } }).pm, false);
  assert.equal(textoDaBarra(7, 20, true), "7/20");
  assert.equal(textoDaBarra(7, 20, false), "35%");
});

test("Geometria: barras abaixo do token e dentro da largura; escalam com 2×2; escudo no canto inferior esquerdo", () => {
  for (const [w, h] of [[100, 100], [200, 200], [50, 50]]) {
    const l = layoutDoHud(w, h);
    for (const b of [l.pv, l.pm]) {
      assert.ok(b.x >= 0 && b.x + b.w <= w, "dentro da largura");
      assert.ok(b.y >= h, "abaixo do token (não cobre a moldura)");
      assert.ok(b.h >= 5 && b.h <= Math.max(5, h * 0.1), "fina");
    }
    assert.ok(l.pm.y > l.pv.y, "PM logo abaixo do PV");
    assert.ok(l.escudo.x >= 0 && l.escudo.y + l.escudo.h <= h + 1, "escudo dentro do token, embaixo à esquerda");
    assert.ok(l.escudo.w >= 22);
  }
  assert.equal(layoutDoHud(200, 200).pv.h, 2 * layoutDoHud(100, 100).pv.h, "2×2 escala");
  assert.equal(layoutDoHud(100, 100, { comPM: false }).pm, null);
});

test("Migração: bar1 = PV e bar2 = PM; rodar duas vezes não muda nada", async () => {
  globalThis.foundry ??= {};
  globalThis.foundry.utils ??= {};
  globalThis.foundry.utils.getProperty = (o, k) => k.split(".").reduce((a, p) => a?.[p], o);
  globalThis.foundry.applications ??= { api: { DialogV2: {} } };
  globalThis.Hooks ??= { once() {}, on() {} };
  globalThis.game ??= {};
  const { configurarBarrasDosTokens } = await import("../module/migracoes.mjs");
  const atualizacoes = [];
  const ator = (bar1, bar2) => ({ type: "personagem", prototypeToken: { bar1: { attribute: bar1 }, bar2: { attribute: bar2 } },
    async update(m) { atualizacoes.push(m); for (const [k, v] of Object.entries(m)) { const p = k.split("."); this[p[0]][p[1]][p[2]] = v; } } });
  const atores = [ator("pv", "pm"), ator(null, null), ator("pv", null)];
  assert.equal(await configurarBarrasDosTokens(atores), 2);
  assert.deepEqual(atualizacoes, [{ "prototypeToken.bar1.attribute": "pv", "prototypeToken.bar2.attribute": "pm" }, { "prototypeToken.bar2.attribute": "pm" }]);
  assert.equal(await configurarBarrasDosTokens(atores), 0, "idempotente");
});
