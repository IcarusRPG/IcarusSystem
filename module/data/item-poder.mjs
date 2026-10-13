import { FONTES_PODER } from "../config.mjs";

const fields = foundry.data.fields;

/** Item "poder": habilidade de raça, classe, origem, profissão ou poder geral. */
export class PoderData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      fonte: new fields.StringField({ required: true, blank: false, initial: "geral", choices: FONTES_PODER }),
      // Vazio = o poder não custa PM
      custoPM: new fields.NumberField({ required: true, nullable: true, integer: true, min: 0, initial: null }),
      prerequisito: new fields.StringField({ required: true, blank: true, initial: "" }),
      nivel: new fields.NumberField({ required: true, nullable: true, integer: true, min: 1, max: 25, initial: null }),
      descricao: new fields.HTMLField({ required: true, blank: true, initial: "" })
    };
  }
}
