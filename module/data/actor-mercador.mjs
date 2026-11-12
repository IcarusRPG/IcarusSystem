import { TESTES_DE_BARGANHA, RESULTADOS, BARGANHA_PADRAO, ROUBO_PADRAO, textoDasFalasPadrao } from "../loja.mjs";
import { PROFICIENCIAS_ARMA, CATEGORIAS_ARMADURA_CORPO } from "../config.mjs";
import { PersonagemData } from "./actor-personagem.mjs";
import { converterMercadorAntigo, ehEstoque } from "../mercador-dados.mjs";

const fields = foundry.data.fields;
const inteiro = (initial = 0, opcoes = {}) => new fields.NumberField({ required: true, nullable: false, integer: true, initial, ...opcoes });
const texto = (initial = "") => new fields.StringField({ required: true, blank: true, initial });

/**
 * Ator "mercador": personagem do Mestre que vende itens (ficha compacta + vitrine para os jogadores).
 * Usa o MESMO modelo do personagem (atributos, perícias com treino/outros, Defesa derivada da
 * armadura e do escudo equipados, proficiências, resistências), então perícias, ataques, dano e
 * condições funcionam pelas mesmas funções. Diferenças: sem classe (PV e PM são digitados:
 * classeConfig.manual sempre ligado), "Defesa manual" opcional, proficiências em tudo por padrão,
 * e a loja (estoque = itens com flags["icarus-rpg"].loja; regras em module/loja.mjs).
 * Mercadores antigos (antes da 0.35.0) são convertidos em migrateData (module/mercador-dados.mjs).
 */
export class MercadorData extends PersonagemData {
  static defineSchema() {
    const base = super.defineSchema();
    return {
      ...base,
      // Mercador começa podendo usar tudo (o Mestre restringe)
      proficiencias: new fields.SchemaField({
        armas: new fields.ArrayField(new fields.StringField({ required: true, blank: false, choices: PROFICIENCIAS_ARMA }), { initial: [...PROFICIENCIAS_ARMA] }),
        armaduras: new fields.ArrayField(new fields.StringField({ required: true, blank: false, choices: CATEGORIAS_ARMADURA_CORPO }), { initial: [...CATEGORIAS_ARMADURA_CORPO] }),
        escudo: new fields.BooleanField({ initial: true }),
        tunicas: new fields.BooleanField({ initial: true }),
        texto: texto()
      }),
      // "Defesa manual": ligada, a Defesa é o valor digitado (mercadores antigos); desligada, derivada
      defesaManual: new fields.SchemaField({ ativo: new fields.BooleanField({ initial: false }), valor: inteiro(10) }),
      // Habilidades livres antigas: a migração do mundo as transforma em itens "poder" e esvazia a lista
      habilidades: new fields.ArrayField(new fields.SchemaField({ nome: texto(), descricao: texto() })),
      // Dinheiro do mercador (centavos por moeda); caixa infinita não conta
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
        // Roubo (Prestidigitação) e compra sem dinheiro: os guardas usam as opções do bloco da Barganha
        roubo: new fields.SchemaField({
          permitir: new fields.BooleanField({ initial: ROUBO_PADRAO.permitir }),
          cd: inteiro(ROUBO_PADRAO.cd, { min: 0 }),
          tentativas: inteiro(ROUBO_PADRAO.tentativas, { min: 1 }),
          aviso: texto(ROUBO_PADRAO.aviso),
          falasGuardas: texto(ROUBO_PADRAO.falasGuardas),
          falasFlagrante: texto(ROUBO_PADRAO.falasFlagrante),
          sucesso: texto(ROUBO_PADRAO.sucesso)
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
      descricao: new fields.HTMLField({ required: true, blank: true, initial: "" })
    };
  }

  /** Mercadores antigos (atributos, Defesa e perícias digitados) viram o formato do personagem. */
  static migrateData(source) {
    converterMercadorAntigo(source);
    return super.migrateData(source);
  }

  /** O estoque da loja não é do mercador: fora da Defesa, das perícias e da carga. */
  _itensParaDerivar(actor) {
    return [...(actor?.items ?? [])].filter(i => !ehEstoque(i));
  }

  /** Mesma derivação do personagem, com PV/PM digitados (sem classe) e a "Defesa manual" opcional. */
  prepareDerivedData() {
    this.classeConfig.manual = true;
    super.prepareDerivedData();
    if (this.defesaManual?.ativo) this.defesa.total = Math.trunc(Number(this.defesaManual.valor) || 0);
  }
}
