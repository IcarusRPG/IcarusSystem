/**
 * Geometria da interação por proximidade (pura, testada em tests/interacao.test.mjs).
 * A distância é a menor entre o retângulo ocupado pelo token e o objeto: segmento (parede/porta),
 * retângulo (tile, token) ou ponto (nota). Tokens grandes usam a borda do retângulo; diagonais contam.
 */

/** Tolerância (px) somada ao alcance, para portas desenhadas a olho. */
export const TOLERANCIA_PX = 2;

const limitar = (v, a, b) => Math.min(Math.max(v, a), b);

/** Distância de um ponto a um segmento. */
export function distanciaPontoSegmento(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? limitar(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Distância de um ponto a um retângulo (0 se dentro). */
export function distanciaRetanguloPonto(r, px, py) {
  const dx = Math.max(r.x - px, 0, px - (r.x + r.w));
  const dy = Math.max(r.y - py, 0, py - (r.y + r.h));
  return Math.hypot(dx, dy);
}

/** Os segmentos AB e CD se cruzam (ou se tocam)? */
function cruzam(ax, ay, bx, by, cx, cy, dx, dy) {
  const o = (px, py, qx, qy, rx, ry) => Math.sign((qx - px) * (ry - py) - (qy - py) * (rx - px));
  const noSegmento = (px, py, qx, qy, rx, ry) => Math.min(px, rx) <= qx && qx <= Math.max(px, rx) && Math.min(py, ry) <= qy && qy <= Math.max(py, ry);
  const o1 = o(ax, ay, bx, by, cx, cy), o2 = o(ax, ay, bx, by, dx, dy), o3 = o(cx, cy, dx, dy, ax, ay), o4 = o(cx, cy, dx, dy, bx, by);
  if (o1 !== o2 && o3 !== o4) return true;
  return (o1 === 0 && noSegmento(ax, ay, cx, cy, bx, by)) || (o2 === 0 && noSegmento(ax, ay, dx, dy, bx, by))
    || (o3 === 0 && noSegmento(cx, cy, ax, ay, dx, dy)) || (o4 === 0 && noSegmento(cx, cy, bx, by, dx, dy));
}

/** Distância de um retângulo {x, y, w, h} a um segmento [ax, ay, bx, by] (0 se tocar/cruzar). */
export function distanciaRetanguloSegmento(r, [ax, ay, bx, by]) {
  if (distanciaRetanguloPonto(r, ax, ay) === 0 || distanciaRetanguloPonto(r, bx, by) === 0) return 0;
  const cantos = [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]];
  for (let i = 0; i < 4; i++) {
    const [c, d] = [cantos[i], cantos[(i + 1) % 4]];
    if (cruzam(ax, ay, bx, by, c[0], c[1], d[0], d[1])) return 0;
  }
  return Math.min(
    ...cantos.map(([x, y]) => distanciaPontoSegmento(x, y, ax, ay, bx, by)),
    distanciaRetanguloPonto(r, ax, ay), distanciaRetanguloPonto(r, bx, by)
  );
}

/** Distância entre dois retângulos (0 se se tocam ou sobrepõem). */
export function distanciaRetangulos(a, b) {
  const dx = Math.max(b.x - (a.x + a.w), 0, a.x - (b.x + b.w));
  const dy = Math.max(b.y - (a.y + a.h), 0, a.y - (b.y + b.h));
  return Math.hypot(dx, dy);
}

/**
 * Distância do token (retângulo) ao alvo.
 * @param {{x,y,w,h}} token
 * @param {{ tipo: "segmento", c: number[] } | { tipo: "retangulo", r: {x,y,w,h} } | { tipo: "ponto", x, y }} alvo
 */
export function distanciaAoAlvo(token, alvo) {
  if (alvo.tipo === "segmento") return distanciaRetanguloSegmento(token, alvo.c);
  if (alvo.tipo === "retangulo") return distanciaRetangulos(token, alvo.r);
  return distanciaRetanguloPonto(token, alvo.x, alvo.y);
}

/** Alcance em pixels: tamanho do quadrado × (distância máxima ÷ distância por quadrado da cena). */
export const alcanceEmPixels = ({ tamanhoQuadrado, distanciaQuadrado, distanciaMaxima }) =>
  tamanhoQuadrado * (Number(distanciaMaxima) / (Number(distanciaQuadrado) || 1));

/** Perto o bastante? */
export const dentroDoAlcance = (distancia, alcancePx, tolerancia = TOLERANCIA_PX) => distancia <= alcancePx + tolerancia;
