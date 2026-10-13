import {
  ATRIBUTOS, ATRIBUTOS_CHAVE_PM, PERICIAS, TAMANHOS, TIPOS_EQUIPAVEIS
} from "../config.mjs";
import {
  numero, limitar, nivelValido, ehParagon, totalAtributo, bonusTreino, totalPericia,
  maximoPelaClasse, maximoFinal, calcularDefesa, emQuadrados
} from "../regras.mjs";

const fields = foundry.data.fields;

/** Número inteiro obrigatório (nunca null). */
const inteiro = (initial = 0, opcoes = {}) =>
  new fields.NumberField({ required: true, nullable: false, integer: true, initial, ...opcoes });
const texto = () => new fields.StringField({ required: true, blank: true, initial: "" });

/**
 * Dados do Actor "personagem".
 * Tudo o que é derivado (totais, máximos, Defesa) é calculado em prepareDerivedData e nunca é salvo.
 */
export class PersonagemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      nivel: inteiro(1, { min: 1, max: 25 }),
      identidade: new fields.SchemaField({
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
      imunidades: texto(),
      sentidos: texto(),
      notas: new fields.HTMLField({ required: true, blank: true, initial: "" }),
      diario: new fields.HTMLField({ required: true, blank: true, initial: "" })
    };
  }

  /** Roda depois dos Efeitos Ativos, então Temp e os campos "Outros" já chegam somados. */
  prepareDerivedData() {
    this.nivel = nivelValido(this.nivel);
    this.paragon = ehParagon(this.nivel);

    // Atributos: Total = Base + Raça + Temp
    for (const k of ATRIBUTOS) {
      const a = this.atributos[k];
      a.total = totalAtributo(a);
    }
    const total = k => (ATRIBUTOS.includes(k) ? this.atributos[k].total : null);

    // PV e PM
    const cc = this.classeConfig;
    this.pv.formula = maximoPelaClasse({
      inicial: cc.pvInicial, porNivel: cc.pvPorNivel, atributoTotal: total(cc.pvAtributo), nivel: this.nivel
    });
    this.pm.formula = maximoPelaClasse({
      inicial: cc.pmInicial, porNivel: cc.pmPorNivel, atributoTotal: total(cc.pmAtributo), nivel: this.nivel
    });
    this.pv.max = maximoFinal({ manual: cc.manual, maximoManual: this.pv.max, maximoFormula: this.pv.formula, bonus: cc.bonusPv });
    this.pm.max = maximoFinal({ manual: cc.manual, maximoManual: this.pm.max, maximoFormula: this.pm.formula, bonus: cc.bonusPm });
    this.pv.value = limitar(numero(this.pv.value), 0, this.pv.max);
    this.pm.value = limitar(numero(this.pm.value), 0, this.pm.max);

    // Defesa: Armadura e Escudo vêm dos itens equipados
    let armadura = 0, escudo = 0;
    for (const item of this.parent?.items ?? []) {
      if (item.type !== "equipamento") continue;
      const s = item.system;
      if (!s.equipado || !TIPOS_EQUIPAVEIS.includes(s.tipo)) continue;
      if (s.tipo === "armadura") armadura += numero(s.bonusDefesa);
      else escudo += numero(s.bonusDefesa);
    }
    this.defesa.armadura = armadura;
    this.defesa.escudo = escudo;
    this.defesa.total = calcularDefesa({ des: this.atributos.DES.total, armadura, escudo, outros: this.defesa.outros });

    // Perícias: Atributo + Treino + Outros
    for (const p of PERICIAS) {
      const d = this.pericias[p.chave];
      if (!ATRIBUTOS.includes(d.atributo)) d.atributo = p.atributo;
      d.bonusTreino = bonusTreino(d.treino);
      d.total = totalPericia(this.atributos[d.atributo].total, d.treino, d.outros);
    }

    this.deslocamentoQuadrados = emQuadrados(this.deslocamento);
  }
}
