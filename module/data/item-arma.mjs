import {
  CATEGORIAS_ARMA, GRUPOS_ARMA, EMPUNHADURAS, ALCANCES, TIPOS_DANO, PROPRIEDADES_ARMA, TIPOS_MUNICAO
} from "../config.mjs";
import { ehProficiente, textoCritico, modosDeAtaque } from "../combate.mjs";

const fields = foundry.data.fields;
const inteiro = (initial = 0, opcoes = {}) =>
  new fields.NumberField({ required: true, nullable: false, integer: true, initial, ...opcoes });
const escolha = (choices, initial, opcoes = {}) =>
  new fields.StringField({ required: true, blank: false, initial, choices, ...opcoes });

/** Item "arma" (compêndio Armas; núcleo, seção 14). Preço em centavos. */
export class ArmaData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      categoria: escolha(CATEGORIAS_ARMA, "simples"),
      grupo: escolha(GRUPOS_ARMA, "corpo-a-corpo"),
      empunhadura: escolha(EMPUNHADURAS, "uma-mao"),
      dano: new fields.StringField({ required: true, blank: true, initial: "1d6" }),
      // Dano de duas mãos (Espada bastarda, Katana) ou da outra extremidade (arma Dupla)
      danoExtra: new fields.StringField({ required: true, blank: true, initial: "" }),
      criticoMargem: inteiro(20, { min: 2, max: 20 }),
      criticoMult: inteiro(2, { min: 2, max: 10 }),
      alcance: escolha(ALCANCES, "corpo-a-corpo"),
      // Armas corpo a corpo que também podem ser arremessadas (Adaga, Lança, Machadinha, Tridente)
      alcanceArremesso: new fields.StringField({ required: true, blank: true, initial: "", choices: ["", "curto"] }),
      tiposDano: new fields.ArrayField(new fields.StringField({ required: true, blank: false, choices: TIPOS_DANO })),
      propriedades: new fields.ArrayField(new fields.StringField({ required: true, blank: false, choices: PROPRIEDADES_ARMA })),
      municaoTipo: new fields.StringField({ required: true, blank: true, initial: "", choices: ["", ...TIPOS_MUNICAO] }),
      // Só armas de fogo: disparos que cabem (Cano Duplo = 2) e disparos carregados agora
      capacidadeDisparos: inteiro(0, { min: 0 }),
      carregados: inteiro(0, { min: 0 }),
      preco: inteiro(0, { min: 0 }),
      espacos: inteiro(1, { min: 0 }),
      quantidade: inteiro(1, { min: 0 }),
      empunhada: new fields.BooleanField({ initial: false }),
      proficiencia: escolha(["auto", "sim", "nao"], "auto"),
      bonusAtaque: inteiro(0),
      bonusDano: inteiro(0),
      // "auto" = primeiro pacote do tipo com unidades; ou o id de um item munição
      municaoUsada: new fields.StringField({ required: true, blank: false, initial: "auto" }),
      descricao: new fields.HTMLField({ required: true, blank: true, initial: "" })
    };
  }

  prepareDerivedData() {
    this.proficiente = ehProficiente(this);
    this.textoCritico = textoCritico(this);
    this.modos = modosDeAtaque(this);
    this.ehFogo = this.grupo === "fogo";
    // Arma de fogo nunca tem mais disparos carregados do que cabem
    if (this.ehFogo) this.carregados = Math.min(this.carregados, Math.max(1, this.capacidadeDisparos));
  }
}
