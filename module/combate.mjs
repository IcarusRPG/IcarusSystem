/**
 * Regras de ataque e dano com armas (documento-núcleo, seção 14).
 * Funções puras (sem Foundry): a ficha usa para exibir o bônus e combate-chat.mjs para rolar.
 *
 * O combate ainda não foi fechado no núcleo. Tudo o que é PROVISÓRIO fica em REGRAS,
 * para trocar num lugar só quando a regra for definida.
 */
import { numero } from "./regras.mjs";
import { ALCANCE_METROS } from "./config.mjs";

export const REGRAS = {
  // [PROVISÓRIO] Corpo a corpo e arremesso somam FOR (total) ao dano; arcos, bestas, funda e
  // armas de fogo não somam atributo. Ágil troca só o atributo do ataque, não o do dano.
  danoSomaFOR: { "corpo-a-corpo": true, arremesso: true, distancia: false, fogo: false },
  // [PROVISÓRIO] Crítico multiplica tudo: (dados + bônus fixos) × multiplicador, numa rolagem só.
  criticoMultiplicaTudo: true,
  // [PROVISÓRIO] Sem acerto automático: o card só compara com a Defesa se houver exatamente 1 alvo.
  acertoAutomatico: false,
  // [PROVISÓRIO] Sem proficiência na arma: só um aviso, sem penalidade numérica (valor não definido).
  penalidadeSemProficiencia: 0,
  // Ganchos ainda não implementados: duas armas (−2, Ataque Duplo/Ambidestria), Arma Dupla completa,
  // dano desarmado e armas naturais, efeitos de poderes sobre armas (ex.: Tradição da Forja).
  duasArmas: null
};

/** Perícia de cada modo: corpo a corpo usa Luta; distância, arremesso e fogo usam Pontaria. */
export const PERICIA_DO_MODO = { "corpo-a-corpo": "luta", arremesso: "pontaria", distancia: "pontaria", fogo: "pontaria" };

const tem = (arma, prop) => (arma.propriedades ?? []).includes(prop);

/** Modos de ataque que a arma permite (botões na linha da arma). */
export function modosDeAtaque(arma) {
  if (arma.grupo === "fogo") return ["fogo"];
  if (arma.grupo === "distancia") return tem(arma, "arremesso") ? ["arremesso"] : ["distancia"];
  return tem(arma, "arremesso") ? ["corpo-a-corpo", "arremesso"] : ["corpo-a-corpo"];
}

/** Proficiência: "auto" = só armas simples (todo personagem tem proficiência com armas simples). */
export function ehProficiente(arma) {
  if (arma.proficiencia === "sim") return true;
  if (arma.proficiencia === "nao") return false;
  return arma.categoria === "simples";
}

/**
 * Penalidade de armadura nos testes de ataque.
 * Regra confirmada (núcleo, seção 14): sem proficiência em ARMADURA, a penalidade de armadura
 * vale também nos testes de ataque. Fica em 0 até existir o compêndio de armaduras com penalidade.
 */
export function penalidadeDeAtaque(_system, _itens = []) {
  return 0;
}

/**
 * Bônus do teste de ataque = total da perícia (com Ágil) + bônus do item + penalidade de armadura.
 * Ágil: no corpo a corpo, permite usar DES em vez de FOR em Luta (só quando Luta usa FOR na ficha;
 * se o jogador trocou o atributo da perícia, a troca é respeitada). Usa DES quando ela for maior.
 *
 * @param {object} system  system do personagem já preparado (totais calculados)
 * @param {object} arma    system da arma
 * @param {string} modo    "corpo-a-corpo" | "arremesso" | "distancia" | "fogo"
 */
export function calcularAtaque(system, arma, modo, itens = []) {
  const pericia = PERICIA_DO_MODO[modo] ?? "luta";
  const dadosPericia = system.pericias[pericia];
  let base = numero(dadosPericia.total);
  let agil = false;
  if (modo === "corpo-a-corpo" && tem(arma, "agil") && dadosPericia.atributo === "FOR") {
    const FOR = numero(system.atributos.FOR.total), DES = numero(system.atributos.DES.total);
    if (DES > FOR) { base = base - FOR + DES; agil = true; }
  }
  const proficiente = ehProficiente(arma);
  const bonus = base + numero(arma.bonusAtaque) + penalidadeDeAtaque(system, itens)
    + (proficiente ? 0 : REGRAS.penalidadeSemProficiencia);
  return { pericia, bonus, agil, proficiente };
}

/**
 * Fórmula de dano.
 * - duasMaos: usa danoExtra quando a arma tem dano de duas mãos (Espada bastarda, Katana).
 * - outraExtremidade: usa danoExtra da arma Dupla (Bordão, Corrente de espinhos).
 * - critico: (dados + bônus fixos) × multiplicador.
 * @returns {{ dado: string, partes: {rotulo:string, valor:number}[], formula: string, texto: string }}
 */
export function calcularDano(system, arma, modo, { duasMaos = false, outraExtremidade = false, critico = false } = {}) {
  const dupla = tem(arma, "dupla");
  let dado = arma.dano || "0";
  if (arma.danoExtra && ((dupla && outraExtremidade) || (!dupla && duasMaos))) dado = arma.danoExtra;

  const partes = [];
  const FOR = numero(system.atributos.FOR.total);
  if (REGRAS.danoSomaFOR[modo] && FOR !== 0) partes.push({ rotulo: "FOR", valor: FOR });
  if (numero(arma.bonusDano)) partes.push({ rotulo: "item", valor: numero(arma.bonusDano) });

  const fixos = partes.map(p => `${p.valor < 0 ? "-" : "+"} ${Math.abs(p.valor)}`).join(" ");
  const textoFixos = partes.map(p => `${p.valor < 0 ? "−" : "+"} ${Math.abs(p.valor)} (${p.rotulo})`).join(" ");
  let formula = fixos ? `${dado} ${fixos}` : dado;
  let texto = textoFixos ? `${dado} ${textoFixos}` : dado;
  if (critico) {
    const mult = Math.max(2, Math.trunc(numero(arma.criticoMult)) || 2);
    formula = REGRAS.criticoMultiplicaTudo ? `(${formula}) * ${mult}` : formula;
    texto = `(${texto}) × ${mult}`;
  }
  return { dado, partes, formula, texto };
}

/** Ameaça de crítico: d20 natural ≥ margem. */
export function ehAmeaca(d20, arma) {
  return numero(d20) >= (numero(arma.criticoMargem) || 20);
}

/** "19/x2" */
export function textoCritico(arma) {
  return `${numero(arma.criticoMargem) || 20}/x${numero(arma.criticoMult) || 2}`;
}

/** Faixa da ameaça: "19–20 ×2" ou "20 ×3". */
export function faixaCritico(arma) {
  const m = numero(arma.criticoMargem) || 20;
  return `${m < 20 ? `${m}–20` : "20"} ×${numero(arma.criticoMult) || 2}`;
}

/** Chaves de alcance para exibir: principal e, se houver, o de arremesso. */
export function alcancesDaArma(arma) {
  const lista = [arma.alcance || "corpo-a-corpo"];
  if (arma.alcanceArremesso) lista.push(arma.alcanceArremesso);
  return lista.map(chave => ({ chave, metros: ALCANCE_METROS[chave] ?? null }));
}

/** Alcance usado num modo (o arremesso de arma corpo a corpo usa alcanceArremesso). */
export function alcanceDoModo(arma, modo) {
  if (modo === "arremesso" && arma.grupo === "corpo-a-corpo") return arma.alcanceArremesso || "curto";
  return arma.alcance || "corpo-a-corpo";
}

/* ------------------------------ Munição, recarga e arremesso ------------------------------ */

/**
 * Pacote de munição a gastar: o escolhido em municaoUsada (se for do tipo certo e tiver unidades)
 * ou o primeiro do tipo com quantidade > 0.
 * @param {{id:string, type:string, system:object}[]} itens
 */
export function escolherMunicao(itens, arma) {
  if (!arma.municaoTipo) return null;
  const doTipo = itens.filter(i => i.type === "municao" && i.system.tipo === arma.municaoTipo);
  const escolhida = doTipo.find(i => i.id === arma.municaoUsada && numero(i.system.quantidade) > 0);
  return escolhida ?? doTipo.find(i => numero(i.system.quantidade) > 0) ?? null;
}

/** Total de unidades de um tipo de munição no inventário. */
export function totalMunicao(itens, tipo) {
  return itens.filter(i => i.type === "municao" && i.system.tipo === tipo)
    .reduce((soma, i) => soma + Math.max(0, numero(i.system.quantidade)), 0);
}

/**
 * O que um ataque precisa e gasta. Não altera nada: devolve as mudanças a aplicar.
 * @returns {{ ok: boolean, motivo?: string, municao?: object, gastos: object[] }}
 *   gastos: [{ itemId, campo, valor }] com os novos valores (quantidade, carregados)
 *   motivo: "semMunicao" | "descarregada" | "semArma"
 */
export function planejarAtaque(itens, armaItem, modo, { consumirArremesso = true } = {}) {
  const arma = armaItem.system;
  const gastos = [];
  if (numero(arma.quantidade) < 1) return { ok: false, motivo: "semArma", gastos };

  if (modo === "fogo") {
    // Arma de fogo: precisa de um disparo carregado; cada disparo gasta 1 carregado e 1 Bala
    if (numero(arma.carregados) < 1) return { ok: false, motivo: "descarregada", gastos };
    gastos.push({ itemId: armaItem.id, campo: "system.carregados", valor: numero(arma.carregados) - 1 });
    const bala = escolherMunicao(itens, arma);
    if (bala) gastos.push({ itemId: bala.id, campo: "system.quantidade", valor: numero(bala.system.quantidade) - 1 });
    return { ok: true, municao: bala, gastos };
  }

  if (arma.municaoTipo && modo === "distancia") {
    // Arco, besta, funda: sem munição não ataca; gasta 1 unidade ao atacar (acertando ou errando)
    const pacote = escolherMunicao(itens, arma);
    if (!pacote) return { ok: false, motivo: "semMunicao", gastos };
    gastos.push({ itemId: pacote.id, campo: "system.quantidade", valor: numero(pacote.system.quantidade) - 1 });
    return { ok: true, municao: pacote, gastos };
  }

  if (modo === "arremesso" && consumirArremesso) {
    // Arma arremessada não volta para a mão
    gastos.push({ itemId: armaItem.id, campo: "system.quantidade", valor: numero(arma.quantidade) - 1 });
  }
  return { ok: true, municao: null, gastos };
}

/**
 * Recarga de arma de fogo (ação de movimento): carregados = min(capacidade, Balas disponíveis).
 * A recarga não gasta Balas; o gasto é no disparo.
 * @returns {number|null} novo valor de carregados, ou null se não há Balas
 */
export function planejarRecarga(itens, arma) {
  const balas = totalMunicao(itens, arma.municaoTipo || "balas");
  if (balas < 1) return null;
  return Math.min(Math.max(1, numero(arma.capacidadeDisparos) || 1), balas);
}

/** Avisos do bloco Ataques: mais de 2 armas empunhadas, ou uma de duas mãos junto com outra. */
export function avisoEmpunhadura(armasEmpunhadas) {
  if (armasEmpunhadas.length > 2) return "maisDeDuas";
  if (armasEmpunhadas.length > 1 && armasEmpunhadas.some(a => a.empunhadura === "duas-maos")) return "duasMaosComOutra";
  return "";
}
