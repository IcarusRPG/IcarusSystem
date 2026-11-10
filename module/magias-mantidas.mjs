/**
 * Magias mantidas (regra nova: sustentada × concentração são tipos separados).
 * - Ao lançar uma magia sustentada ou de concentração, ela entra em flags.magiasMantidas
 *   [{ id, itemId, nome, nivel, tipo, duradoura }].
 * - Sustentada: 1 PM no início de cada turno do conjurador; sem PM, termina. Sem teste de
 *   Concentração. Magia Duradoura (Arcanista): +2 PM ao lançar e ela não paga mais por turno.
 * - Concentração: sem PM por turno. Ao sofrer dano, cartão com "Teste de Concentração CD N"
 *   (CD = 10 + nível da magia + 2); falhou, termina. Só uma por vez (duas com Mente Dividida; se
 *   perder uma, perde as duas). Termina com Atordoado, Inconsciente, Paralisado, Pasmo ou Indefeso.
 * - Todas terminam em "Encerrar cena"; o jogador encerra quando quiser na aba Magias.
 */
import { SISTEMA_ID } from "./config.mjs";
import { tipoDeManutencao, cdDeConcentracao, adicionarMantida, debitoDoTurno, perderConcentracao, CONDICOES_QUE_QUEBRAM_CONCENTRACAO } from "./magias-dados.mjs";
import { temHabilidadeNosItens } from "./classes-dados.mjs";
import { INICIO_DO_TURNO } from "./acoes.mjs";
import { FIM_DA_CENA } from "./condicoes-foundry.mjs";
import { rolarD20 } from "./combate.mjs";
import { AO_SOFRER_DANO } from "./dano.mjs";

const F = SISTEMA_ID;
const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);
const esc = t => Handlebars.escapeExpression(t ?? "");

/** Magias mantidas do ator. */
export const mantidasDoAtor = actor => actor?.getFlag?.(F, "magiasMantidas") ?? [];
const menteDividida = actor => temHabilidadeNosItens([...(actor.items ?? [])], "arcanista", "mente-dividida");
const donos = actor => game.users.filter(u => actor.testUserPermission(u, "OWNER")).map(u => u.id);

function avisar(actor, texto) {
  return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="icarus-rolagem icarus-lembrete"><p class="condicao-descricao">${esc(texto)}</p></div>` });
}

/** Avisa as magias que terminaram. */
const avisarEncerradas = (actor, encerradas, chave) => (encerradas.length
  ? avisar(actor, fmt(chave, { nome: actor.name, magias: encerradas.map(m => m.nome).join(", ") })) : null);

/**
 * Depois de lançar: se a magia é sustentada ou de concentração, entra na lista (Magia Duradoura
 * perguntada aqui, com +2 PM). Concentração acima do limite: a mais antiga termina.
 */
export async function registrarMantida(actor, item) {
  const tipo = tipoDeManutencao(item.system);
  if (!tipo) return null;
  let duradoura = false;
  if (tipo === "sustentada" && temHabilidadeNosItens([...actor.items], "arcanista", "magia-duradoura") && actor.system.pm.value >= 2) {
    duradoura = await foundry.applications.api.DialogV2.confirm({ window: { title: loc("ICARUS.Mantidas.Duradoura") },
      content: `<div class="icarus-uso"><p>${esc(fmt("ICARUS.Mantidas.DuradouraTexto", { magia: item.name }))}</p></div>`, rejectClose: false });
    if (duradoura) await actor.update({ "system.pm.value": actor.system.pm.value - 2 });
  }
  const nova = { id: item.flags?.[F]?.id ?? item.id, itemId: item.id, nome: item.name, nivel: Number(item.system.nivel) || 1, tipo, duradoura: !!duradoura };
  const r = adicionarMantida(mantidasDoAtor(actor), nova, { menteDividida: menteDividida(actor) });
  await actor.setFlag(F, "magiasMantidas", r.lista);
  await avisarEncerradas(actor, r.encerradas, "ICARUS.Mantidas.LimiteConcentracao");
  return nova;
}

/** Encerra uma magia mantida (botão da aba Magias). */
export async function encerrarMantida(actor, id) {
  const lista = mantidasDoAtor(actor);
  const sai = lista.filter(m => m.id === id);
  if (!sai.length) return;
  await actor.setFlag(F, "magiasMantidas", lista.filter(m => m.id !== id));
  return avisarEncerradas(actor, sai, "ICARUS.Mantidas.Encerrou");
}

/** Termina todas as de concentração (condições que quebram a concentração). */
async function quebrarConcentracao(actor, condicao) {
  const lista = mantidasDoAtor(actor);
  const sai = lista.filter(m => m.tipo === "concentracao");
  if (!sai.length) return;
  await actor.setFlag(F, "magiasMantidas", lista.filter(m => m.tipo !== "concentracao"));
  return avisar(actor, fmt("ICARUS.Mantidas.Quebrou", { nome: actor.name, condicao, magias: sai.map(m => m.nome).join(", ") }));
}

// Início do turno: 1 PM por sustentada (sem PM, ela termina)
INICIO_DO_TURNO.push(async actor => {
  const lista = mantidasDoAtor(actor);
  if (!lista.some(m => m.tipo === "sustentada" && !m.duradoura)) return;
  const r = debitoDoTurno(lista, actor.system.pm.value);
  await actor.update({ "system.pm.value": actor.system.pm.value - r.custo, [`flags.${F}.magiasMantidas`]: r.mantidas });
  if (r.custo) await avisar(actor, fmt("ICARUS.Mantidas.Debito", { nome: actor.name, pm: r.custo,
    magias: r.mantidas.filter(m => m.tipo === "sustentada" && !m.duradoura).map(m => m.nome).join(", ") }));
  await avisarEncerradas(actor, r.encerradas, "ICARUS.Mantidas.SemPM");
});

// Encerrar cena: todas as mantidas terminam
FIM_DA_CENA.push(async actor => {
  if (mantidasDoAtor(actor).length) await actor.unsetFlag(F, "magiasMantidas");
});

// Sofreu dano (aplicado pelo chat, por quem aplicou: jogador ou Mestre): cartão do teste
AO_SOFRER_DANO.push(async (actor, dano) => {
  if (mantidasDoAtor(actor).some(m => m.tipo === "concentracao")) await cartaoDeConcentracao(actor, dano);
});

/** Cartão com os botões "Teste de Concentração CD N" (um por magia de concentração). */
async function cartaoDeConcentracao(actor, dano) {
  const conc = mantidasDoAtor(actor).filter(m => m.tipo === "concentracao");
  if (!conc.length) return;
  const botoes = conc.map(m => `<button type="button" class="btn" data-icarus-concentracao="${esc(m.id)}">${esc(fmt("ICARUS.Mantidas.Botao", { magia: m.nome, cd: cdDeConcentracao(m.nivel) }))}</button>`).join("");
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }), whisper: donos(actor),
    content: `<div class="icarus-rolagem icarus-lembrete"><p class="condicao-descricao">${esc(fmt("ICARUS.Mantidas.SofreuDano", { nome: actor.name, dano }))}</p>${botoes}</div>`,
    flags: { [F]: { concentracao: { actorUuid: actor.uuid, usados: [] } } }
  });
}

/** Rola o Teste de Concentração de uma magia; falhou, ela termina (Mente Dividida: todas). */
export async function testeDeConcentracao(actor, id) {
  const magia = mantidasDoAtor(actor).find(m => m.id === id && m.tipo === "concentracao");
  if (!magia) return null;
  const cd = cdDeConcentracao(magia.nivel);
  const bonus = Math.trunc(Number(actor.system.pericias?.concentracao?.total) || 0);
  const r = await rolarD20({ bonus });
  const passou = r.total >= cd;
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), rolls: [r.roll],
    content: `<div class="icarus-rolagem icarus-lembrete"><p class="condicao-descricao">${esc(fmt(passou ? "ICARUS.Mantidas.Passou" : "ICARUS.Mantidas.Falhou", { nome: actor.name, magia: magia.nome, total: r.total, cd }))}</p></div>` });
  if (!passou) {
    const p = perderConcentracao(mantidasDoAtor(actor), id, { menteDividida: menteDividida(actor) });
    await actor.setFlag(F, "magiasMantidas", p.lista);
    if (p.encerradas.length > 1) await avisarEncerradas(actor, p.encerradas, "ICARUS.Mantidas.Encerrou");
  }
  return { passou, total: r.total, cd };
}

function aoRenderizar(mensagem, html) {
  const dados = mensagem.flags?.[F]?.concentracao;
  if (!dados) return;
  const raiz = html instanceof HTMLElement ? html : html?.[0];
  const actor = fromUuidSync(dados.actorUuid);
  for (const botao of raiz?.querySelectorAll("[data-icarus-concentracao]") ?? []) {
    const id = botao.dataset.icarusConcentracao;
    botao.disabled = (dados.usados ?? []).includes(id) || !actor?.isOwner || !mantidasDoAtor(actor).some(m => m.id === id);
    botao.addEventListener("click", async () => {
      botao.disabled = true;
      await testeDeConcentracao(actor, id);
      if (mensagem.isOwner) await mensagem.setFlag(F, "concentracao", { ...dados, usados: [...(dados.usados ?? []), id] });
    });
  }
}

export function registrarMagiasMantidas() {
  if ((game.release?.generation ?? 12) >= 13) Hooks.on("renderChatMessageHTML", aoRenderizar);
  else Hooks.on("renderChatMessage", aoRenderizar);
  // Condições que quebram a concentração
  Hooks.on("createActiveEffect", (efeito, opcoes, userId) => {
    const actor = efeito.parent;
    if (userId !== game.user.id || !(actor instanceof Actor)) return;
    const c = CONDICOES_QUE_QUEBRAM_CONCENTRACAO.find(id => efeito.statuses?.has(id));
    if (c) quebrarConcentracao(actor, efeito.name ?? c);
  });
}
