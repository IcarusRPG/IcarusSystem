import { TIPOS_EQUIPAMENTO, TIPOS_EQUIPAVEIS } from "../config.mjs";

const fields = foundry.data.fields;

/**
 * Item "equipamento": armaduras, escudos, túnicas, consumíveis e outros.
 * Armadura e escudo equipados somam bonusDefesa na Defesa do personagem. Preço em centavos.
 */
export class EquipamentoData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      tipo: new fields.StringField({ required: true, blank: false, initial: "outro", choices: TIPOS_EQUIPAMENTO }),
      quantidade: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 1 }),
      equipado: new fields.BooleanField({ initial: false }),
      bonusDefesa: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
      preco: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }),
      espacos: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 1 }),
      descricao: new fields.HTMLField({ required: true, blank: true, initial: "" })
    };
  }

  /** Armas viraram um tipo de item próprio: equipamentos antigos do tipo "arma" passam a "outro". */
  static migrateData(source) {
    if (source.tipo === "arma") source.tipo = "outro";
    return super.migrateData(source);
  }

  /** Só armadura e escudo têm o botão Equipar. */
  get equipavel() {
    return TIPOS_EQUIPAVEIS.includes(this.tipo);
  }
}
