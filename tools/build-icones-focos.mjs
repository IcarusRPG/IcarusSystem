/**
 * Ícones dos 6 focos arcanos: reduz para 256×256 (proporção mantida, fundo transparente, como os
 * outros ícones de itens), grava em img/Icones/itens/equipamentos/focos arcanos/ com o NOME
 * ORIGINAL do arquivo (acento e espaço; o caminho no item passa por encodeURI) e gera o manifesto
 * tools/dados/focos_icones.json ([{ id, nome, arquivo }]; arquivo null = ícone padrão).
 *   npm run build:icones-focos -- --de "C:\...\Downloads\img\Icones\itens\equipamentos\focos arcanos"
 * Casamento: ASCII minúsculo com hífens, palavras no singular ("Cetro de ossos" → cetro-de-osso).
 * Idempotente: rodar de novo pega as imagens novas; arquivo igual não é regravado; arquivo que já
 * existe com outro conteúdo NÃO é sobrescrito sem --sobrescrever (vai para a lista de conflitos).
 * Sem o --de, só refaz o manifesto a partir da pasta do repositório.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lerPng, escreverPng, encaixarEmQuadrado } from "./png.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const PASTA_FOCOS = "img/Icones/itens/equipamentos/focos arcanos";
const DESTINO = path.join(RAIZ, ...PASTA_FOCOS.split("/"));
const MANIFESTO = path.join(RAIZ, "tools", "dados", "focos_icones.json");
const LADO = 256;

/** "Cetro de ossos.png" → "cetro-de-osso" (sem acento, caixa, extensão; palavras no singular). */
export const chaveDoFoco = s => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/\.(png|webp|jpe?g)$/i, "").split(/[^a-z0-9]+/).filter(Boolean)
  .map(p => (p.length > 3 && p.endsWith("s") ? p.slice(0, -1) : p)).join("-");

/** Os 6 focos ({ id, nome }) de objetos.json: os 5 focos e o Bordão Arcano. */
export function focosDosDados(objetos) {
  return [...objetos.focos.map(f => ({ id: `foco:${f.id}`, nome: f.nome })),
    ...(objetos.bordaoArcano ? [{ id: `foco:${objetos.bordaoArcano.id}`, nome: objetos.bordaoArcano.nome }] : [])];
}

/** Casa focos e arquivos: { manifesto: [{ id, nome, arquivo|null }], sobrando: arquivos sem foco }. */
export function casarFocos(focos, arquivos) {
  const usados = new Set();
  const manifesto = focos.map(f => {
    const achados = arquivos.filter(a => !usados.has(a) && chaveDoFoco(a) === chaveDoFoco(f.nome));
    const arquivo = achados.length === 1 ? achados[0] : null;
    if (arquivo) usados.add(arquivo);
    return { id: f.id, nome: f.nome, arquivo };
  });
  return { manifesto, sobrando: arquivos.filter(a => !usados.has(a)) };
}

/** Mapa id → URL (codificada) do ícone, para o build dos compêndios. */
export const iconesDosFocos = manifesto => Object.fromEntries(manifesto.filter(m => m.arquivo)
  .map(m => [m.id, encodeURI(`systems/icarus-rpg/${PASTA_FOCOS}/${m.arquivo}`)]));

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf("--de");
  const de = i > 0 ? process.argv[i + 1] : null;
  const sobrescrever = process.argv.includes("--sobrescrever");
  const focos = focosDosDados(JSON.parse(fs.readFileSync(path.join(RAIZ, "tools", "dados", "objetos.json"), "utf8")));
  fs.mkdirSync(DESTINO, { recursive: true });
  const conflitos = [];
  if (de) {
    const origem = fs.readdirSync(de).filter(f => /\.png$/i.test(f));
    console.log(`Origem (${de}):`);
    for (const f of origem) console.log(`  ${f}  ${(fs.statSync(path.join(de, f)).size / 1024).toFixed(0)} KB`);
    const { manifesto, sobrando } = casarFocos(focos, origem);
    for (const m of manifesto.filter(x => x.arquivo)) {
      const png = escreverPng(LADO, LADO, encaixarEmQuadrado(lerPng(path.join(de, m.arquivo)), LADO));
      const alvo = path.join(DESTINO, m.arquivo);
      if (fs.existsSync(alvo) && fs.readFileSync(alvo).equals(png)) continue;
      if (fs.existsSync(alvo) && !sobrescrever) { conflitos.push(m.arquivo); continue; }
      fs.writeFileSync(alvo, png);
      console.log(`gravado: ${PASTA_FOCOS}/${m.arquivo}`);
    }
    if (sobrando.length) console.warn(`imagens sem foco (não copiadas): ${sobrando.join(", ")}`);
  }
  const noRepo = fs.readdirSync(DESTINO).filter(f => /\.png$/i.test(f));
  const { manifesto, sobrando } = casarFocos(focos, noRepo);
  fs.writeFileSync(MANIFESTO, JSON.stringify(manifesto, null, 2) + "\n");
  const sem = manifesto.filter(m => !m.arquivo).map(m => m.nome);
  console.log(`tools/dados/focos_icones.json: ${manifesto.length - sem.length} de ${manifesto.length} focos com imagem`);
  if (sem.length) console.warn(`focos sem imagem (ícone padrão): ${sem.join(", ")}`);
  if (sobrando.length) console.warn(`imagens do repositório sem foco: ${sobrando.join(", ")}`);
  if (conflitos.length) console.warn(`CONFLITO (já existem com outro conteúdo; use --sobrescrever): ${conflitos.join(", ")}`);
}
