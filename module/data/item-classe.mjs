import { ATRIBUTOS, PROFICIENCIAS_ARMA, CATEGORIAS_ARMADURA_CORPO } from "../config.mjs";

const fields = foundry.data.fields;
const texto = () => new fields.StringField({ required: true, blank: true, initial: "" });
const inteiro = (initial = 0) => new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial });

/**
 * Item "classe" (compêndio Icarus — Classes). Os dados vêm de tools/dados/classes.json; a ficha do
 * personagem usa classeId para buscar habilidades, poderes e progressão.
 */
export class ClasseData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      classeId: texto(),
      papel: texto(),
      atributoChave: texto(),
      pv: new fields.SchemaField({ inicial: inteiro(), porNivel: inteiro(), atributo: new fields.StringField({ required: true, nullable: true, initial: "CON", choices: ATRIBUTOS }) }),
      pm: new fields.SchemaField({
        inicial: inteiro(), porNivel: inteiro(),
        atributo: new fields.StringField({ required: true, nullable: true, initial: null, choices: ATRIBUTOS }),
        atributoSoNoPrimeiroNivel: new fields.BooleanField({ initial: false }),
        texto: texto()
      }),
      pericias: new fields.SchemaField({
        obrigatorias: texto(),
        escolha: inteiro(),
        lista: new fields.ArrayField(new fields.StringField({ required: true, blank: false }))
      }),
      proficiencias: new fields.SchemaField({
        texto: texto(),
        armas: new fields.ArrayField(new fields.StringField({ required: true, blank: false, choices: PROFICIENCIAS_ARMA })),
        armaduras: new fields.ArrayField(new fields.StringField({ required: true, blank: false, choices: CATEGORIAS_ARMADURA_CORPO })),
        escudo: new fields.BooleanField({ initial: false }),
        tunicas: new fields.BooleanField({ initial: false })
      }),
      progressao: new fields.ArrayField(new fields.SchemaField({
        nivel: inteiro(1),
        habilidades: new fields.ArrayField(new fields.StringField({ required: true, blank: false })),
        poder: new fields.BooleanField({ initial: false })
      })),
      intro: new fields.HTMLField({ required: true, blank: true, initial: "" })
    };
  }
}
