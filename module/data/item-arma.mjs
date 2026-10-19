import {
  CATEGORIAS_ARMA, GRUPOS_ARMA, EMPUNHADURAS, ALCANCES, TIPOS_DANO, PROPRIEDADES_ARMA, TIPOS_MUNICAO
} from "../config.mjs";
import { ehProficiente, textoCritico, modosDeAtaque } from "../combate.mjs";
import { SISTEMA_ID } from "../config.mjs";
import { danoDesarmadoDoMonge } from "../classes-dados.mjs";

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
    // Ataque desarmado do Monge: dado pelo nível; com Braços Astrais, dano de Essência
    const flags = this.parent?.flags?.[SISTEMA_ID];
    const dono = this.parent?.parent;
    if (flags?.desarmadoMonge && dono?.system) {
      this.dano = danoDesarmadoDoMonge(dono.system.nivel);
      if (dono.flags?.[SISTEMA_ID]?.bracosAstrais) this.tiposDano = ["essencia"];
    }
    // "auto": confere as proficiências do personagem dono da arma (sem dono: só armas simples)
    this.proficiente = ehProficiente(this, this.parent?.parent?.system?.proficiencias ?? null);
    // Arma Exótica (poder): proficiência com a arma escolhida (pelo id do compêndio ou pelo nome)
    if (!this.proficiente && this.proficiencia === "auto" && dono?.items) {
      const meuId = flags?.id;
      const nome = (this.parent?.name ?? "").toLowerCase();
      this.proficiente = dono.items.some(i => {
        const e = i.flags?.[SISTEMA_ID]?.armaExotica;
        return e && (e.id === meuId || String(e.nome).toLowerCase() === nome);
      });
    }
    this.textoCritico = textoCritico(this);
    this.modos = modosDeAtaque(this);
    this.ehFogo = this.grupo === "fogo";
    // Arma de fogo nunca tem mais disparos carregados do que cabem
    if (this.ehFogo) this.carregados = Math.min(this.carregados, Math.max(1, this.capacidadeDisparos));
  }
}
