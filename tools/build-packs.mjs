/**
 * Gera os compêndios a partir de tools/dados/armas.json.
 *   npm run build:packs
 * 1. Escreve os JSON-fonte em packs-src/armas e packs-src/municoes (um arquivo por documento,
 *    com _id estável e a chave _key exigida pelo compilador: "!items!<id>" e "!folders!<id>").
 * 2. Compila para LevelDB em packs/ com o @foundryvtt/foundryvtt-cli (compilePack).
 * Rodar duas vezes gera exatamente os mesmos documentos (nada é duplicado).
 * Feche o Foundry antes de compilar numa pasta que ele esteja usando.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { documentosDosCompendios } from "../module/dados-itens.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DADOS = path.join(RAIZ, "tools", "dados", "armas.json");
const PACOTES = ["armas", "municoes"];
const soFontes = process.argv.includes("--so-fontes");

const dados = JSON.parse(fs.readFileSync(DADOS, "utf8"));

// Ícones: lista os que faltam (sem parar; esses itens usam o dado azul)
const faltando = [];
const confere = (pasta, arquivo, nome) => {
  if (!arquivo) faltando.push(`${nome} (sem ícone definido)`);
  else if (!fs.existsSync(path.join(RAIZ, "img", "Icones", "itens", "equipamentos", pasta, arquivo))) faltando.push(`${nome}: ${pasta}/${arquivo}`);
};
for (const a of dados.armas) confere("armas", a.icone, a.nome);
for (const m of dados.municoes) confere("munições", m.icone, m.nome);
if (faltando.length) console.warn(`Ícones faltando (${faltando.length}), usando o dado azul:\n  - ${faltando.join("\n  - ")}`);
const confirmar = dados.armas.filter(a => a.iconeConfirmar).map(a => `${a.nome} ← ${a.icone}`);
if (confirmar.length) console.warn(`Ícones a confirmar: ${confirmar.join(" · ")}`);

/** Nome de arquivo seguro para o JSON-fonte. */
const arquivo = (doc, prefixo = "") => `${prefixo}${doc.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "_")}_${doc._id}.json`;

const docs = documentosDosCompendios(dados);
for (const nome of PACOTES) {
  const destino = path.join(RAIZ, "packs-src", nome);
  fs.rmSync(destino, { recursive: true, force: true });
  fs.mkdirSync(destino, { recursive: true });
  for (const pasta of docs[nome].pastas) {
    fs.writeFileSync(path.join(destino, arquivo(pasta, "_pasta_")), JSON.stringify({ ...pasta, _key: `!folders!${pasta._id}` }, null, 2) + "\n");
  }
  for (const item of docs[nome].itens) {
    fs.writeFileSync(path.join(destino, arquivo(item)), JSON.stringify({ ...item, _key: `!items!${item._id}` }, null, 2) + "\n");
  }
  console.log(`packs-src/${nome}: ${docs[nome].pastas.length} pasta(s), ${docs[nome].itens.length} item(ns)`);
}

if (!soFontes) {
  const { compilePack } = await import("@foundryvtt/foundryvtt-cli");
  for (const nome of PACOTES) {
    const destino = path.join(RAIZ, "packs", nome);
    fs.rmSync(destino, { recursive: true, force: true });
    await compilePack(path.join(RAIZ, "packs-src", nome), destino);
    console.log(`packs/${nome}: compilado`);
  }
}
