// GERADO por tools/gerar-dados.mjs a partir de tools/dados/itens-comuns.json — não edite à mão.
export default {
  "versao": 1,
  "limiteVestimentas": 5,
  "itens": [
    {
      "id": "mapa-regional",
      "nome": "Mapa regional",
      "categoria": "viagem",
      "preco": 500,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "andarilho"
      ],
      "espacos": 0.5,
      "descricao": "Pergaminho com estradas, vilas, rios e marcos de uma região (escolhida pelo jogador, de onde ele cresceu ou viajou). <strong>Exploração:</strong> em caminhos mapeados da região, o Mestre não pede teste para se orientar. <strong>Roleplay:</strong> mostrá-lo a moradores ajuda a pedir direções e a descobrir pontos de interesse. Pode ser anotado com perigos e rotas.",
      "vestimenta": false,
      "bonus": [],
      "valeEnquantoPossui": false,
      "escolhaTexto": "região"
    },
    {
      "id": "kit-de-viagem-odre-e-panela",
      "nome": "Kit de viagem (odre e panela)",
      "categoria": "viagem",
      "preco": 300,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "andarilho"
      ],
      "espacos": 1,
      "descricao": "Odre de couro (2 litros) e panela de ferro com tampa e cabo dobrável. <strong>Descanso:</strong> permite uma refeição quente por descanso. <strong>Combate:</strong> como ação padrão, gastar 1 litro do odre apaga a condição Em Chamas em uma criatura adjacente (2 usos antes de reabastecer). <strong>Roleplay:</strong> cozinhar para o grupo ou para estranhos abre conversa.",
      "vestimenta": false,
      "bonus": [],
      "valeEnquantoPossui": false
    },
    {
      "id": "luneta",
      "nome": "Luneta",
      "categoria": "viagem",
      "preco": 4000,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "batedor"
      ],
      "espacos": 1,
      "descricao": "Tubo de latão com lentes que aproxima o que está longe. <strong>Bônus:</strong> +5 em Visão ao observar algo a distância com a luneta. <strong>Exploração:</strong> vê detalhes a até o dobro do alcance normal de visão (em luz e clima normais). <strong>Combate:</strong> como ação de movimento, observa um ponto distante e descobre número de criaturas, armamento e brasões. <strong>Roleplay:</strong> espionar à distância.",
      "vestimenta": false,
      "bonus": [
        {
          "pericia": "visao",
          "valor": 5,
          "condicao": "ao observar algo a distância com a luneta"
        }
      ],
      "valeEnquantoPossui": false
    },
    {
      "id": "capa-de-viagem",
      "nome": "Capa de viagem",
      "categoria": "viagem",
      "preco": 400,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "batedor"
      ],
      "espacos": 1,
      "descricao": "Capa grossa de lã encerada, com capuz. <strong>Clima:</strong> protege de chuva, vento e frio comum (sem penalidades por clima leve). <strong>Roleplay:</strong> o capuz esconde parte do rosto e dá ar de viajante anônimo.",
      "vestimenta": true,
      "bonus": [],
      "valeEnquantoPossui": false
    },
    {
      "id": "barraca-pequena",
      "nome": "Barraca pequena",
      "categoria": "viagem",
      "preco": 1200,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "eremita"
      ],
      "espacos": 2,
      "descricao": "Lona e estacas; cabem duas criaturas Médias, ou uma criatura Grande (como um Talokan). Leva 10 minutos para montar. <strong>Descanso:</strong> permite descansar ao relento sem sofrer o clima. <strong>Exploração:</strong> serve de abrigo improvisado e de ponto de encontro do grupo. <strong>Roleplay:</strong> marca o acampamento do personagem.",
      "vestimenta": false,
      "bonus": [],
      "valeEnquantoPossui": false
    },
    {
      "id": "trouxa-de-viagem",
      "nome": "Trouxa de viagem",
      "categoria": "viagem",
      "preco": 200,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "escravo",
        "refugiado"
      ],
      "espacos": 1,
      "descricao": "Saco de pano com alças: roupa de reposição, cobertor fino e ração para 1 dia. <strong>Descanso:</strong> o cobertor garante um descanso confortável em chão duro. <strong>Utilidade:</strong> carrega itens pequenos. <strong>Roleplay:</strong> é tudo que o personagem tem ao começar.",
      "vestimenta": false,
      "bonus": [],
      "valeEnquantoPossui": false
    },
    {
      "id": "corda-de-marinheiro-15-m",
      "nome": "Corda de marinheiro (15 m)",
      "categoria": "viagem",
      "preco": 500,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "marujo"
      ],
      "espacos": 1,
      "descricao": "Corda trançada de cânhamo, resistente à água salgada; aguenta o peso de duas pessoas. <strong>Uso:</strong> para prender a corda em um ponto alto (gancho, galho, ameia), o personagem faz um teste de Pontaria, com <strong>+3</strong> de bônus por usar a corda. Prendida, permite subir ou descer até 15 m. <strong>Combate:</strong> como ação de movimento, estica a corda entre dois pontos: criaturas que passem por ali correndo fazem Reflexos (CD 10) ou ficam Caídas. <strong>Utilidade:</strong> amarrar cargas, prisioneiros e pontes improvisadas.",
      "vestimenta": false,
      "bonus": [
        {
          "pericia": "pontaria",
          "valor": 3,
          "condicao": "no teste de Pontaria para prender a corda em um ponto alto"
        }
      ],
      "valeEnquantoPossui": false
    },
    {
      "id": "bussola",
      "nome": "Bússola",
      "categoria": "viagem",
      "preco": 2500,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "marujo"
      ],
      "espacos": 0.5,
      "descricao": "Agulha imantada em caixa de latão que sempre aponta o norte. <strong>Bônus:</strong> +2 em Sobrevivência ao se orientar em locais fechados (matas, cavernas, ruínas, labirintos). <strong>Exploração:</strong> impede de se perder em terra e mar aberto. Perde a função perto de magia forte e muito ferro (pista para o Mestre). <strong>Roleplay:</strong> navegadores e mercadores a respeitam.",
      "vestimenta": false,
      "bonus": [
        {
          "pericia": "sobrevivencia",
          "valor": 2,
          "condicao": "ao se orientar em locais fechados (matas, cavernas, ruínas, labirintos)"
        }
      ],
      "valeEnquantoPossui": false
    },
    {
      "id": "racao-de-campanha-7-dias",
      "nome": "Ração de campanha (7 dias)",
      "categoria": "viagem",
      "preco": 400,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "soldado"
      ],
      "espacos": 2,
      "descricao": "Pão seco, carne curada, frutas secas e sal, embrulhados em pano. <strong>Sobrevivência:</strong> alimenta uma pessoa por 7 dias e não estraga. <strong>Roleplay:</strong> repartir ração com um NPC faminto costuma render gratidão.",
      "vestimenta": false,
      "bonus": [],
      "valeEnquantoPossui": false
    },
    {
      "id": "manto-de-pele",
      "nome": "Manto de pele",
      "categoria": "viagem",
      "preco": 600,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "selvagem"
      ],
      "espacos": 1,
      "descricao": "Pele curtida de animal usada como capa. <strong>Clima:</strong> protege de frio intenso. <strong>Roleplay:</strong> povos de fora das cidades reconhecem o estilo; moradores urbanos estranham.",
      "vestimenta": true,
      "bonus": [],
      "valeEnquantoPossui": false
    },
    {
      "id": "enxada",
      "nome": "Enxada",
      "categoria": "viagem",
      "preco": 300,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "campones"
      ],
      "espacos": 2,
      "descricao": "Ferramenta agrícola de lâmina larga e cabo de madeira. *Não é arma.* <strong>Utilidade:</strong> cava um buraco de 1 m³ em 10 minutos. <strong>Combate:</strong> se usada como arma, conta como arma improvisada (ver Regras de combate com armas). <strong>Roleplay:</strong> denuncia um passado de trabalho no campo.",
      "vestimenta": false,
      "bonus": [],
      "valeEnquantoPossui": false
    },
    {
      "id": "sacola-de-graos-e-sementes",
      "nome": "Sacola de grãos e sementes",
      "categoria": "viagem",
      "preco": 100,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "campones"
      ],
      "espacos": 1,
      "descricao": "Saco de pano com cevada, trigo e sementes variadas. <strong>Sobrevivência:</strong> rende comida simples para 3 dias. <strong>Utilidade:</strong> atrai aves e animais pequenos e acalma montarias famintas. <strong>Roleplay:</strong> presente humilde para quem vive da terra.",
      "vestimenta": false,
      "bonus": [],
      "valeEnquantoPossui": false
    },
    {
      "id": "traje-colorido",
      "nome": "Traje colorido",
      "categoria": "traje",
      "preco": 600,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "circense"
      ],
      "espacos": 1,
      "descricao": "Roupa de cores vivas feita para ser vista de longe: calças bufantes, colete bordado e lenço. <strong>Bônus:</strong> +1 em Atuação ou em Enganação (o jogador escolhe ao pegar o item), enquanto o traje estiver vestido. <strong>Utilidade:</strong> chama atenção, útil para distrair guardas e plateias enquanto aliados agem (a critério do Mestre). <strong>Desvantagem:</strong> não serve para furtividade. <strong>Roleplay:</strong> identifica o personagem com circos, feiras e festas.",
      "vestimenta": true,
      "bonus": [
        {
          "pericia": null,
          "valor": 1,
          "condicao": null,
          "escolha": [
            "atuacao",
            "enganacao"
          ]
        }
      ],
      "valeEnquantoPossui": false
    },
    {
      "id": "traje-de-bobo-com-guizos",
      "nome": "Traje de bobo com guizos",
      "categoria": "traje",
      "preco": 800,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "bobo-da-corte"
      ],
      "espacos": 1,
      "descricao": "Roupa de duas cores, chapéu de pontas e guizos. <strong>Utilidade:</strong> como ação livre, o personagem agita os guizos para chamar atenção. <strong>Desvantagem:</strong> os guizos tilintam a cada passo (impedem andar em silêncio). <strong>Roleplay:</strong> na corte, quem veste o traje pode fazer piadas e debochar até de nobres sem ser punido, porque todos o reconhecem como bobo (a critério do Mestre).",
      "vestimenta": true,
      "bonus": [],
      "valeEnquantoPossui": false
    },
    {
      "id": "traje-elegante",
      "nome": "Traje elegante",
      "categoria": "traje",
      "preco": 3000,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "gigolo"
      ],
      "espacos": 1,
      "descricao": "Camisa de seda, colete e casaco bem cortados, com perfume discreto. <strong>Acesso:</strong> permite entrar em tavernas finas, festas e salões menores sem ser barrado. <strong>Roleplay:</strong> causa boa primeira impressão em ambientes sofisticados.",
      "vestimenta": true,
      "bonus": [],
      "valeEnquantoPossui": false
    },
    {
      "id": "traje-fino",
      "nome": "Traje fino",
      "categoria": "traje",
      "preco": 5000,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "herdeiro"
      ],
      "espacos": 1,
      "descricao": "Veludo, brocado e botões de prata: roupa de gente rica. <strong>Acesso:</strong> abre as portas de cortes e salões da nobreza. <strong>Roleplay:</strong> é lido como sinal de riqueza e linhagem, o que também atrai ladrões.",
      "vestimenta": true,
      "bonus": [],
      "valeEnquantoPossui": false
    },
    {
      "id": "traje-real",
      "nome": "Traje real",
      "categoria": "traje",
      "preco": 10000,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "realeza"
      ],
      "espacos": 1,
      "descricao": "Veste de gala bordada com o brasão da casa, em tecidos raros. <strong>Bônus:</strong> +1 em Diplomacia enquanto o traje estiver vestido. <strong>Acesso:</strong> guardas e funcionários hesitam em barrar quem o veste. <strong>Roleplay:</strong> identifica o portador como alguém de alto escalão, para o bem (honras) e para o mal (assassinos e sequestradores).",
      "vestimenta": true,
      "bonus": [
        {
          "pericia": "diplomacia",
          "valor": 1,
          "condicao": null
        }
      ],
      "valeEnquantoPossui": false
    },
    {
      "id": "traje-de-apresentacao",
      "nome": "Traje de apresentação",
      "categoria": "traje",
      "preco": 2000,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "musico"
      ],
      "espacos": 1,
      "descricao": "Roupa de palco para atuar, tocar ou dançar, de tecidos que balançam e cabem em movimento. <strong>Bônus:</strong> +2 em Atuação enquanto o traje estiver vestido e o personagem estiver realizando uma apresentação, qualquer que seja. <strong>Roleplay:</strong> o público reconhece o personagem como artista.",
      "vestimenta": true,
      "bonus": [
        {
          "pericia": "atuacao",
          "valor": 2,
          "condicao": "enquanto realiza uma apresentação"
        }
      ],
      "valeEnquantoPossui": false
    },
    {
      "id": "traje-de-cerimonia",
      "nome": "Traje de cerimônia",
      "categoria": "traje",
      "preco": 1500,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "religioso"
      ],
      "espacos": 1,
      "descricao": "Túnica ou hábito para ritos religiosos, nas cores da fé do personagem. <strong>Acesso:</strong> permite participar de cultos e entrar em áreas de clero. <strong>Roleplay:</strong> é reconhecido por devotos da mesma fé.",
      "vestimenta": true,
      "bonus": [],
      "valeEnquantoPossui": false
    },
    {
      "id": "uniforme-da-casa",
      "nome": "Uniforme da casa",
      "categoria": "traje",
      "preco": 500,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "servo"
      ],
      "espacos": 1,
      "descricao": "Roupa padronizada de criados de uma casa nobre, com o brasão da família. <strong>Acesso:</strong> permite circular em residências e festas como criado, sem ser questionado (trabalha junto com o poder Olhos Baixos). <strong>Roleplay:</strong> identifica a casa a que serviu.",
      "vestimenta": true,
      "bonus": [],
      "valeEnquantoPossui": false
    },
    {
      "id": "capa-escura",
      "nome": "Capa escura",
      "categoria": "traje",
      "preco": 500,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "fora-da-lei"
      ],
      "espacos": 1,
      "descricao": "Capa de tecido fosco, cor de carvão. <strong>Bônus:</strong> +1 em Furtividade à noite, enquanto a capa estiver vestida. <strong>Furtividade:</strong> à noite ou em penumbra, o Mestre também pode conceder camuflagem leve. <strong>Roleplay:</strong> esconde o brasão ou cor das roupas por baixo.",
      "vestimenta": true,
      "bonus": [
        {
          "pericia": "furtividade",
          "valor": 1,
          "condicao": "à noite"
        }
      ],
      "valeEnquantoPossui": false
    },
    {
      "id": "capuz-escuro",
      "nome": "Capuz escuro",
      "categoria": "traje",
      "preco": 300,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "matador-de-aluguel"
      ],
      "espacos": 0.5,
      "descricao": "Capuz de tecido fosco que esconde o rosto e os cabelos. <strong>Bônus:</strong> +1 em Intimidação enquanto o capuz estiver vestido. <strong>Identidade:</strong> esconde o rosto de quem o vê de frente. <strong>Desvantagem:</strong> não esconde o corpo nem dá camuflagem. <strong>Roleplay:</strong> o estilo é típico de assassinos e mercenários.",
      "vestimenta": true,
      "bonus": [
        {
          "pericia": "intimidacao",
          "valor": 1,
          "condicao": null
        }
      ],
      "valeEnquantoPossui": false
    },
    {
      "id": "estojo-de-disfarces",
      "nome": "Estojo de disfarces",
      "categoria": "ferramenta",
      "preco": 2000,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "matador-de-aluguel"
      ],
      "espacos": 1,
      "descricao": "Maquiagem, cola, barbas falsas, perucas e pinturas em um estojo de couro. Tem 10 usos. <strong>Uso:</strong> aplicar um disfarce leva 1 hora e gasta 1 uso. <strong>Bônus:</strong> +3 em Enganação para se passar pela identidade disfarçada. O disfarce dura até ser lavado ou tirado. <strong>Roleplay:</strong> permite assumir identidades falsas ao longo da aventura.",
      "vestimenta": false,
      "bonus": [
        {
          "pericia": "enganacao",
          "valor": 3,
          "condicao": "para se passar pela identidade disfarçada"
        }
      ],
      "valeEnquantoPossui": false,
      "usos": 10
    },
    {
      "id": "gazuas",
      "nome": "Gazuas",
      "categoria": "ferramenta",
      "preco": 2500,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "fora-da-lei"
      ],
      "espacos": 0.5,
      "descricao": "Conjunto de ganchos, tensores e limas finas. <strong>Penalidade sem elas:</strong> qualquer teste de Prestidigitação para abrir portas, fechaduras, trancas e similares sofre –5 sem as gazuas. <strong>Quebra:</strong> ao usar as gazuas e tirar 1 natural no teste, elas quebram. <strong>Roleplay:</strong> denunciam a vida do personagem à margem da lei.",
      "vestimenta": false,
      "bonus": [
        {
          "pericia": "prestidigitacao",
          "valor": -5,
          "condicao": "ao abrir portas, fechaduras ou trancas SEM gazuas (penalidade por não ter o item)",
          "penalidadeSemItem": true
        }
      ],
      "valeEnquantoPossui": false
    },
    {
      "id": "balanca-de-bolso",
      "nome": "Balança de bolso",
      "categoria": "ferramenta",
      "preco": 1000,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "membro-de-guilda"
      ],
      "espacos": 0.5,
      "descricao": "Balança de latão com pesos aferidos. <strong>Utilidade:</strong> mede metais e especiarias e confere a pureza de moedas, descobrindo falsificações. <strong>Roleplay:</strong> mostra que o personagem sabe o valor das coisas e confia em números.",
      "vestimenta": false,
      "bonus": [],
      "valeEnquantoPossui": false
    },
    {
      "id": "ferramentas-leves-de-oficio",
      "nome": "Ferramentas leves de ofício",
      "categoria": "ferramenta",
      "preco": 1500,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "membro-de-guilda"
      ],
      "espacos": 1,
      "descricao": "Pequeno conjunto de ferramentas de um ofício (martelo e pregos, agulhas e linhas, formões, cinzéis...), à escolha do jogador. <strong>Utilidade:</strong> pequenos reparos em itens, equipamento e fabricação de objetos simples. <strong>Roleplay:</strong> liga o personagem ao seu ofício e à guilda.",
      "vestimenta": false,
      "bonus": [],
      "valeEnquantoPossui": false,
      "escolhaTexto": "ofício"
    },
    {
      "id": "instrumento-musical",
      "nome": "Instrumento musical",
      "categoria": "ferramenta",
      "preco": 1500,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "musico"
      ],
      "espacos": 1,
      "descricao": "Alaúde, flauta, tambor, gaita ou outro, à escolha do jogador. <strong>Bônus:</strong> +1 em Atuação quando usado. Em festas e ambientes nobres, também dá +1 em Diplomacia, além do bônus de Atuação. <strong>Roleplay:</strong> ganhar a vida, animar festas e conquistar plateias.",
      "vestimenta": false,
      "bonus": [
        {
          "pericia": "atuacao",
          "valor": 1,
          "condicao": "quando o instrumento é usado"
        },
        {
          "pericia": "diplomacia",
          "valor": 1,
          "condicao": "quando usado em festas e ambientes nobres"
        }
      ],
      "valeEnquantoPossui": false,
      "escolhaTexto": "instrumento"
    },
    {
      "id": "bolas-de-malabarismo",
      "nome": "Bolas de malabarismo",
      "categoria": "ferramenta",
      "preco": 200,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "bobo-da-corte",
        "circense"
      ],
      "espacos": 0.5,
      "descricao": "Três bolas de couro recheadas de areia. <strong>Utilidade:</strong> exibições e passatempo; distraem crianças e plateias. <strong>Combate:</strong> arremessar as bolas para chamar atenção é uma ação de movimento e distrai uma criatura que não esteja em combate (a critério do Mestre).",
      "vestimenta": false,
      "bonus": [],
      "valeEnquantoPossui": false
    },
    {
      "id": "corda-fina-de-equilibrio",
      "nome": "Corda fina de equilíbrio",
      "categoria": "ferramenta",
      "preco": 500,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "circense"
      ],
      "espacos": 1,
      "descricao": "Corda estreita de 6 m, própria de acrobatas. <strong>Exploração:</strong> esticada entre dois pontos fixos, serve de ponte para atravessar vãos de até 6 m (o personagem precisa se equilibrar). <strong>Roleplay:</strong> treino e apresentações acrobáticas.",
      "vestimenta": false,
      "bonus": [],
      "valeEnquantoPossui": false
    },
    {
      "id": "bandagens-de-luta",
      "nome": "Bandagens de luta",
      "categoria": "ferramenta",
      "preco": 100,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "gladiador"
      ],
      "espacos": 0.5,
      "descricao": "Faixas de linho para enrolar mãos e pulsos antes de lutar. <strong>Bônus:</strong> +1 em testes de ataque desarmado enquanto as bandagens estiverem enroladas. Também protegem os dedos em socos contra superfícies duras. <strong>Roleplay:</strong> lutadores e arruaceiros reconhecem quem as usa.",
      "vestimenta": true,
      "bonus": [
        {
          "pericia": "ataqueDesarmado",
          "valor": 1,
          "condicao": "em testes de ataque desarmado"
        }
      ],
      "valeEnquantoPossui": false
    },
    {
      "id": "apito",
      "nome": "Apito",
      "categoria": "ferramenta",
      "preco": 100,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "guarda"
      ],
      "espacos": 0.5,
      "descricao": "Apito de metal que se ouve a 100 m em ambiente aberto. <strong>Combate:</strong> como ação livre, avisa aliados em alcance longo (sinal combinado) ou chama guardas próximos (o Mestre decide quem responde). <strong>Roleplay:</strong> símbolo de autoridade.",
      "vestimenta": false,
      "bonus": [],
      "valeEnquantoPossui": false
    },
    {
      "id": "algemas",
      "nome": "Algemas",
      "categoria": "ferramenta",
      "preco": 1000,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "guarda"
      ],
      "espacos": 1,
      "descricao": "Par de argolas de ferro ligadas por corrente, com chave. Prendem os pulsos de uma criatura de tamanho Médio. <strong>Combate:</strong> como ação padrão, algema uma criatura Indefesa, Agarrada ou rendida. Para se soltar sem a chave, a criatura faz um teste de Atletismo ou Prestidigitação (CD 20) ou arromba a fechadura. <strong>Roleplay:</strong> prisões e capturas.",
      "vestimenta": false,
      "bonus": [],
      "valeEnquantoPossui": false
    },
    {
      "id": "bandeja-de-servico",
      "nome": "Bandeja de serviço",
      "categoria": "ferramenta",
      "preco": 1000,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "servo"
      ],
      "espacos": 1,
      "descricao": "Bandeja de prata com jarra e duas taças, própria de criados de casas nobres. <strong>Acesso:</strong> carregando a bandeja, o personagem circula em festas, salões e residências como criado, o que reforça o poder Olhos Baixos. <strong>Utilidade:</strong> permite servir bebida e comida a vários convidados; com a oportunidade certa, serve também para misturar uma poção, sonífero ou veneno na bebida de alguém sem chamar atenção (a critério do Mestre). <strong>Roleplay:</strong> ninguém repara em quem serve.",
      "vestimenta": false,
      "bonus": [],
      "valeEnquantoPossui": false
    },
    {
      "id": "maleta-de-curandeiro",
      "nome": "Maleta de curandeiro",
      "categoria": "cura",
      "preco": 3000,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "curandeiro"
      ],
      "espacos": 1,
      "descricao": "Estojo com ataduras, agulha, linha, bisturi e pinças. Tem 10 usos. <strong>Combate:</strong> como ação completa, gasta 1 uso para encerrar a condição Sangrando em uma criatura adjacente. <strong>Utilidade:</strong> necessária para tratar ferimentos de forma adequada (além de um curativo improvisado). <strong>Roleplay:</strong> transforma o personagem no médico do grupo.",
      "vestimenta": false,
      "bonus": [],
      "valeEnquantoPossui": false,
      "usos": 10
    },
    {
      "id": "saco-de-ervas",
      "nome": "Saco de ervas",
      "categoria": "cura",
      "preco": 500,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "curandeiro",
        "eremita"
      ],
      "espacos": 0.5,
      "descricao": "Ervas secas e raízes de uso medicinal e culinário (camomila, hortelã, alho-bravo, casca de salgueiro...). Tem 2 usos. <strong>Descanso:</strong> em 10 minutos, 1 uso prepara um chá que encerra uma destas condições em uma criatura: Envenenado, Enjoado, Abalado ou Fatigado. <strong>Utilidade:</strong> cataplasmas e temperos. <strong>Roleplay:</strong> remédios caseiros e trocas com herbalistas.",
      "vestimenta": false,
      "bonus": [],
      "valeEnquantoPossui": false,
      "usos": 2
    },
    {
      "id": "estojo-de-escrita",
      "nome": "Estojo de escrita",
      "categoria": "escrita",
      "preco": 500,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "poeta"
      ],
      "espacos": 1,
      "descricao": "Pena, tinteiro, folhas de pergaminho (20) e areia para secar a tinta. <strong>Utilidade:</strong> escrever cartas, anotações e mapas simples. <strong>Roleplay:</strong> compor poemas e cartas de apresentação.",
      "vestimenta": false,
      "bonus": [],
      "valeEnquantoPossui": false
    },
    {
      "id": "estojo-de-escrita-completo",
      "nome": "Estojo de escrita completo",
      "categoria": "escrita",
      "preco": 1500,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "estudioso"
      ],
      "espacos": 1,
      "descricao": "Penas variadas, tintas coloridas, lacre, selo e régua. <strong>Utilidade:</strong> redigir contratos com selo, copiar documentos e produzir mapas detalhados. <strong>Roleplay:</strong> escribas e estudiosos reconhecem a qualidade.",
      "vestimenta": false,
      "bonus": [],
      "valeEnquantoPossui": false
    },
    {
      "id": "livro-raro-de-estudo",
      "nome": "Livro raro de estudo",
      "categoria": "escrita",
      "preco": 5000,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "estudioso"
      ],
      "espacos": 1,
      "descricao": "Volume antigo sobre um tema à escolha do jogador (a história de uma cidade, uma criatura, um ofício ou uma religião), aprovado pelo Mestre. <strong>Bônus:</strong> +1 em uma perícia baseada em Inteligência à escolha do jogador (História, Investigação, Misticismo ou Nobreza). Não precisa estar com o livro em mãos, mas <strong>se o personagem perdê-lo ou vendê-lo, perde o bônus</strong>. <strong>Exploração:</strong> ao consultá-lo por 1 hora, o Mestre pode fornecer uma pista sobre aquele tema (uma vez por aventura). <strong>Roleplay:</strong> colecionadores e bibliotecas pagam ou trocam favores por ele.",
      "vestimenta": false,
      "bonus": [
        {
          "pericia": null,
          "valor": 1,
          "condicao": null,
          "escolha": [
            "historia",
            "investigacao",
            "misticismo",
            "nobreza"
          ]
        }
      ],
      "valeEnquantoPossui": true,
      "escolhaTexto": "tema"
    },
    {
      "id": "livro-de-poemas",
      "nome": "Livro de poemas",
      "categoria": "escrita",
      "preco": null,
      "precoVenda": null,
      "semVenda": true,
      "origens": [
        "poeta"
      ],
      "espacos": 0.5,
      "descricao": "Caderno encadernado com poemas e canções do próprio personagem. <strong>Bônus:</strong> +1 em Atuação ao usar o livro em uma apresentação. <strong>Roleplay:</strong> pode ser lido em voz alta, oferecido de presente a um NPC ou usado como prova de autoria. Tem valor sentimental.",
      "vestimenta": false,
      "bonus": [
        {
          "pericia": "atuacao",
          "valor": 1,
          "condicao": "ao usar o livro em uma apresentação"
        }
      ],
      "valeEnquantoPossui": false
    },
    {
      "id": "anel-de-sinete",
      "nome": "Anel de sinete",
      "categoria": "insignia",
      "preco": 4000,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "herdeiro"
      ],
      "espacos": 0.5,
      "descricao": "Anel de prata com o brasão da família. <strong>Utilidade:</strong> lacra cartas e documentos e prova a linhagem do portador. <strong>Roleplay:</strong> perder o anel pode permitir falsificações em seu nome.",
      "vestimenta": true,
      "bonus": [],
      "valeEnquantoPossui": false
    },
    {
      "id": "joia-de-familia",
      "nome": "Joia de família",
      "categoria": "insignia",
      "preco": null,
      "precoVenda": 20000,
      "semVenda": false,
      "origens": [
        "realeza"
      ],
      "espacos": 0.5,
      "descricao": "Colar, broche ou pulseira herdado de gerações anteriores. <strong>Bônus:</strong> +1 em Diplomacia enquanto a joia estiver à mostra. <strong>Venda:</strong> pode ser vendida por até R$ 200. <strong>Utilidade:</strong> pode provar a linhagem do personagem (a critério do Mestre) ou ser penhorada por um favor importante, com direito de resgate. Vendê-la tem consequências narrativas.",
      "vestimenta": true,
      "bonus": [
        {
          "pericia": "diplomacia",
          "valor": 1,
          "condicao": null
        }
      ],
      "valeEnquantoPossui": false
    },
    {
      "id": "insignia-da-guilda",
      "nome": "Insígnia da guilda",
      "categoria": "insignia",
      "preco": null,
      "precoVenda": null,
      "semVenda": true,
      "origens": [
        "membro-de-guilda"
      ],
      "espacos": 0.5,
      "descricao": "Medalhão ou broche com o símbolo da guilda do personagem. <strong>Bônus:</strong> +1 em Intimidação ou em Diplomacia (o jogador escolhe ao pegar o item), enquanto a insígnia estiver à mostra. <strong>Acesso:</strong> identifica o portador como membro e abre a sede da guilda (trabalha com o poder Rede de Contatos). <strong>Roleplay:</strong> perdê-la ou ser expulso tem consequências narrativas.",
      "vestimenta": true,
      "bonus": [
        {
          "pericia": null,
          "valor": 1,
          "condicao": null,
          "escolha": [
            "intimidacao",
            "diplomacia"
          ]
        }
      ],
      "valeEnquantoPossui": false
    },
    {
      "id": "insignia-da-unidade",
      "nome": "Insígnia da unidade",
      "categoria": "insignia",
      "preco": null,
      "precoVenda": null,
      "semVenda": true,
      "origens": [
        "soldado"
      ],
      "espacos": 0.5,
      "descricao": "Broche ou faixa com o emblema do exército, companhia ou tropa em que o personagem serviu. <strong>Bônus:</strong> +1 em Intimidação ou em Diplomacia (o jogador escolhe ao pegar o item), enquanto a insígnia estiver à mostra. <strong>Acesso:</strong> ex-camaradas e postos militares amistosos reconhecem o portador e tratam-no com cordialidade. <strong>Roleplay:</strong> pode render ou atrair inimigos de guerra.",
      "vestimenta": true,
      "bonus": [
        {
          "pericia": null,
          "valor": 1,
          "condicao": null,
          "escolha": [
            "intimidacao",
            "diplomacia"
          ]
        }
      ],
      "valeEnquantoPossui": false
    },
    {
      "id": "simbolo-sagrado",
      "nome": "Símbolo sagrado",
      "categoria": "insignia",
      "preco": 500,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "religioso"
      ],
      "espacos": 0.5,
      "descricao": "Pingente, amuleto ou estatueta com o símbolo da divindade do personagem. <strong>Bônus:</strong> +1 em Religião enquanto o símbolo estiver à mostra. <strong>Utilidade:</strong> foco para orações e rituais (e para o sistema de magias, quando exigir um foco divino). <strong>Roleplay:</strong> devotos o reconhecem; hostilidade de quem odeia a fé.",
      "vestimenta": true,
      "bonus": [
        {
          "pericia": "religiao",
          "valor": 1,
          "condicao": null
        }
      ],
      "valeEnquantoPossui": false
    },
    {
      "id": "amuleto-de-tribo",
      "nome": "Amuleto de tribo",
      "categoria": "insignia",
      "preco": null,
      "precoVenda": null,
      "semVenda": true,
      "origens": [
        "selvagem"
      ],
      "espacos": 0.5,
      "descricao": "Colar de ossos, penas ou pedras que identifica a tribo ou bando em que o personagem cresceu. <strong>Roleplay:</strong> é reconhecido por quem pertence ao mesmo povo (honra, hospitalidade, rivalidades).",
      "vestimenta": true,
      "bonus": [],
      "valeEnquantoPossui": false
    },
    {
      "id": "trofeu-de-arena",
      "nome": "Troféu de arena",
      "categoria": "insignia",
      "preco": null,
      "precoVenda": null,
      "semVenda": true,
      "origens": [
        "gladiador"
      ],
      "espacos": 1,
      "descricao": "Prêmio das lutas (taça, coroa de louros ou cinturão). <strong>Roleplay:</strong> mostra reputação; fãs e rivais o reconhecem. Pode abrir portas em lugares que gostam de lutas.",
      "vestimenta": false,
      "bonus": [],
      "valeEnquantoPossui": false
    },
    {
      "id": "elo-de-corrente-quebrada",
      "nome": "Elo de corrente quebrada",
      "categoria": "insignia",
      "preco": null,
      "precoVenda": null,
      "semVenda": true,
      "origens": [
        "escravo"
      ],
      "espacos": 0.5,
      "descricao": "Um elo de ferro de uma corrente rompida, guardado como lembrança da servidão e da liberdade conquistada. <strong>Bônus:</strong> +1 em Intimidação ou +1 em testes de ataque desarmado (o jogador escolhe ao pegar o item), enquanto o elo estiver à mostra ou preso ao pulso. <strong>Roleplay:</strong> peça de ligação emocional; pode ser mostrado a outros que viveram servidão para criar confiança.",
      "vestimenta": true,
      "bonus": [
        {
          "pericia": null,
          "valor": 1,
          "condicao": null,
          "escolha": [
            "intimidacao",
            "ataqueDesarmado"
          ]
        }
      ],
      "valeEnquantoPossui": false
    },
    {
      "id": "lembranca-de-casa",
      "nome": "Lembrança de casa",
      "categoria": "insignia",
      "preco": null,
      "precoVenda": null,
      "semVenda": true,
      "origens": [
        "refugiado"
      ],
      "espacos": 0.5,
      "descricao": "Um pequeno objeto pessoal de um lar perdido (brinquedo, retrato, pedra, colar). <strong>Roleplay:</strong> liga o personagem ao seu passado e motiva suas escolhas. Sem valor de venda.",
      "vestimenta": false,
      "bonus": [],
      "valeEnquantoPossui": false
    },
    {
      "id": "perfume-fino",
      "nome": "Perfume fino",
      "categoria": "insignia",
      "preco": 1500,
      "precoVenda": null,
      "semVenda": false,
      "origens": [
        "gigolo"
      ],
      "espacos": 0.5,
      "descricao": "Frasco de essência de flores raras. Tem 10 aplicações. <strong>Utilidade:</strong> deixa um cheiro marcante e agradável, e mascara odores (dificulta ser rastreado pelo faro). <strong>Roleplay:</strong> causa boa impressão em encontros sociais e festas.",
      "vestimenta": false,
      "bonus": [],
      "valeEnquantoPossui": false,
      "usos": 10
    }
  ]
};
