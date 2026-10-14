/**
 * Plano B para os compêndios: popula "Icarus — Armas" e "Icarus — Munições" dentro do Foundry,
 * a partir do mesmo tools/dados/armas.json usado pelo build. Idempotente: atualiza o que já existe
 * (pelo _id estável e por flags["icarus-rpg"].id) e só cria o que falta.
 * Uso (Mestre): macro de script com  await game.icarus.popularCompendios();
 */
import { SISTEMA_ID } from "./config.mjs";
import { documentosDosCompendios } from "./dados-itens.mjs";

const URL_DADOS = `systems/${SISTEMA_ID}/tools/dados/armas.json`;

export async function carregarDadosDeArmas() {
  const resposta = await fetch(URL_DADOS);
  if (!resposta.ok) throw new Error(`Não foi possível ler ${URL_DADOS} (${resposta.status})`);
  return resposta.json();
}

export async function popularCompendios() {
  if (!game.user.isGM) return ui.notifications.warn(game.i18n.localize("ICARUS.Compendios.SoMestre"));
  const docs = documentosDosCompendios(await carregarDadosDeArmas());
  const relatorio = [];
  for (const nome of ["armas", "municoes"]) {
    const pack = game.packs.get(`${SISTEMA_ID}.${nome}`);
    if (!pack) { relatorio.push(`${nome}: compêndio não encontrado`); continue; }
    const travado = pack.locked;
    if (travado) await pack.configure({ locked: false });

    // Pastas
    const pastasExistentes = new Set(pack.folders.map(f => f.id));
    const novasPastas = docs[nome].pastas.filter(p => !pastasExistentes.has(p._id));
    if (novasPastas.length) await Folder.createDocuments(novasPastas, { pack: pack.collection, keepId: true });

    // Itens: atualiza os existentes e cria os que faltam
    const indice = await pack.getIndex({ fields: [`flags.${SISTEMA_ID}.id`] });
    const porId = new Map(indice.map(e => [e._id, e]));
    const criar = [], atualizar = [];
    for (const item of docs[nome].itens) (porId.has(item._id) ? atualizar : criar).push(item);
    if (criar.length) await Item.createDocuments(criar, { pack: pack.collection, keepId: true });
    if (atualizar.length) await Item.updateDocuments(atualizar, { pack: pack.collection });

    if (travado) await pack.configure({ locked: true });
    relatorio.push(`${pack.title}: ${criar.length} criado(s), ${atualizar.length} atualizado(s), ${novasPastas.length} pasta(s) nova(s)`);
  }
  console.log(`Icarus RPG | Compêndios:\n${relatorio.join("\n")}`);
  ui.notifications.info(relatorio.join(" · "));
  return relatorio;
}
