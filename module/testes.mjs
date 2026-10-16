/**
 * Teste Oposto e Teste de Resistência: lógica pura (sem Foundry), testada em tests/testes.test.mjs.
 *
 * O Mestre que inicia o teste é o anfitrião: guarda o estado autoritativo da sessão e é o único
 * que aceita rolagens. O estado é um objeto simples, enviado por socket a todos os clientes:
 * {
 *   sessaoId, tipo: "oposto"|"resistencia", gmId, status: "rolando"|"resolvido",
 *   resistencia?: { pericia, cd, origem, conjurador, observacao },
 *   participantes: [{ id, uuid, nome, img, donos: [userId], jogadores: [nome],
 *                     item: { tipo, chave }, bonus, detalhes, falhaAuto, resultado }],
 *   resolucao: null | { ... }
 * }
 */
import { ATRIBUTOS, PERICIAS } from "./config.mjs";
import { numero } from "./regras.mjs";
import { resolverOposto } from "./combate.mjs";

export const PERICIAS_RESISTENCIA = ["fortitude", "reflexos", "vontade"];

/**
 * Bônus de um atributo ou perícia lido da ficha (nunca recalculado aqui):
 * - atributo: total do atributo (base + raça + temporário; o valor já é o modificador). Sem treino.
 * - perícia: total da perícia (atributo + treino + outros, já com armadura e condições).
 * detalhes = parcelas para a dica ({ chave, valor, origem? }); a interface traduz as chaves.
 */
export function bonusDoItem(system, item) {
  if (item?.tipo === "atributo") {
    const a = system?.atributos?.[item.chave];
    if (!a) return null;
    const detalhes = [
      { chave: "base", valor: numero(a.base) },
      { chave: "racial", valor: numero(a.racial) },
      { chave: "temp", valor: numero(a.temp) }
    ].filter(d => d.valor !== 0);
    return { bonus: numero(a.total), detalhes, falhaAuto: null };
  }
  if (item?.tipo === "pericia") {
    const p = system?.pericias?.[item.chave];
    if (!p) return null;
    const detalhes = [
      { chave: "atributo", valor: numero(system.atributos?.[p.atributo]?.total), origem: p.atributo },
      { chave: "treino", valor: numero(p.bonusTreino) },
      { chave: "outros", valor: numero(p.outros) },
      { chave: "armadura", valor: -numero(p.penalidadeArmadura) },
      { chave: "condicao", valor: numero(p.condicao), origem: p.origemCondicao || undefined }
    ].filter(d => d.valor !== 0 || d.chave === "atributo");
    return { bonus: numero(p.total), detalhes, falhaAuto: p.falhaAuto || null };
  }
  return null;
}

/** Itens que podem ser testados, na ordem da árvore: atributos e perícias (alfabética). */
export function itensDeTeste() {
  return {
    atributos: ATRIBUTOS.map(chave => ({ tipo: "atributo", chave })),
    pericias: PERICIAS.map(p => ({ tipo: "pericia", chave: p.chave, nome: p.nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
  };
}

/**
 * Quem pode rolar o dado de um participante.
 * - Com dono jogador: só os donos jogadores (o Mestre só se a opção estiver ligada).
 * - Sem dono jogador (NPC/Ameaça): só o Mestre.
 * @returns {{ pode: boolean, peloMestre: boolean }}
 */
export function podeRolar(participante, usuario, { mestreRolaPorJogador = false } = {}) {
  if (!usuario) return { pode: false, peloMestre: false };
  const donos = participante?.donos ?? [];
  if (donos.length) {
    if (donos.includes(usuario.id)) return { pode: true, peloMestre: false };
    if (usuario.isGM && mestreRolaPorJogador) return { pode: true, peloMestre: true };
    return { pode: false, peloMestre: false };
  }
  return { pode: !!usuario.isGM, peloMestre: false };
}

/** Todos os participantes já têm resultado (rolado ou falha automática). */
export const todosRolaram = estado => estado.participantes.every(p => p.resultado);

/** Falha automática vira resultado na criação da sessão (sem rolar). */
export function resultadoInicial(participante) {
  return participante.falhaAuto ? { falhaAuto: participante.falhaAuto, d20: null, bonus: participante.bonus, total: null } : null;
}

/**
 * Registra a rolagem de um participante (só o anfitrião chama).
 * Valida: sessão aberta, participante existe e ainda não rolou, permissão do usuário,
 * d20 entre 1 e 20 e total = d20 + bônus da sessão (o cliente não escolhe o próprio bônus).
 * @returns {{ estado?: object, erro?: string }}
 */
export function registrarRolagem(estado, { participanteId, d20, total }, usuario, opcoes = {}) {
  if (!estado || estado.status !== "rolando") return { erro: "sessao" };
  const p = estado.participantes.find(x => x.id === participanteId);
  if (!p) return { erro: "participante" };
  if (p.resultado) return { erro: "jaRolou" };
  const permissao = podeRolar(p, usuario, opcoes);
  if (!permissao.pode) return { erro: "permissao" };
  const dado = Number(d20);
  if (!Number.isInteger(dado) || dado < 1 || dado > 20) return { erro: "dado" };
  if (Number(total) !== dado + p.bonus) return { erro: "total" };
  const novo = structuredClone(estado);
  novo.participantes.find(x => x.id === participanteId).resultado = {
    d20: dado, bonus: p.bonus, total: dado + p.bonus, rolouPor: usuario.id, peloMestre: permissao.peloMestre, falhaAuto: null
  };
  return { estado: novo };
}

/** Passou no Teste de Resistência: total ≥ CD (falha automática nunca passa). */
export const passou = (resultado, cd) => !!resultado && !resultado.falhaAuto && resultado.total >= cd;

/** Resolve a sessão quando todos rolaram. Devolve um novo estado com status "resolvido". */
export function resolver(estado) {
  const novo = structuredClone(estado);
  if (novo.tipo === "oposto") {
    const [a, b] = novo.participantes.map(p => ({ ...p.resultado, bonus: p.bonus }));
    const r = resolverOposto(a, b);
    novo.resolucao = { ...r, vencedorId: r.vencedor ? novo.participantes[r.vencedor === "A" ? 0 : 1].id : null };
  } else {
    const cd = novo.resistencia.cd;
    for (const p of novo.participantes) p.passou = passou(p.resultado, cd);
    const passaram = novo.participantes.filter(p => p.passou).length;
    novo.resolucao = { passaram, falharam: novo.participantes.length - passaram };
  }
  novo.status = "resolvido";
  return novo;
}

/** Empate no Teste Oposto: zera os resultados (menos falhas automáticas) para rolar de novo. */
export function rolarNovamente(estado) {
  const novo = structuredClone(estado);
  for (const p of novo.participantes) p.resultado = resultadoInicial(p);
  novo.status = "rolando";
  novo.resolucao = null;
  novo.rodada = (novo.rodada ?? 1) + 1;
  return novo;
}
