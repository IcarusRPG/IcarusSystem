/**
 * Carrossel de combate: dados das cartas (puros, testados em tests/carrossel.test.mjs).
 * Recebe os combatentes já na ordem de iniciativa e decide o que cada usuário vê:
 * ocultos só para o Mestre (jogadores nem sabem que existem, nem a iniciativa deles); mini barras
 * de PV/PM pelas mesmas regras das barras do token (module/token-barras-dados.mjs).
 */
import { fracao, visibilidade, textoDaBarra } from "./token-barras-dados.mjs";

/** Disposição do token → classe da faixa (CONST.TOKEN_DISPOSITIONS: −2 secreto, −1 hostil, 0 neutro, 1 aliado). */
export const DISPOSICOES = { "-2": "secreto", "-1": "hostil", 0: "neutro", 1: "aliado" };

/**
 * @param {object} p
 * @param {{ id, nome, img, iniciativa, oculto, derrotado, disposicao, ehPJ, categoria?, dono?, pv?, pm? }[]} p.combatentes  em ordem
 * @param {string|null} p.turnoId   combatente do turno (null = combate não começou)
 * @param {{ ehMestre: boolean, hud: object, mostrarBarras: boolean }} p.visao
 * @returns {object[]} cartas visíveis
 */
export function cartasDoCombate({ combatentes, turnoId, visao }) {
  const visiveis = combatentes.filter(c => visao.ehMestre || !c.oculto);
  const iAtivo = visiveis.findIndex(c => c.id === turnoId);
  const proximos = new Map();
  if (iAtivo >= 0) for (let k = 1; k <= 2 && k < visiveis.length; k++) proximos.set(visiveis[(iAtivo + k) % visiveis.length].id, k);
  return visiveis.map(c => {
    const ver = visibilidade({ ehMestre: visao.ehMestre, ehPJ: c.ehPJ, categoria: c.categoria, config: visao.hud });
    const barra = (b, numeros) => (b && b.max > 0 ? { fracao: fracao(b.value, b.max), texto: textoDaBarra(b.value, b.max, numeros) } : null);
    const derrotado = !!c.derrotado || (c.pv?.max > 0 && c.pv.value <= 0);
    return {
      id: c.id,
      nome: c.nome,
      img: c.img,
      iniciativa: c.iniciativa ?? null,
      // Dado na carta: sem iniciativa ainda, e o usuário é o Mestre ou o dono do combatente
      podeRolar: (c.iniciativa === null || c.iniciativa === undefined) && (visao.ehMestre || !!c.dono),
      ativo: c.id === turnoId,
      proximo: proximos.get(c.id) ?? 0,
      oculto: !!c.oculto,
      derrotado,
      disposicao: DISPOSICOES[String(c.disposicao)] ?? "neutro",
      pv: visao.mostrarBarras && ver.pv ? barra(c.pv, ver.numeros) : null,
      pm: visao.mostrarBarras && ver.pm ? barra(c.pm, true) : null
    };
  });
}

/** Rodada nova (para o banner)? */
export const rodadaNova = (antes, depois) => Number(depois) > 0 && Number(depois) !== Number(antes);

/** Combatentes que este usuário pode rolar agora (sem iniciativa; Mestre: todos; jogador: os seus). */
export const paraRolar = cartas => cartas.filter(c => c.podeRolar).map(c => c.id);

/**
 * Posição livre (arrastada) dentro da tela: a faixa inteira fica visível (margem de 4 px).
 * @param {{ x: number, y: number }} p   canto superior esquerdo (px)
 * @param {{ w: number, h: number }} tam  tamanho da faixa
 * @param {{ W: number, H: number }} tela
 */
export function limitarNaTela(p, tam, tela, margem = 4) {
  const x = Math.min(Math.max(margem, p.x), Math.max(margem, tela.W - tam.w - margem));
  const y = Math.min(Math.max(margem, p.y), Math.max(margem, tela.H - tam.h - margem));
  return { x: Math.round(x), y: Math.round(y) };
}
