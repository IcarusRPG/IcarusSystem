/**
 * Barras de PV/PM e escudo de Defesa no token: regras puras (quem vê o quê e a geometria),
 * sem Foundry nem PIXI. Usadas por module/token-barras.mjs (desenho) e module/carrossel.mjs.
 *
 * Personagem de jogador (ator com dono jogador): PV, PM e Defesa para todos.
 * NPC/monstro (sem dono jogador): por padrão só o Mestre; opção de mostrar aos jogadores só o PV
 * em porcentagem (barra sem números). Opções gerais: PM, Defesa e texto numérico.
 */

/** Fração 0–1 (máximo 0 ou inválido → 0). */
export const fracao = (valor, max) => {
  const m = Number(max), v = Number(valor);
  return m > 0 && Number.isFinite(v) ? Math.min(1, Math.max(0, v / m)) : 0;
};

/** PV baixo (pulsa): até 25% e acima de 0. */
export const pvBaixo = (valor, max) => { const f = fracao(valor, max); return f > 0 && f <= 0.25; };

/**
 * O que este usuário vê no token.
 * @param {{ ehMestre: boolean, ehPJ: boolean, config: { npcModo: "mestre"|"porcentagem", mostrarPM: boolean, mostrarDefesa: boolean, texto: "passarMouse"|"sempre"|"nunca" } }} p
 * @returns {{ pv: boolean, pm: boolean, defesa: boolean, numeros: boolean, texto: "passarMouse"|"sempre"|"nunca" }}
 */
export function visibilidade({ ehMestre, ehPJ, config }) {
  const total = ehMestre || ehPJ;
  const pvPorcentagem = !total && config.npcModo === "porcentagem";
  return {
    pv: total || pvPorcentagem,
    pm: total && !!config.mostrarPM,
    defesa: total && !!config.mostrarDefesa,
    numeros: total,
    texto: config.texto
  };
}

/**
 * Geometria (px locais do token): barras logo abaixo do token, dentro da largura (90%), cada uma
 * ~8% da altura (mínimo 5 px); escudo no canto inferior esquerdo, ~30% da largura (mínimo 22 px).
 * @param {number} w  largura do token (px)
 * @param {number} h  altura do token (px)
 */
export function layoutDoHud(w, h, { comPM = true } = {}) {
  const largura = Math.round(w * 0.9);
  const x = Math.round((w - largura) / 2);
  const altura = Math.max(5, Math.round(h * 0.08));
  const espaco = Math.max(2, Math.round(h * 0.015));
  const pv = { x, y: h + espaco, w: largura, h: altura };
  const pm = comPM ? { x, y: pv.y + altura + espaco, w: largura, h: altura } : null;
  const lado = Math.max(22, Math.round(w * 0.3));
  const alturaEscudo = Math.round(lado * 1.15);
  const escudo = { x: Math.round(w * 0.02), y: h - alturaEscudo - Math.round(h * 0.02), w: lado, h: alturaEscudo };
  // Quanto o nome do token precisa descer para não ficar por cima das barras
  const ocupado = (pm ?? pv).y + altura + espaco - h;
  return { pv, pm, escudo, ocupado };
}

/** Texto da barra: "atual/máx" com números, "NN%" sem. */
export const textoDaBarra = (valor, max, numeros) => (numeros ? `${valor}/${max}` : `${Math.round(fracao(valor, max) * 100)}%`);
