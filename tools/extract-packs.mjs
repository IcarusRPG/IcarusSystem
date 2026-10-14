/**
 * Extrai os compêndios LevelDB de packs/ para JSON em packs-src-extraido/ (para conferir o que
 * o Foundry gravou, por exemplo depois de editar itens dentro do compêndio).
 *   npm run extract:packs
 * A fonte de verdade continua sendo tools/dados/armas.json.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractPack } from "@foundryvtt/foundryvtt-cli";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const nome of ["armas", "municoes"]) {
  const origem = path.join(RAIZ, "packs", nome);
  if (!fs.existsSync(origem)) { console.warn(`packs/${nome} não existe: rode npm run build:packs`); continue; }
  const destino = path.join(RAIZ, "packs-src-extraido", nome);
  fs.rmSync(destino, { recursive: true, force: true });
  await extractPack(origem, destino, { folders: true });
  console.log(`packs/${nome} → packs-src-extraido/${nome}`);
}
