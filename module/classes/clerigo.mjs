/**
 * Clérigo:
 * - Fé Jurada (1º, permanente): escolhe 1 das 20 divindades (tela "divindade" em escolhas.mjs).
 *   Grava a devoção da ficha (system.identidade.divindade) e concede os 3 Poderes Concedidos dela
 *   (o Clérigo recebe todos). O jogador não troca depois; o Mestre pode.
 * - Violação de Dogma (botão do Mestre): 1ª vez zera o PM e bloqueia a recuperação por 1d4 dias
 *   (flags.dogma { violacoes, bloqueioPMDias }; contador manual "Passou 1 dia"); 2ª vez a divindade
 *   abandona o clérigo: sai a devoção e os Poderes Concedidos, flags.anatema = true (a classe fica).
 * - Conjuração Divina (1º): lista Divina, CD de Sabedoria, magia até o 5º nível (17º). Magias
 *   conhecidas n + 2 (+2 por Teologia); o jogador é impedido de passar disso, o Mestre só é avisado.
 * - Onda de Fé: até SAB + 2 PM; Nd6 de cura nos vivos e Nd6 de Essência nos mortos-vivos (Vontade,
 *   metade); Onda Ampla (+2 PM) leva ao alcance médio.
 * - Solo Sagrado (5º): 4 PM, flags.soloSagrado até o fim da cena (só um), aviso no chat.
 * - Intervenção Divina (10º): 5 PM, pedido em texto, 1d100 ≤ nível (20º: sempre). Sucesso bloqueia
 *   por 7 dias (flags.intervencaoDias); falha espera uma noite de descanso (flags.intervencaoFalhou).
 * - Milagre (20º): 15 PM, 3 magias Divinas (mesmo não conhecidas) lançadas sem o custo base; depois
 *   Atordoado por 1d4 rodadas (mesmo se imune).
 * - Palavra de Resguardo: 1d8 + SAB guardados no aliado (flags.resguardo) e tirados do próximo dano.
 * - Última Graça (1/cena): o aliado marcado a 0 PV fica com 1 PV. Fé como Escudo (1/cena): +5 no chat.
 * - Arma Consagrada: até o fim da cena, a arma empunhada (flags.armaConsagrada = id) ganha no diálogo
 *   de ataque a opção (marcada) "Arma Consagrada": Sabedoria no ataque e no dano e +1 passo de dano.
 */
import { SISTEMA_ID } from "../config.mjs";
import { temHabilidadeNosItens } from "../classes-dados.mjs";
import { classeDoAtor, ACOES_DE_MECANICA } from "../classes.mjs";
import { GANCHOS_DE_PODER } from "../acoes.mjs";
import { APOS_ESCOLHA } from "../escolhas.mjs";
import { FIM_DA_CENA, aplicarCondicao } from "../condicoes-foundry.mjs";
import { registrarLinhas, itemDeClasse, avisarNoChat, USO_PROPRIO } from "./comum.mjs";
import { calcularCD, calcularAtaque } from "../combate.mjs";
import { PROVEDORES_ATAQUE, MODIFICADORES_ATAQUE, itensDoAtor } from "../combate-chat.mjs";
import { armasEmpunhadas } from "../regras-ataque.mjs";
import { rolarDanoAvulso, rolarCura, ABSORVEDORES_DE_DANO } from "../dano.mjs";
import { motivoParaNaoAprender } from "../magias-dados.mjs";
import { executarLancamento } from "../magias.mjs";
import { divindadePorId, poderesDaDivindade, itemDoPoderConcedido } from "../panteao.mjs";
import { concedidosDoDruida } from "../druida-dados.mjs";
import { limiteDeMagiasDoClerigo, maximoDaOnda, planoDaOnda, intervencaoAtende, motivoSemIntervencao, violarDogma, passarUmDia, motivoDoMilagre } from "../clerigo-dados.mjs";

const F = SISTEMA_ID;
const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);
const esc = t => Handlebars.escapeExpression(t ?? "");
const { DialogV2 } = foundry.applications.api;

export const ehClerigo = actor => classeDoAtor(actor)?.id === "clerigo";
const tem = (actor, id) => temHabilidadeNosItens([...actor.items], "clerigo", id);
const sabedoria = actor => Math.trunc(Number(actor.system.atributos?.SAB?.total) || 0);
const cdDoClerigo = actor => calcularCD(actor.system, "SAB").cd;
const alvoMarcado = () => [...(game.user.targets ?? [])][0] ?? null;

for (const id of ["onda-de-fe", "intervencao-divina", "milagre"]) USO_PROPRIO.add(`clerigo__${id}`);

/** Gasta PM (o custo já foi confirmado); false se faltar. */
async function gastarPM(actor, pm) {
  if (pm > actor.system.pm.value) { ui.notifications.warn(fmt("ICARUS.Poderes.SemPM", { nome: actor.name, pm, atual: actor.system.pm.value })); return false; }
  if (pm) await actor.update({ "system.pm.value": actor.system.pm.value - pm });
  return true;
}

/* ---------------- Fé Jurada ---------------- */

/** Concedidos de uma divindade (ou de todas, sem id) que o ator tem. */
const concedidosDe = (actor, divindadeId = null) => actor.items.filter(i => i.flags?.[F]?.concedido && (!divindadeId || i.flags[F].divindade === divindadeId));

/** Diálogo do Paladino: escolhe exatamente "quantos" dos Poderes Concedidos; null se cancelar. */
async function escolherConcedidos(actor, divindadeId, quantos) {
  const poderes = poderesDaDivindade(divindadeId);
  for (;;) {
    const r = await DialogV2.wait({
      window: { title: fmt("ICARUS.Paladino.ConcedidosTitulo", { divindade: divindadePorId(divindadeId)?.nome ?? "" }) },
      content: `<div class="icarus-uso"><p>${esc(fmt("ICARUS.Paladino.ConcedidosTexto", { n: quantos }))}</p>
        ${poderes.map(p => `<label class="chk"><input type="checkbox" name="poder" value="${p.id}"> <b>${esc(p.nome)}</b> <small>${esc(p.meta ?? "")}</small></label>`).join("")}</div>`,
      buttons: [
        { action: "ok", label: loc("ICARUS.Devocao.Confirmar"), default: true, callback: (ev, b) => [...b.form.querySelectorAll("input[name=poder]:checked")].map(i => i.value) },
        { action: "cancelar", label: loc("ICARUS.Escolhas.DecidirDepois") }
      ],
      rejectClose: false
    });
    if (!Array.isArray(r)) return null;
    if (r.length === quantos) return r;
    ui.notifications.warn(fmt("ICARUS.Comuns.EscolhaN", { n: quantos }));
  }
}

/**
 * Jura a divindade: devoção na ficha, sai o que era de outra divindade, entram os poderes dela
 * (Clérigo: os 3; Paladino: 2 à escolha). Sem escolher, a devoção fica e os poderes esperam o
 * botão "Escolher os Poderes Concedidos" (aba Classe).
 */
export async function jurarDivindade(actor, divindadeId, { quantos = null } = {}) {
  if (!divindadePorId(divindadeId)) return;
  const deOutra = concedidosDe(actor).filter(i => i.flags[F].divindade !== divindadeId);
  if (deOutra.length) await actor.deleteEmbeddedDocuments("Item", deOutra.map(i => i.id));
  await actor.update({ "system.identidade.divindade": divindadeId });
  const possuidos = new Set(concedidosDe(actor, divindadeId).map(i => i.flags[F].id));
  let ids = poderesDaDivindade(divindadeId).map(p => p.id);
  if (quantos !== null) {
    if (possuidos.size >= quantos) return;
    ids = (await escolherConcedidos(actor, divindadeId, quantos)) ?? [];
  }
  const novos = ids.filter(id => !possuidos.has(id)).map(id => itemDoPoderConcedido(id)).filter(Boolean);
  if (novos.length) await actor.createEmbeddedDocuments("Item", novos);
}

/**
 * Quantos Poderes Concedidos a fé da classe dá (null = todos): Clérigo todos; Paladino 2;
 * Druida (Fé Selvagem) todos de Floressa, 2 de outra divindade.
 */
export const concedidosDaClasse = (classeId, divindadeId = null) =>
  (classeId === "paladino" ? 2 : classeId === "druida" ? concedidosDoDruida(divindadeId) : null);

/** Habilidade da fé (escolha de divindade permanente) por classe. */
export const HABILIDADE_DA_FE = { clerigo: "fe-jurada", paladino: "fe-jurada", druida: "fe-selvagem" };

for (const hab of new Set(Object.values(HABILIDADE_DA_FE))) {
  APOS_ESCOLHA.set(hab, (actor, flags) => {
    const classe = classeDoAtor(actor)?.id;
    if (HABILIDADE_DA_FE[classe] !== hab) return null;
    return jurarDivindade(actor, flags?.divindade, { quantos: concedidosDaClasse(classe, flags?.divindade) });
  });
}

/** O jogador não troca a divindade jurada (Fé Jurada/Selvagem feita); o Mestre pode. */
export function divindadeTravada(actor) {
  const classe = classeDoAtor(actor)?.id;
  if (game.user?.isGM || !HABILIDADE_DA_FE[classe]) return false;
  return !!itemDeClasse(actor, classe, HABILIDADE_DA_FE[classe])?.flags?.[F]?.escolhaFeita;
}

/** Paladino e Druida: escolher os Poderes Concedidos depois (se fechou o diálogo). */
ACOES_DE_MECANICA.set("devocao:concedidos", actor => {
  const div = actor.system.identidade.divindade;
  return div ? jurarDivindade(actor, div, { quantos: concedidosDaClasse(classeDoAtor(actor)?.id, div) }) : null;
});
export { concedidosDe };

/* ---------------- Violação de Dogma ---------------- */

ACOES_DE_MECANICA.set("clerigo:dogma", async actor => {
  if (!game.user.isGM) return ui.notifications.warn(loc("ICARUS.Clerigo.SoMestre"));
  const atual = actor.getFlag(F, "dogma") ?? {};
  const segunda = (atual.violacoes ?? 0) >= 1;
  const ok = await DialogV2.confirm({ window: { title: loc("ICARUS.Clerigo.Dogma") },
    content: `<div class="icarus-uso"><p>${esc(fmt(segunda ? "ICARUS.Clerigo.DogmaSegunda" : "ICARUS.Clerigo.DogmaPrimeira", { nome: actor.name }))}</p></div>`, rejectClose: false });
  if (!ok) return;
  if (!segunda) {
    const roll = await new Roll("1d4").evaluate();
    const r = violarDogma(atual, roll.total);
    await actor.update({ "system.pm.value": 0, [`flags.${F}.dogma`]: { violacoes: r.violacoes, bloqueioPMDias: r.bloqueioPMDias } });
    return avisarNoChat(actor, fmt("ICARUS.Clerigo.DogmaPrimeiraChat", { nome: actor.name, dias: r.bloqueioPMDias }), { rolls: [roll] });
  }
  // 2ª vez: a divindade abandona o clérigo
  const div = actor.system.identidade.divindade;
  const nomeDiv = divindadePorId(div)?.nome ?? div ?? "";
  const poderes = concedidosDe(actor, div || null);
  if (poderes.length) await actor.deleteEmbeddedDocuments("Item", poderes.map(i => i.id));
  await actor.update({ "system.identidade.divindade": "", [`flags.${F}.dogma`]: { violacoes: 2, bloqueioPMDias: 0 }, [`flags.${F}.anatema`]: true });
  ui.notifications.error(fmt("ICARUS.Clerigo.AnatemaAviso", { nome: actor.name }), { permanent: true });
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="icarus-rolagem icarus-lembrete icarus-anatema"><h2>${esc(fmt("ICARUS.Clerigo.AnatemaTitulo", { nome: actor.name }))}</h2>
      <p class="condicao-descricao">${esc(fmt("ICARUS.Clerigo.AnatemaChat", { nome: actor.name, divindade: nomeDiv }))}</p></div>`
  });
});

/** Mestre: "Passou 1 dia" (bloqueio de PM do Dogma e espera da Intervenção). */
ACOES_DE_MECANICA.set("clerigo:dia", async actor => {
  if (!game.user.isGM) return null;
  const dogma = actor.getFlag(F, "dogma");
  const mudancas = {};
  if (dogma?.bloqueioPMDias) mudancas[`flags.${F}.dogma.bloqueioPMDias`] = passarUmDia(dogma.bloqueioPMDias);
  const dias = actor.getFlag(F, "intervencaoDias");
  if (dias) mudancas[`flags.${F}.intervencaoDias`] = passarUmDia(dias);
  // Paladino: a Hora Final (1 vez por dia) volta
  if (actor.getFlag(F, "horaFinalDia")) mudancas[`flags.${F}.-=horaFinalDia`] = null;
  // Druida: Mil Formas (1 vez por dia) volta
  if (actor.getFlag(F, "milFormasDia")) mudancas[`flags.${F}.-=milFormasDia`] = null;
  if (Object.keys(mudancas).length) await actor.update(mudancas);
});

/* ---------------- Conjuração Divina ---------------- */

/** Limite e quantas magias o Clérigo conhece. */
export function magiasDoClerigo(actor) {
  const teologias = actor.items.filter(i => i.flags?.[F]?.id === "clerigo__teologia" && i.flags?.[F]?.magiasExtras).length;
  return { conhecidas: actor.items.filter(i => i.type === "magia").length, limite: limiteDeMagiasDoClerigo(actor.system.nivel, teologias) };
}

/* ---------------- Onda de Fé ---------------- */

ACOES_DE_MECANICA.set("clerigo:onda", async actor => {
  const item = itemDeClasse(actor, "clerigo", "onda-de-fe");
  if (!item) return;
  const max = maximoDaOnda(sabedoria(actor));
  const ampla = tem(actor, "onda-ampla");
  const r = await DialogV2.wait({
    window: { title: item.name },
    content: `<div class="icarus-uso"><p>${esc(fmt("ICARUS.Clerigo.OndaTexto", { max, cd: cdDoClerigo(actor) }))}</p>
      <label class="linha">${esc(loc("ICARUS.Clerigo.OndaPM"))} <input type="number" name="pm" value="${max}" min="1" max="${max}" step="1" autofocus></label>
      <label class="linha">${esc(loc("ICARUS.Clerigo.OndaAlvos"))} <select name="alvos">
        <option value="ambos">${esc(loc("ICARUS.Clerigo.OndaAmbos"))}</option>
        <option value="vivos">${esc(loc("ICARUS.Clerigo.OndaVivos"))}</option>
        <option value="mortos">${esc(loc("ICARUS.Clerigo.OndaMortos"))}</option></select></label>
      ${ampla ? `<label class="chk"><input type="checkbox" name="ampla"> ${esc(loc("ICARUS.Clerigo.OndaAmpla"))}</label>` : ""}
      <p class="dica">${esc(fmt("ICARUS.Poderes.PMAtual", { pm: actor.system.pm.value, max: actor.system.pm.max }))}</p></div>`,
    buttons: [
      { action: "ok", label: loc("ICARUS.Poderes.Usar"), default: true,
        callback: (ev, b) => ({ pm: Number(b.form.elements.pm.value), alvos: b.form.elements.alvos.value, ampla: !!b.form.elements.ampla?.checked }) },
      { action: "cancelar", label: loc("ICARUS.Testes.Cancelar") }
    ],
    rejectClose: false
  });
  if (!r || typeof r !== "object") return;
  const plano = planoDaOnda(r.pm, sabedoria(actor), { ampla: r.ampla });
  if (!(await gastarPM(actor, plano.custo))) return;
  const cd = cdDoClerigo(actor);
  await avisarNoChat(actor, fmt("ICARUS.Clerigo.OndaChat", { nome: actor.name, pm: plano.custo, dados: plano.formula, alcance: loc(`ICARUS.Clerigo.Alcance.${plano.alcance}`), cd }));
  if (r.alvos !== "mortos") await rolarCura({ formula: plano.formula, titulo: item.name, img: item.img, actor });
  if (r.alvos !== "vivos") {
    await rolarDanoAvulso({ partes: [{ formula: plano.formula, tipo: "essencia" }], titulo: `${item.name} (${loc("ICARUS.Clerigo.OndaMortos")})`, img: item.img, actor,
      flags: { magia: { id: "onda-de-fe", cd, resistencia: { atributo: "vontade", efeito: "metade" } } } });
  }
});

/* ---------------- Solo Sagrado ---------------- */

GANCHOS_DE_PODER.set("clerigo__solo-sagrado", {
  antes: actor => {
    if (actor.getFlag(F, "soloSagrado")) { ui.notifications.warn(loc("ICARUS.Clerigo.SoloJaAtivo")); return false; }
  },
  depois: async actor => {
    await actor.setFlag(F, "soloSagrado", true);
    return avisarNoChat(actor, fmt("ICARUS.Clerigo.SoloChat", { nome: actor.name }));
  }
});
ACOES_DE_MECANICA.set("clerigo:solo-encerrar", actor => actor.unsetFlag(F, "soloSagrado"));

/* ---------------- Intervenção Divina ---------------- */

ACOES_DE_MECANICA.set("clerigo:intervencao", async actor => {
  const motivo = motivoSemIntervencao(actor.system.nivel, { dias: actor.getFlag(F, "intervencaoDias"), falhou: !!actor.getFlag(F, "intervencaoFalhou") });
  if (motivo) return ui.notifications.warn(fmt(motivo, { dias: actor.getFlag(F, "intervencaoDias") ?? 0 }));
  const auto = actor.system.nivel >= 20;
  const r = await DialogV2.wait({
    window: { title: loc("ICARUS.Clerigo.Intervencao") },
    content: `<div class="icarus-uso"><p>${esc(fmt(auto ? "ICARUS.Clerigo.IntervencaoTextoAuto" : "ICARUS.Clerigo.IntervencaoTexto", { nivel: actor.system.nivel }))}</p>
      <label class="linha">${esc(loc("ICARUS.Clerigo.Pedido"))}</label>
      <textarea name="pedido" rows="3" autofocus></textarea>
      <label class="linha">${esc(loc("ICARUS.Poderes.CustoPM"))} <input type="number" name="pm" value="5" min="0" step="1"></label></div>`,
    buttons: [
      { action: "ok", label: loc("ICARUS.Poderes.Usar"), default: true,
        callback: (ev, b) => ({ pedido: b.form.elements.pedido.value.trim(), pm: Math.max(0, Math.trunc(Number(b.form.elements.pm.value) || 0)) }) },
      { action: "cancelar", label: loc("ICARUS.Testes.Cancelar") }
    ],
    rejectClose: false
  });
  if (!r || typeof r !== "object") return;
  if (!(await gastarPM(actor, r.pm))) return;
  const roll = auto ? null : await new Roll("1d100").evaluate();
  const atende = intervencaoAtende(actor.system.nivel, roll?.total ?? null);
  await actor.update(atende ? { [`flags.${F}.intervencaoDias`]: 7, [`flags.${F}.intervencaoFalhou`]: false } : { [`flags.${F}.intervencaoFalhou`]: true });
  return avisarNoChat(actor, fmt(atende ? "ICARUS.Clerigo.IntervencaoSucesso" : "ICARUS.Clerigo.IntervencaoFalha", {
    nome: actor.name, pedido: r.pedido || "—", valor: roll?.total ?? "—", nivel: actor.system.nivel
  }), { rolls: roll ? [roll] : [] });
});
ACOES_DE_MECANICA.set("clerigo:descanso", actor => actor.unsetFlag(F, "intervencaoFalhou"));

/* ---------------- Milagre ---------------- */

/** Magias Divinas do compêndio (índice com nível e tradições). */
async function magiasDivinas() {
  const pack = game.packs.get(`${F}.magias`);
  if (!pack) return [];
  const indice = await pack.getIndex({ fields: ["system.nivel", "system.tradicoes"] });
  return [...indice].filter(e => (e.system?.tradicoes ?? []).includes("divina"))
    .map(e => ({ id: e._id, nome: e.name, nivel: e.system?.nivel ?? 1, tradicoes: e.system.tradicoes }))
    .sort((a, b) => a.nivel - b.nivel || a.nome.localeCompare(b.nome, "pt-BR"));
}

ACOES_DE_MECANICA.set("clerigo:milagre", async actor => {
  const item = itemDeClasse(actor, "clerigo", "milagre");
  if (!item) return;
  const lista = await magiasDivinas();
  if (!lista.length) return ui.notifications.warn(loc("ICARUS.Clerigo.SemCompendio"));
  const opcoes = lista.map(m => `<option value="${m.id}">${esc(`${m.nivel}º · ${m.nome}`)}</option>`).join("");
  const r = await DialogV2.wait({
    window: { title: item.name },
    content: `<div class="icarus-uso"><p>${esc(loc("ICARUS.Clerigo.MilagreTexto"))}</p>
      ${[1, 2, 3].map(n => `<label class="linha">${n}. <select name="m${n}"><option value=""></option>${opcoes}</select></label>`).join("")}
      <label class="linha">${esc(loc("ICARUS.Poderes.CustoPM"))} <input type="number" name="pm" value="15" min="0" step="1"></label></div>`,
    buttons: [
      { action: "ok", label: loc("ICARUS.Poderes.Usar"), default: true,
        callback: (ev, b) => ({ ids: ["m1", "m2", "m3"].map(k => b.form.elements[k].value), pm: Math.max(0, Math.trunc(Number(b.form.elements.pm.value) || 0)) }) },
      { action: "cancelar", label: loc("ICARUS.Testes.Cancelar") }
    ],
    rejectClose: false
  });
  if (!r || typeof r !== "object") return;
  const escolhidas = r.ids.map(id => lista.find(m => m.id === id) ?? null);
  const motivo = motivoDoMilagre(escolhidas);
  if (motivo) return ui.notifications.warn(loc(motivo));
  if (!(await gastarPM(actor, r.pm))) return;
  await avisarNoChat(actor, fmt("ICARUS.Clerigo.MilagreChat", { nome: actor.name, magias: escolhidas.map(m => m.nome).join(", ") }));
  const pack = game.packs.get(`${F}.magias`);
  for (const m of escolhidas) {
    const doc = await pack.getDocument(m.id);
    if (!doc) continue;
    // Magia temporária (não entra na ficha nem conta como conhecida)
    const temporaria = new Item.implementation(doc.toObject(), { parent: actor });
    await executarLancamento(actor, temporaria, [], { semCustoBase: true });
  }
  const roll = await new Roll("1d4").evaluate();
  await aplicarCondicao(actor, "atordoado", { duracao: "rodadas", rodadas: roll.total, origem: item.name });
  return avisarNoChat(actor, fmt("ICARUS.Clerigo.MilagreAtordoado", { nome: actor.name, rodadas: roll.total }), { rolls: [roll] });
});

/* ---------------- Reações e poderes com automação simples ---------------- */

GANCHOS_DE_PODER.set("clerigo__palavra-de-resguardo", {
  depois: async actor => {
    const roll = await new Roll(`1d8 + ${sabedoria(actor)}`).evaluate();
    const alvo = alvoMarcado();
    const guardado = !!alvo?.actor?.isOwner;
    if (guardado) await alvo.actor.setFlag(F, "resguardo", roll.total);
    return avisarNoChat(actor, fmt(guardado ? "ICARUS.Clerigo.ResguardoGuardado" : "ICARUS.Clerigo.ResguardoChat",
      { nome: actor.name, alvo: alvo?.name ?? loc("ICARUS.Nobre.UmAliado"), valor: roll.total }), { rolls: [roll] });
  }
});

// Palavra de Resguardo: tira o valor guardado do próximo dano do aliado
ABSORVEDORES_DE_DANO.push(async (alvo, actor) => {
  const valor = Number(actor.getFlag?.(F, "resguardo")) || 0;
  if (!valor) return null;
  await actor.unsetFlag(F, "resguardo");
  return { absorvido: valor, texto: loc("ICARUS.Clerigo.Resguardo") };
});

GANCHOS_DE_PODER.set("clerigo__ultima-graca", {
  antes: actor => {
    if (actor.getFlag(F, "ultimaGraca")) { ui.notifications.warn(loc("ICARUS.Clerigo.UmaVezPorCena")); return false; }
  },
  depois: async actor => {
    await actor.setFlag(F, "ultimaGraca", true);
    const alvo = alvoMarcado();
    const a = alvo?.actor;
    if (a?.isOwner && (a.system.pv?.value ?? 1) <= 0) {
      await a.update({ "system.pv.value": 1 });
      return avisarNoChat(actor, fmt("ICARUS.Clerigo.UltimaGracaFeita", { nome: actor.name, alvo: alvo.name }));
    }
    return avisarNoChat(actor, fmt("ICARUS.Clerigo.UltimaGracaChat", { nome: actor.name, alvo: alvo?.name ?? loc("ICARUS.Nobre.UmAliado") }));
  }
});

GANCHOS_DE_PODER.set("clerigo__fe-como-escudo", {
  antes: actor => {
    if (actor.getFlag(F, "feEscudo")) { ui.notifications.warn(loc("ICARUS.Clerigo.UmaVezPorCena")); return false; }
  },
  depois: async actor => {
    await actor.setFlag(F, "feEscudo", true);
    return avisarNoChat(actor, fmt("ICARUS.Clerigo.FeEscudoChat", { nome: actor.name, alvo: alvoMarcado()?.name ?? actor.name }));
  }
});

GANCHOS_DE_PODER.set("clerigo__arma-consagrada", {
  depois: async actor => {
    // A arma empunhada agora (sem arma em mãos: vale para a próxima que atacar)
    await actor.setFlag(F, "armaConsagrada", armasEmpunhadas(actor)[0]?.id ?? true);
    return avisarNoChat(actor, fmt("ICARUS.Clerigo.ArmaChat", { nome: actor.name, sab: sabedoria(actor), arma: armasEmpunhadas(actor)[0]?.name ?? loc("ICARUS.Clerigo.ArmaQualquer") }));
  }
});

/** A arma do ataque é a consagrada? */
const armaConsagrada = (actor, item) => {
  const f = actor.getFlag?.(F, "armaConsagrada");
  return !!f && item?.type === "arma" && (f === true || f === item.id);
};

PROVEDORES_ATAQUE.push((actor, item) => {
  if (!armaConsagrada(actor, item)) return null;
  return {
    id: "arma-consagrada", titulo: loc("ICARUS.Clerigo.ArmaAtiva"),
    campos: [{ tipo: "checkbox", nome: "armaConsagrada", valor: true, rotulo: fmt("ICARUS.Clerigo.ArmaRotulo", { sab: sabedoria(actor) }) }]
  };
});

// Sabedoria no lugar do atributo do ataque e do dano; +1 passo no dado da arma
MODIFICADORES_ATAQUE.push(({ actor, item, modo, opcoes }) => {
  if (!opcoes.armaConsagrada || !armaConsagrada(actor, item)) return null;
  const s = actor.system;
  const atq = calcularAtaque(s, item.system, modo, itensDoAtor(actor));
  const usado = atq.agil ? s.atributos.DES.total : s.atributos[s.pericias[atq.pericia]?.atributo]?.total ?? 0;
  return { bonus: sabedoria(actor) - usado, atributoDano: "SAB", passosDano: 1, linhas: [loc("ICARUS.Clerigo.ArmaLinha")] };
});

/* ---------------- Fim da cena ---------------- */

FIM_DA_CENA.push(async actor => {
  if (!ehClerigo(actor)) return;
  for (const k of ["soloSagrado", "ultimaGraca", "feEscudo", "armaConsagrada"]) if (actor.getFlag(F, k) !== undefined) await actor.unsetFlag(F, k);
});

/* ---------------- Hooks ---------------- */

Hooks.once("init", () => {
  // Magias conhecidas: lista Divina, nível até o 5º (17º) e limite n + 2; o Mestre só é avisado
  Hooks.on("preCreateItem", (item, dados, opcoes, userId) => {
    const actor = item.parent;
    if (userId !== game.user.id || item.type !== "magia" || !actor || !ehClerigo(actor)) return;
    const m = magiasDoClerigo(actor);
    const motivo = motivoParaNaoAprender(item.system, { nivel: actor.system.nivel, tradicao: "divina", conhecidas: m.conhecidas, limite: m.limite, teto: 5 });
    if (!motivo) return;
    const texto = fmt(motivo.chave, motivo.dados);
    if (game.user.isGM) { ui.notifications.warn(fmt("ICARUS.Magias.Conhecidas.Mestre", { motivo: texto })); return; }
    ui.notifications.warn(texto);
    return false;
  });
  // Violação de Dogma: sem recuperar PM enquanto durar o bloqueio (o Mestre só é avisado)
  Hooks.on("preUpdateActor", (actor, mudancas, opcoes, userId) => {
    if (userId !== game.user.id) return;
    const dias = actor.getFlag?.(F, "dogma")?.bloqueioPMDias ?? 0;
    const novo = foundry.utils.getProperty(mudancas, "system.pm.value");
    if (!dias || novo === undefined || novo <= actor.system.pm.value) return;
    if (game.user.isGM) { ui.notifications.warn(fmt("ICARUS.Clerigo.BloqueioMestre", { nome: actor.name, dias })); return; }
    ui.notifications.warn(fmt("ICARUS.Clerigo.BloqueioPM", { nome: actor.name, dias }));
    foundry.utils.setProperty(mudancas, "system.pm.value", actor.system.pm.value);
  });
});

/* ---------------- Aba Classe ---------------- */

registrarLinhas("clerigo", actor => {
  const linhas = [];
  const div = divindadePorId(actor.system.identidade.divindade);
  const anatema = !!actor.getFlag(F, "anatema");
  if (anatema) linhas.push({ id: "clerigo:anatema", rotulo: loc("ICARUS.Clerigo.Anatema"), info: loc("ICARUS.Clerigo.AnatemaInfo") });
  else if (div) linhas.push({ id: "clerigo:divindade", rotulo: fmt("ICARUS.Clerigo.Divindade", { divindade: div.nome }), info: div.dogma });
  else if (tem(actor, "fe-jurada")) linhas.push({ id: "clerigo:sem-divindade", rotulo: loc("ICARUS.Clerigo.SemDivindade"), info: loc("ICARUS.Clerigo.SemDivindadeInfo") });
  const dogma = actor.getFlag(F, "dogma");
  if (dogma?.bloqueioPMDias) linhas.push({ id: "clerigo:bloqueio", rotulo: loc("ICARUS.Clerigo.Bloqueio"), info: fmt("ICARUS.Clerigo.BloqueioInfo", { dias: dogma.bloqueioPMDias }) });
  if (game.user.isGM && !anatema && tem(actor, "fe-jurada")) {
    linhas.push({ id: "clerigo:dogma", rotulo: loc("ICARUS.Clerigo.Dogma"), botao: true, info: fmt("ICARUS.Clerigo.DogmaInfo", { n: dogma?.violacoes ?? 0 }) });
  }
  if (game.user.isGM && (dogma?.bloqueioPMDias || actor.getFlag(F, "intervencaoDias"))) linhas.push({ id: "clerigo:dia", rotulo: loc("ICARUS.Clerigo.PassouDia"), botao: true });
  if (tem(actor, "conjuracao-divina")) {
    const m = magiasDoClerigo(actor);
    linhas.push({ id: "clerigo:magias", rotulo: loc("ICARUS.Arcanista.Conhecidas"), info: `${fmt("ICARUS.Arcanista.ConhecidasInfo", { n: m.conhecidas, limite: m.limite })} · ${loc("ICARUS.Clerigo.ListaDivina")} · CD ${cdDoClerigo(actor)}` });
  }
  if (itemDeClasse(actor, "clerigo", "onda-de-fe")) linhas.push({ id: "clerigo:onda", rotulo: loc("ICARUS.Clerigo.Onda"), botao: true, info: fmt("ICARUS.Clerigo.OndaInfo", { max: maximoDaOnda(sabedoria(actor)) }) });
  if (actor.getFlag(F, "soloSagrado")) linhas.push({ id: "clerigo:solo-encerrar", rotulo: loc("ICARUS.Clerigo.SoloAtivo"), botao: true, ativo: true, info: loc("ICARUS.Clerigo.SoloInfo") });
  if (tem(actor, "intervencao-divina")) {
    const dias = actor.getFlag(F, "intervencaoDias") ?? 0;
    const falhou = !!actor.getFlag(F, "intervencaoFalhou");
    const motivo = motivoSemIntervencao(actor.system.nivel, { dias, falhou });
    linhas.push({ id: "clerigo:intervencao", rotulo: loc("ICARUS.Clerigo.Intervencao"), botao: true, desativado: !!motivo,
      info: motivo ? fmt(motivo, { dias }) : actor.system.nivel >= 20 ? loc("ICARUS.Clerigo.IntervencaoAuto") : `1d100 ≤ ${actor.system.nivel} · 5 PM` });
    if (falhou) linhas.push({ id: "clerigo:descanso", rotulo: loc("ICARUS.Clerigo.Descansou"), botao: true });
  }
  if (tem(actor, "milagre")) linhas.push({ id: "clerigo:milagre", rotulo: loc("ICARUS.Clerigo.Milagre"), botao: true, info: loc("ICARUS.Clerigo.MilagreInfo") });
  if (actor.getFlag(F, "armaConsagrada")) linhas.push({ id: "clerigo:arma", rotulo: loc("ICARUS.Clerigo.ArmaAtiva"), info: fmt("ICARUS.Clerigo.ArmaInfo", { sab: sabedoria(actor) }) });
  return linhas;
});
