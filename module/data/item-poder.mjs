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
      // Classe: id da classe, habilidade de classe ou poder de classe, grupo (linha/caminho) e pré-requisitos
      classe: texto(),
      // "geral" = Poder Geral (compêndio Icarus: Poderes Gerais), escolhido no lugar de um poder de classe
      tipoPoder: new fields.StringField({ required: true, blank: true, initial: "", choices: ["", "habilidade", "poder", "geral"] }),
      grupo: texto(),
      nivelMinimo: new fields.NumberField({ required: true, nullable: true, integer: true, min: 1, max: 25, initial: null }),
      atributoMinimo: new fields.ObjectField({ required: true, initial: {} }),
      requerPoderes: new fields.ArrayField(new fields.StringField({ required: true, blank: false })),
      requerGrupo: texto(),
      repetivel: new fields.BooleanField({ initial: false }),
      // Pré-requisitos estruturados (Poderes Gerais): { atributos: { for: 1 }, nivel, treinado[], treinadoOu[], poderes[], proficiencias[], conjurador }.
      // Só informativo: nada é bloqueado por eles.
      requisitos: new fields.ObjectField({ required: true, initial: {} }),
      descricao: new fields.HTMLField({ required: true, blank: true, initial: "" })
    };
  }
}
