/**
 * Ladino:
 * - Ataque Furtivo: no diálogo de ataque, "Ataque Furtivo (Nd6)" (1d6 +1d6 a cada 4 níveis), do
 *   mesmo tipo da arma, só no PRIMEIRO ataque da rodada (marca zerada no início do turno do
 *   Ladino). Condições (alvo desprevenido, flanqueado ou impedido; arma Leve/Ágil corpo a corpo
 *   ou à distância em alcance curto) só geram aviso. No crítico, os dados entram na multiplicação
 *   (o texto não diz o contrário).
 * - Duas Armas, Perícia Infalível: classes-dados.mjs. Perícia Refinada: tela de escolha (escolhas.mjs).
 */
import { SISTEMA_ID } from "../config.mjs";
import { dadosPorNivel } from "../classes-dados.mjs";
import { PROVEDORES_ATAQUE, MODIFICADORES_ATAQUE, alvosMarcados } from "../combate-chat.mjs";
import { INICIO_DO_TURNO } from "../acoes.mjs";
import { detectarFlanco } from "../regras-ataque.mjs";
import { registrarLinhas, itemDeClasse } from "./comum.mjs";
import { ACOES_DE_MECANICA } from "../classes.mjs";
import { resolverEscolha } from "../escolhas.mjs";

ACOES_DE_MECANICA.set("ladino:refinada", actor => {
  const item = itemDeClasse(actor, "ladino", "pericia-refinada");
  return item ? resolverEscolha(actor, item) : null;
});

const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);

/** Condições que deixam o alvo "impedido" para o Ataque Furtivo (além de desprevenido). */
export const ALVO_VULNERAVEL_FURTIVO = ["desprevenido", "agarrado", "caido", "cego", "enredado", "imovel", "paralisado", "pasmo"];

const furtivoUsado = actor => !!game.combat && !!actor.getFlag(SISTEMA_ID, "furtivoUsadoNaRodada");

PROVEDORES_ATAQUE.push((actor, item, modo) => {
  if (!itemDeClasse(actor, "ladino", "ataque-furtivo")) return null;
  const n = dadosPorNivel(actor.system.nivel);
  const props = item.system.propriedades ?? [];
  const armaServe = modo === "corpo-a-corpo" ? props.includes("leve") || props.includes("agil") : true;
  const alvo = alvosMarcados()[0];
  let alvoServe = false;
  if (alvo?.token?.actor) {
    alvoServe = ALVO_VULNERAVEL_FURTIVO.some(c => alvo.token.actor.statuses?.has(c));
    if (!alvoServe && modo === "corpo-a-corpo") { try { alvoServe = detectarFlanco(actor, alvo.token); } catch { /* geometria */ } }
  }
  const usado = furtivoUsado(actor);
  return {
    id: "furtivo", titulo: loc("ICARUS.Ladino.Furtivo"),
    campos: [{ tipo: "checkbox", nome: "ataqueFurtivo", valor: !usado && armaServe && alvoServe, desativado: usado,
      rotulo: fmt("ICARUS.Ladino.FurtivoRotulo", { n }),
      dica: usado ? loc("ICARUS.Ladino.FurtivoUsado") : loc("ICARUS.Ladino.FurtivoDica") }],
    aviso: !usado && (!armaServe || !alvoServe) ? loc("ICARUS.Ladino.FurtivoAviso") : ""
  };
});

MODIFICADORES_ATAQUE.push(async ({ actor, item, opcoes }) => {
  if (!opcoes.ataqueFurtivo || !itemDeClasse(actor, "ladino", "ataque-furtivo")) return null;
  if (furtivoUsado(actor)) return { linhas: [loc("ICARUS.Ladino.FurtivoUsado")] };
  const n = dadosPorNivel(actor.system.nivel);
  // Só o primeiro ataque da rodada (em combate)
  if (game.combat) await actor.setFlag(SISTEMA_ID, "furtivoUsadoNaRodada", true);
  const tipo = item.system.tiposDano?.[0];
  return {
    extrasDano: [{ rotulo: loc("ICARUS.Ladino.Furtivo"), formula: `${n}d6` }],
    linhas: [fmt("ICARUS.Ladino.FurtivoLinha", { n, tipo: tipo ? loc(`ICARUS.TiposDano.${tipo}`) : "" })]
  };
});

INICIO_DO_TURNO.push(async actor => {
  if (actor.getFlag(SISTEMA_ID, "furtivoUsadoNaRodada")) await actor.unsetFlag(SISTEMA_ID, "furtivoUsadoNaRodada");
});

registrarLinhas("ladino", actor => {
  if (!itemDeClasse(actor, "ladino", "ataque-furtivo")) return [];
  const n = dadosPorNivel(actor.system.nivel);
  const linhas = [{ id: "ladino:furtivo", rotulo: fmt("ICARUS.Ladino.FurtivoRotulo", { n }), info: furtivoUsado(actor) ? loc("ICARUS.Ladino.FurtivoUsado") : loc("ICARUS.Ladino.FurtivoNoAtaque") }];
  if (itemDeClasse(actor, "ladino", "pericia-infalivel")) linhas.push({ id: "ladino:infalivel", rotulo: loc("ICARUS.Ladino.Infalivel"), info: loc("ICARUS.Ladino.InfalivelInfo") });
  const refinada = itemDeClasse(actor, "ladino", "pericia-refinada");
  if (refinada) {
    const escolhidas = refinada.getFlag(SISTEMA_ID, "periciaRefinada");
    linhas.push(escolhidas?.length
      ? { id: "ladino:refinada", rotulo: refinada.name, info: escolhidas.map(k => loc(`ICARUS.Pericias.${k}`)).join(", ") }
      : { id: "ladino:refinada", rotulo: refinada.name, botao: true, ativo: true, info: loc("ICARUS.Classe.EscolhaPendente") });
  }
  return linhas;
});
