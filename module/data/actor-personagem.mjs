import { ATRIBUTOS, ATRIBUTOS_CHAVE_PM, PERICIAS, TAMANHOS } from "../config.mjs";
import { derivarPersonagem } from "../derivar.mjs";
import { racaPorId, idDaRacaPorNome } from "./racas.mjs";

const fields = foundry.data.fields;

/** Número inteiro obrigatório (nunca null). */
const inteiro = (initial = 0, opcoes = {}) =>
  new fields.NumberField({ required: true, nullable: false, integer: true, initial, ...opcoes });
const texto = () => new fields.StringField({ required: true, blank: true, initial: "" });

/**
 * Dados do Actor "personagem".
 * Tudo o que é derivado (totais, máximos, Defesa) é calculado em module/derivar.mjs e nunca é salvo.
 */
export class PersonagemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      nivel: inteiro(1, { min: 1, max: 25 }),
      identidade: new fields.SchemaField({
        // Raça: id de module/data/racas.mjs ("koruma"); texto livre = raça personalizada, sem automação
        raca: texto(), origem: texto(), classe: texto(), profissao: texto(), divindade: texto()
      }),
      // Cada atributo: Base (criação e poderes) · Raça (modificador racial) · Temp (temporário).
      atributos: new fields.SchemaField(Object.fromEntries(ATRIBUTOS.map(k => [k, new fields.SchemaField({
        base: inteiro(0), racial: inteiro(0), temp: inteiro(0)
      })]))),
      // Configuração da classe, editada no diálogo "Configuração de Nível".
      classeConfig: new fields.SchemaField({
        pvInicial: inteiro(0, { min: 0 }),
        pvPorNivel: inteiro(0, { min: 0 }),
        pmInicial: inteiro(0, { min: 0 }),
        pmPorNivel: inteiro(0, { min: 0 }),
        pvAtributo: new fields.StringField({ required: true, nullable: true, blank: false, initial: "CON", choices: ATRIBUTOS }),
        pmAtributo: new fields.StringField({ required: true, nullable: true, blank: false, initial: null, choices: ATRIBUTOS_CHAVE_PM }),
        bonusPv: inteiro(0),
        bonusPm: inteiro(0),
        // Só alterados por Efeitos Ativos de poderes (ex.: Sangue de Aço); não aparecem como campo editável
        bonusPvPorNivel: inteiro(0),
        bonusPmPorNivel: inteiro(0),
        bonusPmNivelImpar: inteiro(0),
        manual: new fields.BooleanField({ initial: false })
      }),
      // "max" só é lido no modo manual; fora dele é recalculado pela fórmula.
      pv: new fields.SchemaField({ value: inteiro(0, { min: 0 }), max: inteiro(0, { min: 0 }) }),
      pm: new fields.SchemaField({ value: inteiro(0, { min: 0 }), max: inteiro(0, { min: 0 }) }),
      defesa: new fields.SchemaField({ outros: inteiro(0) }),
      deslocamento: new fields.NumberField({ required: true, nullable: false, initial: 9, min: 0 }),
      tamanho: new fields.StringField({ required: true, blank: false, initial: "medio", choices: Object.keys(TAMANHOS) }),
      pericias: new fields.SchemaField(Object.fromEntries(PERICIAS.map(p => [p.chave, new fields.SchemaField({
        treino: inteiro(0, { min: 0, max: 2 }),
        outros: inteiro(0),
        atributo: new fields.StringField({ required: true, blank: false, initial: p.atributo, choices: ATRIBUTOS })
      })]))),
      proficiencias: new fields.SchemaField({ armas: texto(), armaduras: texto() }),
      // Moedas (núcleo, seção 12): 1 Ouro Real = 1.000 Reais; 1 Real = 100 Centavos
      moedas: new fields.SchemaField({
        ouroReal: inteiro(0, { min: 0 }), real: inteiro(0, { min: 0 }), centavo: inteiro(0, { min: 0 })
      }),
      imunidades: texto(),
      sentidos: texto(),
      notas: new fields.HTMLField({ required: true, blank: true, initial: "" }),
      diario: new fields.HTMLField({ required: true, blank: true, initial: "" })
    };
  }

  /** O campo Raça era texto livre: se o texto bate com o nome de uma raça, vira o id dela. */
  static migrateData(source) {
    const raca = source.identidade?.raca;
    if (typeof raca === "string" && raca && !racaPorId(raca)) {
      const id = idDaRacaPorNome(raca);
      if (id) source.identidade.raca = id;
    }
    return super.migrateData(source);
  }

  /** Roda depois dos Efeitos Ativos, então Temp, "Outros", treino e deslocamento já chegam com os bônus. */
  prepareDerivedData() {
    derivarPersonagem(this, this.parent?.items ?? []);
  }
}
