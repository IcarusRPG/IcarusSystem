/**
 * Druida:
 * - Fé Selvagem (1º, permanente): a tela de divindade do Clérigo; Floressa concede os 3 Poderes
 *   Concedidos, outra divindade 2 à escolha (module/classes/clerigo.mjs → jurarDivindade). Dogma e
 *   "Agir contra um Dogma" iguais aos do Clérigo.
 * - Conjuração Divina (1º): lista Divina, CD de Sabedoria, magias conhecidas n + 2 (+2 por Sementes
 *   de Magia), até o 5º nível de magia; Afinidade Natural +1 na CD das magias de Natureza (magias.mjs).
 * - Mudar de Forma (2º): "Assumir Forma" na aba Classe com as Formas que tem; efeito ativo
 *   "Forma: X" até o fim da cena (flags.forma → Defesa = 10 + DES + bônus, sem armadura, derivar.mjs)
 *   e arma natural temporária (Luta; +1 passo no 11º e no 17º). Sob a Forma: sem magias e sem
 *   itens (Palavra na Fera e Mil Formas liberam as magias). Voltar: ação livre ou Inconsciente.
 * - Mosaico Vivo: partes até o fim da cena, sem bloquear nada.
 * - Ervas Frescas (2º): "Preparar ervas" (Mestre confirma o descanso em ambiente natural) e
 *   "Usar erva" (cura ou remove condição).
 * - Círculo (3º, permanente): Fera, Mata ou Broto (flags.circulo). Instinto Bestial: 2 Formas de
 *   graça e −1 PM em todas. Raízes, Floresta Desperta, Florescer etc.: botão que rola e posta.
 * - Caminho das Raízes: Árvores Conhecidas (flags.arvoresConhecidas), portal com o Mestre.
 * - Sangue Verde (10º): imune a Doente. Mil Formas (20º): 1/dia, troca livre e Fatigado no fim.
 */
import { SISTEMA_ID } from "../config.mjs";
import { temHabilidadeNosItens } from "../classes-dados.mjs";
import { classeDoAtor, ACOES_DE_MECANICA, concederHabilidades } from "../classes.mjs";
import { GANCHOS_DE_PODER } from "../acoes.mjs";
import { APOS_CAMINHO, APOS_ESCOLHA } from "../escolhas.mjs";
import { FIM_DA_CENA, aplicarCondicao, removerCondicao } from "../condicoes-foundry.mjs";
import { registrarLinhas, itemDeClasse, avisarNoChat, USO_PROPRIO } from "./comum.mjs";
import { calcularCD } from "../combate.mjs";
import { PROVEDORES_ATAQUE, MODIFICADORES_ATAQUE } from "../combate-chat.mjs";
import { rolarDanoAvulso } from "../dano.mjs";
import { mudancasParaEfeito, motivoParaNaoAprender } from "../magias-dados.mjs";
import { limiteDeMagiasDoClerigo } from "../clerigo-dados.mjs";
import { dadosDoPoderDeClasse } from "../dados-compendios.mjs";
import ICONES_CLASSES from "../dados/icones-classes.mjs";
import { divindadePorId } from "../panteao.mjs";
import { CONDICAO_POR_ID } from "../condicoes.mjs";
import { concederPVTemporarios, origemDoEfeito } from "../pv-temporarios.mjs";
import {
  FORMAS, formaDoPoder, custoDaForma, danoDaForma, pvTemporariosDoUrso, pvTemporariosDaFeraAncestral, formaDoAtor,
  PARTES_DO_MOSAICO, partesDoMosaico, partesDisponiveis, quantasErvas, curaDaErva, condicoesDaErva,
  limiteDeArvores, marcarArvore
} from "../druida-dados.mjs";

const F = SISTEMA_ID;
const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);
const esc = t => Handlebars.escapeExpression(t ?? "");
const { DialogV2 } = foundry.applications.api;

export const ehDruida = actor => classeDoAtor(actor)?.id === "druida";
const tem = (actor, id) => temHabilidadeNosItens([...(actor.items ?? [])], "druida", id);
const sabedoria = actor => Math.trunc(Number(actor.system.atributos?.SAB?.total) || 0);
const cdDoDruida = actor => calcularCD(actor.system, "SAB").cd;
const alvoMarcado = () => [...(game.user.targets ?? [])][0] ?? null;
const CIRCULOS = ["fera", "mata", "broto"];
const umaVez = (actor, flag) => {
  if (actor.getFlag(F, flag)) { ui.notifications.warn(loc("ICARUS.Clerigo.UmaVezPorCena")); return false; }
};

// Botões próprios na aba Classe (sem o "Usar" genérico, que cobraria o custo do JSON à toa)
for (const id of [...Object.values(FORMAS).map(f => f.poder), "mudar-de-forma", "ervas-frescas", "mosaico-vivo", "caminho-das-raizes",
  "trilha-compartilhada", "erva-rara", "infusao-revigorante", "troca-veloz"]) USO_PROPRIO.add(`druida__${id}`);

/** Gasta PM (já confirmado); false se faltar. */
async function gastarPM(actor, pm) {
  if (pm > actor.system.pm.value) { ui.notifications.warn(fmt("ICARUS.Poderes.SemPM", { nome: actor.name, pm, atual: actor.system.pm.value })); return false; }
  if (pm) await actor.update({ "system.pm.value": actor.system.pm.value - pm });
  return true;
}

/** Cartão com "Aplicar efeito" para os alvos (module/magias-efeitos.mjs). */
function cartaoDeEfeito(actor, { id, nome, img, texto, efeito }) {
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="icarus-rolagem icarus-lembrete"><p class="condicao-descricao">${esc(texto)}</p></div>`,
    flags: { [F]: { magia: { id, itemUuid: actor.uuid, actorUuid: actor.uuid, nome, img: img ?? actor.img, efeitos: [efeito] }, efeitosAplicados: [] } }
  });
}

/* ---------------- Círculo e Instinto Bestial ---------------- */

APOS_CAMINHO.set("circulo", async (actor, i) => {
  if (!ehDruida(actor)) return;
  await actor.setFlag(F, "circulo", CIRCULOS[i] ?? null);
  await concederHabilidades(actor);
});

// Instinto Bestial: as 2 Formas escolhidas entram de graça (não ocupam escolha de poder)
APOS_ESCOLHA.set("instinto-bestial", async (actor, flags) => {
  const classe = classeDoAtor(actor);
  if (classe?.id !== "druida") return;
  const nomes = new Set(flags?.poderes ?? []);
  const novos = classe.poderes.filter(p => nomes.has(p.nome) && !tem(actor, p.id)).map(p => {
    const d = dadosDoPoderDeClasse(classe, p, ICONES_CLASSES);
    delete d._id;
    delete d.folder;
    d.flags[F].gratis = true;
    return d;
  });
  if (novos.length) await actor.createEmbeddedDocuments("Item", novos);
});

/* ---------------- Mudar de Forma ---------------- */

/** Formas que o Druida pode assumir (poderes "Forma de …" que tem). */
const formasConhecidas = actor => Object.entries(FORMAS).filter(([, f]) => tem(actor, f.poder)).map(([id, f]) => ({ id, ...f, item: itemDeClasse(actor, "druida", f.poder) }));

/** Tira a Forma atual (efeito e arma natural). */
async function sairDaForma(actor, { aviso = true } = {}) {
  const efeitos = actor.effects.filter(e => e.flags?.[F]?.forma).map(e => e.id);
  const armas = actor.items.filter(i => i.flags?.[F]?.armaDaForma).map(i => i.id);
  if (efeitos.length) await actor.deleteEmbeddedDocuments("ActiveEffect", efeitos);
  if (armas.length) await actor.deleteEmbeddedDocuments("Item", armas);
  if (aviso && efeitos.length) await avisarNoChat(actor, fmt("ICARUS.Druida.VoltouChat", { nome: actor.name }));
}

ACOES_DE_MECANICA.set("druida:forma", async actor => {
  const formas = formasConhecidas(actor);
  if (!formas.length) return ui.notifications.warn(loc("ICARUS.Druida.SemFormas"));
  const atual = formaDoAtor(actor);
  const milFormas = !!actor.getFlag(F, "milFormas");
  const instinto = tem(actor, "instinto-bestial");
  const troca = !!atual && !milFormas && tem(actor, "troca-veloz");
  const ancestral = tem(actor, "fera-ancestral") && !actor.getFlag(F, "feraAncestralUsada");
  const custo = f => custoDaForma(f.item?.system?.custoPM ?? f.custo, { instinto, trocaVeloz: troca, milFormas });
  const r = await DialogV2.wait({
    window: { title: loc("ICARUS.Druida.AssumirForma") },
    content: `<div class="icarus-uso">
      <p>${esc(loc(atual ? (milFormas ? "ICARUS.Druida.TrocaMilFormas" : troca ? "ICARUS.Druida.TrocaVeloz" : "ICARUS.Druida.TrocaAcao") : "ICARUS.Druida.AssumirTexto"))}</p>
      <select name="forma">${formas.map(f => `<option value="${f.id}"${f.id === atual?.id ? " disabled" : ""}>${esc(f.item?.name ?? f.id)} · ${custo(f)} PM</option>`).join("")}</select>
      ${ancestral ? `<label class="chk"><input type="checkbox" name="ancestral"> ${esc(fmt("ICARUS.Druida.FeraAncestralRotulo", { pv: pvTemporariosDaFeraAncestral(actor.system.nivel) }))}</label>` : ""}
      <p class="dica">${esc(loc("ICARUS.Druida.FormaDica"))}</p>
      <p class="dica">${esc(fmt("ICARUS.Poderes.PMAtual", { pm: actor.system.pm.value, max: actor.system.pm.max }))}</p></div>`,
    buttons: [
      { action: "ok", label: loc("ICARUS.Poderes.Usar"), default: true, callback: (ev, b) => ({ forma: b.form.elements.forma.value, ancestral: !!b.form.elements.ancestral?.checked }) },
      { action: "cancelar", label: loc("ICARUS.Testes.Cancelar") }
    ],
    rejectClose: false
  });
  if (!r || typeof r !== "object") return;
  const f = formas.find(x => x.id === r.forma);
  if (!f || !(await gastarPM(actor, custo(f)))) return;
  await sairDaForma(actor, { aviso: false });
  const nome = fmt("ICARUS.Druida.FormaNome", { forma: f.item?.name?.replace(/^Forma de\s*/i, "") ?? f.id });
  const [efeito] = await actor.createEmbeddedDocuments("ActiveEffect", [{ name: nome, img: f.item?.img ?? actor.img, changes: [], transfer: false,
    flags: { [F]: { duracao: "cena", forma: { id: f.id, nome, defesa: f.defesa } } } }]);
  const aprimorada = tem(actor, "fera-aprimorada");
  await actor.createEmbeddedDocuments("Item", [{
    name: `${f.arma} (${nome})`, type: "arma", img: f.item?.img ?? "icons/svg/claw.svg",
    system: {
      categoria: "simples", grupo: "corpo-a-corpo", empunhadura: "leve", dano: danoDaForma(f.dano, actor.system.nivel, { presas: tem(actor, "presas-famintas") }),
      tiposDano: [f.tipo], criticoMargem: 20, criticoMult: 2, alcance: "corpo-a-corpo", propriedades: [],
      proficiencia: "sim", empunhada: true, quantidade: 1, espacos: 0, preco: 0, bonusAtaque: aprimorada ? 1 : 0, bonusDano: aprimorada ? 2 : 0
    },
    flags: { [F]: { armaDaForma: f.id, natural: true } }
  }]);
  const textos = [fmt("ICARUS.Druida.AssumiuChat", { nome: actor.name, forma: nome, deslocamento: f.deslocamento, tamanho: loc(`ICARUS.Druida.Tamanhos.${f.tamanho}`), defesa: f.defesa })];
  if (r.ancestral) {
    await actor.update({ [`flags.${F}.feraAncestralUsada`]: true, [`flags.${F}.feraAncestral`]: true });
    textos.push(fmt("ICARUS.Druida.FeraAncestralChat", { valor: pvTemporariosDaFeraAncestral(actor.system.nivel) }));
  }
  if (!(milFormas || tem(actor, "palavra-na-fera"))) textos.push(loc("ICARUS.Druida.SemFalaNemMagia"));
  await avisarNoChat(actor, textos.join(" "));
  // PV temporários do Urso (2 × nível) e da Fera Ancestral (3 × nível): somem quando a Forma acaba
  const pvTemp = Math.max(f.pvTemporarios ? pvTemporariosDoUrso(actor.system.nivel) : 0, r.ancestral ? pvTemporariosDaFeraAncestral(actor.system.nivel) : 0);
  if (pvTemp) await concederPVTemporarios(actor, pvTemp, { origem: origemDoEfeito(efeito), fonte: r.ancestral ? loc("ICARUS.Druida.FeraAncestral") : nome });
});

ACOES_DE_MECANICA.set("druida:voltar", actor => sairDaForma(actor));

// Teia (Forma de Aranha): 1/cena, Reflexos ou Enredado
ACOES_DE_MECANICA.set("druida:teia", async actor => {
  if (umaVez(actor, "teiaUsada") === false) return;
  await actor.setFlag(F, "teiaUsada", true);
  return cartaoDeEfeito(actor, { id: "teia", nome: loc("ICARUS.Druida.Teia"), texto: fmt("ICARUS.Druida.TeiaChat", { nome: actor.name, cd: cdDoDruida(actor) }),
    efeito: { tipo: "efeito", alvo: "inimigo", duracao: { tipo: "cena" }, condicoes: ["enredado"], resistencia: { atributo: "reflexos", efeito: "anula" } } });
});

/* ---------------- Ataque com a arma natural ---------------- */

const EXTRA_DA_FORMA = { mergulho: "ICARUS.Druida.Mergulho", frenesi: "ICARUS.Druida.Frenesi" };

PROVEDORES_ATAQUE.push((actor, item) => {
  const formaId = item?.flags?.[F]?.armaDaForma;
  if (!formaId || !ehDruida(actor)) return null;
  const campos = [];
  const esp = FORMAS[formaId]?.especial;
  if (EXTRA_DA_FORMA[esp]) campos.push({ tipo: "checkbox", nome: "extraForma", valor: false, rotulo: loc(EXTRA_DA_FORMA[esp]) });
  if (tem(actor, "faro-de-cacador")) campos.push({ tipo: "checkbox", nome: "faro", valor: false, rotulo: loc("ICARUS.Druida.Faro") });
  return campos.length ? { id: "forma", titulo: loc("ICARUS.Druida.Forma"), campos } : null;
});

MODIFICADORES_ATAQUE.push(({ actor, item, opcoes }) => {
  const formaId = item?.flags?.[F]?.armaDaForma;
  if (!formaId || !ehDruida(actor)) return null;
  const r = { bonus: 0, linhas: [], extrasDano: [] };
  const esp = FORMAS[formaId]?.especial;
  if (opcoes.extraForma && EXTRA_DA_FORMA[esp]) r.extrasDano.push({ rotulo: loc(EXTRA_DA_FORMA[esp]), formula: "1d6" });
  if (opcoes.faro) r.extrasDano.push({ rotulo: loc("ICARUS.Druida.Faro"), formula: "1d6" });
  if (actor.getFlag(F, "milFormas")) r.extrasDano.push({ rotulo: loc("ICARUS.Druida.MilFormas"), formula: "2d6" });
  if (actor.getFlag(F, "feraAncestral")) r.extrasDano.push({ rotulo: loc("ICARUS.Druida.FeraAncestral"), formula: "2d6" });
  const lembrete = { derrubar: "ICARUS.Druida.Derrubar", abraco: "ICARUS.Druida.Abraco", constricao: "ICARUS.Druida.Constricao" }[esp];
  if (lembrete) r.linhas.push(fmt(lembrete, { cd: cdDoDruida(actor) }));
  if (esp === "derrubar") r.linhas.push(loc("ICARUS.Druida.Alcateia"));
  return r.linhas.length || r.extrasDano.length ? r : null;
});

/* ---------------- Mosaico Vivo ---------------- */

ACOES_DE_MECANICA.set("druida:mosaico", async actor => {
  const item = itemDeClasse(actor, "druida", "mosaico-vivo");
  if (!item) return;
  const n = partesDoMosaico(actor.system.nivel);
  const custo = item.system.custoPM ?? 2;
  let partes;
  for (;;) {
    partes = await DialogV2.wait({
      window: { title: item.name },
      content: `<div class="icarus-uso"><p>${esc(fmt("ICARUS.Druida.MosaicoTexto", { n, pm: custo }))}</p>
        ${partesDisponiveis(actor.system.nivel).map(p => `<label class="chk"><input type="checkbox" name="parte" value="${p.id}"> ${esc(loc(`ICARUS.Druida.Partes.${p.id}`))}</label>`).join("")}
        <p class="dica">${esc(fmt("ICARUS.Poderes.PMAtual", { pm: actor.system.pm.value, max: actor.system.pm.max }))}</p></div>`,
      buttons: [
        { action: "ok", label: loc("ICARUS.Poderes.Usar"), default: true, callback: (ev, b) => [...b.form.querySelectorAll("input[name=parte]:checked")].map(i => i.value) },
        { action: "cancelar", label: loc("ICARUS.Testes.Cancelar") }
      ],
      rejectClose: false
    });
    if (!Array.isArray(partes)) return;
    if (partes.length >= 1 && partes.length <= n) break;
    ui.notifications.warn(fmt("ICARUS.Druida.MosaicoQuantas", { n }));
  }
  if (!(await gastarPM(actor, custo))) return;
  const escolhidas = PARTES_DO_MOSAICO.filter(p => partes.includes(p.id));
  const nomes = escolhidas.map(p => loc(`ICARUS.Druida.Partes.${p.id}`));
  const antigos = actor.effects.filter(e => e.flags?.[F]?.mosaico).map(e => e.id);
  if (antigos.length) await actor.deleteEmbeddedDocuments("ActiveEffect", antigos);
  const { changes } = mudancasParaEfeito(escolhidas.flatMap(p => p.mudancas ?? []));
  await actor.createEmbeddedDocuments("ActiveEffect", [{ name: `${item.name}: ${nomes.join(", ")}`, img: item.img, changes, transfer: false,
    flags: { [F]: { duracao: "cena", mosaico: partes } } }]);
  return avisarNoChat(actor, fmt("ICARUS.Druida.MosaicoChat", { nome: actor.name, partes: nomes.join(", ") }));
});

/* ---------------- Ervas Frescas ---------------- */

ACOES_DE_MECANICA.set("druida:preparar", async actor => {
  if (!game.user.isGM) return ui.notifications.warn(loc("ICARUS.Druida.PrepararSoMestre"));
  const rara = tem(actor, "erva-rara");
  const n = quantasErvas(actor.system.nivel, { maosDeSeiva: tem(actor, "maos-de-seiva"), boticario: tem(actor, "boticario") });
  const r = await DialogV2.wait({
    window: { title: loc("ICARUS.Druida.Preparar") },
    content: `<div class="icarus-uso"><p>${esc(fmt("ICARUS.Druida.PrepararTexto", { nome: actor.name, n }))}</p>
      ${rara ? `<label class="chk"><input type="checkbox" name="rara" checked> ${esc(loc("ICARUS.Druida.ErvaRaraRotulo"))}</label>` : ""}</div>`,
    buttons: [
      { action: "ok", label: loc("ICARUS.Devocao.Confirmar"), default: true, callback: (ev, b) => ({ rara: !!b.form.elements.rara?.checked }) },
      { action: "cancelar", label: loc("ICARUS.Testes.Cancelar") }
    ],
    rejectClose: false
  });
  if (!r || typeof r !== "object") return;
  if (r.rara && !(await gastarPM(actor, 1))) return;
  // As ervas do descanso anterior somem
  await actor.update({ [`flags.${F}.ervas`]: n, [`flags.${F}.ervasRaras`]: !!r.rara });
  return avisarNoChat(actor, fmt("ICARUS.Druida.PrepararChat", { nome: actor.name, n }));
});

ACOES_DE_MECANICA.set("druida:erva", async actor => {
  const ervas = Number(actor.getFlag(F, "ervas")) || 0;
  if (ervas <= 0) return ui.notifications.warn(loc("ICARUS.Druida.SemErvas"));
  const alvo = alvoMarcado()?.actor ?? actor;
  const nomeAlvo = alvoMarcado()?.name ?? actor.name;
  const formula = curaDaErva(actor.system.nivel, { boticario: tem(actor, "boticario") });
  const condicoes = condicoesDaErva(!!actor.getFlag(F, "ervasRaras"));
  const infusao = tem(actor, "infusao-revigorante");
  const r = await DialogV2.wait({
    window: { title: loc("ICARUS.Druida.UsarErva") },
    content: `<div class="icarus-uso"><p>${esc(fmt("ICARUS.Druida.ErvaTexto", { alvo: nomeAlvo, n: ervas }))}</p>
      <label class="linha">${esc(loc("ICARUS.Druida.ErvaEfeito"))} <select name="efeito">
        <option value="cura">${esc(fmt("ICARUS.Druida.ErvaCura", { formula }))}</option>
        ${condicoes.map(c => `<option value="${c}">${esc(fmt("ICARUS.Druida.ErvaRemove", { condicao: CONDICAO_POR_ID[c]?.nome ?? c }))}</option>`).join("")}
      </select></label>
      ${infusao ? `<label class="chk"><input type="checkbox" name="infusao"> ${esc(loc("ICARUS.Druida.InfusaoRotulo"))}</label>` : ""}</div>`,
    buttons: [
      { action: "ok", label: loc("ICARUS.Poderes.Usar"), default: true, callback: (ev, b) => ({ efeito: b.form.elements.efeito.value, infusao: !!b.form.elements.infusao?.checked }) },
      { action: "cancelar", label: loc("ICARUS.Testes.Cancelar") }
    ],
    rejectClose: false
  });
  if (!r || typeof r !== "object") return;
  if (r.infusao && !(await gastarPM(actor, 2))) return;
  await actor.setFlag(F, "ervas", ervas - 1);
  const extras = [];
  if (r.efeito === "cura") {
    await rolarDanoAvulso({ formula, cura: true, alvoUuid: alvo.uuid, titulo: fmt("ICARUS.Druida.ErvaTitulo", { alvo: nomeAlvo }), img: actor.img, actor });
    if (tem(actor, "desabrochar")) extras.push(fmt("ICARUS.Druida.Desabrochar", { alvo: nomeAlvo, valor: Math.floor(actor.system.nivel / 2) }));
  } else {
    if (alvo.isOwner) await removerCondicao(alvo, r.efeito);
    extras.push(fmt("ICARUS.Druida.ErvaRemoveuChat", { alvo: nomeAlvo, condicao: CONDICAO_POR_ID[r.efeito]?.nome ?? r.efeito }));
  }
  if (r.infusao) {
    const roll = await new Roll("1d4").evaluate();
    if (alvo.isOwner) await alvo.update({ "system.pm.value": Math.min(alvo.system.pm.max, alvo.system.pm.value + roll.total) });
    extras.push(fmt("ICARUS.Druida.InfusaoChat", { alvo: nomeAlvo, valor: roll.total }));
    await avisarNoChat(actor, extras.join(" "), { rolls: [roll] });
  } else if (extras.length) await avisarNoChat(actor, extras.join(" "));
});

/* ---------------- Caminho das Raízes ---------------- */

const arvoresDe = actor => (Array.isArray(actor.getFlag(F, "arvoresConhecidas")) ? actor.getFlag(F, "arvoresConhecidas") : []);

ACOES_DE_MECANICA.set("druida:arvore-marcar", async actor => {
  const token = actor.getActiveTokens?.()[0];
  const local = token ? { cena: token.scene?.id ?? canvas.scene?.id ?? null, nomeCena: token.scene?.name ?? "", x: token.document?.x ?? token.x, y: token.document?.y ?? token.y } : null;
  const nome = await DialogV2.wait({
    window: { title: loc("ICARUS.Druida.MarcarArvore") },
    content: `<div class="icarus-uso"><label class="linha">${esc(loc("ICARUS.Druida.NomeDaArvore"))} <input type="text" name="nome" autofocus></label>
      ${local ? `<p class="dica">${esc(fmt("ICARUS.Druida.PontoDoToken", { cena: local.nomeCena }))}</p>` : ""}</div>`,
    buttons: [
      { action: "ok", label: loc("ICARUS.Devocao.Confirmar"), default: true, callback: (ev, b) => b.form.elements.nome.value.trim() },
      { action: "cancelar", label: loc("ICARUS.Testes.Cancelar") }
    ],
    rejectClose: false
  });
  if (!nome || nome === "cancelar") return;
  const limite = limiteDeArvores(sabedoria(actor), actor.system.nivel);
  const antes = arvoresDe(actor);
  const lista = marcarArvore(antes, { nome, ...(local ?? {}) }, limite);
  await actor.setFlag(F, "arvoresConhecidas", lista);
  const esquecidas = antes.length + 1 - lista.length;
  return avisarNoChat(actor, fmt(esquecidas > 0 ? "ICARUS.Druida.ArvoreEsquecida" : "ICARUS.Druida.ArvoreMarcada", { nome: actor.name, arvore: nome, antiga: antes[0]?.nome ?? "" }));
});

ACOES_DE_MECANICA.set("druida:portal", async actor => {
  const arvores = arvoresDe(actor);
  if (!arvores.length) return ui.notifications.warn(loc("ICARUS.Druida.SemArvores"));
  const item = itemDeClasse(actor, "druida", "caminho-das-raizes");
  const trilha = tem(actor, "trilha-compartilhada");
  const r = await DialogV2.wait({
    window: { title: item?.name ?? loc("ICARUS.Druida.Portal") },
    content: `<div class="icarus-uso"><p>${esc(fmt("ICARUS.Druida.PortalTexto", { km: 5 * actor.system.nivel }))}</p>
      <select name="arvore">${arvores.map((a, i) => `<option value="${i}">${esc(a.nome)}${a.nomeCena ? ` (${esc(a.nomeCena)})` : ""}</option>`).join("")}</select>
      ${trilha ? `<label class="linha">${esc(fmt("ICARUS.Druida.TrilhaRotulo", { max: Math.max(0, sabedoria(actor)) }))} <input type="number" name="levar" value="0" min="0" max="${Math.max(0, sabedoria(actor))}"></label>` : ""}
      <p class="dica">${esc(fmt("ICARUS.Poderes.PMAtual", { pm: actor.system.pm.value, max: actor.system.pm.max }))}</p></div>`,
    buttons: [
      { action: "ok", label: loc("ICARUS.Poderes.Usar"), default: true, callback: (ev, b) => ({ i: Number(b.form.elements.arvore.value), levar: Math.max(0, Math.min(Math.max(0, sabedoria(actor)), Number(b.form.elements.levar?.value) || 0)) }) },
      { action: "cancelar", label: loc("ICARUS.Testes.Cancelar") }
    ],
    rejectClose: false
  });
  if (!r || typeof r !== "object") return;
  const arvore = arvores[r.i];
  if (!arvore || !(await gastarPM(actor, (item?.system?.custoPM ?? 4) + r.levar))) return;
  await avisarNoChat(actor, fmt("ICARUS.Druida.PortalChat", { nome: actor.name, arvore: arvore.nome, levar: r.levar }));
  // Mover o token: só o Mestre, na cena guardada
  const token = actor.getActiveTokens?.()[0];
  if (!arvore.cena || !token) return;
  if (!game.user.isGM) return ui.notifications.info(loc("ICARUS.Druida.PortalMestre"));
  if (token.document.parent?.id !== arvore.cena) return ui.notifications.warn(fmt("ICARUS.Druida.PortalOutraCena", { cena: arvore.nomeCena }));
  const ok = await DialogV2.confirm({ window: { title: loc("ICARUS.Druida.Portal") }, content: `<p>${esc(fmt("ICARUS.Druida.PortalMover", { nome: actor.name, arvore: arvore.nome }))}</p>`, rejectClose: false });
  if (ok) await token.document.update({ x: arvore.x, y: arvore.y }, { animate: false });
});

/* ---------------- Mil Formas e poderes simples ---------------- */

GANCHOS_DE_PODER.set("druida__mil-formas", {
  antes: actor => {
    if (actor.getFlag(F, "milFormasDia")) { ui.notifications.warn(loc("ICARUS.Druida.MilFormasDia")); return false; }
  },
  depois: async actor => {
    await actor.update({ [`flags.${F}.milFormasDia`]: true, [`flags.${F}.milFormas`]: true });
    return avisarNoChat(actor, fmt("ICARUS.Druida.MilFormasChat", { nome: actor.name }));
  }
});

GANCHOS_DE_PODER.set("druida__floresta-desperta", {
  antes: actor => umaVez(actor, "florestaUsada"),
  depois: async actor => {
    await actor.setFlag(F, "florestaUsada", true);
    await cartaoDeEfeito(actor, { id: "floresta-desperta", nome: loc("ICARUS.Druida.Floresta"), texto: fmt("ICARUS.Druida.FlorestaChat", { nome: actor.name, cd: cdDoDruida(actor) }),
      efeito: { tipo: "efeito", alvo: "inimigo", duracao: { tipo: "cena" }, condicoes: ["enredado"], resistencia: { atributo: "reflexos", efeito: "anula" } } });
    return rolarDanoAvulso({ partes: [{ formula: "3d6", tipo: "impacto" }], titulo: loc("ICARUS.Druida.Floresta"), img: actor.img, actor });
  }
});

GANCHOS_DE_PODER.set("druida__florescer", {
  antes: actor => umaVez(actor, "florescerUsado"),
  depois: async actor => {
    await actor.setFlag(F, "florescerUsado", true);
    return rolarDanoAvulso({ formula: "3d8", cura: true, titulo: loc("ICARUS.Druida.Florescer"), img: actor.img, actor });
  }
});

GANCHOS_DE_PODER.set("druida__raizes-vigilantes", {
  depois: actor => avisarNoChat(actor, fmt("ICARUS.Druida.RaizesChat", { nome: actor.name, raio: tem(actor, "jardim-bravio") ? 6 : 3, cd: cdDoDruida(actor) }))
});

GANCHOS_DE_PODER.set("druida__espinhos-de-retorno", {
  depois: actor => rolarDanoAvulso({ partes: [{ formula: `1d6 + ${sabedoria(actor)}`, tipo: "perfuracao" }], titulo: loc("ICARUS.Druida.Espinhos"), img: actor.img, actor })
});

GANCHOS_DE_PODER.set("druida__seiva-pegajosa", {
  depois: actor => cartaoDeEfeito(actor, { id: "seiva-pegajosa", nome: loc("ICARUS.Druida.Seiva"), texto: fmt("ICARUS.Druida.SeivaChat", { nome: actor.name, cd: cdDoDruida(actor) }),
    efeito: { tipo: "efeito", alvo: "inimigo", duracao: { tipo: "rodadas", rodadas: 1 }, condicoes: ["lento"], resistencia: { atributo: "reflexos", efeito: "anula" } } })
});

GANCHOS_DE_PODER.set("druida__flor-protetora", {
  depois: actor => cartaoDeEfeito(actor, { id: "flor-protetora", nome: loc("ICARUS.Druida.Flor"), texto: fmt("ICARUS.Druida.FlorChat", { nome: actor.name }),
    efeito: { tipo: "efeito", alvo: "aliados", duracao: { tipo: "cena" }, mudancas: [{ chave: "defesa", valor: 1, modo: "somar" }, { chave: "resistencia", valor: 1 }] } })
});

for (const [id, formula, chave] of [["canteiro-curativo", "1d6", "ICARUS.Druida.Canteiro"], ["primavera-continua", "1d4", "ICARUS.Druida.Primavera"]]) {
  GANCHOS_DE_PODER.set(`druida__${id}`, {
    depois: actor => rolarDanoAvulso({ formula, cura: true, titulo: loc(chave), img: actor.img, actor })
  });
}

/* ---------------- Magias conhecidas ---------------- */

/** Limite e quantas magias o Druida conhece (n + 2, +2 por Sementes de Magia). */
export function magiasDoDruida(actor) {
  const sementes = actor.items.filter(i => i.flags?.[F]?.id === "druida__sementes-de-magia" && i.flags?.[F]?.magiasExtras).length;
  return { conhecidas: actor.items.filter(i => i.type === "magia").length, limite: limiteDeMagiasDoClerigo(actor.system.nivel, sementes) };
}

/* ---------------- Fim da cena ---------------- */

FIM_DA_CENA.push(async actor => {
  if (!ehDruida(actor)) return;
  // Efeitos de cena (Forma, Mosaico) saem no "Encerrar cena"; a arma natural sai com a Forma
  if (actor.isOwner) {
    const armas = actor.items.filter(i => i.flags?.[F]?.armaDaForma).map(i => i.id);
    if (armas.length) await actor.deleteEmbeddedDocuments("Item", armas);
  }
  for (const k of ["teiaUsada", "feraAncestralUsada", "feraAncestral", "florestaUsada", "florescerUsado"]) {
    if (actor.getFlag(F, k) !== undefined) await actor.unsetFlag(F, k);
  }
  if (actor.getFlag(F, "milFormas")) {
    await actor.unsetFlag(F, "milFormas");
    await aplicarCondicao(actor, "fatigado", { origem: loc("ICARUS.Druida.MilFormas") });
    await avisarNoChat(actor, fmt("ICARUS.Druida.MilFormasFim", { nome: actor.name }));
  }
});

/* ---------------- Hooks ---------------- */

Hooks.once("init", () => {
  // Conjuração Divina: lista Divina, até o 5º nível, n + 2 (+2 por Sementes de Magia); o Mestre só é avisado
  Hooks.on("preCreateItem", (item, dados, opcoes, userId) => {
    const actor = item.parent;
    if (userId !== game.user.id || item.type !== "magia" || !actor || !ehDruida(actor)) return;
    const m = magiasDoDruida(actor);
    const motivo = motivoParaNaoAprender(item.system, { nivel: actor.system.nivel, tradicao: "divina", conhecidas: m.conhecidas, limite: m.limite, teto: 5 });
    if (!motivo) return;
    const texto = fmt(motivo.chave, motivo.dados);
    if (game.user.isGM) { ui.notifications.warn(fmt("ICARUS.Magias.Conhecidas.Mestre", { motivo: texto })); return; }
    ui.notifications.warn(texto);
    return false;
  });
  Hooks.on("preCreateActiveEffect", (efeito, dados, opcoes, userId) => {
    const actor = efeito.parent;
    if (userId !== game.user.id || !actor || !ehDruida(actor)) return;
    const st = [...(efeito.statuses ?? dados.statuses ?? [])];
    // Sangue Verde: imune a Doente
    if (st.includes("doente") && tem(actor, "sangue-verde")) {
      ui.notifications.info(fmt("ICARUS.Druida.Imune", { nome: actor.name }));
      return false;
    }
  });
  // Inconsciente: a Forma acaba
  Hooks.on("createActiveEffect", (efeito, opcoes, userId) => {
    const actor = efeito.parent;
    if (userId !== game.user.id || !actor || !ehDruida(actor) || !efeito.statuses?.has?.("inconsciente") || !formaDoAtor(actor)) return;
    sairDaForma(actor);
  });
  // A Forma saiu (voltar, Encerrar cena, apagada à mão): some a arma natural
  Hooks.on("deleteActiveEffect", (efeito, opcoes, userId) => {
    const actor = efeito.parent;
    if (userId !== game.user.id || !actor?.items || !efeito.flags?.[F]?.forma) return;
    const armas = actor.items.filter(i => i.flags?.[F]?.armaDaForma).map(i => i.id);
    if (armas.length) actor.deleteEmbeddedDocuments("Item", armas);
  });
});

/* ---------------- Aba Classe ---------------- */

registrarLinhas("druida", actor => {
  const linhas = [];
  const div = divindadePorId(actor.system.identidade.divindade);
  const anatema = !!actor.getFlag(F, "anatema");
  if (anatema) linhas.push({ id: "druida:anatema", rotulo: loc("ICARUS.Clerigo.Anatema"), info: loc("ICARUS.Clerigo.AnatemaInfo") });
  else if (div) {
    linhas.push({ id: "druida:divindade", rotulo: fmt("ICARUS.Clerigo.Divindade", { divindade: div.nome }), info: div.dogma });
    const concedidos = actor.items.filter(i => i.flags?.[F]?.concedido && i.flags[F].divindade === div.id).length;
    const precisa = div.id === "floressa" ? 3 : 2;
    if (concedidos < precisa) linhas.push({ id: "devocao:concedidos", rotulo: loc("ICARUS.Paladino.EscolherConcedidos"), botao: true, ativo: true, info: fmt("ICARUS.Druida.ConcedidosInfo", { n: concedidos, total: precisa }) });
  } else if (tem(actor, "fe-selvagem")) linhas.push({ id: "druida:sem-divindade", rotulo: loc("ICARUS.Clerigo.SemDivindade"), info: loc("ICARUS.Clerigo.SemDivindadeInfo") });
  const dogma = actor.getFlag(F, "dogma");
  if (dogma?.bloqueioPMDias) linhas.push({ id: "druida:bloqueio", rotulo: loc("ICARUS.Clerigo.Bloqueio"), info: fmt("ICARUS.Clerigo.BloqueioInfo", { dias: dogma.bloqueioPMDias }) });
  if (game.user.isGM && !anatema && tem(actor, "fe-selvagem")) linhas.push({ id: "clerigo:dogma", rotulo: loc("ICARUS.Clerigo.Dogma"), botao: true, info: fmt("ICARUS.Clerigo.DogmaInfo", { n: dogma?.violacoes ?? 0 }) });
  if (game.user.isGM && (dogma?.bloqueioPMDias || actor.getFlag(F, "milFormasDia"))) linhas.push({ id: "clerigo:dia", rotulo: loc("ICARUS.Clerigo.PassouDia"), botao: true });
  const circulo = actor.getFlag(F, "circulo");
  if (circulo) linhas.push({ id: "druida:circulo", rotulo: loc("ICARUS.Druida.Circulo"), info: loc(`ICARUS.Druida.Circulos.${circulo}`) });
  // Formas
  const forma = formaDoAtor(actor);
  if (tem(actor, "mudar-de-forma")) {
    const formas = formasConhecidas(actor);
    linhas.push({ id: "druida:forma", rotulo: loc(forma ? "ICARUS.Druida.TrocarForma" : "ICARUS.Druida.AssumirForma"), botao: true, desativado: !formas.length,
      info: formas.length ? formas.map(f => f.item?.name?.replace(/^Forma de\s*/i, "") ?? f.id).join(", ") : loc("ICARUS.Druida.SemFormas") });
    if (forma) {
      linhas.push({ id: "druida:voltar", rotulo: loc("ICARUS.Druida.Voltar"), botao: true, ativo: true, info: fmt("ICARUS.Druida.FormaInfo", { forma: forma.nome, defesa: forma.defesa }) });
      if (forma.id === "aranha") linhas.push({ id: "druida:teia", rotulo: loc("ICARUS.Druida.Teia"), botao: true, desativado: !!actor.getFlag(F, "teiaUsada"), info: `CD ${cdDoDruida(actor)}` });
    }
  }
  if (tem(actor, "mosaico-vivo")) linhas.push({ id: "druida:mosaico", rotulo: itemDeClasse(actor, "druida", "mosaico-vivo").name, botao: true, info: fmt("ICARUS.Druida.MosaicoInfo", { n: partesDoMosaico(actor.system.nivel) }) });
  if (actor.getFlag(F, "milFormas")) linhas.push({ id: "druida:mil", rotulo: loc("ICARUS.Druida.MilFormas"), info: loc("ICARUS.Druida.MilFormasInfo") });
  // Ervas
  if (tem(actor, "ervas-frescas")) {
    const ervas = Number(actor.getFlag(F, "ervas")) || 0;
    linhas.push({ id: "druida:erva", rotulo: loc("ICARUS.Druida.UsarErva"), botao: true, desativado: ervas <= 0,
      info: fmt("ICARUS.Druida.ErvasInfo", { n: ervas, formula: curaDaErva(actor.system.nivel, { boticario: tem(actor, "boticario") }) }) });
    if (game.user.isGM) linhas.push({ id: "druida:preparar", rotulo: loc("ICARUS.Druida.Preparar"), botao: true,
      info: fmt("ICARUS.Druida.PrepararInfo", { n: quantasErvas(actor.system.nivel, { maosDeSeiva: tem(actor, "maos-de-seiva"), boticario: tem(actor, "boticario") }) }) });
  }
  // Caminho das Raízes
  if (tem(actor, "caminho-das-raizes")) {
    const arvores = arvoresDe(actor);
    const limite = limiteDeArvores(sabedoria(actor), actor.system.nivel);
    linhas.push({ id: "druida:arvore-marcar", rotulo: loc("ICARUS.Druida.MarcarArvore"), botao: true, info: fmt("ICARUS.Druida.ArvoresInfo", { n: arvores.length, limite }) });
    linhas.push({ id: "druida:portal", rotulo: loc("ICARUS.Druida.Portal"), botao: true, desativado: !arvores.length, info: arvores.map(a => a.nome).join(", ") || loc("ICARUS.Druida.SemArvores") });
  }
  if (tem(actor, "sangue-verde")) linhas.push({ id: "druida:sangue", rotulo: loc("ICARUS.Druida.SangueVerde"), info: loc("ICARUS.Druida.SangueVerdeInfo") });
  const m = magiasDoDruida(actor);
  linhas.push({ id: "druida:magias", rotulo: loc("ICARUS.Arcanista.Conhecidas"),
    info: `${fmt("ICARUS.Arcanista.ConhecidasInfo", { n: m.conhecidas, limite: m.limite })} · ${loc("ICARUS.Clerigo.ListaDivina")} · CD ${cdDoDruida(actor)} · ${loc("ICARUS.Druida.AfinidadeInfo")}` });
  return linhas;
});
