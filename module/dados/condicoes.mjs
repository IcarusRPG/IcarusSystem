// GERADO por tools/gerar-dados.mjs a partir de tools/dados/condicoes.json — não edite à mão.
export default {
  "semAcumular": true,
  "sentidos": [
    "visao",
    "audicao",
    "olfato"
  ],
  "atributosPericias": {
    "acrobacia": "destreza",
    "adestramento": "carisma",
    "atletismo": "forca",
    "atuacao": "carisma",
    "audicao": "sabedoria",
    "barganha": "carisma",
    "cavalgar": "destreza",
    "concentracao": "constituicao",
    "cura": "sabedoria",
    "diplomacia": "carisma",
    "enganacao": "carisma",
    "fortitude": "constituicao",
    "furtividade": "destreza",
    "historia": "inteligencia",
    "iniciativa": "destreza",
    "intimidacao": "carisma",
    "intuicao": "sabedoria",
    "investigacao": "inteligencia",
    "luta": "forca",
    "misticismo": "inteligencia",
    "navegacao": "sabedoria",
    "nobreza": "inteligencia",
    "olfato": "sabedoria",
    "pontaria": "destreza",
    "prestidigitacao": "destreza",
    "reflexos": "destreza",
    "religiao": "sabedoria",
    "sobrevivencia": "sabedoria",
    "visao": "sabedoria",
    "vontade": "sabedoria"
  },
  "condicoes": [
    {
      "id": "abalado",
      "nome": "Abalado",
      "descricao": "O personagem sofre –2 em testes de perícia. Se ficar abalado novamente, em vez disso fica apavorado.",
      "descritores": [
        "Medo"
      ],
      "pendencias": [],
      "mods": [
        {
          "t": "pericias",
          "valor": -2
        }
      ],
      "escala": "apavorado",
      "iconeCore": "icons/svg/terror.svg"
    },
    {
      "id": "agarrado",
      "nome": "Agarrado",
      "descricao": "O personagem fica desprevenido e imóvel, sofre –2 em testes de ataque e só pode atacar com armas Leves. Ataques à distância contra um alvo envolvido em uma manobra de agarrar têm 50% de chance de acertar o alvo errado.",
      "descritores": [
        "Movimento"
      ],
      "pendencias": [
        "PENDENTE"
      ],
      "compoe": [
        "desprevenido",
        "imovel"
      ],
      "mods": [
        {
          "t": "ataque",
          "valor": -2
        }
      ],
      "texto": [
        "só ataca com armas Leves",
        "ataques à distância contra alvo envolvido: 50% de acertar o alvo errado"
      ],
      "iconeCore": "icons/svg/net.svg"
    },
    {
      "id": "alquebrado",
      "nome": "Alquebrado",
      "descricao": "O custo em PM das habilidades do personagem aumenta em +1.",
      "descritores": [
        "Mental"
      ],
      "pendencias": [],
      "custoPMExtra": 1,
      "iconeCore": "icons/svg/downgrade.svg"
    },
    {
      "id": "apavorado",
      "nome": "Apavorado",
      "descricao": "O personagem sofre –5 em testes de perícia e não pode se aproximar voluntariamente da fonte do medo.",
      "descritores": [
        "Medo"
      ],
      "pendencias": [],
      "mods": [
        {
          "t": "pericias",
          "valor": -5
        }
      ],
      "iconeCore": "icons/svg/terror.svg"
    },
    {
      "id": "atordoado",
      "nome": "Atordoado",
      "descricao": "O personagem fica desprevenido e não pode fazer ações.",
      "descritores": [
        "Mental"
      ],
      "pendencias": [],
      "compoe": [
        "desprevenido"
      ],
      "flags": {
        "semAcoes": true
      },
      "iconeCore": "icons/svg/daze.svg"
    },
    {
      "id": "caido",
      "nome": "Caído",
      "descricao": "O personagem sofre –5 em ataques corpo a corpo e seu deslocamento é reduzido a 1,5 m. Além disso, sofre –5 na Defesa contra ataques corpo a corpo e recebe +5 na Defesa contra ataques à distância (cumulativos com outras condições).",
      "descritores": [
        "Movimento"
      ],
      "pendencias": [],
      "mods": [
        {
          "t": "ataque",
          "modo": "corpo-a-corpo",
          "valor": -5
        },
        {
          "t": "deslocamentoMax",
          "valor": 1.5
        }
      ],
      "texto": [
        "Defesa –5 contra ataques corpo a corpo, +5 contra ataques à distância (informar na linha de alvo do card)"
      ],
      "iconeCore": "icons/svg/falling.svg"
    },
    {
      "id": "cego",
      "nome": "Cego",
      "descricao": "O personagem falha automaticamente em todos os testes de Visão e, a cada turno em combate, perde ou a ação de movimento ou a ação padrão, até se recuperar da condição.",
      "descritores": [
        "Sentidos"
      ],
      "pendencias": [
        "CONFIRMAR",
        "PENDENTE"
      ],
      "flags": {
        "falhaAutomatica": [
          "visao"
        ],
        "perdeAcaoPorTurno": "movimento-ou-padrao"
      },
      "iconeCore": "icons/svg/blind.svg"
    },
    {
      "id": "confuso",
      "nome": "Confuso",
      "descricao": "O personagem comporta-se de modo aleatório. Role 1d6 no início de cada turno dele: 1) move-se em uma direção escolhida por uma rolagem de 1d8; 2-3) não pode fazer ações e balbucia incoerentemente; 4-5) usa a arma que estiver empunhando para atacar a criatura mais próxima, ou a si mesmo, se estiver sozinho (nesse caso, apenas role o dano); 6) a condição termina e ele pode agir normalmente.",
      "descritores": [
        "Mental"
      ],
      "pendencias": [],
      "turno": {
        "tipo": "d6",
        "tabela": {
          "1": "Move-se em direção aleatória (1d8)",
          "6": "A condição termina; age normalmente",
          "2-3": "Não pode fazer ações; balbucia",
          "4-5": "Ataca a criatura mais próxima (ou a si mesmo, se sozinho: apenas o dano)"
        }
      },
      "iconeCore": "icons/svg/daze.svg"
    },
    {
      "id": "debilitado",
      "nome": "Debilitado",
      "descricao": "O personagem sofre –5 em testes de Força, Destreza e Constituição e de perícias baseadas nesses atributos (incluindo Luta, Pontaria, Fortitude, Reflexos e Iniciativa). Se ficar debilitado novamente, em vez disso fica inconsciente.",
      "descritores": [],
      "pendencias": [],
      "mods": [
        {
          "t": "pericias",
          "atributos": [
            "forca",
            "destreza",
            "constituicao"
          ],
          "valor": -5
        }
      ],
      "escala": "inconsciente",
      "iconeCore": "icons/svg/downgrade.svg"
    },
    {
      "id": "desprevenido",
      "nome": "Desprevenido",
      "descricao": "O personagem sofre –5 na Defesa e em Reflexos. Você fica desprevenido contra inimigos que não possa perceber.",
      "descritores": [],
      "pendencias": [],
      "mods": [
        {
          "t": "defesa",
          "valor": -5
        },
        {
          "t": "pericia",
          "chave": "reflexos",
          "valor": -5
        }
      ],
      "iconeCore": "icons/svg/upgrade.svg"
    },
    {
      "id": "doente",
      "nome": "Doente",
      "descricao": "Sob efeito de uma doença.",
      "descritores": [
        "Metabolismo"
      ],
      "pendencias": [
        "PENDENTE"
      ],
      "iconeCore": "icons/svg/biohazard.svg"
    },
    {
      "id": "em-chamas",
      "nome": "Em Chamas",
      "descricao": "O personagem está pegando fogo. No início de cada um de seus turnos, sofre 1d6 pontos de dano de fogo. O personagem pode gastar uma ação padrão para apagar o fogo com as mãos. Imersão em água também apaga as chamas.",
      "descritores": [],
      "pendencias": [],
      "turno": {
        "tipo": "dano",
        "formula": "1d6",
        "dano": "fogo",
        "apagar": "ação padrão ou imersão em água"
      },
      "iconeCore": "icons/svg/fire.svg"
    },
    {
      "id": "enfeiticado",
      "nome": "Enfeitiçado",
      "descricao": "O personagem se torna prestativo em relação à fonte da condição. Ele não fica sob o controle da fonte, mas percebe suas palavras e ações da maneira mais favorável possível. A fonte da condição recebe +10 em testes de Diplomacia com o personagem.",
      "descritores": [
        "Mental"
      ],
      "pendencias": [],
      "iconeCore": "icons/svg/heal.svg"
    },
    {
      "id": "enjoado",
      "nome": "Enjoado",
      "descricao": "O personagem só pode realizar uma ação padrão ou de movimento por rodada (não ambas). Ele pode gastar uma ação padrão para fazer uma investida, mas só pode avançar até o seu deslocamento (não o dobro).",
      "descritores": [
        "Metabolismo"
      ],
      "pendencias": [],
      "flags": {
        "acaoUnica": true
      },
      "iconeCore": "icons/svg/poison.svg"
    },
    {
      "id": "enredado",
      "nome": "Enredado",
      "descricao": "O personagem fica lento e vulnerável e sofre –2 em testes de ataque.",
      "descritores": [
        "Movimento"
      ],
      "pendencias": [],
      "compoe": [
        "lento",
        "vulneravel"
      ],
      "mods": [
        {
          "t": "ataque",
          "valor": -2
        }
      ],
      "iconeCore": "icons/svg/net.svg"
    },
    {
      "id": "envenenado",
      "nome": "Envenenado",
      "descricao": "O efeito desta condição varia de acordo com o veneno: perda de vida recorrente ou outra condição (como fraco ou enjoado). A perda de vida recorrente por venenos é cumulativa.",
      "descritores": [
        "Veneno"
      ],
      "pendencias": [
        "PENDENTE"
      ],
      "iconeCore": "icons/svg/poison.svg"
    },
    {
      "id": "esmorecido",
      "nome": "Esmorecido",
      "descricao": "O personagem sofre –5 em testes de Inteligência, Sabedoria e Carisma e de perícias baseadas nesses atributos, exceto Visão, Audição e Olfato (os sentidos são afetados por Cego, Surdo e Ofuscado).",
      "descritores": [
        "Mental"
      ],
      "pendencias": [],
      "mods": [
        {
          "t": "pericias",
          "atributos": [
            "inteligencia",
            "sabedoria",
            "carisma"
          ],
          "excluir": [
            "visao",
            "audicao",
            "olfato"
          ],
          "valor": -5
        }
      ],
      "iconeCore": "icons/svg/downgrade.svg"
    },
    {
      "id": "exausto",
      "nome": "Exausto",
      "descricao": "O personagem fica debilitado, lento e vulnerável. Se ficar exausto novamente, em vez disso fica inconsciente.",
      "descritores": [
        "Cansaço"
      ],
      "pendencias": [],
      "compoe": [
        "debilitado",
        "lento",
        "vulneravel"
      ],
      "escala": "inconsciente",
      "iconeCore": "icons/svg/unconscious.svg"
    },
    {
      "id": "fascinado",
      "nome": "Fascinado",
      "descricao": "Com a atenção presa em alguma coisa, o personagem sofre –5 em Visão e Audição e não pode fazer ações, exceto observar aquilo que o fascinou. A condição é anulada por ações hostis contra o personagem ou contra aquilo que o fascinou. Balançar uma criatura fascinada para tirá-la desse estado gasta uma ação padrão.",
      "descritores": [
        "Mental"
      ],
      "pendencias": [],
      "mods": [
        {
          "t": "pericia",
          "chave": "visao",
          "valor": -5
        },
        {
          "t": "pericia",
          "chave": "audicao",
          "valor": -5
        }
      ],
      "flags": {
        "semAcoes": true,
        "exceto": "observar o que fascinou"
      },
      "iconeCore": "icons/svg/eye.svg"
    },
    {
      "id": "fatigado",
      "nome": "Fatigado",
      "descricao": "O personagem fica fraco e vulnerável. Se ficar fatigado novamente, em vez disso fica exausto.",
      "descritores": [
        "Cansaço"
      ],
      "pendencias": [],
      "compoe": [
        "fraco",
        "vulneravel"
      ],
      "escala": "exausto",
      "iconeCore": "icons/svg/sleep.svg"
    },
    {
      "id": "fraco",
      "nome": "Fraco",
      "descricao": "O personagem sofre –2 em testes de Força, Destreza e Constituição e de perícias baseadas nesses atributos. Se ficar fraco novamente, em vez disso fica debilitado.",
      "descritores": [],
      "pendencias": [],
      "mods": [
        {
          "t": "pericias",
          "atributos": [
            "forca",
            "destreza",
            "constituicao"
          ],
          "valor": -2
        }
      ],
      "escala": "debilitado",
      "iconeCore": "icons/svg/downgrade.svg"
    },
    {
      "id": "frustrado",
      "nome": "Frustrado",
      "descricao": "O personagem sofre –2 em testes de Inteligência, Sabedoria e Carisma e de perícias baseadas nesses atributos, exceto Visão, Audição e Olfato. Se ficar frustrado novamente, em vez disso fica esmorecido.",
      "descritores": [
        "Mental"
      ],
      "pendencias": [],
      "mods": [
        {
          "t": "pericias",
          "atributos": [
            "inteligencia",
            "sabedoria",
            "carisma"
          ],
          "excluir": [
            "visao",
            "audicao",
            "olfato"
          ],
          "valor": -2
        }
      ],
      "escala": "esmorecido",
      "iconeCore": "icons/svg/downgrade.svg"
    },
    {
      "id": "imovel",
      "nome": "Imóvel",
      "descricao": "Todas as formas de deslocamento do personagem são reduzidas a 0 m.",
      "descritores": [
        "Movimento"
      ],
      "pendencias": [],
      "mods": [
        {
          "t": "deslocamentoMax",
          "valor": 0
        }
      ],
      "iconeCore": "icons/svg/anchor.svg"
    },
    {
      "id": "inconsciente",
      "nome": "Inconsciente",
      "descricao": "O personagem fica indefeso e não pode fazer ações, incluindo reações (mas ainda pode fazer testes naturalmente feitos nesse estado, como os testes de morte e o teste de Constituição para estabilizar um sangramento). Balançar uma criatura para acordá-la gasta uma ação padrão.",
      "descritores": [],
      "pendencias": [],
      "compoe": [
        "indefeso"
      ],
      "flags": {
        "semAcoes": true,
        "semReacoes": true
      },
      "iconeCore": "icons/svg/unconscious.svg"
    },
    {
      "id": "indefeso",
      "nome": "Indefeso",
      "descricao": "O personagem fica desprevenido, mas sofre –10 na Defesa, falha automaticamente em testes de Reflexos e pode sofrer golpes de misericórdia.",
      "descritores": [],
      "pendencias": [],
      "compoe": [
        "desprevenido"
      ],
      "mods": [
        {
          "t": "defesa",
          "valor": -10
        }
      ],
      "flags": {
        "falhaAutomatica": [
          "reflexos"
        ],
        "golpeDeMisericordia": true
      },
      "iconeCore": "icons/svg/unconscious.svg"
    },
    {
      "id": "lento",
      "nome": "Lento",
      "descricao": "Todas as formas de deslocamento do personagem são reduzidas à metade (arredonde para baixo, em incrementos de 1,5 m) e ele não pode correr nem fazer investidas.",
      "descritores": [
        "Movimento"
      ],
      "pendencias": [],
      "mods": [
        {
          "t": "deslocamentoMetade"
        }
      ],
      "flags": {
        "naoCorre": true,
        "semInvestida": true
      },
      "iconeCore": "icons/svg/anchor.svg"
    },
    {
      "id": "morrendo",
      "nome": "Morrendo",
      "descricao": "Com 0 PV o personagem fica inconsciente e faz testes de morte no início de cada turno (veja \"Pontos de Vida em 0 e Testes de Morte\").",
      "descritores": [],
      "pendencias": [],
      "compoe": [
        "inconsciente"
      ],
      "morte": true,
      "iconeCore": "icons/svg/skull.svg"
    },
    {
      "id": "ofuscado",
      "nome": "Ofuscado",
      "descricao": "O personagem sofre –2 em testes de ataque e de Visão.",
      "descritores": [
        "Sentidos"
      ],
      "pendencias": [],
      "mods": [
        {
          "t": "ataque",
          "valor": -2
        },
        {
          "t": "pericia",
          "chave": "visao",
          "valor": -2
        }
      ],
      "iconeCore": "icons/svg/light-off.svg"
    },
    {
      "id": "paralisado",
      "nome": "Paralisado",
      "descricao": "O personagem fica imóvel e indefeso e só pode realizar ações puramente mentais.",
      "descritores": [
        "Mental"
      ],
      "pendencias": [],
      "compoe": [
        "imovel",
        "indefeso"
      ],
      "flags": {
        "soAcoesMentais": true
      },
      "iconeCore": "icons/svg/paralysis.svg"
    },
    {
      "id": "pasmo",
      "nome": "Pasmo",
      "descricao": "O personagem não pode fazer ações.",
      "descritores": [
        "Mental"
      ],
      "pendencias": [],
      "flags": {
        "semAcoes": true
      },
      "iconeCore": "icons/svg/daze.svg"
    },
    {
      "id": "petrificado",
      "nome": "Petrificado",
      "descricao": "O personagem fica inconsciente e recebe redução de dano 8.",
      "descritores": [
        "Metamorfose"
      ],
      "pendencias": [
        "PENDENTE"
      ],
      "compoe": [
        "inconsciente"
      ],
      "mods": [
        {
          "t": "rd",
          "valor": 8
        }
      ],
      "iconeCore": "icons/svg/stoned.svg"
    },
    {
      "id": "sangrando",
      "nome": "Sangrando",
      "descricao": "No início de seu turno, o personagem deve fazer um teste de Constituição (CD 15). Se falhar, perde 1d6 pontos de vida e continua sangrando; se passar, remove essa condição.",
      "descritores": [
        "Metabolismo"
      ],
      "pendencias": [],
      "turno": {
        "tipo": "teste-atributo",
        "atributo": "constituicao",
        "cd": 15,
        "falha": {
          "perdaPV": "1d6",
          "continua": true
        },
        "sucesso": {
          "remove": true
        }
      },
      "iconeCore": "icons/svg/blood.svg"
    },
    {
      "id": "sobrecarregado",
      "nome": "Sobrecarregado",
      "descricao": "O personagem sofre –5 de penalidade de armadura (somada à armadura que usa, em Acrobacia, Furtividade e Prestidigitação) e seu deslocamento é reduzido em 3 m.",
      "descritores": [
        "Movimento"
      ],
      "pendencias": [
        "PENDENTE"
      ],
      "mods": [
        {
          "t": "pericia",
          "chave": "acrobacia",
          "valor": -5
        },
        {
          "t": "pericia",
          "chave": "furtividade",
          "valor": -5
        },
        {
          "t": "pericia",
          "chave": "prestidigitacao",
          "valor": -5
        },
        {
          "t": "deslocamentoReduz",
          "valor": 3
        }
      ],
      "iconeCore": "icons/svg/anchor.svg"
    },
    {
      "id": "surdo",
      "nome": "Surdo",
      "descricao": "O personagem falha automaticamente em todos os testes de Audição e sofre –5 em Iniciativa.",
      "descritores": [
        "Sentidos"
      ],
      "pendencias": [
        "PENDENTE"
      ],
      "mods": [
        {
          "t": "pericia",
          "chave": "iniciativa",
          "valor": -5
        }
      ],
      "flags": {
        "falhaAutomatica": [
          "audicao"
        ]
      },
      "iconeCore": "icons/svg/deaf.svg"
    },
    {
      "id": "surpreendido",
      "nome": "Surpreendido",
      "descricao": "O personagem fica desprevenido e não pode fazer ações. Em combate, a condição dura a primeira rodada, na qual ele não age (nem por reação). Fora de combate, dura até o fim da ação ou do evento que o pegou desprevenido, como uma armadilha.",
      "descritores": [],
      "pendencias": [],
      "compoe": [
        "desprevenido"
      ],
      "flags": {
        "semAcoes": true,
        "primeiraRodada": true
      },
      "iconeCore": "icons/svg/upgrade.svg"
    },
    {
      "id": "vulneravel",
      "nome": "Vulnerável",
      "descricao": "O personagem sofre –2 na Defesa.",
      "descritores": [],
      "pendencias": [],
      "mods": [
        {
          "t": "defesa",
          "valor": -2
        }
      ],
      "iconeCore": "icons/svg/shield-off.svg"
    }
  ]
};
