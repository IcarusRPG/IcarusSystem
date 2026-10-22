import {
  TIPOS_DANO_COM_RESISTENCIA, SISTEMA_ID, ICONE_PADRAO, ATRIBUTOS, PERICIAS, RESISTENCIAS, TAMANHOS, FONTES_PODER, TIPOS_EQUIPAVEIS, NIVEL_PARAGON, chavesDeEfeito,
  PROFICIENCIAS_ARMA, CATEGORIAS_ARMADURA_CORPO
} from "../config.mjs";
import { numero, limitar, comSinal, semMais } from "../regras.mjs";
import { rolarPericia, rolarAtributo, modoDoEvento } from "../rolls.mjs";
import { RACAS, racaPorId, iconeDaRaca, resolverRaca } from "../data/racas.mjs";
import { trocarRaca, reaplicarRaca, refazerEscolhas, ehPoderRacialAuto, escolhasGuardadas } from "../racas.mjs";
import { DialogoNivel } from "./dialogo-nivel.mjs";
import { conflitoEscudoAcoplado } from "../armaduras.mjs";
import { DIVINDADES, GRUPOS_DIVINOS, divindadePorId, poderesDaDivindade, simboloDaDivindade } from "../panteao.mjs";
import { DialogoPoderesConcedidos, trocarDivindade } from "./dialogo-poderes-concedidos.mjs";
import { ligarArvoreDivindade } from "./arvore-divindade.mjs";
import { CONDICAO_POR_ID } from "../condicoes.mjs";
import { textosDasFlags } from "../dados-compendios.mjs";
import { removerCondicao, escalarCondicao } from "../condicoes-foundry.mjs";
import { PainelCondicoes } from "./painel-condicoes.mjs";
import { rolarTesteDeMorte, registrarDanoEmMorrendo, estabilizarComCura } from "../morte-foundry.mjs";
import { TAMANHO_PACOTE } from "../config.mjs";
import { espacosDoItem } from "../derivar.mjs";
import { formatarPreco, precoEmOuro } from "../moeda.mjs";
import { calcularAtaque, calcularDano, totalMunicao, avisoEmpunhadura, vestidosSemProficiencia } from "../combate.mjs";
import { itensDoAtor, rolarAtaque, rolarDano, recarregar, marcarDanoNoUltimoAtaque } from "../combate-chat.mjs";
import { adicionarItem, perguntarCompra, precoDoItem, novoItem } from "../inventario.mjs";
import { usarPoder, alternarReacao, aguardar, dispararAguardar, textoReacao, reacaoDoAtor } from "../acoes.mjs";
import { CLASSES, classePorId, iconeDaClasse, tabelaDeProgressao, patamarDe } from "../classes-dados.mjs";
import { aplicarClasse, classeLivre, contadorDePoderes, MECANICAS_DE_CLASSE } from "../classes.mjs";
import { acaoDaMecanica } from "../classes/comum.mjs";
import { escolhaPendente, entradaDoItem, resolverEscolha } from "../escolhas.mjs";
import { desfazerTrocaDeClasse } from "../assistente.mjs";
import { trocarOrigem, reaplicarOrigem, desfazerTrocaDeOrigem, opcoesDeOrigem, escolhasDoItemComum, itemComumComEscolhas } from "../origens.mjs";
import { origemPorId, itemComumPorId, ehVestimenta, estaVestido, textoDoBonus } from "../origens-dados.mjs";
import { usarItemComum, temUsar, alternarVestido } from "../itens-comuns.mjs";
import { RECARGAS, adicionarRecurso, alterarRecurso, removerRecurso, recarregarRecursos, sugerirRecursos } from "../recursos.mjs";
import { abrirManobra } from "../manobras.mjs";

const T = `systems/${SISTEMA_ID}/templates/actor`;

/**
 * Ficha do Actor "personagem".
 * Foundry v12: usa a ficha clássica (ActorSheet + Handlebars). Ao migrar para o v13,
 * esta classe vira ActorSheetV2; templates, dados e rolagens continuam os mesmos.
 */
export class FichaPersonagem extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["icarus", "sheet", "actor", "personagem"],
      template: `${T}/personagem.hbs`,
      width: 1280,
      height: 920,
      resizable: true,
      tabs: [{ navSelector: ".abas-lista", contentSelector: ".corpo", initial: "caracteristicas" }],
      scrollY: [".corpo"],
      dragDrop: [{ dragSelector: "[data-item-id], [data-effect-id]", dropSelector: null }]
    });
  }

  async getData(options) {
    const ctx = await super.getData(options);
    const actor = this.actor;
    const s = actor.system;            // valores com Efeitos e derivados (para exibir)
    const src = actor._source.system;  // valores salvos (para os campos editáveis)
    const loc = k => game.i18n.localize(k);

    ctx.actor = actor;
    ctx.system = s;
    ctx.source = src;
    ctx.editable = this.isEditable;
    ctx.owner = actor.isOwner;
    ctx.iconePadrao = ICONE_PADRAO;

    // De onde vem cada bônus de Efeito Ativo (vira dica ao passar o mouse)
    const origens = this._origensDosEfeitos();
    const dica = (...chaves) => chaves.flatMap(c => origens[c] ?? []).join("\n");

    // Raça (combobox)
    const raca = racaPorId(src.identidade.raca);
    const personalizada = src.identidade.raca && !raca ? src.identidade.raca : "";
    const pendentesRaca = raca ? resolverRaca(raca, escolhasGuardadas(actor)).pendentes : [];
    ctx.raca = {
      id: raca?.id ?? "",
      nome: raca?.nome ?? personalizada,
      significado: raca?.significado ?? (personalizada ? loc("ICARUS.Racas.Personalizada") : ""),
      icone: raca ? iconeDaRaca(raca) : ICONE_PADRAO,
      temEscolhas: !!raca?.escolhas?.length,
      pendente: pendentesRaca.length > 0,
      opcoes: [
        { valor: "", rotulo: loc("ICARUS.Racas.Nenhuma"), selecionado: !src.identidade.raca },
        ...(personalizada ? [{ valor: personalizada, rotulo: `${personalizada} (${loc("ICARUS.Racas.Personalizada").toLowerCase()})`, selecionado: true }] : []),
        ...[...RACAS].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
          .map(r => ({ valor: r.id, rotulo: r.nome, selecionado: r.id === raca?.id }))
      ]
    };

    // Divindade (combobox em árvore): id da divindade, "" = Nenhum(a); texto antigo vira "Outra"
    const div = divindadePorId(src.identidade.divindade);
    const outra = src.identidade.divindade && !div ? src.identidade.divindade : "";
    const possuidos = new Set(actor.items.map(i => i.flags?.[SISTEMA_ID]?.concedido && i.flags[SISTEMA_ID].id).filter(Boolean));
    ctx.divindade = {
      id: div?.id ?? "",
      outra,
      rotulo: div ? div.nome : outra ? `${loc("ICARUS.Devocao.Outra")}: ${outra}` : loc("ICARUS.Devocao.Nenhuma"),
      simbolo: div ? simboloDaDivindade(div.id) : "",
      titulo: div?.titulo ?? "",
      dogma: div?.dogma ?? "",
      grupos: GRUPOS_DIVINOS.map(g => ({
        nome: g,
        itens: DIVINDADES.filter(d => d.grupo === g).map(d => ({ id: d.id, nome: d.nome, titulo: d.titulo, simbolo: simboloDaDivindade(d.id), selecionado: d.id === div?.id }))
      })),
      poderes: div ? poderesDaDivindade(div.id).map(p => ({ nome: p.nome, meta: p.meta, possui: possuidos.has(p.id) })) : []
    };

    // Classe: seletor com as classes do sistema + "Outra (texto livre)"
    const classe = classePorId(src.identidade.classe);
    const classeLivreTexto = src.identidade.classe && !classe ? src.identidade.classe : "";
    ctx.classe = {
      id: classe?.id ?? "",
      icone: classe ? iconeDaClasse(classe.id) : "",
      papel: classe?.papel ?? "",
      opcoes: [
        { valor: "", rotulo: loc("ICARUS.Classe.Nenhuma"), selecionado: !src.identidade.classe },
        ...CLASSES.map(c => ({ valor: c.id, rotulo: c.nome, selecionado: c.id === classe?.id })),
        ...(classeLivreTexto ? [{ valor: classeLivreTexto, rotulo: `${classeLivreTexto} (${loc("ICARUS.Classe.Livre")})`, selecionado: true }] : []),
        { valor: "__outra__", rotulo: loc("ICARUS.Classe.Outra"), selecionado: false }
      ]
    };

    // Aba Classe: progressão, contador de poderes e mecânicas
    const contador = contadorDePoderes(actor);
    const caminhoMonge = actor.getFlag(SISTEMA_ID, "caminho");
    ctx.classeAba = classe ? {
      tem: true, nome: classe.nome, icone: ctx.classe.icone, papel: classe.papel,
      patamar: loc(`ICARUS.Patamares.${patamarDe(s.nivel)}`),
      caminho: caminhoMonge ? loc(`ICARUS.Monge.Caminhos.${caminhoMonge}`) : "",
      contador,
      tabela: tabelaDeProgressao(classe, s.nivel),
      mecanicas: MECANICAS_DE_CLASSE.get(classe.id)?.(actor) ?? []
    } : { tem: false };
    ctx.classeAba.desfazer = !!actor.getFlag(SISTEMA_ID, "snapshotTrocaClasse");

    // Recursos de classe
    ctx.recursosClasse = (s.recursos ?? []).map(r => ({
      ...r, opcoes: RECARGAS.map(v => ({ valor: v, rotulo: loc(`ICARUS.Recursos.Recargas.${v}`), selecionado: v === r.recarga }))
    }));

    ctx.origem = { ...opcoesDeOrigem(src.identidade.origem), desfazer: !!actor.getFlag(SISTEMA_ID, "snapshotTrocaOrigem") };
    ctx.identidade = ["profissao"].map(k => ({
      chave: k,
      rotulo: loc(`ICARUS.Identidade.${k}`),
      valor: src.identidade[k],
      placeholder: k === "origem" ? loc("ICARUS.Identidade.Obrigatoria") : k === "profissao" ? loc("ICARUS.Identidade.Opcional") : ""
    }));

    ctx.nivel = {
      valor: s.nivel,
      paragon: s.paragon,
      pips: Array.from({ length: 25 }, (_, i) => ({
        classe: [i >= NIVEL_PARAGON - 1 ? "par" : "", i < s.nivel ? "on" : ""].join(" ").trim()
      }))
    };

    const pct = (v, m) => (m > 0 ? Math.round(100 * v / m) : 0);
    ctx.pv = { value: s.pv.value, max: s.pv.max, pct: pct(s.pv.value, s.pv.max), dica: dica("system.classeConfig.bonusPvPorNivel") };
    ctx.pm = { value: s.pm.value, max: s.pm.max, pct: pct(s.pm.value, s.pm.max), dica: dica("system.classeConfig.bonusPmPorNivel", "system.classeConfig.bonusPmNivelImpar") };
    ctx.defesa = {
      total: s.defesa.total,
      outros: src.defesa.outros,
      dica: [dica("system.defesa.outros"), ...(s.defesa.passivos ?? []).map(p => `${comSinal(p.valor)} ${p.origem}`), s.defesa.condicao ? `${comSinal(s.defesa.condicao.valor)} ${s.defesa.condicao.origem}` : ""].filter(Boolean).join("\n"),
      penalidade: s.defesa.penalidade ? game.i18n.format("ICARUS.Armaduras.PenalidadeTotal", { valor: comSinal(-s.defesa.penalidade) }) : "",
      avisoAcoplado: conflitoEscudoAcoplado(actor) ? loc("ICARUS.Armaduras.AvisoAcoplado") : "",
      formula: game.i18n.format("ICARUS.Defesa.Formula", {
        des: semMais(s.atributos.DES.total), armadura: semMais(s.defesa.armadura),
        escudo: semMais(s.defesa.escudo), outros: semMais(s.defesa.outros)
      })
    };
    ctx.deslocamento = {
      metros: src.deslocamento,
      exibicao: semMais(s.deslocamento),
      quadrados: s.deslocamentoQuadrados,
      dica: dica("system.deslocamento"),
      mudou: s.deslocamento !== src.deslocamento
    };

    ctx.atributos = ATRIBUTOS.map(k => ({
      chave: k,
      nome: loc(`ICARUS.Atributos.${k}`),
      base: src.atributos[k].base,
      racial: src.atributos[k].racial,
      temp: src.atributos[k].temp,
      // Temp diferente do salvo = há Efeito Ativo mexendo nele
      tempEfeito: s.atributos[k].temp !== src.atributos[k].temp ? comSinal(s.atributos[k].temp - src.atributos[k].temp) : "",
      tempDica: [dica(`system.atributos.${k}.temp`), s.atributos[k].aumento ? game.i18n.format("ICARUS.Comuns.AumentoDica", { n: s.atributos[k].aumento }) : ""].filter(Boolean).join("\n"),
      total: comSinal(s.atributos[k].total)
    }));

    const opcoesAtributo = Object.fromEntries(ATRIBUTOS.map(a => [a, a]));
    const pericias = PERICIAS.map(p => {
      const d = s.pericias[p.chave];
      const fonte = src.pericias[p.chave];
      const nome = loc(`ICARUS.Pericias.${p.chave}`);
      const k = `system.pericias.${p.chave}`;
      // Origem dos bônus: Efeitos Ativos e penalidade de armadura ("−1 Couro Reforçado")
      const penalidade = d.penalidadeArmadura
        ? s.defesa.origensPenalidade.map(o => game.i18n.format("ICARUS.Armaduras.PenalidadeOrigem", { valor: comSinal(-o.valor), nome: o.nome })).join("\n")
        : "";
      const condicao = d.condicao ? `${comSinal(d.condicao)} ${d.origemCondicao}` : "";
      const falha = d.falhaAuto ? game.i18n.format("ICARUS.Condicoes.FalhaAuto", { condicao: d.falhaAuto }) : "";
      const deItens = (d.bonusItens ?? []).map(b => `${comSinal(b.valor)} ${b.origem}`).join("\n");
      const origem = [dica(`${k}.treino`, `${k}.outros`, `${k}.atributo`), deItens, penalidade, condicao, falha].filter(Boolean).join("\n");
      const rolar = game.i18n.format("ICARUS.Pericia.Rolar", { pericia: nome, total: comSinal(d.total) });
      return {
        chave: p.chave,
        nome,
        treino: d.treino,
        treinoDica: [game.i18n.format("ICARUS.Pericia.TreinoDica", { pericia: nome, grau: loc(`ICARUS.Treino.${d.treino}`) }), dica(`${k}.treino`), d.especialistaPorPoder ? loc("ICARUS.Comuns.EspecialistaDica") : ""].filter(Boolean).join("\n"),
        resistencia: !!p.resistencia,
        atributo: fonte.atributo,
        atributoMudou: d.atributo !== p.atributo,
        atributoDica: dica(`${k}.atributo`),
        outros: fonte.outros,
        outrosDica: dica(`${k}.outros`),
        comEfeito: !!origem,
        total: comSinal(d.total),
        rolarDica: [rolar, origem, loc("ICARUS.Rolagem.DicaAtalhos")].filter(Boolean).join("\n")
      };
    });
    ctx.opcoesAtributo = opcoesAtributo;
    ctx.periciasA = pericias.slice(0, 15);
    ctx.periciasB = pericias.slice(15);

    ctx.tamanho = src.tamanho;
    ctx.opcoesTamanho = Object.fromEntries(Object.keys(TAMANHOS).map(k => [k, `ICARUS.Tamanhos.${k}`]));
    ctx.tamanhoEfetivo = s.tamanho !== src.tamanho
      ? game.i18n.format("ICARUS.Outras.TamanhoEfetivo", { tamanho: loc(`ICARUS.Tamanhos.${s.tamanho}`), origem: dica("system.tamanho") })
      : "";
    const padrao = TAMANHOS[s.tamanho]?.deslocamento;
    ctx.dicaTamanho = padrao != null && padrao !== s.deslocamento && !ctx.deslocamento.dica
      ? game.i18n.format("ICARUS.Outras.PadraoTamanho", { tamanho: loc(`ICARUS.Tamanhos.${s.tamanho}`), metros: padrao })
      : "";
    ctx.resistencias = RESISTENCIAS.map(r => ({
      chave: r.chave, abrev: r.abrev, nome: loc(`ICARUS.Pericias.${r.chave}`), total: comSinal(s.pericias[r.chave].total)
    }));

    // Condições ativas (chips na aba Combate) e avisos informativos (faixa abaixo dos recursos)
    const nomePericiaLoc = k => loc(`ICARUS.Pericias.${k}`);
    ctx.condicoesAtivas = actor.effects.filter(e => e.flags?.[SISTEMA_ID]?.condicao || [...(e.statuses ?? [])].some(sid => CONDICAO_POR_ID[sid]))
      .map(e => {
        const id = e.flags?.[SISTEMA_ID]?.condicao ?? [...e.statuses].find(sid => CONDICAO_POR_ID[sid]);
        const c = CONDICAO_POR_ID[id];
        const origem = e.flags?.[SISTEMA_ID]?.origem;
        const duracao = e.flags?.[SISTEMA_ID]?.duracao ?? "remover";
        return {
          efeitoId: e.id, id, nome: c.nome, img: e.img, descricao: c.descricao,
          origem: origem ? game.i18n.format("ICARUS.Condicoes.IncluidaPor", { condicao: CONDICAO_POR_ID[origem]?.nome ?? origem }) : "",
          duracao: duracao === "rodadas" && e.duration?.rounds ? game.i18n.format("ICARUS.Condicoes.RodadasN", { n: e.duration.rounds }) : loc(`ICARUS.Condicoes.Duracoes.${duracao}`),
          pendente: (c.pendencias ?? []).length > 0,
          escala: c.escala ? CONDICAO_POR_ID[c.escala]?.nome : "",
          avisos: textosDasFlags(c, nomePericiaLoc)
        };
      }).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    ctx.avisosCondicoes = ctx.condicoesAtivas.filter(c => c.avisos.length).map(c => `${c.nome}: ${c.avisos.join("; ")}`);

    // Testes de morte: aparece em Morrendo, estável ou com marcas
    const m = s.morte ?? { sucessos: 0, falhas: 0, estavel: false };
    const morrendo = actor.statuses?.has("morrendo") ?? false;
    // Reação da rodada e Aguardar
    const reacao = reacaoDoAtor(actor);
    const aguardando = actor.getFlag(SISTEMA_ID, "aguardando");
    ctx.acoesCombate = {
      reacaoDisponivel: s.reacao.disponivel,
      reacaoPode: reacao.pode,
      reacaoTexto: textoReacao(actor),
      aguardando: aguardando ? game.i18n.format("ICARUS.Aguardar.Ativo", { acao: loc(`ICARUS.Poderes.Acoes.${aguardando.acao}`), gatilho: aguardando.gatilho }) : ""
    };

    ctx.morte = {
      mostrar: morrendo || m.estavel || m.sucessos > 0 || m.falhas > 0,
      morrendo, estavel: m.estavel,
      sucessos: [1, 2, 3].map(n => ({ n, marcado: n <= m.sucessos })),
      falhas: [1, 2, 3].map(n => ({ n, marcado: n <= m.falhas }))
    };

    // Resistências: RD geral e, por tipo, Redução / Imune / Vulnerável (campos salvos; efetivo na dica)
    const r = s.resistencias, rs = src.resistencias;
    // Dica da RD: digitado + fontes, e o teto quando cortou
    const dicaRD = det => !det ? "" : [
      det.usadas.length || det.cortado ? game.i18n.format("ICARUS.RD.Digitado", { valor: det.bruto - det.usadas.reduce((x, f) => x + f.valor, 0) }) : "",
      ...det.usadas.map(f => `+${f.valor} ${f.origem}`),
      det.cortado ? game.i18n.format("ICARUS.RD.Teto", { teto: r.teto, bruto: det.bruto }) : ""
    ].filter(Boolean).join("\n");
    ctx.resistenciasTabela = {
      rdGeral: rs.rdGeral,
      rdEfetivo: r.rdGeral !== rs.rdGeral ? r.rdGeral : null,
      rdDica: dicaRD(r.detalhe?.rdGeral) || (r.teto === null ? loc("ICARUS.RD.SemTeto") : ""),
      teto: r.teto !== null && r.teto !== undefined ? game.i18n.format("ICARUS.RD.TetoCurto", { teto: r.teto }) : loc("ICARUS.RD.SemTeto"),
      linhas: TIPOS_DANO_COM_RESISTENCIA.map(tipo => ({
        tipo,
        nome: loc(`ICARUS.TiposDano.${tipo}`),
        reducao: rs.reducao[tipo],
        reducaoEfetiva: r.reducao[tipo] !== rs.reducao[tipo] ? r.reducao[tipo] : null,
        imune: rs.imunidade[tipo],
        imuneEfeito: r.imunidade[tipo] && !rs.imunidade[tipo],
        vulneravel: rs.vulnerabilidade[tipo],
        vulneravelEfeito: r.vulnerabilidade[tipo] && !rs.vulnerabilidade[tipo],
        dica: [dicaRD(r.detalhe?.reducao?.[tipo]), dica(`system.resistencias.imunidade.${tipo}`, `system.resistencias.vulnerabilidade.${tipo}`)].filter(Boolean).join("\n")
      }))
    };

    // Proficiências: armas e armaduras marcáveis; simples é de todos
    const prof = src.proficiencias;
    const semProf = vestidosSemProficiencia(s, itensDoAtor(actor));
    ctx.proficiencias = {
      armas: PROFICIENCIAS_ARMA.map(k => ({ chave: k, rotulo: loc(`ICARUS.Proficiencias.ArmasOp.${k}`), marcado: k === "simples" || prof.armas.includes(k), fixo: k === "simples" })),
      armaduras: CATEGORIAS_ARMADURA_CORPO.map(k => ({ chave: k, rotulo: loc(`ICARUS.Proficiencias.ArmadurasOp.${k}`), marcado: prof.armaduras.includes(k) })),
      dicaSimples: loc("ICARUS.Proficiencias.DicaSimples"),
      avisos: semProf.length ? game.i18n.format("ICARUS.Proficiencias.AvisoVestido", { itens: semProf.map(i => actor.items.get(i.id)?.name ?? "").join(", ") }) : ""
    };

    // Inventário
    const ordenar = (a, b) => (a.sort || 0) - (b.sort || 0);
    const preco = c => ({ texto: formatarPreco(c), ouro: precoEmOuro(c) });
    ctx.equipamentos = actor.items.filter(i => i.type === "equipamento")
      .sort(ordenar)
      .map(i => ({
        id: i.id, name: i.name, img: i.img,
        tipo: loc(`ICARUS.Equipamento.Tipos.${i.system.tipo}`),
        quantidade: i.system.quantidade,
        equipavel: TIPOS_EQUIPAVEIS.includes(i.system.tipo),
        equipado: i.system.equipado,
        bonus: comSinal(i.system.bonusDefesa),
        categoria: i.system.categoria ? loc(`ICARUS.Armaduras.Categorias.${i.system.categoria}`) : "",
        penalidade: i.system.penalidade ? comSinal(-i.system.penalidade) : "",
        espacos: espacosDoItem(i),
        preco: preco(i.system.preco),
        // Itens comuns e vestimentas (Limite de 5): Vestir/Tirar, fora do limite, usos e bônus
        itemComum: i.system.tipo === "item-comum",
        vestimenta: ehVestimenta(i),
        vestido: estaVestido(i),
        foraDoLimite: (s.vestimentas?.fora ?? []).includes(i.id),
        usar: temUsar(i),
        usos: i.system.usos?.max > 0 ? `${i.system.usos.atual}/${i.system.usos.max}` : "",
        semUsos: i.system.usos?.max > 0 && i.system.usos.atual <= 0,
        bonusTexto: (i.system.bonus ?? []).map(b => textoDoBonus(b, i.flags?.[SISTEMA_ID]?.escolhaBonus)).join("; "),
        precoVenda: i.system.precoVenda ? formatarPreco(i.system.precoVenda) : ""
      }));
    ctx.vestimentas = s.vestimentas ? { ...s.vestimentas, texto: game.i18n.format("ICARUS.ItensComuns.Contador", { n: s.vestimentas.vestidas, limite: s.vestimentas.limite }) } : null;

    // Armas: bônus de ataque e dano calculados pelas regras de combate
    const itens = itensDoAtor(actor);
    ctx.armas = actor.items.filter(i => i.type === "arma").sort(ordenar).map(i => this._linhaDaArma(i, itens));
    ctx.municoes = actor.items.filter(i => i.type === "municao").sort(ordenar).map(i => ({
      id: i.id, name: i.name, img: i.img,
      tipo: loc(`ICARUS.Municao.Tipos.${i.system.tipo}`),
      quantidade: i.system.quantidade,
      pacotes: game.i18n.format("ICARUS.Municao.Pacotes", {
        n: new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(i.system.quantidade / TAMANHO_PACOTE), espacos: i.system.espacos
      }),
      espacos: i.system.espacos,
      preco: preco(i.system.precoPacote)
    }));
    ctx.moedas = { ...src.moedas, total: formatarPreco(s.moedas.total) === "—" ? "R$ 0" : formatarPreco(s.moedas.total), ouro: precoEmOuro(s.moedas.total) };
    // Carga: valor exato no cálculo; arredonda para cima só ao exibir (meio espaço ocupa 1)
    ctx.carga = { ...s.carga, usado: Math.ceil(s.carga.usado) };

    // Bloco Ataques (aba Características): só as armas empunhadas
    ctx.ataques = ctx.armas.filter(a => a.empunhada);
    const aviso = avisoEmpunhadura(actor.items.filter(i => i.type === "arma" && i.system.empunhada).map(i => i.system));
    ctx.avisoAtaques = aviso ? loc(`ICARUS.Armas.AvisoEmpunhadura.${aviso}`) : "";

    // Poderes agrupados por fonte (Raça primeiro, com o ícone da raça)
    const poderes = actor.items.filter(i => i.type === "poder").sort((a, b) => (a.sort || 0) - (b.sort || 0));
    const subtitulo = { raca: ctx.raca.nome, classe: classe?.nome ?? src.identidade.classe, origem: origemPorId(src.identidade.origem)?.nome ?? src.identidade.origem, profissao: src.identidade.profissao, divindade: div?.nome ?? outra };
    ctx.gruposPoder = await Promise.all(FONTES_PODER.map(async fonte => {
      const lista = poderes.filter(p => p.system.fonte === fonte);
      const nomeFonte = loc(`ICARUS.Poderes.Fontes.${fonte}`);
      const titulo = fonte === "geral" ? loc("ICARUS.Poderes.Gerais") : [nomeFonte, subtitulo[fonte]].filter(Boolean).join(" — ");
      return {
        fonte,
        titulo,
        ehRaca: fonte === "raca",
        icone: fonte === "raca" && raca ? ctx.raca.icone : fonte === "divindade" && div ? ctx.divindade.simbolo : fonte === "classe" && classe ? ctx.classe.icone : "",
        tag: fonte === "classe"
          ? game.i18n.format("ICARUS.Poderes.TagNivel", { nivel: s.nivel })
          : game.i18n.format(lista.length === 1 ? "ICARUS.Poderes.ContaUm" : "ICARUS.Poderes.Conta", { n: lista.length }),
        vazio: game.i18n.format("ICARUS.Poderes.Vazio", { fonte: nomeFonte.toLowerCase() }),
        poderes: await Promise.all(lista.map(async p => {
          const flags = p.flags?.[SISTEMA_ID] ?? {};
          return {
            id: p.id, name: p.name, img: p.img,
            mostrarIcone: fonte === "raca" || fonte === "divindade" || fonte === "classe",
            concedido: !!flags.concedido,
            auto: ehPoderRacialAuto(p),
            pendente: ehPoderRacialAuto(p) && flags.pendente === true,
            custo: p.system.custoPM ?? null,
            // Usar: poderes com ação (não passivos) ou com custo em PM
            usavel: (p.system.acao && p.system.acao !== "passivo") || !!p.system.custoPM,
            // Escolha do poder/habilidade de classe (Aumento de Atributo, Caminho…): pendente ou alterável
            escolhaPendente: escolhaPendente(p),
            escolhaAlteravel: !escolhaPendente(p) && !!entradaDoItem(p).entrada?.escolha && (!entradaDoItem(p).entrada.escolha.permanente || game.user.isGM),
            usarDica: [p.system.acao ? loc(`ICARUS.Poderes.Acoes.${p.system.acao}`) : "", p.system.acao === "reacao" ? textoReacao(actor) : ""].filter(Boolean).join(" · "),
            meta: [
              p.system.nivel ? game.i18n.format("ICARUS.Poderes.NivelN", { n: p.system.nivel }) : "",
              p.system.prerequisito ? `${loc("ICARUS.Poderes.Prerequisito")}: ${p.system.prerequisito}` : ""
            ].filter(Boolean).join(" · "),
            descricao: await TextEditor.enrichHTML(p.system.descricao, { async: true, secrets: actor.isOwner, relativeTo: p })
          };
        }))
      };
    }));

    // Efeitos Ativos do personagem e dos itens que transferem efeitos
    ctx.efeitos = Array.from(actor.allApplicableEffects()).map(e => ({
      id: e.id,
      parentId: e.parent === actor ? "" : e.parent.id,
      name: e.name,
      img: e.img,
      descricao: e.description ?? "",
      ativo: !e.disabled,
      origem: e.parent === actor ? "" : e.parent.name,
      mudancas: e.changes.length
        ? e.changes.map(c => this._descreverMudanca(c)).join(" · ")
        : loc("ICARUS.Efeitos.SemAlteracao")
    }));
    ctx.chavesEfeito = chavesDeEfeito().join(", ");

    const enriquecer = html => TextEditor.enrichHTML(html, { async: true, secrets: actor.isOwner, relativeTo: actor });
    ctx.notasHTML = await enriquecer(src.notas);
    ctx.diarioHTML = await enriquecer(src.diario);
    return ctx;
  }

  /** Linha de uma arma no Inventário e no bloco Ataques. */
  _linhaDaArma(item, itens) {
    const loc = k => game.i18n.localize(k);
    const a = item.system;
    const s = this.actor.system;
    const principal = a.modos[0];
    const atq = calcularAtaque(s, a, principal, itens);
    let municao = "";
    if (a.grupo === "fogo") {
      municao = `${a.carregados}/${a.capacidadeDisparos} · ${totalMunicao(itens, a.municaoTipo || "balas")} ${loc(`ICARUS.Municao.Tipos.${a.municaoTipo || "balas"}`)}`;
    } else if (a.municaoTipo) {
      municao = `${totalMunicao(itens, a.municaoTipo)} ${loc(`ICARUS.Municao.Tipos.${a.municaoTipo}`)}`;
    }
    const semArma = a.quantidade < 1;
    return {
      id: item.id, name: item.name, img: item.img,
      quantidade: a.quantidade,
      qtdTexto: a.quantidade === 1 ? "" : ` ×${a.quantidade}`,
      ataque: comSinal(atq.bonus),
      ataqueDica: `${loc(`ICARUS.Pericias.${atq.pericia}`)}${atq.agil ? ` · ${loc("ICARUS.Armas.Card.Agil")}` : ""}`,
      dano: calcularDano(s, a, principal).texto,
      critico: a.textoCritico,
      alcance: [a.alcance, a.alcanceArremesso].filter(Boolean).map(k => loc(`ICARUS.Armas.Alcances.${k}`)).join(" / "),
      municao,
      empunhada: a.empunhada,
      semProficiencia: !a.proficiente,
      esmaecida: semArma,
      // Botões: Atacar (corpo a corpo) só com a arma na mão; Arremessar / Disparar conforme o modo
      modos: a.modos.map(m => ({ modo: m, rotulo: loc(`ICARUS.Armas.Botoes.${m}`), desligado: semArma })),
      ehFogo: a.grupo === "fogo",
      espacos: espacosDoItem(item),
      preco: { texto: formatarPreco(a.preco), ouro: precoEmOuro(a.preco) }
    };
  }

  /** Nome legível de uma chave de efeito ("Fortitude · Outros"). */
  _nomeDaChave(chave) {
    const loc = k => game.i18n.localize(k);
    const p = chave.replace(/^system\./, "").split(".");
    if (p[0] === "atributos") return `${p[1]} · Temp`;
    if (p[0] === "defesa") return `${loc("ICARUS.Defesa.Rotulo")} · ${loc("ICARUS.Defesa.Outros")}`;
    if (p[0] === "pericias") {
      const campo = { outros: "ICARUS.Defesa.Outros", treino: "ICARUS.Pericia.Treino", atributo: "ICARUS.Pericia.Atributo" }[p[2]];
      return `${loc(`ICARUS.Pericias.${p[1]}`)} · ${campo ? loc(campo) : p[2]}`;
    }
    if (p[0] === "classeConfig") return loc(`ICARUS.NivelDialogo.Campos.${p[1]}`);
    if (p[0] === "deslocamento") return loc("ICARUS.Deslocamento");
    if (p[0] === "resistencias") {
      if (p[1] === "rdGeral") return loc("ICARUS.Resistencias.RdGeral");
      const campo = { reducao: "ICARUS.Resistencias.Reducao", imunidade: "ICARUS.Resistencias.Imune", vulnerabilidade: "ICARUS.Resistencias.Vulneravel" }[p[1]];
      return `${loc(campo)} · ${loc(`ICARUS.TiposDano.${p[2]}`)}`;
    }
    if (p[0] === "tamanho") return loc("ICARUS.Outras.Tamanho");
    return chave;
  }

  /** Valor de uma mudança como texto: "+2", "= 12", "Especialista". */
  _valorDaMudanca(change) {
    const modos = CONST.ACTIVE_EFFECT_MODES;
    if (change.key.endsWith(".treino")) return game.i18n.localize(`ICARUS.Treino.${numero(change.value)}`);
    if (change.key === "system.tamanho") return game.i18n.localize(`ICARUS.Tamanhos.${change.value}`);
    if (change.mode === modos.ADD) return comSinal(numero(change.value));
    if (change.mode === modos.OVERRIDE) return `= ${change.value}`;
    if (change.mode === modos.UPGRADE) return `≥ ${change.value}`;
    return String(change.value);
  }

  _descreverMudanca(change) {
    return `${this._nomeDaChave(change.key)} ${this._valorDaMudanca(change)}`;
  }

  /** Mapa chave → ["+2 Couro Brutal", …] com os efeitos ativos. */
  _origensDosEfeitos() {
    const origens = {};
    for (const efeito of this.actor.allApplicableEffects()) {
      if (efeito.disabled || efeito.isSuppressed) continue;
      for (const c of efeito.changes) (origens[c.key] ??= []).push(`${this._valorDaMudanca(c)} ${efeito.name}`);
    }
    return origens;
  }

  activateListeners(html) {
    super.activateListeners(html);
    // Rolar é permitido a quem é dono da ficha, mesmo com ela travada
    if (this.actor.isOwner) {
      // Shift = vantagem, Ctrl = desvantagem
      html.on("click", "[data-action='rolar-pericia']", ev => rolarPericia(this.actor, ev.currentTarget.dataset.pericia, modoDoEvento(ev)));
      html.on("click", "[data-action='rolar-atributo']", ev => rolarAtributo(this.actor, ev.currentTarget.dataset.atributo, modoDoEvento(ev)));
      // Armas: atacar, dano e recarregar também valem com a ficha travada
      const armaDe = el => this.actor.items.get(el.closest("[data-item-id]")?.dataset.itemId);
      html.on("click", "[data-action='arma-atacar']", ev => {
        const item = armaDe(ev.currentTarget);
        if (item) rolarAtaque(this.actor, item, ev.currentTarget.dataset.modo, modoDoEvento(ev));
      });
      html.on("click", "[data-action='arma-dano']", async ev => {
        const item = armaDe(ev.currentTarget);
        if (!item) return;
        await rolarDano(this.actor, item, item.system.modos[0]);
        // O dano do último ataque com essa arma já foi rolado: desativa os botões de dano do card
        await marcarDanoNoUltimoAtaque(this.actor, item);
      });
      html.on("click", "[data-action='arma-recarregar']", ev => {
        const item = armaDe(ev.currentTarget);
        if (item) recarregar(this.actor, item);
      });
    }
    // Clicar no card do poder abre a ficha do item (fora dos botões)
    html.on("click", "[data-abrir-item]", ev => {
      if (ev.target.closest("button, a, input, select")) return;
      this.actor.items.get(ev.currentTarget.dataset.itemId)?.sheet.render(true);
    });
    if (!this.isEditable) return;
    html.on("click", "[data-action]", this._onAcao.bind(this));
    // Recursos de classe: nome, máximo e recarga editados na linha
    html.on("change", "[data-recurso-campo]", ev => {
      const el = ev.currentTarget;
      const id = el.closest("[data-recurso-id]")?.dataset.recursoId;
      const campo = el.dataset.recursoCampo;
      const valor = campo === "max" ? Math.max(0, Math.trunc(numero(el.value))) : el.value;
      if (id) alterarRecurso(this.actor, id, { [campo]: valor });
    });
    // Campos de item editados direto na ficha (ex.: quantidade de munição)
    html.on("change", "[data-item-campo]", ev => {
      const el = ev.currentTarget;
      const item = this.actor.items.get(el.closest("[data-item-id]")?.dataset.itemId);
      if (item) item.update({ [el.dataset.itemCampo]: Math.max(0, Math.trunc(numero(el.value))) });
    });
    // Condições: clique direito no chip → Remover / Escalar
    new ContextMenu(html, ".chip-condicao", [
      { name: "ICARUS.Condicoes.Remover", icon: '<i class="fa-solid fa-xmark"></i>', callback: li => removerCondicao(this.actor, (li[0] ?? li).dataset.condicao) },
      { name: "ICARUS.Condicoes.Escalar", icon: '<i class="fa-solid fa-angles-up"></i>', condition: li => !!CONDICAO_POR_ID[(li[0] ?? li).dataset.condicao]?.escala, callback: li => escalarCondicao(this.actor, (li[0] ?? li).dataset.condicao) }
    ]);
    ligarArvoreDivindade(html instanceof HTMLElement ? html : html[0], valor => trocarDivindade(this.actor, valor));
    html.on("change", ".sel-classe", async ev => {
      const valor = ev.currentTarget.value;
      let mudou = false;
      if (valor === "__outra__") {
        const texto = await foundry.applications.api.DialogV2.prompt({
          window: { title: game.i18n.localize("ICARUS.Classe.Outra") },
          content: `<input type="text" name="classe" autofocus placeholder="${game.i18n.localize("ICARUS.Classe.OutraDica")}">`,
          ok: { label: game.i18n.localize("ICARUS.Devocao.Confirmar"), callback: (e, b) => b.form.elements.classe.value.trim() },
          rejectClose: false
        });
        if (texto) mudou = await classeLivre(this.actor, texto);
      } else if (valor === "") {
        mudou = await classeLivre(this.actor, "");
      } else if (classePorId(valor)) {
        mudou = await aplicarClasse(this.actor, valor);
      }
      if (!mudou) this.render(false);
    });
    html.on("change", ".sel-origem", async ev => {
      const mudou = await trocarOrigem(this.actor, ev.currentTarget.value);
      if (!mudou) this.render(false);  // cancelou: volta a combobox para a origem atual
    });
    html.on("change", ".sel-raca", async ev => {
      const mudou = await trocarRaca(this.actor, ev.currentTarget.value);
      if (!mudou) this.render(false);  // cancelou: volta a combobox para a raça atual
    });
  }

  /** Botões com data-action (exceto rolagens, tratadas acima). */
  async _onAcao(event) {
    const el = event.currentTarget;
    const acao = el.dataset.action;
    const actor = this.actor;
    const s = actor.system;
    const itemDe = () => actor.items.get(el.closest("[data-item-id]")?.dataset.itemId);
    switch (acao) {
      case "nivel": {
        const novo = limitar(s.nivel + Number(el.dataset.delta), 1, 25);
        if (novo > s.nivel && classePorId(actor._source.system.identidade.classe)) {
          const { abrirAssistenteDeNivel } = await import("./dialogo-subir-nivel.mjs");
          return abrirAssistenteDeNivel(actor, { de: s.nivel, ate: novo });
        }
        return actor.update({ "system.nivel": novo });
      }
      case "recurso": {
        const k = el.dataset.recurso;
        return actor.update({ [`system.${k}.value`]: limitar(s[k].value + Number(el.dataset.delta), 0, s[k].max) });
      }
      case "treino": {
        const k = el.dataset.pericia;
        // Cicla 0 → 1 → 2 → 0 o treino salvo, sem bloquear; Efeitos (UPGRADE) agem por cima
        return actor.update({ [`system.pericias.${k}.treino`]: (actor._source.system.pericias[k].treino + 1) % 3 });
      }
      case "prof-alternar": {
        const lista = el.dataset.lista, valor = el.dataset.valor;
        const atual = new Set(actor._source.system.proficiencias[lista] ?? []);
        if (atual.has(valor)) atual.delete(valor); else atual.add(valor);
        return actor.update({ [`system.proficiencias.${lista}`]: [...atual] });
      }
      case "abrir-nivel":
        return new DialogoNivel(actor).render(true);
      case "raca-reaplicar":
        return reaplicarRaca(actor);
      case "raca-escolhas":
        return refazerEscolhas(actor);
      case "morte-rolar":
        return rolarTesteDeMorte(actor, modoDoEvento(event));
      case "morte-dano":
        return registrarDanoEmMorrendo(actor, el.dataset.critico === "1");
      case "morte-estabilizar":
        return estabilizarComCura(actor);
      case "morte-marca": {
        // Clicar na bolinha marca até ela; clicar na última marcada desmarca
        const tipo = el.dataset.tipo, n = Number(el.dataset.n);
        const atual = actor.system.morte[tipo];
        return actor.update({ [`system.morte.${tipo}`]: atual === n ? n - 1 : n });
      }
      case "condicao-adicionar":
        return new PainelCondicoes({ actor }).render(true);
      case "divindade-poderes":
        return new DialogoPoderesConcedidos(actor, actor._source.system.identidade.divindade).render(true);
      case "poder-escolha":
        return resolverEscolha(actor, itemDe());
      case "poder-usar":
        return usarPoder(actor, itemDe());
      case "reacao-alternar":
        return alternarReacao(actor);
      case "recurso-classe-novo":
        return adicionarRecurso(actor);
      case "recurso-classe-sugerir":
        return sugerirRecursos(actor);
      case "recurso-classe-descanso":
        return recarregarRecursos(actor, "descanso");
      case "recurso-novo-dia":
        return recarregarRecursos(actor, "dia");
      case "recurso-nova-cidade":
        return recarregarRecursos(actor, "cidade");
      case "recurso-recarregar": {
        const id = el.closest("[data-recurso-id]")?.dataset.recursoId;
        const r = s.recursos.find(x => x.id === id);
        return r ? alterarRecurso(actor, id, { valor: r.max }) : null;
      }
      case "recurso-classe-excluir":
        return removerRecurso(actor, el.closest("[data-recurso-id]")?.dataset.recursoId);
      case "recurso-classe-delta": {
        const id = el.closest("[data-recurso-id]")?.dataset.recursoId;
        const r = s.recursos.find(x => x.id === id);
        return r ? alterarRecurso(actor, id, { valor: r.valor + Number(el.dataset.delta) }) : null;
      }
      case "classe-mecanica": {
        const fn = acaoDaMecanica(el.dataset.mecanica);
        return fn ? fn(actor) : null;
      }
      case "origem-reaplicar":
        return reaplicarOrigem(actor);
      case "origem-desfazer":
        return desfazerTrocaDeOrigem(actor);
      case "classe-desfazer":
        return desfazerTrocaDeClasse(actor);
      case "classe-poder": {
        const { DialogoPoderesClasse } = await import("./dialogo-poderes-classe.mjs");
        return new DialogoPoderesClasse(actor).render(true);
      }
      case "manobra":
        return abrirManobra(actor);
      case "aguardar":
        return aguardar(actor);
      case "aguardar-disparar":
        return dispararAguardar(actor);
      case "poder-chat":
        return this._enviarPoderAoChat(itemDe());
      case "item-criar": {
        const tipo = el.dataset.tipo;
        const dados = {
          name: game.i18n.localize(tipo === "poder" ? "ICARUS.Poderes.Novo" : "ICARUS.Equipamento.Novo"),
          type: tipo,
          system: tipo === "poder" ? { fonte: el.dataset.fonte || "geral" } : {}
        };
        const [item] = await actor.createEmbeddedDocuments("Item", [dados]);
        return item?.sheet.render(true);
      }
      case "item-novo":
        return novoItem(actor);
      case "item-duplicar": {
        const item = itemDe();
        if (!item) return;
        const dados = item.toObject();
        delete dados._id;
        return actor.createEmbeddedDocuments("Item", [dados]);
      }
      case "arma-empunhar": {
        const item = itemDe();
        return item?.update({ "system.empunhada": !item.system.empunhada });
      }
      case "municao-delta": {
        const item = itemDe();
        return item?.update({ "system.quantidade": Math.max(0, item.system.quantidade + Number(el.dataset.delta)) });
      }
      case "item-editar":
        return itemDe()?.sheet.render(true);
      case "item-excluir":
        return this._confirmarExclusao(itemDe());
      case "item-equipar": {
        const item = itemDe();
        // Armadura e túnica contam no Limite de Vestimentas (escudo não)
        if (item && ehVestimenta(item)) return alternarVestido(actor, item);
        return item?.update({ "system.equipado": !item.system.equipado });
      }
      case "item-vestir":
        return alternarVestido(actor, itemDe());
      case "item-usar":
        return usarItemComum(actor, itemDe());
      case "efeito-criar": {
        const [efeito] = await actor.createEmbeddedDocuments("ActiveEffect", [{
          name: game.i18n.localize("ICARUS.Efeitos.Novo"),
          img: "icons/svg/aura.svg",
          origin: actor.uuid
        }]);
        return efeito?.sheet.render(true);
      }
      case "efeito-editar":
        return this._efeitoDe(el)?.sheet.render(true);
      case "efeito-excluir":
        return this._confirmarExclusao(this._efeitoDe(el));
      case "efeito-alternar": {
        const efeito = this._efeitoDe(el);
        return efeito?.update({ disabled: !efeito.disabled });
      }
    }
  }

  /** Botão "Enviar ao chat" dos cards de poder: nome, metadados e descrição. */
  async _enviarPoderAoChat(item) {
    if (!item) return;
    const descricao = await TextEditor.enrichHTML(item.system.descricao, { async: true, relativeTo: item });
    const custo = item.system.custoPM ? `<span class="custo">${item.system.custoPM} PM</span>` : "";
    const content = `<div class="icarus-rolagem icarus-poder"><div class="arma-cab"><img src="${item.img}" alt="" width="36" height="36"><div><h3 class="rolagem-nome">${Handlebars.escapeExpression(item.name)}</h3><div class="rolagem-tipo">${Handlebars.escapeExpression(item.system.prerequisito || game.i18n.localize(`ICARUS.Poderes.Fontes.${item.system.fonte}`))} ${custo}</div></div></div><div class="poder-descricao">${descricao}</div></div>`;
    return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), content });
  }

  _efeitoDe(el) {
    const linha = el.closest("[data-effect-id]");
    if (!linha) return null;
    const dono = linha.dataset.parentId ? this.actor.items.get(linha.dataset.parentId) : this.actor;
    return dono?.effects.get(linha.dataset.effectId);
  }

  async _confirmarExclusao(doc) {
    if (!doc) return;
    const nome = Handlebars.escapeExpression(doc.name);
    const aviso = ehPoderRacialAuto(doc) ? `<p>${game.i18n.localize("ICARUS.Racas.ExcluirAuto")}</p>` : "";
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("ICARUS.Acoes.ExcluirTitulo") },
      content: `<p>${game.i18n.format("ICARUS.Acoes.ExcluirConfirmar", { nome })}</p>${aviso}`,
      rejectClose: false
    });
    if (ok) return doc.delete();
  }

  /**
   * Item solto na ficha. Vindo de um compêndio e com preço: pergunta se entra grátis ou comprado.
   * Munição do mesmo tipo soma na quantidade existente. Reordenar dentro da ficha segue o padrão.
   */
  async _onDropItem(event, data) {
    if (!this.actor.isOwner) return false;
    const item = await Item.implementation.fromDropData(data);
    if (!item) return false;
    if (item.parent?.uuid === this.actor.uuid) return super._onDropItem(event, data);
    let dados = item.toObject();
    delete dados._id;
    // Item comum com escolha de bônus ou texto livre: pergunta antes de criar
    const comum = dados.type === "equipamento" && dados.system?.tipo === "item-comum" ? itemComumPorId(dados.flags?.[SISTEMA_ID]?.id) : null;
    if (comum) {
      const escolhas = await escolhasDoItemComum(comum);
      if (!escolhas) return false;
      const base = itemComumComEscolhas(comum, escolhas, { img: dados.img });
      dados = { ...dados, name: base.name, flags: foundry.utils.mergeObject(dados.flags ?? {}, base.flags), system: { ...dados.system, origemItem: false } };
      delete dados.flags[SISTEMA_ID].assinatura;
    }
    let comprar = false;
    if (item.pack && precoDoItem(dados) > 0) {
      const escolha = await perguntarCompra(this.actor, dados);
      if (!escolha) return false;
      comprar = escolha === "comprar";
    }
    return adicionarItem(this.actor, dados, { comprar });
  }

  /** PV e PM digitados ficam entre 0 e o máximo. */
  async _updateObject(event, formData) {
    for (const k of ["pv", "pm"]) {
      const chave = `system.${k}.value`;
      if (chave in formData) formData[chave] = limitar(numero(formData[chave]), 0, this.actor.system[k].max);
    }
    return super._updateObject(event, formData);
  }
}
