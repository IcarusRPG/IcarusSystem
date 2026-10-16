/**
 * PV em 0, testes de morte e lembretes de início de turno.
 * - PV chega a 0: aplica Morrendo (que inclui Inconsciente → Indefeso → Desprevenido).
 *   Curar para 1+ PV remove Morrendo (e o que veio dele) e zera os testes.
 * - Teste de morte: botão na ficha e no lembrete de turno (module/morte.mjs tem a tabela).
 * - Lembretes (PROVISÓRIO, sem automação): no início do turno de quem está Em Chamas, Sangrando,
 *   Confuso ou Morrendo, o Mestre recebe um card com botões. Nada é aplicado sozinho.
 */
import { SISTEMA_ID } from "./config.mjs";
import { resultadoTesteMorte, danoEmMorrendo } from "./morte.mjs";
import { aplicarCondicao, removerCondicao } from "./condicoes-foundry.mjs";
import { rolarDanoAvulso } from "./dano.mjs";
import { CONDICAO_POR_ID } from "./condicoes.mjs";

const loc = k => game.i18n.localize(k);
const T = `systems/${SISTEMA_ID}/templates/chat`;

async function card(actor, dados, flags = {}) {
  const content = await renderTemplate(`${T}/lembrete.hbs`, dados);
  return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content, flags: { [SISTEMA_ID]: flags } });
}

/** Marca o ator como morto (status "morto" do Foundry) e avisa o Mestre. */
async function marcarMorto(actor) {
  if (!actor.statuses.has("dead")) await actor.toggleStatusEffect("dead", { active: true, overlay: true });
  await ChatMessage.create({
    content: game.i18n.format("ICARUS.Morte.Morreu", { nome: actor.name }),
    whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id)
  });
}

/** Estável: continua inconsciente, mas sai de Morrendo. */
async function estabilizar(actor) {
  // O Inconsciente que veio de Morrendo passa a ser independente (não some junto)
  for (const e of actor.effects.filter(x => x.flags?.[SISTEMA_ID]?.origem === "morrendo")) await e.setFlag(SISTEMA_ID, "origem", null);
  await actor.update({ "system.morte.estavel": true });
  await removerCondicao(actor, "morrendo");
}

/** Rola o teste de morte e aplica o resultado. */
export async function rolarTesteDeMorte(actor) {
  const roll = await new Roll("1d20").evaluate();
  const d20 = roll.total;
  const r = resultadoTesteMorte(d20, actor.system.morte);
  await actor.update({ "system.morte.sucessos": r.sucessos, "system.morte.falhas": r.falhas });
  const content = await renderTemplate(`${T}/lembrete.hbs`, {
    titulo: game.i18n.format("ICARUS.Morte.TesteDe", { nome: actor.name }),
    texto: `${loc(`ICARUS.Morte.Resultado.${r.resultado}`)} · ${game.i18n.format("ICARUS.Morte.Contagem", { s: r.sucessos, f: r.falhas })}`,
    d20, critico: d20 === 20, falha: d20 === 1
  });
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content, rolls: [roll], sound: CONFIG.sounds.dice });
  if (r.reanima) await actor.update({ "system.pv.value": 1 });
  else if (r.morto) await marcarMorto(actor);
  else if (r.estavel) await estabilizar(actor);
  return r;
}

/** Dano sofrido com 0 PV: 1 falha (2 se crítico). */
export async function registrarDanoEmMorrendo(actor, critico = false) {
  const r = danoEmMorrendo(actor.system.morte, critico);
  await actor.update({ "system.morte.falhas": r.falhas, "system.morte.estavel": false });
  if (r.morto) await marcarMorto(actor);
}

/**
 * Estabilizar com Cura (CD 10, ação padrão). Se o usuário tiver um personagem próprio diferente
 * do que está morrendo, rola a Cura dele; senão, o Mestre/dono estabiliza direto.
 */
export async function estabilizarComCura(actor) {
  const curador = game.user.character && game.user.character.id !== actor.id ? game.user.character : null;
  if (curador) {
    const total = curador.system.pericias.cura.total;
    const roll = await new Roll(`1d20 ${total < 0 ? "-" : "+"} ${Math.abs(total)}`).evaluate();
    const ok = roll.total >= 10;
    await card(curador, { titulo: game.i18n.format("ICARUS.Morte.CuraEm", { curador: curador.name, nome: actor.name }), texto: loc(ok ? "ICARUS.Morte.Estabilizou" : "ICARUS.Morte.NaoEstabilizou"), total: roll.total });
    if (!ok) return;
  }
  await estabilizar(actor);
}

/* ------------------------------ Lembretes de turno ------------------------------ */

async function lembretesDoTurno(actor) {
  const s = actor.statuses;
  const botoes = [];
  const linhas = [];
  if (s.has("em-chamas")) { linhas.push(loc("ICARUS.Lembrete.EmChamas")); botoes.push({ acao: "fogo", rotulo: loc("ICARUS.Lembrete.RolarFogo") }); }
  if (s.has("sangrando")) { linhas.push(loc("ICARUS.Lembrete.Sangrando")); botoes.push({ acao: "sangrando", rotulo: loc("ICARUS.Lembrete.RolarConstituicao") }); }
  if (s.has("confuso")) { linhas.push(loc("ICARUS.Lembrete.Confuso")); botoes.push({ acao: "confuso", rotulo: loc("ICARUS.Lembrete.RolarConfuso") }); }
  if (s.has("morrendo")) { linhas.push(loc("ICARUS.Lembrete.Morrendo")); botoes.push({ acao: "morte", rotulo: loc("ICARUS.Morte.Rolar") }); }
  if (!botoes.length) return;
  await card(actor, { titulo: game.i18n.format("ICARUS.Lembrete.Titulo", { nome: actor.name }), linhas, botoes, provisorio: true }, { lembrete: { actorUuid: actor.uuid } });
}

async function aoClicarLembrete(actor, acao) {
  if (acao === "fogo") return rolarDanoAvulso({ formula: "1d6", tipo: "fogo", titulo: game.i18n.format("ICARUS.Lembrete.FogoEm", { nome: actor.name }), img: "icons/svg/fire.svg", actor, alvoUuid: actor.uuid });
  if (acao === "morte") return rolarTesteDeMorte(actor);
  if (acao === "confuso") {
    const roll = await new Roll("1d6").evaluate();
    const tabela = CONDICAO_POR_ID.confuso.turno.tabela;
    const linha = Object.entries(tabela).find(([faixa]) => {
      const [a, b] = faixa.split("-").map(Number);
      return roll.total >= a && roll.total <= (b ?? a);
    })?.[1] ?? "";
    return card(actor, { titulo: game.i18n.format("ICARUS.Lembrete.ConfusoEm", { nome: actor.name }), texto: linha, total: roll.total });
  }
  if (acao === "sangrando") {
    const con = actor.system.atributos.CON.total;
    const roll = await new Roll(`1d20 ${con < 0 ? "-" : "+"} ${Math.abs(con)}`).evaluate();
    const ok = roll.total >= CONDICAO_POR_ID.sangrando.turno.cd;
    await card(actor, {
      titulo: game.i18n.format("ICARUS.Lembrete.SangrandoEm", { nome: actor.name }),
      texto: loc(ok ? "ICARUS.Lembrete.SangrandoParou" : "ICARUS.Lembrete.SangrandoContinua"),
      total: roll.total
    });
    if (ok) return removerCondicao(actor, "sangrando");
    // Falha: perde 1d6 PV (perda de PV ignora resistências); o Mestre aplica pelo botão
    return rolarDanoAvulso({ formula: CONDICAO_POR_ID.sangrando.turno.falha.perdaPV, titulo: game.i18n.format("ICARUS.Lembrete.PerdaEm", { nome: actor.name }), img: "icons/svg/blood.svg", actor, perda: true, alvoUuid: actor.uuid });
  }
}

export function registrarMorte() {
  // PV em 0 → Morrendo; PV ≥ 1 → sai de Morrendo (só o cliente que fez a mudança reage)
  Hooks.on("updateActor", async (actor, mudancas, opcoes, userId) => {
    if (userId !== game.user.id || actor.type !== "personagem") return;
    if (foundry.utils.getProperty(mudancas, "system.pv.value") === undefined) return;
    const pv = actor.system.pv.value;
    const morrendo = actor.statuses.has("morrendo");
    if (pv <= 0 && !morrendo && !actor.statuses.has("dead") && !actor.system.morte.estavel) {
      await actor.update({ "system.morte": { sucessos: 0, falhas: 0, estavel: false } });
      await aplicarCondicao(actor, "morrendo");
    } else if (pv >= 1 && (morrendo || actor.system.morte.estavel)) {
      await actor.update({ "system.morte": { sucessos: 0, falhas: 0, estavel: false } });
      if (morrendo) await removerCondicao(actor, "morrendo");
    }
  });

  // Início do turno: lembretes para o Mestre
  Hooks.on("updateCombat", (combate, mudancas) => {
    if (!game.user.isGM || !("turn" in mudancas || "round" in mudancas)) return;
    const actor = combate.combatant?.actor;
    if (actor) lembretesDoTurno(actor);
  });

  // Botões dos lembretes
  Hooks.on("renderChatMessage", (message, html) => {
    const dados = message.flags?.[SISTEMA_ID]?.lembrete;
    if (!dados) return;
    const raiz = html instanceof HTMLElement ? html : html[0];
    const actor = fromUuidSync(dados.actorUuid);
    raiz.querySelectorAll("[data-icarus-lembrete]").forEach(botao => {
      if (!(game.user.isGM || actor?.isOwner)) { botao.remove(); return; }
      botao.addEventListener("click", ev => {
        ev.preventDefault();
        botao.disabled = true;
        const ator = fromUuidSync(dados.actorUuid);
        if (ator) aoClicarLembrete(ator, botao.dataset.icarusLembrete);
      });
    });
  });
}
