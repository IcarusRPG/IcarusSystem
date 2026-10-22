import { TIPOS_EQUIPAMENTO, TIPOS_EQUIPAVEIS, CATEGORIAS_ARMADURA } from "../config.mjs";

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
      // Armaduras e escudos: categoria, penalidade de armadura (em Acrobacia, Furtividade e Prestidigitação),
      // escudo acoplado e campos ainda não confirmados no núcleo. Túnica não é armadura e exige a
      // proficiência própria "túnicas" (proficiencias.tunicas do personagem)
      categoria: new fields.StringField({ required: true, blank: true, initial: "", choices: ["", ...CATEGORIAS_ARMADURA] }),
      penalidade: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }),
      acoplado: new fields.BooleanField({ initial: false }),
      provisorio: new fields.ArrayField(new fields.StringField({ required: true, blank: false })),
      preco: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }),
      // Espaços na carga: 1 por padrão, 0,5 para miudezas e 2 para volumosos (frações valem)
      espacos: new fields.NumberField({ required: true, nullable: false, min: 0, initial: 1 }),
      // Itens comuns (tipo "item-comum", compêndio Itens Comuns): categoria, venda, vestimenta,
      // bônus de perícia ({ pericia, valor, condicao, escolha[], penalidadeSemItem }), usos e origem
      categoriaItem: new fields.StringField({ required: true, blank: true, initial: "" }),
      precoVenda: new fields.NumberField({ required: true, nullable: true, integer: true, min: 0, initial: null }),
      semVenda: new fields.BooleanField({ initial: false }),
      vestimenta: new fields.BooleanField({ initial: false }),
      vestido: new fields.BooleanField({ initial: false }),
      bonus: new fields.ArrayField(new fields.ObjectField()),
      valeEnquantoPossui: new fields.BooleanField({ initial: false }),
      usos: new fields.SchemaField({
        max: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }),
        atual: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 })
      }),
      origemItem: new fields.BooleanField({ initial: false }),
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
