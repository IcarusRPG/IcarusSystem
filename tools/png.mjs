/**
 * Leitor mínimo de PNG (sem dependências) para os scripts de build: cabeçalho e pixels RGBA de
 * 8 bits sem entrelaçamento (o formato das molduras de token).
 */
import fs from "node:fs";
import zlib from "node:zlib";

/** Cabeçalho: { png, largura, altura, bits, tipoCor, entrelacado, temAlfa }. */
export function cabecalhoPng(buffer) {
  const png = buffer.length > 33 && buffer.toString("ascii", 1, 4) === "PNG";
  if (!png) return { png: false };
  const tipoCor = buffer[25];
  return { png, largura: buffer.readUInt32BE(16), altura: buffer.readUInt32BE(20), bits: buffer[24], tipoCor, entrelacado: buffer[28], temAlfa: tipoCor === 4 || tipoCor === 6 };
}

/** Pixels RGBA (Uint8Array w*h*4). Só RGBA 8 bits sem entrelaçamento. */
export function lerPng(arquivo) {
  const b = fs.readFileSync(arquivo);
  const cab = cabecalhoPng(b);
  if (!cab.png || cab.bits !== 8 || cab.tipoCor !== 6 || cab.entrelacado) throw new Error(`${arquivo}: só PNG RGBA 8 bits sem entrelaçamento`);
  const idat = [];
  for (let p = 8; p < b.length;) {
    const n = b.readUInt32BE(p), tipo = b.toString("ascii", p + 4, p + 8);
    if (tipo === "IDAT") idat.push(b.subarray(p + 8, p + 8 + n));
    p += 12 + n;
  }
  const w = cab.largura, h = cab.altura, bpp = 4, linha = w * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const px = new Uint8Array(w * h * bpp);
  for (let y = 0; y < h; y++) {
    const filtro = raw[y * (linha + 1)];
    const ini = y * (linha + 1) + 1, o = y * linha;
    for (let x = 0; x < linha; x++) {
      const a = x >= bpp ? px[o + x - bpp] : 0, c = y ? px[o - linha + x] : 0, ac = x >= bpp && y ? px[o - linha + x - bpp] : 0;
      let v = raw[ini + x];
      if (filtro === 1) v += a;
      else if (filtro === 2) v += c;
      else if (filtro === 3) v += (a + c) >> 1;
      else if (filtro === 4) {
        const p = a + c - ac, pa = Math.abs(p - a), pb = Math.abs(p - c), pc = Math.abs(p - ac);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? c : ac;
      }
      px[o + x] = v & 255;
    }
  }
  return { w, h, px };
}
