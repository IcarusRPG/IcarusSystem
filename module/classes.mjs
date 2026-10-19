/**
 * Classes no Foundry: escolher a classe na ficha, preencher classeConfig e proficiências,
 * conceder habilidades por nível e avisar dos poderes de classe a escolher.
 * Dados e regras puras: module/classes-dados.mjs. Documentos: module/dados-compendios.mjs.
 */
import { SISTEMA_ID } from "./config.mjs";
import { classePorId, iconeDaClasse, proficienciasDaClasse, habilidadesAteNivel, contagemDePoderes } from "./classes-dados.mjs";
import { dadosDaHabilidade, idDeClasse } from "./dados-compendios.mjs";
import ICONES_CLASSES from "./dados/icones-classes.mjs";

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
export async function concederHabilidades(actor, { nivel = actor.system.nivel } = {}) {
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
  for (const item of criados) await APOS_CONCEDER.get(item.flags?.[SISTEMA_ID]?.habilidade)?.(actor, item);
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
  const antigas = atual ? itensDeClasse(actor, "habilidade").filter(i => i.flags?.[SISTEMA_ID]?.auto) : [];
  if (atual) {
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: loc("ICARUS.Classe.TrocarTitulo") },
      content: `<p>${Handlebars.escapeExpression(fmt("ICARUS.Classe.TrocarTexto", { antiga: atual.nome, nova: nova.nome, n: antigas.length }))}</p>`,
      rejectClose: false
    });
    if (!ok) return false;
    if (antigas.length) await actor.deleteEmbeddedDocuments("Item", antigas.map(i => i.id));
  }
  const src = actor._source.system;
  const prof = proficienciasDaClasse(nova.id);
  const unir = (a, b) => [...new Set([...(a ?? []), ...(b ?? [])])];
  const dados = {
    "system.identidade.classe": nova.id,
    [`flags.${SISTEMA_ID}.classeId`]: nova.id,
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
  new DialogoPericiasClasse(actor, nova).render(true);
  await concederHabilidades(actor);
  return true;
}

/** Classe em texto livre ("Outra"): sem automação. */
export function classeLivre(actor, texto) {
  return actor.update({ "system.identidade.classe": texto, [`flags.${SISTEMA_ID}.-=classeId`]: null });
}

/**
 * Ao subir de nível: concede as habilidades novas e avisa dos poderes de classe a escolher.
 * Descer de nível não remove nada (o Mestre decide).
 */
export function registrarClasses() {
  Hooks.on("updateActor", async (actor, mudancas, opcoes, userId) => {
    if (userId !== game.user.id || !foundry.utils.hasProperty(mudancas, "system.nivel")) return;
    if (!classeDoAtor(actor)) return;
    await concederHabilidades(actor);
    const c = contadorDePoderes(actor);
    if (c?.disponiveis) ui.notifications.info(fmt("ICARUS.Classe.PoderesParaEscolher", { nome: actor.name, n: c.disponiveis }));
  });
}

export { iconeDaClasse };
