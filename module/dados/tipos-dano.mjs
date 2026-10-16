// GERADO por tools/gerar-dados.mjs a partir de tools/dados/tipos-dano.json — não edite à mão.
export default {
  "tipos": [
    {
      "id": "dano",
      "nome": "Dano (sem tipo)",
      "grupo": "generico"
    },
    {
      "id": "corte",
      "nome": "Corte",
      "grupo": "fisico"
    },
    {
      "id": "perfuracao",
      "nome": "Perfuração",
      "grupo": "fisico"
    },
    {
      "id": "impacto",
      "nome": "Impacto",
      "grupo": "fisico"
    },
    {
      "id": "fogo",
      "nome": "Fogo",
      "grupo": "elemental"
    },
    {
      "id": "frio",
      "nome": "Frio",
      "grupo": "elemental"
    },
    {
      "id": "eletrico",
      "nome": "Elétrico",
      "grupo": "elemental"
    },
    {
      "id": "acido",
      "nome": "Ácido",
      "grupo": "elemental"
    },
    {
      "id": "luz",
      "nome": "Luz",
      "grupo": "energia"
    },
    {
      "id": "trevas",
      "nome": "Trevas",
      "grupo": "energia"
    },
    {
      "id": "essencia",
      "nome": "Essência",
      "grupo": "energia"
    },
    {
      "id": "psiquico",
      "nome": "Psíquico",
      "grupo": "mental"
    },
    {
      "id": "veneno",
      "nome": "Veneno",
      "grupo": "toxina"
    }
  ],
  "regras": {
    "vulnerabilidadeMult": 1.5,
    "arredondamento": "baixo",
    "ordem": [
      "imunidade",
      "vulnerabilidade",
      "reducaoDoTipo",
      "rdGeral"
    ],
    "minimo": 0,
    "perdaDePV": "ignora tudo"
  }
};
