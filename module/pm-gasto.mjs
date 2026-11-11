/**
 * Gasto de PM com PM temporários (system.pm.temp): o gasto consome primeiro os temporários, depois
 * os PM. Todo lugar que confere ou gasta PM passa por aqui (sem dependências: usado em todo o sistema).
 * Recuperar PM (cura de PM, Meditação, Dor Fértil) só mexe nos PM, nunca nos temporários.
 */

const n0 = v => Math.max(0, Math.trunc(Number(v) || 0));

/** PM que dá para gastar agora: PM + PM temporários. Aceita o ator ou o objeto pm. */
export function pmDisponivel(alvo) {
  const pm = alvo?.system?.pm ?? alvo;
  return n0(pm?.value) + n0(pm?.temp);
}

/** Divide um gasto: { value, temp, doTemp } (o que sobra de PM e de temporários; quanto saiu dos temporários). */
export function dividirGastoDePM(pm, custo) {
  const c = n0(custo);
  const temp = n0(pm?.temp);
  const doTemp = Math.min(temp, c);
  return { value: Math.max(0, n0(pm?.value) - (c - doTemp)), temp: temp - doTemp, doTemp };
}

/** Mudanças do actor.update para gastar "custo" PM (temporários primeiro). */
export function gastoDePM(actor, custo) {
  const d = dividirGastoDePM(actor?.system?.pm, custo);
  return { "system.pm.value": d.value, ...(d.doTemp ? { "system.pm.temp": d.temp } : {}) };
}

/** Mudanças para devolver um gasto (desfaz gastoDePM com o pm de antes). */
export function devolucaoDePM(antes) {
  return { "system.pm.value": n0(antes?.value), "system.pm.temp": n0(antes?.temp) };
}

/**
 * PM temporários novos. Sem "acumula": vale o maior. Com "acumula" (Golpe Mágico): soma, com um teto
 * do que ainda pode ganhar na cena (restanteNaCena). Devolve { valor, ganho }.
 */
export function novosPMTemporarios(atual, novo, { acumula = false, restanteNaCena = Infinity } = {}) {
  const a = n0(atual);
  const v = n0(novo);
  if (!acumula) return v > a ? { valor: v, ganho: v - a } : { valor: a, ganho: 0 };
  const ganho = Math.min(v, Math.max(0, restanteNaCena));
  return { valor: a + ganho, ganho };
}
