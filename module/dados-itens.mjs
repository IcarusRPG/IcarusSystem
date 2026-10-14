/**
 * Converte as entradas de tools/dados/armas.json em dados de Item do Foundry.
 * Sem dependência do Foundry: usado pelo build dos compêndios (Node), pela macro de
 * popular compêndios (plano B, dentro do Foundry) e pelos testes.
 */
import { SISTEMA_ID, ICONE_PADRAO, PASTA_ICONES_ARMAS, PASTA_ICONES_MUNICOES, TAMANHO_PACOTE } from "./config.mjs";

const ALFABETO = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Hash FNV-1a de 32 bits com mistura final (fmix32), para espalhar bem os bits. */
function hash32(texto) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * _id do Foundry (16 caracteres) estável e determinístico a partir de um texto:
 * o mesmo "arma:adaga" gera sempre o mesmo _id, então repovoar não duplica.
 */
export function idEstavel(texto) {
  let id = "";
  for (let i = 0; i < 16; i++) id += ALFABETO[hash32(`${i}:${texto}`) % ALFABETO.length];
  return id;
}

/** Caminho do ícone (codificado: há espaços, acentos, ç e õ); sem arquivo = dado azul. */
export function iconeDaArma(arma) {
  return arma.icone ? encodeURI(`${PASTA_ICONES_ARMAS}/${arma.icone}`) : ICONE_PADRAO;
}
export function iconeDaMunicao(municao) {
  return municao.icone ? encodeURI(`${PASTA_ICONES_MUNICOES}/${municao.icone}`) : ICONE_PADRAO;
}

/** Pasta do compêndio de armas (uma por categoria). */
export function dadosDaPasta(pasta, sort = 0) {
  return {
    _id: idEstavel(`pasta:${pasta.id}`),
    name: pasta.nome,
    type: "Item",
    folder: null,
    sorting: "a",
    sort,
    color: null,
    flags: { [SISTEMA_ID]: { id: pasta.id } }
  };
}

/** Item "arma" do compêndio. Armas de fogo começam carregadas. */
export function dadosDaArma(arma, sort = 0) {
  const fogo = arma.grupo === "fogo";
  const capacidade = fogo ? ((arma.propriedades ?? []).includes("cano-duplo") ? 2 : 1) : 0;
  return {
    _id: idEstavel(`arma:${arma.id}`),
    name: arma.nome,
    type: "arma",
    img: iconeDaArma(arma),
    folder: idEstavel(`pasta:${arma.categoria}`),
    sort,
    system: {
      categoria: arma.categoria,
      grupo: arma.grupo,
      empunhadura: arma.empunhadura,
      dano: arma.dano,
      danoExtra: arma.danoExtra ?? "",
      criticoMargem: arma.criticoMargem,
      criticoMult: arma.criticoMult,
      alcance: arma.alcance,
      alcanceArremesso: arma.alcanceArremesso ?? "",
      tiposDano: [...arma.tiposDano],
      propriedades: [...arma.propriedades],
      municaoTipo: arma.municaoTipo ?? "",
      capacidadeDisparos: capacidade,
      carregados: capacidade,
      preco: arma.preco,
      espacos: arma.espacos,
      quantidade: 1,
      empunhada: false,
      proficiencia: "auto",
      bonusAtaque: 0,
      bonusDano: 0,
      municaoUsada: "auto",
      // Descrições ficam vazias por enquanto; a ficha do item mostra as propriedades traduzidas
      descricao: ""
    },
    effects: [],
    flags: { [SISTEMA_ID]: { id: arma.id } }
  };
}

/** Item "municao" do compêndio: um pacote de 20 unidades. */
export function dadosDaMunicao(municao, sort = 0) {
  return {
    _id: idEstavel(`municao:${municao.id}`),
    name: municao.nome,
    type: "municao",
    img: iconeDaMunicao(municao),
    folder: null,
    sort,
    system: { tipo: municao.tipo, quantidade: TAMANHO_PACOTE, precoPacote: municao.precoPacote, descricao: "" },
    effects: [],
    flags: { [SISTEMA_ID]: { id: municao.id } }
  };
}

/** Todos os documentos dos dois compêndios, a partir do JSON de dados. */
export function documentosDosCompendios(dados) {
  return {
    armas: {
      pastas: dados.pastas.map((p, i) => dadosDaPasta(p, (i + 1) * 100000)),
      itens: dados.armas.map((a, i) => dadosDaArma(a, (i + 1) * 100))
    },
    municoes: {
      pastas: [],
      itens: dados.municoes.map((m, i) => dadosDaMunicao(m, (i + 1) * 100))
    }
  };
}
