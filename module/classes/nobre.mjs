/**
 * Nobre:
 * - Postura Altiva (1º): Carisma no lugar da Destreza na Defesa (botão na aba Classe; flags.defesaAtributo).
 * - Dote (1º): R$ 1.500 uma vez (flags.dote), com confirmação ao receber a habilidade.
 * - Brio (1º): campo "PM de Brio" no diálogo de teste de perícia (module/rolls.mjs).
 * - Palavra Cortante (2º): 1 PM; rola o dano Psíquico NÃO LETAL (Aplicar dano = venceu, Metade =
 *   perdeu); o Mestre abre o Teste Oposto (Diplomacia/Intimidação × Vontade). A 0 PV o alvo se rende
 *   ou fica Apavorado e foge, sem ficar Morrendo (module/dano.mjs). Brado Tirânico: d8.
 * - Rendimentos (3º): uma vez por aventura (flags.rendimentos; o Mestre libera de novo):
 *   d20 + CAR + nível, em % da riqueza inicial do nível; confirma e soma às moedas.
 * - Brado de Comando (4º): PM até o Carisma; cartão com "Aplicar efeito" (+PM em todas as perícias por
 *   1 rodada) nos aliados marcados, com Voltar.
 * - Majestade (7º): 2 PM contra a criatura marcada, uma vez por cena por criatura
 *   (flags.majestade[tokenId], limpo no fim da cena/combate); Vontade contra 10 + ½ nível + CAR (+5 Coroação).
 * - Estandarte da Família: 2 PM; estado em flags.estandarte { ativo, pv, rd, defesa } e aviso no chat.
 * - Cofre da Família / Bolsa Aberta: ao usar um poder de Nobre, pagar PM com dinheiro (R$ 10 × nível,
 *   5 × com Bolsa Aberta), até o Carisma em PM por cena. Patrocinar, Dinheiro Resolve e Escolta
 *   Contratada cobram o dinheiro com confirmação. Saldo nunca fica negativo.
 * - Palavra de Encorajamento: 2 PM; o aliado marcado rola o próximo teste com vantagem.
 * - Escolta Contratada: ao pagar, fica ativa até o fim da aventura (flags.escolta; o Mestre dispensa).
 *   Uma vez por cena, quando o Nobre ou um aliado adjacente sofreria dano, absorve 3 × o nível
 *   automaticamente (module/dano.mjs → ABSORVEDORES_DE_DANO).
 */
import { SISTEMA_ID, PERICIAS } from "../config.mjs";
import { temHabilidadeNosItens } from "../classes-dados.mjs";
import { classeDoAtor, ACOES_DE_MECANICA, APOS_CONCEDER } from "../classes.mjs";
import { usarPoder, ANTES_DE_USAR, GANCHOS_DE_PODER, FIM_DO_COMBATE } from "../acoes.mjs";
import { FIM_DA_CENA } from "../condicoes-foundry.mjs";
import { registrarLinhas, itemDeClasse, avisarNoChat, USO_PROPRIO } from "./comum.mjs";
import { debitar, creditar, formatarPreco, CENTAVOS_POR_REAL } from "../moeda.mjs";
import { rolarDanoAvulso, ABSORVEDORES_DE_DANO } from "../dano.mjs";
import {
  VALOR_DOTE, valorDosRendimentos, riquezaInicial, danoDaPalavraCortante, cdDaMajestade, majestadeUsadaContra,
  maximoDoBrado, reaisPorPM, restanteDoCofre, custoEmDinheiro, estandarte, absorcaoDaEscolta
} from "../nobre-dados.mjs";

const F = SISTEMA_ID;
const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);
const esc = t => Handlebars.escapeExpression(t ?? "");
const reais = v => formatarPreco(v * CENTAVOS_POR_REAL);

const ehNobre = actor => classeDoAtor(actor)?.id === "nobre";
const tem = (actor, id) => temHabilidadeNosItens([...actor.items], "nobre", id);
const carisma = actor => Math.trunc(Number(actor.system.atributos?.CAR?.total) || 0);
const idDoPoder = item => String(item?.flags?.[F]?.id ?? "");

for (const id of ["palavra-cortante", "brado-de-comando", "majestade", "estandarte-da-familia"]) USO_PROPRIO.add(`nobre__${id}`);

/* ---------------- Dinheiro ---------------- */

/** Paga R$ das moedas do ator; false (com aviso) se faltar dinheiro. */
export async function pagarEmDinheiro(actor, valorReais) {
  const novas = debitar(actor._source.system.moedas, valorReais * CENTAVOS_POR_REAL);
  if (!novas) {
    ui.notifications.warn(fmt("ICARUS.Nobre.SemDinheiro", { nome: actor.name, valor: reais(valorReais) }));
    return false;
  }
  await actor.update({ "system.moedas": novas });
  return true;
}

/** Recebe R$ nas moedas do ator. */
export const receberDinheiro = (actor, valorReais) => actor.update({ "system.moedas": creditar(actor._source.system.moedas, valorReais * CENTAVOS_POR_REAL) });

const confirmar = (titulo, texto) => foundry.applications.api.DialogV2.confirm({
  window: { title: titulo }, content: `<div class="icarus-uso"><p>${esc(texto)}</p></div>`, rejectClose: false
});

// Antes de pagar um poder de Nobre: custo em dinheiro (com confirmação) e o Cofre da Família
ANTES_DE_USAR.push(async (actor, item, uso) => {
  if (!ehNobre(actor) || !idDoPoder(item).startsWith("nobre__")) return;
  const id = idDoPoder(item).split("__")[1];
  const nivel = actor.system.nivel;
  const valor = custoEmDinheiro(id, nivel);
  if (valor) {
    if (!(await confirmar(item.name, fmt("ICARUS.Nobre.PagarDinheiro", { valor: reais(valor), nome: item.name })))) return false;
    if (!(await pagarEmDinheiro(actor, valor))) return false;
  }
  uso.pmOriginal ??= uso.pm;
  if (uso.pm > 0 && tem(actor, "cofre-da-familia")) {
    const restante = restanteDoCofre(carisma(actor), actor.getFlag(F, "cofreNaCena"));
    if (!restante) return;
    const porPM = reaisPorPM(nivel, tem(actor, "bolsa-aberta"));
    const max = Math.min(uso.pm, restante);
    const n = await foundry.applications.api.DialogV2.wait({
      window: { title: loc("ICARUS.Nobre.Cofre") },
      content: `<div class="icarus-uso"><p>${esc(fmt("ICARUS.Nobre.CofreTexto", { porPM: reais(porPM), restante }))}</p>
        <label class="linha">${esc(loc("ICARUS.Nobre.CofrePM"))} <input type="number" name="n" value="0" min="0" max="${max}" step="1"></label></div>`,
      buttons: [
        { action: "ok", label: loc("ICARUS.Poderes.Usar"), default: true, callback: (ev, b) => Math.min(max, Math.max(0, Math.trunc(Number(b.form.elements.n.value) || 0))) },
        { action: "cancelar", label: loc("ICARUS.Testes.Cancelar") }
      ],
      rejectClose: false
    });
    if (n === null || n === "cancelar") return false;
    if (n > 0) {
      if (!(await pagarEmDinheiro(actor, n * porPM))) return false;
      await actor.setFlag(F, "cofreNaCena", (actor.getFlag(F, "cofreNaCena") ?? 0) + n);
      uso.pm -= n;
      uso.pagoComDinheiro = n;
    }
  }
});

/* ---------------- Dote ---------------- */

APOS_CONCEDER.set("dote", async actor => {
  if (!ehNobre(actor) || actor.getFlag(F, "dote")) return;
  if (!(await confirmar(loc("ICARUS.Nobre.Dote"), fmt("ICARUS.Nobre.DoteTexto", { valor: reais(VALOR_DOTE) })))) return;
  await receberDinheiro(actor, VALOR_DOTE);
  await actor.setFlag(F, "dote", true);
  await avisarNoChat(actor, fmt("ICARUS.Nobre.DoteChat", { nome: actor.name, valor: reais(VALOR_DOTE) }));
});
ACOES_DE_MECANICA.set("nobre:dote", actor => APOS_CONCEDER.get("dote")(actor));

/* ---------------- Postura Altiva ---------------- */

ACOES_DE_MECANICA.set("nobre:postura", actor => actor.setFlag(F, "defesaAtributo", actor.getFlag(F, "defesaAtributo") === "CAR" ? "DES" : "CAR"));

/* ---------------- Rendimentos ---------------- */

ACOES_DE_MECANICA.set("nobre:rendimentos", async actor => {
  if (actor.getFlag(F, "rendimentos")) return ui.notifications.warn(loc("ICARUS.Nobre.RendimentosUsados"));
  const nivel = actor.system.nivel;
  const roll = await new Roll("1d20 + @car + @nivel", { car: carisma(actor), nivel }).evaluate();
  const valor = valorDosRendimentos(roll.total, nivel);
  const texto = fmt("ICARUS.Nobre.RendimentosConta", { total: roll.total, riqueza: reais(riquezaInicial(nivel)), nivel, valor: reais(valor) });
  await avisarNoChat(actor, texto, { rolls: [roll] });
  if (!(await confirmar(loc("ICARUS.Nobre.Rendimentos"), `${texto} ${loc("ICARUS.Nobre.RendimentosConfirmar")}`))) return;
  await receberDinheiro(actor, valor);
  await actor.setFlag(F, "rendimentos", true);
});
ACOES_DE_MECANICA.set("nobre:rendimentos-liberar", actor => (game.user.isGM ? actor.unsetFlag(F, "rendimentos") : null));

/* ---------------- Palavra Cortante ---------------- */

ACOES_DE_MECANICA.set("nobre:palavra", async actor => {
  const item = itemDeClasse(actor, "nobre", "palavra-cortante");
  if (!item) return;
  const tiranico = tem(actor, "brado-tiranico");
  const escolha = await foundry.applications.api.DialogV2.wait({
    window: { title: item.name },
    content: `<div class="icarus-uso"><p>${esc(fmt("ICARUS.Nobre.PalavraTexto", { dano: danoDaPalavraCortante(actor.system.nivel) }))}</p>
      <label class="linha">${esc(loc("ICARUS.Nobre.Pericia"))} <select name="pericia">
        <option value="diplomacia">${esc(loc("ICARUS.Pericias.diplomacia"))}</option><option value="intimidacao">${esc(loc("ICARUS.Pericias.intimidacao"))}</option></select></label>
      ${tiranico ? `<label class="chk"><input type="checkbox" name="tiranico"> ${esc(loc("ICARUS.Nobre.Tiranico"))}</label>` : ""}</div>`,
    buttons: [
      { action: "ok", label: loc("ICARUS.Poderes.Usar"), default: true, callback: (ev, b) => ({ pericia: b.form.elements.pericia.value, tiranico: !!b.form.elements.tiranico?.checked }) },
      { action: "cancelar", label: loc("ICARUS.Testes.Cancelar") }
    ],
    rejectClose: false
  });
  if (!escolha?.pericia) return;
  const uso = await usarPoder(actor, item, { custo: 1 });
  if (!uso) return;
  await rolarDanoAvulso({
    partes: [{ formula: danoDaPalavraCortante(actor.system.nivel, { tiranico: escolha.tiranico }), tipo: "psiquico" }],
    titulo: `${item.name} (${loc(`ICARUS.Pericias.${escolha.pericia}`)})`, img: item.img, actor,
    flags: { naoLetal: { pericia: escolha.pericia } }
  });
  if (game.user.isGM) return game.icarus.testes.abrirOposto();
  return avisarNoChat(actor, fmt("ICARUS.Nobre.PalavraChat", { nome: actor.name, pericia: loc(`ICARUS.Pericias.${escolha.pericia}`) }));
});

/* ---------------- Brado de Comando ---------------- */

GANCHOS_DE_PODER.set("nobre__brado-de-comando", {
  antes: (actor, item, uso) => {
    const max = maximoDoBrado(carisma(actor), Infinity);
    if ((uso.pmOriginal ?? uso.pm) > max) { ui.notifications.warn(fmt("ICARUS.Nobre.BradoMax", { max })); return false; }
  },
  depois: async (actor, item, uso) => {
    const n = uso.pmOriginal ?? uso.pm;
    if (!n) return;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="icarus-rolagem icarus-lembrete"><p class="condicao-descricao">${esc(fmt("ICARUS.Nobre.BradoChat", { nome: actor.name, n }))}</p></div>`,
      flags: { [F]: { magia: {
        id: "brado-de-comando", itemUuid: item.uuid, actorUuid: actor.uuid, nome: item.name, img: item.img,
        efeitos: [{ tipo: "efeito", alvo: "aliados", duracao: { tipo: "rodadas", rodadas: 1 }, mudancas: PERICIAS.map(p => ({ chave: `pericia:${p.chave}`, valor: n, modo: "somar" })) }]
      }, efeitosAplicados: [] } }
    });
  }
});
ACOES_DE_MECANICA.set("nobre:brado", actor => {
  const item = itemDeClasse(actor, "nobre", "brado-de-comando");
  return item ? usarPoder(actor, item, { custo: maximoDoBrado(carisma(actor), actor.system.pm.value) }) : null;
});

/* ---------------- Majestade ---------------- */

const alvoMarcado = () => [...(game.user.targets ?? [])][0] ?? null;

GANCHOS_DE_PODER.set("nobre__majestade", {
  antes: (actor) => {
    const alvo = alvoMarcado();
    if (!alvo) { ui.notifications.warn(loc("ICARUS.Nobre.MajestadeSemAlvo")); return false; }
    if (majestadeUsadaContra(actor.getFlag(F, "majestade"), alvo.document.id)) { ui.notifications.warn(fmt("ICARUS.Nobre.MajestadeUsada", { alvo: alvo.name })); return false; }
  },
  depois: async actor => {
    const alvo = alvoMarcado();
    await actor.setFlag(F, "majestade", { ...(actor.getFlag(F, "majestade") ?? {}), [alvo.document.id]: true });
    const cd = cdDaMajestade(actor.system.nivel, carisma(actor), tem(actor, "coroacao"));
    if (game.user.isGM) return game.icarus.testes.abrirResistencia({ tipos: ["vontade"], pericia: "vontade", origem: loc("ICARUS.Nobre.Majestade"), cd });
    return avisarNoChat(actor, fmt("ICARUS.Nobre.MajestadeChat", { nome: actor.name, alvo: alvo.name, cd }));
  }
});
ACOES_DE_MECANICA.set("nobre:majestade", actor => {
  const item = itemDeClasse(actor, "nobre", "majestade");
  return item ? usarPoder(actor, item, { custo: 2 }) : null;
});

/* ---------------- Estandarte da Família ---------------- */

GANCHOS_DE_PODER.set("nobre__estandarte-da-familia", {
  depois: async actor => {
    const e = estandarte(tem(actor, "estandarte-reforcado"));
    await actor.setFlag(F, "estandarte", { ativo: true, pv: e.pvMax, ...e });
    return avisarNoChat(actor, fmt("ICARUS.Nobre.EstandarteChat", { nome: actor.name, rd: e.rd, pv: e.pvMax }));
  }
});
ACOES_DE_MECANICA.set("nobre:estandarte", async actor => {
  if (actor.getFlag(F, "estandarte")?.ativo) {
    await actor.unsetFlag(F, "estandarte");
    return avisarNoChat(actor, fmt("ICARUS.Nobre.EstandarteBaixado", { nome: actor.name }));
  }
  const item = itemDeClasse(actor, "nobre", "estandarte-da-familia");
  return item ? usarPoder(actor, item, { custo: 2 }) : null;
});

/* ---------------- Palavra de Encorajamento ---------------- */

GANCHOS_DE_PODER.set("nobre__palavra-de-encorajamento", {
  depois: async actor => {
    const alvo = alvoMarcado()?.actor;
    if (alvo?.isOwner) return alvo.setFlag(F, "encorajado", true);
    return avisarNoChat(actor, fmt("ICARUS.Nobre.EncorajamentoChat", { nome: actor.name, alvo: alvoMarcado()?.name ?? loc("ICARUS.Nobre.UmAliado") }));
  }
});

/* ---------------- Escolta Contratada ---------------- */

GANCHOS_DE_PODER.set("nobre__escolta-contratada", {
  depois: async actor => {
    await actor.setFlag(F, "escolta", { ativa: true, usadaNaCena: false });
    return avisarNoChat(actor, fmt("ICARUS.Nobre.EscoltaChat", { nome: actor.name, valor: absorcaoDaEscolta(actor.system.nivel) }));
  }
});
ACOES_DE_MECANICA.set("nobre:contratar", actor => {
  const item = itemDeClasse(actor, "nobre", "escolta-contratada");
  return item ? usarPoder(actor, item, { custo: 0 }) : null;
});
ACOES_DE_MECANICA.set("nobre:escolta", actor => (game.user.isGM ? actor.unsetFlag(F, "escolta") : null));

/** O token do alvo está no mesmo lugar ou adjacente ao token (distância ≤ 1 quadrado entre as bordas)? */
function adjacente(a, b) {
  if (!a || !b || a.parent?.id !== b.parent?.id) return false;
  const g = a.parent?.grid?.size ?? canvas?.grid?.size ?? 100;
  const caixa = t => ({ x1: t.x, y1: t.y, x2: t.x + (t.width ?? 1) * g, y2: t.y + (t.height ?? 1) * g });
  const p = caixa(a), q = caixa(b);
  const dx = Math.max(0, Math.max(p.x1, q.x1) - Math.min(p.x2, q.x2));
  const dy = Math.max(0, Math.max(p.y1, q.y1) - Math.min(p.y2, q.y2));
  return Math.max(dx, dy) <= g * 1.01;
}

ABSORVEDORES_DE_DANO.push(async (alvo, actor) => {
  const alvoToken = alvo?.documentName === "Token" ? alvo : null;
  // O próprio Nobre, ou um Nobre com escolta ativa adjacente ao alvo, na mesma cena
  const candidatos = [];
  if (ehNobre(actor)) candidatos.push(actor);
  const cena = alvoToken?.parent;
  for (const t of cena?.tokens ?? []) {
    const nobre = t.actor;
    if (!nobre || nobre === actor || !ehNobre(nobre) || candidatos.includes(nobre)) continue;
    if (adjacente(t, alvoToken)) candidatos.push(nobre);
  }
  for (const nobre of candidatos) {
    const e = nobre.getFlag(F, "escolta");
    if (!e?.ativa || e.usadaNaCena || !(nobre.isOwner || game.user.isGM)) continue;
    await nobre.setFlag(F, "escolta", { ...e, usadaNaCena: true });
    return { absorvido: absorcaoDaEscolta(nobre.system.nivel), texto: fmt("ICARUS.Nobre.EscoltaAbsorve", { nome: nobre.name }) };
  }
  return null;
});

/* ---------------- Fim da cena / combate ---------------- */

const limparCena = async actor => {
  if (!ehNobre(actor)) return;
  for (const k of ["cofreNaCena", "majestade", "estandarte"]) if (actor.getFlag(F, k) !== undefined) await actor.unsetFlag(F, k);
  // A escolta continua até o fim da aventura; só volta a poder absorver
  const e = actor.getFlag(F, "escolta");
  if (e?.usadaNaCena) await actor.setFlag(F, "escolta", { ...e, usadaNaCena: false });
};
FIM_DA_CENA.push(limparCena);
FIM_DO_COMBATE.push(limparCena);

/* ---------------- Aba Classe ---------------- */

registrarLinhas("nobre", actor => {
  const linhas = [];
  if (tem(actor, "postura-altiva")) {
    const car = actor.getFlag(F, "defesaAtributo") === "CAR";
    linhas.push({ id: "nobre:postura", rotulo: loc("ICARUS.Nobre.Postura"), botao: true, ativo: car, info: loc(car ? "ICARUS.Nobre.PosturaCAR" : "ICARUS.Nobre.PosturaDES") });
  }
  if (tem(actor, "dote") && !actor.getFlag(F, "dote")) linhas.push({ id: "nobre:dote", rotulo: loc("ICARUS.Nobre.Dote"), botao: true, ativo: true, info: reais(VALOR_DOTE) });
  if (tem(actor, "palavra-cortante")) linhas.push({ id: "nobre:palavra", rotulo: loc("ICARUS.Nobre.Palavra"), botao: true, info: `${danoDaPalavraCortante(actor.system.nivel)} · 1 PM` });
  if (tem(actor, "rendimentos")) {
    const usados = !!actor.getFlag(F, "rendimentos");
    linhas.push({ id: "nobre:rendimentos", rotulo: loc("ICARUS.Nobre.Rendimentos"), botao: !usados, info: loc(usados ? "ICARUS.Nobre.RendimentosUsados" : "ICARUS.Nobre.RendimentosLivre") });
    if (usados && game.user.isGM) linhas.push({ id: "nobre:rendimentos-liberar", rotulo: loc("ICARUS.Nobre.RendimentosLiberar"), botao: true });
  }
  if (tem(actor, "brado-de-comando")) linhas.push({ id: "nobre:brado", rotulo: loc("ICARUS.Nobre.Brado"), botao: true, info: fmt("ICARUS.Nobre.BradoInfo", { max: carisma(actor) }) });
  if (tem(actor, "majestade")) linhas.push({ id: "nobre:majestade", rotulo: loc("ICARUS.Nobre.Majestade"), botao: true, info: `CD ${cdDaMajestade(actor.system.nivel, carisma(actor), tem(actor, "coroacao"))} · 2 PM` });
  if (tem(actor, "estandarte-da-familia")) {
    const e = actor.getFlag(F, "estandarte");
    linhas.push({ id: "nobre:estandarte", rotulo: loc("ICARUS.Nobre.Estandarte"), botao: true, ativo: !!e?.ativo,
      info: e?.ativo ? fmt("ICARUS.Nobre.EstandarteAtivo", { pv: e.pv, max: e.pvMax, rd: e.rd }) : "2 PM" });
  }
  const escolta = actor.getFlag(F, "escolta");
  if (tem(actor, "escolta-contratada") && !escolta?.ativa) {
    linhas.push({ id: "nobre:contratar", rotulo: loc("ICARUS.Nobre.EscoltaContratar"), botao: true, info: reais(custoEmDinheiro("escolta-contratada", actor.system.nivel)) });
  }
  if (escolta?.ativa) {
    linhas.push({ id: "nobre:escolta", rotulo: loc("ICARUS.Nobre.Escolta"), ...(game.user.isGM ? { botao: true, dica: loc("ICARUS.Nobre.EscoltaDispensar") } : {}),
      info: fmt(escolta.usadaNaCena ? "ICARUS.Nobre.EscoltaUsada" : "ICARUS.Nobre.EscoltaPronta", { valor: absorcaoDaEscolta(actor.system.nivel) }) });
  }
  if (tem(actor, "cofre-da-familia")) {
    linhas.push({ id: "nobre:cofre", rotulo: loc("ICARUS.Nobre.Cofre"),
      info: fmt("ICARUS.Nobre.CofreInfo", { usado: actor.getFlag(F, "cofreNaCena") ?? 0, max: carisma(actor), porPM: reais(reaisPorPM(actor.system.nivel, tem(actor, "bolsa-aberta"))) }) });
  }
  return linhas;
});
