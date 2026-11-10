/**
 * Telas de escolha das habilidades e poderes de classe (campo "escolha" de classes.json — a fonte
 * de verdade das telas; nada de listas fixas aqui):
 *   caminho      escolher 1 entre "opcoes" (descrição tirada das subs; no Vínculo, a mini-ficha do
 *                animal). permanente = só muda pelo reset de classe ou pelo Mestre.
 *   atributo     1 dos 6 (desabilita o que já recebeu aumento neste patamar)
 *   pericias     "quantidade" perícias com "filtro": nao-treinadas | treinadas | treinadas-nao-especialistas
 *   tipo-dano    1 entre "opcoes", sem repetir o tipo no mesmo poder (Corpo Temperado e Proteção
 *                Elemental: Redução desse tipo, pelo número do texto)
 *   escola       1 escola de magia entre "opcoes", sem repetir uma escola já escolhida
 *   escolas      "quantidade" escolas (Conjuração Bárdica: 3, com as "obrigatoria" já marcadas)
 *   magias       Repertório Ampliado: +"quantidade" magias conhecidas (o jogador arrasta as magias)
 *   (caminho com porCaminho: só as opções do Caminho escolhido — Estilo do Bardo)
 *   (caminho com requerLinhagem: só para quem tem essa Linhagem; pericias com "opcoes": só elas)
 *   terreno      1 entre "opcoes", sem repetir um terreno já escolhido
 *   arma-exotica 1 arma exótica do compêndio de armas, sem repetir
 *   divindade    1 das divindades do Panteão (Fé Jurada do Clérigo; "opcoes" = nomes do panteao.json)
 * O resultado fica nas flags do item (e o nome ganha a escolha: "Aumento de Atributo (Destreza)").
 * Fechar a tela sem escolher deixa o item "pendente de escolha" (aviso na ficha e botão para concluir).
 */
import { SISTEMA_ID, ATRIBUTOS, PERICIAS } from "./config.mjs";
import { patamarDe, podeAumentarAtributo, normalizarNome, classePorId, marcadorDaOpcao, chaveDaPericia } from "./classes-dados.mjs";
import ARMAS from "./dados/armas.mjs";
import VINCULOS from "./dados/vinculos.mjs";
import { marcarTreino } from "./assistente.mjs";
import { DIVINDADES, idDaDivindadePorNome } from "./panteao.mjs";

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
  // Estilo do Bardo: só as opções do Caminho escolhido (porCaminho: { Poesia: [...], Música: [...] })
  let permitidas = null;
  if (entrada.escolha.porCaminho) {
    const caminho = classe.habilidades.find(h => h.id === "caminho");
    const escolhido = caminho?.escolha?.opcoes?.[(actor.getFlag(SISTEMA_ID, "escolhasClasse") ?? {}).caminho];
    const chave = escolhido ? Object.keys(entrada.escolha.porCaminho).find(k => normalizarNome(escolhido).includes(normalizarNome(k))) : null;
    if (!chave) { ui.notifications.warn(loc("ICARUS.Escolhas.CaminhoPrimeiro")); return null; }
    permitidas = new Set(entrada.escolha.porCaminho[chave]);
  }
  const visivel = nome => !permitidas || permitidas.has(nome);
  const cartoes = entrada.escolha.opcoes.map((nome, i) => {
    if (!visivel(nome)) return "";
    // Sem subitens (Linhagem, Herança): a descrição vem da habilidade da opção ("Linhagem do Mago")
    const sub = subs.find(s => normalizarNome(s.nome) === normalizarNome(nome)) ?? subs[i] ?? marcadorDaOpcao(classe, entrada.id, i);
    const animal = VINCULOS.vinculos.find(v => normalizarNome(v.nome) === normalizarNome(nome));
    const ficha = animal ? miniFicha(animal) : "";
    return `<div class="cartao-escolha"><h4>${esc(nome)}</h4><div>${sub?.descricao ?? ""}</div>${ficha}</div>`;
  }).join("");
  const r = await DialogV2.wait({
    window: { title: entrada.nome },
    position: { width: Math.min(1100, 260 * entrada.escolha.opcoes.length + 60) },
    content: `<div class="icarus-uso escolha-caminho">${entrada.escolha.permanente ? `<p class="aviso">${esc(loc("ICARUS.Escolhas.Permanente"))}</p>` : ""}<div class="cartoes-escolha">${cartoes}</div></div>`,
    buttons: entrada.escolha.opcoes.map((nome, i) => ({ action: String(i), label: nome })).filter(b => visivel(b.label)),
    rejectClose: false
  });
  const i = Number(r);
  if (!Number.isInteger(i) || !entrada.escolha.opcoes[i] || !visivel(entrada.escolha.opcoes[i])) return null;
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
  const { quantidade = 1 } = entrada.escolha;
  // Com "opcoes" (Erudito Arcano): só essas e só as não treinadas (repetível, cada vez uma diferente)
  const filtro = entrada.escolha.filtro ?? (entrada.escolha.opcoes ? "nao-treinadas" : undefined);
  // Educação Privilegiada: da lista de perícias da classe
  const lista = entrada.escolha.opcoes ?? (entrada.id === "educacao-privilegiada" ? classe.pericias?.lista : null);
  const daLista = lista ? new Set(lista.map(chaveDaPericia).filter(Boolean)) : null;
  const treino = k => actor.system.pericias[k].treino;
  const especialistas = new Set(PERICIAS.filter(p => treino(p.chave) >= 2).map(p => p.chave));
  const passa = {
    "nao-treinadas": k => treino(k) === 0,
    treinadas: k => treino(k) >= 1 && !especialistas.has(k),
    "treinadas-nao-especialistas": k => treino(k) === 1
  }[filtro] ?? (() => true);
  const vira = filtro === "nao-treinadas" ? 1 : 2;
  const opcoes = PERICIAS.map(p => p.chave).filter(k => passa(k) && (!daLista || daLista.has(k)));
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

/**
 * Tipo de dano: sem repetir o tipo no mesmo poder (repetível). Se o texto dá Redução desse tipo
 * (Corpo Temperado 5, Proteção Elemental 3), vira fonte de RD do item; senão só guarda o tipo
 * (Mestre do Elemento).
 */
async function telaTipoDano(actor, classe, entrada) {
  const ja = new Set(actor.items.filter(i => i.flags?.[SISTEMA_ID]?.id === `${classe.id}__${entrada.id}`).map(i => i.flags?.[SISTEMA_ID]?.tipoDano).filter(Boolean));
  const nome = await escolherUm(entrada.nome, "", entrada.escolha.opcoes.map(o => ({ valor: o, rotulo: o, desativado: ja.has(TIPO_DANO(o)) })));
  if (!nome) return null;
  const rd = String(entrada.descricao).match(/Redução (?:de dano )?desse tipo (\d+)/i);
  return { flags: { tipoDano: TIPO_DANO(nome), ...(rd ? { rd: [{ valor: Number(rd[1]), tipo: TIPO_DANO(nome) }] } : {}) }, sufixo: nome };
}

/** Escolas (Conjuração Bárdica): exatamente "quantidade", com as obrigatórias marcadas e travadas. */
async function telaEscolas(actor, classe, entrada) {
  const { quantidade = 3, obrigatoria = [], opcoes = [] } = entrada.escolha;
  const content = `<div class="icarus-uso"><p>${esc(fmt("ICARUS.Escolhas.EscolasTexto", { n: quantidade, obrigatorias: obrigatoria.join(", ") }))}</p>
    <div class="grade-pericias-classe">${opcoes.map(o => `<label class="chk"><input type="checkbox" name="escola" value="${esc(o)}"${obrigatoria.includes(o) ? " checked disabled" : ""}> ${esc(o)}</label>`).join("")}</div></div>`;
  const r = await DialogV2.wait({
    window: { title: entrada.nome }, content,
    buttons: [
      { action: "ok", label: loc("ICARUS.Devocao.Confirmar"), default: true, callback: (ev, b) => [...b.form.querySelectorAll("input[name=escola]:checked")].map(i => i.value) },
      { action: "cancelar", label: loc("ICARUS.Escolhas.DecidirDepois") }
    ],
    rejectClose: false
  });
  if (!Array.isArray(r)) return null;
  const escolas = [...new Set([...obrigatoria, ...r])];
  if (escolas.length !== quantidade) { ui.notifications.warn(fmt("ICARUS.Comuns.EscolhaN", { n: quantidade })); return null; }
  return { flags: { escolas }, sufixo: escolas.join(", ") };
}

/** Repertório Ampliado: +N magias conhecidas (das escolas que conhece); o jogador arrasta as magias. */
async function telaMagias(actor, classe, entrada) {
  const n = entrada.escolha.quantidade ?? 2;
  const ok = await DialogV2.confirm({ window: { title: entrada.nome }, content: `<div class="icarus-uso"><p>${esc(fmt("ICARUS.Escolhas.MagiasTexto", { n }))}</p></div>`, rejectClose: false });
  return ok ? { flags: { magiasExtras: n }, sufixo: `+${n}` } : null;
}

/** Escola de magia (Escola Predileta, Segunda Escola): sem repetir uma escola já escolhida. */
async function telaEscola(actor, classe, entrada) {
  const ja = new Set(actor.items.map(i => i.flags?.[SISTEMA_ID]?.escola).filter(Boolean));
  const escola = await escolherUm(entrada.nome, loc("ICARUS.Escolhas.Escola"), entrada.escolha.opcoes.map(o => ({ valor: o, rotulo: o, desativado: ja.has(o) })));
  return escola ? { flags: { escola }, sufixo: escola } : null;
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

/** Divindade (Fé Jurada): uma lista com as opções do JSON; devolve o id do Panteão. */
async function telaDivindade(actor, classe, entrada) {
  const opcoes = (entrada.escolha.opcoes ?? DIVINDADES.map(d => d.nome)).map(nome => ({ nome, id: idDaDivindadePorNome(nome) })).filter(o => o.id);
  const atual = actor.system?.identidade?.divindade;
  const content = `<div class="icarus-uso"><p>${esc(loc("ICARUS.Escolhas.Divindade"))}</p>
    <select name="divindade">${opcoes.map(o => {
      const d = DIVINDADES.find(x => x.id === o.id);
      return `<option value="${o.id}"${o.id === atual ? " selected" : ""}>${esc(o.nome)}${d?.titulo ? ` — ${esc(d.titulo)}` : ""}</option>`;
    }).join("")}</select>
    <p class="dica">${esc(loc("ICARUS.Escolhas.DivindadePermanente"))}</p></div>`;
  const r = await DialogV2.wait({
    window: { title: entrada.nome }, content,
    buttons: [
      { action: "ok", label: loc("ICARUS.Devocao.Confirmar"), default: true, callback: (ev, b) => b.form.elements.divindade.value },
      { action: "cancelar", label: loc("ICARUS.Escolhas.DecidirDepois") }
    ],
    rejectClose: false
  });
  const o = opcoes.find(x => x.id === r);
  return o ? { flags: { divindade: o.id }, sufixo: o.nome } : null;
}

const TELAS = { divindade: telaDivindade,  escolas: telaEscolas, magias: telaMagias, escola: telaEscola, caminho: telaCaminho, atributo: telaAtributo, pericias: telaPericias, "tipo-dano": telaTipoDano, terreno: telaTerreno, "arma-exotica": telaArmaExotica };

/** Depois de uma escolha de caminho (por id da habilidade): (actor, índice, item) => Promise. */
export const APOS_CAMINHO = new Map();
/** Depois das outras escolhas (por id da entrada): (actor, flags da escolha, item) => Promise. Ex.: Fé Jurada. */
export const APOS_ESCOLHA = new Map();

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
  // Herança Ancestral: só para a Linhagem pedida (Feiticeiro)
  const requer = entrada.escolha.requerLinhagem;
  if (requer) {
    const li = classe.habilidades.find(h => h.id === "linhagem")?.escolha?.opcoes ?? [];
    const indice = (actor.getFlag(SISTEMA_ID, "escolhasClasse") ?? {}).linhagem;
    if (li[indice] !== requer) {
      ui.notifications.warn(fmt("ICARUS.Escolhas.RequerLinhagem", { item: entrada.nome, linhagem: requer }));
      return false;
    }
  }
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
  } else await APOS_ESCOLHA.get(entrada.id)?.(actor, r.flags, item);
  return true;
}
