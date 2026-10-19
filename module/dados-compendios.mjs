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
      acoplado: !!a.acoplado, provisorio: [...(a.provisorio ?? [])],
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
export function macrosDoSistema(lista = []) {
  return lista.map((m, i) => ({
    _id: idEstavel(`macro:${m.id}`), name: m.nome, type: "script",
    img: m.icone ? encodeURI(`systems/${SISTEMA_ID}/img/Icones/${m.icone}`) : (m.iconeCore ?? ICONE_PADRAO),
    command: m.comando, scope: "global", folder: null, sort: (i + 1) * 100,
    flags: { [SISTEMA_ID]: { id: m.id } }
  }));
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
    macros: { pastas: [], macros: macrosDoSistema(d.macros?.macros) }
  };
}

/* ------------------------------ Classes ------------------------------ */

export const PASTA_ICONES_CLASSES = `systems/${SISTEMA_ID}/img/Icones/classes`;
export const iconeDaClasseNoMapa = (id, mapa) => iconeDoMapa(PASTA_ICONES_CLASSES, mapa?.[id]);

/** Id (flags) de uma habilidade ou poder de classe: "<classe>__<id>". */
export const idDeClasse = (classe, id) => `${classe}__${id}`;

/** Subitens (caminhos, animais…) acrescentados à descrição como lista. */
const comSubs = (descricao, subs = []) => descricao + (subs.length
  ? `<ul class="subs-classe">${subs.map(s => `<li><strong>${escapar(s.nome)}.</strong> ${s.descricao}</li>`).join("")}</ul>` : "");

/** custoPM e acao vieram de heurística do texto: ficam marcados como inferidos. */
const inferido = x => x.custoPM !== null && x.custoPM !== undefined || (!!x.acao && x.acao !== "passivo");

/** Item "classe". */
export function dadosDaClasse(c, mapaIcones, prof, sort = 0) {
  return {
    _id: idEstavel(`classe:${c.id}`), name: c.nome, type: "classe", img: iconeDaClasseNoMapa(c.id, mapaIcones),
    folder: idEstavel("pasta:classes"), sort,
    system: {
      classeId: c.id, papel: c.papel, atributoChave: c.atributoChave ?? "",
      pv: { ...c.pv }, pm: { inicial: c.pm.inicial, porNivel: c.pm.porNivel, atributo: c.pm.atributo ?? null, atributoSoNoPrimeiroNivel: !!c.pm.atributoSoNoPrimeiroNivel, texto: c.pm.texto ?? "" },
      pericias: { obrigatorias: c.pericias.obrigatorias, escolha: c.pericias.escolha, lista: [...c.pericias.lista] },
      proficiencias: { texto: c.proficiencias, armas: [...(prof?.armas ?? [])], armaduras: [...(prof?.armaduras ?? [])], escudo: !!prof?.escudo, tunicas: !!prof?.tunicas },
      progressao: c.progressao.map(p => ({ nivel: p.nivel, habilidades: [...p.habilidades], poder: !!p.poder })),
      intro: (c.intro ?? []).map(t => `<p>${t}</p>`).join("")
    },
    effects: [],
    flags: { [SISTEMA_ID]: { id: c.id } }
  };
}

/** Habilidade de classe → item "poder" (tipoPoder "habilidade"). */
export function dadosDaHabilidade(c, h, mapaIcones, sort = 0) {
  return {
    _id: idEstavel(`habilidade:${c.id}:${h.id}`), name: h.nome, type: "poder", img: iconeDaClasseNoMapa(c.id, mapaIcones),
    folder: idEstavel(`pasta:habilidades:${c.id}`), sort,
    system: {
      fonte: "classe", custoPM: h.custoPM ?? null, prerequisito: "", nivel: h.nivel ?? null, acao: h.acao ?? "", frequencia: "",
      sustentada: false, divindade: "", tipoDano: "", descricao: comSubs(h.descricao, h.subs),
      classe: c.id, tipoPoder: "habilidade", grupo: "", nivelMinimo: h.nivel ?? null, atributoMinimo: {}, requerPoderes: [], requerGrupo: "", repetivel: false
    },
    effects: [],
    flags: { [SISTEMA_ID]: { id: idDeClasse(c.id, h.id), classe: c.id, habilidade: h.id, inferido: inferido(h) } }
  };
}

/** Poder de classe → item "poder" (tipoPoder "poder"). */
export function dadosDoPoderDeClasse(c, p, mapaIcones, sort = 0) {
  return {
    _id: idEstavel(`poder-classe:${c.id}:${p.id}`), name: p.nome, type: "poder", img: iconeDaClasseNoMapa(c.id, mapaIcones),
    folder: idEstavel(`pasta:poderes-classe:${c.id}:${normalizar(p.grupo)}`), sort,
    system: {
      fonte: "classe", custoPM: p.custoPM ?? null, prerequisito: p.prerequisito ?? "", nivel: null, acao: p.acao ?? "", frequencia: "",
      sustentada: false, divindade: "", tipoDano: "", descricao: p.descricao,
      classe: c.id, tipoPoder: "poder", grupo: p.grupo ?? "", nivelMinimo: p.nivelMinimo ?? null, atributoMinimo: { ...(p.atributoMinimo ?? {}) },
      requerPoderes: [...(p.requerPoderes ?? [])], requerGrupo: p.requerGrupo ?? "", repetivel: !!p.repetivel
    },
    effects: [],
    flags: { [SISTEMA_ID]: { id: idDeClasse(c.id, p.id), classe: c.id, poder: p.id, inferido: inferido(p) } }
  };
}

/**
 * Documentos dos compêndios de classes: classes (pasta única), habilidades (pasta por classe)
 * e poderes (pasta por classe > grupo).
 * @param {{ classes, iconesClasses, proficienciasClasses }} d
 */
export function documentosDeClasses(d) {
  const lista = d.classes?.classes ?? [];
  const pastasHab = lista.map((c, i) => pasta(`habilidades:${c.id}`, c.nome, { sort: (i + 1) * 100000 }));
  const pastasClassePoder = lista.map((c, i) => pasta(`poderes-classe:${c.id}`, c.nome, { sort: (i + 1) * 100000 }));
  const pastasGrupo = lista.flatMap(c => (c.grupos ?? []).map((g, j) => pasta(`poderes-classe:${c.id}:${normalizar(g)}`, g, {
    mae: idEstavel(`pasta:poderes-classe:${c.id}`), sort: (j + 1) * 100
  })));
  return {
    classes: {
      pastas: [pasta("classes", "Classes")],
      itens: lista.map((c, i) => dadosDaClasse(c, d.iconesClasses, d.proficienciasClasses?.[c.id], (i + 1) * 100))
    },
    "habilidades-classe": {
      pastas: pastasHab,
      itens: lista.flatMap(c => c.habilidades.map((h, i) => dadosDaHabilidade(c, h, d.iconesClasses, (h.nivel ?? 0) * 1000 + i)))
    },
    "poderes-classe": {
      pastas: [...pastasClassePoder, ...pastasGrupo],
      itens: lista.flatMap(c => c.poderes.map((p, i) => dadosDoPoderDeClasse(c, p, d.iconesClasses, (i + 1) * 100)))
    }
  };
}

/* ------------------------------ Vínculos (animais do Patrulheiro) ------------------------------ */

const TIPO_POR_NOME = { "perfuração": "perfuracao", "corte": "corte", "impacto": "impacto", "veneno": "veneno", "fogo": "fogo", "frio": "frio", "ácido": "acido" };
const chavePericia = (nome, pericias) => pericias.find(p => normalizar(p.nome) === normalizar(nome))?.chave;

/**
 * Atores dos animais do Vínculo Selvagem (Anexo B, PROVISÓRIO): tipo personagem, sem dono
 * jogador; atributos como modificadores diretos, perícias treinadas (+2) e "outros", ataques como
 * armas (Luta do animal) e habilidades como poderes. Os valores que dependem do patrulheiro (PV,
 * Defesa, dano) são recalculados ao invocar (module/classes/patrulheiro.mjs).
 * @param {{ vinculos }} dados   vinculos.json
 * @param {{ chave, nome }[]} pericias  PERICIAS de config.mjs
 */
export function documentosDeVinculos(dados, pericias) {
  return {
    pastas: [],
    atores: (dados?.vinculos ?? []).map((a, i) => {
      const actorId = idEstavel(`vinculo:${a.id}`);
      const pericia = {};
      for (const nome of a.treinadas ?? []) { const k = chavePericia(nome, pericias); if (k) pericia[k] = { ...(pericia[k] ?? {}), treino: 1 }; }
      for (const [nome, v] of Object.entries(a.outros ?? {})) { const k = chavePericia(nome, pericias); if (k) pericia[k] = { ...(pericia[k] ?? {}), outros: v }; }
      const movimentos = Object.entries(a.deslocamentos ?? {}).filter(([k]) => k !== "terrestre").map(([k, v]) => `${k} ${v} m`).join(", ");
      return {
        _id: actorId, name: a.nome, type: "personagem", img: "icons/svg/pawprint.svg", folder: null, sort: (i + 1) * 100,
        system: {
          nivel: 1, tamanho: a.tamanho === "pequeno" ? "pequeno" : "medio",
          atributos: Object.fromEntries(Object.entries(a.atributos ?? {}).map(([k, v]) => [k, { base: v, racial: 0, temp: 0 }])),
          classeConfig: { manual: true },
          pv: { value: 10, max: 10 },
          defesa: { outros: (a.defesaBonus ?? 0) - (a.atributos?.DES ?? 0) },
          deslocamento: a.deslocamentos?.terrestre ?? 9,
          resistencias: { rdGeral: a.rd ?? 0 },
          pericias: pericia,
          notas: `<p><strong>Vínculo Selvagem (valores provisórios).</strong>${movimentos ? ` Deslocamentos: ${escapar(movimentos)}.` : ""}</p>`
        },
        prototypeToken: { name: a.nome, actorLink: true, disposition: 1, texture: { src: "icons/svg/pawprint.svg" } },
        items: [
          ...a.ataques.map((atq, j) => ({
            _id: idEstavel(`vinculo:${a.id}:ataque:${j}`), name: atq.nome, type: "arma", img: "icons/svg/claw.svg",
            system: {
              categoria: "simples", grupo: "corpo-a-corpo", empunhadura: "uma-mao",
              dano: /1d6 de dano de veneno/i.test(atq.extra ?? "") ? `${atq.dano} + 1d6` : atq.dano,
              tiposDano: [TIPO_POR_NOME[String(atq.tipo ?? "").toLowerCase()] ?? "impacto", ...(/veneno/i.test(atq.extra ?? "") ? ["veneno"] : [])],
              criticoMargem: 20, criticoMult: 2, alcance: "corpo-a-corpo", proficiencia: "sim", empunhada: true,
              bonusAtaque: 0, bonusDano: 0, quantidade: 1, espacos: 0, preco: 0,
              descricao: atq.extra ? `<p>${escapar(atq.extra)}</p>` : ""
            },
            // Teixugo: só a mordida soma a metade do nível do patrulheiro
            flags: { [SISTEMA_ID]: { natural: true, somaNivel: !/só a mordida soma/i.test(atq.extra ?? "") || /mordida/i.test(atq.nome) } }
          })),
          ...(a.habilidades ?? []).map((h, j) => ({
            _id: idEstavel(`vinculo:${a.id}:habilidade:${j}`), name: h.nome, type: "poder", img: "icons/svg/pawprint.svg",
            system: { fonte: "geral", descricao: `<p>${escapar(h.texto)}</p>` }, flags: { [SISTEMA_ID]: { vinculo: true } }
          }))
        ],
        effects: [],
        flags: { [SISTEMA_ID]: { id: a.id, vinculo: { animal: a.id }, provisorio: true } }
      };
    })
  };
}
