/**
 * Bárbaro: Fúria (ação livre, 2 PM). Em Fúria: +dano e +ataque corpo a corpo pelo nível
 * (texto da habilidade: +2/+1 no 1º, +3/+2 no 9º, +4/+3 no 17º), status "Em Fúria" no token,
 * aviso no chat ao ligar/desligar. Encerrar não custa nada.
 * Pele Rija é passiva (classes-dados.mjs → passivosDeClasse).
 */
import { SISTEMA_ID } from "../config.mjs";
import { GANCHOS_DE_PODER, usarPoder } from "../acoes.mjs";
import { MODIFICADORES_ATAQUE } from "../combate-chat.mjs";
import { ACOES_DE_MECANICA } from "../classes.mjs";
import { registrarLinhas, itemDeClasse, marcarStatus, avisarNoChat, USO_PROPRIO } from "./comum.mjs";
import { bonusDaFuria } from "../classes-dados.mjs";
import { FIM_DA_CENA } from "../condicoes-foundry.mjs";

const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);

const emFuria = actor => !!actor.getFlag(SISTEMA_ID, "furia");

async function encerrarFuria(actor) {
  await actor.unsetFlag(SISTEMA_ID, "furia");
  await marcarStatus(actor, "furia", false);
  return avisarNoChat(actor, fmt("ICARUS.Barbaro.SaiuFuria", { nome: actor.name }));
}

USO_PROPRIO.add("barbaro__furia");
GANCHOS_DE_PODER.set("barbaro__furia", {
  depois: async actor => {
    await actor.setFlag(SISTEMA_ID, "furia", true);
    await marcarStatus(actor, "furia", true);
    const b = bonusDaFuria(actor.system.nivel);
    await avisarNoChat(actor, fmt("ICARUS.Barbaro.EntrouFuria", { nome: actor.name, dano: b.dano, ataque: b.ataque }));
  }
});

ACOES_DE_MECANICA.set("barbaro:furia", async actor => {
  if (emFuria(actor)) return encerrarFuria(actor);
  const item = itemDeClasse(actor, "barbaro", "furia");
  if (!item) return ui.notifications.warn(loc("ICARUS.Barbaro.SemFuria"));
  return usarPoder(actor, item);
});

registrarLinhas("barbaro", actor => {
  if (!itemDeClasse(actor, "barbaro", "furia")) return [];
  const b = bonusDaFuria(actor.system.nivel);
  const ativa = emFuria(actor);
  return [{
    id: "barbaro:furia", botao: true, ativo: ativa,
    rotulo: ativa ? loc("ICARUS.Barbaro.Encerrar") : loc("ICARUS.Barbaro.Entrar"),
    info: fmt(ativa ? "ICARUS.Barbaro.InfoAtiva" : "ICARUS.Barbaro.Info", { dano: b.dano, ataque: b.ataque }),
    dica: loc("ICARUS.Barbaro.Dica")
  }];
});

// Em Fúria: bônus no ataque e no dano corpo a corpo
MODIFICADORES_ATAQUE.push(({ actor, modo }) => {
  if (!emFuria(actor) || modo !== "corpo-a-corpo") return null;
  const b = bonusDaFuria(actor.system.nivel);
  return {
    bonus: b.ataque,
    extrasDano: [{ rotulo: loc("ICARUS.Barbaro.Furia"), formula: String(b.dano) }],
    linhas: [fmt("ICARUS.Barbaro.LinhaAtaque", { dano: b.dano, ataque: b.ataque })]
  };
});

// A Fúria dura até o fim da cena
FIM_DA_CENA.push(async actor => { if (emFuria(actor)) await encerrarFuria(actor); });
