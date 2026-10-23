/**
 * Ícones dos itens comuns (itens de origem): reduz para 256×256 (proporção mantida, fundo
 * transparente), grava em img/Icones/itens/itens de origem/<Nome do item>.png e gera o mapa
 * tools/dados/icones-itens-comuns.json ({ id do item: arquivo }).
 *   npm run build:icones-itens -- --de "<pasta itens de origem>"
 * Casa cada item com o arquivo de mesmo nome (sem acento, maiúsculas e o que está entre
 * parênteses); as exceções ficam em EXCECOES. Idempotente: mesmos arquivos, mesmos bytes.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lerPng, escreverPng, encaixarEmQuadrado } from "./png.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const PASTA_ICONES_ITENS = "itens/itens de origem";
const DESTINO = path.join(RAIZ, "img", "Icones", ...PASTA_ICONES_ITENS.split("/"));
const MAPA = path.join(RAIZ, "tools", "dados", "icones-itens-comuns.json");
const LADO = 256;

/**
 * Arquivos com nome diferente do item. Na pasta original, "Uniforme da casa.png" é a imagem da
 * trouxa de viagem e "Uniforme de Casa.png" é a do uniforme (conferido olhando as imagens).
 */
export const EXCECOES = {
  luneta: "Luneta Steampunk de Latão e Couro.png",
  "trouxa-de-viagem": "Uniforme da casa.png",
  "uniforme-da-casa": "Uniforme de Casa.png"
};

const normalizar = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\(.*?\)/g, "").replace(/\.png$/i, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Arquivo de origem de cada item (id → nome do arquivo), ou null se não houver. */
export function casarArquivos(itens, arquivos) {
  const usados = new Set(Object.values(EXCECOES));
  return Object.fromEntries(itens.map(it => {
    if (EXCECOES[it.id]) return [it.id, arquivos.includes(EXCECOES[it.id]) ? EXCECOES[it.id] : null];
    const achados = arquivos.filter(f => !usados.has(f) && normalizar(f) === normalizar(it.nome));
    return [it.id, achados.length === 1 ? achados[0] : null];
  }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf("--de");
  const de = i > 0 ? process.argv[i + 1] : null;
  if (!de) { console.error("Uso: npm run build:icones-itens -- --de \"<pasta>\""); process.exit(1); }
  const itens = JSON.parse(fs.readFileSync(path.join(RAIZ, "tools", "dados", "itens-comuns.json"), "utf8")).itens;
  const arquivos = fs.readdirSync(de).filter(f => /\.png$/i.test(f));
  const casados = casarArquivos(itens, arquivos);
  fs.mkdirSync(DESTINO, { recursive: true });
  const mapa = {};
  for (const it of itens) {
    const origem = casados[it.id];
    if (!origem) { console.warn(`sem imagem: ${it.nome}`); continue; }
    // O arquivo leva o nome do item (o nome original nem sempre bate: ver EXCECOES)
    const arquivo = `${it.nome}.png`;
    const png = escreverPng(LADO, LADO, encaixarEmQuadrado(lerPng(path.join(de, origem)), LADO));
    const alvo = path.join(DESTINO, arquivo);
    if (!fs.existsSync(alvo) || !fs.readFileSync(alvo).equals(png)) fs.writeFileSync(alvo, png);
    mapa[it.id] = arquivo;
  }
  const sobrando = arquivos.filter(f => !Object.values(casados).includes(f));
  if (sobrando.length) console.warn(`arquivos sem item: ${sobrando.join(", ")}`);
  fs.writeFileSync(MAPA, JSON.stringify(mapa, null, 2) + "\n");
  console.log(`tools/dados/icones-itens-comuns.json: ${Object.keys(mapa).length} de ${itens.length} itens com ícone`);
}
