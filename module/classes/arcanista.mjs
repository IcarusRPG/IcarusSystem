/**
 * Arcanista:
 * - Linhagem (1º, permanente): Mago, Feiticeiro ou Mago de Sangue. Ao escolher, o PM passa a
 *   base × nível + atributo (uma vez) pela linhagem (classes.json pm.porLinhagem), o atributo de conjuração
 *   vira INT ou CAR (pmAtributo; a ficha pode trocar), a lista de magias é Arcana ou de Sangue e
 *   as habilidades do ramo são concedidas (classes-dados.mjs → condicoesDasHabilidades).
 * - Herança Ancestral (Feiticeiro): concede a habilidade da herança (Dragão, Leviatã, Fênix).
 * - Sem linhagem: 3 + INT e aviso "escolha a Linhagem" na aba Classe.
 * - Foco Arcano (Mago): sem foco em mãos não lança (magias.mjs); o Mestre pode liberar aqui.
 * - Magias conhecidas: limite pela linhagem e nível (+1 por escola escolhida), lista (Arcana ou
 *   Sangue) e nível de magia; o jogador é impedido, o Mestre só recebe o aviso.
 * - Mana Transbordante (20º): no início do turno em combate, cartão com "Recuperar 2 PM" (não passa do máximo).
 * - Sopro do Dragão (Herança de Dragão, 5º): 4 PM, cone de 6 m posicionado no mapa, 4d6/6d6/8d6 do
 *   elemento (escolhido no primeiro uso), Reflexos contra a CD das magias; botões de aplicar dano.
 */
import { SISTEMA_ID } from "../config.mjs";
import { pmDisponivel, gastoDePM } from "../pm-gasto.mjs";
import { pmDaLinhagem, linhagemDasEscolhas, tradicaoDaLinhagem, temHabilidadeNosItens } from "../classes-dados.mjs";
import { classeDoAtor, concederHabilidades, ACOES_DE_MECANICA } from "../classes.mjs";
import { APOS_CAMINHO } from "../escolhas.mjs";
import { INICIO_DO_TURNO } from "../acoes.mjs";
import { registrarLinhas, escolhasDoAtor, avisarNoChat } from "./comum.mjs";
import { focoEmpunhado, linhagemPrecisaDeFoco } from "../objetos-dados.mjs";
import { limiteDeMagiasConhecidas, motivoParaNaoAprender } from "../magias-dados.mjs";
import { areaNoMapa } from "../magias-area.mjs";
import { rolarDanoAvulso } from "../dano.mjs";

const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);
const esc = t => Handlebars.escapeExpression(t ?? "");
const F = SISTEMA_ID;

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
      "system.classeConfig.pmAtributo": pm.pmAtributo,
      "system.classeConfig.pmAtributoSoNoPrimeiroNivel": pm.pmAtributoSoNoPrimeiroNivel
    });
  } else ui.notifications.warn(fmt("ICARUS.Classe.Manual", { nome: actor.name }));
  await actor.update(mudancas);
  // Habilidades do ramo (Foco Arcano, Sangue Dotado, Pacto de Sangue…)
  await concederHabilidades(actor);
}

APOS_CAMINHO.set("linhagem", (actor, i) => (ehArcanista(actor) ? aplicarLinhagem(actor, i) : null));
APOS_CAMINHO.set("heranca-ancestral", actor => (ehArcanista(actor) ? concederHabilidades(actor) : null));

/* ---------------- Magias conhecidas ---------------- */

/** Magias adicionais das escolas escolhidas (Escola Predileta, Segunda Escola). */
const extrasDeEscola = actor => actor.items.filter(i => ["arcanista__escola-predileta", "arcanista__segunda-escola"].includes(i.flags?.[F]?.id) && i.flags?.[F]?.escola).length;

/** Limite e quantas magias o Arcanista conhece (itens de magia na ficha). */
export function conhecidasDoAtor(actor) {
  const linhagem = linhagemDoAtor(actor);
  return { conhecidas: actor.items.filter(i => i.type === "magia").length, limite: limiteDeMagiasConhecidas(linhagem, actor.system.nivel, extrasDeEscola(actor)) };
}

/* ---------------- Aba Classe ---------------- */

registrarLinhas("arcanista", actor => {
  // A escolha pendente já tem botão na aba (comum.mjs); aqui só o estado e o aviso
  const linhagem = linhagemDoAtor(actor);
  const linhas = [{ id: "arcanista:linhagem", rotulo: loc("ICARUS.Arcanista.Linhagem"),
    info: linhagem ? loc(`ICARUS.Arcanista.Linhagens.${linhagem}`) : loc("ICARUS.Arcanista.SemLinhagem") }];
  if (linhagem) {
    const c = conhecidasDoAtor(actor);
    linhas.push({ id: "arcanista:conhecidas", rotulo: loc("ICARUS.Arcanista.Conhecidas"), info: fmt("ICARUS.Arcanista.ConhecidasInfo", { n: c.conhecidas, limite: c.limite }) });
  }
  if (linhagemPrecisaDeFoco(linhagem)) {
    const foco = focoEmpunhado(actor.items);
    const liberado = !!actor.getFlag(F, "focoLiberado");
    linhas.push({ id: "arcanista:foco", rotulo: loc("ICARUS.Arcanista.Foco"),
      info: foco?.name ?? (liberado ? loc("ICARUS.Arcanista.FocoLiberado") : loc("ICARUS.Arcanista.FocoNenhum")),
      ...(game.user.isGM ? { botao: true, ativo: liberado, dica: loc(liberado ? "ICARUS.Arcanista.BloquearFoco" : "ICARUS.Arcanista.LiberarFoco") } : {}) });
  }
  if (temHabilidadeNosItens([...actor.items], "arcanista", "heranca-de-dragao") && actor.system.nivel >= 5) {
    const elemento = actor.getFlag(F, "elementoDragao");
    linhas.push({ id: "arcanista:sopro", rotulo: loc("ICARUS.Arcanista.Sopro"), botao: true,
      info: fmt("ICARUS.Arcanista.SoproInfo", { dados: dadosDoSopro(actor.system.nivel), elemento: elemento ? loc(`ICARUS.TiposDano.${elemento}`) : "?" }) });
  }
  return linhas;
});

// Mestre: liberar / voltar a exigir o foco
ACOES_DE_MECANICA.set("arcanista:foco", async actor => {
  if (!game.user.isGM) return;
  if (actor.getFlag(F, "focoLiberado")) await actor.unsetFlag(F, "focoLiberado");
  else await actor.setFlag(F, "focoLiberado", true);
});

/* ---------------- Mana Transbordante ---------------- */

INICIO_DO_TURNO.push(async actor => {
  if (!ehArcanista(actor) || !temHabilidadeNosItens([...actor.items], "arcanista", "mana-transbordante")) return;
  if (actor.system.pm.value >= actor.system.pm.max) return;
  const donos = game.users.filter(u => actor.testUserPermission(u, "OWNER")).map(u => u.id);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }), whisper: donos,
    content: `<div class="icarus-rolagem icarus-lembrete"><p class="condicao-descricao">${esc(fmt("ICARUS.Arcanista.ManaTexto", { nome: actor.name }))}</p>
      <button type="button" class="btn" data-icarus-mana>${esc(loc("ICARUS.Arcanista.ManaBotao"))}</button></div>`,
    flags: { [F]: { manaTransbordante: { actorUuid: actor.uuid, usado: false } } }
  });
});

async function aoRenderizar(mensagem, html) {
  const dados = mensagem.flags?.[F]?.manaTransbordante;
  if (!dados) return;
  const raiz = html instanceof HTMLElement ? html : html?.[0];
  const botao = raiz?.querySelector("[data-icarus-mana]");
  if (!botao) return;
  const actor = fromUuidSync(dados.actorUuid);
  botao.disabled = dados.usado || !actor?.isOwner;
  botao.addEventListener("click", async () => {
    botao.disabled = true;
    const ganho = Math.min(2, actor.system.pm.max - actor.system.pm.value);
    if (ganho > 0) await actor.update({ "system.pm.value": actor.system.pm.value + ganho });
    if (mensagem.isOwner) await mensagem.setFlag(F, "manaTransbordante", { ...dados, usado: true });
  });
}

Hooks.once("init", () => {
  if ((game.release?.generation ?? 12) >= 13) Hooks.on("renderChatMessageHTML", aoRenderizar);
  else Hooks.on("renderChatMessage", aoRenderizar);
  // Magias conhecidas: o jogador não passa do limite nem pega magia de fora da lista ou do nível
  Hooks.on("preCreateItem", (item, dados, opcoes, userId) => {
    const actor = item.parent;
    if (userId !== game.user.id || item.type !== "magia" || !actor || !ehArcanista(actor) || !linhagemDoAtor(actor)) return;
    const c = conhecidasDoAtor(actor);
    const motivo = motivoParaNaoAprender(item.system, { nivel: actor.system.nivel, tradicao: actor.getFlag(F, "tradicaoMagias"), ...c });
    if (!motivo) return;
    const texto = fmt(motivo.chave, motivo.dados);
    if (game.user.isGM) { ui.notifications.warn(fmt("ICARUS.Magias.Conhecidas.Mestre", { motivo: texto })); return; }
    ui.notifications.warn(texto);
    return false;
  });
});

/* ---------------- Sopro do Dragão ---------------- */

/** Dados do Sopro pelo nível: 4d6; 6d6 no 11º; 8d6 no 17º. */
export const dadosDoSopro = nivel => (nivel >= 17 ? "8d6" : nivel >= 11 ? "6d6" : "4d6");
const ELEMENTOS_DRAGAO = ["fogo", "frio", "eletrico", "acido"];
const CUSTO_SOPRO = 4;

ACOES_DE_MECANICA.set("arcanista:sopro", async actor => {
  const { DialogV2 } = foundry.applications.api;
  const atual = actor.getFlag(F, "elementoDragao");
  const opcoes = ELEMENTOS_DRAGAO.map(e => `<option value="${e}"${e === atual ? " selected" : ""}>${esc(loc(`ICARUS.TiposDano.${e}`))}</option>`).join("");
  const r = await DialogV2.wait({
    window: { title: loc("ICARUS.Arcanista.Sopro") },
    content: `<div class="icarus-uso"><p>${esc(fmt("ICARUS.Arcanista.SoproTexto", { dados: dadosDoSopro(actor.system.nivel), cd: actor.system.magia?.cd ?? "?" }))}</p>
      <label class="linha">${esc(loc("ICARUS.Arcanista.Elemento"))} <select name="elemento"${atual ? " disabled" : ""}>${opcoes}</select></label>
      <label class="linha">${esc(loc("ICARUS.Poderes.CustoPM"))} <input type="number" name="pm" value="${CUSTO_SOPRO}" min="0" step="1"></label>
      <p class="dica">${esc(fmt("ICARUS.Poderes.PMAtual", { pm: actor.system.pm.value, max: actor.system.pm.max }))}</p></div>`,
    buttons: [
      { action: "ok", label: loc("ICARUS.Arcanista.Soprar"), default: true,
        callback: (ev, b) => ({ elemento: atual ?? b.form.elements.elemento.value, pm: Math.max(0, Math.trunc(Number(b.form.elements.pm.value) || 0)) }) },
      { action: "cancelar", label: loc("ICARUS.Testes.Cancelar") }
    ],
    rejectClose: false
  });
  if (!r?.elemento) return;
  if (r.pm > pmDisponivel(actor)) return ui.notifications.warn(fmt("ICARUS.Magias.SemPM", { custo: r.pm, pm: pmDisponivel(actor) }));
  if (!atual) await actor.setFlag(F, "elementoDragao", r.elemento);
  const token = (actor.getActiveTokens?.(false, true) ?? []).find(t => t.parent?.id === canvas?.scene?.id) ?? null;
  // O cone sai do token: reaproveita o posicionamento de área das magias
  const sopro = { name: loc("ICARUS.Arcanista.Sopro"), id: "sopro-do-dragao", flags: { [F]: { id: "sopro-do-dragao" } }, system: { alcance: "cone de 6 m a partir de você", alvo: "" } };
  const area = await areaNoMapa({ actor, item: sopro, tokenConjurador: token, cor: null, instantanea: true });
  if (area === null) return;
  if (r.pm) await actor.update(gastoDePM(actor, r.pm));
  const alvos = [...(game.user.targets ?? [])].map(t => t.document?.uuid).filter(Boolean);
  await avisarNoChat(actor, fmt("ICARUS.Arcanista.SoproChat", { nome: actor.name, pm: r.pm, cd: actor.system.magia?.cd ?? "?" }));
  await rolarDanoAvulso({
    partes: [{ formula: dadosDoSopro(actor.system.nivel), tipo: r.elemento }], titulo: loc("ICARUS.Arcanista.Sopro"), img: actor.img, actor,
    flags: {
      magia: { id: "sopro-do-dragao", cd: actor.system.magia?.cd ?? null, resistencia: { atributo: "reflexos", efeito: "metade" } },
      magiaVfx: { preset: "cone", elemento: r.elemento, id: "sopro-do-dragao", origem: token?.uuid ?? null, alvos, area: area ?? { forma: "cone", tamanho: 6 } }
    }
  });
});
