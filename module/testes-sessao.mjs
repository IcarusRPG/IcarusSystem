/**
 * Teste Oposto e Teste de Resistência no Foundry: API game.icarus.testes.
 */

/** Abre o diálogo de configuração do Teste Oposto (só o Mestre). */
export async function abrirOposto() {
  if (!game.user.isGM) return ui.notifications.warn(game.i18n.localize("ICARUS.Testes.SoMestre"));
}

/** Abre o diálogo de configuração do Teste de Resistência (só o Mestre). */
export async function abrirResistencia() {
  if (!game.user.isGM) return ui.notifications.warn(game.i18n.localize("ICARUS.Testes.SoMestre"));
}

/** Registra os testes e devolve a API pública (game.icarus.testes). */
export function registrarTestes() {
  return { abrirOposto, abrirResistencia };
}
