# Changelog — Icarus RPG (Foundry VTT)

## 0.24.1

### Bardo: tipos de dano do Heavy Metal
- `classes.json` atualizado: o dano "sônico" virou tipos que já existem. **Estádio Lotado**: 8d6 de **Impacto**. **Dissonância**: Riff Pesado causa **Impacto** e Nu Metal **+1d6 Psíquico** (partes separadas, cada uma com a sua Redução).
- Texto do Foco Arcano aponta para a seção de Focos Arcanos.

## 0.24.0

### Bardo, RD/PV de todos os itens e os 6 focos arcanos
- **Bardo** (10 classes; 30 habilidades e 50 poderes): PV 14 + CON, PM (3 + CAR) × nível; armas simples e marciais leves ou ágeis, armaduras leves, sem túnicas.
- **Conjuração Bárdica:** lista Arcana com Carisma; magias até o 4º nível (nunca o 5º); 3 escolas permanentes (Encantamento obrigatória) e só magias delas; conhecidas 2 + ⌊nível/2⌋ (+2 por Repertório Ampliado).
- **Caminho** (Poesia/Música) e **Estilo** permanentes: o Estilo só lista as opções do Caminho; habilidades do Estilo no 3º, 9º e 15º; poderes do Caminho e do Estilo só para quem escolheu.
- **Chama da Musa:** +1 a +5 nos testes de perícia até o fim da cena (Poesia: também resistência; Música: também ataque), +2 PM para +1; só uma ativa por vez.
- **Talento de Palco** no diálogo de perícia não treinada; **Verso** (Louvor e Escárnio); **Execução** (Cadência e Dissonância, exige instrumento; Muralha de Som, Riff Pesado, Nu Metal); **Estádio Lotado**; **Obra-Prima** (metade do PM com a Chama ativa); Voz de Comando, Fascinar e Manipular.
- **RD/PV** de todas as 46 armas e dos 12 itens de armaduras e escudos (tabela validada), já nos compêndios.
- **6 focos arcanos** com preço: Varinha R$ 20, Cetro de Osso R$ 40, Grimório R$ 60, Cetro de Ferro R$ 90, Orbe de Prata R$ 150 e **Bordão Arcano** R$ 45 (arma e foco). O Bordão comum deixa de ser foco.
- Efeitos de magia e de classe agora aplicam bônus de **ataque** e de **deslocamento**.
- Correção: Heranças do Arcanista não aparecem mais como "escolher" pendente na aba Classe.

## 0.23.0

### Heranças automáticas e Escolta Contratada
- **Heranças do Feiticeiro** valem sozinhas na ficha: **Escamas Dracônicas** (+2 Defesa sem armadura nem escudo), **Pele das Profundezas** (Redução de Frio 3, +2 Atletismo), **Coração de Brasa** (Redução de Fogo 3 e de Trevas 3, +2 Vontade) e **Alma do Elemento** (Redução 5 contra o elemento do dragão, a partir do 11º).
- **Escolta Contratada:** botão "Contratar escolta" na aba Classe (cobra 10% da riqueza inicial do nível). Fica ativa até o Mestre dispensar; uma vez por cena, absorve **3 × o nível** do dano do Nobre ou de um aliado adjacente, automaticamente, ao aplicar o dano.

## 0.22.0

### Quebrar objetos (regra oficial)
- **Atacar objeto** (aba Combate e macro `game.icarus.atacarObjeto()`): escolha a arma e o objeto — da tabela (pergaminho a celeiro), manual (tamanho, Defesa, RD, PV) ou um item do alvo marcado (arma em mãos, armadura/escudo vestidos, foco, Estandarte). Ataque contra a Defesa do objeto (pelo tamanho, +5 em movimento); o dano perde a **RD do objeto, sem o teto de RD** dos personagens; 0 PV = destruído.
- **Manobra Quebrar:** ataque contra a **Defesa do alvo** (não mais teste oposto); se acertar, o dano vai ao item, não ao portador.
- Item destruído: sai das mãos/equipado, perde o bônus (armadura/escudo), aparece **riscado** no inventário e avisa no chat. A ficha do item ganhou o quadro **Objeto (Quebrar)** com RD, PV e Destruído, editáveis (o Mestre pode reverter).
- Item do alvo que o atacante não controla: o cartão traz **Aplicar no item (Mestre)**.
- Armas, armaduras e escudos do compêndio ainda não têm RD/PV (o Núcleo não está no repositório): preencha na ficha do item ou nos campos manuais.

## 0.21.0

### Nobre: mecânicas centrais e dinheiro
- **Postura Altiva:** botão na aba Classe troca Destreza por Carisma na Defesa (a fórmula da ficha mostra o atributo).
- **Dote:** R$ 1.500 somados às moedas uma única vez, com confirmação.
- **Brio:** campo "PM de Brio" no diálogo de teste de perícia (+2 por PM, até o Carisma, mínimo 1); o PM sai ao confirmar.
- **Palavra Cortante:** 1 PM; rola o dano Psíquico **não letal** (Aplicar dano = venceu, Metade = perdeu) e o Mestre abre o Teste Oposto. A 0 PV o alvo se rende (Diplomacia) ou fica Apavorado e foge (Intimidação), sem ficar Morrendo. Brado Tirânico: d8.
- **Rendimentos:** uma vez por aventura (o Mestre libera de novo): d20 + CAR + nível em % da riqueza inicial do nível (`tools/dados/riqueza.json`), com confirmação antes de somar.
- **Brado de Comando:** PM até o Carisma; cartão com Aplicar efeito (+PM em todas as perícias por 1 rodada) e Voltar.
- **Majestade:** 2 PM contra a criatura marcada, uma vez por cena por criatura; Vontade contra 10 + ½ nível + CAR (+5 com Coroação).
- **Estandarte da Família:** erguer/baixar, com PV e RD registrados.
- **Cofre da Família / Bolsa Aberta:** pagar PM dos poderes de Nobre com dinheiro, até o Carisma por cena. **Patrocinar, Dinheiro Resolve, Escolta Contratada** cobram o dinheiro com confirmação. O saldo nunca fica negativo.
- **Palavra de Encorajamento:** o aliado marcado rola o próximo teste com vantagem.
- **Educação Privilegiada:** só perícias da lista do Nobre.

## 0.20.0

### Arcanista: foco arcano e mecânicas centrais
- **Foco arcano:** novo tipo de equipamento "Foco arcano" (Equipar = em mãos) e pasta **Focos arcanos** no compêndio Itens Comuns (Varinha, Cetro, Orbe: madeira RD 5/PV 5; Cetro de metal RD 10/PV 5; Grimório RD 0/PV 5). O Bordão empunhado também vale.
- **Mago sem foco em mãos não lança** (aviso); o Mestre pode liberar na aba Classe. Feiticeiro e Mago de Sangue não precisam de foco. Foco com 0 PV fica destruído, sai das mãos e avisa no chat.
- **Magias conhecidas:** limite pela linhagem e nível (+1 por Escola Predileta/Segunda Escola), só da lista da linhagem e de nível que já lança. O jogador é impedido; o Mestre recebe o aviso. Contador na aba Classe.
- **Escola Predileta / Segunda Escola** +1 na CD da escola; **Maestria de Escola** −1 PM nelas (mínimo 1); **Mana Transbordante** +2 na CD e cartão "Recuperar 2 PM" no início do turno.
- **Pacto de Sangue** no Lançar aprimorado: paga até metade do custo com PV (2 PV por PM, sem RD, sem chegar a 0).
- **Canalização Arcana:** soma o atributo-chave ao dano total da magia.
- **Sopro do Dragão** (Herança de Dragão, 5º): botão na aba Classe, 4 PM, cone de 6 m posicionado no mapa, 4d6/6d6/8d6 do elemento, Reflexos contra a CD das magias, com os botões de aplicar dano.
- Tabela de objetos (`tools/dados/objetos.json`) para a regra de Quebrar.

## 0.19.0

### Arcanista e Nobre (dados, Linhagem, escolhas, túnicas)
- **classes.json** com 9 classes: **Arcanista** (21 habilidades, 53 poderes) e **Nobre** (8, 38), com ícones. **magias.json**: Dissipar Magia também na tradição Sangue (Arcana 97, Divina 79, Sangue 51).
- **Linhagem do Arcanista** (1º, permanente): Mago, Feiticeiro ou Mago de Sangue. Só as habilidades e os poderes da linhagem escolhida aparecem; o PM vira (base + atributo) × nível (Mago e Mago de Sangue 3 + INT, Feiticeiro 4 + CAR) e a conjuração usa INT ou CAR. Antes de escolher: 3 + INT e aviso na aba Classe.
- **Herança Ancestral** só para o Feiticeiro (Dragão, Leviatã, Fênix).
- Novas telas de escolha: **escola de magia** (Escola Predileta, Segunda Escola, sem repetir), **tipo de dano** sem repetir o tipo (Mestre do Elemento; Proteção Elemental dá Redução 3 do tipo), **perícias de uma lista** (Erudito Arcano, repetível, cada vez uma diferente).
- **Túnicas:** Arcanista e Nobre têm proficiência (túnica continua não sendo armadura).
- Grupos de poderes: "Linhagem do Mago" não libera mais os poderes da "Linhagem do Mago de Sangue".

## 0.18.0

### Magias — área no mapa
- **Posicionar a área:** ao lançar uma magia de área (esfera, cilindro, cone, linha, cubo/quadrado), o modelo aparece no mapa antes de gastar o PM. Esfera e quadrado seguem o mouse (encaixam na grade; **Shift** solta); cone e linha saem do seu token e apontam para o mouse. **Clique** lança; **clique direito** ou **Esc** cancela (sem gastar PM). Magias "pessoal" / "centrada em você" ficam no conjurador sem precisar posicionar.
- **Alvos automáticos:** os tokens dentro da área viram os alvos (o conjurador fica de fora no cone, na linha e nas áreas ao seu redor), então os botões de dano e de efeito já pegam quem foi atingido.
- **Animação na área:** a explosão, a chuva, o pilar e a onda acontecem no ponto do modelo; o cone e a linha seguem a direção em que o modelo aponta. O vídeo próprio também é posicionado e girado.
- O modelo de magia instantânea some depois da animação; o das outras durações fica até alguém apagar.
- Opção do cliente "Posicionar a área das magias no mapa" (ligada) para voltar ao modo antigo.

## 0.17.0

### Magias — lançar rola o dano, efeitos, animações
- **Compêndio em árvore:** Divinas / Arcanas / Sangue → 1º a 5º Nível. Magia de mais de uma tradição aparece em cada pasta.
- **Lançar** (como o Atacar): lança na hora, sem janela — gasta o PM, manda o cartão e **rola o dano** (com Aplicar dano, Metade, Curar, Perda de PV e **Voltar**) ou a **cura**. **Lançar aprimorado** abre a janela dos aprimoramentos (o dano extra entra na rolagem).
- **Efeitos e condições:** o cartão da magia traz **Aplicar condição** / **Aplicar efeito** e **Voltar**. Condições pelo sistema de condições; bônus e penalidades viram um Efeito Ativo com o ícone da magia (aparece no token) em Defesa, perícias, testes de resistência, RD e Redução por tipo. Bônus de Defesa de magias não acumulam (vale o maior). Aplicar de novo não duplica. Efeitos de cena terminam com o fim do combate ou "Encerrar cena".
- **Animações** das magias de dano em todos os clientes, sem módulos: projétil, explosão, cone, linha, pilar, chuva e aura, com cor e partículas por elemento (fogo, frio, elétrico, ácido, luz, trevas, essência, sangue…). Vídeo próprio opcional em `img/animacoes/magias/<id>.webm`; som opcional em `audio/magias/<elemento>.ogg`. Opções: ligar, intensidade e som.
- Automação proposta para as 200 magias a partir do texto (`tools/dados/magias_automacao.json`, relatório `tools/relatorio_automacao.md`); ajustes por magia continuam por validação.
- **Voltar** no dano: quem aplicou também pode voltar a própria aplicação (antes só o Mestre).
- Armas: "Ataque detalhado" passa a se chamar **Ataque aprimorado**.

## 0.16.0

### Magias — Fase 2: compêndio, aba e lançar
- Novo tipo de item **Magia** (nível, custo, escola, execução, alcance, alvo, duração, resistência, descrição, aprimoramentos, tradições, afinidade, concentração).
- Compêndio **Icarus — Magias**: as 200 magias em pastas por nível, com o ícone de cada uma; ids estáveis (o build repetido não duplica nada).
- Ficha: aba **Magias** com CD da magia, **atributo-chave** (padrão: o de PM da classe; senão Inteligência), nível de magia alcançado pelo nível do personagem (só informativo, nada é bloqueado), busca e filtros por nível e escola, magias agrupadas por nível com ícone, custo, escola, descrição e aprimoramentos.
- **Lançar** (aba, ficha do item ou macro arrastada para a barra): diálogo com aprimoramentos (cada um uma vez), custo total e PM atual; sem PM suficiente o botão fica desabilitado com o motivo. Ao lançar, debita o PM (devolve se der erro) e manda o cartão da magia ao chat com CD, custo pago, aprimoramentos usados e alvos marcados.
- Ainda sem automação de dano, resistência e efeitos (Fase 3 em diante).

## 0.15.0

### Magias — Fase 1: ícones
- Dados das 200 magias em `tools/dados/magias.json` (fonte da verdade, texto sem alteração).
- 200 ícones em `img/magias/<id>.png` (256×256), gerados de `Downloads/img/Icones/Magias` por `npm run build:icones-magias -- --de "<pasta>"`: casamento por nome em ASCII; "Manto de Sombra.png" → Manto de Sombras (exceção confirmada). Repetível: rodar de novo pega imagens novas e não regrava as iguais.
- Manifesto `tools/dados/magias_icones.json` e relatório `tools/relatorio-icones-magias.md` (magias sem imagem e imagens sem magia).
- Leitor de PNG dos builds aceita PNG RGB; gravador com filtro por linha (opcional) para imagens opacas.

## 0.14.2

### Ataque
- **Atacar** (ficha do personagem e do animal) rola o teste na hora, sem abrir a janela: Shift = vantagem, Ctrl = desvantagem; flanco detectado pelos tokens e poderes que já vêm marcados (Ataque Furtivo, Contra a presa) entram sozinhos, como se a janela fosse confirmada sem mudanças.
- Novo botão **Ataque detalhado** abre a janela de antes (bônus extra, flanco manual, camuflagem, duas armas, poderes). Armas com mais de um modo têm um por modo no inventário ("Detalhado (Arremessar)"); no painel de Ataques, o ícone de controles.

## 0.14.1

### Botões de dano e cura
- Sem mensagem de confirmação no chat ("Dano aplicado", "Cura aplicada", "Perda de PV aplicada"): o registro fica só na própria mensagem da rolagem ("Aplicado em X (−11)"), com o cálculo na dica ao passar o mouse. Só o que não pôde ser aplicado vira aviso.

## 0.14.0

### Botões de dano e cura no chat
- Toda rolagem de dano do sistema (armas, ficha, animal, lembretes de turno, `rolarDanoAvulso`) passa por uma função só e ganha a barra **Aplicar dano** (vermelho), **Metade** (laranja), **Curar** (verde) e **Perda de PV**; **Dobro** é opção do mundo (desligado). Dica com o valor exato ("Aplicar 7", "Curar 14").
- Aplica nos **alvos marcados** (T); sem alvo, nos **tokens selecionados**. Tokens de outros jogadores: o pedido vai ao Mestre ativo, que confere (usuário ligado, cena, alvo marcado, mensagem visível) e recalcula o valor pela mensagem — o jogador nunca envia números.
- Cálculo: metade antes da RD; imunidade, vulnerabilidade e redução **por tipo** em cada componente; RD geral uma vez; mínimo 0. Cura até o máximo, não cura morto nem o animal do Vínculo Selvagem. Dano em quem está Morrendo conta falha no teste de morte.
- Registro "Aplicado em …" na própria mensagem; **Desfazer** (só Mestre) reverte a última aplicação.
- Rolagens com vários tipos (`rolarDanoAvulso({ partes: [{ formula, tipo }] })`) e de cura (`game.icarus.rolarCura`).
- Mensagens antigas trocam os botões velhos pela barra nova; opção "Mostrar botões em qualquer rolagem" (desligada) para `/r`.

### Números de PV sobre os tokens
- Perdeu PV: **−N vermelho** com "pop" e tremida, subindo e sumindo (~1,25 s); ganhou: **+N verde** com brilho suave. PM em azul (opção do mundo, desligada).
- Funciona com qualquer mudança de PV (botão do chat, ficha, efeitos), em tokens vinculados e não vinculados, para todos os clientes; carregar a cena ou criar o token não anima.
- Números maiores acima de 25% do PV máximo; caveira quando chega a 0 PV; vários números no mesmo token saem em cascata para os lados; no máximo 12 ao mesmo tempo; respeita "reduzir movimento".
- Quem vê: personagens de jogadores para todos; NPCs conforme a opção do mundo (ligada); nunca em token que o jogador não enxerga.
- Opções de cada usuário: ligar, tamanho (pequeno/médio/grande), som (`audio/ui/dano.ogg` e `cura.ogg`, se existirem).

## 0.13.1

### Carrossel de combate
- **Mover:** alça na ponta da faixa para arrastar o carrossel (Mestre e jogadores); a posição fica salva para cada usuário e a faixa nunca sai da tela. Duplo clique na alça volta ao lugar padrão.
- **Rolar iniciativa:** dado vermelho na carta de quem ainda não tem iniciativa (para o dono e para o Mestre); botão "Rolar iniciativa" para os personagens do jogador; para o Mestre, rolar de todos e só dos NPCs. Usa a fórmula do sistema (1d20 + Iniciativa).
- Com pouco espaço, o trilho das cartas encolhe (e rola) sem cortar a alça e os botões.

## 0.13.0

### Barras de PV/PM e escudo de Defesa no token
- Barras do Icarus desenhadas no próprio token (PIXI), abaixo dele e dentro da largura: **PV** (vermelho) e **PM** (azul), com moldura metálica, brilho, animação de 300 ms ao mudar e pulso com PV ≤ 25%. Texto atual/máx ao passar o mouse (configurável: sempre, ao passar o mouse, nunca).
- **Escudo** com a Defesa (`system.defesa.total`) no canto inferior esquerdo; arte opcional em `img/ui/escudo-defesa.png`.
- As barras padrão do Foundry ficam ocultas (sem duplicar); o nome do token desce para baixo das barras.
- Quem vê: personagens de jogadores mostram tudo para todos; NPCs/monstros (atores sem dono jogador) só para o Mestre, ou PV em porcentagem para os jogadores. Opções de PM, Defesa e texto.
- `prototypeToken` com `bar1` = PV e `bar2` = PM nos atores novos e nos existentes (migração 0.13.0, idempotente).

### Carrossel de combate
- Cartas dos combatentes no topo (ou na base) na ordem de iniciativa: retrato, nome, selo de iniciativa, mini barras de PV/PM (mesmas regras de visibilidade) e faixa da disposição.
- Turno ativo maior, com brilho dourado/roxo pulsando, runa girando e coroa; os 2 próximos destacados; a troca de turno desliza.
- Banner **RODADA N** e aviso **SEU TURNO** (som opcional em `audio/ui/seu-turno.ogg`).
- Derrotados em cinza com caveira; ocultos só para o Mestre (olho riscado).
- Clique centraliza a câmera (e seleciona, se for dono); passar o mouse destaca o token; duplo clique abre a ficha. Mestre: turno anterior, próximo turno (ou começar) e encerrar.
- Rolagem horizontal com muitos combatentes (roda do mouse e setas); até 70% da largura; não cobre a barra de cenas nem a barra lateral; não bloqueia cliques fora das cartas.
- Artes opcionais em `img/ui/carrossel/`. Com o módulo Combat Carousel ativo, o do Icarus fica desligado (pode forçar).

### Outros
- Lista de arquivos opcionais de interface gerada no build (`tools/dados/arquivos-ui.json`): o sistema não pede arquivos que não existem (sem 404 no console).

## 0.12.1
- Vídeo da porta trancada mais curto (3 s).

## 0.12.0
- Interação por proximidade (1,5 m) e porta trancada com teste de Prestidigitação.
