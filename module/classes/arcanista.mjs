/**
 * Arcanista:
 * - Linhagem (1º, permanente): Mago, Feiticeiro ou Mago de Sangue. Ao escolher, o PM passa a
 *   (base + atributo) × nível pela linhagem (classes.json pm.porLinhagem), o atributo de conjuração
 *   vira INT ou CAR (pmAtributo; a ficha pode trocar), a lista de magias é Arcana ou de Sangue e
 *   as habilidades do ramo são concedidas (classes-dados.mjs → condicoesDasHabilidades).
 * - Herança Ancestral (Feiticeiro): concede a habilidade da herança (Dragão, Leviatã, Fênix).
 * - Sem linhagem: 3 + INT e aviso "escolha a Linhagem" na aba Classe.
 */
import { SISTEMA_ID } from "../config.mjs";
import { pmDaLinhagem, linhagemDasEscolhas, tradicaoDaLinhagem } from "../classes-dados.mjs";
import { classeDoAtor, concederHabilidades } from "../classes.mjs";
import { APOS_CAMINHO } from "../escolhas.mjs";
import { registrarLinhas, escolhasDoAtor } from "./comum.mjs";

const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);

const ehArcanista = actor => classeDoAtor(actor)?.id === "arcanista";

/** Linhagem do ator ("mago" | "feiticeiro" | "sangue" | null). */
export const linhagemDoAtor = actor => (ehArcanista(actor) ? linhagemDasEscolhas(escolhasDoAtor(actor)) : null);

/** Aplica a linhagem: PM, atributo de conjuração (classeConfig) e tradição das magias. */
async function aplicarLinhagem(actor, indice) {
  const classe = classeDoAtor(actor);
  const linhagem = linhagemDasEscolhas({ linhagem: indice });
  const mudancas = { [`flags.${SISTEMA_ID}.tradicaoMagias`]: tradicaoDaLinhagem(linhagem) };
  if (!actor._source.system.classeConfig.manual) {
    const pm = pmDaLinhagem(classe, linhagem);
    Object.assign(mudancas, {
      "system.classeConfig.pmInicial": pm.pmInicial,
      "system.classeConfig.pmPorNivel": pm.pmPorNivel,
      "system.classeConfig.pmAtributo": pm.pmAtributo
    });
  } else ui.notifications.warn(fmt("ICARUS.Classe.Manual", { nome: actor.name }));
  await actor.update(mudancas);
  // Habilidades do ramo (Foco Arcano, Sangue Dotado, Pacto de Sangue…)
  await concederHabilidades(actor);
}

APOS_CAMINHO.set("linhagem", (actor, i) => (ehArcanista(actor) ? aplicarLinhagem(actor, i) : null));
APOS_CAMINHO.set("heranca-ancestral", actor => (ehArcanista(actor) ? concederHabilidades(actor) : null));

registrarLinhas("arcanista", actor => {
  // A escolha pendente já tem botão na aba (comum.mjs); aqui só o estado e o aviso
  const linhagem = linhagemDoAtor(actor);
  return [{ id: "arcanista:linhagem", rotulo: loc("ICARUS.Arcanista.Linhagem"),
    info: linhagem ? loc(`ICARUS.Arcanista.Linhagens.${linhagem}`) : loc("ICARUS.Arcanista.SemLinhagem") }];
});
