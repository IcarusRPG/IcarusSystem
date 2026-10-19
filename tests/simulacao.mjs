/**
 * Simula no Node o que o Foundry faz ao preparar um personagem:
 * valores salvos → Efeitos Ativos (em ordem de prioridade) → derivarPersonagem.
 * Usa as mesmas funções do sistema (module/derivar.mjs e module/data/racas.mjs).
 */
import { ATRIBUTOS, PERICIAS, TIPOS_DANO_COM_RESISTENCIA } from "../module/config.mjs";
import { derivarPersonagem } from "../module/derivar.mjs";
import { racaPorId, resolverRaca } from "../module/data/racas.mjs";

/** Preenche um "system" parcial com os padrões do modelo de dados. */
export function sistemaCompleto(parcial = {}) {
  const s = structuredClone(parcial);
  s.nivel ??= 1;
  s.identidade = { raca: "", origem: "", classe: "", profissao: "", divindade: "", ...s.identidade };
  s.atributos ??= {};
  for (const k of ATRIBUTOS) s.atributos[k] = { base: 0, racial: 0, temp: 0, ...s.atributos[k] };
  s.classeConfig = {
    pvInicial: 0, pvPorNivel: 0, pmInicial: 0, pmPorNivel: 0, pvAtributo: "CON", pmAtributo: null,
    bonusPv: 0, bonusPm: 0, bonusPvPorNivel: 0, bonusPmPorNivel: 0, bonusPmNivelImpar: 0, manual: false,
    ...s.classeConfig
  };
  s.pv = { value: 0, max: 0, ...s.pv };
  s.pm = { value: 0, max: 0, ...s.pm };
  s.defesa = { outros: 0, ...s.defesa };
  const porTipo = v => Object.fromEntries(TIPOS_DANO_COM_RESISTENCIA.map(k => [k, v]));
  s.resistencias = {
    rdGeral: 0, ...s.resistencias,
    reducao: { ...porTipo(0), ...s.resistencias?.reducao },
    imunidade: { ...porTipo(false), ...s.resistencias?.imunidade },
    vulnerabilidade: { ...porTipo(false), ...s.resistencias?.vulnerabilidade }
  };
  s.bonus = { ataque: 0, ...s.bonus };
  s.proficiencias = { armas: ["simples"], armaduras: [], escudo: false, tunicas: false, texto: "", ...s.proficiencias };
  s.morte = { sucessos: 0, falhas: 0, estavel: false, ...s.morte };
  s.deslocamento ??= 9;
  s.tamanho ??= "medio";
  s.pericias ??= {};
  for (const p of PERICIAS) s.pericias[p.chave] = { treino: 0, outros: 0, atributo: p.atributo, ...s.pericias[p.chave] };
  return s;
}

// Mesmos números de CONST.ACTIVE_EFFECT_MODES do Foundry; prioridade padrão = modo × 10
const MODOS = { ADD: 2, UPGRADE: 4, OVERRIDE: 5 };

/** Aplica mudanças { chave, modo, valor } como o Foundry aplica Efeitos Ativos. */
export function aplicarMudancas(s, mudancas) {
  const ordenadas = [...mudancas].sort((a, b) => MODOS[a.modo] - MODOS[b.modo]);
  for (const m of ordenadas) {
    const partes = m.chave.replace(/^system\./, "").split(".");
    const alvo = partes.slice(0, -1).reduce((o, k) => o[k], s);
    const campo = partes.at(-1);
    const atual = alvo[campo];
    if (m.modo === "ADD") alvo[campo] = Number(atual) + Number(m.valor);
    else if (m.modo === "UPGRADE") alvo[campo] = Math.max(Number(atual), Number(m.valor));
    else if (m.modo === "OVERRIDE") alvo[campo] = typeof atual === "number" ? Number(m.valor) : m.valor;
  }
  return s;
}

/**
 * Prepara um personagem como o Foundry faria depois de aplicarRaca(actor, racaId, escolhas).
 * @returns {{ system: object, fonte: object, resolvido: object|null }}
 */
export function simular(dados, racaId = "", escolhas = {}) {
  const fonte = sistemaCompleto(dados.system);
  const raca = racaPorId(racaId);
  const resolvido = raca ? resolverRaca(raca, escolhas) : null;
  for (const k of ATRIBUTOS) fonte.atributos[k].racial = resolvido?.racial[k] ?? 0;
  fonte.identidade.raca = raca?.id ?? "";
  const s = structuredClone(fonte);
  aplicarMudancas(s, resolvido ? resolvido.poderes.flatMap(p => p.efeitos) : []);
  derivarPersonagem(s, dados.items ?? []);
  return { system: s, fonte, resolvido };
}
