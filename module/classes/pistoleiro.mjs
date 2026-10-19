/**
 * Pistoleiro:
 * - Tiro Carregado: no ataque com arma de fogo, "PM no Tiro Carregado" (0 até o máximo do nível:
 *   1 no 1º, 2 no 5º, 3 no 10º, 4 no 15º, 5 no 20º; Calibre Pesado +2 com mosquete). +1d6 de
 *   Perfuração por PM. Os PM são gastos ao rolar o ataque, mesmo se errar.
 * - Saque Rápido: recarregar como ação livre gastando 1 PM, uma vez por turno; com duas armas de
 *   fogo empunhadas, 1 PM por arma. Mestre da Recarga: 1 PM recarrega as duas, quantas vezes quiser.
 * - Tiro Lendário (20º): 1 vez por cena, o ataque com arma de fogo acerta e é crítico.
 */
import { SISTEMA_ID } from "../config.mjs";
import { PROVEDORES_ATAQUE, MODIFICADORES_ATAQUE, recarregar } from "../combate-chat.mjs";
import { INICIO_DO_TURNO } from "../acoes.mjs";
import { ACOES_DE_MECANICA } from "../classes.mjs";
import { FIM_DA_CENA } from "../condicoes-foundry.mjs";
import { registrarLinhas, itemDeClasse, avisarNoChat, USO_PROPRIO } from "./comum.mjs";
import { maximoTiroCarregado } from "../classes-dados.mjs";

const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);


const ehMosquete = item => /mosquete/i.test(item?.name ?? "");

/* ---------------- Tiro Carregado ---------------- */
PROVEDORES_ATAQUE.push((actor, item, modo) => {
  if (modo !== "fogo" || !itemDeClasse(actor, "pistoleiro", "tiro-carregado")) return null;
  const max = maximoTiroCarregado(actor.system.nivel, { calibrePesado: !!itemDeClasse(actor, "pistoleiro", "calibre-pesado"), mosquete: ehMosquete(item) });
  return {
    id: "tiro-carregado", titulo: loc("ICARUS.Pistoleiro.TiroCarregado"),
    campos: [{ tipo: "number", nome: "tiroCarregado", valor: 0, min: 0, max, rotulo: fmt("ICARUS.Pistoleiro.PMNoTiro", { max }),
      dica: fmt("ICARUS.Pistoleiro.TiroDica", { pm: actor.system.pm.value }) }]
  };
});
MODIFICADORES_ATAQUE.push(async ({ actor, item, modo, opcoes }) => {
  const pedido = Math.max(0, Math.trunc(Number(opcoes.tiroCarregado) || 0));
  if (!pedido || modo !== "fogo" || !itemDeClasse(actor, "pistoleiro", "tiro-carregado")) return null;
  const max = maximoTiroCarregado(actor.system.nivel, { calibrePesado: !!itemDeClasse(actor, "pistoleiro", "calibre-pesado"), mosquete: ehMosquete(item) });
  // Gasta antes do teste (mesmo se errar); nunca mais que o máximo nem que os PM disponíveis
  const n = Math.min(pedido, max, actor.system.pm.value);
  const linhas = [];
  if (n < pedido) linhas.push(fmt("ICARUS.Pistoleiro.Limitado", { n, pedido }));
  if (!n) return { linhas };
  await actor.update({ "system.pm.value": actor.system.pm.value - n });
  linhas.push(fmt("ICARUS.Pistoleiro.LinhaTiro", { n }));
  return { extrasDano: [{ rotulo: loc("ICARUS.Pistoleiro.TiroCarregado"), formula: `${n}d6` }], linhas };
});

/* ---------------- Tiro Lendário ---------------- */
const tiroLendarioUsado = actor => !!actor.getFlag(SISTEMA_ID, "tiroLendarioUsado");
PROVEDORES_ATAQUE.push((actor, item, modo) => {
  if (modo !== "fogo" || !itemDeClasse(actor, "pistoleiro", "tiro-lendario")) return null;
  const usado = tiroLendarioUsado(actor);
  return {
    id: "tiro-lendario", titulo: loc("ICARUS.Pistoleiro.TiroLendario"),
    campos: [{ tipo: "checkbox", nome: "tiroLendario", valor: false, desativado: usado, rotulo: loc("ICARUS.Pistoleiro.DeclararLendario"),
      dica: usado ? loc("ICARUS.Pistoleiro.LendarioUsado") : loc("ICARUS.Pistoleiro.LendarioDica") }]
  };
});
MODIFICADORES_ATAQUE.push(async ({ actor, modo, opcoes }) => {
  if (!opcoes.tiroLendario || modo !== "fogo" || tiroLendarioUsado(actor)) return null;
  await actor.setFlag(SISTEMA_ID, "tiroLendarioUsado", true);
  return { forcarAcerto: true, linhas: [loc("ICARUS.Pistoleiro.LinhaLendario")] };
});
FIM_DA_CENA.push(async actor => { if (tiroLendarioUsado(actor)) await actor.unsetFlag(SISTEMA_ID, "tiroLendarioUsado"); });

/* ---------------- Saque Rápido / Mestre da Recarga ---------------- */
const armasDeFogoEmpunhadas = actor => actor.items.filter(i => i.type === "arma" && i.system.grupo === "fogo" && i.system.empunhada);

USO_PROPRIO.add("pistoleiro__saque-rapido");
USO_PROPRIO.add("pistoleiro__mestre-da-recarga");
ACOES_DE_MECANICA.set("pistoleiro:recarga", async actor => {
  const armas = armasDeFogoEmpunhadas(actor);
  if (!armas.length) return ui.notifications.warn(loc("ICARUS.Pistoleiro.SemArmaFogo"));
  const mestre = !!itemDeClasse(actor, "pistoleiro", "mestre-da-recarga") && armas.length >= 2;
  if (!mestre && game.combat && actor.getFlag(SISTEMA_ID, "saqueUsadoNoTurno")) return ui.notifications.warn(loc("ICARUS.Pistoleiro.SaqueUsado"));
  const custo = mestre ? 1 : armas.length;
  const ok = await foundry.applications.api.DialogV2.confirm({
    window: { title: loc("ICARUS.Pistoleiro.RecargaRapida") },
    content: `<p>${Handlebars.escapeExpression(fmt("ICARUS.Pistoleiro.RecargaConfirma", { n: armas.length, custo, pm: actor.system.pm.value }))}</p>`,
    rejectClose: false
  });
  if (!ok) return;
  if (custo > actor.system.pm.value) return ui.notifications.warn(fmt("ICARUS.Poderes.SemPM", { nome: actor.name, pm: custo, atual: actor.system.pm.value }));
  await actor.update({ "system.pm.value": actor.system.pm.value - custo });
  if (!mestre && game.combat) await actor.setFlag(SISTEMA_ID, "saqueUsadoNoTurno", true);
  for (const arma of armas) await recarregar(actor, arma);
  return avisarNoChat(actor, fmt("ICARUS.Pistoleiro.Recarregou", { nome: actor.name, custo }));
});
INICIO_DO_TURNO.push(async actor => { if (actor.getFlag(SISTEMA_ID, "saqueUsadoNoTurno")) await actor.unsetFlag(SISTEMA_ID, "saqueUsadoNoTurno"); });

registrarLinhas("pistoleiro", actor => {
  const linhas = [];
  if (itemDeClasse(actor, "pistoleiro", "tiro-carregado")) {
    linhas.push({ id: "pistoleiro:tiro", rotulo: loc("ICARUS.Pistoleiro.TiroCarregado"), info: fmt("ICARUS.Pistoleiro.TiroInfo", { max: maximoTiroCarregado(actor.system.nivel) }) });
  }
  if (itemDeClasse(actor, "pistoleiro", "saque-rapido")) {
    const mestre = !!itemDeClasse(actor, "pistoleiro", "mestre-da-recarga");
    linhas.push({ id: "pistoleiro:recarga", botao: true, rotulo: loc("ICARUS.Pistoleiro.RecargaRapida"),
      info: mestre ? loc("ICARUS.Pistoleiro.MestreInfo") : loc("ICARUS.Pistoleiro.SaqueInfo"), desativado: !mestre && !!game.combat && !!actor.getFlag(SISTEMA_ID, "saqueUsadoNoTurno") });
  }
  if (itemDeClasse(actor, "pistoleiro", "tiro-lendario")) {
    linhas.push({ id: "pistoleiro:lendario", rotulo: loc("ICARUS.Pistoleiro.TiroLendario"), info: tiroLendarioUsado(actor) ? loc("ICARUS.Pistoleiro.LendarioUsado") : loc("ICARUS.Pistoleiro.LendarioNoAtaque") });
  }
  return linhas;
});
