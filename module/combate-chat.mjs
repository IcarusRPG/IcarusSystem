/**
 * Ataque, dano, munição, recarga e arremesso dentro do Foundry, com os cards de chat.
 * As regras (bônus, fórmulas, o que gastar) ficam em combate.mjs; aqui só se aplica e se mostra.
 */
import { SISTEMA_ID } from "./config.mjs";
import { comSinal } from "./regras.mjs";
import {
  calcularAtaque, calcularDano, planejarAtaque, planejarRecarga, ehAmeaca, faixaCritico, alcanceDoModo, totalMunicao,
  MARCA_DO_BOTAO, botaoUsado
} from "./combate.mjs";

const T = `systems/${SISTEMA_ID}/templates/chat`;
const loc = k => game.i18n.localize(k);

/** Itens do ator no formato que as regras puras esperam. */
export function itensDoAtor(actor) {
  return actor.items.map(i => ({ id: i.id, type: i.type, system: i.system }));
}

async function enviar(actor, content, { rolls = [], flags = {} } = {}) {
  const dados = { speaker: ChatMessage.getSpeaker({ actor }), content, rolls, flags: { [SISTEMA_ID]: flags } };
  if (rolls.length) dados.sound = CONFIG.sounds.dice;
  ChatMessage.applyRollMode(dados, game.settings.get("core", "rollMode"));
  return ChatMessage.create(dados);
}

/** Aplica os gastos planejados (munição, disparos carregados, arma arremessada). */
async function aplicarGastos(actor, gastos) {
  const porItem = new Map();
  for (const g of gastos) porItem.set(g.itemId, { ...(porItem.get(g.itemId) ?? { _id: g.itemId }), [g.campo]: Math.max(0, g.valor) });
  if (porItem.size) await actor.updateEmbeddedDocuments("Item", [...porItem.values()]);
}

const MOTIVOS = {
  semArma: "ICARUS.Armas.Aviso.SemArma",
  descarregada: "ICARUS.Armas.Aviso.Descarregada",
  semMunicao: "ICARUS.Armas.Aviso.SemMunicao"
};

/**
 * Ataque com uma arma: confere e gasta munição/disparo/arma arremessada, rola 1d20 + bônus
 * e envia o card. Sem munição, descarregada ou sem a arma: avisa e não ataca.
 * @param {object} [opcoes]
 * @param {boolean} [opcoes.criarMensagem=true]  false = só gasta e rola (usado na verificação)
 */
export async function rolarAtaque(actor, item, modo, { criarMensagem = true } = {}) {
  const arma = item.system;
  const consumirArremesso = game.settings.get(SISTEMA_ID, "consumirArremesso");
  const plano = planejarAtaque(itensDoAtor(actor), item, modo, { consumirArremesso });
  if (!plano.ok) {
    const tipoMunicao = game.i18n.localize(`ICARUS.Municao.Tipos.${arma.municaoTipo || "balas"}`);
    ui.notifications.warn(game.i18n.format(MOTIVOS[plano.motivo], { arma: item.name, municao: tipoMunicao }));
    return null;
  }
  await aplicarGastos(actor, plano.gastos);

  const atq = calcularAtaque(actor.system, arma, modo, itensDoAtor(actor));
  const roll = await new Roll(`1d20 ${atq.bonus < 0 ? "-" : "+"} ${Math.abs(atq.bonus)}`).evaluate();
  const d20 = roll.dice[0]?.total ?? roll.total - atq.bonus;

  // Alvo: só compara com a Defesa se houver exatamente 1 alvo marcado
  const alvos = Array.from(game.user.targets ?? []);
  let alvo = null;
  const defesa = alvos.length === 1 ? alvos[0].actor?.system?.defesa?.total : undefined;
  if (defesa !== undefined && defesa !== null) alvo = { nome: alvos[0].name, defesa, acertou: roll.total >= defesa };
  const ameaca = ehAmeaca(d20, arma);
  const podeCritico = ameaca && (!alvo || alvo.acertou);

  if (!criarMensagem) return { roll, d20, total: roll.total, plano, ameaca, podeCritico };

  // Munição restante, já com o gasto
  let municao = "";
  const pacote = plano.municao ? actor.items.get(plano.municao.id) : null;
  if (pacote) municao = game.i18n.format("ICARUS.Armas.Card.Restantes", { municao: pacote.name, n: pacote.system.quantidade });
  const atualizada = actor.items.get(item.id);
  if (modo === "fogo") {
    municao = [game.i18n.format("ICARUS.Armas.Card.Carregados", { n: atualizada.system.carregados, max: atualizada.system.capacidadeDisparos }), municao].filter(Boolean).join(" · ");
  }
  const arremessou = modo === "arremesso" && consumirArremesso;
  const dupla = (arma.propriedades ?? []).includes("dupla") && !!arma.danoExtra;
  const duasMaos = !dupla && !!arma.danoExtra;

  const content = await renderTemplate(`${T}/ataque.hbs`, {
    arma: { nome: item.name, img: item.img },
    modo: loc(`ICARUS.Armas.Modos.${modo}`),
    pericia: loc(`ICARUS.Pericias.${atq.pericia}`),
    agil: atq.agil,
    semProficiencia: !atq.proficiente,
    alcance: loc(`ICARUS.Armas.Alcances.${alcanceDoModo(arma, modo)}`),
    d20, bonus: comSinal(atq.bonus), total: roll.total,
    ameaca, faixa: faixaCritico(arma), falha: d20 === 1,
    alvo, municao,
    arremessou, restantesArma: atualizada.system.quantidade,
    podeCritico, mult: arma.criticoMult,
    dupla, duasMaos
  });
  const mensagem = await enviar(actor, content, {
    rolls: [roll],
    flags: { ataque: { actorUuid: actor.uuid, itemId: item.id, modo, podeCritico, arremessou } }
  });
  return { roll, d20, total: roll.total, plano, ameaca, podeCritico, mensagem };
}

/**
 * Dano da arma, com os botões Aplicar dano / metade / dobro / perda de PV (tokens selecionados).
 * O tipo usado no cálculo das resistências é o primeiro da arma (a Alabarda, corte e perfuração, usa corte).
 * @param {object} [opcoes] { critico, duasMaos, outraExtremidade }
 */
export async function rolarDano(actor, item, modo, opcoes = {}) {
  const arma = item.system;
  const dano = calcularDano(actor.system, arma, modo, opcoes);
  const roll = await new Roll(dano.formula).evaluate();
  const content = await renderTemplate(`${T}/dano.hbs`, {
    arma: { nome: item.name, img: item.img },
    texto: dano.texto,
    total: roll.total,
    critico: !!opcoes.critico,
    mult: arma.criticoMult,
    extra: opcoes.outraExtremidade ? loc("ICARUS.Armas.Card.OutraExtremidade") : opcoes.duasMaos ? loc("ICARUS.Armas.Card.DuasMaos") : "",
    tipos: (arma.tiposDano ?? []).map(t => loc(`ICARUS.TiposDano.${t}`)).join(" e "),
    botoes: true
  });
  return enviar(actor, content, { rolls: [roll], flags: { dano: { total: roll.total, tipo: arma.tiposDano?.[0] || "dano" } } });
}

/** Recarregar arma de fogo (ação de movimento). Não gasta Balas: o gasto é no disparo. */
export async function recarregar(actor, item, { criarMensagem = true } = {}) {
  const novo = planejarRecarga(itensDoAtor(actor), item.system);
  if (novo === null) {
    ui.notifications.warn(game.i18n.format("ICARUS.Armas.Aviso.SemBalas", { arma: item.name }));
    return null;
  }
  await item.update({ "system.carregados": novo });
  if (criarMensagem) {
    const content = await renderTemplate(`${T}/aviso.hbs`, {
      arma: { nome: item.name, img: item.img },
      texto: game.i18n.format("ICARUS.Armas.Card.Recarregou", {
        n: novo, max: item.system.capacidadeDisparos, balas: totalMunicao(itensDoAtor(actor), item.system.municaoTipo || "balas")
      })
    });
    await enviar(actor, content);
  }
  return novo;
}

/** Recolher a arma arremessada: quantidade + 1. */
export async function recolherArma(actor, item) {
  await item.update({ "system.quantidade": item.system.quantidade + 1 });
  ui.notifications.info(game.i18n.format("ICARUS.Armas.Aviso.Recolhida", { arma: item.name }));
}

/* ------------------------------ Botões dos cards ------------------------------ */

/**
 * Grava no card a marca de um botão usado (ex.: "danoRolado"), para ele ficar desativado
 * para todos e depois de recarregar a página. Só o autor da mensagem ou o Mestre podem gravar;
 * se não puder, o botão fica desativado só na tela de quem clicou.
 */
async function marcarBotao(message, acao) {
  const marca = MARCA_DO_BOTAO[acao];
  if (!marca || message.flags?.[SISTEMA_ID]?.[marca]) return;
  if (!message.canUserModify(game.user, "update")) return;
  await message.setFlag(SISTEMA_ID, marca, true);
}

/**
 * Dano rolado pela ficha: desativa os botões de dano do último card de ataque dessa arma
 * (se ainda não tiverem sido usados).
 */
export async function marcarDanoNoUltimoAtaque(actor, item) {
  const ultimo = game.messages.contents.findLast(m => {
    const a = m.flags?.[SISTEMA_ID]?.ataque;
    return a && a.actorUuid === actor.uuid && a.itemId === item.id;
  });
  if (ultimo && !botaoUsado(ultimo.flags[SISTEMA_ID], "dano")) await marcarBotao(ultimo, "dano");
}

/** Liga os botões dos cards de ataque (Foundry v12: hook renderChatMessage). */
export function registrarBotoesDoChat() {
  Hooks.on("renderChatMessage", (message, html) => {
    const dados = message.flags?.[SISTEMA_ID]?.ataque;
    if (!dados) return;
    const raiz = html instanceof HTMLElement ? html : html[0];
    const actor = fromUuidSync(dados.actorUuid);
    const podeUsar = game.user.isGM || actor?.isOwner;
    const flags = message.flags[SISTEMA_ID];
    const duasMaos = raiz.querySelector("[data-icarus-duas-maos]");
    if (duasMaos && botaoUsado(flags, "dano")) duasMaos.disabled = true;

    raiz.querySelectorAll("[data-icarus-acao]").forEach(botao => {
      if (!podeUsar) { botao.remove(); return; }
      const acao = botao.dataset.icarusAcao;
      // Cada botão vale uma vez por ataque (dano e crítico juntos)
      if (botaoUsado(flags, acao)) { botao.disabled = true; return; }
      botao.addEventListener("click", async ev => {
        ev.preventDefault();
        if (botao.disabled) return;
        const ator = fromUuidSync(dados.actorUuid);
        const item = ator?.items.get(dados.itemId);
        if (!item) return ui.notifications.warn(loc("ICARUS.Armas.Aviso.ItemSumiu"));
        // Desativa na hora (evita clique duplo) junto com o par dano/crítico
        const marca = MARCA_DO_BOTAO[acao];
        raiz.querySelectorAll("[data-icarus-acao]").forEach(b => { if (MARCA_DO_BOTAO[b.dataset.icarusAcao] === marca) b.disabled = true; });
        const comDuasMaos = duasMaos?.checked ?? false;
        if (marca === "danoRolado" && duasMaos) duasMaos.disabled = true;

        if (acao === "dano") await rolarDano(ator, item, dados.modo, { duasMaos: comDuasMaos });
        else if (acao === "critico" && dados.podeCritico) await rolarDano(ator, item, dados.modo, { duasMaos: comDuasMaos, critico: true });
        else if (acao === "extremidade") await rolarDano(ator, item, dados.modo, { outraExtremidade: true });
        else if (acao === "recolher") await recolherArma(ator, item);
        await marcarBotao(message, acao);
      });
    });
  });
}

/** Opção de mundo: arma arremessada sai do inventário (quantidade − 1). */
export function registrarConfiguracoesDeCombate() {
  game.settings.register(SISTEMA_ID, "consumirArremesso", {
    name: "ICARUS.Config.ConsumirArremesso.Nome",
    hint: "ICARUS.Config.ConsumirArremesso.Dica",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
}
