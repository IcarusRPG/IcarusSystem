/**
 * Listas e constantes do sistema Icarus RPG.
 * Este arquivo não usa nada do Foundry, para poder ser testado no Node.
 * Para estender (novos tamanhos, tipos de item, fontes de poder), acrescente entradas aqui
 * e as respectivas traduções em lang/pt-BR.json.
 */

export const SISTEMA_ID = "icarus-rpg";

/** Ícone padrão de todo personagem novo (o nome do arquivo tem espaços). */
export const ICONE_PADRAO = encodeURI(`systems/${SISTEMA_ID}/img/Icones/default/Dado Azul 500x500.png`);

/** Seis atributos, usados como modificador direto (ex.: FOR +3). */
export const ATRIBUTOS = ["FOR", "DES", "CON", "INT", "SAB", "CAR"];

/** Só classes conjuradoras têm atributo-chave de PM, e ele é INT, SAB ou CAR. */
export const ATRIBUTOS_CHAVE_PM = ["INT", "SAB", "CAR"];

/** Bônus de treino por grau: Destreinado +0 · Treinado +2 · Especialista +4. */
export const BONUS_TREINO = [0, 2, 4];

/** Nível máximo e início do tier Paragon (semideuses/semidemônios). */
export const NIVEL_MAXIMO = 25;
export const NIVEL_PARAGON = 21;

/**
 * As 30 perícias, em ordem alfabética, com o atributo-padrão.
 * resistencia = também é teste de Resistência (Fortitude, Reflexos, Vontade).
 * Olfato, Audição e Visão são perícias separadas: não existe "Percepção".
 */
export const PERICIAS = [
  { chave: "acrobacia", atributo: "DES" },
  { chave: "adestramento", atributo: "CAR" },
  { chave: "atletismo", atributo: "FOR" },
  { chave: "atuacao", atributo: "CAR" },
  { chave: "audicao", atributo: "SAB" },
  { chave: "barganha", atributo: "CAR" },
  { chave: "cavalgar", atributo: "DES" },
  { chave: "concentracao", atributo: "CON" },
  { chave: "cura", atributo: "SAB" },
  { chave: "diplomacia", atributo: "CAR" },
  { chave: "enganacao", atributo: "CAR" },
  { chave: "fortitude", atributo: "CON", resistencia: true },
  { chave: "furtividade", atributo: "DES" },
  { chave: "historia", atributo: "INT" },
  { chave: "iniciativa", atributo: "DES" },
  { chave: "intimidacao", atributo: "CAR" },
  { chave: "intuicao", atributo: "SAB" },
  { chave: "investigacao", atributo: "INT" },
  { chave: "luta", atributo: "FOR" },
  { chave: "misticismo", atributo: "INT" },
  { chave: "navegacao", atributo: "SAB" },
  { chave: "nobreza", atributo: "INT" },
  { chave: "olfato", atributo: "SAB" },
  { chave: "pontaria", atributo: "DES" },
  { chave: "prestidigitacao", atributo: "DES" },
  { chave: "reflexos", atributo: "DES", resistencia: true },
  { chave: "religiao", atributo: "SAB" },
  { chave: "sobrevivencia", atributo: "SAB" },
  { chave: "visao", atributo: "SAB" },
  { chave: "vontade", atributo: "SAB", resistencia: true }
];

/** Chips de Resistência da coluna lateral. */
export const RESISTENCIAS = [
  { chave: "fortitude", abrev: "FORT" },
  { chave: "reflexos", abrev: "REFL" },
  { chave: "vontade", abrev: "VONT" }
];

/**
 * Tamanhos e deslocamento padrão em metros (1 quadrado = 1,5 m).
 * Grande ainda não tem deslocamento definido nas regras.
 */
export const TAMANHOS = {
  pequeno: { deslocamento: 6 },
  medio: { deslocamento: 9 },
  grande: { deslocamento: null }
};
export const METROS_POR_QUADRADO = 1.5;

/** Tipos de item "equipamento". Só armadura e escudo podem ser equipados e somam na Defesa. */
export const TIPOS_EQUIPAMENTO = ["arma", "armadura", "escudo", "consumivel", "profissao", "outro"];
export const TIPOS_EQUIPAVEIS = ["armadura", "escudo"];

/** De onde vem um poder; a aba Poderes agrupa nesta ordem. */
export const FONTES_PODER = ["raca", "classe", "origem", "profissao", "geral"];

/** Campos que os Efeitos Ativos podem alterar (modo Somar). */
export function chavesDeEfeito() {
  return [
    ...ATRIBUTOS.map(k => `system.atributos.${k}.temp`),
    "system.defesa.outros",
    ...PERICIAS.map(p => `system.pericias.${p.chave}.outros`)
  ];
}

export const ICARUS = {
  SISTEMA_ID, ICONE_PADRAO, ATRIBUTOS, ATRIBUTOS_CHAVE_PM, BONUS_TREINO, NIVEL_MAXIMO, NIVEL_PARAGON,
  PERICIAS, RESISTENCIAS, TAMANHOS, METROS_POR_QUADRADO, TIPOS_EQUIPAMENTO, TIPOS_EQUIPAVEIS, FONTES_PODER
};
