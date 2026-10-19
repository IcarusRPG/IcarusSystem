/**
 * Classes no Foundry: escolher a classe na ficha, preencher classeConfig e proficiências,
 * conceder habilidades por nível e avisar dos poderes de classe a escolher.
 * Dados e regras puras: module/classes-dados.mjs. Documentos: module/dados-compendios.mjs.
 */
import { SISTEMA_ID } from "./config.mjs";
import { classePorId, iconeDaClasse, proficienciasDaClasse, habilidadesAteNivel, contagemDePoderes } from "./classes-dados.mjs";
import { dadosDaHabilidade, idDeClasse } from "./dados-compendios.mjs";
import ICONES_CLASSES from "./dados/icones-classes.mjs";
import { resolverEscolha } from "./escolhas.mjs";
import { confirmarReset, resetarClasse, itensDeOrigemDeClasse } from "./assistente.mjs";

const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);

/**
 * Mecânicas de classe na aba Classe: por id da classe, uma função (actor) → linhas
 * [{ id, rotulo, info?, botao?, ativo?, dica?, desativado? }]. As ações dos botões ficam em
 * ACOES_DE_MECANICA (id → async (actor) => …). Preenchidos por module/mecanicas-classe.mjs.
 */
export const MECANICAS_DE_CLASSE = new Map();
export const ACOES_DE_MECANICA = new Map();
/** Depois de conceder uma habilidade (por id da habilidade): (actor, item) => Promise. Ex.: Perícia Refinada. */
export const APOS_CONCEDER = new Map();

/** Classe do personagem (dados do JSON) ou null (texto livre / nenhuma). */
export const classeDoAtor = actor => classePorId(actor?._source?.system?.identidade?.classe ?? actor?.system?.identidade?.classe);

/** Itens de habilidade/poder de classe do ator, por tipo. */
export const itensDeClasse = (actor, tipoPoder) => actor.items.filter(i => i.type === "poder" && i.system.fonte === "classe" && (!tipoPoder || i.system.tipoPoder === tipoPoder));

/** Ids (sem classe) dos poderes/habilidades de classe que o ator tem: "<classe>__<id>" → "<id>". */
export function idsDeClasseDoAtor(actor) {
  return new Set(itensDeClasse(actor).map(i => String(i.flags?.[SISTEMA_ID]?.id ?? "").split("__")[1]).filter(Boolean));
}

/** Quantas vezes o ator tem cada poder/habilidade de classe (repetíveis contam várias). */
export function contagemDeClasseDoAtor(actor) {
  const mapa = new Map();
  for (const i of itensDeClasse(actor)) {
    const id = String(i.flags?.[SISTEMA_ID]?.id ?? "").split("__")[1];
    if (id) mapa.set(id, (mapa.get(id) ?? 0) + 1);
  }
  return mapa;
}

/** Contador "Poderes de classe X / Y" do ator. */
export function contadorDePoderes(actor) {
  const classe = classeDoAtor(actor);
  if (!classe) return null;
  const escolhidos = itensDeClasse(actor, "poder").filter(i => i.system.classe === classe.id).length;
  return contagemDePoderes(classe, actor.system.nivel, escolhidos);
}

/**
 * Concede as habilidades da classe até o nível atual que ainda faltam (um item por habilidade).
 * @returns {Promise<Item[]>} os itens criados
 */
export async function concederHabilidades(actor, { nivel = actor.system.nivel, abrirEscolhas = true } = {}) {
  const classe = classeDoAtor(actor);
  if (!classe) return [];
  const tem = new Set(itensDeClasse(actor, "habilidade").map(i => i.flags?.[SISTEMA_ID]?.id));
  const novas = habilidadesAteNivel(classe, nivel)
    .filter(h => !tem.has(idDeClasse(classe.id, h.id)))
    .map(h => {
      const d = dadosDaHabilidade(classe, h, ICONES_CLASSES);
      delete d._id;
      delete d.folder;
      d.flags[SISTEMA_ID].auto = true;
      return d;
    });
  if (!novas.length) return [];
  const criados = await actor.createEmbeddedDocuments("Item", novas);
  ui.notifications.info(fmt("ICARUS.Classe.HabilidadesRecebidas", { nome: actor.name, lista: criados.map(i => i.name).join(", ") }));
  for (const item of criados) {
    await APOS_CONCEDER.get(item.flags?.[SISTEMA_ID]?.habilidade)?.(actor, item);
    if (abrirEscolhas) await resolverEscolha(actor, item);
  }
  return criados;
}

/**
 * Escolhe a classe: classeConfig (respeitando o modo manual), proficiências (somadas às que já
 * tem), identidade.classe e flags; abre o diálogo de perícias e concede as habilidades do nível.
 * Trocar de classe pergunta antes e remove só as habilidades automáticas da classe anterior.
 * @returns {Promise<boolean>} se mudou
 */
export async function aplicarClasse(actor, novoId) {
  const atual = classeDoAtor(actor);
  const nova = classePorId(novoId);
  if (!nova || atual?.id === nova.id) return false;
  // Trocar de classe (ou sair de uma "Outra" com itens de classe): reset limpo com confirmação
  if (atual || itensDeOrigemDeClasse(actor).length) {
    if (!(await confirmarReset(actor, nova.nome))) return false;
    await resetarClasse(actor);
  }
  const src = actor._source.system;
  const prof = proficienciasDaClasse(nova.id);
  const unir = (a, b) => [...new Set([...(a ?? []), ...(b ?? [])])];
  const dados = {
    "system.identidade.classe": nova.id,
    [`flags.${SISTEMA_ID}.classeId`]: nova.id,
    // Para o reset: as proficiências como estavam antes da classe
    [`flags.${SISTEMA_ID}.proficienciasAntesClasse`]: foundry.utils.deepClone(src.proficiencias),
    "system.proficiencias.armas": unir(src.proficiencias.armas, prof.armas),
    "system.proficiencias.armaduras": unir(src.proficiencias.armaduras, prof.armaduras),
    "system.proficiencias.escudo": src.proficiencias.escudo || prof.escudo,
    "system.proficiencias.tunicas": src.proficiencias.tunicas || prof.tunicas
  };
  if (!src.classeConfig.manual) {
    Object.assign(dados, {
      "system.classeConfig.pvInicial": nova.pv.inicial,
      "system.classeConfig.pvPorNivel": nova.pv.porNivel,
      "system.classeConfig.pvAtributo": "CON",
      "system.classeConfig.pmInicial": nova.pm.inicial,
      "system.classeConfig.pmPorNivel": nova.pm.porNivel,
      "system.classeConfig.pmAtributo": nova.pm.atributo ?? null,
      "system.classeConfig.pmAtributoSoNoPrimeiroNivel": !!nova.pm.atributoSoNoPrimeiroNivel
    });
  } else {
    ui.notifications.warn(fmt("ICARUS.Classe.Manual", { nome: actor.name }));
  }
  await actor.update(dados);
  const { DialogoPericiasClasse } = await import("./sheets/dialogo-pericias-classe.mjs");
  const { abrirAssistenteDeNivel } = await import("./sheets/dialogo-subir-nivel.mjs");
  // Depois das perícias, o assistente percorre do 1º nível ao atual (habilidades e poderes)
  new DialogoPericiasClasse(actor, nova, { aoFechar: () => abrirAssistenteDeNivel(actor, { de: 0, ate: actor.system.nivel }) }).render(true);
  return true;
}

/** Classe em texto livre ("Outra") ou nenhuma: sem automação; havendo classe, faz o reset antes. */
export async function classeLivre(actor, texto) {
  if (classeDoAtor(actor) || itensDeOrigemDeClasse(actor).length) {
    if (!(await confirmarReset(actor, texto || loc("ICARUS.Classe.Nenhuma")))) return false;
    await resetarClasse(actor);
  }
  await actor.update({ "system.identidade.classe": texto, [`flags.${SISTEMA_ID}.-=classeId`]: null });
  return true;
}

/**
 * Ao subir de nível: concede as habilidades novas e avisa dos poderes de classe a escolher.
 * Descer de nível não remove nada (o Mestre decide).
 */
export function registrarClasses() {
  // Subir o nível (campo da ficha, botão + ou macro) com classe do sistema: o nível só muda pelo
  // assistente (que concede as habilidades e os poderes). O resto da atualização segue normal.
  Hooks.on("preUpdateActor", (actor, mudancas, opcoes) => {
    if (opcoes.icarusAssistente || !classeDoAtor(actor)) return;
    const novo = foundry.utils.getProperty(mudancas, "system.nivel");
    if (novo === undefined || novo <= actor.system.nivel) return;
    delete mudancas.system.nivel;
    const de = actor.system.nivel;
    import("./sheets/dialogo-subir-nivel.mjs").then(m => m.abrirAssistenteDeNivel(actor, { de, ate: novo }));
  });
  Hooks.on("updateActor", (actor, mudancas, opcoes, userId) => {
    if (userId !== game.user.id || opcoes.icarusAssistente || !classeDoAtor(actor)) return;
    if (foundry.utils.hasProperty(mudancas, "system.nivel")) ui.notifications.info(fmt("ICARUS.Assistente.DesceuNivel", { nome: actor.name }));
  });
}

export { iconeDaClasse };
