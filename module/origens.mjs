/**
 * Origens no Foundry: escolher (combobox do cabeçalho + diálogo "Origem — <Nome>"), aplicar,
 * trocar (reset limpo com "Desfazer") e reaplicar. Dados e regras puras: module/origens-dados.mjs.
 *
 * Aplicar a origem:
 * - bônus de +2 na perícia da origem: Efeito Ativo no ator (system.pericias.<chave>.outros,
 *   flags.fonte = "origem"). Não treina, não usa treinoPor e soma com treino ou especialização;
 * - Poder de Origem: item "poder" automático (flags auto + origemId), com recurso se tiver uso limitado;
 * - 2 itens comuns grátis (origemItem), com as escolhas de bônus e de texto livre.
 * Trocar de origem remove o poder, os itens de origem que o jogador não editou nem multiplicou, o
 * recurso e o efeito de bônus; o treino fica como está (a troca de classe também não toca no bônus).
 */
import { SISTEMA_ID, ICONE_PADRAO, PERICIAS } from "./config.mjs";
import {
  ORIGENS, origemPorId, itemComumPorId, itensDaOrigem, opcoesDeBonus, dadosDoItemComum, dadosDoPoderDeOrigem,
  assinaturaDoItem, ATAQUE_DESARMADO, textoDoBonus, efeitoDeOrigem, ehEfeitoDeOrigem, semFonteOrigem
} from "./origens-dados.mjs";

const { DialogV2 } = foundry.applications.api;
const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);
const esc = t => Handlebars.escapeExpression(String(t ?? ""));
const F = SISTEMA_ID;
const nomePericia = k => (k === ATAQUE_DESARMADO ? loc("ICARUS.ItensComuns.AtaqueDesarmado") : loc(`ICARUS.Pericias.${k}`));

/** Poder de Origem criado automaticamente. */
export const ehPoderDeOrigemAuto = item => item.type === "poder" && item.flags?.[F]?.auto === true && !!item.flags?.[F]?.origemId;

/** Itens de origem que saem na troca: concedidos pela origem e nem editados nem multiplicados. */
export function itensDeOrigemRemoviveis(actor) {
  return actor.items.filter(i => i.type === "equipamento" && i.system.origemItem
    && Number(i.system.quantidade) === 1 && i.flags?.[F]?.assinatura === assinaturaDoItem(i));
}

/** Recurso do poder de uso limitado (id estável por poder). */
export const idDoRecurso = poderId => `origem-${poderId}`;

/* ------------------------------ Diálogo de escolhas ------------------------------ */

/** Campos de escolha de um item comum (bônus "A ou B" e texto livre), para o diálogo. */
function camposDoItem(item, prefixo, escolhido = {}) {
  const partes = [];
  const opcoes = opcoesDeBonus(item);
  if (opcoes) {
    partes.push(`<label class="f"><span class="rot">${esc(loc("ICARUS.ItensComuns.EscolhaBonus"))}</span>
      <select name="${prefixo}.bonus">${opcoes.map(k => `<option value="${k}"${escolhido.bonus === k ? " selected" : ""}>+${item.bonus.find(b => b.escolha)?.valor ?? 1} ${esc(nomePericia(k))}</option>`).join("")}</select></label>`);
  }
  if (item.escolhaTexto) {
    partes.push(`<label class="f"><span class="rot">${esc(fmt("ICARUS.ItensComuns.QualTexto", { texto: item.escolhaTexto }))}</span>
      <input type="text" name="${prefixo}.texto" value="${esc(escolhido.texto ?? "")}" placeholder="${esc(item.escolhaTexto)}"></label>`);
  }
  return partes.join("");
}

const lerCampos = (form, prefixo) => ({
  bonus: form.querySelector(`[name="${prefixo}.bonus"]`)?.value ?? null,
  texto: form.querySelector(`[name="${prefixo}.texto"]`)?.value?.trim() ?? ""
});

/**
 * Diálogo "Origem — <Nome>": bônus de perícia (só texto), poder, itens (um de cada grupo) e as
 * escolhas dos itens. @returns {Promise<object|null>} escolhas ({ grupos[], itens{} }) ou null
 */
export async function escolherOrigem(actor, origem, anteriores = {}) {
  const poder = origem.poder;
  const custo = poder.custoPM ? ` · ${poder.custoPM} PM` : "";
  const blocoPericia = `<p>${esc(fmt("ICARUS.Origens.BonusPericia", { valor: origem.periciaBonus ?? 2, pericia: nomePericia(origem.pericia) }))}</p>`;
  const fixos = origem.itens.fixos.map(id => {
    const it = itemComumPorId(id);
    return `<li><b>${esc(it.nome)}</b>${it.bonus?.length ? ` <small>${esc(it.bonus.map(b => textoDoBonus(b)).join("; "))}</small>` : ""}${camposDoItem(it, `item.${id}`, anteriores.itens?.[id])}</li>`;
  });
  const grupos = origem.itens.escolhas.map((g, n) => `<li><fieldset><legend>${esc(loc("ICARUS.Origens.UmDosDois"))}</legend>${g.map((id, j) => {
    const it = itemComumPorId(id);
    const marcado = (anteriores.grupos?.[n] ?? 0) === j;
    return `<label class="chk"><input type="radio" name="grupo.${n}" value="${j}"${marcado ? " checked" : ""}> <b>${esc(it.nome)}</b></label>${camposDoItem(it, `item.${id}`, anteriores.itens?.[id])}`;
  }).join("")}</fieldset></li>`);
  const content = `<div class="icarus-uso dialogo-origem">
    <p class="dica">${esc(origem.texto)}</p>
    <h4>${esc(loc("ICARUS.Origens.Pericia"))}</h4>${blocoPericia}
    <h4>${esc(loc("ICARUS.Origens.Poder"))}</h4><p><b>${esc(poder.nome)}</b> <small>${esc(loc(`ICARUS.Poderes.Acoes.${poder.acao}`))}${esc(custo)}</small><br>${esc(poder.descricao)}</p>
    <h4>${esc(loc("ICARUS.Origens.Itens"))}</h4><ul class="itens-origem">${[...fixos, ...grupos].join("")}</ul>
    <p class="dica">${esc(loc("ICARUS.Origens.ItensGratis"))}</p></div>`;
  const r = await DialogV2.wait({
    window: { title: fmt("ICARUS.Origens.Titulo", { nome: origem.nome }) },
    position: { width: 520 },
    content,
    buttons: [
      { action: "ok", label: loc("ICARUS.Origens.Confirmar"), default: true, callback: (ev, b) => {
        const form = b.form;
        const escolhas = {
          grupos: origem.itens.escolhas.map((g, n) => Number(form.querySelector(`[name="grupo.${n}"]:checked`)?.value ?? 0)),
          itens: {}
        };
        for (const id of [...origem.itens.fixos, ...origem.itens.escolhas.flat()]) escolhas.itens[id] = lerCampos(form, `item.${id}`);
        return escolhas;
      } },
      { action: "cancelar", label: loc("ICARUS.Testes.Cancelar") }
    ],
    rejectClose: false
  });
  return r && typeof r === "object" ? r : null;
}

/**
 * Escolhas de um item comum adicionado fora da origem (arrastado do compêndio): bônus "A ou B" e
 * texto livre. @returns {Promise<{bonus, texto}|null>} null = cancelou; {} = não precisa
 */
export async function escolhasDoItemComum(item) {
  if (!opcoesDeBonus(item) && !item.escolhaTexto) return {};
  const r = await DialogV2.wait({
    window: { title: item.nome },
    content: `<div class="icarus-uso">${camposDoItem(item, "item")}</div>`,
    buttons: [
      { action: "ok", label: loc("ICARUS.Origens.Confirmar"), default: true, callback: (ev, b) => lerCampos(b.form, "item") },
      { action: "cancelar", label: loc("ICARUS.Testes.Cancelar") }
    ],
    rejectClose: false
  });
  return r && typeof r === "object" ? r : null;
}

/** Dados de um item comum já com as escolhas (nome com o texto, escolhaBonus, assinatura). */
export function itemComumComEscolhas(item, escolhas = {}, { origemItem = false, img = ICONE_PADRAO } = {}) {
  const dados = dadosDoItemComum(item, { img, origemItem, escolhaBonus: opcoesDeBonus(item) ? (escolhas.bonus || opcoesDeBonus(item)[0]) : null, escolhaTexto: escolhas.texto });
  dados.flags[F].assinatura = assinaturaDoItem(dados);
  return dados;
}

/* ------------------------------ Aplicar / remover ------------------------------ */

/** Ícone do compêndio (se o documento tiver um próprio), senão o padrão. */
async function iconeDoPacote(pacote, idFlag, valor) {
  const pack = game.packs.get(`${F}.${pacote}`);
  const indice = await pack?.getIndex({ fields: [`flags.${F}.${idFlag}`, "img"] });
  return indice?.find(e => foundry.utils.getProperty(e, `flags.${F}.${idFlag}`) === valor)?.img ?? ICONE_PADRAO;
}

/** Efeitos Ativos do bônus de perícia da origem no ator (flags.fonte = "origem"). */
export const efeitosDeOrigem = actor => [...(actor.effects ?? [])].filter(ehEfeitoDeOrigem);

/** Aplica a origem com as escolhas (sem reset; quem chama tira a anterior antes). */
export async function aplicarOrigem(actor, origemId, escolhas) {
  const origem = origemPorId(origemId);
  if (!origem) return;
  const atualizacao = {
    "system.identidade.origem": origem.id,
    [`flags.${F}.escolhasOrigem`]: JSON.stringify({ grupos: escolhas.grupos ?? [], itens: escolhas.itens ?? {} })
  };
  // Uso limitado: 1 recurso (cena, dia ou cidade)
  const p = origem.poder;
  if (p.usoLimitado) {
    const recursos = foundry.utils.deepClone(actor._source.system.recursos ?? []).filter(r => r.id !== idDoRecurso(p.id));
    recursos.push({ id: idDoRecurso(p.id), nome: p.nome, valor: 1, max: 1, recarga: p.usoLimitado });
    atualizacao["system.recursos"] = recursos;
  }
  await actor.update(atualizacao);
  const imgPoder = await iconeDoPacote("poderes-origem", "poderId", p.id);
  const itens = [];
  for (const id of itensDaOrigem(origem, escolhas.grupos)) {
    const item = itemComumPorId(id);
    itens.push(itemComumComEscolhas(item, escolhas.itens?.[id], { origemItem: true, img: await iconeDoPacote("itens-comuns", "id", id) }));
  }
  await actor.createEmbeddedDocuments("Item", [dadosDoPoderDeOrigem(origem, { img: imgPoder }), ...itens]);
  // Bônus de perícia (+2 em "outros"): não treina e soma com treino ou especialização
  await actor.createEmbeddedDocuments("ActiveEffect", [efeitoDeOrigem(origem, { img: imgPoder })]);
}

/** Estado que o "Desfazer" devolve: poder, itens, efeito de bônus, treino, treinoPor e recursos. */
export function fotoDaOrigem(actor) {
  const src = actor._source.system;
  const flags = actor.flags?.[F] ?? {};
  return {
    origem: src.identidade.origem,
    escolhasOrigem: flags.escolhasOrigem ?? "",
    itens: oQueSai(actor).map(i => i.toObject()),
    efeitos: efeitosDeOrigem(actor).map(e => e.toObject()),
    treinos: Object.fromEntries(PERICIAS.map(p => [p.chave, src.pericias[p.chave].treino])),
    treinoPor: foundry.utils.deepClone(flags.treinoPor ?? {}),
    recursos: foundry.utils.deepClone(src.recursos ?? [])
  };
}

/** O que a troca remove (para a confirmação). */
export function oQueSai(actor) {
  return [...actor.items.filter(ehPoderDeOrigemAuto), ...itensDeOrigemRemoviveis(actor)];
}

/**
 * Tira a origem atual: poder, itens não editados, recurso e o efeito de bônus de perícia.
 * O treino e o treinoPor não mudam (a origem não treina).
 * @param {{ snapshot?: boolean }} [op]  guarda o snapshot para "Desfazer"
 */
export async function removerOrigem(actor, { snapshot = true } = {}) {
  const src = actor._source.system;
  const origemAtual = origemPorId(src.identidade.origem);
  if (snapshot) await actor.setFlag(F, "snapshotTrocaOrigem", fotoDaOrigem(actor));
  const sair = oQueSai(actor);
  if (sair.length) await actor.deleteEmbeddedDocuments("Item", sair.map(i => i.id));
  const efeitos = efeitosDeOrigem(actor);
  if (efeitos.length) await actor.deleteEmbeddedDocuments("ActiveEffect", efeitos.map(e => e.id));
  await actor.update({
    "system.identidade.origem": "",
    [`flags.${F}.escolhasOrigem`]: "",
    "system.recursos": (src.recursos ?? []).filter(r => !origemAtual || r.id !== idDoRecurso(origemAtual.poder.id))
  });
}

/**
 * Troca pela combobox: confirma o que sai, abre o diálogo da nova origem, tira a atual e aplica.
 * @returns {Promise<boolean>} false se cancelou
 */
export async function trocarOrigem(actor, novoId) {
  const atual = actor._source.system.identidade.origem;
  if (novoId === atual) return false;
  const nova = origemPorId(novoId);
  if (atual || oQueSai(actor).length) {
    const sai = oQueSai(actor);
    const ok = await DialogV2.confirm({
      window: { title: loc("ICARUS.Origens.TrocarTitulo") },
      content: `<div class="icarus-uso"><p>${esc(nova ? fmt("ICARUS.Origens.TrocarTexto", { nova: nova.nome }) : loc("ICARUS.Origens.RemoverTexto"))}</p>
        ${sai.length ? `<ul class="lista-reset">${sai.map(i => `<li>${esc(i.name)}</li>`).join("")}</ul>` : ""}
        <p class="dica">${esc(loc("ICARUS.Origens.TrocarDica"))}</p></div>`,
      rejectClose: false
    });
    if (!ok) return false;
  }
  let escolhas = null;
  if (nova) {
    escolhas = await escolherOrigem(actor, nova);
    if (!escolhas) return false;
  }
  await removerOrigem(actor, { snapshot: !!atual });
  if (nova) await aplicarOrigem(actor, nova.id, escolhas);
  return true;
}

/** Botão "Reaplicar origem": refaz com as escolhas guardadas (sem snapshot). */
export async function reaplicarOrigem(actor) {
  const origem = origemPorId(actor._source.system.identidade.origem);
  if (!origem) return ui.notifications.warn(loc("ICARUS.Origens.SemOrigem"));
  let escolhas = {};
  try { escolhas = JSON.parse(actor.flags?.[F]?.escolhasOrigem || "{}"); } catch { escolhas = {}; }
  // Sem as escolhas guardadas (ficha antiga): pergunta de novo antes de tirar
  if (!escolhas.grupos) {
    const novas = await escolherOrigem(actor, origem, escolhas);
    if (!novas) return;
    escolhas = novas;
  }
  await removerOrigem(actor, { snapshot: false });
  await aplicarOrigem(actor, origem.id, escolhas);
  ui.notifications.info(fmt("ICARUS.Origens.Reaplicada", { origem: origem.nome }));
}

/**
 * "Desfazer troca de origem" (e da migração do bônus): volta poder, itens, efeito de bônus,
 * treino, treinoPor e recursos do snapshot.
 */
export async function desfazerTrocaDeOrigem(actor) {
  const snap = actor.getFlag(F, "snapshotTrocaOrigem");
  if (!snap) return;
  await removerOrigem(actor, { snapshot: false });
  if (snap.itens?.length) await actor.createEmbeddedDocuments("Item", snap.itens, { keepId: true });
  if (snap.efeitos?.length) await actor.createEmbeddedDocuments("ActiveEffect", snap.efeitos, { keepId: true });
  // Desfazer a migração do bônus: ela volta a ser oferecida
  if (snap.migracao) await actor.unsetFlag?.(F, "migracaoOrigemBonus");
  const mudancas = {
    "system.identidade.origem": snap.origem,
    [`flags.${F}.escolhasOrigem`]: snap.escolhasOrigem,
    "system.recursos": snap.recursos,
    [`flags.${F}.-=snapshotTrocaOrigem`]: null,
    [`flags.${F}.-=treinoPor`]: null
  };
  for (const [k, v] of Object.entries(snap.treinos ?? {})) mudancas[`system.pericias.${k}.treino`] = v;
  await actor.update(mudancas);
  await actor.update({ [`flags.${F}.treinoPor`]: snap.treinoPor ?? {} });
  ui.notifications.info(loc("ICARUS.Origens.Desfeita"));
}

/** Opções da combobox (ordem alfabética, "— Nenhuma —"; texto antigo que não bate fica como livre). */
export function opcoesDeOrigem(valor) {
  const origem = origemPorId(valor);
  const livre = valor && !origem ? valor : "";
  return {
    id: origem?.id ?? "",
    texto: origem?.texto ?? (livre ? loc("ICARUS.Origens.Livre") : ""),
    opcoes: [
      { valor: "", rotulo: loc("ICARUS.Origens.Nenhuma"), selecionado: !valor },
      ...(livre ? [{ valor: livre, rotulo: `${livre} (${loc("ICARUS.Origens.Livre").toLowerCase()})`, selecionado: true }] : []),
      ...ORIGENS.map(o => ({ valor: o.id, rotulo: o.nome, selecionado: o.id === origem?.id }))
    ]
  };
}

/* ------------------------------ Migração: origem que treinava ------------------------------ */

/**
 * Fichas de antes da correção (a origem treinava a perícia, ou outra se já fosse treinado): o que a
 * migração muda em cada uma. Só entram atores com uma origem do sistema e sem a marca da migração.
 * @returns {{ actor, origem, tira: string[], zera: string[] }[]}
 */
export function planoDaMigracaoDeOrigem(atores) {
  const planos = [];
  for (const actor of atores) {
    if (actor.type !== "personagem" || actor.flags?.[F]?.migracaoOrigemBonus) continue;
    const origem = origemPorId(actor._source.system.identidade.origem);
    if (!origem) continue;
    const treinoPor = actor.flags?.[F]?.treinoPor ?? {};
    const tira = Object.keys(treinoPor).filter(k => treinoPor[k].includes("origem"));
    const treinos = Object.fromEntries(PERICIAS.map(p => [p.chave, actor._source.system.pericias[p.chave].treino]));
    const zera = Object.keys(semFonteOrigem(treinoPor, treinos).treinos);
    if (!tira.length && efeitosDeOrigem(actor).length) continue;
    planos.push({ actor, origem, tira, zera });
  }
  return planos;
}

/** Aplica a migração num ator (snapshot para "Desfazer", tira a fonte origem, cria o +2, marca). */
export async function migrarAtorDeOrigem({ actor, origem }) {
  await actor.setFlag(F, "snapshotTrocaOrigem", { ...fotoDaOrigem(actor), migracao: true });
  const src = actor._source.system;
  const plano = semFonteOrigem(actor.flags?.[F]?.treinoPor ?? {}, Object.fromEntries(PERICIAS.map(p => [p.chave, src.pericias[p.chave].treino])));
  const mudancas = { [`flags.${F}.-=treinoPor`]: null };
  for (const [k, v] of Object.entries(plano.treinos)) mudancas[`system.pericias.${k}.treino`] = v;
  await actor.update(mudancas);
  await actor.update({ [`flags.${F}.treinoPor`]: plano.treinoPor, [`flags.${F}.migracaoOrigemBonus`]: true });
  if (!efeitosDeOrigem(actor).length) {
    const img = actor.items.find(ehPoderDeOrigemAuto)?.img ?? ICONE_PADRAO;
    await actor.createEmbeddedDocuments("ActiveEffect", [efeitoDeOrigem(origem, { img })]);
  }
}

/**
 * Migração com confirmação (lista o que muda em cada ficha). Rodar de novo não muda nada.
 * Uso manual (Mestre): await game.icarus.migrarBonusDeOrigem()
 * @returns {Promise<number|false>} atores migrados, ou false se o Mestre recusou
 */
export async function migrarBonusDeOrigem(atores = game.actors) {
  const planos = planoDaMigracaoDeOrigem([...atores]);
  if (!planos.length) return 0;
  const linha = p => {
    const zera = p.zera.map(nomePericia), fica = p.tira.filter(k => !p.zera.includes(k)).map(nomePericia);
    return `<li><b>${esc(p.actor.name)}</b> (${esc(p.origem.nome)}): ${esc(fmt("ICARUS.Origens.MigrarBonus", { valor: p.origem.periciaBonus ?? 2, pericia: nomePericia(p.origem.pericia) }))}`
      + (zera.length ? ` · ${esc(fmt("ICARUS.Origens.MigrarZera", { pericias: zera.join(", ") }))}` : "")
      + (fica.length ? ` · ${esc(fmt("ICARUS.Origens.MigrarFica", { pericias: fica.join(", ") }))}` : "") + "</li>";
  };
  const ok = await DialogV2.confirm({
    window: { title: loc("ICARUS.Origens.MigrarTitulo") },
    content: `<div class="icarus-uso"><p>${esc(loc("ICARUS.Origens.MigrarTexto"))}</p><ul class="lista-reset">${planos.map(linha).join("")}</ul>
      <p class="dica">${esc(loc("ICARUS.Origens.MigrarDica"))}</p></div>`,
    rejectClose: false
  });
  if (!ok) {
    ui.notifications.info(loc("ICARUS.Origens.MigrarDepois"));
    return false;
  }
  for (const p of planos) await migrarAtorDeOrigem(p);
  ui.notifications.info(fmt("ICARUS.Origens.Migrados", { n: planos.length }));
  return planos.length;
}
