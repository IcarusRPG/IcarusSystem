// GERADO por tools/gerar-dados.mjs a partir de tools/dados/objetos.json — não edite à mão.
export default {
  "_leiame": "Quebrar objetos (regra oficial) e focos arcanos: fonte única. Defesa do objeto pelo tamanho (+5 se estiver em movimento); RD do material reduz todo dano e NÃO segue o teto de RD dos personagens; 0 PV ou menos = destruído (não se conserta: fabrica-se outro). Itens reduzidos têm PV ÷ 2, aumentados × 2, gigantes × 5. Focos: preço ainda não definido no Núcleo (0 = sem preço).",
  "versao": 1,
  "defesaPorTamanho": {
    "minusculo": 15,
    "pequeno": 12,
    "medio": 10,
    "grande": 8,
    "enorme": 5,
    "colossal": 0
  },
  "nomesTamanho": {
    "minusculo": "Minúsculo",
    "pequeno": "Pequeno",
    "medio": "Médio",
    "grande": "Grande",
    "enorme": "Enorme",
    "colossal": "Colossal"
  },
  "bonusEmMovimento": 5,
  "multiplicadorPv": {
    "reduzido": 0.5,
    "normal": 1,
    "aumentado": 2,
    "gigante": 5
  },
  "objetos": [
    {
      "id": "pergaminho",
      "nome": "Pergaminho",
      "tamanho": "minusculo",
      "rd": 0,
      "pv": 1
    },
    {
      "id": "corda",
      "nome": "Corda",
      "tamanho": "minusculo",
      "rd": 0,
      "pv": 2
    },
    {
      "id": "corrente",
      "nome": "Corrente",
      "tamanho": "minusculo",
      "rd": 10,
      "pv": 2
    },
    {
      "id": "cadeira",
      "nome": "Cadeira",
      "tamanho": "pequeno",
      "rd": 5,
      "pv": 5
    },
    {
      "id": "barril",
      "nome": "Barril",
      "tamanho": "medio",
      "rd": 5,
      "pv": 10
    },
    {
      "id": "porta-de-madeira",
      "nome": "Porta de madeira",
      "tamanho": "grande",
      "rd": 5,
      "pv": 20
    },
    {
      "id": "porta-de-pedra",
      "nome": "Porta de pedra",
      "tamanho": "grande",
      "rd": 8,
      "pv": 100
    },
    {
      "id": "porta-de-ferro",
      "nome": "Porta de ferro",
      "tamanho": "grande",
      "rd": 10,
      "pv": 100
    },
    {
      "id": "carroca",
      "nome": "Carroça",
      "tamanho": "grande",
      "rd": 5,
      "pv": 50
    },
    {
      "id": "casebre",
      "nome": "Casebre",
      "tamanho": "enorme",
      "rd": 5,
      "pv": 100
    },
    {
      "id": "celeiro",
      "nome": "Celeiro",
      "tamanho": "colossal",
      "rd": 5,
      "pv": 200
    }
  ],
  "materiaisFoco": {
    "madeira": {
      "nome": "Madeira ou osso",
      "rd": 5,
      "pv": 5
    },
    "metal": {
      "nome": "Metal",
      "rd": 10,
      "pv": 5
    },
    "livro": {
      "nome": "Livro ou grimório",
      "rd": 0,
      "pv": 5
    }
  },
  "focos": [
    {
      "id": "varinha",
      "nome": "Varinha",
      "material": "madeira",
      "tamanho": "minusculo",
      "espacos": 0.5,
      "descricao": "Foco arcano de madeira ou osso. Ocupa uma mão."
    },
    {
      "id": "cetro",
      "nome": "Cetro",
      "material": "madeira",
      "tamanho": "minusculo",
      "espacos": 1,
      "descricao": "Foco arcano de madeira ou osso. Ocupa uma mão."
    },
    {
      "id": "orbe",
      "nome": "Orbe",
      "material": "madeira",
      "tamanho": "minusculo",
      "espacos": 1,
      "descricao": "Foco arcano (orbe engastado em madeira ou osso). Ocupa uma mão."
    },
    {
      "id": "cetro-de-metal",
      "nome": "Cetro de metal",
      "material": "metal",
      "tamanho": "minusculo",
      "espacos": 1,
      "descricao": "Foco arcano de metal. Ocupa uma mão."
    },
    {
      "id": "grimorio",
      "nome": "Grimório",
      "material": "livro",
      "tamanho": "minusculo",
      "espacos": 1,
      "descricao": "Foco arcano: livro ou grimório. Ocupa uma mão."
    }
  ],
  "focoBordao": {
    "material": "madeira",
    "nota": "O bordão (arma) também é foco arcano e ocupa as duas mãos."
  }
};
