const fields = foundry.data.fields;
const texto = () => new fields.StringField({ required: true, blank: true, initial: "" });

/**
 * Item "magia" (compêndio Magias, tools/dados/magias.json). O texto (descrição, aprimoramentos,
 * duração, resistência) é a fonte da verdade e aparece igual no item e no cartão do chat.
 * A automação (dano, resistência, efeitos) entra nas próximas fases, por magia.
 */
export class MagiaData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      nivel: new fields.NumberField({ required: true, nullable: false, integer: true, min: 1, max: 5, initial: 1 }),
      custoPM: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 1 }),
      escola: texto(),
      execucao: texto(),
      alcance: texto(),
      alvo: texto(),
      duracao: texto(),
      resistencia: texto(),
      descricao: new fields.HTMLField({ required: true, blank: true, initial: "" }),
      // Cada aprimoramento: custo extra em PM e texto; uma vez por lançamento
      aprimoramentos: new fields.ArrayField(new fields.SchemaField({
        custo: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 1 }),
        texto: texto()
      })),
      tradicoes: new fields.ArrayField(new fields.StringField({ required: true, blank: false })),
      afinidade: texto(),
      original: new fields.BooleanField({ initial: false }),
      concentracao: new fields.BooleanField({ initial: false })
    };
  }
}
