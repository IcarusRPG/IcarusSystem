/**
 * Origens, Poderes de Origem e Itens Comuns: dados e regras puras (sem Foundry; os testes usam).
 * Fonte: tools/dados/origens.json (Anexo A) e tools/dados/itens-comuns.json (Anexo B), via
 * module/dados/*.mjs. A automação no Foundry fica em module/origens.mjs.
 *
 * Regras:
 * - Origem: 1 perícia Treinada (nunca especialista), 1 Poder de Origem e 2 itens comuns grátis.
 * - Bônus de item: os incondicionais somam no total da perícia quando o item está ativo (vestido e
 *   dentro do limite, ou "vale enquanto possui"); os condicionais aparecem como caixas na rolagem.
 *   Itens diferentes somam; o mesmo item nunca soma consigo mesmo (pelo id do compêndio).
 * - Limite de Vestimentas: 5 peças vestidas valem (itens comuns vestidos, armaduras e túnicas
 *   equipadas; escudo não conta). As que passarem do limite (as últimas vestidas) não valem nada.
 */
import { SISTEMA_ID, ICONE_PADRAO, PERICIAS } from "./config.mjs";
import ORIGENS_JSON from "./dados/origens.mjs";
import ITENS_JSON from "./dados/itens-comuns.mjs";

export const ORIGENS = [...ORIGENS_JSON.origens].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
export const ITENS_COMUNS = ITENS_JSON.itens;
export const LIMITE_VESTIMENTAS = ITENS_JSON.limiteVestimentas ?? 5;
export const CATEGORIAS_ITEM_COMUM = ["viagem", "traje", "ferramenta", "cura", "escrita", "insignia"];
/** "Bônus" fora das perícias: testes de ataque desarmado. */
export const ATAQUE_DESARMADO = "ataqueDesarmado";

const normalizar = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
/** Nome de arquivo/poder normalizado para casar ícones: minúsculas, sem acento, sem pontuação. */
export const chaveDeNome = s => normalizar(s).replace(/[^a-z0-9]+/g, " ").trim();

export const origemPorId = id => ORIGENS.find(o => o.id === id) ?? null;
export const itemComumPorId = id => ITENS_COMUNS.find(i => i.id === id) ?? null;
export const idDaOrigemPorNome = nome => ORIGENS.find(o => normalizar(o.nome) === normalizar(nome))?.id ?? null;
const nomePericia = k => PERICIAS.find(p => p.chave === k)?.nome ?? k;

/** Os 2 itens que a origem concede: fixos + 1 de cada grupo de escolha (escolhas = índices). */
export function itensDaOrigem(origem, escolhas = []) {
  return [...origem.itens.fixos, ...origem.itens.escolhas.map((g, i) => g[escolhas[i] ?? 0] ?? g[0])];
}

/** O item pede escolha de bônus (+1 em A ou B)? Devolve as opções ou null. */
export const opcoesDeBonus = item => item?.bonus?.find(b => Array.isArray(b.escolha) && b.escolha.length)?.escolha ?? null;

/* ------------------------------ Documentos ------------------------------ */

/** Nome com o texto livre ("Instrumento musical (alaúde)"). */
export const nomeComTexto = (nome, texto) => (String(texto ?? "").trim() ? `${nome} (${String(texto).trim()})` : nome);

/**
 * Item comum como item "equipamento" (tipo item-comum).
 * @param {object} item  entrada de itens-comuns.json
 * @param {{ img?, origemItem?, escolhaBonus?, escolhaTexto?, _id? }} [op]
 */
export function dadosDoItemComum(item, { img = ICONE_PADRAO, origemItem = false, escolhaBonus = null, escolhaTexto = "", _id } = {}) {
  const usos = Number(item.usos) || 0;
  return {
    ...(_id ? { _id } : {}),
    name: nomeComTexto(item.nome, escolhaTexto),
    type: "equipamento",
    img,
    system: {
      tipo: "item-comum",
      categoriaItem: item.categoria,
      quantidade: 1,
      preco: item.preco ?? 0,
      precoVenda: item.precoVenda ?? null,
      semVenda: !!item.semVenda,
      espacos: item.espacos ?? 1,
      vestimenta: !!item.vestimenta,
      vestido: false,
      bonus: structuredClone(item.bonus ?? []),
      valeEnquantoPossui: !!item.valeEnquantoPossui,
      usos: { max: usos, atual: usos },
      origemItem,
      descricao: item.descricao
    },
    flags: { [SISTEMA_ID]: {
      id: item.id,
      ...(escolhaBonus ? { escolhaBonus } : {}),
      ...(item.escolhaTexto ? { escolhaTexto: String(escolhaTexto ?? "").trim() } : {})
    } }
  };
}

/** Poder de Origem como item "poder" (automático, removido ao trocar de origem). */
export function dadosDoPoderDeOrigem(origem, { img = ICONE_PADRAO, _id } = {}) {
  const p = origem.poder;
  return {
    ...(_id ? { _id } : {}),
    name: p.nome,
    type: "poder",
    img,
    system: { fonte: "origem", grupo: "Origem", custoPM: p.custoPM ?? null, acao: p.acao ?? "", descricao: `<p>${p.descricao}</p>` },
    flags: { [SISTEMA_ID]: { auto: true, origemId: origem.id, poderId: p.id, usoLimitado: p.usoLimitado ?? null, cdAtributo: p.cdAtributo ?? null } }
  };
}

/**
 * Assinatura do item concedido pela origem (nome, preço, espaços, bônus e escolha): se o jogador
 * mudar algum desses campos, o item conta como editado e fica na troca de origem.
 */
export function assinaturaDoItem(item) {
  const s = item.system ?? {};
  return JSON.stringify([item.name, s.preco ?? 0, s.espacos ?? 1, s.bonus ?? [], item.flags?.[SISTEMA_ID]?.escolhaBonus ?? null]);
}

/* ------------------------------ Vestimentas ------------------------------ */

/** Conta no limite de vestimentas? Itens comuns vestíveis, armaduras e túnicas (escudo não). */
export function ehVestimenta(item) {
  if (item?.type !== "equipamento") return false;
  const s = item.system ?? {};
  if (s.tipo === "item-comum") return !!s.vestimenta;
  return s.tipo === "armadura" || s.categoria === "tunica";
}

/** Vestido agora? Item comum: "vestido"; armadura/túnica: "equipado". */
export const estaVestido = item => ehVestimenta(item) && !!(item.system.tipo === "item-comum" ? item.system.vestido : item.system.equipado);

/**
 * Quais vestimentas valem: as primeiras `limite` vestidas (pela ordem em que foram vestidas,
 * flags.vestidoEm; sem registro = antes de todas).
 * @returns {{ ativas: Set<string>, vestidas: number, fora: string[], limite: number }}
 */
export function vestimentasAtivas(itens = [], limite = LIMITE_VESTIMENTAS) {
  const vestidas = itens.filter(estaVestido)
    .map((i, n) => ({ id: i.id ?? i._id, em: Number(i.flags?.[SISTEMA_ID]?.vestidoEm) || 0, n }))
    .sort((a, b) => a.em - b.em || a.n - b.n);
  return { ativas: new Set(vestidas.slice(0, limite).map(v => v.id)), vestidas: vestidas.length, fora: vestidas.slice(limite).map(v => v.id), limite };
}

/** O item comum está "em uso"? Vestimenta: vestida e dentro do limite; o resto: no inventário. */
export function itemComumAtivo(item, ativas) {
  if (item?.type !== "equipamento" || item.system?.tipo !== "item-comum") return false;
  if (Number(item.system.quantidade ?? 1) <= 0) return false;
  return item.system.vestimenta ? ativas.has(item.id ?? item._id) : true;
}

/** Perícia de um bônus: a fixa ou a escolhida ao pegar o item (flags.escolhaBonus). */
const periciaDoBonus = (item, b) => b.pericia ?? (b.escolha?.length ? item.flags?.[SISTEMA_ID]?.escolhaBonus ?? null : null);
const chaveDoItem = item => item.flags?.[SISTEMA_ID]?.id ?? item.name;

/**
 * Bônus incondicionais dos itens ativos, por perícia (e ataqueDesarmado, que sempre é automático
 * nos ataques desarmados). O mesmo item (id do compêndio) conta uma vez por perícia.
 * @returns {Record<string, {valor:number, origem:string}[]>}
 */
export function bonusDeItens(itens = [], ativas = vestimentasAtivas(itens).ativas) {
  const por = {};
  const vistos = new Set();
  for (const item of itens) {
    if (!itemComumAtivo(item, ativas)) continue;
    for (const b of item.system.bonus ?? []) {
      const pericia = periciaDoBonus(item, b);
      if (!pericia || b.penalidadeSemItem) continue;
      if (b.condicao && pericia !== ATAQUE_DESARMADO) continue;
      const chave = `${chaveDoItem(item)}|${pericia}`;
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      (por[pericia] ??= []).push({ valor: Number(b.valor) || 0, origem: item.name });
    }
  }
  return por;
}

/**
 * Bônus condicionais aplicáveis a uma perícia (itens ativos), para as caixas da rolagem.
 * @returns {{ id: string, valor: number, condicao: string, origem: string }[]}
 */
export function condicionaisDaPericia(itens = [], chave, ativas = vestimentasAtivas(itens).ativas) {
  const lista = [];
  const vistos = new Set();
  for (const item of itens) {
    if (!itemComumAtivo(item, ativas)) continue;
    (item.system.bonus ?? []).forEach((b, n) => {
      if (!b.condicao || b.penalidadeSemItem || periciaDoBonus(item, b) !== chave || chave === ATAQUE_DESARMADO) return;
      const k = `${chaveDoItem(item)}|${n}`;
      if (vistos.has(k)) return;
      vistos.add(k);
      lista.push({ id: `${item.id ?? item._id}:${n}`, valor: Number(b.valor) || 0, condicao: b.condicao, origem: item.name });
    });
  }
  return lista;
}

/** Tem gazuas (item no inventário, quantidade > 0)? */
export const temGazuas = (itens = []) => itens.some(i => i.type === "equipamento" && i.flags?.[SISTEMA_ID]?.id === "gazuas" && Number(i.system?.quantidade ?? 1) > 0);
export const PENALIDADE_SEM_GAZUAS = -(Math.abs(ITENS_COMUNS.find(i => i.id === "gazuas")?.bonus?.find(b => b.penalidadeSemItem)?.valor ?? 5));

/**
 * Teste de Prestidigitação para abrir fechadura: −5 sem gazuas; com gazuas e 1 natural, elas quebram.
 * @returns {{ modificador: number, quebra: boolean }}
 */
export function resultadoDaFechadura({ abrir, gazuas, natural }) {
  if (!abrir) return { modificador: 0, quebra: false };
  return { modificador: gazuas ? 0 : PENALIDADE_SEM_GAZUAS, quebra: !!gazuas && natural === 1 };
}

/* ------------------------------ Perícia da origem e treinoPor ------------------------------ */

/**
 * Perícia que a origem treina: a da origem, ou outra (escolhida) se o personagem já for treinado.
 * @param {Record<string, number>} treinos  treino efetivo (derivado) por perícia
 * @returns {{ pericia: string|null, precisaEscolher: boolean, opcoes: string[] }}
 */
export function periciaDaOrigem(origem, treinos, escolhida = null) {
  const livres = PERICIAS.map(p => p.chave).filter(k => !(treinos[k] >= 1));
  if (!(treinos[origem.pericia] >= 1)) return { pericia: origem.pericia, precisaEscolher: false, opcoes: livres };
  return { pericia: escolhida && livres.includes(escolhida) ? escolhida : null, precisaEscolher: true, opcoes: livres };
}

/**
 * Tira a fonte "origem" do treinoPor. A perícia volta a não treinada (salvo 0) só se não sobrar
 * outra fonte; a raça treina por efeito, então o salvo vai a 0 mesmo com "raca".
 * @returns {{ treinos: Record<string, number>, treinoPor: Record<string, string[]> }}
 */
export function semFonteOrigem(treinoPor = {}, treinosSalvos = {}) {
  const novo = {};
  const treinos = {};
  for (const [k, fontes] of Object.entries(treinoPor ?? {})) {
    if (!fontes.includes("origem")) { novo[k] = fontes; continue; }
    const resto = fontes.filter(f => f !== "origem");
    if (resto.length) novo[k] = resto;
    if (!resto.some(f => f !== "raca") && treinosSalvos[k] >= 1) treinos[k] = 0;
  }
  return { treinos, treinoPor: novo };
}

/* ------------------------------ Compêndios ------------------------------ */

/**
 * Documentos dos compêndios Origens, Poderes de Origem e Itens Comuns (_id estável).
 * Ícones: dados.imagens = { "<chaveDeNome>": url } (do build: arquivos de img/Icones/poderes e
 * habilidades/ e img/Icones/origens/); sem correspondência exata, o ícone padrão.
 * @param {(chave: string) => string} idEstavel
 */
export function documentosDeOrigens({ origens = ORIGENS_JSON, itens = ITENS_JSON, imagens = {} } = {}, idEstavel) {
  const img = nome => imagens[chaveDeNome(nome)] ?? ICONE_PADRAO;
  const pastaOrigens = { _id: idEstavel("pasta:origens"), name: "Origens", type: "Item", folder: null, sorting: "a", sort: 0, color: null };
  const pastasItens = CATEGORIAS_ITEM_COMUM.map((c, i) => ({
    _id: idEstavel(`pasta:itens-comuns:${c}`), name: NOMES_CATEGORIA[c], type: "Item", folder: null, sorting: "a", sort: (i + 1) * 100, color: null
  }));
  const pastaDe = c => pastasItens[CATEGORIAS_ITEM_COMUM.indexOf(c)]?._id ?? null;
  const ordenadas = [...origens.origens].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  return {
    origens: {
      pastas: [pastaOrigens],
      itens: ordenadas.map((o, i) => ({
        _id: idEstavel(`origem:${o.id}`), name: o.nome, type: "origem", img: imagens[`origem:${chaveDeNome(o.nome)}`] ?? img(o.nome),
        folder: pastaOrigens._id, sort: (i + 1) * 100,
        system: { origemId: o.id, pericia: o.pericia, texto: o.texto, itens: structuredClone(o.itens), poderId: o.poder.id },
        flags: { [SISTEMA_ID]: { id: o.id } }
      }))
    },
    "poderes-origem": {
      pastas: [],
      itens: ordenadas.map((o, i) => ({ ...dadosDoPoderDeOrigem(o, { img: img(o.poder.nome), _id: idEstavel(`poder-origem:${o.id}`) }), folder: null, sort: (i + 1) * 100 }))
    },
    "itens-comuns": {
      pastas: pastasItens,
      itens: itens.itens.map((it, i) => ({ ...dadosDoItemComum(it, { img: img(it.nome), _id: idEstavel(`item-comum:${it.id}`) }), folder: pastaDe(it.categoria), sort: (i + 1) * 100 }))
    }
  };
}

export const NOMES_CATEGORIA = { viagem: "Viagem", traje: "Trajes", ferramenta: "Ferramentas", cura: "Cura", escrita: "Escrita", insignia: "Insígnias" };

/** Texto do bônus para listas e cards ("+1 Diplomacia", "+5 Visão ao observar…"). */
export function textoDoBonus(b, escolhida = null) {
  const alvo = b.pericia ?? escolhida;
  const nome = alvo === ATAQUE_DESARMADO ? "ataque desarmado" : alvo ? nomePericia(alvo) : (b.escolha ?? []).map(k => (k === ATAQUE_DESARMADO ? "ataque desarmado" : nomePericia(k))).join(" ou ");
  return `${b.valor > 0 ? "+" : ""}${b.valor} ${nome}${b.condicao ? ` (${b.condicao})` : ""}`;
}
