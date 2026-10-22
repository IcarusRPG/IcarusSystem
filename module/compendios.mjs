/**
 * Plano B para os compêndios: popula todos os compêndios do Icarus dentro do Foundry, a partir
 * dos mesmos dados do build (tools/dados/*.json, embutidos em module/dados/). Idempotente:
 * atualiza o que já existe (pelo _id estável) e só cria o que falta.
 * Uso (Mestre): macro de script com  await game.icarus.popularCompendios();
 */
import { SISTEMA_ID, PERICIAS } from "./config.mjs";
import { documentosDosCompendios } from "./dados-itens.mjs";
import { documentosNovos, documentosDeClasses, documentosDeVinculos } from "./dados-compendios.mjs";
import ARMAS from "./dados/armas.mjs";
import ARMADURAS from "./dados/armaduras.mjs";
import ICONES_ARMADURAS from "./dados/icones-armaduras.mjs";
import PODERES from "./dados/poderes-concedidos.mjs";
import PANTEAO from "./dados/panteao.mjs";
import ICONES_DIVINDADES from "./dados/icones-divindades.mjs";
import CONDICOES from "./dados/condicoes.mjs";
import MACROS from "./dados/macros.mjs";
import CLASSES from "./dados/classes.mjs";
import ICONES_CLASSES from "./dados/icones-classes.mjs";
import PROFICIENCIAS_CLASSES from "./dados/proficiencias-classes.mjs";
import VINCULOS from "./dados/vinculos.mjs";
import { documentosDeOrigens } from "./origens-dados.mjs";
import { idEstavel } from "./dados-itens.mjs";

/** Dados das armas (mantido por compatibilidade com a verificação de armas). */
export async function carregarDadosDeArmas() {
  return ARMAS;
}

/** Todos os documentos de todos os compêndios, por nome de pacote. */
export function todosOsDocumentos() {
  const armas = documentosDosCompendios(ARMAS);
  const novos = documentosNovos({
    armaduras: ARMADURAS, iconesArmaduras: ICONES_ARMADURAS,
    poderes: PODERES, panteao: PANTEAO, iconesDivindades: ICONES_DIVINDADES,
    condicoes: CONDICOES, macros: MACROS, nomePericia: k => PERICIAS.find(p => p.chave === k)?.nome ?? k
  });
  const classes = documentosDeClasses({ classes: CLASSES, iconesClasses: ICONES_CLASSES, proficienciasClasses: PROFICIENCIAS_CLASSES });
  return { armas: armas.armas, municoes: armas.municoes, ...novos, ...classes, vinculos: documentosDeVinculos(VINCULOS, PERICIAS), ...documentosDeOrigens({}, idEstavel) };
}

export async function popularCompendios() {
  if (!game.user.isGM) return ui.notifications.warn(game.i18n.localize("ICARUS.Compendios.SoMestre"));
  const relatorio = [];
  for (const [nome, docs] of Object.entries(todosOsDocumentos())) {
    const pack = game.packs.get(`${SISTEMA_ID}.${nome}`);
    if (!pack) { relatorio.push(`${nome}: compêndio não encontrado`); continue; }
    const travado = pack.locked;
    if (travado) await pack.configure({ locked: false });

    // Pastas: as mães antes das filhas
    const existentes = new Set(pack.folders.map(f => f.id));
    const novas = (docs.pastas ?? []).filter(p => !existentes.has(p._id)).sort((a, b) => (a.folder ? 1 : 0) - (b.folder ? 1 : 0));
    for (const p of novas) await Folder.create(p, { pack: pack.collection, keepId: true });

    const classe = pack.documentClass;
    const lista = docs.itens ?? docs.diarios ?? docs.macros ?? docs.atores ?? [];
    const indice = await pack.getIndex();
    const criar = lista.filter(d => !indice.has(d._id));
    const atualizar = lista.filter(d => indice.has(d._id));
    if (criar.length) await classe.createDocuments(criar, { pack: pack.collection, keepId: true });
    if (atualizar.length) {
      // Diários e atores: recria para atualizar páginas e itens embutidos; demais: atualiza os campos
      if (pack.documentName === "JournalEntry" || pack.documentName === "Actor") {
        await classe.deleteDocuments(atualizar.map(d => d._id), { pack: pack.collection });
        await classe.createDocuments(atualizar, { pack: pack.collection, keepId: true });
      } else {
        await classe.updateDocuments(atualizar.map(({ effects, pages, ...resto }) => resto), { pack: pack.collection });
      }
    }

    if (travado) await pack.configure({ locked: true });
    relatorio.push(`${pack.title}: ${criar.length} criado(s), ${atualizar.length} atualizado(s), ${novas.length} pasta(s) nova(s)`);
  }
  console.log(`Icarus RPG | Compêndios:\n${relatorio.join("\n")}`);
  ui.notifications.info(game.i18n.localize("ICARUS.Compendios.Populados"));
  return relatorio;
}
