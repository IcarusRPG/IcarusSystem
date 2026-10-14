import { TIPOS_MUNICAO, TAMANHO_PACOTE } from "../config.mjs";

const fields = foundry.data.fields;

/** Item "municao": quantidade em UNIDADES; pacote de 20 = 1 espaço. Preço em centavos por pacote. */
export class MunicaoData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      tipo: new fields.StringField({ required: true, blank: false, initial: "flechas", choices: TIPOS_MUNICAO }),
      quantidade: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: TAMANHO_PACOTE }),
      precoPacote: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }),
      descricao: new fields.HTMLField({ required: true, blank: true, initial: "" })
    };
  }

  prepareDerivedData() {
    this.tamanhoPacote = TAMANHO_PACOTE;
    // 0 unidades = 0 espaços
    this.pacotes = this.quantidade / TAMANHO_PACOTE;
    this.espacos = Math.ceil(this.quantidade / TAMANHO_PACOTE);
  }
}
