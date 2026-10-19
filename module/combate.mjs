/**
 * Regras de ataque e dano com armas (documento-núcleo, seção 14).
 * Funções puras (sem Foundry): a ficha usa para exibir o bônus e combate-chat.mjs para rolar.
 *
 * O combate ainda não foi fechado no núcleo. Tudo o que é PROVISÓRIO fica em REGRAS,
 * para trocar num lugar só quando a regra for definida.
 */
import { numero } from "./regras.mjs";
import { ALCANCE_METROS, CATEGORIAS_ARMADURA_CORPO } from "./config.mjs";

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

/* ------------------------------ Proficiências e armadura ------------------------------ */

/**
 * O personagem tem proficiência com a arma? (prof = system.proficiencias do ator)
 * Todo personagem tem armas simples. "sim"/"nao" na arma forçam o resultado.
 */
export function temProficienciaArma(prof, arma) {
  const lista = prof?.armas ?? [];
  const props = arma.propriedades ?? [];
  switch (arma.categoria) {
    case "simples": return true;
    case "marcial": return lista.includes("marciais") || (lista.includes("marciais-leves-ageis") && (props.includes("leve") || props.includes("agil")));
    case "exotica": return lista.includes("exoticas") || (lista.includes("exoticas-corte") && (arma.tiposDano ?? []).includes("corte"));
    case "fogo": return lista.includes("fogo");
    default: return false;
  }
}

/**
 * Proficiência da arma: "sim"/"nao" na arma forçam; "auto" usa as proficiências do personagem
 * (sem personagem, só armas simples).
 */
export function ehProficiente(arma, prof = null) {
  if (arma.proficiencia === "sim") return true;
  if (arma.proficiencia === "nao") return false;
  return temProficienciaArma(prof, arma);
}

/** Ordem das armaduras: quem tem proficiência numa categoria tem nas mais leves (decisão do Mestre a confirmar). */
const HIERARQUIA_ARMADURA = { leve: 1, media: 2, pesada: 3 };

/**
 * Proficiência numa categoria de armadura, escudo ou túnica.
 * Armaduras seguem a hierarquia leve < média < pesada (PROVISÓRIO: troque aqui se o Mestre decidir
 * que "armaduras pesadas" não inclui as mais leves). Túnica tem proficiência própria.
 */
export function temProficienciaArmadura(prof, categoria) {
  if (!categoria) return true;
  if (categoria === "tunica") return !!prof?.tunicas;
  if (categoria === "escudo" || categoria === "escudo-acoplado") return !!prof?.escudo;
  const nivel = HIERARQUIA_ARMADURA[categoria];
  if (!nivel) return true;
  return (prof?.armaduras ?? []).some(c => (HIERARQUIA_ARMADURA[c] ?? 0) >= nivel);
}

/** Itens de armadura/escudo/túnica equipados (itens = lista { type, system }). */
const vestidos = itens => (itens ?? []).filter(i => i.type === "equipamento" && i.system?.equipado && i.system.categoria);

/**
 * Tipo de armadura que o personagem veste: "nenhuma" | "leve" | "media" | "pesada".
 * Só leve, média e pesada contam; túnica e escudo NÃO são armadura.
 */
export function tipoArmadura(itens) {
  let maior = "nenhuma";
  for (const i of vestidos(itens)) {
    const c = i.system.categoria;
    if (CATEGORIAS_ARMADURA_CORPO.includes(c) && (HIERARQUIA_ARMADURA[c] > (HIERARQUIA_ARMADURA[maior] ?? 0))) maior = c;
  }
  return maior;
}

/** Está usando armadura? Verdadeiro só com armadura leve, média ou pesada equipada. */
export const usandoArmadura = itens => tipoArmadura(itens) !== "nenhuma";

/** Sem armadura ou com armadura leve (túnica e escudo não mudam isso). */
export const armaduraLeveOuNenhuma = itens => ["nenhuma", "leve"].includes(tipoArmadura(itens));

/** Está vestindo túnica? / empunhando escudo? */
export const vestindoTunica = itens => vestidos(itens).some(i => i.system.categoria === "tunica");
export const usandoEscudo = itens => vestidos(itens).some(i => ["escudo", "escudo-acoplado"].includes(i.system.categoria));

/**
 * Penalidade de armadura nos testes de ataque (núcleo, seção 14): a penalidade de cada
 * armadura, escudo ou túnica equipado SEM proficiência vale também no ataque.
 * Armas sem proficiência continuam só com aviso.
 * @returns {number} valor negativo (ou 0)
 */
export function penalidadeDeAtaque(system, itens = []) {
  const prof = system?.proficiencias;
  let total = 0;
  for (const i of vestidos(itens)) {
    if (!temProficienciaArmadura(prof, i.system.categoria)) total += numero(i.system.penalidade);
  }
  return total ? -total : 0;
}

/** Itens vestidos sem proficiência (para o aviso do card). */
export function vestidosSemProficiencia(system, itens = []) {
  return vestidos(itens).filter(i => !temProficienciaArmadura(system?.proficiencias, i.system.categoria));
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
  const proficiente = ehProficiente(arma, system.proficiencias);
  // Condições: a maior penalidade entre a geral e a de corpo a corpo (Caído), sem somar as duas
  const condGeral = system.condicoes?.ataque?.valor ?? 0;
  const condCorpo = modo === "corpo-a-corpo" ? (system.condicoes?.ataqueCorpoACorpo?.valor ?? 0) : 0;
  const condicao = Math.min(condGeral, condCorpo);
  const penalidadeArmadura = penalidadeDeAtaque(system, itens);
  const bonus = base + numero(arma.bonusAtaque) + numero(system.bonus?.ataque) + condicao + penalidadeArmadura
    + (proficiente ? 0 : REGRAS.penalidadeSemProficiencia);
  return { pericia, bonus, agil, proficiente, condicao, penalidadeArmadura };
}

/**
 * Fórmula de dano.
 * - duasMaos: usa danoExtra quando a arma tem dano de duas mãos (Espada bastarda, Katana).
 * - outraExtremidade: usa danoExtra da arma Dupla (Bordão, Corrente de espinhos).
 * - semAtributo: não soma o atributo (segundo ataque de duas armas, Rajada de Golpes).
 * - atributo: atributo somado no dano no lugar de FOR (ex.: SAB nos Braços Astrais).
 * - extras: dados extras de poderes [{ rotulo, formula, naoMultiplica? }] (Ataque Furtivo, Marca da Presa…).
 * - critico: (dados + bônus da arma + extras) × multiplicador. Extras com naoMultiplica ficam fora
 *   (regra oficial: só não multiplica o que o poder disser).
 * @returns {{ dado: string, partes: {rotulo:string, valor:number}[], formula: string, texto: string }}
 */
export function calcularDano(system, arma, modo, { duasMaos = false, outraExtremidade = false, critico = false, semAtributo = false, atributo = "FOR", extras = [] } = {}) {
  const dupla = tem(arma, "dupla");
  let dado = arma.dano || "0";
  if (arma.danoExtra && ((dupla && outraExtremidade) || (!dupla && duasMaos))) dado = arma.danoExtra;

  const partes = [];
  const valorAtributo = numero(system.atributos?.[atributo]?.total);
  if (!semAtributo && REGRAS.danoSomaFOR[modo] && valorAtributo !== 0) partes.push({ rotulo: atributo, valor: valorAtributo });
  if (numero(arma.bonusDano)) partes.push({ rotulo: "item", valor: numero(arma.bonusDano) });

  const fixos = partes.map(p => `${p.valor < 0 ? "-" : "+"} ${Math.abs(p.valor)}`).join(" ");
  const textoFixos = partes.map(p => `${p.valor < 0 ? "−" : "+"} ${Math.abs(p.valor)} (${p.rotulo})`).join(" ");
  const multiplicam = extras.filter(e => e?.formula && !e.naoMultiplica);
  const foraDoCritico = extras.filter(e => e?.formula && e.naoMultiplica);
  const comExtras = (f, t, lista) => [
    lista.reduce((acc, e) => `${acc} + ${e.formula}`, f),
    lista.reduce((acc, e) => `${acc} + ${e.formula} (${e.rotulo})`, t)
  ];
  let [formula, texto] = comExtras(fixos ? `${dado} ${fixos}` : dado, textoFixos ? `${dado} ${textoFixos}` : dado, multiplicam);
  if (critico) {
    const mult = Math.max(2, Math.trunc(numero(arma.criticoMult)) || 2);
    formula = REGRAS.criticoMultiplicaTudo ? `(${formula}) * ${mult}` : formula;
    texto = `(${texto}) × ${mult}`;
  }
  [formula, texto] = comExtras(formula, texto, foraDoCritico);
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

/* ------------------------------ Botões do card de ataque ------------------------------ */

/**
 * Cada botão do card de ataque só pode ser usado uma vez. Esta tabela diz qual marca (flag da
 * mensagem) cada botão grava e consulta. "dano" e "critico" dividem a mesma marca: um ataque
 * tem dano normal OU crítico. A outra extremidade da arma Dupla é uma ação à parte.
 */
export const MARCA_DO_BOTAO = {
  dano: "danoRolado",
  critico: "danoRolado",
  extremidade: "extremidadeRolada",
  recolher: "recolhida"
};

/** O botão já foi usado neste card? (flags = flags["icarus-rpg"] da mensagem) */
export function botaoUsado(flags, acao) {
  const marca = MARCA_DO_BOTAO[acao];
  return !!(marca && flags?.[marca]);
}

/* ------------------------------ Dano recebido (resistências) ------------------------------ */

/**
 * Dano que um alvo realmente sofre, com o passo a passo para o chat.
 * PROVISÓRIO: a ordem vulnerabilidade → redução e o arredondamento são sugestão (tipos-dano.json → regras).
 * Ordem: 1) Imunidade ao tipo → 0; 2) Vulnerabilidade → ×1,5 arredondado para baixo;
 * 3) Redução do tipo → subtrai; 4) RD geral → subtrai; 5) mínimo 0.
 * O tipo genérico "dano" só sofre RD geral. Perda de PV não passa por aqui (ignora tudo).
 *
 * @param {object} resistencias  system.resistencias do alvo (já com Efeitos Ativos e condições)
 * @param {number} valor         dano rolado (já multiplicado por metade/dobro, se for o caso)
 * @param {string} tipo          id do tipo de dano
 * @returns {{ final: number, passos: {chave: string, valor?: number, resultado: number}[] }}
 */
export function calcularDanoRecebido(resistencias, valor, tipo, regras = { vulnerabilidadeMult: 1.5, minimo: 0 }) {
  const r = resistencias ?? {};
  let dano = Math.max(0, Math.trunc(numero(valor)));
  const passos = [{ chave: "rolado", resultado: dano }];
  const generico = !tipo || tipo === "dano";
  if (!generico && r.imunidade?.[tipo]) {
    passos.push({ chave: "imune", resultado: 0 });
    return { final: 0, passos };
  }
  if (!generico && r.vulnerabilidade?.[tipo]) {
    dano = Math.floor(dano * (regras.vulnerabilidadeMult ?? 1.5));
    passos.push({ chave: "vulneravel", valor: regras.vulnerabilidadeMult ?? 1.5, resultado: dano });
  }
  const reducao = generico ? 0 : numero(r.reducao?.[tipo]);
  if (reducao) {
    dano = Math.max(regras.minimo ?? 0, dano - reducao);
    passos.push({ chave: "reducao", valor: reducao, resultado: dano });
  }
  const rd = numero(r.rdGeral);
  if (rd) {
    dano = Math.max(regras.minimo ?? 0, dano - rd);
    passos.push({ chave: "rd", valor: rd, resultado: dano });
  }
  return { final: Math.max(regras.minimo ?? 0, dano), passos };
}

/** Texto do passo a passo: "12 Fogo → vulnerável ×1,5 = 18 → Redução de fogo 5 → 13". */
export function textoDoDano(passos, nomeTipo) {
  return passos.map(p => {
    if (p.chave === "rolado") return `${p.resultado} ${nomeTipo}`;
    if (p.chave === "imune") return "imune → 0";
    if (p.chave === "vulneravel") return `vulnerável ×${String(p.valor).replace(".", ",")} = ${p.resultado}`;
    if (p.chave === "reducao") return `Redução de ${nomeTipo.toLowerCase()} ${p.valor} → ${p.resultado}`;
    if (p.chave === "rd") return `RD ${p.valor} → ${p.resultado}`;
    return String(p.resultado);
  }).join(" → ");
}

/* ---------------- Teste Oposto e Teste de Resistência ---------------- */

export const REGRAS_TESTES = {
  // [PROVISÓRIO] Empate no total do Teste Oposto: vence o maior bônus; se o bônus também empatar,
  // o resultado é "Empate" e o Mestre pode mandar rolar de novo.
  desempatePorBonus: true,
  // [PROVISÓRIO] 20 e 1 naturais não têm efeito nesses testes (só destaque visual).
  naturaisSemEfeito: true
};

/**
 * Teste Oposto: quem vence entre os lados A e B.
 * @param {{total:number, bonus:number, falhaAuto?:string}} a
 * @param {{total:number, bonus:number, falhaAuto?:string}} b
 * @returns {{vencedor: "A"|"B"|null, motivo: "total"|"bonus"|"falhaAuto"|"empate"}}
 */
export function resolverOposto(a, b) {
  if (a.falhaAuto && b.falhaAuto) return { vencedor: null, motivo: "empate" };
  if (a.falhaAuto) return { vencedor: "B", motivo: "falhaAuto" };
  if (b.falhaAuto) return { vencedor: "A", motivo: "falhaAuto" };
  if (a.total !== b.total) return { vencedor: a.total > b.total ? "A" : "B", motivo: "total" };
  if (REGRAS_TESTES.desempatePorBonus && a.bonus !== b.bonus) return { vencedor: a.bonus > b.bonus ? "A" : "B", motivo: "bonus" };
  return { vencedor: null, motivo: "empate" };
}

/**
 * CD de habilidades e magias (fórmula oficial definida pelo Mestre):
 *   CD = 10 + metade do nível do conjurador (para baixo) + atributo-chave
 * O valor do atributo já é o modificador; o total da ficha inclui raça e bônus temporário.
 * Sem nível numérico, usa 0 e devolve semNivel (a interface pede a CD manual; nada é inventado).
 * @param {object} system  system do ator conjurador
 * @param {string} atributoChave  FOR, DES, CON, INT, SAB ou CAR
 */
export function calcularCD(system, atributoChave) {
  const nivelBruto = Number(system?.nivel);
  const semNivel = !Number.isFinite(nivelBruto);
  const nivel = semNivel ? 0 : Math.max(0, Math.trunc(nivelBruto));
  const metade = Math.floor(nivel / 2);
  const mod = numero(system?.atributos?.[atributoChave]?.total);
  return { cd: 10 + metade + mod, nivel, metade, mod, semNivel };
}

/* ------------------------------ d20: vantagem e desvantagem ------------------------------ */

/**
 * Modo da rolagem: vantagem e desvantagem não acumulam (várias fontes = 2d20) e,
 * juntas, se anulam (1d20).
 * @returns {"normal"|"vantagem"|"desvantagem"}
 */
export function modoD20({ vantagem = false, desvantagem = false } = {}) {
  if (vantagem && desvantagem) return "normal";
  return vantagem ? "vantagem" : desvantagem ? "desvantagem" : "normal";
}

/**
 * Dado mantido entre os rolados. 20 e 1 naturais contam pelo dado que ficou.
 * minimo (Perícia Infalível): d20 menor que o mínimo conta como o mínimo — vale para o dado mantido.
 * @param {number[]} valores  1 ou 2 d20
 * @returns {{ natural: number, d20: number, dados: {valor:number, mantido:boolean}[], minimoAplicado: boolean }}
 */
export function escolherD20(valores, modo = "normal", minimo = null) {
  let indice = 0;
  if (valores.length > 1 && modo === "vantagem") indice = valores[1] > valores[0] ? 1 : 0;
  if (valores.length > 1 && modo === "desvantagem") indice = valores[1] < valores[0] ? 1 : 0;
  const natural = valores[indice];
  const d20 = minimo && natural < minimo ? minimo : natural;
  return { natural, d20, dados: valores.map((valor, i) => ({ valor, mantido: i === indice })), minimoAplicado: d20 !== natural };
}

/**
 * Vantagem/desvantagem vindas de Efeitos Ativos (flags["icarus-rpg"].vantagem.<escopo> e
 * .desvantagem.<escopo>). Escopos: "ataque", "pericia.<chave>", "resistencia.<chave>", "morte",
 * "iniciativa" e "todos" (este vale para qualquer rolagem).
 * @param {object} flags  flags["icarus-rpg"] do ator
 * @param {string[]} escopos
 */
export function vantagemDasFlags(flags, escopos = []) {
  const ler = (tipo, escopo) => !!escopo.split(".").reduce((o, p) => o?.[p], flags?.[tipo]);
  const todos = [...escopos, "todos"];
  return {
    vantagem: todos.some(e => ler("vantagem", e)),
    desvantagem: todos.some(e => ler("desvantagem", e))
  };
}

/** Mínimo do d20 vindo de flags (flags["icarus-rpg"].minimoD20.<escopo>), ex.: Perícia Infalível. */
export function minimoDasFlags(flags, escopos = []) {
  const valores = escopos.map(e => Number(e.split(".").reduce((o, p) => o?.[p], flags?.minimoD20))).filter(v => v > 0);
  return valores.length ? Math.max(...valores) : null;
}

/**
 * Rola o d20 com vantagem/desvantagem (Roll real do Foundry: 2d20kh / 2d20kl / 1d20) + bônus.
 * O total é recalculado com o dado mantido (e o mínimo, se houver).
 * @returns {Promise<{ roll, modo, d20, natural, dados, total, bonus, minimoAplicado }>}
 */
export async function rolarD20({ vantagem = false, desvantagem = false, bonus = 0, minimo = null } = {}) {
  const modo = modoD20({ vantagem, desvantagem });
  const termo = modo === "vantagem" ? "2d20kh" : modo === "desvantagem" ? "2d20kl" : "1d20";
  const b = numero(bonus);
  const roll = await new Roll(`${termo} ${b < 0 ? "-" : "+"} ${Math.abs(b)}`).evaluate();
  const valores = (roll.dice[0]?.results ?? []).map(r => r.result);
  const escolha = escolherD20(valores.length ? valores : [roll.total - b], modo, minimo);
  return { roll, modo, ...escolha, bonus: b, total: escolha.d20 + b };
}

/* ------------------------------ Acerto, margem de ameaça e crítico ------------------------------ */

/**
 * Resultado de um ataque contra uma Defesa (regra oficial):
 * - 20 natural: acerta sempre e é crítico;
 * - dentro da margem de ameaça (mas não 20): precisa alcançar a Defesa; se alcançar, é crítico;
 * - fora da margem: acerta se total ≥ Defesa, sem crítico.
 * 1 natural não tem efeito especial (PENDENTE no livro). forcarAcerto (Tiro Lendário): acerta e é crítico.
 * Sem Defesa conhecida (sem alvo): acerta = null e ameaca diz se o d20 caiu na margem.
 * @param {{ d20: number, total: number, margem?: number, defesa?: number|null, forcarAcerto?: boolean }} a
 *   d20 = valor natural do dado mantido
 * @returns {{ acerta: boolean|null, critico: boolean, ameaca: boolean, automatico: boolean }}
 */
export function resolverAtaque({ d20, total, margem = 20, defesa = null, forcarAcerto = false }) {
  const natural = numero(d20);
  const m = numero(margem) || 20;
  const ameaca = natural >= m;
  if (forcarAcerto || natural === 20) return { acerta: true, critico: true, ameaca: true, automatico: true };
  if (defesa === null || defesa === undefined || !Number.isFinite(Number(defesa))) return { acerta: null, critico: false, ameaca, automatico: false };
  const acerta = numero(total) >= numero(defesa);
  return { acerta, critico: acerta && ameaca, ameaca, automatico: false };
}

/**
 * Um único d20 contra vários alvos (ataque que atinge várias criaturas com um teste).
 * @param {{ d20, total, margem, forcarAcerto }} ataque
 * @param {{ id: string, defesa: number|null }[]} alvos
 * @returns {{ id: string, defesa: number|null, acerta: boolean|null, critico: boolean }[]}
 */
export function resolverAtaqueMultiplo(ataque, alvos = []) {
  return alvos.map(a => ({ ...a, ...resolverAtaque({ ...ataque, defesa: a.defesa }) }));
}

/* ------------------------------ Reações ------------------------------ */

/** Condições que impedem reações (ids reais das condições do sistema). */
export const CONDICOES_SEM_REACAO = ["desprevenido", "surpreendido"];

/**
 * Pode reagir? Falso se a reação da rodada já foi usada ou se está Desprevenido/Surpreendido.
 * @param {object} system    system do ator (reacao.disponivel)
 * @param {Set<string>|string[]} statuses  condições ativas
 * @returns {{ pode: boolean, motivo: string }} motivo = "usada" ou o id da condição
 */
export function podeReagir(system, statuses = []) {
  const ativos = statuses instanceof Set ? statuses : new Set(statuses);
  const condicao = CONDICOES_SEM_REACAO.find(c => ativos.has(c));
  if (condicao) return { pode: false, motivo: condicao };
  if (system?.reacao && system.reacao.disponivel === false) return { pode: false, motivo: "usada" };
  return { pode: true, motivo: "" };
}
