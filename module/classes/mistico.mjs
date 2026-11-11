/**
 * Místico:
 * - Conjuração Mística (1º): lista Arcana, CD de Sabedoria; 4 escolas (Espiritual fixa, tela
 *   "escolas"; Escola Estendida dá a 5ª); magias conhecidas 3 + 1 a cada nível ímpar a partir do 3º.
 *   Ecos dos Ancestrais: 2 magias Divinas das mesmas escolas por escolha (1º no 5º … 4º no 17º).
 * - Dobra Elemental (1º): elemento permanente (tela "elemento"); Domínios dão os outros; Harmonia
 *   dá os quatro. Rajada Elemental na aba Classe: 1 PM, ataque à distância com Sabedoria, Nd8 do
 *   tipo do elemento (Rajada Potente d10; Domínio +2; Rajada Dupla +2 PM; Rajada Veloz +1 PM).
 *   Poderes de técnica só aparecem com o elemento (classes-dados.mjs → validarPoder).
 * - Familiar Elemental (3º): o mesmo modelo do Vínculo Selvagem (patrulheiro.mjs → invocarCompanheiro),
 *   com a Sabedoria do místico na CD; Familiar Robusto e Evolução do Familiar entram nos valores.
 *   Segundo Familiar: outro familiar; só um invocado por vez.
 * - Meditação (5º): 1/dia, Concentração CD 15; só gasta o uso no sucesso.
 * - Ascensão Espiritual (17º): forma permanente; 1/dia (2 com Harmonia), 8 PM, efeito até o fim da
 *   cena, sem Fatigado. Harmonia: imune a medo.
 */
import { SISTEMA_ID } from "../config.mjs";
import { classeDoAtor, ACOES_DE_MECANICA } from "../classes.mjs";
import { usarPoder } from "../acoes.mjs";
import { FIM_DA_CENA } from "../condicoes-foundry.mjs";
import { registrarLinhas, itemDeClasse, avisarNoChat, USO_PROPRIO } from "./comum.mjs";
import { calcularCD, rolarD20, resolverAtaque } from "../combate.mjs";
import { rolarDanoAvulso } from "../dano.mjs";
import { rolarPericia } from "../rolls.mjs";
import { estatisticasDoVinculo, familiarPorId } from "../classes-dados.mjs";
import { mudancasParaEfeito, motivoParaNaoAprender } from "../magias-dados.mjs";
import { invocarCompanheiro, atorDoCompanheiro } from "./patrulheiro.mjs";
import FAMILIARES from "../dados/familiares.mjs";
import { concederPVTemporarios, origemDoEfeito } from "../pv-temporarios.mjs";
import {
  ELEMENTOS, elementosDosItens, danoDaRajada, custoDaRajada, magiasConhecidasDoMistico, magiasDivinasDoMistico,
  nivelMaximoDivinoDoMistico, MEDITACAO_CD, curaDaMeditacao, usosDaAscensao, FORMAS_DA_ASCENSAO, extrasDoFamiliar, familiaresDosItens
} from "../mistico-dados.mjs";

const F = SISTEMA_ID;
const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);
const esc = t => Handlebars.escapeExpression(t ?? "");
const { DialogV2 } = foundry.applications.api;

export const ehMistico = actor => classeDoAtor(actor)?.id === "mistico";
const tem = (actor, id) => !!itemDeClasse(actor, "mistico", id);
const sabedoria = actor => Math.trunc(Number(actor.system.atributos?.SAB?.total) || 0);
const cdDoMistico = actor => calcularCD(actor.system, "SAB").cd;
const itens = actor => [...(actor.items ?? [])];

// Botões próprios na aba Classe (sem o "Usar" genérico, que cobraria o custo do JSON à toa)
for (const id of ["dobra-elemental", "familiar-elemental", "segundo-familiar", "ascensao-espiritual", "rajada-dupla", "rajada-veloz", "evolucao-do-familiar", "meditacao"]) USO_PROPRIO.add(`mistico__${id}`);

/** Gasta PM (já confirmado); false se faltar. */
async function gastarPM(actor, pm) {
  if (pm > actor.system.pm.value) { ui.notifications.warn(fmt("ICARUS.Poderes.SemPM", { nome: actor.name, pm, atual: actor.system.pm.value })); return false; }
  if (pm) await actor.update({ "system.pm.value": actor.system.pm.value - pm });
  return true;
}

/* ---------------- Escolas e magias ---------------- */

/** Escolas do Místico: as 4 da Conjuração Mística + a da Escola Estendida. */
export function escolasDoMistico(actor) {
  const conj = itemDeClasse(actor, "mistico", "conjuracao-mistica")?.flags?.[F]?.escolas ?? [];
  const ext = itemDeClasse(actor, "mistico", "escola-estendida")?.flags?.[F]?.escola;
  return [...new Set([...conj, ...(ext ? [ext] : [])])];
}

const ehArcana = s => (s?.tradicoes ?? []).includes("arcana") || !(s?.tradicoes ?? []).length;

/** Magias conhecidas do Místico: Arcanas (3 + 1 por nível ímpar) e Divinas (2 por Ecos dos Ancestrais). */
export function magiasDoMistico(actor) {
  const magias = actor.items.filter(i => i.type === "magia");
  const ecos = actor.items.filter(i => i.flags?.[F]?.id === "mistico__ecos-dos-ancestrais" && i.flags?.[F]?.magiasExtras).length;
  return {
    arcanas: magias.filter(i => ehArcana(i.system)).length, limiteArcanas: magiasConhecidasDoMistico(actor.system.nivel),
    divinas: magias.filter(i => !ehArcana(i.system)).length, limiteDivinas: magiasDivinasDoMistico(ecos), ecos,
    escolas: escolasDoMistico(actor)
  };
}

/** Motivo para não aprender a magia (Arcana pela Conjuração Mística; Divina só com Ecos), ou null. */
export function motivoDoMistico(actor, magia) {
  const m = magiasDoMistico(actor);
  const nivel = actor.system.nivel;
  if (ehArcana(magia)) return motivoParaNaoAprender(magia, { nivel, tradicao: "arcana", conhecidas: m.arcanas, limite: m.limiteArcanas, escolas: m.escolas, teto: 5 });
  if (!(magia.tradicoes ?? []).includes("divina")) return { chave: "ICARUS.Magias.Conhecidas.Tradicao", dados: { tradicao: "arcana" } };
  if (!m.ecos) return { chave: "ICARUS.Mistico.SemEcos", dados: {} };
  return motivoParaNaoAprender(magia, { nivel, tradicao: "divina", conhecidas: m.divinas, limite: m.limiteDivinas, escolas: m.escolas, max: nivelMaximoDivinoDoMistico(nivel) });
}

/* ---------------- Rajada Elemental ---------------- */

ACOES_DE_MECANICA.set("mistico:rajada", async actor => {
  const conhecidos = elementosDosItens(itens(actor));
  if (!conhecidos.length) return ui.notifications.warn(loc("ICARUS.Mistico.SemElemento"));
  const dupla = tem(actor, "rajada-dupla");
  const veloz = tem(actor, "rajada-veloz");
  const r = await DialogV2.wait({
    window: { title: loc("ICARUS.Mistico.Rajada") },
    content: `<div class="icarus-uso"><p>${esc(loc("ICARUS.Mistico.RajadaTexto"))}</p>
      <label class="linha">${esc(loc("ICARUS.Mistico.Elemento"))} <select name="elemento">${conhecidos.map(k => `<option value="${k}">${esc(ELEMENTOS[k].nome)} (${esc(loc(`ICARUS.TiposDano.${ELEMENTOS[k].tipo}`))})</option>`).join("")}</select></label>
      ${dupla ? `<label class="chk"><input type="checkbox" name="dupla"> ${esc(loc("ICARUS.Mistico.RajadaDupla"))}</label>` : ""}
      ${veloz ? `<label class="chk"><input type="checkbox" name="veloz"> ${esc(loc("ICARUS.Mistico.RajadaVeloz"))}</label>` : ""}
      <p class="dica">${esc(fmt("ICARUS.Poderes.PMAtual", { pm: actor.system.pm.value, max: actor.system.pm.max }))}</p></div>`,
    buttons: [
      { action: "ok", label: loc("ICARUS.Poderes.Usar"), default: true,
        callback: (ev, b) => ({ elemento: b.form.elements.elemento.value, dupla: !!b.form.elements.dupla?.checked, veloz: !!b.form.elements.veloz?.checked }) },
      { action: "cancelar", label: loc("ICARUS.Testes.Cancelar") }
    ],
    rejectClose: false
  });
  if (!r || typeof r !== "object" || !ELEMENTOS[r.elemento]) return;
  if (!(await gastarPM(actor, custoDaRajada(r)))) return;
  const el = ELEMENTOS[r.elemento];
  const formula = danoDaRajada(actor.system.nivel, { potente: tem(actor, "rajada-potente"), dominio: tem(actor, el.dominio) });
  // Ataque à distância com Sabedoria: o total de Pontaria trocando Destreza por Sabedoria
  const s = actor.system;
  const bonus = (s.pericias?.pontaria?.total ?? 0) - (s.atributos?.DES?.total ?? 0) + sabedoria(actor);
  const alvos = [...(game.user.targets ?? [])].filter(t => t.actor).slice(0, r.dupla ? 2 : 1);
  for (const alvo of alvos.length ? alvos : [null]) {
    const d = await rolarD20({ bonus });
    const defesa = alvo?.actor?.system?.defesa?.total ?? null;
    const res = resolverAtaque({ d20: d.d20, total: d.total, defesa });
    const resultado = res.acerta === null ? "" : loc(res.acerta ? "ICARUS.Mistico.Acertou" : "ICARUS.Mistico.Errou");
    await avisarNoChat(actor, fmt("ICARUS.Mistico.RajadaChat", { nome: actor.name, elemento: el.nome, total: d.total, alvo: alvo?.name ?? "—", defesa: defesa ?? "?", resultado }), { rolls: [d.roll] });
    if (res.acerta === false) continue;
    await rolarDanoAvulso({ partes: [{ formula: res.critico ? formula.replace(/^(\d+)d/, (_, n) => `${2 * n}d`) : formula, tipo: el.tipo }],
      titulo: fmt("ICARUS.Mistico.RajadaTitulo", { elemento: el.nome }), img: itemDeClasse(actor, "mistico", "dobra-elemental")?.img ?? actor.img, actor });
  }
});

/* ---------------- Familiar Elemental ---------------- */

/** Familiares que o Místico conhece (entradas de familiares.json). */
export const familiaresDoAtor = actor => familiaresDosItens(itens(actor)).map(familiarPorId).filter(Boolean);

/** Valores do familiar pelo Místico: PV e Defesa (Robusto, Evolução), CD com Sabedoria, dano. */
export function estatisticasDoFamiliar(actor, familiar) {
  const extras = extrasDoFamiliar(itens(actor));
  return { e: estatisticasDoVinculo(familiar, { nivel: actor.system.nivel, atributoCd: sabedoria(actor), extras }), passoDano: extras.passoDano };
}

/** Tira os tokens dos familiares deste Místico (só um invocado por vez). */
async function dispensar(actor, exceto = null) {
  for (const f of FAMILIARES.familiares) {
    if (f.id === exceto) continue;
    for (const t of atorDoCompanheiro(actor, f.id)?.getActiveTokens() ?? []) await t.document.delete();
  }
}

async function invocar(actor, id) {
  const familiar = familiaresDoAtor(actor).find(f => f.id === id);
  const item = itemDeClasse(actor, "mistico", "familiar-elemental");
  if (!familiar || !item) return ui.notifications.warn(loc("ICARUS.Mistico.SemFamiliar"));
  const uso = await usarPoder(actor, item);
  if (!uso) return;
  await dispensar(actor, id);
  const { e, passoDano } = estatisticasDoFamiliar(actor, familiar);
  await invocarCompanheiro(actor, familiar, { tipo: "familiar", e, passoDano });
  await avisarNoChat(actor, fmt("ICARUS.Mistico.Invocou", { nome: actor.name, familiar: familiar.nome, pv: e.pv, defesa: e.defesa, cd: e.cd }));
}

for (const f of FAMILIARES.familiares) ACOES_DE_MECANICA.set(`mistico:invocar:${f.id}`, actor => invocar(actor, f.id));
ACOES_DE_MECANICA.set("mistico:dispensar", actor => dispensar(actor));

/* ---------------- Meditação ---------------- */

ACOES_DE_MECANICA.set("mistico:meditar", async actor => {
  if (actor.getFlag(F, "meditacaoDia")) return ui.notifications.warn(loc("ICARUS.Mistico.MeditacaoDia"));
  const msg = await rolarPericia(actor, "concentracao");
  const total = msg?.rolls?.[0]?.total;
  if (!Number.isFinite(total)) return;
  if (total < MEDITACAO_CD) return avisarNoChat(actor, fmt("ICARUS.Mistico.MeditacaoFalhou", { nome: actor.name, total }));
  const roll = await new Roll(curaDaMeditacao(sabedoria(actor))).evaluate();
  const pm = actor.system.pm;
  await actor.update({ "system.pm.value": Math.min(pm.max, pm.value + Math.max(0, roll.total)), [`flags.${F}.meditacaoDia`]: true });
  return avisarNoChat(actor, fmt("ICARUS.Mistico.MeditacaoChat", { nome: actor.name, pm: Math.max(0, roll.total) }), { rolls: [roll] });
});

/* ---------------- Ascensão Espiritual ---------------- */

const formaDaAscensao = actor => itemDeClasse(actor, "mistico", "ascensao-espiritual")?.flags?.[F]?.forma ?? null;

ACOES_DE_MECANICA.set("mistico:ascensao", async actor => {
  const item = itemDeClasse(actor, "mistico", "ascensao-espiritual");
  const forma = formaDaAscensao(actor);
  if (!item || !forma) return ui.notifications.warn(loc("ICARUS.Mistico.SemForma"));
  const usos = Number(actor.getFlag(F, "ascensaoUsos")) || 0;
  if (usos >= usosDaAscensao({ harmonia: tem(actor, "harmonia") })) return ui.notifications.warn(loc("ICARUS.Mistico.AscensaoDia"));
  const uso = await usarPoder(actor, item);
  if (!uso) return;
  const { changes } = mudancasParaEfeito(FORMAS_DA_ASCENSAO[forma]);
  const [efeito] = await actor.createEmbeddedDocuments("ActiveEffect", [{ name: `${item.name}`, img: item.img, changes, transfer: false, flags: { [F]: { duracao: "cena", mistico: "ascensao" } } }]);
  await actor.update({ [`flags.${F}.ascensaoUsos`]: usos + 1, [`flags.${F}.ascensao`]: forma });
  const texto = forma === "ancestral"
    ? fmt("ICARUS.Mistico.AncestralChat", { nome: actor.name, pv: 3 * actor.system.nivel })
    : fmt("ICARUS.Mistico.DivinaChat", { nome: actor.name });
  await avisarNoChat(actor, texto);
  // Forma Ancestral: 3 × nível PV temporários, que somem quando a Ascensão acaba
  if (forma === "ancestral") await concederPVTemporarios(actor, 3 * actor.system.nivel, { origem: origemDoEfeito(efeito), fonte: loc("ICARUS.Mistico.Formas.ancestral") });
});

ACOES_DE_MECANICA.set("mistico:voltar", async actor => {
  const ids = actor.effects.filter(e => e.flags?.[F]?.mistico === "ascensao").map(e => e.id);
  if (ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
  await actor.unsetFlag(F, "ascensao");
});

/* ---------------- Fim da cena e hooks ---------------- */

FIM_DA_CENA.push(async actor => {
  if (!ehMistico(actor)) return;
  // A Ascensão não deixa Fatigado; o efeito sai no "Encerrar cena"
  if (actor.getFlag(F, "ascensao") !== undefined) await actor.unsetFlag(F, "ascensao");
});

Hooks.once("init", () => {
  // Conjuração Mística: escolas, nível e limite; Divinas só com Ecos dos Ancestrais. O Mestre só é avisado.
  Hooks.on("preCreateItem", (item, dados, opcoes, userId) => {
    const actor = item.parent;
    if (userId !== game.user.id || item.type !== "magia" || !actor || !ehMistico(actor)) return;
    const motivo = motivoDoMistico(actor, item.system);
    if (!motivo) return;
    const texto = fmt(motivo.chave, motivo.dados);
    if (game.user.isGM) { ui.notifications.warn(fmt("ICARUS.Magias.Conhecidas.Mestre", { motivo: texto })); return; }
    ui.notifications.warn(texto);
    return false;
  });
  // Harmonia (20º): imune a medo
  Hooks.on("preCreateActiveEffect", (efeito, dados, opcoes, userId) => {
    const actor = efeito.parent;
    if (userId !== game.user.id || !actor || !ehMistico(actor) || !tem(actor, "harmonia")) return;
    const st = [...(efeito.statuses ?? dados.statuses ?? [])];
    if (!st.some(s => s === "abalado" || s === "apavorado")) return;
    ui.notifications.info(fmt("ICARUS.Mistico.Imune", { nome: actor.name }));
    return false;
  });
});

/* ---------------- Aba Classe ---------------- */

registrarLinhas("mistico", actor => {
  const linhas = [];
  const escolas = escolasDoMistico(actor);
  if (escolas.length) linhas.push({ id: "mistico:escolas", rotulo: loc("ICARUS.Mistico.Escolas"), info: escolas.join(", ") });
  const elementos = elementosDosItens(itens(actor));
  if (tem(actor, "dobra-elemental")) {
    const potente = tem(actor, "rajada-potente");
    linhas.push({ id: "mistico:rajada", rotulo: loc("ICARUS.Mistico.Rajada"), botao: true, desativado: !elementos.length,
      info: elementos.length ? fmt("ICARUS.Mistico.RajadaInfo", { dano: danoDaRajada(actor.system.nivel, { potente }), elementos: elementos.map(k => ELEMENTOS[k].nome).join(", ") }) : loc("ICARUS.Mistico.SemElemento") });
  }
  const familiares = familiaresDoAtor(actor);
  if (familiares.length) {
    for (const f of familiares) {
      const { e } = estatisticasDoFamiliar(actor, f);
      const invocado = atorDoCompanheiro(actor, f.id)?.getActiveTokens().length > 0;
      linhas.push({ id: `mistico:invocar:${f.id}`, botao: true, ativo: invocado, rotulo: fmt("ICARUS.Mistico.Invocar", { familiar: f.nome }),
        info: fmt("ICARUS.Mistico.FamiliarInfo", { pv: e.pv, defesa: e.defesa, cd: e.cd }) });
    }
    if (familiares.some(f => atorDoCompanheiro(actor, f.id)?.getActiveTokens().length > 0)) linhas.push({ id: "mistico:dispensar", botao: true, rotulo: loc("ICARUS.Mistico.Dispensar") });
  } else if (tem(actor, "familiar-elemental")) linhas.push({ id: "mistico:sem-familiar", rotulo: loc("ICARUS.Mistico.Familiar"), info: loc("ICARUS.Mistico.SemFamiliar") });
  if (tem(actor, "meditacao")) {
    const usado = !!actor.getFlag(F, "meditacaoDia");
    linhas.push({ id: "mistico:meditar", rotulo: loc("ICARUS.Mistico.Meditacao"), botao: true, desativado: usado,
      info: usado ? loc("ICARUS.Mistico.MeditacaoUsada") : fmt("ICARUS.Mistico.MeditacaoInfo", { cd: MEDITACAO_CD, formula: curaDaMeditacao(sabedoria(actor)) }) });
  }
  if (tem(actor, "alma-desperta")) linhas.push({ id: "mistico:alma", rotulo: loc("ICARUS.Mistico.AlmaDesperta"), info: loc("ICARUS.Mistico.AlmaDespertaInfo") });
  const forma = formaDaAscensao(actor);
  if (forma) {
    const max = usosDaAscensao({ harmonia: tem(actor, "harmonia") });
    const usos = Number(actor.getFlag(F, "ascensaoUsos")) || 0;
    linhas.push({ id: "mistico:ascensao", rotulo: loc(`ICARUS.Mistico.Formas.${forma}`), botao: true, desativado: usos >= max, info: fmt("ICARUS.Mistico.AscensaoInfo", { usos, max }) });
    if (actor.getFlag(F, "ascensao")) linhas.push({ id: "mistico:voltar", rotulo: loc("ICARUS.Mistico.Voltar"), botao: true, ativo: true });
  }
  if (game.user.isGM && (actor.getFlag(F, "meditacaoDia") || actor.getFlag(F, "ascensaoUsos"))) linhas.push({ id: "clerigo:dia", rotulo: loc("ICARUS.Clerigo.PassouDia"), botao: true });
  const m = magiasDoMistico(actor);
  linhas.push({ id: "mistico:magias", rotulo: loc("ICARUS.Arcanista.Conhecidas"),
    info: `${fmt("ICARUS.Mistico.MagiasInfo", { a: m.arcanas, la: m.limiteArcanas, d: m.divinas, ld: m.limiteDivinas })} · CD ${cdDoMistico(actor)}` });
  return linhas;
});
