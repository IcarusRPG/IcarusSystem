import { PersonagemData } from "./actor-personagem.mjs";
import { PAPEIS, TAMANHOS_AMEACA, ajustesDaAmeaca } from "../ameaca-dados.mjs";
import { bonusTreino } from "../regras.mjs";

const fields = foundry.data.fields;
const inteiro = (initial = 0, opcoes = {}) => new fields.NumberField({ required: true, nullable: false, integer: true, initial, ...opcoes });
const texto = (initial = "") => new fields.StringField({ required: true, blank: true, initial });

/**
 * Ator "ameaca": criatura do Mestre (bestiário). Os números vêm prontos (Defesa, PV, salvaguardas,
 * iniciativa, ataques) e são todos editáveis; nada vem de classe ou nível.
 * Usa o modelo do personagem por baixo (como o mercador) para que dano, condições, testes de
 * resistência, iniciativa, barras do token e Efeitos Ativos funcionem pelas mesmas funções:
 * - atributos = modificadores (base), perícias = atributo + treino + outros (sem nível);
 * - Defesa = defesa.valor; Fortitude/Reflexos/Vontade = salvaguardas; Iniciativa = iniciativa.
 *   A derivação acerta o "outros" dessas perícias para o total bater com o valor digitado e soma
 *   por cima os Efeitos e as condições (Abalado, Desprevenido…);
 * - PV/PM digitados (classeConfig.manual); a RD digitada não tem o teto de personagem.
 * PV 0 não abre o fluxo de testes de morte (module/morte-foundry.mjs só vale para "personagem").
 */
export class AmeacaData extends PersonagemData {
  static defineSchema() {
    const base = super.defineSchema();
    return {
      ...base,
      nd: texto("1"),
      ndContaComo: new fields.NumberField({ required: true, nullable: true, integer: true, initial: null }),
      papel: new fields.StringField({ required: true, blank: false, initial: "solo", choices: PAPEIS }),
      tipo: texto("Animal"),
      subtitulo: texto(),
      tamanho: new fields.StringField({ required: true, blank: false, initial: "medio", choices: Object.keys(TAMANHOS_AMEACA) }),
      // valor = Defesa da criatura; outros = bônus de Efeitos por cima
      defesa: new fields.SchemaField({ valor: inteiro(10), outros: inteiro(0) }),
      iniciativa: inteiro(0),
      deslocamentoTexto: texto(),
      cd: new fields.NumberField({ required: true, nullable: true, integer: true, initial: null }),
      salvaguardas: new fields.SchemaField({ fort: inteiro(0), ref: inteiro(0), von: inteiro(0) }),
      ataques: new fields.ArrayField(new fields.SchemaField({
        nome: texto(), bonus: inteiro(0), dados: texto("1d6"), fixo: inteiro(0), tipo: texto(), alcance: texto("corpo-a-corpo")
      })),
      ataquesTexto: texto(),
      tesouro: texto(),
      acompanha: texto(),
      nota: texto(),
      descricao: new fields.HTMLField({ required: true, blank: true, initial: "" })
    };
  }

  prepareDerivedData() {
    this.classeConfig.manual = true;
    // Valores salvos (sem Efeitos): o ajuste não anula o que os Efeitos somam
    const src = this.parent?._source?.system ?? this;
    const ajustes = ajustesDaAmeaca(src, bonusTreino);
    this.defesa.outros += ajustes.defesa;
    for (const [chave, delta] of Object.entries(ajustes.pericias)) this.pericias[chave].outros += delta;
    super.prepareDerivedData();
    // RD do bestiário (até 10 nas criaturas S+): o teto de personagem (8 + metade do nível) não vale
    const rdDigitada = Math.trunc(Number(src.resistencias?.rdGeral) || 0);
    if (this.resistencias && this.resistencias.rdGeral < rdDigitada) this.resistencias.rdGeral = rdDigitada;
  }
}
