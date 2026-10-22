const fields = foundry.data.fields;
const texto = () => new fields.StringField({ required: true, blank: true, initial: "" });
const ids = () => new fields.ArrayField(new fields.StringField({ required: true, blank: false }));

/**
 * Item "origem" (compêndio Origens): a perícia treinada, o texto curto, os 2 itens comuns
 * (fixos e grupos "um ou outro") e o id do Poder de Origem. Escolher a origem na ficha usa estes
 * dados (module/origens.mjs); o item em si só é referência.
 */
export class OrigemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      origemId: texto(),
      pericia: texto(),
      texto: texto(),
      itens: new fields.SchemaField({ fixos: ids(), escolhas: new fields.ArrayField(ids()) }),
      poderId: texto()
    };
  }
}
