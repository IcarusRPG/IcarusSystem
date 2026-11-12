/**
 * Migrações de dados do mundo (rodam uma vez por versão, no início, só no Mestre ativo; são
 * idempotentes: rodar de novo não muda nada).
 *
 * 0.9.0 — o animal do Vínculo Selvagem "Teixugo Gigante" passou a se chamar "Texugo Gigante"
 * (id texugo-gigante): flags de vínculo dos patrulheiros, atores do animal já invocados, itens de
 * escolha ("Vínculo Selvagem (Teixugo Gigante)") e o documento antigo do compêndio Vínculos.
 */
import { SISTEMA_ID, FICHA_ANIMAL, ICONE_PADRAO } from "./config.mjs";
import { migrarQuantidadeDoEstoque } from "./loja.mjs";
import { poderesDasHabilidades } from "./mercador-dados.mjs";
import { iconeDoItemComum } from "./origens-dados.mjs";
import { migrarBonusDeOrigem, adicionarItensQueFaltam } from "./origens.mjs";
import { classePorId, linhagemDasEscolhas, pmPelaRegra } from "./classes-dados.mjs";
import FOCOS_ICONES from "./dados/focos_icones.mjs";

/** Ícone novo de um foco arcano (por flags id "foco:<id>") se o item ainda está com o ícone padrão. */
export function iconeNovoDoFoco(item) {
  const id = item?.flags?.[SISTEMA_ID]?.id;
  const m = FOCOS_ICONES.find(x => x.id === id && x.arquivo);
  if (!m) return null;
  const padrao = !item.img || item.img === "icons/svg/item-bag.svg" || item.img === ICONE_PADRAO || decodeURI(item.img).includes("/equipamentos/armas/");
  return padrao ? encodeURI(`systems/${SISTEMA_ID}/img/Icones/itens/equipamentos/focos arcanos/${m.arquivo}`) : null;
}

/**
 * Habilidades que recuperam PM e vinham com o número do texto como custo (erro de extração do
 * classes.json): id → custo errado. Só o custo errado é zerado (um ajuste à mão fica).
 */
export const CUSTOS_DE_GANHO = {
  "guerreiro__embalo-de-batalha": 1, "samurai__meditacao-de-combate": 6, "barbaro__furia-sanguinaria": 1,
  "arcanista__mana-transbordante": 2, "paladino__divida-paga": 2
};

/** Custo corrigido do item (0) ou null se não muda. */
export function custoDeGanhoCorrigido(item) {
  const errado = CUSTOS_DE_GANHO[item?.flags?.[SISTEMA_ID]?.id];
  return errado !== undefined && Number(item.system?.custoPM) === errado ? 0 : null;
}

/** 0.27.2 — zera o custo dessas habilidades nas fichas e nos itens do mundo. @returns {Promise<number>} itens */
export async function corrigirCustosDeGanho(atores = game.actors, itensDoMundo = game.items ?? []) {
  let n = 0;
  for (const actor of atores ?? []) {
    const mudancas = actor.items.filter(i => custoDeGanhoCorrigido(i) !== null).map(i => ({ _id: i.id, "system.custoPM": 0 }));
    if (mudancas.length) { await actor.updateEmbeddedDocuments("Item", mudancas); n += mudancas.length; }
  }
  for (const item of itensDoMundo) if (custoDeGanhoCorrigido(item) !== null) { await item.update({ "system.custoPM": 0 }); n++; }
  return n;
}

/** 0.25.0 — focos arcanos já nas fichas e no mundo com o ícone padrão recebem a imagem própria. */
export async function atualizarIconesDosFocos(atores = game.actors, itensDoMundo = game.items ?? []) {
  let n = 0;
  for (const actor of atores ?? []) {
    const mudancas = actor.items.map(i => ({ _id: i.id, img: iconeNovoDoFoco(i) })).filter(m => m.img);
    if (mudancas.length) { await actor.updateEmbeddedDocuments("Item", mudancas); n += mudancas.length; }
  }
  for (const item of itensDoMundo) {
    const img = iconeNovoDoFoco(item);
    if (img) { await item.update({ img }); n++; }
  }
  return n;
}

const CAMPOS_PM = ["pmInicial", "pmPorNivel", "pmAtributo", "pmAtributoSoNoPrimeiroNivel"];
/** Classes cuja regra de PM mudou (as outras ficam como estão, mesmo com ajuste à mão). */
const CONJURADORES = new Set(["arcanista", "bardo", "clerigo", "druida", "anatema", "mistico"]);

/**
 * Mudanças no classeConfig de PM para a regra atual (conjuradores: base × nível + atributo uma
 * vez). Ficha em modo manual ou sem classe do sistema: nada. O atributo de PM escolhido fica.
 * @returns {object|null}  caminhos → valores (null se nada muda)
 */
export function mudancasDePM(actor) {
  const s = actor._source?.system ?? actor.system;
  const classe = classePorId(s?.identidade?.classe);
  if (!classe || !CONJURADORES.has(classe.id) || s.classeConfig?.manual) return null;
  const linhagem = classe.id === "arcanista" ? linhagemDasEscolhas(actor.flags?.[SISTEMA_ID]?.escolhasClasse) : null;
  const alvo = pmPelaRegra(classe, linhagem, s.classeConfig?.pmAtributo ?? null);
  const mudancas = {};
  for (const k of CAMPOS_PM) if ((s.classeConfig?.[k] ?? null) !== (alvo[k] ?? null)) mudancas[`system.classeConfig.${k}`] = alvo[k];
  return Object.keys(mudancas).length ? mudancas : null;
}

/**
 * 0.25.0 — PM dos conjuradores (Núcleo, seção 4): o atributo-chave soma uma vez, no 1º nível; as
 * bases subiram (Mago 5, Feiticeiro 6, Bardo 4). Recalcula o classeConfig e corta o PM atual no
 * novo máximo. @returns {Promise<number>} fichas alteradas
 */
export async function migrarPMDosConjuradores(atores = game.actors) {
  let n = 0;
  for (const actor of atores ?? []) {
    if (actor.type !== "personagem") continue;
    const mudancas = mudancasDePM(actor);
    if (!mudancas) continue;
    await actor.update(mudancas);
    const pm = actor.system.pm;
    if (pm.value > pm.max) await actor.update({ "system.pm.value": pm.max });
    console.log(`Icarus RPG | PM recalculado: ${actor.name} (máximo ${pm.max}).`);
    n++;
  }
  return n;
}

const ANTIGO_ID = "teixugo-gigante";
const NOVO_ID = "texugo-gigante";
const trocaNome = t => String(t).replace(/Teixugo/g, "Texugo").replace(/teixugo/g, "texugo");

/** Renomeia o Teixugo em atores, itens e flags. @returns {Promise<number>} atores alterados */
export async function migrarTexugo() {
  let atores = 0;
  for (const actor of game.actors ?? []) {
    const f = actor.flags?.[SISTEMA_ID] ?? {};
    const mudancas = {};
    if (f.vinculoAnimal === ANTIGO_ID) mudancas[`flags.${SISTEMA_ID}.vinculoAnimal`] = NOVO_ID;
    if (f.vinculo?.animal === ANTIGO_ID) mudancas[`flags.${SISTEMA_ID}.vinculo.animal`] = NOVO_ID;
    if (f.vinculoId === ANTIGO_ID) mudancas[`flags.${SISTEMA_ID}.vinculoId`] = NOVO_ID;
    if (f.id === ANTIGO_ID) mudancas[`flags.${SISTEMA_ID}.id`] = NOVO_ID;
    if (/teixugo/i.test(actor.name)) {
      mudancas.name = trocaNome(actor.name);
      mudancas["prototypeToken.name"] = trocaNome(actor.prototypeToken?.name ?? actor.name);
    }
    const itens = actor.items.filter(i => /teixugo/i.test(i.name)).map(i => ({ _id: i.id, name: trocaNome(i.name) }));
    if (Object.keys(mudancas).length) await actor.update(mudancas);
    if (itens.length) await actor.updateEmbeddedDocuments("Item", itens);
    // Tokens já na cena com o nome antigo
    for (const t of actor.getActiveTokens?.() ?? []) if (/teixugo/i.test(t.document.name)) await t.document.update({ name: trocaNome(t.document.name) });
    if (Object.keys(mudancas).length || itens.length) atores++;
  }
  // Compêndio Vínculos populado pelo plano B: some o documento antigo (o novo vem do build)
  const pack = game.packs.get(`${SISTEMA_ID}.vinculos`);
  if (pack) {
    const indice = await pack.getIndex({ fields: [`flags.${SISTEMA_ID}.id`] });
    const antigo = indice.find(e => foundry.utils.getProperty(e, `flags.${SISTEMA_ID}.id`) === ANTIGO_ID || /teixugo/i.test(e.name));
    if (antigo) {
      const travado = pack.locked;
      if (travado) await pack.configure({ locked: false });
      await (await pack.getDocument(antigo._id))?.delete();
      if (travado) await pack.configure({ locked: true });
    }
  }
  return atores;
}

/**
 * 0.9.0 — animais do Vínculo já criados passam a abrir na ficha de bloco de estatísticas
 * (flags.core.sheetClass) e ganham a flag vinculoId. Quem já escolheu outra ficha à mão fica como está.
 * @returns {Promise<number>} atores alterados
 */
export async function migrarFichaDosAnimais() {
  let atores = 0;
  for (const actor of game.actors ?? []) {
    const f = actor.flags?.[SISTEMA_ID] ?? {};
    const id = f.vinculoId ?? f.vinculo?.animal;
    if (!id) continue;
    const mudancas = {};
    if (!f.vinculoId) mudancas[`flags.${SISTEMA_ID}.vinculoId`] = id;
    if (!actor.flags?.core?.sheetClass) mudancas["flags.core.sheetClass"] = FICHA_ANIMAL;
    if (!Object.keys(mudancas).length) continue;
    await actor.update(mudancas);
    atores++;
  }
  return atores;
}

/**
 * Itens comuns que ainda estão com o ícone padrão (dado azul) recebem o ícone próprio
 * (img/Icones/itens/itens de origem). Ícone escolhido pelo jogador fica como está. Atores e itens
 * soltos no mundo. @param {Iterable} atores  @param {Iterable} [itensDoMundo]
 * @returns {Promise<number>} itens atualizados
 */
export async function atualizarIconesDeItensComuns(atores = game.actors, itensDoMundo = game.items ?? []) {
  const novoIcone = item => {
    if (item.type !== "equipamento" || item.system?.tipo !== "item-comum" || item.img !== ICONE_PADRAO) return null;
    return iconeDoItemComum(item.flags?.[SISTEMA_ID]?.id);
  };
  let n = 0;
  for (const actor of atores) {
    const mudancas = actor.items.map(i => ({ _id: i.id, img: novoIcone(i) })).filter(m => m.img);
    if (mudancas.length) { await actor.updateEmbeddedDocuments("Item", mudancas); n += mudancas.length; }
  }
  for (const item of itensDoMundo) {
    const img = novoIcone(item);
    if (img) { await item.update({ img }); n++; }
  }
  return n;
}

/** Barras do token: bar1 = PV e bar2 = PM (atributos rastreáveis do personagem). */
export const BARRAS_DO_TOKEN = { "prototypeToken.bar1.attribute": "pv", "prototypeToken.bar2.attribute": "pm" };

/**
 * Atores personagem com o prototypeToken sem bar1 = PV e bar2 = PM passam a ter. Idempotente:
 * quem já tem não é tocado. @returns {Promise<number>} atores alterados
 */
export async function configurarBarrasDosTokens(atores = game.actors) {
  let n = 0;
  for (const actor of atores) {
    if (actor.type !== "personagem") continue;
    const mudancas = Object.fromEntries(Object.entries(BARRAS_DO_TOKEN).filter(([k, v]) => foundry.utils.getProperty(actor, k) !== v));
    if (!Object.keys(mudancas).length) continue;
    await actor.update(mudancas);
    n++;
  }
  return n;
}

/** Migrações por versão: registradas para rodar uma vez (configuração de mundo "migracao"). */
/**
 * 0.33.0 — estoque do Mercador sem "∞": quantidade null vira 1 (atores do mundo e mercadores não
 * ligados nos tokens das cenas). @param {Iterable<Actor>} [atores]  @returns {Promise<number>} itens alterados
 */
export async function migrarEstoqueInfinito(atores = null) {
  const lista = atores ?? [...(game.actors ?? []), ...(game.scenes ?? []).flatMap(s => [...s.tokens].filter(t => !t.actorLink && t.actor).map(t => t.actor))];
  let n = 0;
  for (const actor of lista) {
    if (actor?.type !== "mercador") continue;
    const mudancas = actor.items.filter(i => migrarQuantidadeDoEstoque(i.flags?.[SISTEMA_ID]?.loja) !== null)
      .map(i => ({ _id: i.id, [`flags.${SISTEMA_ID}.loja.quantidade`]: 1 }));
    if (mudancas.length) { await actor.updateEmbeddedDocuments("Item", mudancas); n += mudancas.length; }
  }
  return n;
}

/**
 * 0.35.0 — mercador com as regras do personagem. A conversão do system (atributos, perícias por
 * chave, "Defesa manual" com o valor antigo) já acontece em MercadorData.migrateData; aqui ela é
 * gravada no banco (o update normal só gravaria diferenças) e as habilidades livres viram itens
 * "poder". Idempotente: sem habilidades e já no formato novo, nada muda.
 * @param {Iterable<Actor>} [atores]  @returns {Promise<number>} mercadores alterados
 */
export async function migrarMercadoresParaPersonagem(atores = null) {
  const lista = atores ?? [...(game.actors ?? []), ...(game.scenes ?? []).flatMap(s => [...s.tokens].filter(t => !t.actorLink && t.actor).map(t => t.actor))];
  let n = 0;
  for (const actor of lista) {
    if (actor?.type !== "mercador") continue;
    const sistema = actor.toObject().system;
    const poderes = poderesDasHabilidades(sistema.habilidades);
    if (poderes.length) await actor.createEmbeddedDocuments("Item", poderes);
    sistema.habilidades = [];
    await actor.update({ system: sistema }, { diff: false, recursive: false });
    n++;
  }
  return n;
}

const MIGRACOES = [
  { versao: "0.9.0", rodar: async () => (await migrarTexugo()) + (await migrarFichaDosAnimais()) },
  // 0.10.1 — a origem dá +2 de bônus na perícia (não treina): com confirmação; recusar não repete
  // (o Mestre roda depois com game.icarus.migrarBonusDeOrigem())
  { versao: "0.10.1", rodar: async () => Number(await migrarBonusDeOrigem()) || 0 },
  // 0.10.2 — todas as origens dão 2 itens fixos: Circense e Membro de Guilda recebem (com confirmação)
  // o item que faltou; recusar não repete (game.icarus.adicionarItensDeOrigem())
  { versao: "0.10.2", rodar: async () => Number(await adicionarItensQueFaltam()) || 0 },
  // 0.11.1 — ícones dos itens comuns (itens de origem) no lugar do dado azul
  { versao: "0.11.1", rodar: () => atualizarIconesDeItensComuns() },
  // 0.13.0 — barras do token: bar1 = PV, bar2 = PM
  { versao: "0.13.0", rodar: () => configurarBarrasDosTokens() },
  // 0.25.0 — regra nova do PM dos conjuradores (Arcanista, Bardo) e ícones dos focos arcanos
  { versao: "0.25.0", rodar: async () => (await migrarPMDosConjuradores()) + (await atualizarIconesDosFocos()) },
  // 0.27.2 — custo 0 nas habilidades que recuperam PM (Embalo de Batalha, Meditação de Combate,
  // Fúria Sanguinária, Mana Transbordante, Dívida Paga)
  { versao: "0.27.2", rodar: () => corrigirCustosDeGanho() },
  // 0.33.0 — estoque do Mercador sem "∞" (quantidade null vira 1)
  { versao: "0.33.0", rodar: () => migrarEstoqueInfinito() },
  // 0.35.0 — mercador com as regras do personagem (perícias, poderes, Defesa derivada)
  { versao: "0.35.0", rodar: () => migrarMercadoresParaPersonagem() }
];

export function registrarMigracoes() {
  game.settings.register(SISTEMA_ID, "migracao", { scope: "world", config: false, type: String, default: "0.0.0" });
  Hooks.once("ready", async () => {
    if (!game.user.isGM || (game.users.activeGM && !game.users.activeGM.isSelf)) return;
    const feita = game.settings.get(SISTEMA_ID, "migracao");
    const maior = (a, b) => a.localeCompare(b, undefined, { numeric: true }) > 0;
    for (const m of MIGRACOES) {
      if (!maior(m.versao, feita)) continue;
      const n = await m.rodar();
      console.log(`Icarus RPG | Migração ${m.versao}: ${n} alteração(ões).`);
      if (n) ui.notifications.info(game.i18n.format("ICARUS.Migracao.Feita", { versao: m.versao, n }));
      await game.settings.set(SISTEMA_ID, "migracao", m.versao);
    }
  });
}
