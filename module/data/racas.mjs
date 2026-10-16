/**
 * As 17 raças do Icarus RPG (documento-núcleo, seção 13) e a lógica pura de escolhas.
 * Este arquivo não usa nada do Foundry: os testes em tests/ o importam no Node.
 *
 * Como adicionar ou editar uma raça: veja o README ("Raças").
 *
 * Formato de cada raça:
 *   id, nome, significado, icone (arquivo em img/Icones/raças/)
 *   atributos   modificadores raciais fixos, ex.: { FOR: 1, CON: 1 }
 *   escolhas    lista de escolhas do jogador (diálogo de escolhas):
 *               { tipo: "atributosLivres", distribuicao: [1, 1, 1] }      atributos diferentes
 *               { tipo: "variante", rotulo, opcoes: [{ id, rotulo }] }     define poderes com "variante"
 *               { tipo: "periciaEspecialista" | "periciaTreinada", poder, permitidas: "todas" | [chaves] }
 *               { tipo: "texto", poder, rotulo }                           acrescentado à descrição
 *   poderes     { nome, custoPM?, descricao, efeitos?, variante? }
 *               efeitos: { chave, modo: "ADD" | "OVERRIDE" | "UPGRADE", valor }
 *                     ou { dinamico: "periciaEspecialista" | "periciaTreinada" } (vem da escolha)
 */
import { SISTEMA_ID, ICONE_PADRAO, ATRIBUTOS, PERICIAS } from "../config.mjs";

export const PASTA_ICONES_RACAS = `systems/${SISTEMA_ID}/img/Icones/raças`;

const add = (chave, valor) => ({ chave, modo: "ADD", valor });
const override = (chave, valor) => ({ chave, modo: "OVERRIDE", valor });
const upgrade = (chave, valor) => ({ chave, modo: "UPGRADE", valor });
const outros = pericia => `system.pericias.${pericia}.outros`;

export const RACAS = [
  {
    id: "arake", nome: "Araké", significado: "Os Filhos da Terra", icone: "Araké.png",
    atributos: {},
    escolhas: [
      { tipo: "atributosLivres", distribuicao: [1, 1, 1] },
      { tipo: "periciaEspecialista", poder: "Aprendizado Plural", permitidas: "todas" }
    ],
    poderes: [
      { nome: "Aprendizado Plural", descricao: "Escolhe uma perícia à sua escolha para se tornar Especialista nela.",
        efeitos: [{ dinamico: "periciaEspecialista" }] },
      { nome: "Improviso", custoPM: 2, descricao: "Ao fazer um teste de perícia na qual não é treinado, pode gastar 2 PM para realizar o teste como se fosse Treinado." }
    ]
  },
  {
    id: "dorun", nome: "Dorun", significado: "Os Guardiões da Pedra", icone: "Dorun.png",
    atributos: { FOR: 1, CON: 1, SAB: 1 },
    poderes: [
      { nome: "Sangue de Aço", descricao: "+1 PV por nível. +2 em Fortitude.",
        efeitos: [add("system.classeConfig.bonusPvPorNivel", 1), add(outros("fortitude"), 2)] },
      { nome: "Tradição da Forja", descricao: "Proficiência com picaretas, martelos e marretas. +2 em testes de ataque e +2 nas rolagens de dano com essas armas." },
      { nome: "Passo da Montanha", descricao: "Deslocamento 6m (em vez de 9m).",
        efeitos: [override("system.deslocamento", 6)] }
    ]
  },
  {
    id: "karadun", nome: "Karadun", significado: "Os Forjados pela Escuridão", icone: "Karadun.png",
    atributos: {},
    escolhas: [
      { tipo: "atributosLivres", distribuicao: [2, 1, -1] },
      { tipo: "periciaTreinada", poder: "Adaptabilidade", permitidas: "todas" }
    ],
    poderes: [
      { nome: "Corpo Farpado", custoPM: 1, descricao: "+1 na Defesa. Arma natural de chifres (dano 1d6, crítico x2, perfuração). 1x/rodada, ao atacar com outra arma na ação Agredir, pode gastar 1 PM para um ataque corpo a corpo extra com os chifres.",
        efeitos: [add("system.defesa.outros", 1)] },
      { nome: "Afinidade Misteriosa", descricao: "+1 PM a cada nível ímpar (1º, 3º, 5º etc.). Treinado na perícia Misticismo.",
        efeitos: [add("system.classeConfig.bonusPmNivelImpar", 1), upgrade("system.pericias.misticismo.treino", 1)] },
      { nome: "Adaptabilidade", descricao: "Treinado em 1 perícia à escolha (não precisa ser da classe). +2 em Diplomacia.",
        efeitos: [{ dinamico: "periciaTreinada" }, add(outros("diplomacia"), 2)] }
    ]
  },
  {
    id: "ayoran", nome: "Ayoran", significado: "Os Primevos", icone: "Ayoran.png",
    atributos: { DES: 1, INT: 1, CAR: 1 },
    poderes: [
      { nome: "Sangue dos Primevos", descricao: "+1 PM no 1º nível e +1 PM por nível seguinte.",
        efeitos: [add("system.classeConfig.bonusPmPorNivel", 1)] },
      { nome: "Coreografia Ancestral", descricao: "Deslocamento 12m (em vez de 9m).",
        efeitos: [override("system.deslocamento", 12)] },
      { nome: "Precisão Elegante", descricao: "Proficiência com arcos (curto e longo), cimitarras e floretes. +2 em testes de ataque e +2 nas rolagens de dano com essas armas." }
    ]
  },
  {
    id: "ayomi", nome: "Ayomi", significado: "Os que Permaneceram", icone: "Ayomi.png",
    atributos: { DES: 1, INT: 1, CAR: 1 },
    escolhas: [
      { tipo: "periciaTreinada", poder: "Herança Adaptável", permitidas: "todas" },
      { tipo: "texto", poder: "Técnica Dissidente", rotulo: "Arma simples e arma marcial escolhidas" }
    ],
    poderes: [
      { nome: "Herança Adaptável", descricao: "Visão na penumbra. Treinado em 1 perícia à escolha.",
        efeitos: [{ dinamico: "periciaTreinada" }] },
      { nome: "Marcas do Trabalho Duro", descricao: "+2 em Fortitude e Atletismo.",
        efeitos: [add(outros("fortitude"), 2), add(outros("atletismo"), 2)] },
      { nome: "Técnica Dissidente", descricao: "Escolhe uma arma simples e uma marcial; recebe proficiência com ambas e +2 nas rolagens de dano ao empunhá-las." }
    ]
  },
  {
    id: "ogbari", nome: "Ogbari", significado: "Os Filhos da Guerra", icone: "Ogbari.png",
    atributos: { FOR: 1, DES: 1, CON: 1 },
    poderes: [
      { nome: "Cortar! Cortar!", descricao: "Machados, martelos, marretas e espada longa contam como armas simples para você. +2 em ataques com essas armas." },
      { nome: "Forte", descricao: "+1 PV por nível. +2 em Fortitude.",
        efeitos: [add("system.classeConfig.bonusPvPorNivel", 1), add(outros("fortitude"), 2)] },
      { nome: "Presas e Músculos", descricao: "+2 em Intimidação, podendo usar Força como atributo-chave para essa perícia.",
        efeitos: [add(outros("intimidacao"), 2), override("system.pericias.intimidacao.atributo", "FOR")] }
    ]
  },
  {
    id: "harukan", nome: "Harukan", significado: "Os de Coração Indomável", icone: "Harukan.png",
    atributos: { FOR: 1, DES: 1, CAR: 1 },
    escolhas: [
      { tipo: "texto", poder: "Treino Misturado", rotulo: "Arma simples e arma marcial escolhidas" }
    ],
    poderes: [
      { nome: "Duas Línguas, Um Só Olhar", descricao: "+1 em Enganação, Diplomacia e Intimidação.",
        efeitos: [add(outros("enganacao"), 1), add(outros("diplomacia"), 1), add(outros("intimidacao"), 1)] },
      { nome: "Instinto de Sobrevivência", descricao: "1x/cena, ao cair a 0 PV, faz teste de Fortitude CD 20; se passar, fica com 1 PV em vez de cair." },
      { nome: "Intuição de Guerreiro", descricao: "+2 em Iniciativa. 1x/cena, age normalmente no primeiro turno mesmo se for surpreendido.",
        efeitos: [add(outros("iniciativa"), 2)] },
      { nome: "Treino Misturado", descricao: "Escolhe uma arma simples e uma marcial; recebe proficiência com ambas." }
    ]
  },
  {
    id: "karuun", nome: "Ka'Ruun", significado: "Os Filhos dos Dragões", icone: "Ka'Ruun.png",
    atributos: { CON: 2, FOR: 1, INT: -1 },
    poderes: [
      { nome: "Escamas Espessas", descricao: "+1 na Defesa. Vantagem em testes para resistir a condições climáticas adversas.",
        efeitos: [add("system.defesa.outros", 1)] },
      { nome: "Mordida", custoPM: 1, descricao: "Arma natural (dano 1d6, crítico x2, perfuração). 1x/rodada, ao atacar com outra arma na ação Agredir, pode gastar 1 PM para um ataque extra de mordida." },
      { nome: "Sopro Elemental", custoPM: 2, descricao: "O elemento é definido pela cor das escamas (Azul: elétrico · Negra: ácido · Branca: gelo · Verde: veneno · Vermelha: fogo). Gastando 1 ação de movimento + 2 PM, sopra um cone curto: criaturas na área sofrem 2d6 de dano do elemento (teste de resistência reduz à metade). Pode gastar +1 PM para +1d6 de dano, até um limite baseado no nível." }
    ]
  },
  {
    id: "imbari", nome: "Imbari", significado: "Os Guardiões do Conhecimento", icone: "Imbari.png",
    atributos: { DES: 1, CON: 1, INT: 1 },
    poderes: [
      // O núcleo dizia "Percepção"; adaptado para Visão porque não existe mais Percepção
      { nome: "Visor de Kiske", custoPM: 1, descricao: "Visão no escuro. 1x/cena, pode gastar 1 PM para rolar um teste de Visão contra inimigos escondidos/furtivos como Especialista (+4)." },
      { nome: "Encaixe Incandescente", descricao: "Gasta uma ação completa para ativar um mecanismo em uma arma empunhada; até o fim da cena, ela causa +1d8 de dano de fogo." },
      { nome: "Pólvora de Escape", custoPM: 2, descricao: "1x/cena, ao sofrer um ataque corpo a corpo, pode gastar 2 PM como reação para o atacante rolar com desvantagem. Se o atacante errar, você recua 3m e deixa uma cortina de fumaça no local anterior." }
    ]
  },
  {
    id: "kirai", nome: "Kirai", significado: "Os Peregrinos", icone: "Kirai.png",
    atributos: { DES: 1, INT: 1, SAB: 1 },
    escolhas: [
      { tipo: "periciaEspecialista", poder: "Passos Miúdos", permitidas: ["furtividade", "acrobacia"] }
    ],
    poderes: [
      { nome: "Passos Miúdos", descricao: "Escolhe Furtividade ou Acrobacia para se tornar Especialista (+4).",
        efeitos: [{ dinamico: "periciaEspecialista" }] },
      { nome: "A Sorte Sorri para Quem Sorri", custoPM: 1, descricao: "1x/cena, num teste de perícia (exceto ataque), pode gastar 1 PM para ignorar a CD e rolar 1d4 em vez do teste normal: 1 = falha crítica, 2 = falha, 3 = sucesso, 4 = sucesso crítico." },
      { nome: "Vivência Peregrina", descricao: "Recebe 1 Poder Geral à escolha. Alternativamente, se tiver uma Profissão, pode escolher 1 Poder de Profissão extra em vez do Poder Geral." }
    ]
  },
  {
    id: "talokan", nome: "Talokan", significado: "Os Moldados", icone: "Talokan.png",
    atributos: { FOR: 1, CON: 1, SAB: 1 },
    poderes: [
      { nome: "Pancada Sísmica", custoPM: 2, descricao: "Ação padrão + 2 PM: golpeia o chão. Criaturas adjacentes fazem teste de Fortitude (CD baseada em Força); se falharem, caem (condição caído)." },
      { nome: "Acessório Integrado", descricao: "Pode fundir uma arma corpo a corpo ou escudo ao chassi: imune à manobra \"Desarmar\" com esse equipamento, pode sacá-lo/guardá-lo como ação livre, e recebe +2 em testes de manobra realizados com ele." },
      { nome: "Punhos Demolidores", descricao: "Ataques desarmados causam 1d8 de dano de impacto, crítico x2, margem de ameaça 18." }
    ]
  },
  {
    id: "koruma", nome: "Koruma", significado: "Os Senhores dos Labirintos", icone: "Koruma.png",
    atributos: { FOR: 1, DES: 1, CAR: 1 },
    poderes: [
      { nome: "Couro Brutal", descricao: "+1 na Defesa. +2 em Fortitude.",
        efeitos: [add("system.defesa.outros", 1), add(outros("fortitude"), 2)] },
      { nome: "Enterre-me de Pé", custoPM: 2, descricao: "Ao sofrer um efeito/golpe que o deixaria caído, pode gastar 2 PM como reação para ignorar o efeito e permanecer de pé." },
      { nome: "Chifres de Dannan", custoPM: 1, descricao: "Arma natural de chifres (dano 1d6, crítico x2, perfuração). 1x/rodada, ao atacar com outra arma na ação Agredir, pode gastar 1 PM para um ataque corpo a corpo extra com os chifres." },
      { nome: "Avanço do Touro", descricao: "Deslocamento 12m (em vez de 9m).",
        efeitos: [override("system.deslocamento", 12)] }
    ]
  },
  {
    id: "ikori", nome: "Ikori", significado: "Os Astutos", icone: "Ikori.png",
    atributos: { DES: 1, INT: 1, CAR: 1 },
    escolhas: [
      { tipo: "variante", rotulo: "Dimorfismo Fisiológico", opcoes: [{ id: "femea", rotulo: "Fêmea" }, { id: "macho", rotulo: "Macho" }] },
      { tipo: "texto", poder: "Astúcia Arcana", rotulo: "Magia de 1º círculo (Transmutação ou Ilusão)" }
    ],
    poderes: [
      { nome: "Empatia Lendária", custoPM: 1, descricao: "+2 em Diplomacia e Intuição. Pode gastar 1 PM antes de um teste de Diplomacia ou Intuição para rolá-lo diretamente como Especialista (+4).",
        efeitos: [add(outros("diplomacia"), 2), add(outros("intuicao"), 2)] },
      { nome: "Liderança Imponente (Fêmea)", variante: "femea", descricao: "Dimorfismo Fisiológico — Fêmea: +2 em Atletismo e Fortitude; ataques desarmados causam 1d6 de dano de impacto.",
        efeitos: [add(outros("atletismo"), 2), add(outros("fortitude"), 2)] },
      { nome: "Peste Ágil (Macho)", variante: "macho", descricao: "Dimorfismo Fisiológico — Macho: Tamanho Pequeno (+2 Furtividade, -2 em testes de manobra, deslocamento permanece 9m); +2 em Reflexos.",
        efeitos: [override("system.tamanho", "pequeno"), add(outros("furtividade"), 2), add(outros("reflexos"), 2)] },
      { nome: "Bagagem do Mundo", descricao: "Recebe 1 Poder Geral à escolha." },
      { nome: "Astúcia Arcana", descricao: "Aprende e pode lançar uma magia de 1º círculo de Transmutação ou Ilusão à escolha (atributo-chave Inteligência ou Carisma). (depende do sistema de magias, a fechar depois)" }
    ]
  },
  {
    id: "nyashi", nome: "Nyashi", significado: "Os Caçadores da Lua", icone: "Nyashi.png",
    atributos: { DES: 2, SAB: 1, CAR: -1 },
    poderes: [
      { nome: "Ataque Duplo", descricao: "Na ação Agredir, pode fazer dois ataques (um com cada garra), sofrendo -2 em todos os testes de ataque até o próximo turno. Se possuir Ambidestria ou Estilo de Duas Armas, não sofre essa penalidade." },
      { nome: "Corrida Instintiva", descricao: "Deslocamento 12m (em vez de 9m).",
        efeitos: [override("system.deslocamento", 12)] },
      { nome: "Garras", custoPM: 3, descricao: "Arma natural, dano 2d4. Pode gastar uma ação de movimento + 3 PM para aumentar o dano das garras em dois passos." }
    ]
  },
  {
    id: "azakar", nome: "Azakar", significado: "Os Marcados pelo Abismo", icone: "Azakar.png",
    atributos: { CAR: 2, INT: 1, CON: -1 },
    escolhas: [
      { tipo: "variante", rotulo: "Linhagem", opcoes: [{ id: "luz", rotulo: "Luz" }, { id: "sombra", rotulo: "Sombra" }] }
    ],
    poderes: [
      { nome: "Condutor (Luz)", variante: "luz", custoPM: 1, descricao: "Resistência a dano elétrico +5. Pode gastar 1 ação de movimento + 1 PM para imbuir eletricidade em uma arma (+1d4 de dano elétrico até o fim da cena).",
        efeitos: [add("system.resistencias.reducao.eletrico", 5)] },
      { nome: "Luz Sagrada (Luz)", variante: "luz", descricao: "+2 em Diplomacia e Intuição. Ganha acesso a um efeito de luz menor (detalhes dependem do sistema de magia, a fechar).",
        efeitos: [add(outros("diplomacia"), 2), add(outros("intuicao"), 2)] },
      { nome: "Corrosivo (Sombra)", variante: "sombra", custoPM: 1, descricao: "Resistência a dano ácido +5. Pode gastar 1 ação de movimento + 1 PM para imbuir ácido em uma arma (+1d4 de dano ácido até o fim da cena).",
        efeitos: [add("system.resistencias.reducao.acido", 5)] },
      { nome: "Sombras Profanas (Sombra)", variante: "sombra", descricao: "+2 em Enganação e Furtividade. Ganha acesso a um efeito de escuridão menor (depende do sistema de magia, a fechar).",
        efeitos: [add(outros("enganacao"), 2), add(outros("furtividade"), 2)] }
    ]
  },
  {
    id: "monara", nome: "Monara", significado: "Os Vigias Ancestrais", icone: "Monara.png",
    atributos: { FOR: 2, CON: 1, INT: -1 },
    poderes: [
      { nome: "Arremesso Devil", descricao: "Qualquer arma sem a característica \"duas mãos\" é considerada arma de arremesso para você, com alcance Curto e sem a penalidade de -5 por arremessar arma improvisada. Em ataques de arremesso, soma o dobro do modificador de Força no dano." },
      { nome: "Sentidos Compensatórios", descricao: "-2 em testes de Visão. +2 em testes de Olfato e Audição.",
        efeitos: [add(outros("visao"), -2), add(outros("olfato"), 2), add(outros("audicao"), 2)] },
      { nome: "Resistência ao Impacto", descricao: "+2 em Fortitude. RD 2 contra qualquer dano não-mágico.",
        efeitos: [add(outros("fortitude"), 2)] }
    ]
  },
  {
    id: "aramaku", nome: "Ara'Maku", significado: "Os Filhos da Colheita", icone: "Ara'Maku.png",
    atributos: { DES: 1, CON: 1, SAB: 1 },
    escolhas: [
      { tipo: "texto", poder: "Arma do Predador", rotulo: "Arma escolhida" }
    ],
    poderes: [
      { nome: "A Lei da Reciprocidade", custoPM: 1, descricao: "1x/cena, ao reduzir um inimigo a 0 PV ou finalizar uma caça, pode gastar 1 PM como ação livre para um rito mental de gratidão: recebe PV temporários iguais a 5 + Sabedoria, até o fim da cena." },
      { nome: "Bote Paciente", custoPM: 2, descricao: "1x/cena, ao atacar uma criatura desprevenida ou flanqueada, pode gastar 2 PM para rolar o dano do ataque duas vezes e ficar com o melhor resultado." },
      { nome: "Arma do Predador", descricao: "Escolhe uma arma (não precisa ter a característica leve ou ágil). Recebe proficiência com ela e +2 em testes de ataque. Além disso, pode usar Destreza em vez de Força nos testes de Luta e de ataque com essa arma." }
    ]
  }
];

/* ------------------------------------------------------------------ */

const PERICIA_POR_CHAVE = Object.fromEntries(PERICIAS.map(p => [p.chave, p]));

/** Texto sem acentos, apóstrofos e caixa, para comparar nomes ("Ka'Ruun" = "karuun"). */
export function normalizar(texto) {
  return String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

/** Identificador de um poder a partir do nome (ex.: "Cortar! Cortar!" → "cortar-cortar"). */
export function idDoPoder(nome) {
  return String(nome).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function racaPorId(id) {
  return RACAS.find(r => r.id === id) ?? null;
}

/** Converte o texto antigo do campo Raça ("Koruma", "ka'ruun") no id; null se não reconhecer. */
export function idDaRacaPorNome(texto) {
  const alvo = normalizar(texto);
  if (!alvo) return null;
  return RACAS.find(r => normalizar(r.nome) === alvo || r.id === alvo)?.id ?? null;
}

/** Caminho do ícone da raça, já codificado (ç, é e apóstrofos). */
export function iconeDaRaca(raca) {
  return raca?.icone ? encodeURI(`${PASTA_ICONES_RACAS}/${raca.icone}`) : ICONE_PADRAO;
}

/** Lista de chaves de perícia permitidas numa escolha ("todas" ou lista). */
export function periciasPermitidas(escolha) {
  return escolha.permitidas === "todas" ? PERICIAS.map(p => p.chave) : [...escolha.permitidas];
}

/**
 * Valida a distribuição de atributos livres: um atributo por valor, todos diferentes.
 * @returns {boolean}
 */
export function atributosLivresValidos(escolha, atributos) {
  if (!Array.isArray(atributos) || atributos.length !== escolha.distribuicao.length) return false;
  if (atributos.some(a => !ATRIBUTOS.includes(a))) return false;
  return new Set(atributos).size === atributos.length;
}

/**
 * Resolve uma raça com as escolhas do jogador, sem tocar no Foundry.
 *
 * @param {object} raca
 * @param {object} [escolhas]
 * @param {string[]} [escolhas.atributos]   um atributo por valor de "distribuicao"
 * @param {string}   [escolhas.variante]
 * @param {Object<string,string>} [escolhas.pericias]  nome do poder → chave da perícia
 * @param {Object<string,string>} [escolhas.textos]    nome do poder → texto livre
 * @returns {{ racial: Object<string,number>, poderes: object[], pendentes: string[] }}
 */
export function resolverRaca(raca, escolhas = {}) {
  const racial = Object.fromEntries(ATRIBUTOS.map(k => [k, 0]));
  const pendentes = [];
  for (const [k, v] of Object.entries(raca.atributos ?? {})) racial[k] += v;

  const porTipo = tipo => (raca.escolhas ?? []).filter(e => e.tipo === tipo);

  // Atributos à escolha
  for (const e of porTipo("atributosLivres")) {
    if (atributosLivresValidos(e, escolhas.atributos)) {
      e.distribuicao.forEach((valor, i) => { racial[escolhas.atributos[i]] += valor; });
    } else {
      pendentes.push("atributos");
    }
  }

  // Variante: sem escolha, nenhum poder de variante é criado
  const variante = porTipo("variante")[0];
  const varianteEscolhida = variante && variante.opcoes.some(o => o.id === escolhas.variante) ? escolhas.variante : null;
  if (variante && !varianteEscolhida) pendentes.push("variante");

  const poderes = raca.poderes
    .filter(p => !p.variante || p.variante === varianteEscolhida)
    .map(p => {
      const efeitos = [];
      let escolha = null;
      let pendente = false;
      for (const ef of p.efeitos ?? []) {
        if (!ef.dinamico) { efeitos.push({ ...ef }); continue; }
        // Perícia escolhida: UPGRADE no treino (2 = Especialista, 1 = Treinado)
        const definicao = (raca.escolhas ?? []).find(e => e.tipo === ef.dinamico && e.poder === p.nome);
        const chave = escolhas.pericias?.[p.nome];
        if (definicao && periciasPermitidas(definicao).includes(chave)) {
          efeitos.push({ chave: `system.pericias.${chave}.treino`, modo: "UPGRADE", valor: ef.dinamico === "periciaEspecialista" ? 2 : 1 });
          escolha = PERICIA_POR_CHAVE[chave].nome;
        } else {
          pendente = true;
        }
      }
      // Texto livre (ex.: arma escolhida)
      if (porTipo("texto").some(e => e.poder === p.nome)) {
        const texto = String(escolhas.textos?.[p.nome] ?? "").trim();
        if (texto) escolha = texto;
        else pendente = true;
      }
      if (pendente) pendentes.push(p.nome);
      return {
        poderId: idDoPoder(p.nome),
        nome: p.nome,
        custoPM: p.custoPM ?? null,
        descricao: p.descricao,
        efeitos,
        escolha,
        pendente
      };
    });

  return { racial, poderes, pendentes };
}

/** Descrição em HTML do poder, com a escolha do jogador no final. */
export function descricaoHTML(poder) {
  const escapar = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const escolha = poder.escolha ? `<p><strong>Escolha:</strong> ${escapar(poder.escolha)}</p>` : "";
  return `<p>${escapar(poder.descricao)}</p>${escolha}`;
}
