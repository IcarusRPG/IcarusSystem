/** Token do personagem: manifesto, máscara da moldura (silhueta) e enquadramento (cover, zoom, arrasto). */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  opacosDe, silhueta, raioDeFechamento, caixaDaAbertura, limitar, retanguloDoRetrato, zoomNoPonto,
  enquadramentoInicial, ZOOM_MAXIMO
} from "../module/token-mascara.mjs";
import { normalizarNome } from "../tools/build-tokens.mjs";
import { lerPng } from "../tools/png.mjs";
import TOKENS from "../module/dados/tokens.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Anel sintético w×w (opaco entre r1 e r2), com uma fresta vertical de `fresta` px no topo. */
function anel(w, r1, r2, fresta = 0) {
  const px = new Uint8Array(w * w * 4), c = (w - 1) / 2;
  for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
    const d = Math.hypot(x - c, y - c);
    const naFresta = fresta && y < c && Math.abs(x - c) < fresta / 2;
    if (d >= r1 && d <= r2 && !naFresta) px[(y * w + x) * 4 + 3] = 255;
  }
  return px;
}

test("1. Manifesto: 22 molduras só de Token Personagens, nomes ASCII com hífens, ids únicos; arquivos existem", () => {
  assert.equal(TOKENS.tokens.length, 22);
  assert.equal(new Set(TOKENS.tokens.map(t => t.id)).size, 22);
  for (const t of TOKENS.tokens) {
    assert.match(t.arquivo, /^[a-z0-9-]+\.png$/);
    assert.ok(fs.existsSync(path.join(RAIZ, "img/Icones", TOKENS.pasta, t.arquivo)), t.arquivo);
    assert.ok(t.abertura.x0 < 0.5 && t.abertura.x1 > 0.5 && t.abertura.y0 < 0.5 && t.abertura.y1 > 0.5, t.id);
  }
  assert.deepEqual(fs.readdirSync(path.join(RAIZ, "img/Icones/tokens")), ["personagens"], "nenhuma outra subpasta");
  assert.deepEqual(normalizarNome("Tokem esmeralda.png"), { arquivo: "token-esmeralda.png", id: "esmeralda", nome: "Esmeralda" });
  assert.deepEqual(normalizarNome("Token Anátema.png"), { arquivo: "token-anatema.png", id: "anatema", nome: "Anátema" });
  assert.equal(TOKENS.tokens.find(t => t.id === "anatema").fechamento, 2, "Anátema tem frestas no aro");
});

test("5. Máscara: anel fechado → silhueta = aro + miolo; fora não entra", () => {
  const w = 101, px = anel(w, 30, 40);
  const op = opacosDe(px, w, w);
  const s = silhueta(op, w, w, 0);
  assert.equal(s[50 * w + 50], 1, "centro dentro");
  assert.equal(s[0], 0, "canto fora");
  assert.equal(s[50 * w + 95], 0, "além do aro, fora");
  assert.equal(raioDeFechamento(op, w, w), 0);
});

test("5. Máscara: anel com fresta → flood fill puro vaza; o fechamento tapa sem crescer para fora", () => {
  const w = 101, px = anel(w, 30, 40, 3);
  const op = opacosDe(px, w, w);
  assert.equal(silhueta(op, w, w, 0)[50 * w + 50], 0, "sem fechamento, vaza");
  const r = raioDeFechamento(op, w, w);
  assert.ok(r > 0 && r <= 4, `r = ${r}`);
  const s = silhueta(op, w, w, r);
  assert.equal(s[50 * w + 50], 1);
  // Nenhum pixel da silhueta além do raio externo do aro (+1 px de arredondamento)
  const c = (w - 1) / 2;
  for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) if (s[y * w + x]) assert.ok(Math.hypot(x - c, y - c) <= 41, `(${x},${y}) fora do aro`);
  const caixa = caixaDaAbertura(op, s, w, w);
  assert.ok(caixa.x0 >= 20 && caixa.x1 <= 80, JSON.stringify(caixa));
});

test("5. Moldura real (Anátema, a de aro aberto): silhueta fecha e não passa da borda opaca externa", async () => {
  const t = TOKENS.tokens.find(x => x.id === "anatema");
  const { w, h, px } = lerPng(path.join(RAIZ, "img/Icones", TOKENS.pasta, t.arquivo));
  const op = opacosDe(px, w, h);
  const s = silhueta(op, w, h, t.fechamento);
  assert.equal(s[(h >> 1) * w + (w >> 1)], 1);
  // Todo pixel da silhueta está cercado pelo aro: há opaco à esquerda e à direita na linha, e acima e
  // abaixo na coluna (nada da silhueta fica do lado de fora do aro)
  const linhaMin = new Int32Array(h).fill(w), linhaMax = new Int32Array(h).fill(-1);
  const colMin = new Int32Array(w).fill(h), colMax = new Int32Array(w).fill(-1);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (op[y * w + x]) {
    linhaMin[y] = Math.min(linhaMin[y], x); linhaMax[y] = Math.max(linhaMax[y], x);
    colMin[x] = Math.min(colMin[x], y); colMax[x] = Math.max(colMax[x], y);
  }
  // Exceção: o fundo das frestas finas que o fechamento tapou (dentro do corpo da moldura). Esses
  // pixels ficam colados no aro (a até 2r + 1 px de um opaco), nunca soltos do lado de fora.
  const { dilatar } = await import("../module/token-mascara.mjs");
  const perto = dilatar(op, w, h, 2 * t.fechamento + 1);
  let naFresta = 0, vazados = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!s[y * w + x] || !(x < linhaMin[y] || x > linhaMax[y] || y < colMin[x] || y > colMax[x])) continue;
    if (perto[y * w + x]) naFresta++; else vazados++;
  }
  assert.equal(vazados, 0, "nenhum pixel da silhueta solto fora do aro");
  assert.ok(naFresta < w * h * 0.0005, `fundo das frestas: ${naFresta} px`);
  // Cantos do canvas: sempre fora
  for (const i of [0, w - 1, (h - 1) * w, w * h - 1]) assert.equal(s[i], 0);
});

test("4/5. Enquadramento: cover cobre a abertura em qualquer arrasto; zoom entre 1× e 5× do cover", () => {
  const caixa = { x0: 0.2, y0: 0.25, x1: 0.8, y1: 0.75 }, N = 1254;
  for (const retrato of [{ w: 400, h: 1200 }, { w: 2000, h: 500 }, { w: 300, h: 300 }]) {
    const e0 = limitar(enquadramentoInicial(caixa), retrato, caixa, N);
    for (const [x, y, escala] of [[-5, -5, 1], [5, 5, 1], [0.5, 0.5, 0.01], [0.5, 0.5, 99], [-3, 4, 2.5], [e0.x, e0.y, e0.escala]]) {
      const e = limitar({ x, y, escala }, retrato, caixa, N);
      assert.ok(e.escala >= 1 && e.escala <= ZOOM_MAXIMO);
      const r = retanguloDoRetrato(e, retrato, caixa, N);
      const eps = 1e-6;
      assert.ok(r.x <= caixa.x0 * N + eps && r.y <= caixa.y0 * N + eps, "cobre o canto superior esquerdo");
      assert.ok(r.x + r.w >= caixa.x1 * N - eps && r.y + r.h >= caixa.y1 * N - eps, "cobre o canto inferior direito");
    }
  }
});

test("4. Zoom na roda: o ponto sob o cursor fica parado (quando não bate no limite)", () => {
  const caixa = { x0: 0.2, y0: 0.2, x1: 0.8, y1: 0.8 }, N = 1000, retrato = { w: 1000, h: 1000 };
  const e = { x: 0.5, y: 0.5, escala: 2 };
  const z = zoomNoPonto(e, 1.25, 0.6, 0.5, retrato, caixa, N);
  assert.equal(z.escala, 2.5);
  // Ponto do retrato sob o cursor antes e depois
  const ponto = (en, px) => (px * N - retanguloDoRetrato(en, retrato, caixa, N).x) / retanguloDoRetrato(en, retrato, caixa, N).w;
  assert.ok(Math.abs(ponto(e, 0.6) - ponto(z, 0.6)) < 1e-9);
  assert.equal(zoomNoPonto(e, 100, 0.5, 0.5, retrato, caixa, N).escala, ZOOM_MAXIMO);
  assert.equal(zoomNoPonto(e, 0.01, 0.5, 0.5, retrato, caixa, N).escala, 1);
});
