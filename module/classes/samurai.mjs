/**
 * Samurai:
 * - Kiai (texto do Anexo A): uma vez por rodada, ao atacar, gasta 2 PM: +2 no teste de ataque e,
 *   se acertar, N dados de dano adicionais do mesmo tipo e tamanho do dado da arma (1 no 1º, 2 no
 *   5º, 3 no 9º, 4 no 13º, 5 no 17º). No diálogo de ataque; a marca da rodada zera no início do
 *   turno do Samurai. (O prompt descrevia "Dados de Kiai" como um recurso que se gasta; o texto da
 *   habilidade descreve um uso por rodada — vale o texto.)
 * - Senda do Combatente (2º) / O Ápice da Senda (20º): escolha permanente (comum.mjs).
 * - Contra-Ataque Espiritual e outras reações: gastam a reação ao usar (acoes.mjs).
 */
import { SISTEMA_ID } from "../config.mjs";
import { dadosPorNivel } from "../classes-dados.mjs";
import { PROVEDORES_ATAQUE, MODIFICADORES_ATAQUE } from "../combate-chat.mjs";
import { INICIO_DO_TURNO } from "../acoes.mjs";
import { registrarLinhas, itemDeClasse, USO_PROPRIO } from "./comum.mjs";

const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);
const CUSTO_KIAI = 2;
const BONUS_KIAI = 2;

/** Tamanho do dado da arma ("1d8" → "d8"; "2d6" → "d6"). */
export const dadoDaArma = dano => (String(dano ?? "").match(/\d*d(\d+)/)?.[1] ? `d${String(dano).match(/\d*d(\d+)/)[1]}` : "d6");

const kiaiUsado = actor => !!game.combat && !!actor.getFlag(SISTEMA_ID, "kiaiUsadoNaRodada");

USO_PROPRIO.add("samurai__kiai");
PROVEDORES_ATAQUE.push((actor, item) => {
  if (!itemDeClasse(actor, "samurai", "kiai")) return null;
  const n = dadosPorNivel(actor.system.nivel);
  const usado = kiaiUsado(actor);
  return {
    id: "kiai", titulo: loc("ICARUS.Samurai.Kiai"),
    campos: [{ tipo: "checkbox", nome: "kiai", valor: false, desativado: usado,
      rotulo: fmt("ICARUS.Samurai.KiaiRotulo", { custo: CUSTO_KIAI, bonus: BONUS_KIAI, n, dado: dadoDaArma(item.system.dano) }),
      dica: usado ? loc("ICARUS.Samurai.KiaiUsado") : fmt("ICARUS.Samurai.KiaiDica", { pm: actor.system.pm.value }) }]
  };
});
MODIFICADORES_ATAQUE.push(async ({ actor, item, opcoes }) => {
  if (!opcoes.kiai || !itemDeClasse(actor, "samurai", "kiai")) return null;
  if (kiaiUsado(actor)) return { linhas: [loc("ICARUS.Samurai.KiaiUsado")] };
  if (actor.system.pm.value < CUSTO_KIAI) return { linhas: [fmt("ICARUS.Poderes.SemPM", { nome: actor.name, pm: CUSTO_KIAI, atual: actor.system.pm.value })] };
  const n = dadosPorNivel(actor.system.nivel);
  const dado = dadoDaArma(item.system.dano);
  const mudancas = { "system.pm.value": actor.system.pm.value - CUSTO_KIAI };
  if (game.combat) mudancas[`flags.${SISTEMA_ID}.kiaiUsadoNaRodada`] = true;
  await actor.update(mudancas);
  return {
    bonus: BONUS_KIAI,
    extrasDano: [{ rotulo: loc("ICARUS.Samurai.Kiai"), formula: `${n}${dado}` }],
    linhas: [fmt("ICARUS.Samurai.KiaiLinha", { custo: CUSTO_KIAI, bonus: BONUS_KIAI, n, dado })]
  };
});
INICIO_DO_TURNO.push(async actor => { if (actor.getFlag(SISTEMA_ID, "kiaiUsadoNaRodada")) await actor.unsetFlag(SISTEMA_ID, "kiaiUsadoNaRodada"); });

registrarLinhas("samurai", actor => {
  if (!itemDeClasse(actor, "samurai", "kiai")) return [];
  return [{ id: "samurai:kiai", rotulo: loc("ICARUS.Samurai.Kiai"),
    info: kiaiUsado(actor) ? loc("ICARUS.Samurai.KiaiUsado") : fmt("ICARUS.Samurai.KiaiInfo", { custo: CUSTO_KIAI, n: dadosPorNivel(actor.system.nivel) }) }];
});
