/**
 * Token do personagem: máscara (silhueta) da moldura e geometria do enquadramento. Puro (sem
 * Foundry nem DOM): o build (tools/build-tokens.mjs), a ficha (module/token.mjs) e os testes usam.
 *
 * Silhueta: flood fill a partir das bordas pelos pixels transparentes; o que é alcançado é "fora",
 * o resto (aro + miolo) é a silhueta. Moldura com frestas finas no aro (o flood fill entraria no
 * miolo): "fechamento" de r px — o aro é engrossado r px antes do flood fill e o lado de fora é
 * devolvido depois (dilatado r px), para a silhueta não crescer para fora do aro.
 *
 * Enquadramento: o retrato é desenhado por trás da moldura; o zoom mínimo e o arrasto garantem que
 * ele sempre cubra a abertura (modo "cover" sobre a caixa da abertura). O zoom é guardado como
 * múltiplo do "cover" (z) e o centro do retrato em coordenadas 0–1 do canvas.
 */

/** Alfa até este valor conta como transparente. */
export const LIMIAR_ALFA = 16;
/** Raios de fechamento testados (px na resolução nativa). */
export const RAIOS_FECHAMENTO = [0, 2, 4, 6, 8, 12, 16, 24, 32];
/** Zoom máximo (múltiplo do "cover"). */
export const ZOOM_MAXIMO = 5;
/** Liga zoom menor que o "cover" e arrasto livre (mostra fundo transparente). Desligado por padrão. */
export const PERMITIR_ZOOM_OUT_LIVRE = false;
/** Zoom mínimo com o zoom livre ligado. */
export const ZOOM_MINIMO_LIVRE = 0.2;

/** Dilatação (máximo) quadrada de raio r de uma máscara 0/1, separável. */
export function dilatar(mascara, w, h, r) {
  if (r <= 0) return mascara.slice();
  const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const o = y * w;
    let ultimo = -Infinity;
    // Passada da esquerda (guarda o último 1 visto) e da direita, para cobrir os dois lados
    for (let x = 0; x < w; x++) { if (mascara[o + x]) ultimo = x; if (x - ultimo <= r) tmp[o + x] = 1; }
    ultimo = Infinity;
    for (let x = w - 1; x >= 0; x--) { if (mascara[o + x]) ultimo = x; if (ultimo - x <= r) tmp[o + x] = 1; }
  }
  for (let x = 0; x < w; x++) {
    let ultimo = -Infinity;
    for (let y = 0; y < h; y++) { if (tmp[y * w + x]) ultimo = y; if (y - ultimo <= r) out[y * w + x] = 1; }
    ultimo = Infinity;
    for (let y = h - 1; y >= 0; y--) { if (tmp[y * w + x]) ultimo = y; if (ultimo - y <= r) out[y * w + x] = 1; }
  }
  return out;
}

/** Flood fill a partir das bordas pelos pixels livres (livre[i] = 1). @returns {Uint8Array} fora */
function inundarDasBordas(livre, w, h) {
  const fora = new Uint8Array(w * h);
  const pilha = [];
  for (let x = 0; x < w; x++) pilha.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) pilha.push(y * w, y * w + w - 1);
  while (pilha.length) {
    const i = pilha.pop();
    if (fora[i] || !livre[i]) continue;
    fora[i] = 1;
    const x = i % w;
    if (x > 0) pilha.push(i - 1);
    if (x < w - 1) pilha.push(i + 1);
    if (i >= w) pilha.push(i - w);
    if (i < w * (h - 1)) pilha.push(i + w);
  }
  return fora;
}

/** Máscara de opacos (alfa > limiar) a partir do canal alfa (ou de RGBA, com rgba = true). */
export function opacosDe(pixels, w, h, { rgba = true, limiar = LIMIAR_ALFA } = {}) {
  const m = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) m[i] = (rgba ? pixels[i * 4 + 3] : pixels[i]) > limiar ? 1 : 0;
  return m;
}

/**
 * Silhueta da moldura (1 = dentro do token). Com r > 0, fechamento para tapar frestas do aro.
 * @returns {Uint8Array}
 */
export function silhueta(opacos, w, h, r = 0) {
  const parede = r > 0 ? dilatar(opacos, w, h, r) : opacos;
  const livre = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) livre[i] = parede[i] ? 0 : 1;
  let fora = inundarDasBordas(livre, w, h);
  if (r > 0) fora = dilatar(fora, w, h, r);
  const s = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) s[i] = fora[i] ? 0 : 1;
  return s;
}

/** Menor raio de fechamento que deixa o centro dentro da silhueta (null se nenhum serve). */
export function raioDeFechamento(opacos, w, h) {
  const centro = (h >> 1) * w + (w >> 1);
  for (const r of RAIOS_FECHAMENTO) if (silhueta(opacos, w, h, r)[centro]) return r;
  return null;
}

/**
 * Caixa da abertura: pixels transparentes da silhueta ligados ao centro (o "miolo" do aro).
 * @returns {{ x0, y0, x1, y1 }} em pixels (inclusivo)
 */
export function caixaDaAbertura(opacos, s, w, h) {
  const visto = new Uint8Array(w * h);
  const pilha = [(h >> 1) * w + (w >> 1)];
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  while (pilha.length) {
    const i = pilha.pop();
    if (visto[i] || !s[i] || opacos[i]) continue;
    visto[i] = 1;
    const x = i % w, y = (i / w) | 0;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    if (x > 0) pilha.push(i - 1);
    if (x < w - 1) pilha.push(i + 1);
    if (y > 0) pilha.push(i - w);
    if (y < h - 1) pilha.push(i + w);
  }
  return x1 < 0 ? { x0: 0, y0: 0, x1: w - 1, y1: h - 1 } : { x0, y0, x1, y1 };
}

/* ------------------------------ Enquadramento ------------------------------ */

/**
 * Escala (px do canvas por px do retrato) do "cover" sobre a caixa da abertura.
 * @param {{ w, h }} retrato   tamanho natural do retrato
 * @param {{ x0, y0, x1, y1 }} caixa  normalizada (0–1) no canvas
 * @param {number} N  lado do canvas em px
 */
export function escalaCover(retrato, caixa, N) {
  const bw = (caixa.x1 - caixa.x0) * N, bh = (caixa.y1 - caixa.y0) * N;
  return Math.max(bw / retrato.w, bh / retrato.h);
}

/** Enquadramento inicial: centrado na abertura, zoom = cover. */
export const enquadramentoInicial = caixa => ({ x: (caixa.x0 + caixa.x1) / 2, y: (caixa.y0 + caixa.y1) / 2, escala: 1 });

/**
 * Limita o enquadramento: zoom entre o cover (ou o mínimo livre) e 5×, e o retrato sempre cobrindo
 * a caixa da abertura. @param {{ x, y, escala }} e  centro (0–1) e zoom (múltiplo do cover)
 */
export function limitar(e, retrato, caixa, N, { livre = PERMITIR_ZOOM_OUT_LIVRE } = {}) {
  const escala = Math.min(ZOOM_MAXIMO, Math.max(livre ? ZOOM_MINIMO_LIVRE : 1, Number(e.escala) || 1));
  if (livre) return { x: e.x, y: e.y, escala };
  const s = escalaCover(retrato, caixa, N) * escala;
  // Meia largura/altura do retrato em coordenadas 0–1
  const mw = (retrato.w * s) / N / 2, mh = (retrato.h * s) / N / 2;
  const entre = (v, a, b) => Math.min(Math.max(v, a), b);
  return { x: entre(e.x, caixa.x1 - mw, caixa.x0 + mw), y: entre(e.y, caixa.y1 - mh, caixa.y0 + mh), escala };
}

/** Retângulo do retrato no canvas (px). */
export function retanguloDoRetrato(e, retrato, caixa, N) {
  const s = escalaCover(retrato, caixa, N) * e.escala;
  const w = retrato.w * s, h = retrato.h * s;
  return { x: e.x * N - w / 2, y: e.y * N - h / 2, w, h };
}

/** Zoom mantendo o ponto (px, py em 0–1) parado sob o cursor. */
export function zoomNoPonto(e, fator, px, py, retrato, caixa, N, opcoes) {
  const alvo = limitar({ ...e, escala: e.escala * fator }, retrato, caixa, N, opcoes).escala;
  const f = alvo / e.escala;
  return limitar({ x: px + (e.x - px) * f, y: py + (e.y - py) * f, escala: alvo }, retrato, caixa, N, opcoes);
}
