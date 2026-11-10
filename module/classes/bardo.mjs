/**
 * Bardo:
 * - Conjuração Bárdica (1º): lista Arcana, CD de Carisma, nível de magia até o 4º (derivar.mjs);
 *   escolhe 3 escolas (permanente, Encantamento obrigatória; tela "escolas" em escolhas.mjs) e só
 *   aprende magias delas. Magias conhecidas: 2 + ⌊nível/2⌋, +2 por Repertório Ampliado. O jogador é
 *   impedido de passar disso; o Mestre só recebe o aviso.
 * - Caminho (1º, permanente): Poesia ou Música (flags.caminho = "poesia" | "musica").
 * - Estilo (3º, permanente): só as opções do Caminho (escolha.porCaminho); flags.estilo; as habilidades
 *   do Estilo (3º, 9º, 15º) e os poderes do Estilo só aparecem para o Estilo escolhido.
 * - Chama da Musa (1º): 2 PM (+2 PM para +1); cartão com Aplicar efeito: +1..+5 nos testes de perícia
 *   até o fim da cena (Poesia: também resistência; Música: também ataque). Só uma Chama ativa
 *   (flags.chamaAtiva; limpa no fim da cena/combate ou em "Encerrar Chama").
 * - Talento de Palco (2º): no diálogo de teste de perícia não treinada (module/rolls.mjs).
 * - Verso (Poesia): 1 PM; Louvor rola o dado do aliado; Escárnio: cartão com Frustrado (Vontade anula).
 * - Execução (Música): exige instrumento musical (o Mestre pode liberar); 1 PM; Cadência (+1 Defesa,
 *   +3 m, 1 rodada; Muralha de Som: RD 3 contra Corte/Perfuração/Impacto) ou Dissonância (Abalado,
 *   Vontade anula; Riff Pesado: Impacto; Nu Metal: Psíquico). flags.execucao { tipo, ativa }; Manter sem custo.
 * - Obra-Prima (20º): com a Chama ativa, custo em PM das habilidades de Bardo e das magias pela metade.
 * - Estádio Lotado (Heavy Metal, 15º): 8 PM, uma vez por cena, 8d6 de Impacto, Reflexos reduz à metade.
 * - Voz de Comando: vantagem no próximo teste do aliado marcado. Fascinar: o Mestre abre o Teste
 *   Oposto (Atuação × Vontade). Manipular: cartão com Enfeitiçado (Vontade anula).
 */
import { SISTEMA_ID, PERICIAS } from "../config.mjs";
import { temHabilidadeNosItens } from "../classes-dados.mjs";
import { classeDoAtor, ACOES_DE_MECANICA, concederHabilidades } from "../classes.mjs";
import { usarPoder, ANTES_DE_USAR, GANCHOS_DE_PODER, FIM_DO_COMBATE } from "../acoes.mjs";
import { APOS_CAMINHO } from "../escolhas.mjs";
import { FIM_DA_CENA } from "../condicoes-foundry.mjs";
import { registrarLinhas, itemDeClasse, avisarNoChat, USO_PROPRIO, DEPOIS_DA_ESCOLHA } from "./comum.mjs";
import { calcularCD } from "../combate.mjs";
import { rolarDanoAvulso } from "../dano.mjs";
import { limiteDeMagiasDoBardo, motivoParaNaoAprender, bonusDaChama, dadoDoLouvor, custoComObraPrima } from "../magias-dados.mjs";
import { obraPrimaAtiva } from "../magias.mjs";

const F = SISTEMA_ID;
const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);
const esc = t => Handlebars.escapeExpression(t ?? "");

const ehBardo = actor => classeDoAtor(actor)?.id === "bardo";
const tem = (actor, id) => temHabilidadeNosItens([...actor.items], "bardo", id);
const RESISTENCIAS = ["fortitude", "reflexos", "vontade"];
const cdDoBardo = actor => calcularCD(actor.system, "CAR").cd;

for (const id of ["chama-da-musa", "estadio-lotado"]) USO_PROPRIO.add(`bardo__${id}`);

/* ---------------- Caminho e Estilo ---------------- */

export const CAMINHOS_BARDO = ["poesia", "musica"];
const slug = t => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

DEPOIS_DA_ESCOLHA.set("caminho", (actor, i) => (ehBardo(actor) ? actor.setFlag(F, "caminho", CAMINHOS_BARDO[i]) : null));
APOS_CAMINHO.set("estilo", async (actor, i) => {
  if (!ehBardo(actor)) return;
  const estilo = classeDoAtor(actor).habilidades.find(h => h.id === "estilo").escolha.opcoes[i];
  await actor.setFlag(F, "estilo", slug(estilo));
  await concederHabilidades(actor);
});

/* ---------------- Magias conhecidas ---------------- */

/** Escolas, limite e quantas magias o Bardo conhece. */
export function magiasDoBardo(actor) {
  const conj = actor.items.find(i => i.flags?.[F]?.id === "bardo__conjuracao-bardica");
  const repertorios = actor.items.filter(i => i.flags?.[F]?.id === "bardo__repertorio-ampliado" && i.flags?.[F]?.magiasExtras).length;
  return {
    escolas: conj?.flags?.[F]?.escolas ?? [],
    conhecidas: actor.items.filter(i => i.type === "magia").length,
    limite: limiteDeMagiasDoBardo(actor.system.nivel, repertorios)
  };
}

/* ---------------- Obra-Prima ---------------- */

ANTES_DE_USAR.push(async (actor, item, uso) => {
  if (!ehBardo(actor) || !String(item.flags?.[F]?.id ?? "").startsWith("bardo__") || !obraPrimaAtiva(actor)) return;
  uso.pm = custoComObraPrima(uso.pm);
});

/** Gasta PM com confirmação (já com a Obra-Prima); false se cancelar ou faltar PM. */
async function gastarPM(actor, custo, titulo) {
  const pm = obraPrimaAtiva(actor) ? custoComObraPrima(custo) : custo;
  if (pm > actor.system.pm.value) { ui.notifications.warn(fmt("ICARUS.Poderes.SemPM", { nome: actor.name, pm, atual: actor.system.pm.value })); return false; }
  if (pm) await actor.update({ "system.pm.value": actor.system.pm.value - pm });
  return pm;
}

/** Cartão com "Aplicar efeito / condição" e Voltar (module/magias-efeitos.mjs). */
function cartaoDeEfeito(actor, { id, nome, img, texto, efeito }) {
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="icarus-rolagem icarus-lembrete"><p class="condicao-descricao">${esc(texto)}</p></div>`,
    flags: { [F]: { magia: { id, itemUuid: actor.uuid, actorUuid: actor.uuid, nome, img: img ?? actor.img, efeitos: [efeito] }, efeitosAplicados: [] } }
  });
}

/* ---------------- Chama da Musa ---------------- */

let extraDaChama = false;

GANCHOS_DE_PODER.set("bardo__chama-da-musa", {
  antes: actor => {
    if (actor.getFlag(F, "chamaAtiva")) { ui.notifications.warn(loc("ICARUS.Bardo.ChamaJaAtiva")); return false; }
  },
  depois: async (actor, item) => {
    const bonus = bonusDaChama(actor.system.nivel) + (extraDaChama ? 1 : 0);
    const caminho = actor.getFlag(F, "caminho");
    const pericias = PERICIAS.map(p => p.chave).filter(k => caminho === "poesia" || !RESISTENCIAS.includes(k));
    const mudancas = [...pericias.map(k => ({ chave: `pericia:${k}`, valor: bonus, modo: "somar" })), ...(caminho === "musica" ? [{ chave: "ataque", valor: bonus, modo: "somar" }] : [])];
    await actor.setFlag(F, "chamaAtiva", { bonus, caminho: caminho ?? null });
    return cartaoDeEfeito(actor, {
      id: "chama-da-musa", nome: item.name, img: item.img,
      texto: fmt(caminho === "poesia" ? "ICARUS.Bardo.ChamaPoesia" : caminho === "musica" ? "ICARUS.Bardo.ChamaMusica" : "ICARUS.Bardo.Chama", { nome: actor.name, bonus }),
      efeito: { tipo: "efeito", alvo: "aliados", duracao: { tipo: "cena" }, mudancas }
    });
  }
});

ACOES_DE_MECANICA.set("bardo:chama", async actor => {
  if (actor.getFlag(F, "chamaAtiva")) return ui.notifications.warn(loc("ICARUS.Bardo.ChamaJaAtiva"));
  const item = itemDeClasse(actor, "bardo", "chama-da-musa");
  if (!item) return;
  const r = await foundry.applications.api.DialogV2.wait({
    window: { title: item.name },
    content: `<div class="icarus-uso"><p>${esc(fmt("ICARUS.Bardo.ChamaTexto", { bonus: bonusDaChama(actor.system.nivel) }))}</p>
      <label class="chk"><input type="checkbox" name="extra"> ${esc(loc("ICARUS.Bardo.ChamaExtra"))}</label></div>`,
    buttons: [
      { action: "ok", label: loc("ICARUS.Poderes.Usar"), default: true, callback: (ev, b) => ({ extra: !!b.form.elements.extra.checked }) },
      { action: "cancelar", label: loc("ICARUS.Testes.Cancelar") }
    ],
    rejectClose: false
  });
  if (!r || typeof r !== "object") return;
  extraDaChama = r.extra;
  try { return await usarPoder(actor, item, { custo: 2 + (r.extra ? 2 : 0) }); } finally { extraDaChama = false; }
});
ACOES_DE_MECANICA.set("bardo:chama-encerrar", actor => actor.unsetFlag(F, "chamaAtiva"));

/* ---------------- Verso (Poesia) ---------------- */

ACOES_DE_MECANICA.set("bardo:verso", async actor => {
  const r = await foundry.applications.api.DialogV2.wait({
    window: { title: loc("ICARUS.Bardo.Verso") },
    content: `<div class="icarus-uso"><p>${esc(fmt("ICARUS.Bardo.VersoTexto", { dado: dadoDoLouvor(actor.system.nivel), cd: cdDoBardo(actor) }))}</p></div>`,
    buttons: [
      { action: "louvor", label: loc("ICARUS.Bardo.Louvor"), default: true },
      { action: "escarnio", label: loc("ICARUS.Bardo.Escarnio") },
      { action: "cancelar", label: loc("ICARUS.Testes.Cancelar") }
    ],
    rejectClose: false
  });
  if (r !== "louvor" && r !== "escarnio") return;
  if ((await gastarPM(actor, 1)) === false) return;
  const alvo = [...(game.user.targets ?? [])][0]?.name ?? loc("ICARUS.Nobre.UmAliado");
  if (r === "louvor") {
    const roll = await new Roll(dadoDoLouvor(actor.system.nivel)).evaluate();
    return avisarNoChat(actor, fmt("ICARUS.Bardo.LouvorChat", { nome: actor.name, alvo, valor: roll.total }), { rolls: [roll] });
  }
  const cd = cdDoBardo(actor);
  await cartaoDeEfeito(actor, { id: "escarnio", nome: loc("ICARUS.Bardo.Escarnio"), texto: fmt("ICARUS.Bardo.EscarnioChat", { nome: actor.name, cd }),
    efeito: { tipo: "efeito", alvo: "inimigo", duracao: { tipo: "rodadas", rodadas: 1 }, condicoes: ["frustrado"], resistencia: { atributo: "vontade", efeito: "anula" } } });
  if (game.user.isGM) return game.icarus.testes.abrirResistencia({ tipos: ["vontade"], pericia: "vontade", origem: loc("ICARUS.Bardo.Escarnio"), cd });
});

/* ---------------- Execução (Música) ---------------- */

/** Tem instrumento musical (item comum "Instrumento musical") ou o Mestre liberou? */
export const temInstrumento = actor => !!actor.getFlag(F, "instrumentoLiberado")
  || actor.items.some(i => i.flags?.[F]?.id === "instrumento-musical" || /instrumento/i.test(i.name ?? ""));

async function cartaoDaExecucao(actor, tipo) {
  const cd = cdDoBardo(actor);
  if (tipo === "cadencia") {
    const mudancas = [{ chave: "defesa", valor: 1, modo: "somar" }, { chave: "deslocamento", valor: 3, modo: "somar" },
      ...(tem(actor, "muralha-de-som") ? ["corte", "perfuracao", "impacto"].map(t => ({ chave: `reducao:${t}`, valor: 3, modo: "somar" })) : [])];
    return cartaoDeEfeito(actor, { id: "cadencia", nome: loc("ICARUS.Bardo.Cadencia"), texto: fmt("ICARUS.Bardo.CadenciaChat", { nome: actor.name }),
      efeito: { tipo: "efeito", alvo: "aliados", duracao: { tipo: "rodadas", rodadas: 1 }, mudancas } });
  }
  const condicoes = ["abalado", ...(tem(actor, "nu-metal") ? ["frustrado"] : [])];
  await cartaoDeEfeito(actor, { id: "dissonancia", nome: loc("ICARUS.Bardo.Dissonancia"), texto: fmt("ICARUS.Bardo.DissonanciaChat", { nome: actor.name, cd }),
    efeito: { tipo: "efeito", alvo: "inimigos", duracao: { tipo: "rodadas", rodadas: 1 }, condicoes, resistencia: { atributo: "vontade", efeito: "anula" } } });
  // Heavy Metal, a quem falhar: Riff Pesado 1d6 de Impacto por 2 níveis (para cima); Nu Metal +1d6 Psíquico
  const partes = [
    ...(tem(actor, "riff-pesado") ? [{ formula: `${Math.ceil(actor.system.nivel / 2)}d6`, tipo: "impacto" }] : []),
    ...(tem(actor, "nu-metal") ? [{ formula: "1d6", tipo: "psiquico" }] : [])
  ];
  if (partes.length) {
    await rolarDanoAvulso({ partes, titulo: loc("ICARUS.Bardo.Dissonancia"), img: actor.img, actor,
      flags: { magia: { id: "dissonancia", cd, resistencia: { atributo: "vontade", efeito: "anula" } } } });
  }
  if (game.user.isGM) return game.icarus.testes.abrirResistencia({ tipos: ["vontade"], pericia: "vontade", origem: loc("ICARUS.Bardo.Dissonancia"), cd });
}

ACOES_DE_MECANICA.set("bardo:execucao", async actor => {
  if (!temInstrumento(actor)) return ui.notifications.warn(fmt("ICARUS.Bardo.SemInstrumento", { nome: actor.name }));
  const r = await foundry.applications.api.DialogV2.wait({
    window: { title: loc("ICARUS.Bardo.Execucao") },
    content: `<div class="icarus-uso"><p>${esc(fmt("ICARUS.Bardo.ExecucaoTexto", { cd: cdDoBardo(actor) }))}</p></div>`,
    buttons: [
      { action: "cadencia", label: loc("ICARUS.Bardo.Cadencia"), default: true },
      { action: "dissonancia", label: loc("ICARUS.Bardo.Dissonancia") },
      { action: "cancelar", label: loc("ICARUS.Testes.Cancelar") }
    ],
    rejectClose: false
  });
  if (r !== "cadencia" && r !== "dissonancia") return;
  if ((await gastarPM(actor, 1)) === false) return;
  await actor.setFlag(F, "execucao", { tipo: r, ativa: true });
  return cartaoDaExecucao(actor, r);
});
// Manter a Execução: ação de movimento, sem custo, enquanto continuar tocando
ACOES_DE_MECANICA.set("bardo:execucao-manter", actor => {
  const e = actor.getFlag(F, "execucao");
  if (!e?.ativa) return null;
  if (!temInstrumento(actor) || actor.statuses?.has("surdo")) {
    ui.notifications.warn(loc("ICARUS.Bardo.ExecucaoEncerrada"));
    return actor.unsetFlag(F, "execucao");
  }
  return cartaoDaExecucao(actor, e.tipo);
});
ACOES_DE_MECANICA.set("bardo:execucao-encerrar", actor => actor.unsetFlag(F, "execucao"));
ACOES_DE_MECANICA.set("bardo:instrumento", actor => {
  if (!game.user.isGM) return null;
  return actor.getFlag(F, "instrumentoLiberado") ? actor.unsetFlag(F, "instrumentoLiberado") : actor.setFlag(F, "instrumentoLiberado", true);
});

/* ---------------- Estádio Lotado (Heavy Metal, 15º) ---------------- */

ACOES_DE_MECANICA.set("bardo:estadio", async actor => {
  if (actor.getFlag(F, "estadioUsado")) return ui.notifications.warn(loc("ICARUS.Bardo.EstadioUsado"));
  const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: loc("ICARUS.Bardo.Estadio") },
    content: `<div class="icarus-uso"><p>${esc(fmt("ICARUS.Bardo.EstadioTexto", { pm: obraPrimaAtiva(actor) ? custoComObraPrima(8) : 8, cd: cdDoBardo(actor) }))}</p></div>`, rejectClose: false });
  if (!ok || (await gastarPM(actor, 8)) === false) return;
  await actor.setFlag(F, "estadioUsado", true);
  await avisarNoChat(actor, fmt("ICARUS.Bardo.EstadioChat", { nome: actor.name, cd: cdDoBardo(actor) }));
  return rolarDanoAvulso({ partes: [{ formula: "8d6", tipo: "impacto" }], titulo: loc("ICARUS.Bardo.Estadio"), img: actor.img, actor,
    flags: { magia: { id: "estadio-lotado", cd: cdDoBardo(actor), resistencia: { atributo: "reflexos", efeito: "metade" } } } });
});

/* ---------------- Poderes com automação simples ---------------- */

GANCHOS_DE_PODER.set("bardo__voz-de-comando", {
  depois: async actor => {
    const alvo = [...(game.user.targets ?? [])][0];
    if (alvo?.actor?.isOwner) return alvo.actor.setFlag(F, "encorajado", true);
    return avisarNoChat(actor, fmt("ICARUS.Bardo.VozChat", { nome: actor.name, alvo: alvo?.name ?? loc("ICARUS.Nobre.UmAliado") }));
  }
});
GANCHOS_DE_PODER.set("bardo__fascinar", {
  depois: async actor => {
    if (game.user.isGM) return game.icarus.testes.abrirOposto();
    return avisarNoChat(actor, fmt("ICARUS.Bardo.FascinarChat", { nome: actor.name }));
  }
});
GANCHOS_DE_PODER.set("bardo__manipular", {
  depois: actor => cartaoDeEfeito(actor, { id: "manipular", nome: loc("ICARUS.Bardo.Manipular"), texto: fmt("ICARUS.Bardo.ManipularChat", { nome: actor.name, cd: cdDoBardo(actor) }),
    efeito: { tipo: "efeito", alvo: "inimigo", duracao: { tipo: "cena" }, condicoes: ["enfeiticado"], resistencia: { atributo: "vontade", efeito: "anula" } } })
});

/* ---------------- Fim da cena / combate ---------------- */

const limparCena = async actor => {
  if (!ehBardo(actor)) return;
  for (const k of ["chamaAtiva", "execucao", "estadioUsado"]) if (actor.getFlag(F, k) !== undefined) await actor.unsetFlag(F, k);
};
FIM_DA_CENA.push(limparCena);
FIM_DO_COMBATE.push(limparCena);

Hooks.once("init", () => {
  // Magias conhecidas do Bardo: escolas, nível (até o 4º) e limite; o Mestre só é avisado
  Hooks.on("preCreateItem", (item, dados, opcoes, userId) => {
    const actor = item.parent;
    if (userId !== game.user.id || item.type !== "magia" || !actor || !ehBardo(actor)) return;
    const m = magiasDoBardo(actor);
    const motivo = motivoParaNaoAprender(item.system, { nivel: actor.system.nivel, tradicao: "arcana", conhecidas: m.conhecidas, limite: m.limite, escolas: m.escolas, teto: 4 });
    if (!motivo) return;
    const texto = fmt(motivo.chave, motivo.dados);
    if (game.user.isGM) { ui.notifications.warn(fmt("ICARUS.Magias.Conhecidas.Mestre", { motivo: texto })); return; }
    ui.notifications.warn(texto);
    return false;
  });
});

/* ---------------- Aba Classe ---------------- */

registrarLinhas("bardo", actor => {
  const linhas = [];
  const m = magiasDoBardo(actor);
  linhas.push({ id: "bardo:magias", rotulo: loc("ICARUS.Arcanista.Conhecidas"), info: `${fmt("ICARUS.Arcanista.ConhecidasInfo", { n: m.conhecidas, limite: m.limite })}${m.escolas.length ? ` · ${m.escolas.join(", ")}` : ""}` });
  const caminho = actor.getFlag(F, "caminho");
  const estilo = actor.getFlag(F, "estilo");
  if (caminho) linhas.push({ id: "bardo:caminho", rotulo: loc("ICARUS.Bardo.Caminho"), info: `${loc(`ICARUS.Bardo.Caminhos.${caminho}`)}${estilo ? ` · ${classeDoAtor(actor).habilidades.find(h => h.id === "estilo").escolha.opcoes.find(o => slug(o) === estilo) ?? ""}` : ""}` });
  if (tem(actor, "chama-da-musa")) {
    const chama = actor.getFlag(F, "chamaAtiva");
    linhas.push(chama
      ? { id: "bardo:chama-encerrar", rotulo: loc("ICARUS.Bardo.ChamaAtiva"), botao: true, ativo: true, info: fmt("ICARUS.Bardo.ChamaAtivaInfo", { bonus: chama.bonus }) }
      : { id: "bardo:chama", rotulo: loc("ICARUS.Bardo.ChamaRotulo"), botao: true, info: `+${bonusDaChama(actor.system.nivel)} · 2 PM` });
  }
  if (caminho === "poesia") linhas.push({ id: "bardo:verso", rotulo: loc("ICARUS.Bardo.Verso"), botao: true, info: `${dadoDoLouvor(actor.system.nivel)} · CD ${cdDoBardo(actor)} · 1 PM` });
  if (caminho === "musica") {
    const e = actor.getFlag(F, "execucao");
    const instrumento = temInstrumento(actor);
    linhas.push({ id: "bardo:execucao", rotulo: loc("ICARUS.Bardo.Execucao"), botao: true, desativado: !instrumento,
      info: instrumento ? `CD ${cdDoBardo(actor)} · 1 PM` : loc("ICARUS.Bardo.SemInstrumentoCurto") });
    if (e?.ativa) {
      linhas.push({ id: "bardo:execucao-manter", rotulo: fmt("ICARUS.Bardo.Manter", { tipo: loc(`ICARUS.Bardo.${e.tipo === "cadencia" ? "Cadencia" : "Dissonancia"}`) }), botao: true, ativo: true });
      linhas.push({ id: "bardo:execucao-encerrar", rotulo: loc("ICARUS.Bardo.Encerrar"), botao: true });
    }
    if (game.user.isGM && !actor.items.some(i => i.flags?.[F]?.id === "instrumento-musical" || /instrumento/i.test(i.name ?? ""))) {
      linhas.push({ id: "bardo:instrumento", rotulo: loc("ICARUS.Bardo.LiberarInstrumento"), botao: true, ativo: !!actor.getFlag(F, "instrumentoLiberado") });
    }
  }
  if (tem(actor, "estadio-lotado")) linhas.push({ id: "bardo:estadio", rotulo: loc("ICARUS.Bardo.Estadio"), botao: !actor.getFlag(F, "estadioUsado"), info: "8d6 · 8 PM" });
  if (obraPrimaAtiva(actor)) linhas.push({ id: "bardo:obra-prima", rotulo: loc("ICARUS.Bardo.ObraPrima"), info: loc("ICARUS.Bardo.ObraPrimaInfo") });
  return linhas;
});

