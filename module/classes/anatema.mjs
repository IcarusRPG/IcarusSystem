/**
 * Anátema:
 * - Abandonado (1º): não pode ser devoto (a divindade e os Poderes Concedidos ficam bloqueados).
 *   Preço de Sangue: nos diálogos que gastam PM (poderes, magias e as ações daqui), o campo "Pagar
 *   com PV": até 2 PM por turno, 3 PV cada (Preço Barato: até 3 PM, 2 PV cada); perda de PV, nunca
 *   deixa os PV em 0. Uma vez por turno (flags.precoTurno).
 * - Mana Coagulada (1º): +1 PM a cada 2 níveis (module/derivar.mjs, via anatema-dados.mjs).
 * - Sangria de Guerra (1º): no card do ataque corpo a corpo com arma de Corte ou Perfuração, botão
 *   (1 PM; 0 no Banho Rubro) que deixa o alvo Sangrando. O efeito guarda flags.sangrandoPor (CD 15,
 *   ou 10 + metade do nível + SAB com Ferida Teimosa; perda 2d6 com Hemorragia Pesada; Praga de Sangue)
 *   e o lembrete de turno usa esses valores. Corte Gêmeo: +1 PM, segundo alvo marcado.
 * - Selar Feridas (2º): remove Sangrando e cura (1d6 +1d6 no 8º/14º/20º; Costura Rápida; Cicatriz
 *   Viva em si; Pano e Linha em aliado). Olhar Funesto (2º): Sabedoria em Intimidação (derivado) e
 *   botão que rola Intimidação e posta o card com "Aplicar" (Abalado, ou Apavorado 1 rodada se Sangrando).
 * - Ruptura (3º, permanente): Pecado, Tragédia ou Blasfêmia (flags.ruptura); poderes do grupo só nela.
 * - Dor Fértil (5º): ao perder PV, +1 PM (1 vez por rodada; até metade do nível por cena).
 * - Banho Rubro (20º): 1/dia; +2 ataque e Intimidação, Sangria sem PM; ao fim da cena, Fatigado.
 * - Palavras de Sangue: a única forma de lançar magias (2 da lista Sangue por escolha, até o 4º nível).
 * - Carne Aberta, Mão Pesada, Sangue Fervente e Medo Ambulante entram no ataque; Amortecer reduz o
 *   próximo dano; Pele de Cicatrizes, Voz Rouca, Voz Blasfema, Veias de Ferro e Armadura Rubra são
 *   derivados na ficha.
 */
import { SISTEMA_ID } from "../config.mjs";
import { temHabilidadeNosItens } from "../classes-dados.mjs";
import { classeDoAtor, ACOES_DE_MECANICA, concederHabilidades } from "../classes.mjs";
import { GANCHOS_DE_PODER, PAGAMENTO_COM_PV } from "../acoes.mjs";
import { APOS_CAMINHO } from "../escolhas.mjs";
import { FIM_DA_CENA, aplicarCondicao, removerCondicao } from "../condicoes-foundry.mjs";
import { registrarLinhas, itemDeClasse, avisarNoChat, USO_PROPRIO } from "./comum.mjs";
import { calcularCD } from "../combate.mjs";
import { MODIFICADORES_ATAQUE } from "../combate-chat.mjs";
import { rolarDanoAvulso, ABSORVEDORES_DE_DANO } from "../dano.mjs";
import { rolarPericia } from "../rolls.mjs";
import { mudancasParaEfeito, motivoParaNaoAprender, limiteDeMagiasDoAnatema, nivelMaximoDaClasse } from "../magias-dados.mjs";
import { CONDICAO_POR_ID } from "../condicoes.mjs";
import {
  precoDeSangue, maximoComPV, chaveDoTurno, dadosDoSangrando, curaDoSelar, danoDaCarneAberta, limiteDaDorFertil,
  alvosDoOlhar, reducaoDoAmortecer, curaDoBanquete, pvTemporariosDoPano
} from "../anatema-dados.mjs";

const F = SISTEMA_ID;
const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);
const esc = t => Handlebars.escapeExpression(t ?? "");
const { DialogV2 } = foundry.applications.api;

export const ehAnatema = actor => classeDoAtor(actor)?.id === "anatema";
const tem = (actor, id) => temHabilidadeNosItens([...(actor.items ?? [])], "anatema", id);
const sabedoria = actor => Math.trunc(Number(actor.system.atributos?.SAB?.total) || 0);
const cdDoAnatema = actor => calcularCD(actor.system, "SAB").cd;
const alvosMarcados = () => [...(game.user.targets ?? [])].filter(t => t.actor);
const RUPTURAS = ["pecado", "tragedia", "blasfemia"];
const umaVez = (actor, flag) => {
  if (actor.getFlag(F, flag)) { ui.notifications.warn(loc("ICARUS.Clerigo.UmaVezPorCena")); return false; }
};

// Botões próprios (card do ataque ou aba Classe): sem o "Usar" genérico
for (const id of ["sangria-de-guerra", "selar-feridas", "olhar-funesto", "cicatriz-viva", "voz-que-quebra", "corte-gemeo"]) USO_PROPRIO.add(`anatema__${id}`);

/* ---------------- Preço de Sangue (pagar PM com PV) ---------------- */

/** Pagamento com PV do Anátema agora, ou null (sem Abandonado). */
function precoDoAtor(actor) {
  if (!actor || !ehAnatema(actor) || !tem(actor, "abandonado")) return null;
  const barato = tem(actor, "preco-barato");
  const p = precoDeSangue({ precoBarato: barato });
  const chave = chaveDoTurno(game.combat);
  const jaPagou = !!chave && actor.getFlag(F, "precoTurno") === chave;
  return {
    pvPorPM: p.pvPorPM,
    titulo: loc("ICARUS.Anatema.PrecoDeSangue"),
    rotulo: fmt("ICARUS.Anatema.PagarComPV", { pv: p.pvPorPM, max: p.maxPorTurno }),
    maximo: custo => maximoComPV(custo, actor.system.pv?.value ?? 0, { precoBarato: barato, jaPagouNoTurno: jaPagou }),
    aoPagar: async (a, pm) => {
      if (chave) await a.setFlag(F, "precoTurno", chave);
      await avisarNoChat(a, fmt("ICARUS.Anatema.PagouChat", { nome: a.name, pm, pv: pm * p.pvPorPM }));
    }
  };
}
PAGAMENTO_COM_PV.push(precoDoAtor);

/** Campo "Pagar com PV" para os diálogos daqui ("" se não pode). */
function campoDePV(actor, custo) {
  const p = precoDoAtor(actor);
  const max = p?.maximo(custo) ?? 0;
  return max ? `<label class="linha">${esc(p.rotulo)} <input type="number" name="pv" value="0" min="0" max="${max}" step="1"></label>` : "";
}

/** Gasta PM (já confirmado), parte com PV se pediu; false se faltar. */
async function pagar(actor, pm, comPV = 0) {
  const p = precoDoAtor(actor);
  const v = p ? Math.min(Math.max(0, Math.trunc(Number(comPV) || 0)), p.maximo(pm)) : 0;
  const daMana = pm - v;
  if (daMana > actor.system.pm.value) { ui.notifications.warn(fmt("ICARUS.Poderes.SemPM", { nome: actor.name, pm: daMana, atual: actor.system.pm.value })); return false; }
  const mudancas = {};
  if (daMana) mudancas["system.pm.value"] = actor.system.pm.value - daMana;
  if (v) mudancas["system.pv.value"] = actor.system.pv.value - v * p.pvPorPM;
  if (Object.keys(mudancas).length) await actor.update(mudancas);
  if (v) await p.aoPagar(actor, v);
  return true;
}

/** Confirmação com custo e o campo de PV; devolve os campos do formulário ou null. */
async function confirmar(actor, { titulo, texto, custo, extras = "" }) {
  const r = await DialogV2.wait({
    window: { title: titulo },
    content: `<div class="icarus-uso"><p>${esc(texto)}</p>${extras}${custo ? campoDePV(actor, custo) : ""}
      <p class="dica">${esc(fmt("ICARUS.Poderes.PMAtual", { pm: actor.system.pm.value, max: actor.system.pm.max }))}</p></div>`,
    buttons: [
      { action: "ok", label: loc("ICARUS.Poderes.Usar"), default: true,
        callback: (ev, b) => Object.fromEntries([...b.form.elements].filter(e => e.name).map(e => [e.name, e.type === "checkbox" ? e.checked : e.value])) },
      { action: "cancelar", label: loc("ICARUS.Testes.Cancelar") }
    ],
    rejectClose: false
  });
  return r && typeof r === "object" ? r : null;
}

/* ---------------- Abandonado: sem devoção ---------------- */

/** O Anátema não pode ser devoto (a ficha bloqueia; o Mestre é só avisado). */
export function devocaoBloqueada(actor) {
  return ehAnatema(actor) && tem(actor, "abandonado");
}

/* ---------------- Condições com origem (card com "Aplicar") ---------------- */

/** Aplica as condições em um ator (com sangrandoPor no Sangrando). */
async function aplicarEm(alvo, condicoes, sangrandoPor) {
  for (const c of condicoes) {
    await aplicarCondicao(alvo, c.id, { duracao: c.duracao ?? "remover", rodadas: c.rodadas ?? 1, origem: null,
      flags: c.id === "sangrando" && sangrandoPor ? { sangrandoPor } : {} });
  }
}

/**
 * Condições do Anátema nos alvos. Sem teste (direto): aplica nos alvos que este usuário controla e
 * deixa o card com "Aplicar" para os outros (o Mestre). Com teste (resistencia): sempre o card.
 * @param {{ titulo, texto, alvos: {uuid, nome, condicoes}[], sangrandoPor?, resistencia? }} d
 */
async function condicoesNosAlvos(actor, d) {
  const pendentes = [];
  for (const a of d.alvos) {
    const alvo = fromUuidSync(a.uuid);
    if (!d.resistencia && alvo?.isOwner) await aplicarEm(alvo, a.condicoes, d.sangrandoPor);
    else pendentes.push(a);
  }
  const nomes = d.alvos.map(a => a.nome).join(", ");
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="icarus-rolagem icarus-lembrete"><p class="condicao-descricao"><b>${esc(d.titulo)}</b> · ${esc(nomes)}</p>
      <p class="condicao-descricao">${esc(d.texto)}</p></div>`,
    flags: { [F]: { anatemaCondicoes: { alvos: pendentes, sangrandoPor: d.sangrandoPor ?? null, resistencia: !!d.resistencia, aplicados: [] } } }
  });
}

function botoesDeCondicao(mensagem, raiz) {
  const dados = mensagem.flags?.[F]?.anatemaCondicoes;
  if (!dados?.alvos?.length) return;
  const meus = dados.alvos.filter(a => !(dados.aplicados ?? []).includes(a.uuid) && fromUuidSync(a.uuid)?.isOwner);
  if (!meus.length) return;
  const conteudo = raiz?.querySelector(".message-content");
  if (!conteudo) return;
  const caixa = document.createElement("div");
  caixa.className = "icarus-aplicar icarus-anatema";
  for (const a of meus) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "btn";
    el.textContent = fmt(dados.resistencia ? "ICARUS.Anatema.AplicarFalhou" : "ICARUS.Anatema.Aplicar",
      { alvo: a.nome, condicoes: a.condicoes.map(c => CONDICAO_POR_ID[c.id]?.nome ?? c.id).join(" + ") });
    el.addEventListener("click", async () => {
      el.disabled = true;
      await aplicarEm(fromUuidSync(a.uuid), a.condicoes, dados.sangrandoPor);
      if (mensagem.isOwner) await mensagem.setFlag(F, "anatemaCondicoes.aplicados", [...(dados.aplicados ?? []), a.uuid]);
    });
    caixa.appendChild(el);
  }
  conteudo.appendChild(caixa);
}

/** Dados do Sangrando causado por este Anátema (CD, perda e Praga de Sangue). */
const sangrandoDe = actor => ({
  ...dadosDoSangrando({ uuid: actor.uuid, nome: actor.name, nivel: actor.system.nivel, sabedoria: sabedoria(actor),
    feridaTeimosa: tem(actor, "ferida-teimosa"), hemorragia: tem(actor, "hemorragia-pesada") }),
  praga: tem(actor, "praga-de-sangue")
});

/* ---------------- Ruptura ---------------- */

APOS_CAMINHO.set("ruptura", async (actor, i) => {
  if (!ehAnatema(actor)) return;
  await actor.setFlag(F, "ruptura", RUPTURAS[i] ?? null);
  await concederHabilidades(actor);
});

/* ---------------- Sangria de Guerra (card do ataque) ---------------- */

async function sangria(actor) {
  const alvos = alvosMarcados();
  if (!alvos.length) { ui.notifications.warn(loc("ICARUS.Anatema.MarqueAlvo")); return false; }
  const banho = !!actor.getFlag(F, "banhoRubro");
  const gemeo = tem(actor, "corte-gemeo");
  const dados = sangrandoDe(actor);
  const r = await confirmar(actor, {
    titulo: loc("ICARUS.Anatema.Sangria"),
    texto: fmt("ICARUS.Anatema.SangriaTexto", { alvo: alvos[0].name, pm: banho ? 0 : 1, cd: dados.cd, perda: dados.perda }),
    custo: banho ? 0 : 1,
    extras: gemeo ? `<label class="chk"><input type="checkbox" name="gemeo"${alvos.length > 1 ? "" : " disabled"}> ${esc(fmt("ICARUS.Anatema.CorteGemeo", { alvo: alvos[1]?.name ?? "—" }))}</label>` : ""
  });
  if (!r) return false;
  const doisAlvos = !!r.gemeo && alvos.length > 1;
  if (!(await pagar(actor, (banho ? 0 : 1) + (doisAlvos ? 1 : 0), r.pv))) return false;
  await condicoesNosAlvos(actor, {
    titulo: loc("ICARUS.Anatema.Sangria"),
    texto: fmt("ICARUS.Anatema.SangriaChat", { cd: dados.cd, perda: dados.perda }),
    alvos: alvos.slice(0, doisAlvos ? 2 : 1).map(t => ({ uuid: t.actor.uuid, nome: t.name, condicoes: [{ id: "sangrando" }] })),
    sangrandoPor: dados
  });
  return true;
}

const ehCorteOuPerfuracao = item => (item?.system?.tiposDano ?? []).some(t => t === "corte" || t === "perfuracao");

function aoRenderizar(mensagem, html) {
  const raiz = html instanceof HTMLElement ? html : html?.[0];
  botoesDeCondicao(mensagem, raiz);
  const atq = mensagem.flags?.[F]?.ataque;
  if (!atq || atq.modo !== "corpo-a-corpo") return;
  const actor = fromUuidSync(atq.actorUuid);
  if (!actor || !ehAnatema(actor) || !actor.isOwner || !tem(actor, "sangria-de-guerra")) return;
  if (!ehCorteOuPerfuracao(actor.items.get(atq.itemId))) return;
  const conteudo = raiz?.querySelector(".message-content");
  if (!conteudo) return;
  const caixa = document.createElement("div");
  caixa.className = "icarus-aplicar icarus-anatema";
  const el = document.createElement("button");
  el.type = "button";
  el.className = "btn";
  el.textContent = loc("ICARUS.Anatema.SangriaBotao");
  el.disabled = !!mensagem.flags?.[F]?.sangriaUsada;
  el.addEventListener("click", async () => {
    el.disabled = true;
    if (!(await sangria(actor))) { el.disabled = false; return; }
    if (mensagem.isOwner) await mensagem.setFlag(F, "sangriaUsada", true);
  });
  caixa.appendChild(el);
  conteudo.appendChild(caixa);
}

/* ---------------- Ataque: Carne Aberta, Mão Pesada, Sangue Fervente, Medo Ambulante, Banho Rubro ---------------- */

MODIFICADORES_ATAQUE.push(async ({ actor, item, modo, alvos }) => {
  if (!ehAnatema(actor)) return null;
  const r = { bonus: 0, linhas: [], extrasDano: [] };
  const alvo = alvos?.[0]?.token?.actor ?? null;
  if (modo === "corpo-a-corpo" && tem(actor, "carne-aberta") && alvo?.statuses?.has("sangrando")) {
    r.extrasDano.push({ rotulo: loc("ICARUS.Anatema.CarneAberta"), formula: danoDaCarneAberta(actor.system.nivel) });
  }
  if (tem(actor, "mao-pesada") && ehCorteOuPerfuracao(item)) r.extrasDano.push({ rotulo: loc("ICARUS.Anatema.MaoPesada"), formula: "2", naoMultiplica: true });
  if (tem(actor, "sangue-fervente") && actor.statuses?.has("sangrando")) {
    r.bonus += 2;
    r.linhas.push(loc("ICARUS.Anatema.SangueFervente"));
    r.extrasDano.push({ rotulo: loc("ICARUS.Anatema.SangueFervente"), formula: "2", naoMultiplica: true });
  }
  if (tem(actor, "medo-ambulante") && (alvo?.statuses?.has("abalado") || alvo?.statuses?.has("apavorado"))) {
    r.bonus += 2;
    r.linhas.push(loc("ICARUS.Anatema.MedoAmbulante"));
  }
  return r.bonus || r.linhas.length || r.extrasDano.length ? r : null;
});

/* ---------------- Selar Feridas ---------------- */

ACOES_DE_MECANICA.set("anatema:selar", async actor => {
  const item = itemDeClasse(actor, "anatema", "selar-feridas");
  if (!item) return;
  const token = alvosMarcados()[0] ?? null;
  const alvo = token?.actor ?? actor;
  const nomeAlvo = token?.name ?? actor.name;
  const emSi = alvo === actor || alvo.uuid === actor.uuid;
  const cicatriz = emSi && tem(actor, "cicatriz-viva");
  const formula = curaDoSelar(actor.system.nivel, { costura: tem(actor, "costura-rapida"), cicatrizEmSi: cicatriz });
  const r = await confirmar(actor, {
    titulo: item.name,
    texto: fmt("ICARUS.Anatema.SelarTexto", { alvo: nomeAlvo, formula, alcance: loc(tem(actor, "selar-a-distancia") ? "ICARUS.Paladino.AlcanceCurto" : "ICARUS.Paladino.AlcanceToque"),
      acao: loc(cicatriz ? "ICARUS.Poderes.Acoes.livre" : "ICARUS.Poderes.Acoes.movimento") }),
    custo: 1
  });
  if (!r || !(await pagar(actor, 1, r.pv))) return;
  if (alvo.statuses?.has("sangrando")) {
    if (alvo.isOwner) await removerCondicao(alvo, "sangrando");
    else await avisarNoChat(actor, fmt("ICARUS.Anatema.SelarRemoverMestre", { alvo: nomeAlvo }));
  }
  await rolarDanoAvulso({ formula, cura: true, alvoUuid: alvo.uuid, titulo: fmt("ICARUS.Anatema.SelarTitulo", { alvo: nomeAlvo }), img: item.img, actor });
  if (!emSi && tem(actor, "pano-e-linha")) await avisarNoChat(actor, fmt("ICARUS.Anatema.PanoChat", { alvo: nomeAlvo, pv: pvTemporariosDoPano(actor.system.nivel) }));
});

/* ---------------- Olhar Funesto ---------------- */

ACOES_DE_MECANICA.set("anatema:olhar", async actor => {
  const n = alvosDoOlhar({ vozBlasfema: tem(actor, "voz-blasfema") });
  const alvos = alvosMarcados().slice(0, n);
  if (!alvos.length) return ui.notifications.warn(loc("ICARUS.Anatema.MarqueAlvo"));
  // Voz que Quebra: como ação livre (1 vez por rodada), pagando 1 PM
  if (tem(actor, "voz-que-quebra")) {
    const r = await confirmar(actor, { titulo: loc("ICARUS.Anatema.Olhar"), texto: fmt("ICARUS.Anatema.OlharTexto", { n }),
      extras: `<label class="chk"><input type="checkbox" name="livre"> ${esc(loc("ICARUS.Anatema.VozQueQuebra"))}</label>`, custo: 1 });
    if (!r) return;
    if (r.livre && !(await pagar(actor, 1, r.pv))) return;
  }
  const msg = await rolarPericia(actor, "intimidacao");
  if (!msg) return;
  const total = msg.rolls?.[0]?.total ?? null;
  await condicoesNosAlvos(actor, {
    titulo: loc("ICARUS.Anatema.Olhar"),
    texto: fmt("ICARUS.Anatema.OlharChat", { total: total ?? "?" }),
    resistencia: true,
    alvos: alvos.map(t => ({ uuid: t.actor.uuid, nome: t.name,
      condicoes: t.actor.statuses?.has("sangrando") ? [{ id: "apavorado", duracao: "rodadas", rodadas: 1 }] : [{ id: "abalado", duracao: "cena" }] }))
  });
});

/* ---------------- Poderes com gancho ---------------- */

// Maldição Rubra: Vontade ou Sangrando e Abalado até o fim da cena
GANCHOS_DE_PODER.set("anatema__maldicao-rubra", {
  antes: () => { if (!alvosMarcados().length) { ui.notifications.warn(loc("ICARUS.Anatema.MarqueAlvo")); return false; } },
  depois: actor => {
    const t = alvosMarcados()[0];
    return condicoesNosAlvos(actor, { titulo: loc("ICARUS.Anatema.Maldicao"), texto: fmt("ICARUS.Anatema.VontadeCD", { cd: cdDoAnatema(actor) }), resistencia: true,
      sangrandoPor: sangrandoDe(actor), alvos: [{ uuid: t.actor.uuid, nome: t.name, condicoes: [{ id: "sangrando" }, { id: "abalado", duracao: "cena" }] }] });
  }
});

// Aclamação do Pavor (1/cena): Vontade ou Apavorado por 1d4 rodadas
GANCHOS_DE_PODER.set("anatema__aclamacao-do-pavor", {
  antes: actor => umaVez(actor, "aclamacaoUsada"),
  depois: async actor => {
    await actor.setFlag(F, "aclamacaoUsada", true);
    const roll = await new Roll("1d4").evaluate();
    const alvos = alvosMarcados();
    if (!alvos.length) return avisarNoChat(actor, fmt("ICARUS.Anatema.AclamacaoChat", { cd: cdDoAnatema(actor), rodadas: roll.total }), { rolls: [roll] });
    return condicoesNosAlvos(actor, { titulo: loc("ICARUS.Anatema.Aclamacao"), texto: fmt("ICARUS.Anatema.AclamacaoChat", { cd: cdDoAnatema(actor), rodadas: roll.total }), resistencia: true,
      alvos: alvos.map(t => ({ uuid: t.actor.uuid, nome: t.name, condicoes: [{ id: "apavorado", duracao: "rodadas", rodadas: roll.total }] })) });
  }
});

// Dente por Dente: Fortitude ou Sangrando
GANCHOS_DE_PODER.set("anatema__dente-por-dente", {
  depois: actor => {
    const t = alvosMarcados()[0];
    if (!t) return avisarNoChat(actor, fmt("ICARUS.Anatema.FortitudeCD", { cd: cdDoAnatema(actor) }));
    return condicoesNosAlvos(actor, { titulo: loc("ICARUS.Anatema.Dente"), texto: fmt("ICARUS.Anatema.FortitudeCD", { cd: cdDoAnatema(actor) }), resistencia: true,
      sangrandoPor: sangrandoDe(actor), alvos: [{ uuid: t.actor.uuid, nome: t.name, condicoes: [{ id: "sangrando" }] }] });
  }
});

// Faca na Ferida: criatura Sangrando perde 1d6 PV
GANCHOS_DE_PODER.set("anatema__faca-na-ferida", {
  antes: () => {
    const t = alvosMarcados()[0];
    if (!t) { ui.notifications.warn(loc("ICARUS.Anatema.MarqueAlvo")); return false; }
    if (!t.actor.statuses?.has("sangrando")) { ui.notifications.warn(fmt("ICARUS.Anatema.NaoSangra", { alvo: t.name })); return false; }
  },
  depois: actor => {
    const t = alvosMarcados()[0];
    return rolarDanoAvulso({ formula: "1d6", perda: true, alvoUuid: t?.actor?.uuid ?? null, titulo: fmt("ICARUS.Anatema.FacaTitulo", { alvo: t?.name ?? "" }), img: actor.img, actor });
  }
});

// Insulto ao Céu: 2d6 Psíquico (Vontade: metade) e Abalado se falhar
GANCHOS_DE_PODER.set("anatema__insulto-ao-ceu", {
  depois: async actor => {
    await rolarDanoAvulso({ partes: [{ formula: "2d6", tipo: "psiquico" }], titulo: loc("ICARUS.Anatema.Insulto"), img: actor.img, actor });
    const t = alvosMarcados()[0];
    const texto = fmt("ICARUS.Anatema.InsultoChat", { cd: cdDoAnatema(actor) });
    if (!t) return avisarNoChat(actor, texto);
    return condicoesNosAlvos(actor, { titulo: loc("ICARUS.Anatema.Insulto"), texto, resistencia: true,
      alvos: [{ uuid: t.actor.uuid, nome: t.name, condicoes: [{ id: "abalado", duracao: "cena" }] }] });
  }
});

// Sangria Total (1/cena): o alvo e cada criatura Sangrando em curto perdem 4d6 PV
GANCHOS_DE_PODER.set("anatema__sangria-total", {
  antes: actor => umaVez(actor, "sangriaTotalUsada"),
  depois: async actor => {
    await actor.setFlag(F, "sangriaTotalUsada", true);
    await avisarNoChat(actor, loc("ICARUS.Anatema.SangriaTotalChat"));
    return rolarDanoAvulso({ formula: "4d6", perda: true, titulo: loc("ICARUS.Anatema.SangriaTotal"), img: actor.img, actor });
  }
});

// Não Caio (1/cena): PV ficam em 1 e recebe 4d8 PV temporários
GANCHOS_DE_PODER.set("anatema__nao-caio", {
  antes: actor => umaVez(actor, "naoCaioUsado"),
  depois: async actor => {
    await actor.setFlag(F, "naoCaioUsado", true);
    if ((actor.system.pv?.value ?? 0) < 1) await actor.update({ "system.pv.value": 1 });
    const roll = await new Roll("4d8").evaluate();
    return avisarNoChat(actor, fmt("ICARUS.Anatema.NaoCaioChat", { nome: actor.name, pv: roll.total }), { rolls: [roll] });
  }
});

// Amortecer: o próximo dano diminui em 3 + metade do nível
GANCHOS_DE_PODER.set("anatema__amortecer", {
  depois: async actor => {
    const valor = reducaoDoAmortecer(actor.system.nivel);
    await actor.setFlag(F, "amortecer", valor);
    return avisarNoChat(actor, fmt("ICARUS.Anatema.AmortecerChat", { nome: actor.name, valor }));
  }
});
ABSORVEDORES_DE_DANO.push(async (alvo, actor) => {
  const valor = Number(actor.getFlag?.(F, "amortecer")) || 0;
  if (!valor) return null;
  await actor.unsetFlag(F, "amortecer");
  return { absorvido: valor, texto: loc("ICARUS.Anatema.Amortecer") };
});

// Banho Rubro (1/dia): +2 ataque e Intimidação, Sangria de Guerra sem PM; ao fim da cena, Fatigado
GANCHOS_DE_PODER.set("anatema__banho-rubro", {
  antes: actor => {
    if (actor.getFlag(F, "banhoRubroDia")) { ui.notifications.warn(loc("ICARUS.Anatema.BanhoDia")); return false; }
  },
  depois: async (actor, item) => {
    await actor.update({ [`flags.${F}.banhoRubroDia`]: true, [`flags.${F}.banhoRubro`]: true });
    const { changes } = mudancasParaEfeito([{ chave: "ataque", valor: 2 }, { chave: "pericia:intimidacao", valor: 2 }]);
    await actor.createEmbeddedDocuments("ActiveEffect", [{ name: item.name, img: item.img, changes, transfer: false, flags: { [F]: { duracao: "cena", anatema: "banho-rubro" } } }]);
    return avisarNoChat(actor, fmt("ICARUS.Anatema.BanhoChat", { nome: actor.name }));
  }
});

/* ---------------- Banquete do Vencedor ---------------- */

ACOES_DE_MECANICA.set("anatema:banquete", async actor => {
  const pv = actor.system.pv;
  const cura = curaDoBanquete(sabedoria(actor));
  await actor.update({ "system.pv.value": Math.min(pv.max, pv.value + cura) });
  return avisarNoChat(actor, fmt("ICARUS.Anatema.BanqueteChat", { nome: actor.name, pv: cura }));
});

/* ---------------- Palavras de Sangue ---------------- */

/** Limite e quantas magias o Anátema conhece (0 sem Palavras de Sangue). */
export function magiasDoAnatema(actor) {
  const palavras = actor.items.filter(i => i.flags?.[F]?.id === "anatema__palavras-de-sangue" && i.flags?.[F]?.magiasExtras).length;
  return { conhecidas: actor.items.filter(i => i.type === "magia").length, limite: limiteDeMagiasDoAnatema(palavras), palavras };
}

/* ---------------- Fim da cena ---------------- */

FIM_DA_CENA.push(async actor => {
  if (!ehAnatema(actor)) return;
  for (const k of ["sangriaTotalUsada", "naoCaioUsado", "aclamacaoUsada", "dorFertilCena", "dorFertilRodada", "amortecer", "precoTurno"]) {
    if (actor.getFlag(F, k) !== undefined) await actor.unsetFlag(F, k);
  }
  if (actor.getFlag(F, "banhoRubro")) {
    await actor.unsetFlag(F, "banhoRubro");
    await aplicarCondicao(actor, "fatigado", { origem: loc("ICARUS.Anatema.Banho") });
    await avisarNoChat(actor, fmt("ICARUS.Anatema.BanhoFim", { nome: actor.name }));
  }
});

/* ---------------- Hooks ---------------- */

Hooks.once("init", () => {
  if ((game.release?.generation ?? 12) >= 13) Hooks.on("renderChatMessageHTML", aoRenderizar);
  else Hooks.on("renderChatMessage", aoRenderizar);
  Hooks.on("preCreateItem", (item, dados, opcoes, userId) => {
    const actor = item.parent;
    if (userId !== game.user.id || !actor || !ehAnatema(actor)) return;
    let texto = null;
    // Abandonado: sem Poderes Concedidos
    if (item.flags?.[F]?.concedido && devocaoBloqueada(actor)) texto = loc("ICARUS.Anatema.SemDevocao");
    // Palavras de Sangue: sem o poder não aprende magias; com ele, lista Sangue até o 4º nível
    else if (item.type === "magia") {
      const m = magiasDoAnatema(actor);
      const motivo = !m.palavras ? { chave: "ICARUS.Anatema.SemPalavras", dados: {} }
        : motivoParaNaoAprender(item.system, { nivel: actor.system.nivel, tradicao: "sangue", conhecidas: m.conhecidas, limite: m.limite, max: nivelMaximoDaClasse("anatema", actor.system.nivel) });
      if (motivo) texto = fmt(motivo.chave, motivo.dados);
    }
    if (!texto) return;
    if (game.user.isGM) { ui.notifications.warn(fmt("ICARUS.Magias.Conhecidas.Mestre", { motivo: texto })); return; }
    ui.notifications.warn(texto);
    return false;
  });
  Hooks.on("preUpdateActor", (actor, mudancas, opcoes, userId) => {
    if (userId !== game.user.id || !ehAnatema(actor)) return;
    // Abandonado: não escolhe divindade (o Mestre é só avisado)
    const div = foundry.utils.getProperty(mudancas, "system.identidade.divindade");
    if (div && devocaoBloqueada(actor)) {
      ui.notifications.warn(loc("ICARUS.Anatema.SemDevocao"));
      if (!game.user.isGM) return false;
    }
    // Dor Fértil: ao perder PV, +1 PM (1 vez por rodada; até metade do nível por cena)
    const novo = foundry.utils.getProperty(mudancas, "system.pv.value");
    if (novo === undefined || novo >= (actor.system.pv?.value ?? 0) || !tem(actor, "dor-fertil")) return;
    const rodada = game.combat?.id ? `${game.combat.id}:${game.combat.round}` : null;
    if (rodada && actor.getFlag(F, "dorFertilRodada") === rodada) return;
    const usados = Number(actor.getFlag(F, "dorFertilCena")) || 0;
    if (usados >= limiteDaDorFertil(actor.system.nivel)) return;
    const pm = foundry.utils.getProperty(mudancas, "system.pm.value") ?? actor.system.pm.value;
    if (pm >= actor.system.pm.max) return;
    foundry.utils.setProperty(mudancas, "system.pm.value", pm + 1);
    foundry.utils.setProperty(mudancas, `flags.${F}.dorFertilCena`, usados + 1);
    if (rodada) foundry.utils.setProperty(mudancas, `flags.${F}.dorFertilRodada`, rodada);
    ui.notifications.info(fmt("ICARUS.Anatema.DorFertil", { nome: actor.name }));
  });
});

/* ---------------- Aba Classe ---------------- */

registrarLinhas("anatema", actor => {
  const linhas = [];
  if (tem(actor, "abandonado")) {
    const p = precoDoAtor(actor);
    linhas.push({ id: "anatema:abandonado", rotulo: loc("ICARUS.Anatema.Abandonado"),
      info: fmt("ICARUS.Anatema.AbandonadoInfo", { pv: p?.pvPorPM ?? 3, max: precoDeSangue({ precoBarato: tem(actor, "preco-barato") }).maxPorTurno }) });
  }
  const ruptura = actor.getFlag(F, "ruptura");
  if (ruptura) linhas.push({ id: "anatema:ruptura", rotulo: loc("ICARUS.Anatema.Ruptura"), info: loc(`ICARUS.Anatema.Rupturas.${ruptura}`) });
  if (tem(actor, "sangria-de-guerra")) {
    const d = sangrandoDe(actor);
    linhas.push({ id: "anatema:sangria", rotulo: loc("ICARUS.Anatema.Sangria"), info: fmt("ICARUS.Anatema.SangriaInfo", { cd: d.cd, perda: d.perda, pm: actor.getFlag(F, "banhoRubro") ? 0 : 1 }) });
  }
  if (tem(actor, "selar-feridas")) {
    linhas.push({ id: "anatema:selar", rotulo: loc("ICARUS.Anatema.Selar"), botao: true,
      info: `${curaDoSelar(actor.system.nivel, { costura: tem(actor, "costura-rapida") })} · 1 PM${tem(actor, "cicatriz-viva") ? ` · ${loc("ICARUS.Anatema.CicatrizInfo")}` : ""}` });
  }
  if (tem(actor, "olhar-funesto")) {
    linhas.push({ id: "anatema:olhar", rotulo: loc("ICARUS.Anatema.Olhar"), botao: true,
      info: fmt("ICARUS.Anatema.OlharInfo", { n: alvosDoOlhar({ vozBlasfema: tem(actor, "voz-blasfema") }), pericia: actor.system.pericias?.intimidacao?.total ?? 0 }) });
  }
  if (tem(actor, "dor-fertil")) {
    linhas.push({ id: "anatema:dor", rotulo: loc("ICARUS.Anatema.Dor"), info: fmt("ICARUS.Anatema.DorInfo", { n: Number(actor.getFlag(F, "dorFertilCena")) || 0, limite: limiteDaDorFertil(actor.system.nivel) }) });
  }
  if (tem(actor, "banquete-do-vencedor")) linhas.push({ id: "anatema:banquete", rotulo: loc("ICARUS.Anatema.Banquete"), botao: true, info: fmt("ICARUS.Anatema.BanqueteInfo", { pv: curaDoBanquete(sabedoria(actor)) }) });
  if (actor.getFlag(F, "amortecer")) linhas.push({ id: "anatema:amortecer", rotulo: loc("ICARUS.Anatema.Amortecer"), info: `−${actor.getFlag(F, "amortecer")}` });
  if (actor.getFlag(F, "banhoRubro")) linhas.push({ id: "anatema:banho", rotulo: loc("ICARUS.Anatema.Banho"), info: loc("ICARUS.Anatema.BanhoInfo") });
  if (game.user.isGM && actor.getFlag(F, "banhoRubroDia")) linhas.push({ id: "clerigo:dia", rotulo: loc("ICARUS.Clerigo.PassouDia"), botao: true });
  const m = magiasDoAnatema(actor);
  linhas.push({ id: "anatema:magias", rotulo: loc("ICARUS.Arcanista.Conhecidas"),
    info: m.palavras ? `${fmt("ICARUS.Arcanista.ConhecidasInfo", { n: m.conhecidas, limite: m.limite })} · ${loc("ICARUS.Anatema.ListaSangue")} · CD ${cdDoAnatema(actor)}` : loc("ICARUS.Anatema.SemPalavras") });
  return linhas;
});
