/**
 * Migrações de dados do mundo (rodam uma vez por versão, no início, só no Mestre ativo; são
 * idempotentes: rodar de novo não muda nada).
 *
 * 0.9.0 — o animal do Vínculo Selvagem "Teixugo Gigante" passou a se chamar "Texugo Gigante"
 * (id texugo-gigante): flags de vínculo dos patrulheiros, atores do animal já invocados, itens de
 * escolha ("Vínculo Selvagem (Teixugo Gigante)") e o documento antigo do compêndio Vínculos.
 */
import { SISTEMA_ID, FICHA_ANIMAL } from "./config.mjs";
import { migrarBonusDeOrigem, adicionarItensQueFaltam } from "./origens.mjs";

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

/** Migrações por versão: registradas para rodar uma vez (configuração de mundo "migracao"). */
const MIGRACOES = [
  { versao: "0.9.0", rodar: async () => (await migrarTexugo()) + (await migrarFichaDosAnimais()) },
  // 0.10.1 — a origem dá +2 de bônus na perícia (não treina): com confirmação; recusar não repete
  // (o Mestre roda depois com game.icarus.migrarBonusDeOrigem())
  { versao: "0.10.1", rodar: async () => Number(await migrarBonusDeOrigem()) || 0 },
  // 0.10.2 — todas as origens dão 2 itens fixos: Circense e Membro de Guilda recebem (com confirmação)
  // o item que faltou; recusar não repete (game.icarus.adicionarItensDeOrigem())
  { versao: "0.10.2", rodar: async () => Number(await adicionarItensQueFaltam()) || 0 }
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
      console.log(`Icarus RPG | Migração ${m.versao}: ${n} ator(es) alterado(s).`);
      if (n) ui.notifications.info(game.i18n.format("ICARUS.Migracao.Feita", { versao: m.versao, n }));
      await game.settings.set(SISTEMA_ID, "migracao", m.versao);
    }
  });
}
