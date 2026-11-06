/**
 * Botões de dano e cura do chat: regras puras (sem Foundry; tests/dano-aplicacao.test.mjs).
 * - Valor do botão: Aplicar = total; Metade = metade para baixo; Dobro = ×2; Curar = total.
 * - Ordem: valor da rolagem → metade/dobro → resistências por tipo de cada componente
 *   (imunidade, vulnerabilidade, redução do tipo) → RD geral UMA vez sobre a soma → mínimo 0.
 *   Com um só componente, dá exatamente o mesmo resultado de calcularDanoRecebido.
 * - Perda de PV ignora tudo (não é dano). Cura soma até o PV máximo.
 * - O Mestre recalcula tudo a partir da mensagem: o jogador só envia QUAL botão e QUAIS tokens.
 */
import { calcularDanoRecebido, textoDoDano } from "./combate.mjs";

export const ACOES = ["dano", "metade", "dobro", "cura", "perda"];
/** Maior total aceito numa rolagem (proteção contra valores absurdos). */
export const LIMITE_VALOR = 9999;
/** Máximo de tokens num pedido ao Mestre. */
export const LIMITE_ALVOS = 50;

const inteiro = v => (Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : NaN);

/** Valor que o botão aplica (antes das resistências), para a dica "Aplicar 7". */
export function valorDoBotao(total, acao) {
  const t = Math.max(0, inteiro(total) || 0);
  if (acao === "metade") return Math.floor(t / 2);
  if (acao === "dobro") return t * 2;
  return t;
}

/**
 * Componentes por tipo depois de metade/dobro. A soma bate com valorDoBotao(total):
 * na metade, cada parte é arredondada para baixo e a sobra volta às primeiras partes.
 * @param {{tipo:string, valor:number}[]} componentes
 */
export function componentesDoBotao(componentes, acao) {
  const lista = componentes.map(c => ({ tipo: c.tipo || "dano", valor: Math.max(0, inteiro(c.valor) || 0) }));
  if (acao === "dobro") return lista.map(c => ({ ...c, valor: c.valor * 2 }));
  if (acao !== "metade") return lista;
  const alvo = Math.floor(lista.reduce((s, c) => s + c.valor, 0) / 2);
  const meias = lista.map(c => ({ ...c, valor: Math.floor(c.valor / 2) }));
  let sobra = alvo - meias.reduce((s, c) => s + c.valor, 0);
  for (const c of meias) {
    if (sobra <= 0) break;
    c.valor++;
    sobra--;
  }
  return meias;
}

/**
 * Dano recebido com vários tipos: resistências por tipo em cada parte, RD geral uma vez na soma.
 * @returns {{ final:number, partes:{tipo:string, final:number, passos:object[]}[], rd:number, soma:number }}
 */
export function danoPorComponentes(resistencias, componentes, regras, { ignoraRD = false } = {}) {
  const semRD = { ...(resistencias ?? {}), rdGeral: 0 };
  const partes = componentes.map(c => {
    const r = calcularDanoRecebido(semRD, c.valor, c.tipo, regras, { ignoraRD });
    return { tipo: c.tipo, final: r.final, passos: r.passos };
  });
  const soma = partes.reduce((s, p) => s + p.final, 0);
  const rd = ignoraRD ? 0 : Math.max(0, inteiro(resistencias?.rdGeral) || 0);
  const minimo = regras?.minimo ?? 0;
  return { final: Math.max(minimo, soma - rd), partes, rd, soma };
}

/**
 * O que um botão faz num alvo.
 * @param {object} p
 * @param {string} p.acao            dano | metade | dobro | cura | perda
 * @param {{tipo,valor}[]} p.componentes  da mensagem (um só, se a rolagem tem um tipo)
 * @param {object} p.resistencias    system.resistencias do alvo (derivado, já com o teto de RD)
 * @param {{value:number,max:number}} p.pv
 * @param {object} [p.regras]        REGRAS_DANO
 * @param {(tipo:string)=>string} [p.nomeDoTipo]
 * @returns {{ modo:"dano"|"cura"|"perda", base:number, valor:number, final:number, antes:number, depois:number, detalhe:string, partes?:object[] }}
 */
export function calcularAplicacao({ acao, componentes, resistencias, pv, regras = { vulnerabilidadeMult: 1.5, minimo: 0 }, nomeDoTipo = t => t }) {
  const comps = componentes?.length ? componentes : [{ tipo: "dano", valor: 0 }];
  const base = comps.reduce((s, c) => s + Math.max(0, inteiro(c.valor) || 0), 0);
  const ajustados = componentesDoBotao(comps, acao);
  const valor = ajustados.reduce((s, c) => s + c.valor, 0);
  const antes = Math.max(0, inteiro(pv?.value) || 0);
  const max = Math.max(0, inteiro(pv?.max) || 0);
  const prefixo = acao === "metade" ? `${base} ÷ 2 = ${valor} → ` : acao === "dobro" ? `${base} × 2 = ${valor} → ` : "";

  if (acao === "cura") {
    const depois = Math.max(antes, Math.min(max, antes + valor));
    return { modo: "cura", base, valor, final: depois - antes, antes, depois, detalhe: `+${valor}${depois - antes < valor ? ` (máx. ${max})` : ""}` };
  }
  if (acao === "perda") {
    return { modo: "perda", base, valor, final: valor, antes, depois: Math.max(0, antes - valor), detalhe: `perde ${valor} PV` };
  }
  const r = danoPorComponentes(resistencias, ajustados, regras);
  let detalhe;
  if (r.partes.length === 1) {
    // Mesmo texto de sempre: "14 Corte → RD 3 → 11"
    const passos = [...r.partes[0].passos];
    if (r.rd) passos.push({ chave: "rd", valor: r.rd, resultado: r.final });
    detalhe = textoDoDano(passos, nomeDoTipo(r.partes[0].tipo));
  } else {
    // Por tipo: "6 Elétrico + 4 Impacto (Redução de impacto 2 → 2) = 8 → RD 3 → 5"
    const pedacos = r.partes.map(p => {
      const nome = nomeDoTipo(p.tipo);
      return p.passos.length > 1 ? `(${textoDoDano(p.passos, nome)})` : `${p.final} ${nome}`;
    });
    detalhe = `${pedacos.join(" + ")} = ${r.soma}${r.rd ? ` → RD ${r.rd} → ${r.final}` : ""}`;
  }
  return { modo: "dano", base, valor, final: r.final, antes, depois: Math.max(0, antes - r.final), detalhe: prefixo + detalhe, partes: r.partes };
}

/**
 * Valida o pedido que um jogador envia ao Mestre pelo socket. Devolve o pedido limpo ou null.
 * Os valores do dano NÃO vêm do jogador: o Mestre lê da mensagem do chat.
 */
export function validarPedido(msg) {
  if (!msg || typeof msg !== "object") return null;
  if (!ACOES.includes(msg.botao)) return null;
  if (typeof msg.mensagemId !== "string" || !/^[A-Za-z0-9]{1,32}$/.test(msg.mensagemId)) return null;
  if (!Array.isArray(msg.alvos) || !msg.alvos.length || msg.alvos.length > LIMITE_ALVOS) return null;
  const alvos = [...new Set(msg.alvos.filter(u => typeof u === "string" && /^Scene\.[A-Za-z0-9]{1,32}\.Token\.[A-Za-z0-9]{1,32}$/.test(u)))];
  if (alvos.length !== msg.alvos.length) return null;
  const origem = msg.origem === "alvos" ? "alvos" : "selecionados";
  return { botao: msg.botao, mensagemId: msg.mensagemId, alvos, origem };
}

/** Total e componentes válidos de uma mensagem (flags ou, se permitido, a rolagem crua). */
export function dadosDaMensagem(flags, rolagens = [], { qualquerRolagem = false } = {}) {
  const ok = v => Number.isFinite(v) && v >= 0 && v <= LIMITE_VALOR;
  const d = flags?.dano;
  if (d) {
    const total = inteiro(d.total);
    if (!ok(total)) return null;
    const rollType = d.rollType === "cura" ? "cura" : d.perda ? "perda" : "dano";
    let componentes = Array.isArray(d.componentes) && d.componentes.length
      ? d.componentes.map(c => ({ tipo: String(c?.tipo || "dano"), valor: inteiro(c?.valor) }))
      : [{ tipo: String(d.tipo || "dano"), valor: total }];
    if (componentes.some(c => !ok(c.valor))) componentes = [{ tipo: "dano", valor: total }];
    return { rollType, total, componentes, alvoUuid: typeof d.alvoUuid === "string" ? d.alvoUuid : null, critico: !!d.critico, manual: false };
  }
  if (!qualquerRolagem || !rolagens.length) return null;
  const total = inteiro(rolagens.reduce((s, r) => s + (Number(r?.total) || 0), 0));
  if (!ok(total)) return null;
  return { rollType: "dano", total, componentes: [{ tipo: "dano", valor: total }], alvoUuid: null, critico: false, manual: true };
}

/** Botões que a barra mostra para cada tipo de rolagem. */
export function botoesDaBarra(rollType, { dobro = false } = {}) {
  if (rollType === "cura") return ["cura"];
  if (rollType === "perda") return ["perda", "cura"];
  // "Perda de PV" continua nos cards de dano (já existia; ignora resistências)
  return ["dano", "metade", ...(dobro ? ["dobro"] : []), "cura", "perda"];
}

/** Última aplicação que ainda pode ser desfeita (índice), ou -1. */
export function ultimaDesfazivel(aplicacoes = []) {
  for (let i = aplicacoes.length - 1; i >= 0; i--) if (!aplicacoes[i]?.desfeita) return i;
  return -1;
}

/** Texto curto do registro: "Gelbin (−11)", "Lira (+8)". */
export function textoDoRegistro(a) {
  const diff = (a.depois ?? 0) - (a.antes ?? 0);
  const sinal = diff > 0 ? `+${diff}` : diff < 0 ? `−${-diff}` : "0";
  return `${a.alvo} (${sinal})`;
}
