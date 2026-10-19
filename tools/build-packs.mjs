/**
 * Gera os compêndios a partir de tools/dados/*.json.
 *   npm run build:packs
 * 1. Escreve os JSON-fonte em packs-src/<pacote>/ (um arquivo por documento, com _id estável e a
 *    chave _key exigida pelo compilador: "!items!<id>", "!folders!<id>", "!journal!<id>",
 *    "!macros!<id>"; embutidos: "!items.effects!<item>.<efeito>", "!journal.pages!<diário>.<página>").
 * 2. Compila para LevelDB em packs/ com o @foundryvtt/foundryvtt-cli (compilePack).
 * Rodar duas vezes gera exatamente os mesmos documentos (nada é duplicado).
 * Ícones: todo caminho mapeado precisa existir (o build para com mensagem clara); itens sem
 * imagem no mapa usam o dado azul e são listados.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { documentosDosCompendios } from "../module/dados-itens.mjs";
import { documentosNovos } from "../module/dados-compendios.mjs";
import { PERICIAS } from "../module/config.mjs";
import { IMAGENS_SISTEMA } from "../module/imagens.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ler = nome => JSON.parse(fs.readFileSync(path.join(RAIZ, "tools", "dados", `${nome}.json`), "utf8"));
const soFontes = process.argv.includes("--so-fontes");

const armas = ler("armas");
const novos = {
  armaduras: ler("armaduras"), iconesArmaduras: ler("icones-armaduras"),
  poderes: ler("poderes-concedidos"), panteao: ler("panteao"), iconesDivindades: ler("icones-divindades"),
  condicoes: ler("condicoes"), macros: ler("macros"),
  classes: ler("classes"), iconesClasses: ler("icones-classes"), proficienciasClasses: ler("proficiencias-classes"),
  nomePericia: k => PERICIAS.find(p => p.chave === k)?.nome ?? k
};

/* ---------- Ícones ---------- */
const faltandoArquivo = [];
const semImagem = [];
const normalizado = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const confere = (pasta, arquivo, nome) => {
  if (!arquivo) return semImagem.push(nome);
  const dir = path.join(RAIZ, "img", "Icones", ...pasta.split("/"));
  if (fs.existsSync(path.join(dir, arquivo))) return;
  // Mesmo nome sem acento/maiúsculas (ex.: Condicoes.png): o caminho do mapa precisa ser corrigido
  const parecido = fs.existsSync(dir) && fs.readdirSync(dir).find(f => normalizado(f) === normalizado(arquivo));
  faltandoArquivo.push(`${nome}: img/Icones/${pasta}/${arquivo}${parecido ? ` (no disco está "${parecido}")` : ""}`);
};
for (const a of armas.armas) confere("itens/equipamentos/armas", a.icone, a.nome);
for (const m of armas.municoes) confere("itens/equipamentos/munições", m.icone, m.nome);
for (const a of novos.armaduras.itens) confere("itens/equipamentos/armaduras e escudos", novos.iconesArmaduras[a.id], a.nome);
for (const d of novos.panteao.divindades) confere("panteão/simbolos", novos.iconesDivindades[d.id], d.nome);
for (const c of novos.classes.classes) confere("classes", novos.iconesClasses[c.id], `classe ${c.nome}`);
for (const m of novos.macros.macros) if (m.icone) confere(path.posix.dirname(m.icone), path.posix.basename(m.icone), `macro ${m.nome}`);
for (const [chave, rel] of Object.entries(IMAGENS_SISTEMA)) confere(path.posix.dirname(rel), path.posix.basename(rel), `interface (${chave})`);
if (faltandoArquivo.length) {
  console.error(`ERRO: ${faltandoArquivo.length} ícone(s) mapeado(s) não existem no disco:\n  - ${faltandoArquivo.join("\n  - ")}`);
  process.exit(1);
}
if (semImagem.length) console.warn(`Sem imagem no mapa (usam o dado azul): ${semImagem.join(", ")}`);

/* ---------- Documentos ---------- */
const docsArmas = documentosDosCompendios(armas);
const docsNovos = documentosNovos(novos);

/** Cada pacote: lista de [documento, coleção] já com as chaves. */
const PACOTES = {
  armas: docsArmas.armas,
  municoes: docsArmas.municoes,
  "armaduras-escudos": docsNovos["armaduras-escudos"],
  "poderes-concedidos": docsNovos["poderes-concedidos"],
  condicoes: docsNovos.condicoes,
  macros: docsNovos.macros
};

/** Põe _key no documento e nos embutidos (efeitos de itens, páginas de diários). */
function comChaves(doc, colecao) {
  const d = structuredClone(doc);
  d._key = `!${colecao}!${d._id}`;
  if (colecao === "items") for (const e of d.effects ?? []) e._key = `!items.effects!${d._id}.${e._id}`;
  if (colecao === "journal") for (const p of d.pages ?? []) p._key = `!journal.pages!${d._id}.${p._id}`;
  return d;
}

const arquivo = (doc, prefixo = "") => `${prefixo}${doc.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "_")}_${doc._id}.json`;

for (const [nome, conteudo] of Object.entries(PACOTES)) {
  const destino = path.join(RAIZ, "packs-src", nome);
  fs.rmSync(destino, { recursive: true, force: true });
  fs.mkdirSync(destino, { recursive: true });
  const gravar = (doc, colecao, prefixo) =>
    fs.writeFileSync(path.join(destino, arquivo(doc, prefixo)), JSON.stringify(comChaves(doc, colecao), null, 2) + "\n");
  for (const p of conteudo.pastas ?? []) gravar(p, "folders", "_pasta_");
  for (const i of conteudo.itens ?? []) gravar(i, "items");
  for (const j of conteudo.diarios ?? []) gravar(j, "journal");
  for (const m of conteudo.macros ?? []) gravar(m, "macros");
  const total = (conteudo.itens ?? conteudo.diarios ?? conteudo.macros ?? []).length;
  console.log(`packs-src/${nome}: ${(conteudo.pastas ?? []).length} pasta(s), ${total} documento(s)`);
}

if (!soFontes) {
  const { compilePack } = await import("@foundryvtt/foundryvtt-cli");
  for (const nome of Object.keys(PACOTES)) {
    const destino = path.join(RAIZ, "packs", nome);
    fs.rmSync(destino, { recursive: true, force: true });
    await compilePack(path.join(RAIZ, "packs-src", nome), destino);
    console.log(`packs/${nome}: compilado`);
  }
}
