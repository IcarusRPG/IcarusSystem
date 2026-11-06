/**
 * Ícones das magias: reduz para 256×256 (proporção mantida, fundo transparente), grava em
 * img/magias/<id>.png e gera o manifesto tools/dados/magias_icones.json ([{ id, arquivo }]) e o
 * relatório tools/relatorio-icones-magias.md (magias sem imagem e imagens sem magia).
 *   npm run build:icones-magias -- --de "C:\...\Downloads\img\Icones\Magias"
 * Repetível: rodar de novo pega as imagens novas; arquivo igual não é regravado. Um arquivo que
 * já existe e mudou é atualizado e listado no fim (para conferir no git antes do commit).
 * Casamento: nome do arquivo e nome da magia em ASCII minúsculo com hífens ("Bola de Fogo.png" →
 * bola-de-fogo); nomes com pequenos erros ficam em EXCECOES (confirmadas uma a uma).
 * Sem o --de, só refaz o manifesto e o relatório a partir de img/magias/.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lerPng, escreverPng, encaixarEmQuadrado } from "./png.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const PASTA_MAGIAS = "img/magias";
const DESTINO = path.join(RAIZ, ...PASTA_MAGIAS.split("/"));
const DADOS = path.join(RAIZ, "tools", "dados");
const LADO = 256;

/** Arquivos com nome um pouco diferente da magia (id → nome do arquivo na pasta de origem). */
export const EXCECOES = {
  "manto-de-sombras": "Manto de Sombra.png"
};

/** "Bola de Fogo.png" → "bola-de-fogo" */
export const ascii = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/\.png$/i, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Arquivo de origem de cada magia.
 * @returns {{ casados: Record<string,string>, semImagem: string[], semMagia: string[] }}
 */
export function casarIcones(magias, arquivos) {
  const casados = {};
  const usados = new Set();
  for (const m of magias) {
    const excecao = EXCECOES[m.id];
    const achado = excecao ? arquivos.find(a => a === excecao) : arquivos.find(a => !usados.has(a) && ascii(a) === ascii(m.nome));
    if (achado) { casados[m.id] = achado; usados.add(achado); }
  }
  return {
    casados,
    semImagem: magias.filter(m => !casados[m.id]).map(m => m.nome),
    semMagia: arquivos.filter(a => !usados.has(a))
  };
}

function relatorio({ total, comImagem, semImagem, semMagia }) {
  const lista = l => (l.length ? l.map(x => `- ${x}`).join("\n") : "- (nenhuma)");
  return `# Ícones das magias\n\nGerado por \`npm run build:icones-magias\`. Magia sem imagem usa o ícone padrão até a imagem chegar.\n\n`
    + `- Magias: ${total}\n- Com imagem: ${comImagem}\n- Sem imagem: ${semImagem.length}\n\n`
    + `## Magias sem imagem\n\n${lista(semImagem)}\n\n## Imagens sem magia (nome não casou)\n\n${lista(semMagia)}\n`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf("--de");
  const de = i > 0 ? process.argv[i + 1] : null;
  const magias = JSON.parse(fs.readFileSync(path.join(DADOS, "magias.json"), "utf8")).magias;
  fs.mkdirSync(DESTINO, { recursive: true });
  let semMagia = [];
  const atualizados = [];
  if (de) {
    const arquivos = fs.readdirSync(de).filter(f => /\.png$/i.test(f));
    const r = casarIcones(magias, arquivos);
    semMagia = r.semMagia;
    for (const [id, origem] of Object.entries(r.casados)) {
      const png = escreverPng(LADO, LADO, encaixarEmQuadrado(lerPng(path.join(de, origem)), LADO), { filtrar: true });
      const alvo = path.join(DESTINO, `${id}.png`);
      if (!fs.existsSync(alvo)) fs.writeFileSync(alvo, png);
      else if (!fs.readFileSync(alvo).equals(png)) { fs.writeFileSync(alvo, png); atualizados.push(`${id}.png`); }
    }
  }
  // Manifesto pelo que está no repositório (img/magias/<id>.png)
  const existentes = new Set(fs.readdirSync(DESTINO));
  const manifesto = magias.filter(m => existentes.has(`${m.id}.png`)).map(m => ({ id: m.id, arquivo: `${m.id}.png` }));
  fs.writeFileSync(path.join(DADOS, "magias_icones.json"), JSON.stringify(manifesto, null, 2) + "\n");
  const semImagem = magias.filter(m => !existentes.has(`${m.id}.png`)).map(m => m.nome);
  fs.writeFileSync(path.join(RAIZ, "tools", "relatorio-icones-magias.md"), relatorio({ total: magias.length, comImagem: manifesto.length, semImagem, semMagia }));
  console.log(`${manifesto.length}/${magias.length} magias com ícone; sem imagem: ${semImagem.length}; imagens sem magia: ${semMagia.length}`);
  if (semMagia.length) console.log("Imagens sem magia:", semMagia.join(", "));
  if (atualizados.length) console.log("ATUALIZADOS (já existiam e mudaram):", atualizados.join(", "));
}
