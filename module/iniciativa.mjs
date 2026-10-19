/**
 * Iniciativa = d20 + total da perícia Iniciativa (fórmula em CONFIG.Combat.initiative).
 * Com vantagem/desvantagem de Efeitos Ativos (flags["icarus-rpg"].vantagem.iniciativa, ou
 * pericia.iniciativa, ou todos), o 1d20 vira 2d20kh / 2d20kl.
 */
import { SISTEMA_ID } from "./config.mjs";
import { vantagemDasFlags, modoD20 } from "./combate.mjs";

export function registrarIniciativa() {
  class CombatenteIcarus extends Combatant {
    _getInitiativeFormula() {
      const base = super._getInitiativeFormula();
      const modo = modoD20(vantagemDasFlags(this.actor?.flags?.[SISTEMA_ID], ["iniciativa", "pericia.iniciativa"]));
      if (modo === "normal") return base;
      return base.replace(/^\s*1d20/, modo === "vantagem" ? "2d20kh" : "2d20kl");
    }
  }
  CONFIG.Combatant.documentClass = CombatenteIcarus;
}
