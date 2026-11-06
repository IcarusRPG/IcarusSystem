/**
 * Números flutuantes de PV/PM sobre o token: regras puras (sem Foundry nem PIXI;
 * tests/numeros-pv.test.mjs). O desenho e os hooks ficam em module/numeros-pv.mjs.
 */

/** Duração de cada número (ms) e máximo na tela ao mesmo tempo. */
export const DURACAO_MS = 1250;
export const MAX_SIMULTANEOS = 12;
/** Atraso entre números do mesmo token (cascata), em ms. */
export const ATRASO_MESMO_TOKEN = 160;

export const CORES = {
  dano: { fill: [0xff8a7a, 0xff2a1f], brilho: 0x000000 },
  cura: { fill: [0xd9ffd0, 0x45e07a], brilho: 0x9cffb5 },
  pm: { fill: [0xcfe0ff, 0x4f8dff], brilho: 0x7fb0ff }
};
export const TAMANHOS = { p: 0.8, m: 1, g: 1.3 };

const num = v => (Number.isFinite(Number(v)) ? Number(v) : null);

/**
 * Mudanças de PV (e de PM, se ligado) entre dois retratos { pv, pm }.
 * @returns {{recurso:"pv"|"pm", diff:number}[]}
 */
export function mudancas(antes, depois, { pm = false } = {}) {
  if (!antes || !depois) return [];
  const lista = [];
  for (const recurso of pm ? ["pv", "pm"] : ["pv"]) {
    const a = num(antes[recurso]);
    const d = num(depois[recurso]);
    if (a === null || d === null) continue;
    const diff = Math.trunc(d - a);
    if (diff !== 0) lista.push({ recurso, diff });
  }
  return lista;
}

/**
 * Texto, cor e escala de um número.
 * - Dano em vermelho (−N), cura em verde (+N), PM em azul.
 * - Mais de 25% do máximo: maior. PV levado a 0: caveira.
 */
export function estiloDoNumero({ recurso = "pv", diff, max = 0, depois = null, tamanho = "m" }) {
  const tipo = recurso === "pm" ? "pm" : diff < 0 ? "dano" : "cura";
  const grande = max > 0 && Math.abs(diff) > max * 0.25;
  const caveira = recurso === "pv" && diff < 0 && depois === 0;
  const texto = `${diff < 0 ? "−" : "+"}${Math.abs(diff)}${caveira ? " ☠" : ""}`;
  return { tipo, texto, cores: CORES[tipo], escala: (TAMANHOS[tamanho] ?? 1) * (grande ? 1.35 : 1), grande, caveira };
}

/**
 * Quem vê o número: Mestre sempre; jogador só em token que enxerga; NPC conforme a opção do mundo.
 */
export function podeVerNumero({ ehMestre, ehPJ, npcsParaJogadores = true, visivel = true }) {
  if (ehMestre) return true;
  if (!visivel) return false;
  return ehPJ || !!npcsParaJogadores;
}

/** Deslocamento horizontal (fração da largura do token) do n-ésimo número no mesmo token: 0, +, −, ++, −−… */
export function deslocamento(indice) {
  if (indice <= 0) return 0;
  const passo = Math.ceil(indice / 2) * 0.55;
  return indice % 2 ? passo : -passo;
}

const facilSaida = t => 1 - Math.pow(1 - t, 3);
const limitar = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

/**
 * Quadro da animação no instante t (0 a 1).
 * @returns {{ subida:number, alpha:number, escala:number, tremida:number }}
 *   subida: fração da altura total; tremida: deslocamento x em fração (−1 a 1).
 */
export function quadro(t, { tipo = "dano", reduzido = false } = {}) {
  t = limitar(t);
  const alpha = t < 0.08 ? t / 0.08 : t > 0.72 ? 1 - (t - 0.72) / 0.28 : 1;
  if (reduzido) return { subida: 0, alpha: limitar(alpha), escala: 1, tremida: 0 };
  if (tipo === "dano") {
    // "Pop" (1,6 → 1) e tremida curta no começo; sobe rápido e desacelera
    const escala = t < 0.14 ? 1.6 - 0.6 * facilSaida(t / 0.14) : 1;
    const tremida = t < 0.28 ? Math.sin(t * 90) * (1 - t / 0.28) : 0;
    return { subida: facilSaida(t), alpha: limitar(alpha), escala, tremida };
  }
  // Cura e PM: subida suave, cresce de leve
  const escala = t < 0.18 ? 0.8 + 0.2 * facilSaida(t / 0.18) : 1;
  return { subida: Math.sin((t * Math.PI) / 2), alpha: limitar(alpha), escala, tremida: 0 };
}

/** Quantos dos mais antigos saem para caber um novo (máximo simultâneo). */
export function excedentes(ativos, max = MAX_SIMULTANEOS) {
  return Math.max(0, ativos + 1 - max);
}
