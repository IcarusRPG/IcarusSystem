/**
 * Converte os dados de armaduras, poderes concedidos e condições (tools/dados/*.json) em
 * documentos dos compêndios. Sem dependência do Foundry: usado pelo build (Node), pelo plano B
 * (dentro do Foundry) e pelos testes.
 */
import { SISTEMA_ID, ICONE_PADRAO } from "./config.mjs";
import { idEstavel } from "./dados-itens.mjs";

const normalizar = t => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const escapar = t => String(t ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const MODO_ADD = 2;  // CONST.ACTIVE_EFFECT_MODES.ADD

export const PASTA_ICONES_ARMADURAS = `systems/${SISTEMA_ID}/img/Icones/itens/equipamentos/armaduras e escudos`;
export const PASTA_ICONES_PANTEAO = `systems/${SISTEMA_ID}/img/Icones/panteão/simbolos`;

/** Ícone a partir de um mapa id → arquivo (null = dado azul). Caminhos com espaço e acento: encodeURI. */
const iconeDoMapa = (pasta, arquivo) => (arquivo ? encodeURI(`${pasta}/${arquivo}`) : ICONE_PADRAO);
export const iconeDaArmadura = (id, mapa) => iconeDoMapa(PASTA_ICONES_ARMADURAS, mapa[id]);
export const iconeDaDivindade = (id, mapa) => iconeDoMapa(PASTA_ICONES_PANTEAO, mapa[id]);

/** Pasta de compêndio (com pasta-mãe opcional). */
function pasta(chave, nome, { tipo = "Item", mae = null, sort = 0 } = {}) {
  return {
    _id: idEstavel(`pasta:${chave}`), name: nome, type: tipo, folder: mae, sorting: "a", sort, color: null,
    flags: { [SISTEMA_ID]: { id: chave } }
  };
}

/* ------------------------------ Armaduras e escudos ------------------------------ */

/** Item "equipamento" (armadura, túnica ou escudo) do compêndio Armaduras e Escudos. */
export function dadosDaArmadura(a, mapaIcones, sort = 0) {
  return {
    _id: idEstavel(`armadura:${a.id}`),
    name: a.nome,
    type: "equipamento",
    img: iconeDaArmadura(a.id, mapaIcones),
    folder: idEstavel(`pasta:armaduras:${normalizar(a.pasta)}`),
    sort,
    system: {
      tipo: a.tipo, categoria: a.categoria, bonusDefesa: a.bonusDefesa, penalidade: a.penalidade,
      preco: a.preco, espacos: a.espacos, quantidade: 1, equipado: false,
      proficienciaLivre: !!a.proficienciaLivre, acoplado: !!a.acoplado, provisorio: [...(a.provisorio ?? [])],
      descricao: ""
    },
    effects: [],
    flags: { [SISTEMA_ID]: { id: a.id } }
  };
}

/* ------------------------------ Poderes concedidos ------------------------------ */

const ROTULO_ACAO = { livre: "Ação livre", movimento: "Ação de movimento", padrao: "Ação padrão", completa: "Ação completa", reacao: "Reação", especial: "Especial" };
const ROTULO_FREQUENCIA = { cena: "1x por cena", rodada: "1x por rodada", dia: "1x por dia" };

/** Linha de metadados do poder: Ação · Custo · Frequência (omite o que for vazio ou passivo). */
export function metaDoPoder(p) {
  return [
    ROTULO_ACAO[p.acao] ?? "",
    p.custoPM ? `${p.custoPM} PM` : "",
    ROTULO_FREQUENCIA[p.frequencia] ?? "",
    p.sustentada ? "Sustentada" : ""
  ].filter(Boolean).join(" · ");
}

/**
 * Efeitos do JSON → mudanças de Efeito Ativo (modo Somar), com as mesmas chaves das raças.
 * Efeitos com "condicional" não viram Efeito Ativo: ficam só no texto (ex.: Romper Amarras).
 */
export function mudancasDoPoder(p) {
  const mudancas = [];
  for (const e of p.efeitos ?? []) {
    if (e.condicional) continue;
    if (e.pericia) mudancas.push({ key: `system.pericias.${e.pericia}.outros`, mode: MODO_ADD, value: String(e.valor) });
    if (e.defesa) mudancas.push({ key: "system.defesa.outros", mode: MODO_ADD, value: String(e.defesa) });
    for (const [tipo, valor] of Object.entries(e.reducao ?? {})) {
      mudancas.push({ key: `system.resistencias.reducao.${tipo}`, mode: MODO_ADD, value: String(valor) });
    }
  }
  return mudancas;
}

/** Item "poder" concedido por uma divindade, com o símbolo dela como ícone. */
export function dadosDoPoderConcedido(p, divindade, mapaIcones, sort = 0) {
  const img = iconeDaDivindade(p.divindade, mapaIcones);
  const meta = metaDoPoder(p);
  const mudancas = mudancasDoPoder(p);
  return {
    _id: idEstavel(`poder-concedido:${p.id}`),
    name: p.nome,
    type: "poder",
    img,
    folder: idEstavel(`pasta:divindade:${p.divindade}`),
    sort,
    system: {
      fonte: "divindade",
      custoPM: p.custoPM || null,
      prerequisito: `Devoto de ${divindade?.nome ?? p.divindadeNome ?? p.divindade}`,
      nivel: null,
      acao: p.acao ?? "",
      frequencia: p.frequencia ?? "",
      sustentada: !!p.sustentada,
      divindade: p.divindade,
      tipoDano: "",
      descricao: `${meta ? `<p class="meta-poder"><em>${escapar(meta)}</em></p>` : ""}<p>${escapar(p.descricao)}</p>`
    },
    effects: mudancas.length ? [{
      _id: idEstavel(`efeito:${p.id}`),
      name: p.nome, img, transfer: true, disabled: false, changes: mudancas, description: "",
      flags: { [SISTEMA_ID]: { poderConcedido: p.id } }
    }] : [],
    flags: { [SISTEMA_ID]: { id: p.id, divindade: p.divindade, concedido: true } }
  };
}

/* ------------------------------ Condições ------------------------------ */

const ROTULO_FLAG = {
  semAcoes: "Não pode fazer ações", semReacoes: "Não pode fazer reações", acaoUnica: "Só uma ação por turno",
  naoCorre: "Não pode correr", semInvestida: "Não pode fazer investidas", soAcoesMentais: "Só pode fazer ações puramente mentais",
  golpeDeMisericordia: "Pode sofrer golpe de misericórdia", primeiraRodada: "Vale na primeira rodada"
};

/** Linhas informativas das flags de uma condição (sem automação). */
export function textosDasFlags(c, nomePericia = k => k) {
  const linhas = [];
  for (const [chave, valor] of Object.entries(c.flags ?? {})) {
    if (chave === "falhaAutomatica") linhas.push(`Falha automática em ${valor.map(nomePericia).join(", ")}`);
    else if (chave === "perdeAcaoPorTurno") linhas.push("Perde uma ação de movimento ou padrão por turno, à escolha [CONFIRMAR]");
    else if (chave === "exceto") linhas.push(`Exceto: ${valor}`);
    else if (valor && ROTULO_FLAG[chave]) linhas.push(ROTULO_FLAG[chave]);
  }
  if (c.custoPMExtra) linhas.push(`Habilidades custam +${c.custoPMExtra} PM`);
  return linhas;
}

/** HTML da página de uma condição: descritores, selo de pendência, descrição, composição e escalonamento. */
export function htmlDaCondicao(c, porId, nomePericia) {
  const tags = (c.descritores ?? []).map(d => `<span class="icarus-tag">${escapar(d)}</span>`).join(" ");
  const pendente = (c.pendencias ?? []).length ? `<p class="icarus-pendente">Regra a confirmar (${escapar(c.pendencias.join(", "))})</p>` : "";
  const compoe = (c.compoe ?? []).length ? `<p><strong>Composição:</strong> = ${c.compoe.map(id => escapar(porId[id]?.nome ?? id)).join(" + ")}</p>` : "";
  const escala = c.escala ? `<p><strong>Escalonamento:</strong> a condição piora para ${escapar(porId[c.escala]?.nome ?? c.escala)}.</p>` : "";
  const extras = [...(c.texto ?? []), ...textosDasFlags(c, nomePericia)];
  const lista = extras.length ? `<ul>${extras.map(t => `<li>${escapar(t)}</li>`).join("")}</ul>` : "";
  return `${tags ? `<p>${tags}</p>` : ""}${pendente}<p>${escapar(c.descricao)}</p>${compoe}${escala}${lista}`;
}

/** Diário "Condições" com as 36 páginas em ordem alfabética. */
export function diarioDasCondicoes(dados, nomePericia) {
  const porId = Object.fromEntries(dados.condicoes.map(c => [c.id, c]));
  const ordenadas = [...dados.condicoes].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  return {
    _id: idEstavel("diario:condicoes"),
    name: "Condições",
    folder: null,
    sort: 0,
    pages: ordenadas.map((c, i) => ({
      _id: idEstavel(`pagina-condicao:${c.id}`),
      name: c.nome,
      type: "text",
      title: { show: true, level: 1 },
      text: { format: 1, content: htmlDaCondicao(c, porId, nomePericia) },
      sort: (i + 1) * 100,
      flags: { [SISTEMA_ID]: { id: c.id } }
    })),
    flags: { [SISTEMA_ID]: { id: "condicoes" } }
  };
}

/* ------------------------------ Macros ------------------------------ */

/** Macros do sistema (compêndio Icarus — Macros). */
export function macrosDoSistema() {
  const macro = (id, nome, img, command) => ({
    _id: idEstavel(`macro:${id}`), name: nome, type: "script", img, command, scope: "global", folder: null, sort: 0,
    flags: { [SISTEMA_ID]: { id } }
  });
  return [
    macro("aplicar-condicao", "Aplicar Condição", "icons/svg/aura.svg", "game.icarus.condicoes.painel();"),
    macro("telao", "Telão", "icons/svg/video.svg", "game.icarus.telao();"),
    macro("popular-compendios", "Popular compêndios (Mestre)", "icons/svg/book.svg", "await game.icarus.popularCompendios();")
  ];
}

/**
 * Documentos dos compêndios novos.
 * @param {object} d  { armaduras, iconesArmaduras, poderes, panteao, iconesDivindades, condicoes, nomePericia }
 */
export function documentosNovos(d) {
  const nomePericia = d.nomePericia ?? (k => k);
  const pastasArmaduras = d.armaduras.pastas.map((nome, i) => pasta(`armaduras:${normalizar(nome)}`, nome, { sort: (i + 1) * 100000 }));
  const grupos = [...new Set(d.panteao.divindades.map(x => x.grupo))];
  const pastasGrupos = grupos.map((g, i) => pasta(`grupo:${normalizar(g)}`, g, { sort: (i + 1) * 100000 }));
  const pastasDivindades = d.panteao.divindades.map((x, i) => pasta(`divindade:${x.id}`, x.nome, { mae: idEstavel(`pasta:grupo:${normalizar(x.grupo)}`), sort: (i + 1) * 100 }));
  const porDivindade = Object.fromEntries(d.panteao.divindades.map(x => [x.id, x]));
  return {
    "armaduras-escudos": {
      pastas: pastasArmaduras,
      itens: d.armaduras.itens.map((a, i) => dadosDaArmadura(a, d.iconesArmaduras, (i + 1) * 100))
    },
    "poderes-concedidos": {
      pastas: [...pastasGrupos, ...pastasDivindades],
      itens: d.poderes.poderes.map((p, i) => dadosDoPoderConcedido(p, porDivindade[p.divindade], d.iconesDivindades, (i + 1) * 100))
    },
    condicoes: { pastas: [], diarios: [diarioDasCondicoes(d.condicoes, nomePericia)] },
    macros: { pastas: [], macros: macrosDoSistema() }
  };
}
