/**
 * Ataque, dano, munição, recarga e arremesso dentro do Foundry, com os cards de chat.
 * As regras (bônus, fórmulas, o que gastar) ficam em combate.mjs; aqui só se aplica e se mostra.
 */
import { SISTEMA_ID } from "./config.mjs";
import { comSinal, numero } from "./regras.mjs";
import { vantagemDaRolagem, dadosDoCard } from "./rolls.mjs";
import {
  calcularAtaque, calcularDano, planejarAtaque, planejarRecarga, faixaCritico, alcanceDoModo, totalMunicao,
  MARCA_DO_BOTAO, botaoUsado, rolarD20, modoD20, resolverAtaque, resolverAtaqueMultiplo
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

/* ------------------------------ Ataque ------------------------------ */

/**
 * Seções de opções do diálogo de ataque. Cada provedor recebe (actor, item, modo) e devolve
 * { id, titulo, campos[], aviso? } ou null. Regras (flanco, camuflagem, duas armas) e classes
 * acrescentam provedores aqui; os valores voltam em opcoes.<nome do campo>.
 */
export const PROVEDORES_ATAQUE = [];

/**
 * Modificadores aplicados ao rolar, a partir das opções escolhidas. Cada um recebe
 * { actor, item, modo, opcoes, alvos } e devolve null ou
 * { bonus?, linhas?[], extrasDano?[], rolls?[], forcarAcerto?, cancelar?: { motivo, texto, linhas?, rolls? } }.
 */
export const MODIFICADORES_ATAQUE = [];

/** Alvos marcados pelo usuário, com a Defesa de cada um. */
export function alvosMarcados() {
  return Array.from(game.user.targets ?? []).map(t => ({
    id: t.document?.uuid ?? t.id, nome: t.name, img: t.document?.texture?.src ?? t.actor?.img,
    defesa: t.actor?.system?.defesa?.total ?? null, token: t
  }));
}

/**
 * Ataque com uma arma. Pela ficha abre o diálogo de ataque (Shift = vantagem, Ctrl = desvantagem
 * já pré-selecionados); confirmar rola. Sem munição, descarregada ou sem a arma: avisa e não ataca.
 * @param {object} [opcoes]
 * @param {boolean} [opcoes.criarMensagem=true]  false = só gasta e rola, sem diálogo (verificação)
 * @param {boolean} [opcoes.dialogo=true]        false = rola direto com as opções dadas
 */
export async function rolarAtaque(actor, item, modo, opcoes = {}) {
  const { criarMensagem = true, dialogo = true } = opcoes;
  if (!criarMensagem || !dialogo) return executarAtaque(actor, item, modo, opcoes);
  const { DialogoAtaque } = await import("./apps/dialogo-ataque.mjs");
  const contexto = await contextoDoDialogo(actor, item, modo);
  return new DialogoAtaque({
    actor, item, modo, contexto,
    preset: { vantagem: !!opcoes.vantagem, desvantagem: !!opcoes.desvantagem },
    aoConfirmar: escolhas => (escolhas.duasArmas ? agredirComDuasArmas(actor, item, modo, escolhas) : executarAtaque(actor, item, modo, { ...escolhas }))
  }).render(true);
}

/**
 * Agredir com duas armas: um ataque com cada arma (ou com cada extremidade da arma Dupla),
 * cada um com o próprio d20, aplicando a penalidade (ou a regra do poder) nos dois.
 * O segundo ataque usa o mesmo modo de rolagem e opções do diálogo.
 */
export async function agredirComDuasArmas(actor, item, modo, escolhas) {
  const { planoDuasArmas } = await import("./combate.mjs");
  const { armasEmpunhadas } = await import("./regras-ataque.mjs");
  const plano = planoDuasArmas(armasEmpunhadas(actor), actor.flags?.[SISTEMA_ID] ?? {});
  if (!plano.possivel) return executarAtaque(actor, item, modo, { ...escolhas, duasArmas: false });
  const comuns = { ...escolhas, duasArmas: false, ataqueDeDuasArmas: true, penalidadeDuasArmas: plano.penalidade };
  // Primeiro ataque: a arma clicada (se for uma das duas), senão a primeira
  const primeira = [plano.primeira.id, plano.segunda.id].includes(item.id) ? item : actor.items.get(plano.primeira.id);
  const segunda = plano.dupla ? primeira : actor.items.get(primeira.id === plano.primeira.id ? plano.segunda.id : plano.primeira.id);
  await executarAtaque(actor, primeira, primeira.id === item.id ? modo : primeira.system.modos[0], comuns);
  return executarAtaque(actor, segunda, segunda.id === item.id ? modo : segunda.system.modos[0], {
    ...comuns, segundoSemAtributo: plano.segundoSemAtributo, outraExtremidade: plano.dupla,
    // Camuflagem já foi rolada para o primeiro; o segundo rola de novo (ataque separado)
  });
}

/** Dados do diálogo de ataque: arma, bônus, alvos e as seções dos provedores. */
async function contextoDoDialogo(actor, item, modo) {
  const atq = calcularAtaque(actor.system, item.system, modo, itensDoAtor(actor));
  const flags = vantagemDaRolagem(actor, ["ataque"]);
  const secoes = [];
  for (const provedor of PROVEDORES_ATAQUE) {
    const secao = await provedor(actor, item, modo);
    if (secao) secoes.push(secao);
  }
  return {
    arma: { nome: item.name, img: item.img },
    modoRotulo: loc(`ICARUS.Armas.Modos.${modo}`),
    pericia: loc(`ICARUS.Pericias.${atq.pericia}`),
    bonus: comSinal(atq.bonus),
    modoFlags: flags.vantagem || flags.desvantagem
      ? game.i18n.format("ICARUS.Ataque.ModoFlags", { modo: loc(`ICARUS.Rolagem.Modo.${modoD20(flags)}`) })
      : "",
    alvos: alvosMarcados(),
    secoes
  };
}

/**
 * Rola o ataque: gasta munição/disparo, aplica os modificadores (flanco, camuflagem…),
 * rola o d20 (vantagem/desvantagem do diálogo + flags) e resolve acerto/crítico por alvo.
 */
export async function executarAtaque(actor, item, modo, opcoes = {}) {
  const { criarMensagem = true } = opcoes;
  const arma = item.system;
  const consumirArremesso = game.settings.get(SISTEMA_ID, "consumirArremesso");
  const plano = planejarAtaque(itensDoAtor(actor), item, modo, { consumirArremesso });
  if (!plano.ok) {
    const tipoMunicao = game.i18n.localize(`ICARUS.Municao.Tipos.${arma.municaoTipo || "balas"}`);
    ui.notifications.warn(game.i18n.format(MOTIVOS[plano.motivo], { arma: item.name, municao: tipoMunicao }));
    return null;
  }
  await aplicarGastos(actor, plano.gastos);

  const alvos = criarMensagem ? alvosMarcados() : [];
  const atq = calcularAtaque(actor.system, arma, modo, itensDoAtor(actor));
  let bonus = atq.bonus + Math.trunc(Number(opcoes.bonusExtra) || 0);
  const linhas = [];
  const extrasDano = [];
  const rollsExtras = [];
  let forcarAcerto = !!opcoes.forcarAcerto;
  for (const mod of MODIFICADORES_ATAQUE) {
    const m = await mod({ actor, item, modo, opcoes, alvos });
    if (!m) continue;
    if (m.cancelar) {
      // Ex.: falhou pela camuflagem: o ataque termina antes do d20
      if (!criarMensagem) return { cancelado: m.cancelar.motivo };
      const content = await renderTemplate(`${T}/aviso.hbs`, { arma: { nome: item.name, img: item.img }, texto: m.cancelar.texto, linhas: m.cancelar.linhas ?? [] });
      return enviar(actor, content, { rolls: m.cancelar.rolls ?? [] });
    }
    bonus += m.bonus ?? 0;
    if (m.linhas) linhas.push(...m.linhas);
    if (m.extrasDano) extrasDano.push(...m.extrasDano);
    if (m.rolls) rollsExtras.push(...m.rolls);
    if (m.forcarAcerto) forcarAcerto = true;
  }

  const v = vantagemDaRolagem(actor, ["ataque"], opcoes);
  const r = await rolarD20({ ...v, bonus });
  const margem = numero(arma.criticoMargem) || 20;
  const resultados = resolverAtaqueMultiplo({ d20: r.natural, total: r.total, margem, forcarAcerto }, alvos);
  const semAlvo = resolverAtaque({ d20: r.natural, total: r.total, margem, forcarAcerto });
  const ameaca = semAlvo.ameaca;
  // Dano crítico disponível se algum alvo sofreu crítico; sem alvo, se o d20 caiu na margem
  const podeCritico = alvos.length ? resultados.some(x => x.critico) : ameaca;

  if (!criarMensagem) return { roll: r.roll, d20: r.d20, total: r.total, plano, ameaca, podeCritico, resultados };

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
    penalidadeArmadura: atq.penalidadeArmadura ? game.i18n.format("ICARUS.Proficiencias.CardArmadura", { valor: atq.penalidadeArmadura }) : "",
    alcance: loc(`ICARUS.Armas.Alcances.${alcanceDoModo(arma, modo)}`),
    ...dadosDoCard(r),
    bonus: comSinal(bonus), total: r.total,
    ameaca, faixa: faixaCritico(arma), automatico: semAlvo.automatico,
    linhas,
    alvos: resultados.map(x => ({ ...x, rotulo: x.critico ? "Critico" : x.acerta ? "Acertou" : "Errou", classe: x.critico ? "critico" : x.acerta ? "acertou" : "errou" })),
    municao,
    arremessou, restantesArma: atualizada.system.quantidade,
    podeCritico, mult: arma.criticoMult,
    dupla, duasMaos,
    corpoACorpo: modo === "corpo-a-corpo"
  });
  const mensagem = await enviar(actor, content, {
    rolls: [...rollsExtras, r.roll],
    flags: { ataque: { actorUuid: actor.uuid, itemId: item.id, modo, podeCritico, arremessou, extrasDano, segundoSemAtributo: !!opcoes.segundoSemAtributo, outraExtremidade: !!opcoes.outraExtremidade, atributoDano: opcoes.atributoDano ?? "FOR" } }
  });
  return { roll: r.roll, d20: r.d20, total: r.total, plano, ameaca, podeCritico, resultados, mensagem };
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
    // Manobra (no lugar de um ataque): abre o diálogo de manobra do atacante
    const botaoManobra = raiz.querySelector("[data-icarus-manobra-abrir]");
    if (botaoManobra) {
      if (!podeUsar) botaoManobra.remove();
      else botaoManobra.addEventListener("click", async ev => {
        ev.preventDefault();
        const { abrirManobra } = await import("./manobras.mjs");
        const ator = fromUuidSync(dados.actorUuid);
        if (ator) abrirManobra(ator);
      });
    }
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

        // Extras de poderes (Ataque Furtivo, Marca da Presa…) e "sem atributo" guardados no card
        const doAtaque = { extras: dados.extrasDano ?? [], semAtributo: !!dados.segundoSemAtributo, atributo: dados.atributoDano ?? "FOR" };
        if (acao === "dano") await rolarDano(ator, item, dados.modo, { ...doAtaque, duasMaos: comDuasMaos, outraExtremidade: !!dados.outraExtremidade });
        else if (acao === "critico" && dados.podeCritico) await rolarDano(ator, item, dados.modo, { ...doAtaque, duasMaos: comDuasMaos, critico: true, outraExtremidade: !!dados.outraExtremidade });
        else if (acao === "extremidade") await rolarDano(ator, item, dados.modo, { ...doAtaque, outraExtremidade: true });
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
