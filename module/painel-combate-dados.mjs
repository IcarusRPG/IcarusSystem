/**
 * Painel de combate do Mestre: dados puros (testados em tests/painel-combate.test.mjs).
 * Mostra só os combatentes do Mestre (ator sem dono jogador) e destaca o próximo deles a agir:
 * a partir do turno atual (inclusive), o primeiro combatente do Mestre não derrotado na ordem de
 * iniciativa, dando a volta na rodada. Se o turno atual é de um deles, o destaque é "agindo agora".
 */
import { fracao } from "./token-barras-dados.mjs";

/**
 * Índice do combatente do Mestre em destaque e quantos turnos faltam para ele.
 * @param {{ id, doMestre: boolean, derrotado?: boolean }[]} ordem  todos os combatentes, em ordem
 * @param {string|null} turnoId  combatente do turno (null = combate não começou: conta do primeiro)
 * @returns {{ id: string, faltam: number }|null}
 */
export function proximoDoMestre(ordem, turnoId) {
  if (!ordem.length) return null;
  const inicio = Math.max(0, ordem.findIndex(c => c.id === turnoId));
  for (let k = 0; k < ordem.length; k++) {
    const c = ordem[(inicio + k) % ordem.length];
    if (c.doMestre && !c.derrotado) return { id: c.id, faltam: k };
  }
  return null;
}

const barra = b => (b && Number(b.max) > 0 ? { valor: Number(b.value) || 0, max: Number(b.max), fracao: fracao(b.value, b.max) } : null);

/**
 * Cartas do painel.
 * @param {object} p
 * @param {{ id, actorUuid?, nome, img, iniciativa, doMestre, derrotado, oculto?, pv?, pm?, defesa?, fort?, ref?, von?, nd?, tipo?, condicoes? }[]} p.combatentes  em ordem
 * @param {string|null} p.turnoId
 * @param {boolean} p.comecou  combate já começou (há turno atual)
 */
export function cartasDoPainel({ combatentes, turnoId, comecou = !!turnoId }) {
  const destaque = proximoDoMestre(combatentes, comecou ? turnoId : null);
  return combatentes.filter(c => c.doMestre).map(c => {
    const pv = barra(c.pv);
    const derrotado = !!c.derrotado || (pv ? pv.valor <= 0 : false);
    const emDestaque = destaque?.id === c.id;
    return {
      id: c.id,
      actorUuid: c.actorUuid ?? null,
      nome: c.nome,
      img: c.img,
      iniciativa: c.iniciativa ?? null,
      noTurno: comecou && c.id === turnoId,
      destaque: emDestaque,
      agindoAgora: emDestaque && comecou && destaque.faltam === 0,
      faltam: emDestaque ? destaque.faltam : null,
      derrotado,
      oculto: !!c.oculto,
      pv,
      pm: barra(c.pm),
      pvBaixo: !!pv && pv.valor > 0 && pv.fracao <= 0.25,
      defesa: c.defesa ?? null,
      fort: c.fort ?? null,
      ref: c.ref ?? null,
      von: c.von ?? null,
      nd: c.nd ?? null,
      tipo: c.tipo ?? null,
      condicoes: c.condicoes ?? []
    };
  });
}

/** Rótulo do destaque: "Agindo agora", "Próximo a agir" ou "Age em N turnos". */
export function rotuloDoDestaque(carta) {
  if (!carta?.destaque) return null;
  if (carta.agindoAgora) return { chave: "ICARUS.PainelCombate.AgindoAgora" };
  if (carta.faltam === 1 || carta.faltam === 0) return { chave: "ICARUS.PainelCombate.ProximoAAgir" };
  return { chave: "ICARUS.PainelCombate.AgeEm", dados: { n: carta.faltam } };
}

/** Sinal do bônus: +3, −1, +0. */
export const comSinal = n => (n === null || n === undefined || !Number.isFinite(Number(n)) ? "—" : Number(n) < 0 ? `−${Math.abs(Number(n))}` : `+${Number(n)}`);
