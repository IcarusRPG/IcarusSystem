const fields = foundry.data.fields;
const texto = () => new fields.StringField({ required: true, blank: true, initial: "" });
const ids = () => new fields.ArrayField(new fields.StringField({ required: true, blank: false }));

/**
 * Item "origem" (compêndio Origens): a perícia com bônus (+2), o texto curto, os 2 itens comuns
 * (fixos e grupos "um ou outro") e o id do Poder de Origem. Escolher a origem na ficha usa estes
 * dados (module/origens.mjs); o item em si só é referência.
 */
export class OrigemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      origemId: texto(),
      pericia: texto(),
      // Bônus numérico na perícia da origem (não é treino)
      periciaBonus: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 2 }),
      texto: texto(),
      itens: new fields.SchemaField({ fixos: ids(), escolhas: new fields.ArrayField(ids()) }),
      poderId: texto()
    };
  }
}
