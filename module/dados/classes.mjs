// GERADO por tools/gerar-dados.mjs a partir de tools/dados/classes.json — não edite à mão.
export default {
  "versao": 1,
  "classes": [
    {
      "id": "guerreiro",
      "nome": "Guerreiro",
      "papel": "Combatente Especialista",
      "pv": {
        "inicial": 20,
        "porNivel": 5,
        "atributo": "CON"
      },
      "pm": {
        "inicial": 3,
        "porNivel": 3,
        "atributoSoNoPrimeiroNivel": false,
        "texto": "3 por nível (classe não conjuradora: sem atributo-chave de PM)",
        "atributo": null
      },
      "atributoChave": "Força (para CD de habilidades de Guerreiro)",
      "pericias": {
        "obrigatorias": "Fortitude e (Luta ou Pontaria)",
        "escolha": 4,
        "lista": [
          "Adestramento",
          "Atletismo",
          "Audição",
          "Barganha",
          "Cavalgar",
          "Concentração",
          "Furtividade",
          "História",
          "Iniciativa",
          "Intimidação",
          "Intuição",
          "Navegação",
          "Nobreza",
          "Olfato",
          "Reflexos",
          "Religião",
          "Sobrevivência",
          "Visão",
          "Vontade"
        ]
      },
      "proficiencias": "Armas simples, armas marciais, armaduras pesadas, escudos",
      "intro": [
        "Todo exército, toda caravana e toda taverna de beira de estrada guarda um guerreiro. Não há dogma, escola ou juramento que una todos eles. O que os une é a prática: anos de treino, de cicatrizes e de lutas que ensinaram o que funciona e o que mata.",
        "O guerreiro é a classe mais versátil do mundo. Pode ser o muro de escudo que segura a linha, o duelista que corta com duas lâminas, o brutamontes de um golpe só com uma arma de duas mãos, o arqueiro que não erra. Ou pode ser um pouco de tudo, e pagar por isso: quem espalha seu treino domina muitas ferramentas, mas nenhuma no limite."
      ],
      "progressao": [
        {
          "nivel": 1,
          "habilidades": [
            "Recobrar o Fôlego"
          ],
          "poder": true
        },
        {
          "nivel": 2,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 3,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 4,
          "habilidades": [
            "Embalo de Batalha"
          ],
          "poder": true
        },
        {
          "nivel": 5,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 6,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 7,
          "habilidades": [
            "Ataque Extra"
          ],
          "poder": true
        },
        {
          "nivel": 8,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 9,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 10,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 11,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 12,
          "habilidades": [
            "Segunda Tentativa"
          ],
          "poder": true
        },
        {
          "nivel": 13,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 14,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 15,
          "habilidades": [
            "Ataque Extra Aprimorado"
          ],
          "poder": true
        },
        {
          "nivel": 16,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 17,
          "habilidades": [
            "Segunda Tentativa (2 vezes)"
          ],
          "poder": true
        },
        {
          "nivel": 18,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 19,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 20,
          "habilidades": [
            "Mestre de Armas"
          ],
          "poder": true
        }
      ],
      "habilidades": [
        {
          "id": "recobrar-o-folego",
          "nome": "Recobrar o Fôlego",
          "nivel": 1,
          "descricao": "Uma vez por cena, como uma ação de movimento, você recupera 1d8 + seu nível de Guerreiro + sua Constituição em pontos de vida.",
          "custoPM": null,
          "acao": "movimento",
          "subs": []
        },
        {
          "id": "embalo-de-batalha",
          "nome": "Embalo de Batalha",
          "nivel": 4,
          "descricao": "Uma vez por rodada, quando você reduz uma criatura a 0 PV ou acerta um ataque crítico, recupera 1 PM.",
          "custoPM": 1,
          "acao": "passivo",
          "subs": []
        },
        {
          "id": "ataque-extra",
          "nome": "Ataque Extra",
          "nivel": 7,
          "descricao": "Em seu turno, você pode gastar 1 PM para realizar uma ação de Agredir adicional. Ela só pode ser usada para Agredir. Vale para qualquer estilo: arma e escudo, duas armas, arma de duas mãos ou arma à distância.",
          "custoPM": 1,
          "acao": "passivo",
          "subs": []
        },
        {
          "id": "ataque-extra-aprimorado",
          "nome": "Ataque Extra Aprimorado",
          "nivel": 15,
          "descricao": "Em seu turno, você pode gastar mais 2 PM para realizar uma segunda ação de Agredir adicional. Com os dois Ataques Extras, você realiza três ações de Agredir no turno, por 3 PM.",
          "custoPM": 2,
          "acao": "passivo",
          "subs": []
        },
        {
          "id": "segunda-tentativa",
          "nome": "Segunda Tentativa",
          "nivel": 12,
          "descricao": "Uma vez por cena, quando falha em um teste de resistência, você pode refazê-lo e ficar com o novo resultado. A partir do 17º nível, pode fazer isso duas vezes por cena.",
          "custoPM": null,
          "acao": "passivo",
          "subs": []
        },
        {
          "id": "mestre-de-armas",
          "nome": "Mestre de Armas",
          "nivel": 20,
          "descricao": "Seus ataques recebem +1 na margem de ameaça e +1 no multiplicador de crítico.",
          "custoPM": null,
          "acao": "passivo",
          "subs": []
        }
      ],
      "grupos": [
        "Linha do Par de Lâminas",
        "Linha do Escudo",
        "Linha das Duas Mãos",
        "Linha da Distância",
        "Linha da Resistência",
        "Poderes de combate geral",
        "Poderes de perícia e versatilidade",
        "Poderes comuns"
      ],
      "poderes": [
        {
          "id": "par-de-laminas",
          "nome": "Par de Lâminas",
          "grupo": "Linha do Par de Lâminas",
          "descricao": "Quando usa Agredir empunhando uma arma corpo a corpo em cada mão, você faz um ataque com cada uma. O segundo ataque não soma o modificador de atributo (Força ou Destreza) no dano.",
          "prerequisito": "Destreza 1",
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": {
            "DES": 1
          },
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "ambidestria",
          "nome": "Ambidestria",
          "grupo": "Linha do Par de Lâminas",
          "descricao": "O segundo ataque do Par de Lâminas soma o modificador de atributo no dano.",
          "prerequisito": "Par de Lâminas, 6º nível",
          "nivelMinimo": 6,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [
            "par-de-laminas"
          ],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "golpe-cruzado",
          "nome": "Golpe Cruzado",
          "grupo": "Linha do Par de Lâminas",
          "descricao": "Quando acerta os dois ataques do Par de Lâminas no mesmo alvo, o alvo sofre 1d6 de dano adicional.",
          "prerequisito": "Ambidestria, 10º nível",
          "nivelMinimo": 10,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [
            "ambidestria"
          ],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "guarda-dupla",
          "nome": "Guarda Dupla",
          "grupo": "Linha do Par de Lâminas",
          "descricao": "Enquanto empunha uma arma em cada mão, você recebe +1 na Defesa.",
          "prerequisito": "Par de Lâminas",
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [
            "par-de-laminas"
          ],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "escudo-erguido",
          "nome": "Escudo Erguido",
          "grupo": "Linha do Escudo",
          "descricao": "Como uma ação padrão, você posiciona o escudo à frente do corpo, sem atacar. Até o início do seu próximo turno, você recebe +3 na Defesa.",
          "prerequisito": "empunhar um escudo",
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "padrao",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "mestre-do-escudo",
          "nome": "Mestre do Escudo",
          "grupo": "Linha do Escudo",
          "descricao": "O bônus de Defesa do seu escudo aumenta em +1.",
          "prerequisito": "estar usando um escudo",
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "passo-a-frente",
          "nome": "Passo à Frente",
          "grupo": "Linha do Escudo",
          "descricao": "Quando um aliado adjacente é alvo de um ataque, você pode gastar 1 PM e a sua reação para trocar de lugar com ele, tornando-se o alvo do ataque.",
          "prerequisito": "Mestre do Escudo",
          "nivelMinimo": null,
          "custoPM": 1,
          "acao": "reacao",
          "atributoMinimo": null,
          "requerPoderes": [
            "mestre-do-escudo"
          ],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "chamado-ao-combate",
          "nome": "Chamado ao Combate",
          "grupo": "Linha do Escudo",
          "descricao": "Como uma ação padrão, gaste 2 PM. Cada inimigo em alcance curto que possa ver ou ouvir você faz um teste de Vontade (CD Força). Os que falharem ficam obrigados, até o início do seu próximo turno, a escolher você como alvo de todos os seus ataques e efeitos hostis, enquanto você estiver ao alcance e à vista deles. Os que passarem ficam imunes a este poder pelo resto da cena. É um efeito mental.",
          "prerequisito": "3º nível",
          "nivelMinimo": 3,
          "custoPM": 2,
          "acao": "padrao",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "golpe-de-escudo",
          "nome": "Golpe de Escudo",
          "grupo": "Linha do Escudo",
          "descricao": "Gaste 1 PM e faça um ataque corpo a corpo com o escudo. Se acertar, causa 1d6 de dano de impacto e o alvo fica Vulnerável até o início do seu próximo turno.",
          "prerequisito": "Mestre do Escudo",
          "nivelMinimo": null,
          "custoPM": 1,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [
            "mestre-do-escudo"
          ],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "baluarte",
          "nome": "Baluarte",
          "grupo": "Linha do Escudo",
          "descricao": "Enquanto empunha um escudo, você recebe RD 2.",
          "prerequisito": "Mestre do Escudo, 8º nível",
          "nivelMinimo": 8,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [
            "mestre-do-escudo"
          ],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "golpe-pesado",
          "nome": "Golpe Pesado",
          "grupo": "Linha das Duas Mãos",
          "descricao": "Quando ataca com uma arma de Duas Mãos, você soma o dobro do seu modificador de Força no dano.",
          "prerequisito": "Força 1",
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": {
            "FOR": 1
          },
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "golpe-devastador",
          "nome": "Golpe Devastador",
          "grupo": "Linha das Duas Mãos",
          "descricao": "Gaste 2 PM ao atacar com uma arma de Duas Mãos. Se acertar, causa dados de dano adicionais iguais ao seu nível dividido por 4 (arredondado para cima, mínimo 1), do mesmo tipo e tamanho dos dados da arma.",
          "prerequisito": "Golpe Pesado",
          "nivelMinimo": null,
          "custoPM": 2,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [
            "golpe-pesado"
          ],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "turbilhao",
          "nome": "Turbilhão",
          "grupo": "Linha das Duas Mãos",
          "descricao": "Empunhando uma arma corpo a corpo de Duas Mãos, como uma ação de Agredir, gaste 2 PM. Você gira a arma junto com o corpo e realiza um único teste de ataque, comparando o resultado com a Defesa de cada criatura adjacente a você, aliada ou inimiga. Contra cada criatura cuja Defesa seja igual ou menor que o resultado, você causa o dano da arma. Se o d20 for um 20 natural, o ataque acerta e causa crítico em todas as criaturas adjacentes. Se o d20 estiver na sua margem de ameaça, mas não for 20 natural, o crítico vale apenas contra as criaturas cuja Defesa o resultado alcança.",
          "prerequisito": "Golpe Pesado, 5º nível",
          "nivelMinimo": 5,
          "custoPM": 2,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [
            "golpe-pesado"
          ],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "critico-brutal",
          "nome": "Crítico Brutal",
          "grupo": "Linha das Duas Mãos",
          "descricao": "O multiplicador de crítico das suas armas de Duas Mãos aumenta em +1.",
          "prerequisito": "Golpe Pesado, 10º nível",
          "nivelMinimo": 10,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [
            "golpe-pesado"
          ],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "quebra-guarda",
          "nome": "Quebra-Guarda",
          "grupo": "Linha das Duas Mãos",
          "descricao": "Gaste 2 PM ao atacar. O ataque ignora a RD do alvo e o bônus de escudo na Defesa dele.",
          "prerequisito": "Golpe Pesado",
          "nivelMinimo": null,
          "custoPM": 2,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [
            "golpe-pesado"
          ],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "mira-firme",
          "nome": "Mira Firme",
          "grupo": "Linha da Distância",
          "descricao": "Você recebe +1 nos testes de ataque à distância.",
          "prerequisito": "treinado em Pontaria",
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "arremessador",
          "nome": "Arremessador",
          "grupo": "Linha da Distância",
          "descricao": "Você saca armas de arremesso como ação livre e o alcance delas aumenta em um passo.",
          "prerequisito": "Mira Firme",
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "livre",
          "atributoMinimo": null,
          "requerPoderes": [
            "mira-firme"
          ],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "tiro-penetrante",
          "nome": "Tiro Penetrante",
          "grupo": "Linha da Distância",
          "descricao": "Gaste 2 PM ao atacar à distância. O ataque ignora a RD do alvo.",
          "prerequisito": "Mira Firme, 8º nível",
          "nivelMinimo": 8,
          "custoPM": 2,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [
            "mira-firme"
          ],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "tiro-calculado",
          "nome": "Tiro Calculado",
          "grupo": "Linha da Distância",
          "descricao": "Você soma seu modificador de Inteligência (limitado pelo seu nível) nas rolagens de dano dos seus ataques à distância.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "foco-do-atirador",
          "nome": "Foco do Atirador",
          "grupo": "Linha da Distância",
          "descricao": "Como uma ação de movimento, gaste 1 PM. Seu próximo ataque à distância neste turno recebe +5 no teste de ataque e +1 na margem de ameaça.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 1,
          "acao": "movimento",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "tiro-incapacitante",
          "nome": "Tiro Incapacitante",
          "grupo": "Linha da Distância",
          "descricao": "Gaste 2 PM ao atacar à distância. Se acertar, o alvo faz um teste de Fortitude (CD Força). Se falhar, fica Lento até o fim do próximo turno dele.",
          "prerequisito": "Mira Firme, 5º nível",
          "nivelMinimo": 5,
          "custoPM": 2,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [
            "mira-firme"
          ],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "vigor-marcial",
          "nome": "Vigor Marcial",
          "grupo": "Linha da Resistência",
          "descricao": "Seus pontos de vida totais aumentam em 1 por nível.",
          "prerequisito": "Constituição 1",
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": {
            "CON": 1
          },
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "couraca-treinada",
          "nome": "Couraça Treinada",
          "grupo": "Linha da Resistência",
          "descricao": "Enquanto usa armadura pesada, você recebe +1 na Defesa.",
          "prerequisito": "estar usando armadura pesada",
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "corpo-de-ferro",
          "nome": "Corpo de Ferro",
          "grupo": "Linha da Resistência",
          "descricao": "Você é imune à condição Sangrando e recebe +2 em Fortitude.",
          "prerequisito": "Vigor Marcial",
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [
            "vigor-marcial"
          ],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "ultima-resistencia",
          "nome": "Última Resistência",
          "grupo": "Linha da Resistência",
          "descricao": "Uma vez por dia, quando seus PV chegariam a 0, você fica com 1 PV.",
          "prerequisito": "Corpo de Ferro, 12º nível",
          "nivelMinimo": 12,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [
            "corpo-de-ferro"
          ],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "folego-constante",
          "nome": "Fôlego Constante",
          "grupo": "Linha da Resistência",
          "descricao": "Você pode usar Recobrar o Fôlego duas vezes por cena.",
          "prerequisito": "8º nível",
          "nivelMinimo": 8,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "avancar-e-golpear",
          "nome": "Avançar e Golpear",
          "grupo": "Poderes de combate geral",
          "descricao": "Você pode se mover antes e depois de realizar Agredir, dividindo seu deslocamento entre os dois.",
          "prerequisito": "Força 1 ou Destreza 1",
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": {
            "FOR": 1,
            "DES": 1
          },
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "finta-calculada",
          "nome": "Finta Calculada",
          "grupo": "Poderes de combate geral",
          "descricao": "Como uma ação de movimento, gaste 1 PM e faça um teste de Luta contra a Reflexos de um inimigo adjacente. Se vencer, ele fica Desprevenido contra seu próximo ataque neste turno.",
          "prerequisito": "treinado em Luta",
          "nivelMinimo": null,
          "custoPM": 1,
          "acao": "movimento",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "estudo-do-inimigo",
          "nome": "Estudo do Inimigo",
          "grupo": "Poderes de combate geral",
          "descricao": "Depois de atacar uma criatura, você recebe +1 nos testes de ataque contra ela até o fim da cena.",
          "prerequisito": "Inteligência 1 ou Sabedoria 1",
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": {
            "INT": 1,
            "SAB": 1
          },
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "iniciativa-veterana",
          "nome": "Iniciativa Veterana",
          "grupo": "Poderes de combate geral",
          "descricao": "Você recebe +4 em Iniciativa.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "treino-extra",
          "nome": "Treino Extra",
          "grupo": "Poderes de perícia e versatilidade",
          "descricao": "Você se torna treinado em duas perícias à sua escolha. Pode escolher este poder até duas vezes.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "arma-exotica",
          "nome": "Arma Exótica",
          "grupo": "Poderes de perícia e versatilidade",
          "descricao": "Você recebe proficiência com uma arma exótica à sua escolha. Pode escolher este poder várias vezes, com uma arma diferente a cada vez.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": true
        },
        {
          "id": "presenca-intimidadora",
          "nome": "Presença Intimidadora",
          "grupo": "Poderes de perícia e versatilidade",
          "descricao": "Você usa Força, em vez de Carisma, nos testes de Intimidação.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "soldado-de-campo",
          "nome": "Soldado de Campo",
          "grupo": "Poderes de perícia e versatilidade",
          "descricao": "Você recebe +2 em Sobrevivência e em Fortitude contra fadiga, frio e calor.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "aumento-de-atributo",
          "nome": "Aumento de Atributo",
          "grupo": "Poderes comuns",
          "descricao": "Você recebe +1 em um atributo. Você pode escolher este poder várias vezes, mas apenas uma vez por patamar para um mesmo atributo.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": true
        },
        {
          "id": "pericia-especializada",
          "nome": "Perícia Especializada",
          "grupo": "Poderes comuns",
          "descricao": "Escolha uma perícia em que você seja treinado e ainda não seja especialista. Você se torna especialista nela (bônus de treino +4). Você pode escolher este poder quantas vezes quiser, cada vez para uma perícia diferente.",
          "prerequisito": "10º nível",
          "nivelMinimo": 10,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": true
        }
      ]
    },
    {
      "id": "samurai",
      "nome": "Samurai",
      "papel": "Combatente Disciplinado",
      "pv": {
        "inicial": 20,
        "porNivel": 5,
        "atributo": "CON"
      },
      "pm": {
        "inicial": 3,
        "porNivel": 3,
        "atributoSoNoPrimeiroNivel": false,
        "texto": "3 por nível (classe não conjuradora: sem atributo-chave de PM)",
        "atributo": null
      },
      "atributoChave": "Sabedoria (para CD de habilidades de Samurai)",
      "pericias": {
        "obrigatorias": "Concentração e (Luta ou Pontaria)",
        "escolha": 4,
        "lista": [
          "Acrobacia",
          "Adestramento",
          "Atletismo",
          "Audição",
          "Barganha",
          "Diplomacia",
          "Fortitude",
          "Iniciativa",
          "Intimidação",
          "Nobreza",
          "Reflexos",
          "Visão",
          "Vontade"
        ]
      },
      "proficiencias": "Armas simples, armas marciais, armas exóticas de corte, armaduras leves e médias",
      "intro": [
        "Há quem lute por glória, por ouro ou por medo. O samurai luta por um juramento. Treinado desde cedo em uma disciplina de lâmina e respiração, ele aprende que o golpe mais forte nasce da mente mais calma, e que a derrota começa muito antes do primeiro corte, no instante em que a vontade vacila.",
        "Samurais servem a senhores, a ideais ou a um código que só eles compreendem por inteiro. Podem ser guardiões de uma casa nobre, duelistas sem mestre ou arqueiros de olhar paciente. Não importa o caminho: todos concentram o corpo e o espírito em um único instante, e é nesse instante que a luta se decide."
      ],
      "progressao": [
        {
          "nivel": 1,
          "habilidades": [
            "Kiai",
            "Coração Firme"
          ],
          "poder": false
        },
        {
          "nivel": 2,
          "habilidades": [
            "Senda do Combatente"
          ],
          "poder": true
        },
        {
          "nivel": 3,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 4,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 5,
          "habilidades": [
            "Kiai (2 dados)"
          ],
          "poder": true
        },
        {
          "nivel": 6,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 7,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 8,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 9,
          "habilidades": [
            "Kiai (3 dados)"
          ],
          "poder": true
        },
        {
          "nivel": 10,
          "habilidades": [
            "Postura de Batalha"
          ],
          "poder": true
        },
        {
          "nivel": 11,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 12,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 13,
          "habilidades": [
            "Kiai (4 dados)"
          ],
          "poder": true
        },
        {
          "nivel": 14,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 15,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 16,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 17,
          "habilidades": [
            "Kiai (5 dados)"
          ],
          "poder": true
        },
        {
          "nivel": 18,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 19,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 20,
          "habilidades": [
            "O Ápice da Senda"
          ],
          "poder": true
        }
      ],
      "habilidades": [
        {
          "id": "kiai",
          "nome": "Kiai",
          "nivel": 1,
          "descricao": "Uma vez por rodada, quando faz um ataque, você pode gastar 2 PM. O ataque recebe +2 no teste de ataque e, se acertar, causa um dado de dano adicional do mesmo tipo e tamanho do dado da arma. Esse número de dados aumenta para 2 no 5º nível, 3 no 9º, 4 no 13º e 5 no 17º.",
          "custoPM": 2,
          "acao": "passivo",
          "subs": []
        },
        {
          "id": "coracao-firme",
          "nome": "Coração Firme",
          "nivel": 1,
          "descricao": "Quando faz um teste de resistência (Fortitude, Reflexos ou Vontade), você pode gastar 1 PM para somar sua Sabedoria no resultado.",
          "custoPM": 1,
          "acao": "passivo",
          "subs": []
        },
        {
          "id": "senda-do-combatente",
          "nome": "Senda do Combatente",
          "nivel": 2,
          "descricao": "Você escolhe uma Senda, que define seu estilo. A escolha é permanente.",
          "custoPM": null,
          "acao": "passivo",
          "subs": [
            {
              "nome": "Lâmina Única (Kenjutsu)",
              "descricao": "Enquanto empunha uma única arma corpo a corpo (a uma ou duas mãos), recebe +2 nos testes de ataque e +1 na margem de ameaça."
            },
            {
              "nome": "Lâminas Gêmeas (Niten)",
              "descricao": "Você recebe os benefícios do poder Par de Lâminas e, enquanto empunha duas armas, +2 na Defesa."
            },
            {
              "nome": "Kyudo (Arco)",
              "descricao": "Você soma sua Sabedoria (limitada pelo seu nível) no dano com arcos e ignora as penalidades de cobertura leve."
            }
          ]
        },
        {
          "id": "postura-de-batalha",
          "nome": "Postura de Batalha",
          "nivel": 10,
          "descricao": "Como uma ação de movimento, você pode gastar 3 PM. Até o fim da cena, você recebe RD 5 e seus ataques críticos ignoram a Redução de Dano do alvo.",
          "custoPM": 3,
          "acao": "movimento",
          "subs": []
        },
        {
          "id": "o-apice-da-senda",
          "nome": "O Ápice da Senda",
          "nivel": 20,
          "descricao": "Seu treino atinge o ponto mais alto. O efeito depende da Senda:",
          "custoPM": null,
          "acao": "passivo",
          "subs": [
            {
              "nome": "Seguidor do Vento Sangrento (Lâmina Única)",
              "descricao": "Quando acerta um ataque, você pode gastar 3 PM para fazer imediatamente um novo ataque. Pode repetir até errar, até ficar sem PM ou até ter feito um número de ataques extras igual à sua Sabedoria (mínimo 1) na cena."
            },
            {
              "nome": "Tempestade do Dever (Lâminas Gêmeas)",
              "descricao": "Como uma ação padrão, você gasta 6 PM e faz um ataque contra cada inimigo em alcance curto. Até o início do seu próximo turno, recebe +6 na Defesa e não pode ser flanqueado."
            },
            {
              "nome": "Saraivada Inflexível do Vento (Kyudo)",
              "descricao": "Como uma ação padrão, uma vez por rodada, você gasta 8 PM e escolhe um ponto em alcance longo. Criaturas em um raio de 9 m desse ponto sofrem 12d6 de dano de perfuração e ficam enredadas por 1 rodada. Um teste de Reflexos (CD Sab) reduz o dano à metade e evita o enredamento."
            }
          ]
        }
      ],
      "grupos": [
        "Poderes gerais e de combate",
        "Poderes de perícia e interpretação",
        "Poderes de Kyudo",
        "Poderes comuns"
      ],
      "poderes": [
        {
          "id": "lamina-veloz",
          "nome": "Lâmina Veloz",
          "grupo": "Poderes gerais e de combate",
          "descricao": "Você saca e guarda armas como ação livre.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "livre",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "resiliencia-de-aco",
          "nome": "Resiliência de Aço",
          "grupo": "Poderes gerais e de combate",
          "descricao": "Seus pontos de vida totais aumentam em um valor fixo igual à sua Sabedoria. <em>(Ganho único, não por nível.)</em>",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "contra-ataque-espiritual",
          "nome": "Contra-Ataque Espiritual",
          "grupo": "Poderes gerais e de combate",
          "descricao": "Quando um inimigo erra um ataque corpo a corpo contra você, você pode gastar 1 PM para fazer imediatamente um ataque corpo a corpo contra ele. É um ataque normal, sem Kiai ou qualquer outro acréscimo. Usar este poder gasta a sua reação da rodada.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 1,
          "acao": "reacao",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "foco-de-duelo",
          "nome": "Foco de Duelo",
          "grupo": "Poderes gerais e de combate",
          "descricao": "Gaste 2 PM para marcar um oponente. Até o fim da cena, você recebe +2 na Defesa contra ele.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 2,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "estocada-de-valorus",
          "nome": "Estocada de Valorus",
          "grupo": "Poderes gerais e de combate",
          "descricao": "Com armas de perfuração, sua margem de ameaça aumenta em +1.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "guarda-inexoravel",
          "nome": "Guarda Inexorável",
          "grupo": "Poderes gerais e de combate",
          "descricao": "Quando usa armadura leve ou média, você soma sua Sabedoria na Defesa, limitada ao bônus da armadura.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "passo-do-vento",
          "nome": "Passo do Vento",
          "grupo": "Poderes gerais e de combate",
          "descricao": "Gaste 1 PM. Até o fim do turno, você ignora terreno difícil e seu deslocamento aumenta em 3 m.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 1,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "meditacao-de-combate",
          "nome": "Meditação de Combate",
          "grupo": "Poderes gerais e de combate",
          "descricao": "Uma vez por cena, ao usar a ação Aguardar, você recupera 1d6 PM, ocorrendo ou não o gatilho que você escolheu.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 6,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "sangue-dos-baldurs",
          "nome": "Sangue dos Baldurs",
          "grupo": "Poderes gerais e de combate",
          "descricao": "Você recebe +2 em Fortitude. Nos testes de morte, você começa com 1 sucesso automático.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "golpe-do-sol-nascente",
          "nome": "Golpe do Sol Nascente",
          "grupo": "Poderes gerais e de combate",
          "descricao": "Quando usa o Kiai, você pode gastar 2 PM adicionais. O dano extra do Kiai passa a ser de fogo e o ataque ilumina uma área de 3 m ao redor do alvo.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 2,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "lamina-do-julgamento",
          "nome": "Lâmina do Julgamento",
          "grupo": "Poderes gerais e de combate",
          "descricao": "Quando ataca um inimigo que causou dano a um aliado nesta cena, você recebe +2 no teste de ataque.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "defletir",
          "nome": "Defletir",
          "grupo": "Poderes gerais e de combate",
          "descricao": "Quando é atingido por um ataque corpo a corpo, você pode gastar 3 PM e fazer um teste de Luta contra o resultado do ataque. Se o seu total for maior, o ataque falha. Você pode usar este poder, por cena, um número de vezes igual à sua Sabedoria (mínimo 1).",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 3,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "desvio-inabalavel",
          "nome": "Desvio Inabalável",
          "grupo": "Poderes gerais e de combate",
          "descricao": "Como uma ação de movimento, gaste 1 PM. Até o início do seu próximo turno, você soma sua Sabedoria em testes de Reflexos.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 1,
          "acao": "movimento",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "vigor-de-fogo-e-chamas",
          "nome": "Vigor de Fogo e Chamas",
          "grupo": "Poderes gerais e de combate",
          "descricao": "Enquanto usa armadura média, você recebe RD 2.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "postura-da-montanha",
          "nome": "Postura da Montanha",
          "grupo": "Poderes gerais e de combate",
          "descricao": "Se você não se moveu neste turno, recebe +5 em testes para resistir a manobras de empurrar e derrubar.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "corte-de-ar",
          "nome": "Corte de Ar",
          "grupo": "Poderes gerais e de combate",
          "descricao": "Gaste 2 PM. Você faz um ataque corpo a corpo contra um alvo em alcance curto, como se fosse um ataque à distância.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 2,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "desafio-de-ecida",
          "nome": "Desafio de Écida",
          "grupo": "Poderes gerais e de combate",
          "descricao": "Você usa Sabedoria, em vez de Carisma, em testes de Intimidação. Gastando 2 PM, seu efeito afeta também criaturas normalmente imunes a medo.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 2,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "lamina-fantasma",
          "nome": "Lâmina Fantasma",
          "grupo": "Poderes gerais e de combate",
          "descricao": "Seus ataques corpo a corpo ignoram a camuflagem de criaturas incorpóreas.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "equilibrio-de-justar",
          "nome": "Equilíbrio de Justar",
          "grupo": "Poderes gerais e de combate",
          "descricao": "Quando sofre uma penalidade em um teste de ataque, o seu próximo ataque na cena recebe um bônus igual à penalidade sofrida.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "golpe-derradeiro",
          "nome": "Golpe Derradeiro",
          "grupo": "Poderes gerais e de combate",
          "descricao": "Contra alvos caídos ou indefesos, o Kiai causa o dobro de dados de dano adicional.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "corpo-temperado",
          "nome": "Corpo Temperado",
          "grupo": "Poderes gerais e de combate",
          "descricao": "Escolha ácido, elétrico, fogo ou frio. Você recebe Redução de dano desse tipo 5.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "reflexo-de-espelho",
          "nome": "Reflexo de Espelho",
          "grupo": "Poderes gerais e de combate",
          "descricao": "Quando é alvo de uma magia, você pode gastar 3 PM e somar sua Sabedoria no teste de resistência. Se passar, a magia é anulada contra você.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 3,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "presenca-marcial",
          "nome": "Presença Marcial",
          "grupo": "Poderes gerais e de combate",
          "descricao": "Inimigos adjacentes a você sofrem –2 nos ataques contra seus aliados.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "grito-de-allen-lande",
          "nome": "Grito de Allen-Lande",
          "grupo": "Poderes gerais e de combate",
          "descricao": "Ao usar o Kiai, você faz um teste de Intimidação como ação livre contra o alvo do ataque.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "livre",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "zen-marcial",
          "nome": "Zen Marcial",
          "grupo": "Poderes gerais e de combate",
          "descricao": "Uma vez por rodada, gaste 2 PM para ganhar uma ação de movimento adicional.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 2,
          "acao": "movimento",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "honra-inabalavel",
          "nome": "Honra Inabalável",
          "grupo": "Poderes de perícia e interpretação",
          "descricao": "Você recebe +5 em Vontade contra efeitos de influência.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "palavra-do-senhor",
          "nome": "Palavra do Senhor",
          "grupo": "Poderes de perícia e interpretação",
          "descricao": "Você usa Nobreza no lugar de Diplomacia.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "calma-zen",
          "nome": "Calma Zen",
          "grupo": "Poderes de perícia e interpretação",
          "descricao": "Você pode escolher 10 em Iniciativa e em testes de Visão, Audição ou Olfato, mesmo em situações de perigo.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "etiqueta-de-dannan",
          "nome": "Etiqueta de Dannan",
          "grupo": "Poderes de perícia e interpretação",
          "descricao": "Você recebe +2 em Diplomacia e Nobreza ao lidar com nobres e oficiais militares.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "rastro-de-almagia",
          "nome": "Rastro de Almagia",
          "grupo": "Poderes de perícia e interpretação",
          "descricao": "Você recebe +2 em Sobrevivência e consegue rastrear mesmo em pedra ou cinzas.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "olhar-de-justar",
          "nome": "Olhar de Justar",
          "grupo": "Poderes de perícia e interpretação",
          "descricao": "Você recebe +5 em Intuição para perceber mentiras e ilusões.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "diplomacia-da-lamina",
          "nome": "Diplomacia da Lâmina",
          "grupo": "Poderes de perícia e interpretação",
          "descricao": "Você pode usar Luta no lugar de Diplomacia, apenas para pedir trégua ou rendição.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "cronista-de-icarus",
          "nome": "Cronista de Icarus",
          "grupo": "Poderes de perícia e interpretação",
          "descricao": "Você recebe +2 em História e usa Sabedoria, em vez de Inteligência, nessa perícia.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "sentir-a-mana",
          "nome": "Sentir a Mana",
          "grupo": "Poderes de perícia e interpretação",
          "descricao": "Gastando 1 PM, você lança Detectar Magia (atributo-chave Sabedoria).",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 1,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "mentor-de-recrutas",
          "nome": "Mentor de Recrutas",
          "grupo": "Poderes de perícia e interpretação",
          "descricao": "Aliados em alcance curto recebem +2 em uma perícia de Samurai na qual você seja treinado, à sua escolha, até o fim da cena.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "resiliencia-pos-cruzada",
          "nome": "Resiliência Pós-Cruzada",
          "grupo": "Poderes de perícia e interpretação",
          "descricao": "Você é imune à fadiga causada por marchas forçadas ou clima.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "presenca-majestosa",
          "nome": "Presença Majestosa",
          "grupo": "Poderes de perícia e interpretação",
          "descricao": "Você soma sua Sabedoria em Diplomacia e Intimidação.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "leitura-de-batalha",
          "nome": "Leitura de Batalha",
          "grupo": "Poderes de perícia e interpretação",
          "descricao": "Você usa Sabedoria, em vez de Destreza, em testes de Iniciativa.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "codigo-de-valorus",
          "nome": "Código de Valorus",
          "grupo": "Poderes de perícia e interpretação",
          "descricao": "Se você escolhe não atacar um inimigo desprevenido ou flanqueado, recebe +2 nas rolagens de dano até o fim do combate.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "flecha-de-justar",
          "nome": "Flecha de Justar",
          "grupo": "Poderes de Kyudo",
          "descricao": "Gaste 2 PM. Seu ataque à distância ignora camuflagem total.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 2,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": "Senda do Kyudo",
          "repetivel": false
        },
        {
          "id": "chuva-de-penas",
          "nome": "Chuva de Penas",
          "grupo": "Poderes de Kyudo",
          "descricao": "Gaste 3 PM. Você faz um ataque à distância adicional nesta rodada. Uma vez por rodada.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 3,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": "Senda do Kyudo",
          "repetivel": false
        },
        {
          "id": "tiro-de-mysteria",
          "nome": "Tiro de Mysteria",
          "grupo": "Poderes de Kyudo",
          "descricao": "Seus ataques com arco são considerados mágicos e podem causar dano de Essência.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": "Senda do Kyudo",
          "repetivel": false
        },
        {
          "id": "foco-do-cacador",
          "nome": "Foco do Caçador",
          "grupo": "Poderes de Kyudo",
          "descricao": "Você soma sua Sabedoria nos testes de Pontaria.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": "Senda do Kyudo",
          "repetivel": false
        },
        {
          "id": "arqueiro-da-torre-emerald",
          "nome": "Arqueiro da Torre Emerald",
          "grupo": "Poderes de Kyudo",
          "descricao": "Em terreno elevado, o alcance dos seus arcos aumenta em um passo.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": "Senda do Kyudo",
          "repetivel": false
        },
        {
          "id": "flecha-de-valorus",
          "nome": "Flecha de Valorus",
          "grupo": "Poderes de Kyudo",
          "descricao": "Gaste 1 PM. Seu ataque à distância realiza a manobra Empurrar, usando Pontaria no lugar do ataque corpo a corpo (ver Manobras, na seção 1).",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 1,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": "Senda do Kyudo",
          "repetivel": false
        },
        {
          "id": "sopro-do-vento",
          "nome": "Sopro do Vento",
          "grupo": "Poderes de Kyudo",
          "descricao": "Você ignora a penalidade de distância no segundo incremento de alcance do arco.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": "Senda do Kyudo",
          "repetivel": false
        },
        {
          "id": "olho-da-tempestade",
          "nome": "Olho da Tempestade",
          "grupo": "Poderes de Kyudo",
          "descricao": "Você não sofre a penalidade de –5 em ataques à distância contra inimigos adjacentes.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": "Senda do Kyudo",
          "repetivel": false
        },
        {
          "id": "arqueria-zen",
          "nome": "Arqueria Zen",
          "grupo": "Poderes de Kyudo",
          "descricao": "Suas habilidades de Kyudo custam 1 PM a menos (mínimo 1).",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 1,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": "Senda do Kyudo",
          "repetivel": false
        },
        {
          "id": "flecha-cortante",
          "nome": "Flecha Cortante",
          "grupo": "Poderes de Kyudo",
          "descricao": "O multiplicador de crítico dos seus arcos aumenta em +1.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": "Senda do Kyudo",
          "repetivel": false
        },
        {
          "id": "aumento-de-atributo",
          "nome": "Aumento de Atributo",
          "grupo": "Poderes comuns",
          "descricao": "Você recebe +1 em um atributo. Você pode escolher este poder várias vezes, mas apenas uma vez por patamar para um mesmo atributo.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": true
        },
        {
          "id": "pericia-especializada",
          "nome": "Perícia Especializada",
          "grupo": "Poderes comuns",
          "descricao": "Escolha uma perícia em que você seja treinado e ainda não seja especialista. Você se torna especialista nela (bônus de treino +4). Você pode escolher este poder quantas vezes quiser, cada vez para uma perícia diferente.",
          "prerequisito": "10º nível",
          "nivelMinimo": 10,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": true
        }
      ]
    },
    {
      "id": "barbaro",
      "nome": "Bárbaro",
      "papel": "Combatente Primitivo",
      "pv": {
        "inicial": 24,
        "porNivel": 6,
        "atributo": "CON"
      },
      "pm": {
        "inicial": 3,
        "porNivel": 3,
        "atributoSoNoPrimeiroNivel": false,
        "texto": "3 por nível",
        "atributo": null
      },
      "atributoChave": "Força",
      "pericias": {
        "obrigatorias": "Fortitude e Luta",
        "escolha": 4,
        "lista": [
          "Acrobacia",
          "Adestramento",
          "Atletismo",
          "Audição",
          "Cavalgar",
          "Furtividade",
          "Iniciativa",
          "Intimidação",
          "Olfato",
          "Pontaria",
          "Reflexos",
          "Sobrevivência",
          "Visão",
          "Vontade"
        ]
      },
      "proficiencias": "Armas simples, armas marciais, armaduras leves e médias",
      "intro": [
        "Não há treinamento, escola ou juramento por trás do seu golpe. Há fome, raiva e a certeza de que, enquanto ainda estiver de pé, o inimigo não terá vencido. O bárbaro luta com o corpo inteiro, e é o corpo que responde: quanto mais ferido, mais perigoso.",
        "Alguns vêm das terras selvagens, outros foram forjados em cativeiros, em guerras perdidas ou em tavernas onde só um punho resolvia a conversa. O que os une é a Fúria, uma tempestade que escolhem soltar, e que sabem que cobra caro de quem não a governa."
      ],
      "progressao": [
        {
          "nivel": 1,
          "habilidades": [
            "Fúria",
            "Pele Rija"
          ],
          "poder": false
        },
        {
          "nivel": 2,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 3,
          "habilidades": [
            "Sangue Quente"
          ],
          "poder": true
        },
        {
          "nivel": 4,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 5,
          "habilidades": [
            "Instinto Selvagem"
          ],
          "poder": true
        },
        {
          "nivel": 6,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 7,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 8,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 9,
          "habilidades": [
            "Fúria (+3 de dano e +2 de ataque)"
          ],
          "poder": true
        },
        {
          "nivel": 10,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 11,
          "habilidades": [
            "Recusa a Cair"
          ],
          "poder": true
        },
        {
          "nivel": 12,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 13,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 14,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 15,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 16,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 17,
          "habilidades": [
            "Fúria (+4 de dano e +3 de ataque)"
          ],
          "poder": true
        },
        {
          "nivel": 18,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 19,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 20,
          "habilidades": [
            "Fúria Primeva"
          ],
          "poder": true
        }
      ],
      "habilidades": [
        {
          "id": "furia",
          "nome": "Fúria",
          "nivel": 1,
          "descricao": "Como uma ação livre, você gasta 2 PM e entra em Fúria. Em Fúria, você recebe +2 nas rolagens de dano corpo a corpo e +1 nos testes de ataque corpo a corpo. Em contrapartida, não pode lançar magias nem fazer testes de Concentração, e só usa perícias baseadas em Inteligência, Sabedoria ou Carisma se forem Intimidação ou Vontade. A Fúria dura até o fim da cena, mas termina se, ao fim de uma rodada, você não tiver atacado nem sofrido dano. Você pode encerrá-la quando quiser, sem custo. No 9º nível, o bônus passa a +3 no dano e +2 no ataque; no 17º nível, a +4 no dano e +3 no ataque.",
          "custoPM": 2,
          "acao": "livre",
          "subs": []
        },
        {
          "id": "pele-rija",
          "nome": "Pele Rija",
          "nivel": 1,
          "descricao": "Enquanto estiver sem armadura ou usando armadura leve, e sem vestir túnica, você recebe +2 na Defesa.",
          "custoPM": null,
          "acao": "passivo",
          "subs": []
        },
        {
          "id": "sangue-quente",
          "nome": "Sangue Quente",
          "nivel": 3,
          "descricao": "Uma vez por rodada, enquanto estiver em Fúria, ao reduzir um inimigo a 0 PV com um ataque corpo a corpo, você recupera PV igual ao seu nível.",
          "custoPM": null,
          "acao": "passivo",
          "subs": []
        },
        {
          "id": "instinto-selvagem",
          "nome": "Instinto Selvagem",
          "nivel": 5,
          "descricao": "Você recebe +2 em Iniciativa. Em Fúria, você não pode ser flanqueado.",
          "custoPM": null,
          "acao": "passivo",
          "subs": []
        },
        {
          "id": "recusa-a-cair",
          "nome": "Recusa a Cair",
          "nivel": 11,
          "descricao": "Uma vez por cena, enquanto estiver em Fúria, quando seus PV fossem reduzidos a 0, você fica com 1 PV.",
          "custoPM": null,
          "acao": "passivo",
          "subs": []
        },
        {
          "id": "furia-primeva",
          "nome": "Fúria Primeva",
          "nivel": 20,
          "descricao": "Entrar em Fúria não custa PM. O bônus da Fúria passa a +5 no dano e +4 no ataque.",
          "custoPM": null,
          "acao": "passivo",
          "subs": []
        }
      ],
      "grupos": [
        "Linha da Fúria",
        "Linha da Brutalidade",
        "Linha da Resistência",
        "Linha da Selvageria",
        "Poderes comuns"
      ],
      "poderes": [
        {
          "id": "rugido-de-guerra",
          "nome": "Rugido de Guerra",
          "grupo": "Linha da Fúria",
          "descricao": "Como uma ação de movimento, você gasta 1 PM. Cada inimigo em alcance curto que possa ouvi-lo faz um teste de Vontade (CD = 10 + metade do nível + Força) ou fica Abalado até o início do seu próximo turno.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 1,
          "acao": "movimento",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "furia-revigorante",
          "nome": "Fúria Revigorante",
          "grupo": "Linha da Fúria",
          "descricao": "Ao entrar em Fúria, você recebe PV temporários iguais a 3 + metade do seu nível. Uma vez por cena.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "mente-furiosa",
          "nome": "Mente Furiosa",
          "grupo": "Linha da Fúria",
          "descricao": "Em Fúria, você recebe +5 em testes de resistência contra as condições Abalado, Apavorado, Confuso, Enfeitiçado e Fascinado.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "espirito-indomado",
          "nome": "Espírito Indomado",
          "grupo": "Linha da Fúria",
          "descricao": "Enquanto estiver em Fúria, você recebe +2 em todos os testes de resistência exigidos por magias que causam dano. É um efeito passivo: não gasta PM nem ação.",
          "prerequisito": "8º nível",
          "nivelMinimo": 8,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "furia-persistente",
          "nome": "Fúria Persistente",
          "grupo": "Linha da Fúria",
          "descricao": "A sua Fúria só termina por falta de combate se você passar duas rodadas seguidas sem atacar nem sofrer dano.",
          "prerequisito": "5º nível",
          "nivelMinimo": 5,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "golpe-furioso",
          "nome": "Golpe Furioso",
          "grupo": "Linha da Fúria",
          "descricao": "Em Fúria, ao atacar corpo a corpo, você gasta 2 PM e soma ao dano o dobro do bônus de dano da Fúria.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 2,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "furia-sanguinaria",
          "nome": "Fúria Sanguinária",
          "grupo": "Linha da Fúria",
          "descricao": "Em Fúria, quando acerta um ataque crítico, você recupera 1 PM.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 1,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "investida-furiosa",
          "nome": "Investida Furiosa",
          "grupo": "Linha da Fúria",
          "descricao": "Como uma ação padrão, você avança até o seu deslocamento em linha reta e faz um ataque corpo a corpo, com +2 no ataque. Até o início do seu próximo turno, você sofre –2 na Defesa. Só pode ser usada em Fúria.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "padrao",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "furia-mortal",
          "nome": "Fúria Mortal",
          "grupo": "Linha da Fúria",
          "descricao": "Em Fúria, a margem de ameaça dos seus ataques corpo a corpo aumenta em 1.",
          "prerequisito": "13º nível",
          "nivelMinimo": 13,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "golpe-esmagador",
          "nome": "Golpe Esmagador",
          "grupo": "Linha da Brutalidade",
          "descricao": "Gaste 2 PM ao atacar corpo a corpo com uma arma de Impacto. Se acertar, o alvo faz um teste de Fortitude (CD = 10 + metade do nível + Força) ou fica Pasmo até o início do seu próximo turno.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 2,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "machadada-dilacerante",
          "nome": "Machadada Dilacerante",
          "grupo": "Linha da Brutalidade",
          "descricao": "Gaste 1 PM ao atacar com uma arma de Corte. Se acertar, o alvo fica Sangrando.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 1,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "peso-pesado",
          "nome": "Peso Pesado",
          "grupo": "Linha da Brutalidade",
          "descricao": "Ao empunhar uma arma de Duas Mãos, você recebe +2 nas rolagens de dano.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "arremesso-brutal",
          "nome": "Arremesso Brutal",
          "grupo": "Linha da Brutalidade",
          "descricao": "Suas armas de arremesso causam +2 de dano e têm o alcance dobrado.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "forca-bruta",
          "nome": "Força Bruta",
          "grupo": "Linha da Brutalidade",
          "descricao": "Você recebe +2 em testes de ataque das manobras Derrubar, Empurrar e Quebrar. Quando empurra um alvo, ele é empurrado 1,5 m adicionais.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "arma-improvisada",
          "nome": "Arma Improvisada",
          "grupo": "Linha da Brutalidade",
          "descricao": "Você não sofre penalidade ao usar armas improvisadas, elas causam +2 de dano nas suas mãos e contam como armas marciais.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "pele-de-ferro",
          "nome": "Pele de Ferro",
          "grupo": "Linha da Resistência",
          "descricao": "Você recebe RD 2, mesmo fora da Fúria.",
          "prerequisito": "6º nível",
          "nivelMinimo": 6,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "vigor-selvagem",
          "nome": "Vigor Selvagem",
          "grupo": "Linha da Resistência",
          "descricao": "Você recebe +1 PV por nível.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "folego-do-selvagem",
          "nome": "Fôlego do Selvagem",
          "grupo": "Linha da Resistência",
          "descricao": "Como uma ação de movimento, você gasta 2 PM e recupera PV iguais ao dobro do seu nível. Uma vez por cena.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 2,
          "acao": "movimento",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "estomago-de-ferro",
          "nome": "Estômago de Ferro",
          "grupo": "Linha da Resistência",
          "descricao": "Você recebe +5 em testes de Fortitude contra as condições Doente, Enjoado e Envenenado.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "insensivel",
          "nome": "Insensível",
          "grupo": "Linha da Resistência",
          "descricao": "Em Fúria, você recebe +5 em testes de resistência contra as condições Atordoado, Lento, Pasmo e Paralisado.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "revide-furioso",
          "nome": "Revide Furioso",
          "grupo": "Linha da Resistência",
          "descricao": "Quando um inimigo adjacente lhe causa dano, você pode gastar 1 PM e a sua reação para fazer imediatamente um ataque corpo a corpo contra ele. Só pode ser usado em Fúria.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 1,
          "acao": "reacao",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "teimosia-de-ferro",
          "nome": "Teimosia de Ferro",
          "grupo": "Linha da Resistência",
          "descricao": "Você rola com vantagem o primeiro teste de morte de cada vez que cai a 0 PV.",
          "prerequisito": "10º nível",
          "nivelMinimo": 10,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "faro-agucado",
          "nome": "Faro Aguçado",
          "grupo": "Linha da Selvageria",
          "descricao": "Você recebe +2 em Olfato e em Sobrevivência.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "pe-ligeiro",
          "nome": "Pé Ligeiro",
          "grupo": "Linha da Selvageria",
          "descricao": "Seu deslocamento aumenta em 3 m.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "olhar-de-fera",
          "nome": "Olhar de Fera",
          "grupo": "Linha da Selvageria",
          "descricao": "Você usa Força no lugar de Carisma em testes de Intimidação e recebe +2 nesses testes.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "salto-selvagem",
          "nome": "Salto Selvagem",
          "grupo": "Linha da Selvageria",
          "descricao": "Você recebe +2 em Atletismo e dobra a distância dos seus saltos.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "domar-a-fera",
          "nome": "Domar a Fera",
          "grupo": "Linha da Selvageria",
          "descricao": "Você usa Força no lugar de Sabedoria em testes de Adestramento e recebe +2 em Cavalgar.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "pele-de-terra",
          "nome": "Pele de Terra",
          "grupo": "Linha da Selvageria",
          "descricao": "Você recebe +3 em Furtividade em ambientes naturais.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "cacador-implacavel",
          "nome": "Caçador Implacável",
          "grupo": "Linha da Selvageria",
          "descricao": "Você recebe +2 nos testes de ataque contra criaturas Sangrando ou com menos da metade dos PV.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "aumento-de-atributo",
          "nome": "Aumento de Atributo",
          "grupo": "Poderes comuns",
          "descricao": "Você recebe +1 em um atributo. Você pode escolher este poder várias vezes, mas apenas uma vez por patamar para um mesmo atributo.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": true
        },
        {
          "id": "pericia-especializada",
          "nome": "Perícia Especializada",
          "grupo": "Poderes comuns",
          "descricao": "Escolha uma perícia em que você seja treinado e ainda não seja especialista. Você se torna especialista nela (bônus de treino +4). Você pode escolher este poder quantas vezes quiser, cada vez para uma perícia diferente.",
          "prerequisito": "10º nível",
          "nivelMinimo": 10,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": true
        }
      ]
    },
    {
      "id": "ladino",
      "nome": "Ladino",
      "papel": "Especialista em Furtividade",
      "pv": {
        "inicial": 16,
        "porNivel": 4,
        "atributo": "CON"
      },
      "pm": {
        "inicial": 4,
        "porNivel": 4,
        "atributoSoNoPrimeiroNivel": false,
        "texto": "4 por nível",
        "atributo": null
      },
      "atributoChave": "Destreza",
      "pericias": {
        "obrigatorias": "Furtividade e Prestidigitação",
        "escolha": 8,
        "lista": [
          "Acrobacia",
          "Atletismo",
          "Atuação",
          "Audição",
          "Barganha",
          "Diplomacia",
          "Enganação",
          "Intimidação",
          "Intuição",
          "Investigação",
          "Iniciativa",
          "Luta",
          "Pontaria",
          "Reflexos",
          "Sobrevivência",
          "Visão",
          "Vontade"
        ]
      },
      "proficiencias": "Armas simples, armas marciais Leves ou Ágeis, arcos curtos, armaduras leves",
      "intro": [
        "Todo mundo julga o ladino pelo que ele leva embora. Poucos reparam no que ele precisou saber para chegar até lá: a hora certa, o passo certo, a palavra certa. O ladino não vence o inimigo mais forte; vence o mais distraído, e faz com que todos estejam distraídos.",
        "Pode ser batedor, trambiqueiro, espião, arrombador ou apenas alguém que cresceu sem nada e aprendeu a notar tudo. O que os une é o ofício: uma lâmina curta, olhos treinados e a paciência de esperar o instante em que um único golpe basta."
      ],
      "progressao": [
        {
          "nivel": 1,
          "habilidades": [
            "Ataque Furtivo (1d6)",
            "Duas Armas"
          ],
          "poder": false
        },
        {
          "nivel": 2,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 3,
          "habilidades": [
            "Corpo Escorregadio"
          ],
          "poder": true
        },
        {
          "nivel": 4,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 5,
          "habilidades": [
            "Ataque Furtivo (2d6)",
            "Faro para Perigo"
          ],
          "poder": true
        },
        {
          "nivel": 6,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 7,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 8,
          "habilidades": [
            "Perícia Refinada"
          ],
          "poder": true
        },
        {
          "nivel": 9,
          "habilidades": [
            "Ataque Furtivo (3d6)"
          ],
          "poder": true
        },
        {
          "nivel": 10,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 11,
          "habilidades": [
            "Perícia Infalível"
          ],
          "poder": true
        },
        {
          "nivel": 12,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 13,
          "habilidades": [
            "Ataque Furtivo (4d6)"
          ],
          "poder": true
        },
        {
          "nivel": 14,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 15,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 16,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 17,
          "habilidades": [
            "Ataque Furtivo (5d6)"
          ],
          "poder": true
        },
        {
          "nivel": 18,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 19,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 20,
          "habilidades": [
            "Golpe Perfeito"
          ],
          "poder": true
        }
      ],
      "habilidades": [
        {
          "id": "ataque-furtivo",
          "nome": "Ataque Furtivo",
          "nivel": 1,
          "descricao": "O <strong>primeiro ataque</strong> que você faz em cada rodada causa dano extra de 1d6, do mesmo tipo da arma, se acertar e for um ataque corpo a corpo com uma arma Leve ou Ágil (ou um ataque à distância em alcance curto) contra um alvo desprevenido, flanqueado ou impedido (Agarrado, Caído, Cego, Enredado, Imóvel, Paralisado ou Pasmo). Os demais ataques da rodada não recebem o dano extra. O dano extra aumenta em 1d6 a cada 4 níveis (2d6 no 5º, 3d6 no 9º, 4d6 no 13º e 5d6 no 17º).",
          "custoPM": null,
          "acao": "passivo",
          "subs": []
        },
        {
          "id": "pericia-refinada",
          "nome": "Perícia Refinada",
          "nivel": 8,
          "descricao": "Escolha duas perícias em que você seja treinado. Você se torna especialista nelas (bônus de treino +4). Esta habilidade é recebida uma única vez.",
          "custoPM": null,
          "acao": "passivo",
          "subs": []
        },
        {
          "id": "duas-armas",
          "nome": "Duas Armas",
          "nivel": 1,
          "descricao": "Quando usa Agredir empunhando uma arma Leve ou Ágil em cada mão, você faz um ataque com cada uma, sem sofrer a penalidade geral de combate com duas armas. O segundo ataque não soma o modificador de atributo no dano.",
          "custoPM": null,
          "acao": "passivo",
          "subs": []
        },
        {
          "id": "corpo-escorregadio",
          "nome": "Corpo Escorregadio",
          "nivel": 3,
          "descricao": "Quando você passa em um teste de Reflexos contra um efeito que causaria metade do dano, você não sofre dano algum. Se falhar, sofre apenas metade.",
          "custoPM": null,
          "acao": "passivo",
          "subs": []
        },
        {
          "id": "faro-para-perigo",
          "nome": "Faro para Perigo",
          "nivel": 5,
          "descricao": "Você recebe +2 em Iniciativa e +2 em testes de Audição, Visão e Investigação para perceber armadilhas, emboscadas e criaturas escondidas.",
          "custoPM": null,
          "acao": "passivo",
          "subs": []
        },
        {
          "id": "pericia-infalivel",
          "nome": "Perícia Infalível",
          "nivel": 11,
          "descricao": "Quando você faz um teste de Acrobacia, Furtividade, Investigação, Prestidigitação, Audição, Visão ou Reflexos e o resultado do d20 é menor que 10, considere que o resultado foi 10. Se o teste tiver vantagem, o mínimo de 10 vale para o dado que você manteve.",
          "custoPM": null,
          "acao": "passivo",
          "subs": []
        },
        {
          "id": "golpe-perfeito",
          "nome": "Golpe Perfeito",
          "nivel": 20,
          "descricao": "Uma vez por cena, ao acertar um Ataque Furtivo, você causa o dano máximo nos dados do dano extra.",
          "custoPM": null,
          "acao": "passivo",
          "subs": []
        }
      ],
      "grupos": [
        "Linha da Emboscada",
        "Linha dos Truques",
        "Linha do Combate Ágil",
        "Linha da Esquiva",
        "Linha do Arco",
        "Poderes comuns"
      ],
      "poderes": [
        {
          "id": "golpe-nas-sombras",
          "nome": "Golpe nas Sombras",
          "grupo": "Linha da Emboscada",
          "descricao": "Se você estava escondido ao atacar, o alvo fica desprevenido contra esse ataque.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "passo-silencioso",
          "nome": "Passo Silencioso",
          "grupo": "Linha da Emboscada",
          "descricao": "Você se move até o seu deslocamento sem sofrer penalidade em Furtividade.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "surpreender",
          "nome": "Surpreender",
          "grupo": "Linha da Emboscada",
          "descricao": "Seus ataques contra criaturas que ainda não agiram no combate contam como ataques contra alvos desprevenidos.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "ataque-e-sumico",
          "nome": "Ataque e Sumiço",
          "grupo": "Linha da Emboscada",
          "descricao": "Depois de um Ataque Furtivo, você pode gastar 1 PM, como ação livre, para se deslocar até 3 m.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 1,
          "acao": "livre",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "esconderijo-instantaneo",
          "nome": "Esconderijo Instantâneo",
          "grupo": "Linha da Emboscada",
          "descricao": "Como uma ação de movimento, você gasta 2 PM e faz um teste de Furtividade para se esconder, mesmo sem camuflagem ou cobertura disponível.",
          "prerequisito": "6º nível",
          "nivelMinimo": 6,
          "custoPM": 2,
          "acao": "movimento",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "sussurro-letal",
          "nome": "Sussurro Letal",
          "grupo": "Linha da Emboscada",
          "descricao": "Seu Ataque Furtivo causa um dado extra de dano contra alvos que não percebem você.",
          "prerequisito": "8º nível",
          "nivelMinimo": 8,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "maos-de-seda",
          "nome": "Mãos de Seda",
          "grupo": "Linha dos Truques",
          "descricao": "Você recebe +2 em Prestidigitação e pode sacar ou guardar um item como ação livre.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "livre",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "arrombador",
          "nome": "Arrombador",
          "grupo": "Linha dos Truques",
          "descricao": "Você recebe +5 em testes para abrir fechaduras e desarmar armadilhas.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "olho-de-avaliador",
          "nome": "Olho de Avaliador",
          "grupo": "Linha dos Truques",
          "descricao": "Você recebe +2 em Intuição e Investigação e reconhece o valor aproximado de qualquer item que examine.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "mestre-dos-disfarces",
          "nome": "Mestre dos Disfarces",
          "grupo": "Linha dos Truques",
          "descricao": "Você recebe +2 em Enganação e se disfarça em 10 minutos, sem precisar de materiais especiais.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "sorte-de-ladino",
          "nome": "Sorte de Ladino",
          "grupo": "Linha dos Truques",
          "descricao": "Uma vez por cena, você gasta 1 PM para refazer um teste de perícia e ficar com o novo resultado.",
          "prerequisito": "5º nível",
          "nivelMinimo": 5,
          "custoPM": 1,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "treinamento-extra",
          "nome": "Treinamento Extra",
          "grupo": "Linha dos Truques",
          "descricao": "Você se torna treinado em duas perícias à sua escolha.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "olhos-atentos",
          "nome": "Olhos Atentos",
          "grupo": "Linha dos Truques",
          "descricao": "Você recebe +2 em Visão, Audição e Investigação.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "lingua-prateada",
          "nome": "Língua Prateada",
          "grupo": "Linha dos Truques",
          "descricao": "Você usa Destreza no lugar de Carisma em testes de Enganação.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "golpe-certeiro",
          "nome": "Golpe Certeiro",
          "grupo": "Linha do Combate Ágil",
          "descricao": "Gaste 2 PM ao atacar. Você recebe +3 no teste de ataque.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 2,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "finta",
          "nome": "Finta",
          "grupo": "Linha do Combate Ágil",
          "descricao": "Como uma ação padrão, você gasta 1 PM e faz um teste de Enganação oposto ao teste de Intuição do alvo. Se vencer, o alvo fica desprevenido contra o seu próximo ataque, até o fim do seu turno.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 1,
          "acao": "padrao",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "ataque-rasteiro",
          "nome": "Ataque Rasteiro",
          "grupo": "Linha do Combate Ágil",
          "descricao": "Você recebe +2 em testes de ataque da manobra Derrubar. Ataques contra alvos Caídos causam +2 de dano.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "corte-nos-tendoes",
          "nome": "Corte nos Tendões",
          "grupo": "Linha do Combate Ágil",
          "descricao": "Gaste 2 PM ao fazer um Ataque Furtivo. Se acertar, o alvo fica Lento até o início do seu próximo turno.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 2,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "mira-silenciosa",
          "nome": "Mira Silenciosa",
          "grupo": "Linha do Combate Ágil",
          "descricao": "Seus ataques à distância feitos de um esconderijo não revelam a sua posição.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "companheiro-de-crime",
          "nome": "Companheiro de Crime",
          "grupo": "Linha do Combate Ágil",
          "descricao": "Como uma ação de movimento, você gasta 1 PM e escolhe um aliado adjacente ao mesmo inimigo que você. Até o início do seu próximo turno, esse aliado conta como flanqueador desse inimigo, independente de posição.",
          "prerequisito": "6º nível",
          "nivelMinimo": 6,
          "custoPM": 1,
          "acao": "movimento",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "mao-habilidosa",
          "nome": "Mão Habilidosa",
          "grupo": "Linha da Esquiva",
          "descricao": "O segundo ataque da habilidade Duas Armas soma o modificador de atributo no dano.",
          "prerequisito": "6º nível",
          "nivelMinimo": 6,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "passo-de-lado",
          "nome": "Passo de Lado",
          "grupo": "Linha da Esquiva",
          "descricao": "Quando é alvo de um ataque corpo a corpo, você pode gastar 1 PM e a sua reação para receber +3 na Defesa contra esse ataque.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 1,
          "acao": "reacao",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "rolamento",
          "nome": "Rolamento",
          "grupo": "Linha da Esquiva",
          "descricao": "Você reduz à metade o dano de queda e não fica Caído ao cair.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "escapista",
          "nome": "Escapista",
          "grupo": "Linha da Esquiva",
          "descricao": "Você recebe +5 em testes para escapar das condições Agarrado e Enredado.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "fuga-desesperada",
          "nome": "Fuga Desesperada",
          "grupo": "Linha da Esquiva",
          "descricao": "Como uma ação livre, você gasta 2 PM. Seu deslocamento aumenta em 6 m até o fim do turno.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 2,
          "acao": "livre",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "sempre-alerta",
          "nome": "Sempre Alerta",
          "grupo": "Linha da Esquiva",
          "descricao": "Você não pode ficar Surpreendido.",
          "prerequisito": "7º nível",
          "nivelMinimo": 7,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "ladrao-de-rua",
          "nome": "Ladrão de Rua",
          "grupo": "Linha da Esquiva",
          "descricao": "Você recebe +2 em Atletismo e Acrobacia.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "atirador-furtivo",
          "nome": "Atirador Furtivo",
          "grupo": "Linha do Arco",
          "descricao": "Seu Ataque Furtivo com arco ou besta funciona também contra alvos em alcance médio.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "disparo-sorrateiro",
          "nome": "Disparo Sorrateiro",
          "grupo": "Linha do Arco",
          "descricao": "Depois de atacar escondido com arco ou besta, você pode gastar 1 PM e fazer um teste de Furtividade contra a Visão de quem o procura. Se vencer, continua escondido.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 1,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "mira-paciente",
          "nome": "Mira Paciente",
          "grupo": "Linha do Arco",
          "descricao": "Como uma ação de movimento, você gasta 1 PM. Seu próximo ataque à distância neste turno recebe +2 no teste de ataque e a margem de ameaça dele aumenta em 1.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 1,
          "acao": "movimento",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "tiro-a-queima-roupa",
          "nome": "Tiro à Queima-Roupa",
          "grupo": "Linha do Arco",
          "descricao": "Você não sofre a penalidade de –5 em ataques à distância contra inimigos adjacentes.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "disparo-duplo",
          "nome": "Disparo Duplo",
          "grupo": "Linha do Arco",
          "descricao": "Gaste 2 PM ao Agredir com arco ou besta. Você faz um disparo adicional contra o mesmo alvo ou contra outro alvo em alcance curto. O disparo adicional não soma o modificador de atributo no dano.",
          "prerequisito": "6º nível",
          "nivelMinimo": 6,
          "custoPM": 2,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "flecha-de-desarme",
          "nome": "Flecha de Desarme",
          "grupo": "Linha do Arco",
          "descricao": "Gaste 1 PM ao atacar à distância. Seu ataque realiza a manobra Desarmar, usando Pontaria no lugar do ataque corpo a corpo (ver Manobras, na seção 1).",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 1,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "saque-veloz",
          "nome": "Saque Veloz",
          "grupo": "Linha do Arco",
          "descricao": "Uma vez por turno, você saca um arco ou uma besta como ação livre.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "livre",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "aumento-de-atributo",
          "nome": "Aumento de Atributo",
          "grupo": "Poderes comuns",
          "descricao": "Você recebe +1 em um atributo. Você pode escolher este poder várias vezes, mas apenas uma vez por patamar para um mesmo atributo.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": true
        },
        {
          "id": "pericia-especializada",
          "nome": "Perícia Especializada",
          "grupo": "Poderes comuns",
          "descricao": "Escolha uma perícia em que você seja treinado e ainda não seja especialista. Você se torna especialista nela (bônus de treino +4). Você pode escolher este poder quantas vezes quiser, cada vez para uma perícia diferente.",
          "prerequisito": "10º nível",
          "nivelMinimo": 10,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": true
        }
      ]
    },
    {
      "id": "patrulheiro",
      "nome": "Patrulheiro",
      "papel": "Explorador e Caçador",
      "pv": {
        "inicial": 18,
        "porNivel": 4,
        "atributo": "CON"
      },
      "pm": {
        "inicial": 4,
        "porNivel": 4,
        "atributoSoNoPrimeiroNivel": false,
        "texto": "4 por nível",
        "atributo": null
      },
      "atributoChave": "Destreza",
      "pericias": {
        "obrigatorias": "Sobrevivência e (Luta ou Pontaria)",
        "escolha": 6,
        "lista": [
          "Acrobacia",
          "Adestramento",
          "Atletismo",
          "Audição",
          "Cavalgar",
          "Cura",
          "Fortitude",
          "Furtividade",
          "Iniciativa",
          "Intuição",
          "Investigação",
          "Navegação",
          "Olfato",
          "Reflexos",
          "Visão",
          "Vontade"
        ]
      },
      "proficiencias": "Armas simples, armas marciais, arcos longos, armaduras leves e médias",
      "intro": [
        "A floresta não perdoa, e o patrulheiro aprendeu a falar a língua dela. Lê uma pegada como outros leem uma carta, ouve o galho que quebra antes do inimigo perceber que o pisou, e sabe que toda caçada se vence com paciência: escolher a presa, segui-la e acertar uma única vez no lugar certo.",
        "Há patrulheiros que guardam fronteiras, outros que caçam monstros por contrato, outros que simplesmente vivem longe de tudo. O que os une é o olhar fixo em um alvo e a certeza de que, uma vez marcado, ele não escapa."
      ],
      "progressao": [
        {
          "nivel": 1,
          "habilidades": [
            "Marca da Presa (1d4)"
          ],
          "poder": false
        },
        {
          "nivel": 2,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 3,
          "habilidades": [
            "Vínculo Selvagem"
          ],
          "poder": true
        },
        {
          "nivel": 4,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 5,
          "habilidades": [
            "Marca da Presa (2d4)"
          ],
          "poder": true
        },
        {
          "nivel": 6,
          "habilidades": [
            "Disparo Duplo"
          ],
          "poder": true
        },
        {
          "nivel": 7,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 8,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 9,
          "habilidades": [
            "Marca da Presa (3d4)"
          ],
          "poder": true
        },
        {
          "nivel": 10,
          "habilidades": [
            "Caçada Contínua"
          ],
          "poder": true
        },
        {
          "nivel": 11,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 12,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 13,
          "habilidades": [
            "Marca da Presa (4d4)"
          ],
          "poder": true
        },
        {
          "nivel": 14,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 15,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 16,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 17,
          "habilidades": [
            "Marca da Presa (5d4)"
          ],
          "poder": true
        },
        {
          "nivel": 18,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 19,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 20,
          "habilidades": [
            "Presa Condenada"
          ],
          "poder": true
        }
      ],
      "habilidades": [
        {
          "id": "marca-da-presa",
          "nome": "Marca da Presa",
          "nivel": 1,
          "descricao": "Como uma ação de movimento, você gasta 1 PM e escolhe uma criatura que consiga ver em alcance médio. Ela se torna a sua <strong>presa</strong> até o fim da cena ou até você marcar outra criatura. Você tem uma presa por vez. Contra a sua presa, você recebe +2 em testes de Sobrevivência, Investigação e Visão para rastreá-la, e todos os seus ataques que acertarem causam dano extra de 1d4 (o dano extra vale só para os seus ataques, não para os do seu animal). O dano extra aumenta em 1d4 a cada 4 níveis (2d4 no 5º, 3d4 no 9º, 4d4 no 13º e 5d4 no 17º).",
          "custoPM": 1,
          "acao": "movimento",
          "subs": []
        },
        {
          "id": "vinculo-selvagem",
          "nome": "Vínculo Selvagem",
          "nivel": 3,
          "descricao": "Floressa concede aos patrulheiros um vínculo espiritual com um animal da natureza. Você escolhe <strong>um</strong> vínculo da lista abaixo, e essa escolha é permanente. Como uma ação de movimento, você gasta 1 PM e invoca o seu animal, que surge em um espaço livre adjacente a você. Ele permanece até você dispensá-lo (ação livre) ou até chegar a 0 PV, quando desaparece; você pode invocá-lo de novo, com todos os PV, pagando o custo outra vez. O animal <strong>não pode ser curado</strong> por nenhum efeito. Ele age logo depois do seu turno, com uma ação padrão e uma ação de movimento. Em geral, o animal tem: <strong>PV</strong> = 10 + metade do seu nível (arredondada para baixo), igual para todos os animais; <strong>Defesa</strong> = 10 + a sua Destreza + o bônus do animal; <strong>testes de ataque</strong> e <strong>testes de resistência</strong> iguais aos seus; e causa o dano indicado, mais metade do seu nível (arredondada para baixo). As CDs das habilidades do animal são 10 + metade do seu nível + a sua Destreza.",
          "custoPM": 1,
          "acao": "padrao",
          "subs": [
            {
              "nome": "Lobo",
              "descricao": "Defesa +2; deslocamento 12 m. Mordida: 1d6 de dano de Perfuração. <em>Tática de Matilha:</em> se um aliado seu estiver adjacente ao alvo, o ataque do lobo é feito com vantagem. <em>Derrubar:</em> uma vez por rodada, quando a mordida acerta, o alvo faz um teste de Fortitude ou fica Caído."
            },
            {
              "nome": "Pantera",
              "descricao": "Defesa +3; deslocamento 15 m, escalada 9 m; +4 em Furtividade. Mordida: 1d6 de dano de Perfuração. <em>Bote:</em> se a mordida derruba o alvo (ele fica Caído), a pantera faz imediatamente um segundo ataque de mordida."
            },
            {
              "nome": "Cobra Voadora",
              "descricao": "Defesa +4; deslocamento 9 m, voo 12 m. Mordida: 1d4 de Perfuração mais 1d6 de dano de Veneno. <em>Ataque e Recuo:</em> uma vez por rodada, depois de atacar, a cobra pode se deslocar até 6 m como ação livre."
            },
            {
              "nome": "Urso Negro",
              "descricao": "Defesa +1; deslocamento 9 m, escalada 6 m; RD 2. Garras: 1d8 de dano de Corte."
            },
            {
              "nome": "Sapo Gigante",
              "descricao": "Defesa +1; deslocamento 9 m, salto de 6 m. Mordida: 1d6 de dano de Perfuração. <em>Língua Agarrante:</em> quando a mordida acerta, o alvo faz um teste de Fortitude ou fica Agarrado; enquanto agarra um alvo, o sapo não pode atacar outro."
            },
            {
              "nome": "Teixugo Gigante",
              "descricao": "Defesa +2; deslocamento 6 m, escavação 6 m. <em>Ataque Duplo:</em> o teixugo faz dois ataques com a mesma ação, uma mordida de 1d6 de Perfuração e garras de 1d4 de Corte; só a mordida soma a metade do seu nível."
            }
          ]
        },
        {
          "id": "disparo-duplo",
          "nome": "Disparo Duplo",
          "nivel": 6,
          "descricao": "Gaste 2 PM ao Agredir com arco ou besta. Você faz um disparo adicional contra o mesmo alvo ou contra outro alvo em alcance curto. O disparo adicional não soma o modificador de atributo no dano.",
          "custoPM": 2,
          "acao": "passivo",
          "subs": []
        },
        {
          "id": "cacada-continua",
          "nome": "Caçada Contínua",
          "nivel": 10,
          "descricao": "Quando a sua presa é reduzida a 0 PV, você pode marcar outra criatura como uma ação livre, sem gastar PM.",
          "custoPM": null,
          "acao": "livre",
          "subs": []
        },
        {
          "id": "presa-condenada",
          "nome": "Presa Condenada",
          "nivel": 20,
          "descricao": "Uma vez por cena, ao acertar a sua presa, os dados da Marca da Presa causam o dano máximo e a presa fica Lenta até o início do seu próximo turno.",
          "custoPM": null,
          "acao": "passivo",
          "subs": []
        }
      ],
      "grupos": [
        "Linha da Caça",
        "Linha do Arco",
        "Linha da Lâmina",
        "Linha da Mata",
        "Linha do Vínculo",
        "Poderes comuns"
      ],
      "poderes": [
        {
          "id": "marca-rapida",
          "nome": "Marca Rápida",
          "grupo": "Linha da Caça",
          "descricao": "Você marca a sua presa como uma ação livre, uma vez por rodada, em vez de ação de movimento.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "movimento",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "rastreio-infalivel",
          "nome": "Rastreio Infalível",
          "grupo": "Linha da Caça",
          "descricao": "Você recebe +5 em testes de Sobrevivência para seguir os rastros da sua presa e sempre sabe em que direção ela está, mesmo fora de vista, enquanto ela estiver marcada.",
          "prerequisito": "Sabedoria 1",
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": {
            "SAB": 1
          },
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "golpe-do-cacador",
          "nome": "Golpe do Caçador",
          "grupo": "Linha da Caça",
          "descricao": "Gaste 2 PM ao atacar a sua presa. Você rola duas vezes os dados de dano extra da Marca da Presa e fica com a soma.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 2,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "emboscada-de-cacador",
          "nome": "Emboscada de Caçador",
          "grupo": "Linha da Caça",
          "descricao": "Você recebe +2 nos testes de ataque contra a sua presa enquanto ela não tiver percebido você.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "marca-compartilhada",
          "nome": "Marca Compartilhada",
          "grupo": "Linha da Caça",
          "descricao": "Como uma ação de movimento, você gasta 1 PM. Um aliado em alcance curto causa +2 de dano contra a sua presa até o fim da cena.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 1,
          "acao": "movimento",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "presa-esgotada",
          "nome": "Presa Esgotada",
          "grupo": "Linha da Caça",
          "descricao": "Seus ataques contra a sua presa ignoram 3 pontos da RD dela.",
          "prerequisito": "8º nível",
          "nivelMinimo": 8,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "presa-dupla",
          "nome": "Presa Dupla",
          "grupo": "Linha da Caça",
          "descricao": "Você pode ter duas presas ao mesmo tempo.",
          "prerequisito": "8º nível",
          "nivelMinimo": 8,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "disparo-certeiro",
          "nome": "Disparo Certeiro",
          "grupo": "Linha do Arco",
          "descricao": "Se você não se moveu neste turno, recebe +2 nos testes de ataque à distância.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "flecha-que-atravessa",
          "nome": "Flecha que Atravessa",
          "grupo": "Linha do Arco",
          "descricao": "Gaste 2 PM ao atacar com arco. O ataque ignora 3 pontos de RD do alvo.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 2,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "disparo-longo",
          "nome": "Disparo Longo",
          "grupo": "Linha do Arco",
          "descricao": "O alcance das suas armas de disparo dobra.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "mira-calma",
          "nome": "Mira Calma",
          "grupo": "Linha do Arco",
          "descricao": "Você não sofre a penalidade de –5 em ataques à distância contra inimigos adjacentes.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "chuva-de-flechas",
          "nome": "Chuva de Flechas",
          "grupo": "Linha do Arco",
          "descricao": "Como uma ação padrão, você gasta 4 PM e faz um ataque à distância contra cada inimigo em alcance curto.",
          "prerequisito": "10º nível",
          "nivelMinimo": 10,
          "custoPM": 4,
          "acao": "padrao",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "disparo-duplo-aprimorado",
          "nome": "Disparo Duplo Aprimorado",
          "grupo": "Linha do Arco",
          "descricao": "O disparo adicional do Disparo Duplo soma o modificador de atributo no dano.",
          "prerequisito": "12º nível",
          "nivelMinimo": 12,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "laminas-do-mato",
          "nome": "Lâminas do Mato",
          "grupo": "Linha da Lâmina",
          "descricao": "Quando usa Agredir empunhando uma arma Leve ou Ágil em cada mão, você faz um ataque com cada uma, sem sofrer a penalidade geral de combate com duas armas. O segundo ataque não soma o modificador de atributo no dano.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "mao-firme",
          "nome": "Mão Firme",
          "grupo": "Linha da Lâmina",
          "descricao": "O segundo ataque das Lâminas do Mato soma o modificador de atributo no dano.",
          "prerequisito": "Lâminas do Mato, 6º nível",
          "nivelMinimo": 6,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [
            "laminas-do-mato"
          ],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "golpe-de-emboscada",
          "nome": "Golpe de Emboscada",
          "grupo": "Linha da Lâmina",
          "descricao": "Quando ataca a sua presa corpo a corpo, você gasta 1 PM para empurrá-la 1,5 m depois do golpe, se ela falhar em um teste de Fortitude (CD = 10 + metade do nível + Destreza).",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 1,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "especialista-em-terreno",
          "nome": "Especialista em Terreno",
          "grupo": "Linha da Mata",
          "descricao": "Escolha um tipo de terreno: floresta, montanha, deserto, pântano, gelo, subterrâneo, urbano ou planície. Enquanto estiver nesse terreno, você recebe +2 em Furtividade, Sobrevivência e Iniciativa. Você pode escolher este poder várias vezes, cada uma para um terreno diferente.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": true
        },
        {
          "id": "mestre-do-terreno",
          "nome": "Mestre do Terreno",
          "grupo": "Linha da Mata",
          "descricao": "O bônus do Especialista em Terreno passa a +4 em um dos seus terrenos, e aliados em alcance curto recebem +2 em Furtividade nele.",
          "prerequisito": "Especialista em Terreno, 10º nível",
          "nivelMinimo": 10,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [
            "especialista-em-terreno"
          ],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "rastreador",
          "nome": "Rastreador",
          "grupo": "Linha da Mata",
          "descricao": "Você recebe +2 em Sobrevivência e Investigação e consegue rastrear criaturas mesmo depois de dias.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "curandeiro-de-campo",
          "nome": "Curandeiro de Campo",
          "grupo": "Linha da Mata",
          "descricao": "Você usa Sabedoria no lugar de Inteligência ou Carisma em testes de Cura e, como uma ação padrão, pode gastar 2 PM para curar 1d6 + Sabedoria PV de uma criatura adjacente.",
          "prerequisito": "Sabedoria 1",
          "nivelMinimo": null,
          "custoPM": 2,
          "acao": "padrao",
          "atributoMinimo": {
            "SAB": 1
          },
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "sentidos-agucados",
          "nome": "Sentidos Aguçados",
          "grupo": "Linha da Mata",
          "descricao": "Você recebe +2 em Audição, Olfato e Visão.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "passos-leves",
          "nome": "Passos Leves",
          "grupo": "Linha da Mata",
          "descricao": "Você se move até o seu deslocamento sem sofrer penalidade em Furtividade.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "vinculo-veloz",
          "nome": "Vínculo Veloz",
          "grupo": "Linha do Vínculo",
          "descricao": "O deslocamento do seu animal aumenta em 3 m.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "vinculo-feroz",
          "nome": "Vínculo Feroz",
          "grupo": "Linha do Vínculo",
          "descricao": "O dano do ataque do seu animal aumenta em 1d6.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "vinculo-resistente",
          "nome": "Vínculo Resistente",
          "grupo": "Linha do Vínculo",
          "descricao": "O seu animal recebe +10 PV e RD 2.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "caca-em-dupla",
          "nome": "Caça em Dupla",
          "grupo": "Linha do Vínculo",
          "descricao": "Quando você e o seu animal atacam o mesmo alvo no mesmo turno, o segundo ataque conta como contra um alvo flanqueado.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "montaria",
          "nome": "Montaria",
          "grupo": "Linha do Vínculo",
          "descricao": "Se o seu vínculo for um lobo, uma pantera ou um urso negro, você pode montá-lo. Você recebe +2 em Cavalgar enquanto o montar.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "aumento-de-atributo",
          "nome": "Aumento de Atributo",
          "grupo": "Poderes comuns",
          "descricao": "Você recebe +1 em um atributo. Você pode escolher este poder várias vezes, mas apenas uma vez por patamar para um mesmo atributo.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": true
        },
        {
          "id": "pericia-especializada",
          "nome": "Perícia Especializada",
          "grupo": "Poderes comuns",
          "descricao": "Escolha uma perícia em que você seja treinado e ainda não seja especialista. Você se torna especialista nela (bônus de treino +4). Você pode escolher este poder quantas vezes quiser, cada vez para uma perícia diferente.",
          "prerequisito": "10º nível",
          "nivelMinimo": 10,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": true
        }
      ]
    },
    {
      "id": "monge",
      "nome": "Monge",
      "papel": "Combatente Marcial",
      "pv": {
        "inicial": 18,
        "porNivel": 4,
        "atributo": "CON"
      },
      "pm": {
        "inicial": 4,
        "porNivel": 4,
        "atributoSoNoPrimeiroNivel": true,
        "texto": "4 + Sabedoria no 1º nível; +4 por nível seguinte",
        "atributo": "SAB"
      },
      "atributoChave": "Sabedoria",
      "pericias": {
        "obrigatorias": "Acrobacia e Fortitude",
        "escolha": 4,
        "lista": [
          "Atletismo",
          "Audição",
          "Concentração",
          "Cura",
          "Furtividade",
          "Iniciativa",
          "Intuição",
          "Luta",
          "Reflexos",
          "Religião",
          "Visão",
          "Vontade"
        ]
      },
      "proficiencias": "Nenhuma arma (o Monge luta apenas desarmado). Túnicas. Nunca usa armaduras nem escudos",
      "intro": [
        "O monge não carrega armas porque o corpo dele já é a arma. Anos de disciplina, respiração e silêncio fizeram dos punhos, dos pés e da mente uma só ferramenta, e é a mente que decide o golpe: quem controla a si mesmo controla a luta.",
        "Nem todos os monges chegam à mesma conclusão. Uns buscam a paz que cura e desarma, outros aprendem a ser a sombra que ninguém percebe, e há os que alcançam além do corpo e fazem do espírito um segundo par de braços. O caminho que cada um escolhe diz mais sobre ele do que qualquer voto."
      ],
      "progressao": [
        {
          "nivel": 1,
          "habilidades": [
            "Punhos Disciplinados"
          ],
          "poder": false
        },
        {
          "nivel": 2,
          "habilidades": [
            "Passo Ligeiro"
          ],
          "poder": true
        },
        {
          "nivel": 3,
          "habilidades": [
            "Rajada de Golpes",
            "Defesa Interior"
          ],
          "poder": true
        },
        {
          "nivel": 4,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 5,
          "habilidades": [
            "Caminho do Monge"
          ],
          "poder": true
        },
        {
          "nivel": 6,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 7,
          "habilidades": [
            "Desviar Golpe"
          ],
          "poder": true
        },
        {
          "nivel": 8,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 9,
          "habilidades": [
            "Punhos Disciplinados (1d10)"
          ],
          "poder": true
        },
        {
          "nivel": 10,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 11,
          "habilidades": [
            "Caminho Aprofundado"
          ],
          "poder": true
        },
        {
          "nivel": 12,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 13,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 14,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 15,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 16,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 17,
          "habilidades": [
            "Caminho Supremo",
            "Punhos Disciplinados (1d12)"
          ],
          "poder": true
        },
        {
          "nivel": 18,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 19,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 20,
          "habilidades": [
            "Punhos Perfeitos"
          ],
          "poder": true
        }
      ],
      "habilidades": [
        {
          "id": "punhos-disciplinados",
          "nome": "Punhos Disciplinados",
          "nivel": 1,
          "descricao": "Seus ataques desarmados causam 1d8 de dano de Impacto, com crítico 20/x2, e contam como armas Leves e Ágeis (você pode usar Destreza no lugar de Força nos testes de ataque e de Luta com eles). O dano aumenta para 1d10 no 9º nível e para 1d12 no 17º nível.",
          "custoPM": null,
          "acao": "passivo",
          "subs": []
        },
        {
          "id": "restricao-de-equipamento",
          "nome": "Restrição de Equipamento",
          "nivel": null,
          "descricao": "O Monge não usa armas: ele só ataca desarmado (ou com os Braços Astrais). Ele também não usa armaduras nem escudos; só veste vestimentas comuns e túnicas. Vestimentas e túnicas não contam como armadura (regra geral das túnicas).",
          "custoPM": null,
          "acao": "passivo",
          "subs": []
        },
        {
          "id": "passo-ligeiro",
          "nome": "Passo Ligeiro",
          "nivel": 2,
          "descricao": "Enquanto não estiver usando armadura, o seu deslocamento aumenta em 3 m.",
          "custoPM": null,
          "acao": "passivo",
          "subs": []
        },
        {
          "id": "rajada-de-golpes",
          "nome": "Rajada de Golpes",
          "nivel": 3,
          "descricao": "Gaste 1 PM ao Agredir desarmado. Você faz um ataque desarmado adicional. O ataque adicional não soma o modificador de atributo no dano.",
          "custoPM": 1,
          "acao": "passivo",
          "subs": []
        },
        {
          "id": "defesa-interior",
          "nome": "Defesa Interior",
          "nivel": 3,
          "descricao": "Enquanto não estiver usando armadura nem escudo, você soma a sua Sabedoria na Defesa. Túnicas não contam como armadura, então o bônus de uma túnica soma com este.",
          "custoPM": null,
          "acao": "passivo",
          "subs": []
        },
        {
          "id": "caminho-do-monge",
          "nome": "Caminho do Monge",
          "nivel": 5,
          "descricao": "Você escolhe um caminho, e essa escolha é permanente. Cada caminho concede uma habilidade agora, outra no 11º nível (Caminho Aprofundado) e outra no 17º (Caminho Supremo), além de uma lista de poderes própria.",
          "custoPM": null,
          "acao": "passivo",
          "subs": [
            {
              "nome": "Caminho da Meditação",
              "descricao": "<em>Palma Curativa:</em> como uma ação padrão, você gasta 2 PM e toca uma criatura, que recupera 1d8 + a sua Sabedoria PV. A cura aumenta em 1d8 no 9º, no 13º e no 17º nível."
            },
            {
              "nome": "Caminho das Sombras",
              "descricao": "<em>Golpe Sombrio:</em> uma vez por rodada, ao acertar um ataque desarmado contra um alvo desprevenido ou flanqueado, você causa 1d6 de dano de Trevas adicional."
            },
            {
              "nome": "Caminho Astral",
              "descricao": "<em>Braços Astrais:</em> como uma ação de movimento, você gasta 2 PM e manifesta braços espirituais até o fim da cena (ou até você dispensá-los, como ação livre). Enquanto estiverem ativos, seus ataques desarmados têm alcance de 3 m, causam dano de Essência no lugar de Impacto e usam a sua Sabedoria no lugar de Destreza ou Força nos testes de ataque e no dano."
            }
          ]
        },
        {
          "id": "desviar-golpe",
          "nome": "Desviar Golpe",
          "nivel": 7,
          "descricao": "Quando sofre dano de um ataque, você pode gastar 1 PM e a sua reação para reduzir esse dano em 5 + metade do seu nível + a sua Sabedoria.",
          "custoPM": 1,
          "acao": "reacao",
          "subs": []
        },
        {
          "id": "caminho-aprofundado",
          "nome": "Caminho Aprofundado",
          "nivel": 11,
          "descricao": "Cada caminho recebe um novo aprimoramento.",
          "custoPM": null,
          "acao": "passivo",
          "subs": [
            {
              "nome": "Caminho da Meditação",
              "descricao": "<em>Manobra Fluida:</em> ao acertar um ataque desarmado, você pode gastar 1 PM para fazer uma manobra (Agarrar, Derrubar, Desarmar ou Empurrar) contra o alvo como parte do mesmo ataque, usando a Sabedoria no lugar de Destreza ou Força no teste."
            },
            {
              "nome": "Caminho das Sombras",
              "descricao": "<em>Passo Sombrio:</em> como uma ação de movimento, você gasta 2 PM e se desloca até 9 m para um espaço livre que possa ver. Até o fim do turno, o seu próximo ataque é feito contra o alvo como se ele estivesse desprevenido. O dano do Golpe Sombrio aumenta para 2d6."
            },
            {
              "nome": "Caminho Astral",
              "descricao": "<em>Visão Astral:</em> enquanto os Braços Astrais estiverem ativos, você recebe +5 em Visão e Audição e não pode ser Surpreendido."
            }
          ]
        },
        {
          "id": "caminho-supremo",
          "nome": "Caminho Supremo",
          "nivel": 17,
          "descricao": "Cada caminho recebe o aprimoramento final.",
          "custoPM": null,
          "acao": "passivo",
          "subs": [
            {
              "nome": "Caminho da Meditação",
              "descricao": "<em>Aura de Serenidade:</em> enquanto você estiver consciente, aliados em alcance curto recebem +2 em testes de resistência contra condições mentais."
            },
            {
              "nome": "Caminho das Sombras",
              "descricao": "<em>Véu das Sombras:</em> como uma ação padrão, você gasta 3 PM. Até o início do seu próximo turno, você recebe camuflagem total. O dano do Golpe Sombrio aumenta para 3d6."
            },
            {
              "nome": "Caminho Astral",
              "descricao": "<em>Forma Astral:</em> enquanto os Braços Astrais estiverem ativos, você recebe RD 3 e a Rajada de Golpes não custa PM."
            }
          ]
        },
        {
          "id": "punhos-perfeitos",
          "nome": "Punhos Perfeitos",
          "nivel": 20,
          "descricao": "A margem de ameaça dos seus ataques desarmados aumenta em 1 (19–20) e a Rajada de Golpes não custa PM para você.",
          "custoPM": null,
          "acao": "passivo",
          "subs": []
        }
      ],
      "grupos": [
        "Poderes gerais",
        "Poderes do Caminho da Meditação",
        "Poderes do Caminho das Sombras",
        "Poderes do Caminho Astral",
        "Poderes comuns"
      ],
      "poderes": [
        {
          "id": "golpe-atordoante",
          "nome": "Golpe Atordoante",
          "grupo": "Poderes gerais",
          "descricao": "Gaste 2 PM ao acertar um ataque desarmado. O alvo faz um teste de Fortitude (CD = 10 + metade do nível + Sabedoria) ou fica Pasmo até o início do seu próximo turno.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 2,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "chute-giratorio",
          "nome": "Chute Giratório",
          "grupo": "Poderes gerais",
          "descricao": "Como uma ação padrão, você gasta 2 PM e faz um ataque desarmado contra cada inimigo adjacente.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 2,
          "acao": "padrao",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "salto-prodigioso",
          "nome": "Salto Prodigioso",
          "grupo": "Poderes gerais",
          "descricao": "Você recebe +2 em Acrobacia e dobra a distância dos seus saltos.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "mente-serena",
          "nome": "Mente Serena",
          "grupo": "Poderes gerais",
          "descricao": "Você recebe +2 em Vontade e em Concentração.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "reflexos-de-monge",
          "nome": "Reflexos de Monge",
          "grupo": "Poderes gerais",
          "descricao": "Você recebe +2 em Reflexos e Iniciativa.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "postura-defensiva",
          "nome": "Postura Defensiva",
          "grupo": "Poderes gerais",
          "descricao": "Como uma ação de movimento, você gasta 1 PM. Até o início do seu próximo turno, você recebe +2 na Defesa.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 1,
          "acao": "movimento",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "queda-suave",
          "nome": "Queda Suave",
          "grupo": "Poderes gerais",
          "descricao": "Você reduz à metade o dano de queda e não fica Caído ao cair.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "punho-de-ferro",
          "nome": "Punho de Ferro",
          "grupo": "Poderes gerais",
          "descricao": "Seus ataques desarmados causam +2 de dano.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "corpo-de-ferro",
          "nome": "Corpo de Ferro",
          "grupo": "Poderes gerais",
          "descricao": "Enquanto não estiver usando armadura, você recebe RD 2.",
          "prerequisito": "6º nível",
          "nivelMinimo": 6,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "respiracao-controlada",
          "nome": "Respiração Controlada",
          "grupo": "Poderes gerais",
          "descricao": "Como uma ação de movimento, você gasta 1 PM e remove de si uma das condições Abalado, Enjoado ou Fatigado.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 1,
          "acao": "movimento",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "passo-sobre-as-aguas",
          "nome": "Passo sobre as Águas",
          "grupo": "Poderes gerais",
          "descricao": "Você pode andar sobre superfícies líquidas até o fim do seu turno.",
          "prerequisito": "8º nível",
          "nivelMinimo": 8,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "resposta-veloz",
          "nome": "Resposta Veloz",
          "grupo": "Poderes gerais",
          "descricao": "Quando um inimigo erra um ataque corpo a corpo contra você, você pode gastar 1 PM e a sua reação para fazer um ataque desarmado contra ele.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 1,
          "acao": "reacao",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "toque-restaurador",
          "nome": "Toque Restaurador",
          "grupo": "Poderes do Caminho da Meditação",
          "descricao": "Como uma ação padrão, você gasta 2 PM e remove de uma criatura adjacente uma das condições Envenenado, Doente ou Sangrando.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 2,
          "acao": "padrao",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": "Caminho da Meditação",
          "repetivel": false
        },
        {
          "id": "palma-desarmante",
          "nome": "Palma Desarmante",
          "grupo": "Poderes do Caminho da Meditação",
          "descricao": "Você recebe +5 em testes de ataque da manobra Desarmar.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": "Caminho da Meditação",
          "repetivel": false
        },
        {
          "id": "golpe-de-desequilibrio",
          "nome": "Golpe de Desequilíbrio",
          "grupo": "Poderes do Caminho da Meditação",
          "descricao": "Gaste 1 PM ao acertar um ataque desarmado. O alvo faz um teste de Reflexos (CD = 10 + metade do nível + Sabedoria) ou fica Caído.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 1,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": "Caminho da Meditação",
          "repetivel": false
        },
        {
          "id": "respiracao-compartilhada",
          "nome": "Respiração Compartilhada",
          "grupo": "Poderes do Caminho da Meditação",
          "descricao": "Você pode usar a Respiração Controlada em um aliado adjacente.",
          "prerequisito": "Respiração Controlada",
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [
            "respiracao-controlada"
          ],
          "requerGrupo": "Caminho da Meditação",
          "repetivel": false
        },
        {
          "id": "pacificar",
          "nome": "Pacificar",
          "grupo": "Poderes do Caminho da Meditação",
          "descricao": "Como uma ação padrão, você gasta 3 PM. Uma criatura em alcance curto faz um teste de Vontade (CD = 10 + metade do nível + Sabedoria) ou fica Frustrada até o fim da cena.",
          "prerequisito": "8º nível",
          "nivelMinimo": 8,
          "custoPM": 3,
          "acao": "padrao",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": "Caminho da Meditação",
          "repetivel": false
        },
        {
          "id": "palma-reparadora",
          "nome": "Palma Reparadora",
          "grupo": "Poderes do Caminho da Meditação",
          "descricao": "A Palma Curativa cura um dado adicional de 1d8.",
          "prerequisito": "10º nível",
          "nivelMinimo": 10,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": "Caminho da Meditação",
          "repetivel": false
        },
        {
          "id": "passo-furtivo",
          "nome": "Passo Furtivo",
          "grupo": "Poderes do Caminho das Sombras",
          "descricao": "Você recebe +5 em Furtividade e se move até o seu deslocamento sem sofrer penalidade nesse teste.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": "Caminho das Sombras",
          "repetivel": false
        },
        {
          "id": "estocada-oculta",
          "nome": "Estocada Oculta",
          "grupo": "Poderes do Caminho das Sombras",
          "descricao": "Você recebe +2 nos testes de ataque desarmado contra alvos desprevenidos.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": "Caminho das Sombras",
          "repetivel": false
        },
        {
          "id": "fuga-sombria",
          "nome": "Fuga Sombria",
          "grupo": "Poderes do Caminho das Sombras",
          "descricao": "Quando é alvo de um ataque, você pode gastar 2 PM e a sua reação para se deslocar 3 m. O ataque erra, pois o alvo não está mais lá.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 2,
          "acao": "reacao",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": "Caminho das Sombras",
          "repetivel": false
        },
        {
          "id": "punho-sombrio",
          "nome": "Punho Sombrio",
          "grupo": "Poderes do Caminho das Sombras",
          "descricao": "Seus ataques desarmados causam dano de Trevas no lugar de Impacto.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": "Caminho das Sombras",
          "repetivel": false
        },
        {
          "id": "golpe-letal",
          "nome": "Golpe Letal",
          "grupo": "Poderes do Caminho das Sombras",
          "descricao": "A margem de ameaça dos seus ataques desarmados contra alvos desprevenidos aumenta em 1.",
          "prerequisito": "8º nível",
          "nivelMinimo": 8,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": "Caminho das Sombras",
          "repetivel": false
        },
        {
          "id": "atacar-nas-sombras",
          "nome": "Atacar nas Sombras",
          "grupo": "Poderes do Caminho das Sombras",
          "descricao": "Quando você ataca estando em um local de sombra (penumbra ou escuridão), cada criatura que poderia perceber você faz um teste de Visão ou Audição (CD = 10 + metade do nível + Sabedoria). Quem falhar não descobre a sua posição.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": "Caminho das Sombras",
          "repetivel": false
        },
        {
          "id": "bracos-longos",
          "nome": "Braços Longos",
          "grupo": "Poderes do Caminho Astral",
          "descricao": "O alcance dos Braços Astrais aumenta para 4,5 m.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": "Caminho Astral",
          "repetivel": false
        },
        {
          "id": "escudo-astral",
          "nome": "Escudo Astral",
          "grupo": "Poderes do Caminho Astral",
          "descricao": "Quando é alvo de um ataque, você pode gastar 1 PM e a sua reação para receber +3 na Defesa contra esse ataque. Só pode ser usado com os Braços Astrais ativos.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 1,
          "acao": "reacao",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": "Caminho Astral",
          "repetivel": false
        },
        {
          "id": "golpe-espiritual",
          "nome": "Golpe Espiritual",
          "grupo": "Poderes do Caminho Astral",
          "descricao": "Gaste 2 PM ao atacar com os Braços Astrais ativos. O ataque ignora 3 pontos da RD do alvo.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 2,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": "Caminho Astral",
          "repetivel": false
        },
        {
          "id": "agarrar-astral",
          "nome": "Agarrar Astral",
          "grupo": "Poderes do Caminho Astral",
          "descricao": "Com os Braços Astrais ativos, você pode fazer a manobra Agarrar ou Empurrar contra um alvo até o alcance deles, usando a sua Sabedoria.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": "Caminho Astral",
          "repetivel": false
        },
        {
          "id": "rajada-astral",
          "nome": "Rajada Astral",
          "grupo": "Poderes do Caminho Astral",
          "descricao": "Com os Braços Astrais ativos, a Rajada de Golpes concede dois ataques adicionais em vez de um e custa 2 PM.",
          "prerequisito": "10º nível",
          "nivelMinimo": 10,
          "custoPM": 2,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": "Caminho Astral",
          "repetivel": false
        },
        {
          "id": "aumento-de-atributo",
          "nome": "Aumento de Atributo",
          "grupo": "Poderes comuns",
          "descricao": "Você recebe +1 em um atributo. Você pode escolher este poder várias vezes, mas apenas uma vez por patamar para um mesmo atributo.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": true
        },
        {
          "id": "pericia-especializada",
          "nome": "Perícia Especializada",
          "grupo": "Poderes comuns",
          "descricao": "Escolha uma perícia em que você seja treinado e ainda não seja especialista. Você se torna especialista nela (bônus de treino +4). Você pode escolher este poder quantas vezes quiser, cada vez para uma perícia diferente.",
          "prerequisito": "10º nível",
          "nivelMinimo": 10,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": true
        }
      ]
    },
    {
      "id": "pistoleiro",
      "nome": "Pistoleiro",
      "papel": "Combate à Distância",
      "pv": {
        "inicial": 16,
        "porNivel": 4,
        "atributo": "CON"
      },
      "pm": {
        "inicial": 4,
        "porNivel": 4,
        "atributoSoNoPrimeiroNivel": false,
        "texto": "4 por nível",
        "atributo": null
      },
      "atributoChave": "Destreza",
      "pericias": {
        "obrigatorias": "Pontaria e Reflexos",
        "escolha": 4,
        "lista": [
          "Acrobacia",
          "Atletismo",
          "Audição",
          "Barganha",
          "Enganação",
          "Fortitude",
          "Iniciativa",
          "Intimidação",
          "Intuição",
          "Investigação",
          "Luta",
          "Prestidigitação",
          "Sobrevivência",
          "Visão",
          "Vontade"
        ]
      },
      "proficiencias": "Armas simples, armas de fogo, armaduras leves",
      "intro": [
        "Combate à Distância",
        "A pólvora trocou o duelo de espadas por algo mais honesto: quem atira primeiro e melhor volta para casa. O pistoleiro não confia em encantos nem em ancestrais. Confia na mão firme, no cano limpo e no segundo exato em que o dedo aperta o gatilho.",
        "Há duelistas que vivem de honra, caçadores de recompensa que vivem de contratos, contrabandistas, soldados de fronteira e artilheiros sem exército. O que os une é o respeito pela arma, que é cara, barulhenta e não perdoa quem esquece de recarregá-la."
      ],
      "progressao": [
        {
          "nivel": 1,
          "habilidades": [
            "Saque Rápido",
            "Tiro Carregado (1 PM)"
          ],
          "poder": false
        },
        {
          "nivel": 2,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 3,
          "habilidades": [
            "Atirador de Combate"
          ],
          "poder": true
        },
        {
          "nivel": 4,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 5,
          "habilidades": [
            "Tiro Carregado (2 PM)"
          ],
          "poder": true
        },
        {
          "nivel": 6,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 7,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 8,
          "habilidades": [
            "Disparo em Movimento"
          ],
          "poder": true
        },
        {
          "nivel": 9,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 10,
          "habilidades": [
            "Tiro Carregado (3 PM)"
          ],
          "poder": true
        },
        {
          "nivel": 11,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 12,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 13,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 14,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 15,
          "habilidades": [
            "Tiro Carregado (4 PM)"
          ],
          "poder": true
        },
        {
          "nivel": 16,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 17,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 18,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 19,
          "habilidades": [],
          "poder": true
        },
        {
          "nivel": 20,
          "habilidades": [
            "Tiro Carregado (5 PM)",
            "Tiro Lendário"
          ],
          "poder": true
        }
      ],
      "habilidades": [
        {
          "id": "saque-rapido",
          "nome": "Saque Rápido",
          "nivel": 1,
          "descricao": "Você saca uma arma de fogo ou uma Bala como ação livre. Uma vez por turno, você pode gastar 1 PM para recarregar uma arma de fogo como ação livre, em vez de ação de movimento. Se estiver empunhando duas armas de fogo, o custo é de 1 PM por arma recarregada.",
          "custoPM": 1,
          "acao": "movimento",
          "subs": []
        },
        {
          "id": "tiro-carregado",
          "nome": "Tiro Carregado",
          "nivel": 1,
          "descricao": "Ao fazer um ataque com arma de fogo, você pode gastar PM para carregar o tiro com mais pólvora. Cada PM gasto causa +1d6 de dano de Perfuração. Você decide antes do teste de ataque, e os PM são gastos mesmo que o ataque erre. O máximo de PM por ataque é 1 no 1º nível, 2 no 5º, 3 no 10º, 4 no 15º e 5 no 20º.",
          "custoPM": null,
          "acao": "passivo",
          "subs": []
        },
        {
          "id": "atirador-de-combate",
          "nome": "Atirador de Combate",
          "nivel": 3,
          "descricao": "Você não sofre a penalidade de –5 em ataques à distância contra inimigos adjacentes e recebe +2 nos testes de ataque com armas de fogo contra alvos em alcance curto.",
          "custoPM": null,
          "acao": "passivo",
          "subs": []
        },
        {
          "id": "disparo-em-movimento",
          "nome": "Disparo em Movimento",
          "nivel": 8,
          "descricao": "Uma vez por rodada, depois de atacar com arma de fogo, você pode gastar 1 PM para se deslocar até 3 m como ação livre.",
          "custoPM": 1,
          "acao": "livre",
          "subs": []
        },
        {
          "id": "tiro-lendario",
          "nome": "Tiro Lendário",
          "nivel": 20,
          "descricao": "Uma vez por cena, ao fazer um ataque com arma de fogo, você pode declarar um Tiro Lendário: o ataque acerta automaticamente, mesmo contra a Defesa, e conta como um acerto crítico.",
          "custoPM": null,
          "acao": "passivo",
          "subs": []
        }
      ],
      "grupos": [
        "Linha do Tiro",
        "Linha das Duas Pistolas",
        "Linha do Mosquete",
        "Linha dos Truques",
        "Linha do Pistoleiro",
        "Poderes comuns"
      ],
      "poderes": [
        {
          "id": "tiro-parado",
          "nome": "Tiro Parado",
          "grupo": "Linha do Tiro",
          "descricao": "Se você não se moveu neste turno, recebe +2 nos testes de ataque com armas de fogo.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "bala-perfurante",
          "nome": "Bala Perfurante",
          "grupo": "Linha do Tiro",
          "descricao": "Gaste 2 PM ao atacar com arma de fogo. O ataque ignora 3 pontos de RD do alvo.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 2,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "tiro-intimidador",
          "nome": "Tiro Intimidador",
          "grupo": "Linha do Tiro",
          "descricao": "Gaste 1 PM ao acertar um ataque com arma de fogo. O alvo faz um teste de Vontade ou fica Abalado até o fim do seu próximo turno.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 1,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "tiro-nas-pernas",
          "nome": "Tiro nas Pernas",
          "grupo": "Linha do Tiro",
          "descricao": "Gaste 2 PM ao acertar um ataque com arma de fogo. O alvo faz um teste de Fortitude ou fica Lento até o início do seu próximo turno.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 2,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "tiro-desarmante",
          "nome": "Tiro Desarmante",
          "grupo": "Linha do Tiro",
          "descricao": "Gaste 1 PM ao atacar com arma de fogo. Seu ataque realiza a manobra Desarmar, usando Pontaria no lugar do ataque corpo a corpo (ver Manobras, na seção 1).",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 1,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "ricochete",
          "nome": "Ricochete",
          "grupo": "Linha do Tiro",
          "descricao": "Gaste 2 PM ao acertar um ataque com arma de fogo. Você faz um ataque adicional contra outro inimigo a até 3 m do alvo. O ataque adicional não recebe o Tiro Carregado e não soma o modificador de atributo no dano.",
          "prerequisito": "6º nível",
          "nivelMinimo": 6,
          "custoPM": 2,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "mira-demorada",
          "nome": "Mira Demorada",
          "grupo": "Linha do Tiro",
          "descricao": "Como uma ação de movimento, você gasta 1 PM. Seu próximo ataque com arma de fogo neste turno recebe +2 no teste de ataque e a margem de ameaça dele aumenta em 1.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 1,
          "acao": "movimento",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "disparo-letal",
          "nome": "Disparo Letal",
          "grupo": "Linha do Tiro",
          "descricao": "O multiplicador de crítico das suas armas de fogo aumenta em 1.",
          "prerequisito": "12º nível",
          "nivelMinimo": 12,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "duas-pistolas",
          "nome": "Duas Pistolas",
          "grupo": "Linha das Duas Pistolas",
          "descricao": "Quando usa Agredir empunhando uma pistola em cada mão (de cano curto ou não), você faz um ataque com cada uma, sem sofrer a penalidade geral de combate com duas armas. O segundo ataque não soma o modificador de atributo no dano. Cada arma é recarregada separadamente.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "pulso-firme",
          "nome": "Pulso Firme",
          "grupo": "Linha das Duas Pistolas",
          "descricao": "O segundo ataque da Duas Pistolas soma o modificador de atributo no dano.",
          "prerequisito": "Duas Pistolas, 6º nível",
          "nivelMinimo": 6,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [
            "duas-pistolas"
          ],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "recarga-cruzada",
          "nome": "Recarga Cruzada",
          "grupo": "Linha das Duas Pistolas",
          "descricao": "Quando recarrega uma arma de fogo, você recarrega também a outra arma que estiver empunhando, com a mesma ação.",
          "prerequisito": "Duas Pistolas",
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [
            "duas-pistolas"
          ],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "mestre-da-recarga",
          "nome": "Mestre da Recarga",
          "grupo": "Linha das Duas Pistolas",
          "descricao": "Você pode gastar 1 PM para recarregar as suas duas pistolas como ação livre, quantas vezes quiser no seu turno (cada disparo ainda consome uma Bala). Isso substitui o limite de uma vez por turno do Saque Rápido.",
          "prerequisito": "Duas Pistolas, 11º nível",
          "nivelMinimo": 11,
          "custoPM": 1,
          "acao": "livre",
          "atributoMinimo": null,
          "requerPoderes": [
            "duas-pistolas"
          ],
          "requerGrupo": null,
          "repetivel": true
        },
        {
          "id": "cano-longo",
          "nome": "Cano Longo",
          "grupo": "Linha do Mosquete",
          "descricao": "O alcance das suas armas de fogo dobra.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "descarga-dupla",
          "nome": "Descarga Dupla",
          "grupo": "Linha do Mosquete",
          "descricao": "Gaste 2 PM ao atacar com uma arma de Cano Duplo. Você dispara os dois canos de uma vez, gastando duas Balas, e rola o dano da arma duas vezes, somando os resultados.",
          "prerequisito": "6º nível",
          "nivelMinimo": 6,
          "custoPM": 2,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "coronhada",
          "nome": "Coronhada",
          "grupo": "Linha do Mosquete",
          "descricao": "Você pode usar uma arma de fogo de Duas Mãos como arma corpo a corpo (1d6 de dano de Impacto, crítico 20/x2), usando Luta ou Pontaria à sua escolha. Atacar assim não gasta a carga da arma.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "tiro-de-dispersao",
          "nome": "Tiro de Dispersão",
          "grupo": "Linha do Mosquete",
          "descricao": "Como uma ação padrão, você gasta 3 PM e dispara uma arma de fogo de Duas Mãos em um cone de 4,5 m. Faça um ataque contra cada criatura na área. Esse ataque não recebe o Tiro Carregado.",
          "prerequisito": "10º nível",
          "nivelMinimo": 10,
          "custoPM": 3,
          "acao": "padrao",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "calibre-pesado",
          "nome": "Calibre Pesado",
          "grupo": "Linha do Mosquete",
          "descricao": "Quando ataca com um mosquete, o máximo de PM que você pode gastar no Tiro Carregado aumenta em 2.",
          "prerequisito": "11º nível, usar mosquete",
          "nivelMinimo": 11,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "bala-incendiaria",
          "nome": "Bala Incendiária",
          "grupo": "Linha dos Truques",
          "descricao": "Gaste 2 PM ao atacar com arma de fogo. O ataque causa dano de Fogo no lugar de Perfuração e, se acertar, o alvo faz um teste de Reflexos ou fica Em Chamas.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 2,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "bala-ofuscante",
          "nome": "Bala Ofuscante",
          "grupo": "Linha dos Truques",
          "descricao": "Gaste 3 PM ao acertar um ataque com arma de fogo. O alvo faz um teste de Reflexos ou fica Cego até o início do seu próximo turno.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 3,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "bala-de-fumaca",
          "nome": "Bala de Fumaça",
          "grupo": "Linha dos Truques",
          "descricao": "Como uma ação padrão, você gasta 2 PM e dispara uma bala de fumaça em um ponto em alcance médio. Uma esfera de 3 m de raio concede camuflagem total (ver Camuflagem, na seção 1) até o início do seu próximo turno.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 2,
          "acao": "padrao",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "fogo-cruzado",
          "nome": "Fogo Cruzado",
          "grupo": "Linha dos Truques",
          "descricao": "Quando você acerta um ataque com arma de fogo contra um inimigo, o próximo aliado que atacar esse inimigo antes do início do seu próximo turno recebe +2 no teste de ataque.",
          "prerequisito": "8º nível",
          "nivelMinimo": 8,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "resposta-a-queima-roupa",
          "nome": "Resposta à Queima-Roupa",
          "grupo": "Linha dos Truques",
          "descricao": "Quando um inimigo adjacente ataca você, você pode gastar 2 PM e a sua reação para fazer um ataque com arma de fogo contra ele antes do ataque dele. Se acertar, o ataque do inimigo é feito com desvantagem.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 2,
          "acao": "reacao",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "sangue-frio",
          "nome": "Sangue Frio",
          "grupo": "Linha do Pistoleiro",
          "descricao": "Você recebe +2 em Iniciativa e Vontade.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "corpo-de-atirador",
          "nome": "Corpo de Atirador",
          "grupo": "Linha do Pistoleiro",
          "descricao": "Você recebe +2 em Acrobacia e Reflexos.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "faro-de-recompensas",
          "nome": "Faro de Recompensas",
          "grupo": "Linha do Pistoleiro",
          "descricao": "Você recebe +2 em Investigação e Intuição.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "treinamento-extra",
          "nome": "Treinamento Extra",
          "grupo": "Linha do Pistoleiro",
          "descricao": "Você se torna treinado em duas perícias à sua escolha.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "fabricar-balas",
          "nome": "Fabricar Balas",
          "grupo": "Linha do Pistoleiro",
          "descricao": "Você fabrica as suas próprias balas. Elas não custam dinheiro para você, e, ao fim de cada descanso, você tem até 40 Balas.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "primeiro-a-atirar",
          "nome": "Primeiro a Atirar",
          "grupo": "Linha do Pistoleiro",
          "descricao": "Quando rola Iniciativa, você pode gastar 1 PM para rolar com vantagem.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": 1,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "segundo-tiro",
          "nome": "Segundo Tiro",
          "grupo": "Linha do Pistoleiro",
          "descricao": "Uma vez por cena, quando erra um ataque com arma de fogo, você pode gastar 2 PM para repetir o ataque, ficando com o novo resultado.",
          "prerequisito": "8º nível",
          "nivelMinimo": 8,
          "custoPM": 2,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": false
        },
        {
          "id": "aumento-de-atributo",
          "nome": "Aumento de Atributo",
          "grupo": "Poderes comuns",
          "descricao": "Você recebe +1 em um atributo. Você pode escolher este poder várias vezes, mas apenas uma vez por patamar para um mesmo atributo.",
          "prerequisito": null,
          "nivelMinimo": null,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": true
        },
        {
          "id": "pericia-especializada",
          "nome": "Perícia Especializada",
          "grupo": "Poderes comuns",
          "descricao": "Escolha uma perícia em que você seja treinado e ainda não seja especialista. Você se torna especialista nela (bônus de treino +4). Você pode escolher este poder quantas vezes quiser, cada vez para uma perícia diferente.",
          "prerequisito": "10º nível",
          "nivelMinimo": 10,
          "custoPM": null,
          "acao": "passivo",
          "atributoMinimo": null,
          "requerPoderes": [],
          "requerGrupo": null,
          "repetivel": true
        }
      ]
    }
  ]
};
