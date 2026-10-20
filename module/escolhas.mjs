/**
 * Telas de escolha das habilidades e poderes de classe (campo "escolha" de classes.json — a fonte
 * de verdade das telas; nada de listas fixas aqui):
 *   caminho      escolher 1 entre "opcoes" (descrição tirada das subs; no Vínculo, a mini-ficha do
 *                animal). permanente = só muda pelo reset de classe ou pelo Mestre.
 *   atributo     1 dos 6 (desabilita o que já recebeu aumento neste patamar)
 *   pericias     "quantidade" perícias com "filtro": nao-treinadas | treinadas | treinadas-nao-especialistas
 *   tipo-dano    1 entre "opcoes" (Corpo Temperado: Redução 5 desse tipo)
 *   terreno      1 entre "opcoes", sem repetir um terreno já escolhido
 *   arma-exotica 1 arma exótica do compêndio de armas, sem repetir
 * O resultado fica nas flags do item (e o nome ganha a escolha: "Aumento de Atributo (Destreza)").
 * Fechar a tela sem escolher deixa o item "pendente de escolha" (aviso na ficha e botão para concluir).
 */
import { SISTEMA_ID, ATRIBUTOS, PERICIAS } from "./config.mjs";
import { patamarDe, podeAumentarAtributo, normalizarNome, classePorId } from "./classes-dados.mjs";
import ARMAS from "./dados/armas.mjs";
import VINCULOS from "./dados/vinculos.mjs";
import { marcarTreino } from "./assistente.mjs";

const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);
const esc = t => Handlebars.escapeExpression(t ?? "");
const { DialogV2 } = foundry.applications.api;

/** Tipos de dano do Corpo Temperado ("Ácido" → "acido"). */
const TIPO_DANO = nome => ({ acido: "acido", eletrico: "eletrico", fogo: "fogo", frio: "frio" })[normalizarNome(nome)] ?? normalizarNome(nome);

/** Entrada (habilidade ou poder) do JSON de um item de classe. */
export function entradaDoItem(item) {
  const f = item?.flags?.[SISTEMA_ID] ?? {};
  const classe = classePorId(f.classe ?? item?.system?.classe);
  const id = String(f.id ?? "").split("__")[1];
  if (!classe || !id) return { classe: null, entrada: null };
  return { classe, entrada: [...classe.habilidades, ...classe.poderes].find(x => x.id === id) ?? null };
}

/** O item precisa de uma escolha que ainda não foi feita? */
export function escolhaPendente(item) {
  const { entrada } = entradaDoItem(item);
  return !!entrada?.escolha && !item.flags?.[SISTEMA_ID]?.escolhaFeita;
}

/** Itens de classe do ator com escolha pendente. */
export const pendentesDoAtor = actor => actor.items.filter(i => i.type === "poder" && escolhaPendente(i));

/** Botões simples (um por opção) num diálogo; devolve o valor escolhido ou null. */
async function escolherUm(titulo, texto, opcoes, { aviso = "" } = {}) {
  const r = await DialogV2.wait({
    window: { title: titulo },
    content: `<div class="icarus-uso">${texto ? `<p>${esc(texto)}</p>` : ""}${aviso ? `<p class="aviso">${esc(aviso)}</p>` : ""}</div>`,
    buttons: opcoes.map((o, i) => ({ action: String(i), label: o.rotulo, disabled: !!o.desativado })),
    rejectClose: false
  });
  const i = Number(r);
  return Number.isInteger(i) && opcoes[i] && !opcoes[i].desativado ? opcoes[i].valor : null;
}

/* ---------------- Telas por tipo ---------------- */

/** Caminho/Senda/Vínculo: cartões lado a lado com a descrição (e a mini-ficha do animal). */
async function telaCaminho(actor, classe, entrada) {
  const subs = entrada.subs ?? [];
  const cartoes = entrada.escolha.opcoes.map((nome, i) => {
    const sub = subs.find(s => normalizarNome(s.nome) === normalizarNome(nome)) ?? subs[i];
    const animal = VINCULOS.vinculos.find(v => normalizarNome(v.nome) === normalizarNome(nome));
    const ficha = animal ? miniFicha(animal) : "";
    return `<div class="cartao-escolha"><h4>${esc(nome)}</h4><div>${sub?.descricao ?? ""}</div>${ficha}</div>`;
  }).join("");
  const r = await DialogV2.wait({
    window: { title: entrada.nome },
    position: { width: Math.min(1100, 260 * entrada.escolha.opcoes.length + 60) },
    content: `<div class="icarus-uso escolha-caminho">${entrada.escolha.permanente ? `<p class="aviso">${esc(loc("ICARUS.Escolhas.Permanente"))}</p>` : ""}<div class="cartoes-escolha">${cartoes}</div></div>`,
    buttons: entrada.escolha.opcoes.map((nome, i) => ({ action: String(i), label: nome })),
    rejectClose: false
  });
  const i = Number(r);
  if (!Number.isInteger(i) || !entrada.escolha.opcoes[i]) return null;
  return { flags: { caminho: { indice: i, opcao: entrada.escolha.opcoes[i] } }, sufixo: entrada.escolha.opcoes[i], indice: i };
}

/** Mini-ficha do animal (Anexo B). */
function miniFicha(a) {
  const at = ATRIBUTOS.map(k => `${k} ${a.atributos?.[k] >= 0 ? "+" : ""}${a.atributos?.[k] ?? 0}`).join(" · ");
  const desl = Object.entries(a.deslocamentos ?? {}).map(([k, v]) => `${k} ${v} m`).join(", ");
  const atq = a.ataques.map(x => `${x.nome} ${x.dano} ${x.tipo}${x.extra ? ` (${x.extra})` : ""}`).join("; ");
  return `<dl class="mini-ficha"><dt>${esc(loc("ICARUS.Escolhas.Atributos"))}</dt><dd>${esc(at)}</dd>
    <dt>${esc(loc("ICARUS.Escolhas.Treinadas"))}</dt><dd>${esc((a.treinadas ?? []).join(", "))}</dd>
    <dt>${esc(loc("ICARUS.Escolhas.Defesa"))}</dt><dd>+${a.defesaBonus}${a.rd ? ` · RD ${a.rd}` : ""}</dd>
    <dt>${esc(loc("ICARUS.Escolhas.Deslocamento"))}</dt><dd>${esc(desl)}</dd>
    <dt>${esc(loc("ICARUS.Escolhas.Ataques"))}</dt><dd>${esc(atq)}</dd>
    ${(a.habilidades ?? []).map(h => `<dt>${esc(h.nome)}</dt><dd>${esc(h.texto)}</dd>`).join("")}
    <dd class="provisorio">${esc(loc("ICARUS.Escolhas.Provisorio"))}</dd></dl>`;
}

/** Aumento de Atributo: 6 botões; o atributo que já subiu neste patamar fica desabilitado. */
async function telaAtributo(actor, classe, entrada, { forcado }) {
  const nivel = actor.system.nivel;
  const patamar = patamarDe(nivel);
  const existentes = actor.items.map(i => i.flags?.[SISTEMA_ID]?.aumentoAtributo).filter(Boolean);
  const opcoes = ATRIBUTOS.map(k => ({ valor: k, rotulo: loc(`ICARUS.Atributos.${k}`), desativado: !forcado && !podeAumentarAtributo(existentes, k, patamar) }));
  const atributo = await escolherUm(entrada.nome, fmt("ICARUS.Comuns.AumentoTexto", { patamar: loc(`ICARUS.Patamares.${patamar}`) }), opcoes);
  if (!atributo) return null;
  return { flags: { aumentoAtributo: { atributo, nivel, patamar } }, sufixo: loc(`ICARUS.Atributos.${atributo}`) };
}

/** Perícias: lista filtrada, quantidade exata, treino atual → resultado. */
async function telaPericias(actor, classe, entrada) {
  const { quantidade = 1, filtro } = entrada.escolha;
  const treino = k => actor.system.pericias[k].treino;
  const especialistas = new Set(PERICIAS.filter(p => treino(p.chave) >= 2).map(p => p.chave));
  const passa = {
    "nao-treinadas": k => treino(k) === 0,
    treinadas: k => treino(k) >= 1 && !especialistas.has(k),
    "treinadas-nao-especialistas": k => treino(k) === 1
  }[filtro] ?? (() => true);
  const vira = filtro === "nao-treinadas" ? 1 : 2;
  const opcoes = PERICIAS.map(p => p.chave).filter(passa);
  if (opcoes.length < quantidade) { ui.notifications.warn(loc("ICARUS.Comuns.SemPericias")); return null; }
  const rotulo = n => loc(`ICARUS.Treino.${n}`);
  const content = `<div class="icarus-uso"><p>${esc(fmt("ICARUS.Escolhas.PericiasTexto", { n: quantidade }))}</p><div class="grade-pericias-classe">${opcoes.map(k =>
    `<label class="chk"><input type="checkbox" name="pericia" value="${k}"> ${esc(loc(`ICARUS.Pericias.${k}`))} <small>(${esc(rotulo(treino(k)))} → ${esc(rotulo(vira))})</small></label>`).join("")}</div></div>`;
  const escolha = await DialogV2.wait({
    window: { title: entrada.nome }, content,
    buttons: [
      { action: "ok", label: loc("ICARUS.Devocao.Confirmar"), default: true, callback: (ev, b) => [...b.form.querySelectorAll("input[name=pericia]:checked")].map(i => i.value) },
      { action: "cancelar", label: loc("ICARUS.Escolhas.DecidirDepois") }
    ],
    rejectClose: false
  });
  if (!Array.isArray(escolha)) return null;
  if (escolha.length !== quantidade) { ui.notifications.warn(fmt("ICARUS.Comuns.EscolhaN", { n: quantidade })); return null; }
  const nomes = escolha.map(k => loc(`ICARUS.Pericias.${k}`)).join(", ");
  // Treinar (nao-treinadas) ou especializar (treinadas): derivado do item, remover desfaz
  if (filtro === "nao-treinadas") {
    await actor.update(marcarTreino(actor, escolha, "classe"));
    return { flags: { periciasTreinadas: escolha }, sufixo: nomes };
  }
  if (quantidade === 1 && filtro === "treinadas-nao-especialistas") return { flags: { periciaEspecializada: { pericia: escolha[0] } }, sufixo: nomes };
  return { flags: { periciaRefinada: escolha }, sufixo: nomes };
}

/** Tipo de dano (Corpo Temperado): Redução 5 do tipo, como fonte de RD do item. */
async function telaTipoDano(actor, classe, entrada) {
  const nome = await escolherUm(entrada.nome, "", entrada.escolha.opcoes.map(o => ({ valor: o, rotulo: o })));
  if (!nome) return null;
  const valor = Number(String(entrada.descricao).match(/Redução de dano desse tipo (\d+)/i)?.[1] ?? 5);
  return { flags: { tipoDano: TIPO_DANO(nome), rd: [{ valor, tipo: TIPO_DANO(nome) }] }, sufixo: nome };
}

/** Terreno (Especialista em Terreno): não repete um terreno já escolhido. */
async function telaTerreno(actor, classe, entrada) {
  const ja = new Set(actor.items.map(i => i.flags?.[SISTEMA_ID]?.terreno).filter(Boolean));
  const t = await escolherUm(entrada.nome, "", entrada.escolha.opcoes.map(o => ({ valor: o, rotulo: o, desativado: ja.has(o) })));
  return t ? { flags: { terreno: t }, sufixo: t } : null;
}

/** Arma exótica (compêndio de armas), sem repetir. */
async function telaArmaExotica(actor, classe, entrada) {
  const ja = new Set(actor.items.map(i => i.flags?.[SISTEMA_ID]?.armaExotica?.id).filter(Boolean));
  const armas = ARMAS.armas.filter(a => a.categoria === "exotica");
  const r = await escolherUm(entrada.nome, loc("ICARUS.Escolhas.ArmaExotica"), armas.map(a => ({ valor: a.id, rotulo: a.nome, desativado: ja.has(a.id) })));
  const arma = armas.find(a => a.id === r);
  return arma ? { flags: { armaExotica: { id: arma.id, nome: arma.nome } }, sufixo: arma.nome } : null;
}

const TELAS = { caminho: telaCaminho, atributo: telaAtributo, pericias: telaPericias, "tipo-dano": telaTipoDano, terreno: telaTerreno, "arma-exotica": telaArmaExotica };

/** Depois de uma escolha de caminho (por id da habilidade): (actor, índice, item) => Promise. */
export const APOS_CAMINHO = new Map();

/**
 * Abre a tela da escolha de um item de classe e grava o resultado (flags + nome). Sem escolha
 * feita, o item fica pendente. Caminho permanente só muda pelo Mestre (ou reset de classe).
 * @returns {Promise<boolean>} se a escolha foi feita
 */
export async function resolverEscolha(actor, item, { forcado = false } = {}) {
  const { classe, entrada } = entradaDoItem(item);
  if (!entrada?.escolha) return false;
  const f = item.flags?.[SISTEMA_ID] ?? {};
  if (f.escolhaFeita && entrada.escolha.permanente && !game.user.isGM) {
    ui.notifications.warn(loc("ICARUS.Escolhas.SoMestre"));
    return false;
  }
  const tela = TELAS[entrada.escolha.tipo];
  if (!tela) return false;
  const r = await tela(actor, classe, entrada, { forcado });
  if (!r) {
    if (!f.escolhaFeita) ui.notifications.info(fmt("ICARUS.Escolhas.Pendente", { item: item.name }));
    return false;
  }
  await item.update({
    name: `${entrada.nome} (${r.sufixo})`,
    [`flags.${SISTEMA_ID}.escolhaFeita`]: true,
    ...Object.fromEntries(Object.entries(r.flags).map(([k, v]) => [`flags.${SISTEMA_ID}.${k}`, v]))
  });
  if (entrada.escolha.tipo === "caminho") {
    // Guarda também no ator (libera os poderes do grupo e o ramo da senda)
    const escolhas = { ...(actor.getFlag(SISTEMA_ID, "escolhasClasse") ?? {}), [entrada.id]: r.indice };
    await actor.setFlag(SISTEMA_ID, "escolhasClasse", escolhas);
    await APOS_CAMINHO.get(entrada.id)?.(actor, r.indice, item);
  }
  return true;
}
