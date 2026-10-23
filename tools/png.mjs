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

const TABELA_CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = buf => { let c = 0xffffffff; for (const b of buf) c = TABELA_CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function bloco(tipo, dados) {
  const t = Buffer.from(tipo, "ascii"), tam = Buffer.alloc(4), crc = Buffer.alloc(4);
  tam.writeUInt32BE(dados.length);
  crc.writeUInt32BE(crc32(Buffer.concat([t, dados])));
  return Buffer.concat([tam, t, dados, crc]);
}

/** PNG RGBA 8 bits (sem filtro, deflate nível 9). Determinístico: mesmos pixels, mesmos bytes. */
export function escreverPng(w, h, px) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const linhas = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) Buffer.from(px.buffer, px.byteOffset + y * w * 4, w * 4).copy(linhas, y * (w * 4 + 1) + 1);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), bloco("IHDR", ihdr), bloco("IDAT", zlib.deflateSync(linhas, { level: 9 })), bloco("IEND", Buffer.alloc(0))]);
}

/** Reduz por média de caixa (alfa pré-multiplicado, sem halo escuro nas bordas). */
export function reduzir({ w, h, px }, lado) {
  const out = new Uint8Array(lado * lado * 4);
  for (let y = 0; y < lado; y++) for (let x = 0; x < lado; x++) {
    const x0 = Math.floor(x * w / lado), x1 = Math.max(x0 + 1, Math.floor((x + 1) * w / lado));
    const y0 = Math.floor(y * h / lado), y1 = Math.max(y0 + 1, Math.floor((y + 1) * h / lado));
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
      const i = (yy * w + xx) * 4, al = px[i + 3];
      r += px[i] * al; g += px[i + 1] * al; b += px[i + 2] * al; a += al; n++;
    }
    const o = (y * lado + x) * 4;
    if (a) { out[o] = Math.round(r / a); out[o + 1] = Math.round(g / a); out[o + 2] = Math.round(b / a); }
    out[o + 3] = Math.round(a / n);
  }
  return out;
}

/** Encaixa a imagem num quadrado de `lado` px (proporção mantida, centralizada, fundo transparente). */
export function encaixarEmQuadrado({ w, h, px }, lado) {
  const escala = lado / Math.max(w, h);
  const nw = Math.max(1, Math.round(w * escala)), nh = Math.max(1, Math.round(h * escala));
  const ox = Math.floor((lado - nw) / 2), oy = Math.floor((lado - nh) / 2);
  const out = new Uint8Array(lado * lado * 4);
  for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
    const x0 = Math.floor(x * w / nw), x1 = Math.max(x0 + 1, Math.floor((x + 1) * w / nw));
    const y0 = Math.floor(y * h / nh), y1 = Math.max(y0 + 1, Math.floor((y + 1) * h / nh));
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
      const i = (yy * w + xx) * 4, al = px[i + 3];
      r += px[i] * al; g += px[i + 1] * al; b += px[i + 2] * al; a += al; n++;
    }
    const o = ((oy + y) * lado + ox + x) * 4;
    if (a) { out[o] = Math.round(r / a); out[o + 1] = Math.round(g / a); out[o + 2] = Math.round(b / a); }
    out[o + 3] = Math.round(a / n);
  }
  return out;
}
