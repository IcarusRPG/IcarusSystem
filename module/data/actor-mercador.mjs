import { ATRIBUTOS } from "../config.mjs";
import { TESTES_DE_BARGANHA, RESULTADOS, BARGANHA_PADRAO, textoDasFalasPadrao } from "../loja.mjs";

const fields = foundry.data.fields;
const inteiro = (initial = 0, opcoes = {}) => new fields.NumberField({ required: true, nullable: false, integer: true, initial, ...opcoes });
const texto = (initial = "") => new fields.StringField({ required: true, blank: true, initial });

/**
 * Ator "mercador": personagem do Mestre que vende itens (ficha compacta + vitrine para os jogadores).
 * Sem derivação: Defesa, PV, PM, atributos e perícias são números digitados. O estoque são os itens
 * do próprio ator (flags["icarus-rpg"].loja de cada item; regras em module/loja.mjs).
 */
export class MercadorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      nivel: inteiro(1, { min: 0 }),
      defesa: inteiro(10),
      pv: new fields.SchemaField({ value: inteiro(10, { min: 0 }), max: inteiro(10, { min: 0 }) }),
      pm: new fields.SchemaField({ value: inteiro(0, { min: 0 }), max: inteiro(0, { min: 0 }) }),
      // Atributos como modificador direto (as mesmas chaves do personagem)
      atributos: new fields.SchemaField(Object.fromEntries(ATRIBUTOS.map(k => [k, inteiro(0)]))),
      pericias: new fields.ArrayField(new fields.SchemaField({ nome: texto(), bonus: inteiro(0) })),
      habilidades: new fields.ArrayField(new fields.SchemaField({ nome: texto(), descricao: texto() })),
      // Dinheiro do mercador (centavos por moeda, como o personagem); caixa infinita não conta
      caixa: new fields.SchemaField({ ouroReal: inteiro(0, { min: 0 }), real: inteiro(0, { min: 0 }), centavo: inteiro(0, { min: 0 }) }),
      caixaInfinita: new fields.BooleanField({ initial: true }),
      loja: new fields.SchemaField({
        aberta: new fields.BooleanField({ initial: true }),
        saudacao: texto(),
        despedida: texto(),
        // 1.25 = 25% mais caro
        multiplicadorPreco: new fields.NumberField({ required: true, nullable: false, min: 0.01, initial: 1 }),
        // Fase 2: o mercador também compra dos jogadores (preço de venda ou preço × percentual)
        compra: new fields.SchemaField({
          ativo: new fields.BooleanField({ initial: false }),
          percentual: new fields.NumberField({ required: true, nullable: false, min: 0, max: 1, initial: 0.5 })
        }),
        // Barganha (Barganha, Diplomacia, Intimidação): CDs, efeitos, guardas e falas (uma por linha)
        barganha: new fields.SchemaField({
          testes: new fields.SchemaField(Object.fromEntries(TESTES_DE_BARGANHA.map(t => [t, new fields.SchemaField({
            ativo: new fields.BooleanField({ initial: true }), cd: inteiro(BARGANHA_PADRAO.testes[t].cd, { min: 0 })
          })]))),
          descontoSucesso: inteiro(BARGANHA_PADRAO.descontoSucesso, { min: 0, max: 100 }),
          descontoCritico: inteiro(BARGANHA_PADRAO.descontoCritico, { min: 0, max: 100 }),
          acrescimo: inteiro(BARGANHA_PADRAO.acrescimo, { min: 0 }),
          guardas: new fields.SchemaField({
            fecharLoja: new fields.BooleanField({ initial: true }),
            avisarMestre: new fields.BooleanField({ initial: true }),
            nota: texto()
          }),
          mostrarCD: new fields.BooleanField({ initial: false }),
          falasNoChat: new fields.BooleanField({ initial: true }),
          falas: new fields.SchemaField(Object.fromEntries(TESTES_DE_BARGANHA.map(t => [t, new fields.SchemaField(
            Object.fromEntries(RESULTADOS.map(r => [r, texto(textoDasFalasPadrao(t, r))]))
          )])))
        })
      }),
      descricao: new fields.HTMLField({ required: true, blank: true, initial: "" }),
      notas: new fields.HTMLField({ required: true, blank: true, initial: "" })
    };
  }
}
