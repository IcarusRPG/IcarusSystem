/**
 * Regras do ataque que dependem do Foundry (tokens, flags) e entram no diálogo de ataque:
 * flanco, camuflagem e duas armas. As fórmulas puras estão em combate.mjs.
 */
import { SISTEMA_ID } from "./config.mjs";
import { estaFlanqueando, falhaPorCamuflagem, BONUS_FLANCO, FALHA_CAMUFLAGEM, planoDuasArmas } from "./combate.mjs";
import { PROVEDORES_ATAQUE, MODIFICADORES_ATAQUE, alvosMarcados } from "./combate-chat.mjs";

const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);
const flagsDe = actor => actor?.flags?.[SISTEMA_ID] ?? {};

/** Ataque desarmado? (arma marcada como desarmada, ex.: o ataque desarmado do Monge) */
export const ehDesarmado = item => !!item?.flags?.[SISTEMA_ID]?.desarmado;

/** Caixa de um token em unidades de grade. */
function caixa(token) {
  const doc = token.document ?? token;
  const g = canvas?.grid?.size || 100;
  return { x: doc.x / g, y: doc.y / g, w: doc.width, h: doc.height, uuid: doc.uuid };
}

/** Token do ator na cena (o controlado, ou o primeiro ativo). */
export function tokenDoAtor(actor) {
  const controlado = canvas?.tokens?.controlled?.find(t => t.actor === actor);
  return controlado ?? actor?.getActiveTokens?.()[0] ?? null;
}

/** Detecta o flanco do atacante contra o alvo pelos tokens da cena. */
export function detectarFlanco(actor, alvoToken) {
  const meu = tokenDoAtor(actor);
  if (!meu || !alvoToken) return false;
  const alvoActor = alvoToken.actor;
  const disposicao = meu.document.disposition;
  const aliados = (canvas.tokens.placeables ?? []).filter(t =>
    t !== meu && t !== alvoToken && t.actor && t.document.disposition === disposicao && !t.document.hidden
    && !t.actor.statuses?.has("dead") && !t.actor.statuses?.has("inconsciente"));
  const alvo = { ...caixa(alvoToken), naoFlanqueavel: !!flagsDe(alvoActor).naoFlanqueavel };
  const lista = aliados.map(t => ({ ...caixa(t), flanqueadorPor: flagsDe(t.actor).flanqueadorPor ?? [] }));
  // Companheiro de Crime pode guardar o uuid do token ou do ator alvo
  for (const l of lista) if (l.flanqueadorPor.includes(alvoActor?.uuid)) l.flanqueadorPor = [...l.flanqueadorPor, alvo.uuid];
  return estaFlanqueando(caixa(meu), alvo, lista);
}

/* ---------------- Flanco ---------------- */
PROVEDORES_ATAQUE.push((actor, item, modo) => {
  if (modo !== "corpo-a-corpo" || ehDesarmado(item)) return null;
  const alvos = alvosMarcados();
  let detectado = false;
  try { detectado = alvos.length > 0 && detectarFlanco(actor, alvos[0].token); } catch (erro) { console.warn("Icarus RPG | Flanco: detecção falhou", erro); }
  return {
    id: "flanco", titulo: loc("ICARUS.Flanco.Titulo"),
    campos: [{ tipo: "checkbox", nome: "flanco", valor: detectado, rotulo: fmt("ICARUS.Flanco.Rotulo", { bonus: BONUS_FLANCO }),
      dica: detectado ? fmt("ICARUS.Flanco.Detectado", { alvo: alvos[0].nome }) : loc("ICARUS.Flanco.Manual") }]
  };
});
MODIFICADORES_ATAQUE.push(({ item, modo, opcoes }) => {
  if (!opcoes.flanco || modo !== "corpo-a-corpo" || ehDesarmado(item)) return null;
  return { bonus: BONUS_FLANCO, linhas: [fmt("ICARUS.Flanco.Linha", { bonus: BONUS_FLANCO })] };
});

/* ---------------- Camuflagem ---------------- */
PROVEDORES_ATAQUE.push(actor => {
  const ignora = !!flagsDe(actor).ignoraCamuflagem;
  return {
    id: "camuflagem", titulo: loc("ICARUS.Camuflagem.Titulo"),
    campos: [{
      tipo: "select", nome: "camuflagem", rotulo: loc("ICARUS.Camuflagem.Rotulo"),
      opcoes: ["nenhuma", "leve", "total"].map(v => ({ valor: v, rotulo: loc(`ICARUS.Camuflagem.Tipos.${v}`), selecionado: v === "nenhuma" })),
      dica: ignora ? loc("ICARUS.Camuflagem.Ignora") : loc("ICARUS.Camuflagem.Dica")
    }]
  };
});
MODIFICADORES_ATAQUE.push(async ({ actor, opcoes }) => {
  const tipo = opcoes.camuflagem;
  if (!tipo || tipo === "nenhuma") return null;
  if (flagsDe(actor).ignoraCamuflagem) return { linhas: [loc("ICARUS.Camuflagem.Ignorou")] };
  // 1d10 antes do d20: leve falha com 1–2, total com 1–5
  const roll = await new Roll("1d10").evaluate();
  const nome = loc(`ICARUS.Camuflagem.Nomes.${tipo}`);
  if (falhaPorCamuflagem(roll.total, tipo)) {
    return { cancelar: { motivo: "camuflagem", texto: fmt("ICARUS.Camuflagem.Falhou", { tipo: nome, d10: roll.total, limite: FALHA_CAMUFLAGEM[tipo] }), rolls: [roll] } };
  }
  return { rolls: [roll], linhas: [fmt("ICARUS.Camuflagem.Passou", { tipo: nome, d10: roll.total, limite: FALHA_CAMUFLAGEM[tipo] })] };
});

/* ---------------- Duas armas ---------------- */

/** Armas empunhadas do ator no formato que planoDuasArmas espera. */
export const armasEmpunhadas = actor => actor.items.filter(i => i.type === "arma" && i.system.empunhada)
  .map(i => ({ id: i.id, propriedades: i.system.propriedades ?? [], nome: i.name }));

PROVEDORES_ATAQUE.push(actor => {
  const plano = planoDuasArmas(armasEmpunhadas(actor), flagsDe(actor));
  if (!plano.possivel) return null;
  const outra = plano.dupla ? loc("ICARUS.DuasArmas.OutraExtremidade") : plano.segunda.nome;
  return {
    id: "duas-armas", titulo: loc("ICARUS.DuasArmas.Titulo"),
    campos: [{ tipo: "checkbox", nome: "duasArmas", valor: false,
      rotulo: plano.dupla ? loc("ICARUS.DuasArmas.RotuloDupla") : fmt("ICARUS.DuasArmas.Rotulo", { primeira: plano.primeira.nome, segunda: outra }),
      dica: plano.penalidade ? fmt("ICARUS.DuasArmas.Penalidade", { valor: plano.penalidade })
        : plano.segundoSemAtributo ? loc("ICARUS.DuasArmas.SemAtributo") : loc("ICARUS.DuasArmas.SemPenalidade") }]
  };
});
MODIFICADORES_ATAQUE.push(({ opcoes }) => {
  if (!opcoes.penalidadeDuasArmas && !opcoes.ataqueDeDuasArmas) return null;
  const linhas = [];
  if (opcoes.penalidadeDuasArmas) linhas.push(fmt("ICARUS.DuasArmas.Linha", { valor: opcoes.penalidadeDuasArmas }));
  if (opcoes.segundoSemAtributo) linhas.push(loc("ICARUS.DuasArmas.LinhaSemAtributo"));
  return { bonus: opcoes.penalidadeDuasArmas ?? 0, linhas };
});
