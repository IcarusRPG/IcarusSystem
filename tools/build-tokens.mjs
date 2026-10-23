/**
 * Molduras de token dos personagens: copia (opcional) e gera o manifesto tools/dados/tokens.json.
 *   npm run build:tokens                       só refaz o manifesto a partir de img/Icones/tokens/personagens/
 *   npm run build:tokens -- --de "<pasta>"     antes copia os PNG da pasta "Token Personagens" (nomes
 *                                              normalizados: ASCII minúsculo com hífens)
 *   ... --sobrescrever                         permite substituir arquivos diferentes já existentes
 * Idempotente: rodar de novo gera o mesmo manifesto e não duplica arquivos.
 * Para cada moldura: id estável (do nome do arquivo), nome de exibição, raio de fechamento da
 * máscara (frestas no aro) e a caixa da abertura (0–1), usados pela aba Token da ficha.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { cabecalhoPng, lerPng, escreverPng, reduzir } from "./png.mjs";
import { opacosDe, raioDeFechamento, silhueta, caixaDaAbertura } from "../module/token-mascara.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const PASTA_TOKENS = "tokens/personagens";
const DESTINO = path.join(RAIZ, "img", "Icones", ...PASTA_TOKENS.split("/"));
const MANIFESTO = path.join(RAIZ, "tools", "dados", "tokens.json");
/** Miniaturas da galeria (as molduras têm 1–2 MB cada): lado em px e subpasta. */
const LADO_MINIATURA = 160;
const PASTA_MINIATURAS = "miniaturas";

/** "Tokem esmeralda.png" → { arquivo: "token-esmeralda.png", nome: "Esmeralda" }. */
export function normalizarNome(original) {
  const base = original.replace(/\.[^.]+$/, "").replace(/^tokem\b/i, "Token").trim();
  const ascii = base.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const semPrefixo = base.replace(/^token\s+/i, "");
  return { arquivo: `${ascii}.png`, id: ascii.replace(/^token-/, ""), nome: semPrefixo.charAt(0).toUpperCase() + semPrefixo.slice(1) };
}

const hash = f => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const arg = nome => { const i = process.argv.indexOf(nome); return i > 0 ? process.argv[i + 1] : null; };

function copiar(origem, { sobrescrever = false } = {}) {
  fs.mkdirSync(DESTINO, { recursive: true });
  const conflitos = [];
  const originais = {};
  for (const f of fs.readdirSync(origem).filter(f => /\.(png|webp)$/i.test(f)).sort()) {
    const { arquivo } = normalizarNome(f);
    originais[arquivo] = f;
    const alvo = path.join(DESTINO, arquivo);
    if (fs.existsSync(alvo)) {
      if (hash(alvo) === hash(path.join(origem, f))) continue;
      if (!sobrescrever) { conflitos.push(`${arquivo} (de "${f}")`); continue; }
    }
    fs.copyFileSync(path.join(origem, f), alvo);
    console.log(`copiado: ${f} → img/Icones/${PASTA_TOKENS}/${arquivo}`);
  }
  if (conflitos.length) {
    console.error(`Arquivos diferentes já existem (nada foi sobrescrito; use --sobrescrever):\n  - ${conflitos.join("\n  - ")}`);
    process.exit(1);
  }
  return originais;
}

export function gerarManifesto(originais = {}) {
  const anterior = fs.existsSync(MANIFESTO) ? JSON.parse(fs.readFileSync(MANIFESTO, "utf8")) : { tokens: [] };
  const avisos = [];
  const tokens = [];
  for (const arquivo of fs.readdirSync(DESTINO).filter(f => /\.(png|webp)$/i.test(f)).sort()) {
    const cab = cabecalhoPng(fs.readFileSync(path.join(DESTINO, arquivo)));
    if (!cab.png || !cab.temAlfa) { avisos.push(`${arquivo}: não é PNG com transparência (o recorte depende dela)`); continue; }
    const original = originais[arquivo] ?? anterior.tokens.find(t => t.arquivo === arquivo)?.original ?? arquivo;
    const { id, nome } = normalizarNome(original);
    const { w, h, px } = lerPng(path.join(DESTINO, arquivo));
    const opacos = opacosDe(px, w, h);
    const fechamento = raioDeFechamento(opacos, w, h);
    if (fechamento === null) { avisos.push(`${arquivo}: o aro não fecha nem com o maior raio; ficou fora do manifesto`); continue; }
    const c = caixaDaAbertura(opacos, silhueta(opacos, w, h, fechamento), w, h);
    // Miniatura (determinística: rodar de novo gera os mesmos bytes)
    fs.mkdirSync(path.join(DESTINO, PASTA_MINIATURAS), { recursive: true });
    const mini = escreverPng(LADO_MINIATURA, LADO_MINIATURA, reduzir({ w, h, px }, LADO_MINIATURA));
    const arqMini = path.join(DESTINO, PASTA_MINIATURAS, arquivo);
    if (!fs.existsSync(arqMini) || !fs.readFileSync(arqMini).equals(mini)) fs.writeFileSync(arqMini, mini);
    const n = v => Math.round(v * 10000) / 10000;
    tokens.push({ id, nome, arquivo, miniatura: `${PASTA_MINIATURAS}/${arquivo}`, original, tamanho: w, fechamento, abertura: { x0: n(c.x0 / w), y0: n(c.y0 / h), x1: n((c.x1 + 1) / w), y1: n((c.y1 + 1) / h) } });
  }
  tokens.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const manifesto = { versao: 1, pasta: PASTA_TOKENS, tokens };
  fs.writeFileSync(MANIFESTO, JSON.stringify(manifesto, null, 2) + "\n");
  return { manifesto, avisos };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const de = arg("--de");
  const originais = de ? copiar(path.join(de), { sobrescrever: process.argv.includes("--sobrescrever") }) : {};
  const { manifesto, avisos } = gerarManifesto(originais);
  for (const a of avisos) console.warn(`AVISO: ${a}`);
  console.log(`tools/dados/tokens.json: ${manifesto.tokens.length} moldura(s)${manifesto.tokens.filter(t => t.fechamento).map(t => ` · ${t.nome}: fechamento ${t.fechamento} px`).join("")}`);
}
