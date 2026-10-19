/**
 * Gera module/dados/*.mjs a partir de tools/dados/*.json (a fonte única).
 *   npm run gerar:dados
 * O navegador precisa desses dados já no carregamento do sistema (ex.: registrar as condições
 * no init), por isso cada JSON vira um módulo JavaScript. NÃO edite module/dados/ à mão:
 * edite o JSON e rode este script. O teste tests/dados.test.mjs reprova se ficarem diferentes.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const GERADOS = [
  "armas", "tipos-dano", "armaduras", "poderes-concedidos", "panteao", "condicoes",
  "icones-armaduras", "icones-divindades", "icones-condicoes", "macros",
  "classes", "icones-classes", "proficiencias-classes", "vinculos"
];

/** Conteúdo do módulo gerado para um JSON. */
export function moduloDe(nome) {
  const json = JSON.parse(fs.readFileSync(path.join(RAIZ, "tools", "dados", `${nome}.json`), "utf8"));
  return `// GERADO por tools/gerar-dados.mjs a partir de tools/dados/${nome}.json — não edite à mão.\n`
    + `export default ${JSON.stringify(json, null, 2)};\n`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const destino = path.join(RAIZ, "module", "dados");
  fs.mkdirSync(destino, { recursive: true });
  for (const nome of GERADOS) {
    fs.writeFileSync(path.join(destino, `${nome}.mjs`), moduloDe(nome));
    console.log(`module/dados/${nome}.mjs`);
  }
}
