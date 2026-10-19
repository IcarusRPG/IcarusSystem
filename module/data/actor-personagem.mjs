import { ATRIBUTOS, ATRIBUTOS_CHAVE_PM, PERICIAS, TAMANHOS, TIPOS_DANO_COM_RESISTENCIA, PROFICIENCIAS_ARMA, CATEGORIAS_ARMADURA_CORPO } from "../config.mjs";
import { derivarPersonagem } from "../derivar.mjs";
import { racaPorId, idDaRacaPorNome } from "./racas.mjs";
import { divindadePorId, idDaDivindadePorNome } from "../panteao.mjs";
import { classePorId, idDaClassePorNome } from "../classes-dados.mjs";
import { SISTEMA_ID } from "../config.mjs";

const CHAVE_RD = /^system\.resistencias\.(rdGeral|reducao\.(\w+))$/;

/**
 * Fontes de RD do ator: Efeitos Ativos que SOMAM na RD geral ou numa Redução de [tipo] e itens
 * com flags["icarus-rpg"].rd = [{ valor, tipo|null }] (equipamentos só equipados).
 * A "mesma fonte" é o mesmo item (pelo id do compêndio, flags["icarus-rpg"].id, ou pelo nome) ou
 * o mesmo efeito do próprio ator (pelo nome): duas cópias contam uma vez.
 * Devolve também a base digitada (valores salvos, antes dos efeitos).
 */
export function fontesDeRD(actor) {
  const fontes = [];
  const chaveDoItem = item => `item:${item.flags?.[SISTEMA_ID]?.id ?? item.name}`;
  const modoSomar = CONST?.ACTIVE_EFFECT_MODES?.ADD ?? 2;
  for (const efeito of actor.allApplicableEffects?.() ?? []) {
    if (efeito.disabled || efeito.isSuppressed) continue;
    const item = efeito.parent !== actor ? efeito.parent : null;
    for (const c of efeito.changes ?? []) {
      const m = c.key.match(CHAVE_RD);
      if (!m || Number(c.mode) !== modoSomar) continue;
      fontes.push({
        tipo: m[2] ?? null, valor: Number(c.value) || 0,
        origem: item ? item.name : efeito.name,
        chave: `${item ? chaveDoItem(item) : `efeito:${efeito.name}`}|${m[1]}`
      });
    }
  }
  for (const item of actor.items ?? []) {
    const lista = item.flags?.[SISTEMA_ID]?.rd;
    if (!Array.isArray(lista)) continue;
    if (item.type === "equipamento" && !item.system?.equipado) continue;
    for (const r of lista) fontes.push({ tipo: r.tipo ?? null, valor: Number(r.valor) || 0, origem: item.name, chave: `${chaveDoItem(item)}|${r.tipo ?? "rdGeral"}` });
  }
  const salvo = actor._source?.system?.resistencias ?? {};
  return { base: { rdGeral: salvo.rdGeral ?? 0, reducao: { ...(salvo.reducao ?? {}) } }, fontes };
}

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
        // Exceção do Monge: o atributo de PM soma uma única vez, no 1º nível
        pmAtributoSoNoPrimeiroNivel: new fields.BooleanField({ initial: false }),
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
      // Proficiências: listas marcáveis (usadas nas regras) + texto livre para o resto
      proficiencias: new fields.SchemaField({
        armas: new fields.ArrayField(new fields.StringField({ required: true, blank: false, choices: PROFICIENCIAS_ARMA }), { initial: ["simples"] }),
        armaduras: new fields.ArrayField(new fields.StringField({ required: true, blank: false, choices: CATEGORIAS_ARMADURA_CORPO })),
        escudo: new fields.BooleanField({ initial: false }),
        tunicas: new fields.BooleanField({ initial: false }),
        texto: texto()
      }),
      // Moedas (núcleo, seção 12): 1 Ouro Real = 1.000 Reais; 1 Real = 100 Centavos
      moedas: new fields.SchemaField({
        ouroReal: inteiro(0, { min: 0 }), real: inteiro(0, { min: 0 }), centavo: inteiro(0, { min: 0 })
      }),
      // Resistências (por tipo de dano): Redução de [tipo] X, Imunidade, Vulnerabilidade e RD geral.
      // Efeitos Ativos podem somar (reducao, rdGeral) ou forçar true (imunidade, vulnerabilidade).
      resistencias: new fields.SchemaField({
        rdGeral: inteiro(0),
        reducao: new fields.SchemaField(Object.fromEntries(TIPOS_DANO_COM_RESISTENCIA.map(k => [k, inteiro(0)]))),
        imunidade: new fields.SchemaField(Object.fromEntries(TIPOS_DANO_COM_RESISTENCIA.map(k => [k, new fields.BooleanField({ initial: false })]))),
        vulnerabilidade: new fields.SchemaField(Object.fromEntries(TIPOS_DANO_COM_RESISTENCIA.map(k => [k, new fields.BooleanField({ initial: false })])))
      }),
      // Testes de morte (Morrendo): sucessos, falhas e se ficou estável
      morte: new fields.SchemaField({
        sucessos: inteiro(0, { min: 0, max: 3 }), falhas: inteiro(0, { min: 0, max: 3 }), estavel: new fields.BooleanField({ initial: false })
      }),
      // Recursos de classe (usos limitados): valor/máximo e quando recarregam
      recursos: new fields.ArrayField(new fields.SchemaField({
        id: new fields.StringField({ required: true, blank: false }),
        nome: texto(),
        valor: inteiro(0, { min: 0 }),
        max: inteiro(1, { min: 0 }),
        recarga: new fields.StringField({ required: true, blank: false, initial: "cena", choices: ["cena", "rodada", "descanso"] })
      })),
      // Reação da rodada (renova no início do turno do personagem)
      reacao: new fields.SchemaField({ disponivel: new fields.BooleanField({ initial: true }) }),
      // Bônus gerais de ataque (Efeitos Ativos podem somar aqui)
      bonus: new fields.SchemaField({ ataque: inteiro(0) }),
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
    // Classe também era texto livre: se bate com o nome de uma classe do sistema, vira o id
    const classe = source.identidade?.classe;
    if (typeof classe === "string" && classe && !classePorId(classe)) {
      const id = idDaClassePorNome(classe);
      if (id) source.identidade.classe = id;
    }
    // Divindade também era texto livre: vira o id; texto que não bate fica como "Outra"
    const divindade = source.identidade?.divindade;
    if (typeof divindade === "string" && divindade && !divindadePorId(divindade)) {
      const id = idDaDivindadePorNome(divindade);
      if (id) source.identidade.divindade = id;
    }
    // Proficiências eram dois textos livres: o texto é preservado em "texto" e as listas começam
    // só com armas simples (o jogador marca o resto; a classe preenche ao ser escolhida)
    const prof = source.proficiencias;
    if (prof && (typeof prof.armas === "string" || typeof prof.armaduras === "string")) {
      const antigo = [prof.armas, prof.armaduras].filter(t => typeof t === "string" && t.trim()).join(" · ");
      source.proficiencias = { armas: ["simples"], armaduras: [], escudo: false, tunicas: false, texto: prof.texto ?? antigo };
    }
    return super.migrateData(source);
  }

  /** Roda depois dos Efeitos Ativos, então Temp, "Outros", treino e deslocamento já chegam com os bônus. */
  prepareDerivedData() {
    const actor = this.parent;
    const rd = actor ? fontesDeRD(actor) : undefined;
    derivarPersonagem(this, actor?.items ?? [], actor?.statuses ?? [], { rd });
  }
}
