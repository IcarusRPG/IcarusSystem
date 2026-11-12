/**
 * Ataques naturais das ameaças (system.ataques: { nome, bonus, dados, fixo, tipo, alcance }), sem Item
 * "arma": d20 + bônus (vantagem/desvantagem pelos mesmos atalhos e Efeitos), contra a Defesa dos alvos
 * marcados, crítico no 20 natural (×2: dobra os dados da arma natural; os dados extras, como veneno,
 * não multiplicam). O dano sai por criarMensagemDeDano (module/dano.mjs), com as mesmas
 * flags["icarus-rpg"].dano das armas, então Aplicar dano / Metade / Dobro / RD / imunidades e o
 * registro de aplicações funcionam igual.
 * O card de ataque guarda flags["icarus-rpg"].ataqueNatural { actorUuid, indice, podeCritico }; os
 * botões Dano / Dano crítico valem uma vez (marca "danoRolado", como nas armas).
 */
import { SISTEMA_ID } from "./config.mjs";
import { comSinal, numero } from "./regras.mjs";
import { vantagemDaRolagem, dadosDoCard } from "./rolls.mjs";
import { rolarD20, resolverAtaque, resolverAtaqueMultiplo } from "./combate.mjs";
import { alvosMarcados } from "./combate-chat.mjs";
import { criarMensagemDeDano, nomeDoTipo } from "./dano.mjs";
import { partesDoAtaque, lerTipoDoAtaque, textoDoDano } from "./ameaca-dados.mjs";

const F = SISTEMA_ID;
const T = `systems/${SISTEMA_ID}/templates/chat`;
const loc = k => game.i18n.localize(k);
export const MULT_CRITICO_NATURAL = 2;
export const MARGEM_NATURAL = 20;

/** Bônus do ataque com as condições (a maior penalidade entre a geral e a de corpo a corpo). */
export function bonusDoAtaqueNatural(system, ataque) {
  const corpo = !/dist/i.test(String(ataque?.alcance ?? ""));
  const condGeral = system?.condicoes?.ataque?.valor ?? 0;
  const condCorpo = corpo ? (system?.condicoes?.ataqueCorpoACorpo?.valor ?? 0) : 0;
  const condicao = Math.min(condGeral, condCorpo);
  return { bonus: numero(ataque?.bonus) + numero(system?.bonus?.ataque) + condicao, condicao };
}

/** Rola o ataque natural de índice `indice` e manda o card. opcoes = { vantagem, desvantagem }. */
export async function rolarAtaqueNatural(actor, indice, opcoes = {}) {
  const ataque = actor?.system?.ataques?.[indice];
  if (!ataque) return null;
  const alvos = alvosMarcados();
  const { bonus, condicao } = bonusDoAtaqueNatural(actor.system, ataque);
  const v = vantagemDaRolagem(actor, ["ataque"], opcoes);
  const r = await rolarD20({ ...v, bonus });
  const resultados = resolverAtaqueMultiplo({ d20: r.natural, total: r.total, margem: MARGEM_NATURAL }, alvos);
  const semAlvo = resolverAtaque({ d20: r.natural, total: r.total, margem: MARGEM_NATURAL });
  const podeCritico = alvos.length ? resultados.some(x => x.critico) : semAlvo.ameaca;
  const lido = lerTipoDoAtaque(ataque.tipo);
  const content = await renderTemplate(`${T}/ataque-natural.hbs`, {
    arma: { nome: ataque.nome, img: actor.img },
    detalhe: [loc(/dist/i.test(ataque.alcance) ? "ICARUS.Ameaca.ADistancia" : "ICARUS.Ameaca.CorpoACorpo"), textoDoDano(ataque)].join(" · "),
    nota: lido.nota,
    condicao: condicao ? game.i18n.format("ICARUS.Ameaca.CondicaoNoAtaque", { valor: comSinal(condicao) }) : "",
    ...dadosDoCard(r),
    bonus: comSinal(bonus), total: r.total,
    ameaca: semAlvo.ameaca, automatico: semAlvo.automatico,
    alvos: resultados.map(x => ({ ...x, classe: x.critico ? "critico" : x.acerta ? "acertou" : "errou" })),
    podeCritico, mult: MULT_CRITICO_NATURAL
  });
  const dados = {
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    rolls: [r.roll],
    sound: CONFIG.sounds.dice,
    flags: { [F]: { ataqueNatural: { actorUuid: actor.uuid, indice, nome: ataque.nome, podeCritico } } }
  };
  ChatMessage.applyRollMode(dados, game.settings.get("core", "rollMode"));
  return ChatMessage.create(dados);
}

/** Dano do ataque natural (critico: dados da arma natural ×2). */
export async function rolarDanoNatural(actor, indice, { critico = false } = {}) {
  const ataque = actor?.system?.ataques?.[indice];
  if (!ataque) return null;
  const partes = partesDoAtaque(ataque, { critico, mult: MULT_CRITICO_NATURAL });
  const rolls = [];
  for (const p of partes) rolls.push(await new Roll(p.formula).evaluate());
  const componentes = partes.map((p, i) => ({ tipo: p.tipo || "dano", valor: Math.max(0, rolls[i].total) }));
  const lido = lerTipoDoAtaque(ataque.tipo);
  return criarMensagemDeDano({
    actor, rolls, rollType: "dano", critico, componentes,
    card: {
      arma: { nome: ataque.nome, img: actor.img },
      texto: partes.map((p, i) => (partes.length > 1 ? `${p.formula} (${nomeDoTipo(componentes[i].tipo)})` : p.formula)).join(" + "),
      mult: MULT_CRITICO_NATURAL,
      extra: lido.nota,
      tipos: lido.tipos.map(nomeDoTipo).join(" e "),
      partes: partes.length > 1 ? componentes.map(c => ({ nome: nomeDoTipo(c.tipo), valor: c.valor })) : null
    },
    flags: { ataqueNaturalDano: { actorUuid: actor.uuid, indice } }
  });
}

/** Botões Dano / Dano crítico dos cards de ataque natural (uma vez por ataque). */
export function registrarAtaquesNaturais() {
  Hooks.on("renderChatMessage", (message, html) => {
    const dados = message.flags?.[F]?.ataqueNatural;
    if (!dados) return;
    const raiz = html instanceof HTMLElement ? html : html[0];
    const actor = fromUuidSync(dados.actorUuid);
    const podeUsar = game.user.isGM || actor?.isOwner;
    const usado = !!message.flags[F].danoRolado;
    raiz.querySelectorAll("[data-icarus-natural]").forEach(botao => {
      if (!podeUsar) return botao.remove();
      if (usado) { botao.disabled = true; return; }
      botao.addEventListener("click", async ev => {
        ev.preventDefault();
        if (botao.disabled) return;
        raiz.querySelectorAll("[data-icarus-natural]").forEach(b => { b.disabled = true; });
        const ator = fromUuidSync(dados.actorUuid);
        if (!ator) return ui.notifications.warn(loc("ICARUS.Ameaca.AtorSumiu"));
        const critico = botao.dataset.icarusNatural === "critico" && !!dados.podeCritico;
        await rolarDanoNatural(ator, dados.indice, { critico });
        if (message.canUserModify(game.user, "update")) await message.setFlag(F, "danoRolado", true);
      });
    });
  });
}
