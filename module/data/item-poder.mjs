import { FONTES_PODER, ACOES_PODER, FREQUENCIAS_PODER, TIPOS_DANO_TODOS } from "../config.mjs";

const fields = foundry.data.fields;
const texto = (initial = "") => new fields.StringField({ required: true, blank: true, initial });

/** Item "poder": habilidade de raça, classe, origem, profissão, divindade ou poder geral. */
export class PoderData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      fonte: new fields.StringField({ required: true, blank: false, initial: "geral", choices: FONTES_PODER }),
      // Vazio = o poder não custa PM
      custoPM: new fields.NumberField({ required: true, nullable: true, integer: true, min: 0, initial: null }),
      prerequisito: texto(),
      nivel: new fields.NumberField({ required: true, nullable: true, integer: true, min: 1, max: 25, initial: null }),
      // Poderes concedidos: ação, frequência de uso, se é sustentado (sem automação) e a divindade (id)
      acao: new fields.StringField({ required: true, blank: true, initial: "", choices: ["", ...ACOES_PODER] }),
      frequencia: new fields.StringField({ required: true, blank: true, initial: "", choices: ["", ...FREQUENCIAS_PODER] }),
      sustentada: new fields.BooleanField({ initial: false }),
      divindade: texto(),
      // Tipo de dano, para poderes que causam dano (só informativo por enquanto)
      tipoDano: new fields.StringField({ required: true, blank: true, initial: "", choices: ["", ...TIPOS_DANO_TODOS] }),
      descricao: new fields.HTMLField({ required: true, blank: true, initial: "" })
    };
  }
}
