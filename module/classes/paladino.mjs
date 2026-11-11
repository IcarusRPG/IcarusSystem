/**
 * Paladino:
 * - Fé Jurada (1º, permanente): a mesma tela do Clérigo; recebe 2 dos 3 Poderes Concedidos, à
 *   escolha (module/classes/clerigo.mjs → jurarDivindade). Palavra Empenhada na aba Classe; a
 *   violação usa o mesmo botão "Agir contra um Dogma" do Clérigo.
 * - Punição Consagrada (1º): no card de ataque corpo a corpo, botão para gastar PM depois do acerto
 *   (limite 1/2/3/4/5 pelo nível, +1 contra a sentenciada, sem limite na Hora Final): +1d6 de
 *   Essência por PM (d8 contra mortos-vivos; Lâmina de Essência d8/d10; Golpe Final +1d6).
 *   No mesmo card: Carga Fulgurante (+2d6, 2 PM) e o Veredito pendente (+5d6).
 * - Toque Restaurador (2º): Nd8 + Carisma no alvo marcado (ou em você), 2 PM (1 com Mãos Abertas);
 *   uma vez por cena por criatura (flags.toqueRestauradorCena); Alívio Imediato, Remédio dos Fiéis,
 *   Mãos Largas, Aliado Primeiro e Chama Persistente como opções do diálogo.
 * - Voto (3º, permanente): Muralha, Mão Aberta ou Sentença (flags.voto); habilidades e poderes do
 *   Voto só para ele. Muralha Inquebrável (RD 5 e +2 Defesa nos aliados), Aurora de Esperança,
 *   Olhar do Juiz (flags.sentenciada; +1 no ataque contra ela), Dívida Paga, Veredito.
 * - Aura de Resguardo (5º): informação na ficha e interruptor "aura aplicada" (efeito no Paladino).
 * - Coragem Inabalável (10º): Abalado e Apavorado não pegam no Paladino.
 * - Hora Final (20º): 1/dia, 10 PM: +2 ataque e Defesa, RD 5, Punição sem limite, fica em 1 PV na
 *   primeira vez que cairia a 0; ao fim da cena, Fatigado.
 * - Preces de Guerra: única forma de lançar magias (2 Divinas por escolha, até o 4º nível, CD de Carisma).
 * - Fé Marcial (Carisma no ataque e dano corpo a corpo), Retribuição (só contra a criatura marcada),
 *   Corpo Escudo (reduz o próximo dano em 1 + nível), Fôlego da Fé (cura só o Paladino).
 */
import { SISTEMA_ID } from "../config.mjs";
import { pmDisponivel, gastoDePM } from "../pm-gasto.mjs";
import { temHabilidadeNosItens } from "../classes-dados.mjs";
import { classeDoAtor, ACOES_DE_MECANICA, concederHabilidades } from "../classes.mjs";
import { usarPoder, GANCHOS_DE_PODER } from "../acoes.mjs";
import { APOS_CAMINHO } from "../escolhas.mjs";
import { FIM_DA_CENA, aplicarCondicao, removerCondicao } from "../condicoes-foundry.mjs";
import { registrarLinhas, itemDeClasse, avisarNoChat, USO_PROPRIO } from "./comum.mjs";
import { calcularCD, calcularAtaque } from "../combate.mjs";
import { PROVEDORES_ATAQUE, MODIFICADORES_ATAQUE, itensDoAtor } from "../combate-chat.mjs";
import { rolarDanoAvulso, ABSORVEDORES_DE_DANO, AO_SOFRER_DANO } from "../dano.mjs";
import { mudancasParaEfeito, motivoParaNaoAprender, limiteDeMagiasDoPaladino, nivelMaximoDaClasse } from "../magias-dados.mjs";
import { divindadePorId } from "../panteao.mjs";
import { CONDICAO_POR_ID } from "../condicoes.mjs";
import { limiteDaPunicao, planoDaPunicao, planoDoToque, CONDICOES_DO_ALIVIO, jaCuradoNaCena, bonusDaAura, raioDaAura, reducaoDoCorpoEscudo, pvDaHoraFinal } from "../paladino-dados.mjs";

const F = SISTEMA_ID;
const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);
const esc = t => Handlebars.escapeExpression(t ?? "");
const { DialogV2 } = foundry.applications.api;

export const ehPaladino = actor => classeDoAtor(actor)?.id === "paladino";
const tem = (actor, id) => temHabilidadeNosItens([...(actor.items ?? [])], "paladino", id);
const carisma = actor => Math.trunc(Number(actor.system.atributos?.CAR?.total) || 0);
const cdDoPaladino = actor => calcularCD(actor.system, "CAR").cd;
const alvoMarcado = () => [...(game.user.targets ?? [])][0] ?? null;
const VOTOS = ["muralha", "mao-aberta", "sentenca"];
const umaVez = (actor, flag) => {
  if (actor.getFlag(F, flag)) { ui.notifications.warn(loc("ICARUS.Clerigo.UmaVezPorCena")); return false; }
};

// Botão próprio, no card do ataque, no Toque ou automático: sem o "Usar" genérico (custo do JSON seria cobrado à toa)
for (const id of ["toque-restaurador", "retribuicao", "maos-abertas", "alivio-imediato", "remedio-dos-fieis", "carga-fulgurante", "divida-paga", "cadeia-de-sentencas"]) USO_PROPRIO.add(`paladino__${id}`);

/** Gasta PM (já confirmado); false se faltar. */
async function gastarPM(actor, pm) {
  if (pm > pmDisponivel(actor)) { ui.notifications.warn(fmt("ICARUS.Poderes.SemPM", { nome: actor.name, pm, atual: pmDisponivel(actor) })); return false; }
  if (pm) await actor.update(gastoDePM(actor, pm));
  return true;
}

/** Efeito no próprio Paladino até o fim da cena (sai em "Encerrar cena"). */
async function efeitoProprio(actor, { id, nome, img, mudancas, duracao = "cena" }) {
  const { changes } = mudancasParaEfeito(mudancas);
  return actor.createEmbeddedDocuments("ActiveEffect", [{ name: nome, img: img ?? actor.img, changes, transfer: false,
    flags: { [F]: { duracao, paladino: id } } }]);
}

/** Cartão com "Aplicar efeito" para os aliados (module/magias-efeitos.mjs). */
function cartaoDeEfeito(actor, { id, nome, img, texto, efeito }) {
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="icarus-rolagem icarus-lembrete"><p class="condicao-descricao">${esc(texto)}</p></div>`,
    flags: { [F]: { magia: { id, itemUuid: actor.uuid, actorUuid: actor.uuid, nome, img: img ?? actor.img, efeitos: [efeito] }, efeitosAplicados: [] } }
  });
}

/* ---------------- Voto ---------------- */

APOS_CAMINHO.set("voto", async (actor, i) => {
  if (!ehPaladino(actor)) return;
  await actor.setFlag(F, "voto", VOTOS[i] ?? null);
  await concederHabilidades(actor);
});

/* ---------------- Sentenciada e marca ---------------- */

const sentenciadaDe = actor => actor.getFlag(F, "sentenciada") ?? null;
const contraSentenciada = (actor, alvo) => !!alvo && sentenciadaDe(actor)?.uuid === (alvo.token?.actor?.uuid ?? alvo.actor?.uuid);

GANCHOS_DE_PODER.set("paladino__olhar-do-juiz", {
  antes: () => {
    if (!alvoMarcado()?.actor) { ui.notifications.warn(loc("ICARUS.Paladino.MarqueAlvo")); return false; }
  },
  depois: async actor => {
    const alvo = alvoMarcado();
    await actor.setFlag(F, "sentenciada", { uuid: alvo.actor.uuid, nome: alvo.name });
    await avisarNoChat(actor, fmt("ICARUS.Paladino.SentenciouChat", { nome: actor.name, alvo: alvo.name }));
    if (tem(actor, "olhar-sem-piedade")) {
      await cartaoDeEfeito(actor, { id: "olhar-sem-piedade", nome: loc("ICARUS.Paladino.OlharSemPiedade"), texto: fmt("ICARUS.Paladino.OlharSemPiedadeChat", { alvo: alvo.name, cd: cdDoPaladino(actor) }),
        efeito: { tipo: "efeito", alvo: "inimigo", duracao: { tipo: "cena" }, condicoes: ["abalado"], resistencia: { atributo: "vontade", efeito: "anula" } } });
    }
  }
});

// Dívida Paga e Cadeia de Sentenças: a sentenciada caiu a 0 PV
AO_SOFRER_DANO.push(async alvo => {
  if ((alvo.system?.pv?.value ?? 1) > 0) return;
  for (const pal of game.actors ?? []) {
    if (!ehPaladino(pal) || sentenciadaDe(pal)?.uuid !== alvo.uuid) continue;
    const textos = [fmt("ICARUS.Paladino.SentenciadaCaiu", { nome: pal.name, alvo: alvo.name })];
    if (tem(pal, "divida-paga")) {
      if (pal.isOwner) await pal.update({ "system.pm.value": Math.min(pal.system.pm.max, pal.system.pm.value + 2) });
      textos.push(loc("ICARUS.Paladino.DividaPaga"));
    }
    if (tem(pal, "cadeia-de-sentencas")) textos.push(loc("ICARUS.Paladino.Cadeia"));
    if (pal.isOwner) await pal.unsetFlag(F, "sentenciada");
    await avisarNoChat(pal, textos.join(" "));
  }
});

// Retribuição: marcar (ação de movimento, 1 PM) e reagir só contra a marcada
ACOES_DE_MECANICA.set("paladino:marcar", async actor => {
  const alvo = alvoMarcado();
  if (!alvo?.actor) return ui.notifications.warn(loc("ICARUS.Paladino.MarqueAlvo"));
  const ok = await DialogV2.confirm({ window: { title: loc("ICARUS.Paladino.Marcar") },
    content: `<div class="icarus-uso"><p>${esc(fmt("ICARUS.Paladino.MarcarTexto", { alvo: alvo.name }))}</p></div>`, rejectClose: false });
  if (!ok || !(await gastarPM(actor, 1))) return;
  await actor.setFlag(F, "marca", { uuid: alvo.actor.uuid, nome: alvo.name });
  return avisarNoChat(actor, fmt("ICARUS.Paladino.MarcouChat", { nome: actor.name, alvo: alvo.name }));
});
ACOES_DE_MECANICA.set("paladino:retribuicao", actor => {
  const item = itemDeClasse(actor, "paladino", "retribuicao");
  return item ? usarPoder(actor, item, { custo: 0 }) : null;
});
GANCHOS_DE_PODER.set("paladino__retribuicao", {
  antes: actor => {
    if (!actor.getFlag(F, "marca")) { ui.notifications.warn(loc("ICARUS.Paladino.SemMarca")); return false; }
  },
  depois: actor => rolarDanoAvulso({ partes: [{ formula: `1d8 + ${carisma(actor)}`, tipo: "essencia" }], titulo: fmt("ICARUS.Paladino.RetribuicaoTitulo", { alvo: actor.getFlag(F, "marca").nome }), img: actor.img, actor })
});

/* ---------------- Punição Consagrada, Carga Fulgurante e Veredito (card de ataque) ---------------- */

async function punicao(actor, mensagem) {
  const hora = actor.getFlag(F, "horaFinal")?.ativa;
  const alvo = alvoMarcado();
  const sent = contraSentenciada(actor, alvo);
  const limite = limiteDaPunicao(actor.system.nivel, { sentenciada: sent, horaFinal: hora });
  const golpeFinal = tem(actor, "golpe-final") && sent && (alvo.actor.system.pv?.value ?? 0) < (alvo.actor.system.pv?.max ?? 0) / 2;
  const r = await DialogV2.wait({
    window: { title: loc("ICARUS.Paladino.Punicao") },
    content: `<div class="icarus-uso"><p>${esc(limite === null ? loc("ICARUS.Paladino.PunicaoSemLimite") : fmt("ICARUS.Paladino.PunicaoTexto", { limite }))}</p>
      <label class="linha">${esc(loc("ICARUS.Poderes.CustoPM"))} <input type="number" name="pm" value="${Math.min(limite ?? 1, actor.system.pm.value) || 1}" min="1" ${limite === null ? "" : `max="${limite}"`} step="1" autofocus></label>
      <label class="chk"><input type="checkbox" name="mortoVivo"> ${esc(loc("ICARUS.Paladino.MortoVivo"))}</label>
      ${golpeFinal ? `<p class="dica">${esc(loc("ICARUS.Paladino.GolpeFinal"))}</p>` : ""}
      <p class="dica">${esc(fmt("ICARUS.Poderes.PMAtual", { pm: actor.system.pm.value, max: actor.system.pm.max }))}</p></div>`,
    buttons: [
      { action: "ok", label: loc("ICARUS.Poderes.Usar"), default: true, callback: (ev, b) => ({ pm: Number(b.form.elements.pm.value), mortoVivo: !!b.form.elements.mortoVivo.checked }) },
      { action: "cancelar", label: loc("ICARUS.Testes.Cancelar") }
    ],
    rejectClose: false
  });
  if (!r || typeof r !== "object") return false;
  const plano = planoDaPunicao(r.pm, actor.system.nivel, { sentenciada: sent, horaFinal: hora, mortoVivo: r.mortoVivo, lamina: tem(actor, "lamina-de-essencia"), golpeFinal });
  if (!(await gastarPM(actor, plano.pm))) return false;
  await rolarDanoAvulso({ partes: plano.partes, titulo: `${loc("ICARUS.Paladino.Punicao")} (${loc("ICARUS.Paladino.DanoExtra")})`, img: actor.img, actor });
  return true;
}

async function cargaFulgurante(actor) {
  if (!(await gastarPM(actor, 2))) return false;
  await rolarDanoAvulso({ partes: [{ formula: "2d6", tipo: "essencia" }], titulo: `${loc("ICARUS.Paladino.Carga")} (${loc("ICARUS.Paladino.DanoExtra")})`, img: actor.img, actor });
  return true;
}

async function veredito(actor) {
  await actor.unsetFlag(F, "vereditoPendente");
  await rolarDanoAvulso({ partes: [{ formula: "5d6", tipo: "essencia" }], titulo: `${loc("ICARUS.Paladino.Veredito")} (${loc("ICARUS.Paladino.DanoExtra")})`, img: actor.img, actor });
  return true;
}

const BOTOES_DO_ATAQUE = [
  { id: "punicao", rotulo: "ICARUS.Paladino.Punicao", mostra: a => tem(a, "punicao-consagrada"), fn: punicao },
  { id: "carga", rotulo: "ICARUS.Paladino.CargaBotao", mostra: a => tem(a, "carga-fulgurante"), fn: cargaFulgurante },
  { id: "veredito", rotulo: "ICARUS.Paladino.VereditoBotao", mostra: a => !!a.getFlag(F, "vereditoPendente"), fn: veredito }
];

function aoRenderizar(mensagem, html) {
  const atq = mensagem.flags?.[F]?.ataque;
  if (!atq || atq.modo !== "corpo-a-corpo") return;
  const actor = fromUuidSync(atq.actorUuid);
  if (!actor || !ehPaladino(actor) || !actor.isOwner) return;
  const botoes = BOTOES_DO_ATAQUE.filter(b => b.mostra(actor));
  if (!botoes.length) return;
  const raiz = html instanceof HTMLElement ? html : html?.[0];
  const conteudo = raiz?.querySelector(".message-content");
  if (!conteudo) return;
  const usados = mensagem.flags?.[F]?.paladinoUsados ?? [];
  const caixa = document.createElement("div");
  caixa.className = "icarus-aplicar icarus-paladino";
  for (const b of botoes) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "btn";
    el.textContent = loc(b.rotulo);
    el.disabled = usados.includes(b.id);
    el.addEventListener("click", async () => {
      el.disabled = true;
      const ok = await b.fn(actor, mensagem);
      if (!ok) { el.disabled = false; return; }
      if (mensagem.isOwner) await mensagem.setFlag(F, "paladinoUsados", [...usados, b.id]);
    });
    caixa.appendChild(el);
  }
  conteudo.appendChild(caixa);
}

/* ---------------- Ataque: Fé Marcial, sentenciada, Último Aviso ---------------- */

PROVEDORES_ATAQUE.push((actor, item, modo) => {
  if (!ehPaladino(actor) || modo !== "corpo-a-corpo" || item?.type !== "arma" || !tem(actor, "fe-marcial")) return null;
  return { id: "fe-marcial", titulo: loc("ICARUS.Paladino.FeMarcial"),
    campos: [{ tipo: "checkbox", nome: "feMarcial", valor: true, rotulo: fmt("ICARUS.Paladino.FeMarcialRotulo", { car: carisma(actor) }) }] };
});

MODIFICADORES_ATAQUE.push(async ({ actor, item, modo, opcoes, alvos }) => {
  if (!ehPaladino(actor)) return null;
  const r = { bonus: 0, linhas: [], extrasDano: [] };
  // Fé Marcial: Carisma no lugar do atributo (armas em que é proficiente)
  if (opcoes.feMarcial && modo === "corpo-a-corpo" && tem(actor, "fe-marcial")) {
    const s = actor.system;
    const atq = calcularAtaque(s, item.system, modo, itensDoAtor(actor));
    if (atq.proficiente) {
      const usado = atq.agil ? s.atributos.DES.total : s.atributos[s.pericias[atq.pericia]?.atributo]?.total ?? 0;
      r.bonus += carisma(actor) - usado;
      r.atributoDano = "CAR";
      r.linhas.push(loc("ICARUS.Paladino.FeMarcialLinha"));
    }
  }
  // Contra a sentenciada: +1 no ataque; Último Aviso: +4 no dano no primeiro ataque contra CADA
  // sentenciada na cena (flags.ultimoAvisoUsado = uuids; volta a zero no fim da cena)
  if (contraSentenciada(actor, alvos?.[0])) {
    r.bonus += 1;
    r.linhas.push(loc("ICARUS.Paladino.ContraSentenciada"));
    const uuid = sentenciadaDe(actor).uuid;
    const usados = Array.isArray(actor.getFlag(F, "ultimoAvisoUsado")) ? actor.getFlag(F, "ultimoAvisoUsado") : [];
    if (tem(actor, "ultimo-aviso") && !usados.includes(uuid)) {
      r.extrasDano.push({ rotulo: loc("ICARUS.Paladino.UltimoAviso"), formula: "4", naoMultiplica: true });
      await actor.setFlag(F, "ultimoAvisoUsado", [...usados, uuid]);
    }
  }
  return r.bonus || r.linhas.length || r.extrasDano.length ? r : null;
});

/* ---------------- Toque Restaurador e Aurora de Esperança ---------------- */

ACOES_DE_MECANICA.set("paladino:toque", async actor => {
  const item = itemDeClasse(actor, "paladino", "toque-restaurador");
  if (!item) return;
  const alvo = alvoMarcado()?.actor ?? actor;
  const nomeAlvo = alvoMarcado()?.name ?? actor.name;
  const curados = actor.getFlag(F, "toqueRestauradorCena") ?? [];
  if (jaCuradoNaCena(curados, alvo.uuid)) {
    const ok = await DialogV2.confirm({ window: { title: item.name },
      content: `<div class="icarus-uso"><p class="aviso">${esc(fmt("ICARUS.Paladino.ToqueRepetido", { alvo: nomeAlvo }))}</p></div>`, rejectClose: false });
    if (!ok) return;
  }
  const opc = { maosAbertas: tem(actor, "maos-abertas"), alivio: tem(actor, "alivio-imediato"), remedio: tem(actor, "remedio-dos-fieis") };
  const base = planoDoToque(actor.system.nivel, carisma(actor), { maosAbertas: opc.maosAbertas });
  const r = await DialogV2.wait({
    window: { title: item.name },
    content: `<div class="icarus-uso"><p>${esc(fmt("ICARUS.Paladino.ToqueTexto", { alvo: nomeAlvo, formula: base.formula, pm: base.custo, alcance: loc(tem(actor, "maos-largas") ? "ICARUS.Paladino.AlcanceCurto" : "ICARUS.Paladino.AlcanceToque") }))}</p>
      ${opc.alivio ? `<label class="linha">${esc(loc("ICARUS.Paladino.Alivio"))} <select name="alivio"><option value=""></option>${CONDICOES_DO_ALIVIO.map(c => `<option value="${c}">${esc(CONDICAO_POR_ID[c]?.nome ?? c)}</option>`).join("")}</select></label>` : ""}
      ${opc.remedio ? `<label class="chk"><input type="checkbox" name="remedio"> ${esc(loc("ICARUS.Paladino.Remedio"))}</label>` : ""}
      <p class="dica">${esc(fmt("ICARUS.Poderes.PMAtual", { pm: actor.system.pm.value, max: actor.system.pm.max }))}</p></div>`,
    buttons: [
      { action: "ok", label: loc("ICARUS.Poderes.Usar"), default: true, callback: (ev, b) => ({ alivio: b.form.elements.alivio?.value || "", remedio: !!b.form.elements.remedio?.checked }) },
      { action: "cancelar", label: loc("ICARUS.Testes.Cancelar") }
    ],
    rejectClose: false
  });
  if (!r || typeof r !== "object") return;
  const plano = planoDoToque(actor.system.nivel, carisma(actor), { maosAbertas: opc.maosAbertas, alivio: !!r.alivio, remedio: r.remedio });
  if (!(await gastarPM(actor, plano.custo))) return;
  await actor.setFlag(F, "toqueRestauradorCena", [...new Set([...curados, alvo.uuid])]);
  await rolarDanoAvulso({ formula: plano.formula, cura: true, alvoUuid: alvo.uuid, titulo: fmt("ICARUS.Paladino.ToqueTitulo", { alvo: nomeAlvo }), img: item.img, actor });
  const extras = [];
  if (r.alivio) {
    if (alvo.isOwner) await removerCondicao(alvo, r.alivio);
    extras.push(fmt("ICARUS.Paladino.AlivioChat", { alvo: nomeAlvo, condicao: CONDICAO_POR_ID[r.alivio]?.nome ?? r.alivio }));
  }
  if (alvo !== actor && tem(actor, "aliado-primeiro")) extras.push(fmt("ICARUS.Paladino.AliadoPrimeiroChat", { alvo: nomeAlvo }));
  if (tem(actor, "chama-persistente")) extras.push(fmt("ICARUS.Paladino.ChamaPersistenteChat", { alvo: nomeAlvo }));
  if (extras.length) await avisarNoChat(actor, extras.join(" "));
});

GANCHOS_DE_PODER.set("paladino__aurora-de-esperanca", {
  antes: actor => umaVez(actor, "auroraUsada"),
  depois: async actor => {
    await actor.setFlag(F, "auroraUsada", true);
    const formula = planoDoToque(actor.system.nivel, carisma(actor)).formula;
    const alvos = [...(game.user.targets ?? [])].filter(t => t.actor);
    for (const t of alvos.length ? alvos : [{ actor, name: actor.name }]) {
      await rolarDanoAvulso({ formula, cura: true, alvoUuid: t.actor.uuid, titulo: fmt("ICARUS.Paladino.ToqueTitulo", { alvo: t.name }), img: actor.img, actor });
    }
    return avisarNoChat(actor, fmt("ICARUS.Paladino.AuroraChat", { nome: actor.name }));
  }
});

/* ---------------- Muralha Inquebrável, Veredito, Hora Final ---------------- */

GANCHOS_DE_PODER.set("paladino__muralha-inquebravel", {
  antes: actor => umaVez(actor, "muralhaUsada"),
  depois: async (actor, item) => {
    await actor.setFlag(F, "muralhaUsada", true);
    await efeitoProprio(actor, { id: "muralha-inquebravel", nome: item.name, img: item.img, mudancas: [{ chave: "rd", valor: 5 }] });
    return cartaoDeEfeito(actor, { id: "muralha-inquebravel", nome: item.name, img: item.img, texto: fmt("ICARUS.Paladino.MuralhaChat", { nome: actor.name }),
      efeito: { tipo: "efeito", alvo: "aliados", duracao: { tipo: "cena" }, mudancas: [{ chave: "defesa", valor: 2, modo: "somar" }] } });
  }
});

GANCHOS_DE_PODER.set("paladino__veredito", {
  antes: actor => {
    if (!sentenciadaDe(actor)) { ui.notifications.warn(loc("ICARUS.Paladino.SemSentenciada")); return false; }
    return umaVez(actor, "vereditoUsado");
  },
  depois: async actor => {
    await actor.update({ [`flags.${F}.vereditoUsado`]: true, [`flags.${F}.vereditoPendente`]: true });
    return avisarNoChat(actor, fmt("ICARUS.Paladino.VereditoChat", { nome: actor.name, alvo: sentenciadaDe(actor).nome }));
  }
});

GANCHOS_DE_PODER.set("paladino__hora-final", {
  antes: actor => {
    if (actor.getFlag(F, "horaFinalDia")) { ui.notifications.warn(loc("ICARUS.Paladino.HoraFinalDia")); return false; }
  },
  depois: async (actor, item) => {
    await actor.update({ [`flags.${F}.horaFinalDia`]: true, [`flags.${F}.horaFinal`]: { ativa: true, salvou: false } });
    await efeitoProprio(actor, { id: "hora-final", nome: item.name, img: item.img,
      mudancas: [{ chave: "ataque", valor: 2 }, { chave: "defesa", valor: 2 }, { chave: "rd", valor: 5 }] });
    return avisarNoChat(actor, fmt("ICARUS.Paladino.HoraFinalChat", { nome: actor.name }));
  }
});

/* ---------------- Reações e poderes simples ---------------- */

GANCHOS_DE_PODER.set("paladino__corpo-escudo", {
  antes: actor => umaVez(actor, "corpoEscudoUsado"),
  depois: async actor => {
    const valor = reducaoDoCorpoEscudo(actor.system.nivel);
    await actor.update({ [`flags.${F}.corpoEscudoUsado`]: true, [`flags.${F}.corpoEscudo`]: valor });
    return avisarNoChat(actor, fmt("ICARUS.Paladino.CorpoEscudoChat", { nome: actor.name, valor }));
  }
});
ABSORVEDORES_DE_DANO.push(async (alvo, actor) => {
  const valor = Number(actor.getFlag?.(F, "corpoEscudo")) || 0;
  if (!valor) return null;
  await actor.unsetFlag(F, "corpoEscudo");
  return { absorvido: valor, texto: loc("ICARUS.Paladino.CorpoEscudo") };
});

GANCHOS_DE_PODER.set("paladino__folego-da-fe", {
  antes: actor => umaVez(actor, "folegoUsado"),
  depois: async actor => {
    await actor.setFlag(F, "folegoUsado", true);
    const roll = await new Roll(`1d8 + ${actor.system.nivel}`).evaluate();
    const pv = actor.system.pv;
    await actor.update({ "system.pv.value": Math.min(pv.max, pv.value + roll.total) });
    return avisarNoChat(actor, fmt("ICARUS.Paladino.FolegoChat", { nome: actor.name, valor: roll.total }), { rolls: [roll] });
  }
});

for (const [id, formula] of [["bencao-fortalecedora", a => `1d8 + ${carisma(a)}`], ["vigilia-de-cabeceira", a => `${a.system.nivel}`]]) {
  GANCHOS_DE_PODER.set(`paladino__${id}`, {
    depois: async actor => {
      const roll = await new Roll(formula(actor)).evaluate();
      return avisarNoChat(actor, fmt("ICARUS.Paladino.PVTemporarios", { nome: actor.name, valor: roll.total, alvo: alvoMarcado()?.name ?? loc("ICARUS.Nobre.UmAliado") }), { rolls: [roll] });
    }
  });
}

/* ---------------- Aura de Resguardo ---------------- */

ACOES_DE_MECANICA.set("paladino:aura", async actor => {
  const atual = actor.effects.find(e => e.flags?.[F]?.paladino === "aura-de-resguardo");
  if (atual) return atual.delete();
  return efeitoProprio(actor, { id: "aura-de-resguardo", nome: loc("ICARUS.Paladino.Aura"), mudancas: [{ chave: "resistencia", valor: bonusDaAura(actor.system.nivel) }], duracao: "remover" });
});

/* ---------------- Preces de Guerra ---------------- */

/** Limite e quantas magias o Paladino conhece (0 sem Preces de Guerra). */
export function magiasDoPaladino(actor) {
  const preces = actor.items.filter(i => i.flags?.[F]?.id === "paladino__preces-de-guerra" && i.flags?.[F]?.magiasExtras).length;
  return { conhecidas: actor.items.filter(i => i.type === "magia").length, limite: limiteDeMagiasDoPaladino(preces), preces };
}

/* ---------------- Fim da cena ---------------- */

FIM_DA_CENA.push(async actor => {
  if (!ehPaladino(actor)) return;
  for (const k of ["toqueRestauradorCena", "muralhaUsada", "auroraUsada", "vereditoUsado", "vereditoPendente", "corpoEscudoUsado", "corpoEscudo", "folegoUsado", "ultimoAvisoUsado", "sentenciada", "marca"]) {
    if (actor.getFlag(F, k) !== undefined) await actor.unsetFlag(F, k);
  }
  if (actor.getFlag(F, "horaFinal")?.ativa) {
    await actor.unsetFlag(F, "horaFinal");
    await aplicarCondicao(actor, "fatigado", { origem: loc("ICARUS.Paladino.HoraFinal") });
    await avisarNoChat(actor, fmt("ICARUS.Paladino.HoraFinalFim", { nome: actor.name }));
  }
});

/* ---------------- Hooks ---------------- */

Hooks.once("init", () => {
  if ((game.release?.generation ?? 12) >= 13) Hooks.on("renderChatMessageHTML", aoRenderizar);
  else Hooks.on("renderChatMessage", aoRenderizar);
  // Preces de Guerra: sem o poder não aprende magias; com ele, Divinas até o 4º nível pela tabela do Paladino
  Hooks.on("preCreateItem", (item, dados, opcoes, userId) => {
    const actor = item.parent;
    if (userId !== game.user.id || item.type !== "magia" || !actor || !ehPaladino(actor)) return;
    const m = magiasDoPaladino(actor);
    const motivo = !m.preces ? { chave: "ICARUS.Paladino.SemPreces", dados: {} }
      : motivoParaNaoAprender(item.system, { nivel: actor.system.nivel, tradicao: "divina", conhecidas: m.conhecidas, limite: m.limite, max: nivelMaximoDaClasse("paladino", actor.system.nivel) });
    if (!motivo) return;
    const texto = fmt(motivo.chave, motivo.dados);
    if (game.user.isGM) { ui.notifications.warn(fmt("ICARUS.Magias.Conhecidas.Mestre", { motivo: texto })); return; }
    ui.notifications.warn(texto);
    return false;
  });
  // Coragem Inabalável: imune a Abalado e Apavorado
  Hooks.on("preCreateActiveEffect", (efeito, dados, opcoes, userId) => {
    const actor = efeito.parent;
    if (userId !== game.user.id || !actor || !ehPaladino(actor) || !tem(actor, "coragem-inabalavel")) return;
    const st = [...(efeito.statuses ?? dados.statuses ?? [])];
    if (!st.some(s => s === "abalado" || s === "apavorado")) return;
    ui.notifications.info(fmt("ICARUS.Paladino.Imune", { nome: actor.name }));
    return false;
  });
  // Hora Final: a primeira vez que os PV chegariam a 0, ficam em 1
  Hooks.on("preUpdateActor", (actor, mudancas, opcoes, userId) => {
    if (userId !== game.user.id) return;
    const novo = foundry.utils.getProperty(mudancas, "system.pv.value");
    if (novo === undefined) return;
    const pv = pvDaHoraFinal(novo, actor.getFlag?.(F, "horaFinal"));
    if (pv === null) return;
    foundry.utils.setProperty(mudancas, "system.pv.value", pv);
    foundry.utils.setProperty(mudancas, `flags.${F}.horaFinal.salvou`, true);
    ui.notifications.info(fmt("ICARUS.Paladino.HoraFinalSalvou", { nome: actor.name }));
  });
});

/* ---------------- Aba Classe ---------------- */

registrarLinhas("paladino", actor => {
  const linhas = [];
  const div = divindadePorId(actor.system.identidade.divindade);
  const anatema = !!actor.getFlag(F, "anatema");
  if (anatema) linhas.push({ id: "paladino:anatema", rotulo: loc("ICARUS.Clerigo.Anatema"), info: loc("ICARUS.Clerigo.AnatemaInfo") });
  else if (div) {
    linhas.push({ id: "paladino:divindade", rotulo: fmt("ICARUS.Clerigo.Divindade", { divindade: div.nome }), info: div.dogma });
    const concedidos = actor.items.filter(i => i.flags?.[F]?.concedido && i.flags[F].divindade === div.id).length;
    if (concedidos < 2) linhas.push({ id: "devocao:concedidos", rotulo: loc("ICARUS.Paladino.EscolherConcedidos"), botao: true, ativo: true, info: fmt("ICARUS.Paladino.ConcedidosInfo", { n: concedidos }) });
  }
  if (tem(actor, "fe-jurada")) linhas.push({ id: "paladino:palavra", rotulo: loc("ICARUS.Paladino.Palavra"), info: loc("ICARUS.Paladino.PalavraInfo") });
  const dogma = actor.getFlag(F, "dogma");
  if (dogma?.bloqueioPMDias) linhas.push({ id: "paladino:bloqueio", rotulo: loc("ICARUS.Clerigo.Bloqueio"), info: fmt("ICARUS.Clerigo.BloqueioInfo", { dias: dogma.bloqueioPMDias }) });
  if (game.user.isGM && !anatema && tem(actor, "fe-jurada")) linhas.push({ id: "clerigo:dogma", rotulo: loc("ICARUS.Clerigo.Dogma"), botao: true, info: fmt("ICARUS.Clerigo.DogmaInfo", { n: dogma?.violacoes ?? 0 }) });
  if (game.user.isGM && (dogma?.bloqueioPMDias || actor.getFlag(F, "horaFinalDia"))) linhas.push({ id: "clerigo:dia", rotulo: loc("ICARUS.Clerigo.PassouDia"), botao: true });
  const voto = actor.getFlag(F, "voto");
  if (voto) linhas.push({ id: "paladino:voto", rotulo: loc("ICARUS.Paladino.Voto"), info: loc(`ICARUS.Paladino.Votos.${voto}`) });
  if (tem(actor, "punicao-consagrada")) {
    const lim = limiteDaPunicao(actor.system.nivel, { horaFinal: actor.getFlag(F, "horaFinal")?.ativa });
    linhas.push({ id: "paladino:punicao", rotulo: loc("ICARUS.Paladino.Punicao"), info: lim === null ? loc("ICARUS.Paladino.PunicaoSemLimite") : fmt("ICARUS.Paladino.PunicaoInfo", { limite: lim }) });
  }
  if (tem(actor, "toque-restaurador")) {
    const p = planoDoToque(actor.system.nivel, carisma(actor), { maosAbertas: tem(actor, "maos-abertas") });
    linhas.push({ id: "paladino:toque", rotulo: loc("ICARUS.Paladino.Toque"), botao: true, info: `${p.formula} · ${p.custo} PM` });
  }
  if (tem(actor, "aura-de-resguardo")) {
    const ativa = actor.effects.some(e => e.flags?.[F]?.paladino === "aura-de-resguardo");
    linhas.push({ id: "paladino:aura", rotulo: loc(ativa ? "ICARUS.Paladino.AuraAtiva" : "ICARUS.Paladino.AuraLigar"), botao: true, ativo: ativa,
      info: fmt("ICARUS.Paladino.AuraInfo", { bonus: bonusDaAura(actor.system.nivel), raio: raioDaAura(tem(actor, "aura-alargada")) }) + (tem(actor, "coragem-inabalavel") ? ` · ${loc("ICARUS.Paladino.CoragemInfo")}` : "") });
  }
  const sent = sentenciadaDe(actor);
  if (sent) linhas.push({ id: "paladino:sentenciada", rotulo: loc("ICARUS.Paladino.Sentenciada"), info: sent.nome });
  if (actor.getFlag(F, "vereditoPendente")) linhas.push({ id: "paladino:veredito", rotulo: loc("ICARUS.Paladino.Veredito"), info: loc("ICARUS.Paladino.VereditoPendente") });
  if (itemDeClasse(actor, "paladino", "retribuicao")) {
    const marca = actor.getFlag(F, "marca");
    linhas.push({ id: "paladino:marcar", rotulo: loc("ICARUS.Paladino.Marcar"), botao: true, info: marca ? fmt("ICARUS.Paladino.MarcaInfo", { alvo: marca.nome }) : "1 PM" });
    linhas.push({ id: "paladino:retribuicao", rotulo: loc("ICARUS.Paladino.Retribuicao"), botao: true, desativado: !marca, info: marca ? `1d8 + ${carisma(actor)}` : loc("ICARUS.Paladino.SemMarca") });
  }
  if (actor.getFlag(F, "horaFinal")?.ativa) linhas.push({ id: "paladino:hora", rotulo: loc("ICARUS.Paladino.HoraFinal"), info: loc("ICARUS.Paladino.HoraFinalInfo") });
  const m = magiasDoPaladino(actor);
  linhas.push({ id: "paladino:magias", rotulo: loc("ICARUS.Arcanista.Conhecidas"),
    info: m.preces ? `${fmt("ICARUS.Arcanista.ConhecidasInfo", { n: m.conhecidas, limite: m.limite })} · ${loc("ICARUS.Clerigo.ListaDivina")} · CD ${cdDoPaladino(actor)}` : loc("ICARUS.Paladino.SemPreces") });
  return linhas;
});
