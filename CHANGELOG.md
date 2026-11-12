# Changelog — Icarus RPG (Foundry VTT)

## 0.36.1

### Correções: aba Token do mercador e da ameaça; acesso dos jogadores à loja
- **Aba Token no mercador e na ameaça:** a prévia ficava vazia e as molduras não respondiam. O editor procurava a aba no lugar errado nessas fichas (ficha ApplicationV2 é um formulário, e o "primeiro elemento" dele é um campo). Agora liga como no personagem.
- **Exigir proximidade** nas configurações do token (v13): a caixa não aparecia pelo mesmo motivo; corrigido.
- **Loja que não abre para o jogador:** o Foundry só entrega o duplo clique (no token ou no diretório) a quem tem pelo menos "Limitado" no ator. A ficha do mercador agora avisa o Mestre quando algum jogador não tem acesso, com o botão **Liberar a loja para os jogadores** (passa a permissão padrão para Observador).

## 0.36.0

### Ameaças: ator novo, compêndio da fauna e aba Token para ameaça e mercador
- **Ator "Ameaça"** (tipo `ameaca`): criatura do Mestre com ficha compacta, para usar várias ao mesmo tempo.
  - Os números vêm prontos e são todos editáveis: Defesa, PV (e PM, se houver), Iniciativa, CD das habilidades, deslocamento, Fortitude, Reflexos e Vontade, atributos, sentidos e tesouro. Nada vem de classe ou nível.
  - Perícias do Icarus = atributo + treino + outros (sem nível), recolhidas; só as com treino ou bônus aparecem abertas.
  - **Ataques naturais** (nome, bônus, dados, dano fixo, tipo, alcance): **Atacar** rola d20 + bônus contra a Defesa dos alvos marcados (Shift = vantagem, Ctrl = desvantagem), com crítico no 20. O card tem **Dano** e **Dano crítico**. O dano sai com as mesmas marcas das armas, então Aplicar dano, Metade, Dobro, RD e imunidades funcionam igual. "mais 1d6 de veneno" vira uma parte de veneno, e o crítico dobra só os dados da mordida, não o veneno.
  - **Habilidades** são itens "poder", com o texto sempre visível na ficha, o gatilho no começo e um botão para mostrar no chat.
  - Iniciativa, testes de resistência pedidos pelo Mestre, condições, dano e cura, PV temporários e barras do token funcionam como no personagem: a ameaça usa o mesmo modelo por baixo, e condições e Efeitos somam por cima dos valores prontos.
  - **PV 0 não abre testes de morte:** a ameaça cai ou morre pelas regras do Mestre.
  - Token padrão: **não vinculado** (cada token com os próprios PV), **hostil**, barra 1 = PV, nome ao passar o mouse e barras só para o Mestre. O tamanho define as casas: Pequeno e Médio 1×1, Grande 2×2, Enorme 3×3, Colossal 4×4.
  - Etiquetas de papel (Solo, Lacaio, Especial) e de ND. Os lacaios mostram "Costuma acompanhar". Fases, Resistência Lendária e Ação Lendária (S e S+) ficam só no texto.
- **Compêndio "Icarus: Ameaças — Fauna"**: as **110 criaturas** do bestiário (58 Solo, 44 Lacaios, 8 Especiais), geradas de `tools/dados/ameacas-fauna.json`.
  - Pastas por papel e patamar: Iniciante (ND 1/4 a 4), Veterano (5 a 10), Campeão (11 a 16), Lenda (17 a 20) e Lenda+ (S e S+), em ordem de ND e nome.
  - As imagens ficam em `img/Ameacas/Fauna/` (WebP). Imagem que falta usa o dado azul, e o build lista as criaturas sem imagem e os arquivos sem criatura.
  - "Redução de Dano N" e a imunidade a tipos de dano ("imune a veneno, frio") entram nas resistências. Visão e Audição dos sentidos entram nas perícias. Imunidades com condição ("frio natural") e a condições ficam no texto.
  - CD das habilidades vazia no JSON fica vazia na ficha (37 criaturas Solo); o build lista quais.
- **Aba Token no mercador e na ameaça:** o mesmo editor e a mesma galeria do personagem.
  - Em ator **não vinculado** (ameaças), Aplicar muda o token dos próximos que você colocar; as cópias já na cena só mudam se você marcar a caixa.
  - Atores de compêndio não têm editor: importe para o mundo. Até lá, o token usa a imagem da criatura sem moldura.
  - Trocar o retrato do mercador ou da ameaça muda também o token, a não ser que ele já tenha moldura aplicada; nesse caso a moldura fica e um aviso explica.
## 0.35.0

### Mercador: vitrine bonita e ficha com as regras do Icarus
- **Vitrine:**
  - O retrato aparece **inteiro**, sem cortar nem distorcer. Em janela larga fica à esquerda, na altura toda; em janela estreita fica em cima (até 55% da altura). A janela padrão é maior (980 × 820).
  - O nome do mercador está maior (40 px). A fala dele (saudação, Barganha, aviso, guardas) aparece num **balão grande**, de 22 a 30 px, com aspas decorativas e a ponta apontando para o retrato.
  - Falas de impacto (Intimidação e guardas) têm borda vermelha. A fala nova entra com uma animação curta, que não toca com "reduzir movimento".
  - Os testes de Barganha ficam numa faixa própria abaixo do balão.
  - As linhas dos itens têm mais respiro (48 px, ícone de 40 px). O rodapé mostra "Comprador: <nome>" e "Dinheiro" separados.
- **Ficha do mercador com as regras do personagem:** o ator `mercador` agora usa o mesmo modelo do personagem.
  - Atributos com base, racial e temporário; perícias do Icarus com treino e outros; Defesa derivada; proficiências; resistências.
  - Perícias, ataques, dano, condições e barras do token funcionam pelas mesmas funções.
  - Não tem classe: PV e PM são digitados. A "Defesa manual" é opcional, e as proficiências vêm todas marcadas por padrão.
- **Abas da ficha:** Resumo, Perícias (rolagem pelo nome; as da loja sempre em cima), Poderes e magias (itens "poder" e "magia", com Usar e Lançar), Equipamento e ataques (equipar e empunhar como no personagem, Atacar, Dano e Recarregar), Loja e Notas.
- **Equipamento × estoque:** o estoque (marca da loja) não entra na Defesa, nas perícias, nos ataques nem na munição gasta. "Passar para a loja" e "Tirar da loja" movem itens entre as duas listas.
- **Migração 0.35.0** (uma vez, ao abrir o mundo como Mestre):
  - atributos digitados viram a base;
  - a Defesa digitada vira "Defesa manual" ligada com o mesmo valor;
  - perícias livres viram as perícias do Icarus pelo nome, com treino e outros que mantêm o total; as que não casam vão para as notas;
  - habilidades livres viram itens "poder".
- O compêndio "Icarus: Mercadores" já vem no formato novo, com Barganha, Diplomacia e Intuição treinadas.

## 0.34.0

### Mercador: compra sem dinheiro, Roubar e os guardas
- **Compra sem dinheiro:** o botão Comprar continua ativo e o Mestre decide.
  - Na 1ª e na 2ª tentativa, o mercador diz **"Está tentando me roubar?"** no balão da vitrine de quem tentou e no chat, dito por ele.
  - Na **3ª**, ele **chama os guardas**: a loja fecha para todos e o Mestre recebe um sussurro com o nome de quem provocou e a nota de consequência.
  - A contagem é **por jogador e por mercador**, fica no mercador (`flags.icarus-rpg.tentativasSemDinheiro`) e só o Mestre a altera.
  - Só "dinheiro insuficiente" conta (esgotado, loja fechada e quantidade inválida não contam).
  - Zera com "Reiniciar barganhas", "Acalmar os guardas / reabrir a loja" ou o botão de zerar de cada jogador.
- **Roubar:** botão ao lado de Comprar em cada item visível e com estoque.
  - O personagem rola **Prestidigitação** com o diálogo de sempre, e o Mestre confere a mensagem como na Barganha (socket `loja:roubar`).
  - **Passou** (≥ CD): leva 1 unidade sem pagar (empilhando como na compra), o estoque cai 1 e só ele e o Mestre recebem "Seus dedos foram mais rápidos que os olhos do mercador: {item} é seu."
  - **Falhou:** flagrante, com a fala do mercador e os guardas; nada é entregue.
  - Itens esgotados e ocultos não podem ser roubados. Roubar não pede nem gasta dinheiro.
- **Ficha (aba Loja, bloco "Roubo e guardas"):**
  - "Permitir roubar", CD do roubo (15) e CD opcional por item;
  - número de tentativas antes dos guardas (3);
  - o aviso, as falas dos guardas, as de flagrante e a mensagem do roubo, todas editáveis e incluídas em "Restaurar falas padrão";
  - as tentativas por jogador (com zerar) e o registro dos roubos.
- **Guardas em uma função só:** a da Barganha (1 natural na Intimidação), a da compra sem dinheiro e a do flagrante. Compra, venda, Barganha e roubo passam pela mesma fila do Mestre.

## 0.33.0

### Mercador: estoque finito, itens livres e Barganha
- **Estoque sempre finito.** O "∞" saiu e a quantidade é um inteiro ≥ 0; com 0, o item aparece como "Esgotado". **Migração:** itens de mercador que estavam com estoque infinito passam a ter 1 unidade. Revise o estoque dos seus mercadores.
- **O Mestre coloca qualquer item:**
  - Arrastar de compêndio, diretório, inventário de outro ator ou da própria ficha sempre copia o item e pergunta quantidade, preço e se entra oculto.
  - "Criar item" faz um item novo direto no estoque.
  - Cada linha edita nome, quantidade, preço, oculto e "libera com".
  - O preço do mercador prevalece sobre o preço do item, o preço de venda e o "sem venda".
- **Barganha:**
  - Na vitrine, três botões com d20 vermelho (Barganha, Diplomacia, Intimidação). O personagem rola a perícia com o diálogo de sempre.
  - O **Mestre** decide pela mensagem da rolagem: autor, falante, perícia, até 2 minutos e não usada antes.
  - Cada teste vale **uma vez por mercador, para o grupo todo**. Dois pedidos ao mesmo tempo dão um só.
- **Efeitos** (no máximo um desconto e um acréscimo):
  - sucesso: −5% e os itens ocultos aparecem; 20 natural: −15%;
  - falha na Intimidação, ou 1 natural em Barganha ou Diplomacia: +10%;
  - 1 natural na Intimidação: **chama os guardas**. A loja fecha, o Mestre recebe um aviso com a nota de consequência e um botão reabre a loja.
  - O preço da vitrine é o mesmo da compra: o preço unitário é arredondado e depois multiplicado pela quantidade.
- **Falas:** 12 resultados (crítico, sucesso, falha e falha crítica dos três testes), com uma frase sorteada por linha. Aparecem num balão na vitrine de todos e no chat, ditas pelo mercador. São editáveis, aceitam {personagem} e {mercador} e têm "Restaurar falas padrão".
- **Na aba Loja:** CD e liga/desliga de cada teste, os descontos, o acréscimo, as opções dos guardas, "mostrar CD aos jogadores", "falas no chat", "Reiniciar barganhas" e a situação de cada teste.
- O compêndio de exemplo agora tem estoque finito e um item oculto em cada mercador.
- As rolagens de perícia guardam o d20 natural nas flags da mensagem (`natural`).

## 0.32.0

### Mercador (ator de loja) e vitrine
- Novo tipo de ator **Mercador**, com ficha compacta para o Mestre. Ela tem três abas:
  - **Ficha:** nível, Defesa, PV, PM, atributos, perícias, habilidades, equipamento e magias;
  - **Loja:** o estoque. Arraste itens de compêndios ou do diretório; cada item tem quantidade ou ∞, preço base, preço final, oculto e remover. Também ficam aqui as falas, o multiplicador de preço, a caixa do mercador, "Abrir/Fechar loja" e "Ver como jogador";
  - **Notas:** só para o Mestre.
- **Vitrine:** quem não é Mestre nem dono, ao abrir o mercador, vê o retrato grande, o nome, a fala de abertura e a lista à venda, sem os números do mercador.
  - Cada item mostra preço (com a dica em Ouro Real), estoque ou "Esgotado", quantidade e Comprar.
  - O rodapé mostra o dinheiro de quem compra, com seletor se houver mais de um personagem. A vitrine se atualiza sozinha.
- **Compra pelo Mestre (socket `loja:comprar`):** o jogador manda só o mercador, o item, a quantidade e o comprador.
  - O Mestre recalcula o preço (base × multiplicador × quantidade, em centavos), confere a loja aberta, o estoque, o dinheiro e a posse do comprador.
  - Ele debita com troco, entrega o item (empilhando munições e consumíveis do mesmo item), baixa o estoque, credita a caixa se ela não for infinita e registra no chat.
  - Tudo é um bloco: se um passo falha, os anteriores são desfeitos. Sem Mestre conectado, nada muda.
- **Venda ao mercador (opcional, `loja.compra.ativo`):** aba "Vender" na vitrine. O mercador paga o preço de venda do item ou o preço × percentual, da caixa. Itens "sem venda" não são aceitos.
- Compêndio **Icarus: Mercadores** com Ferreiro, Boticário e Mercador de Rua. O estoque deles vem dos compêndios de armas, munições, armaduras e itens comuns, com os preços originais. Os retratos são provisórios.
- Configuração do mundo: mensagem de compra pública ou só para o comprador e o Mestre.

## 0.31.0

### PV temporários
- Novo campo **PV temporários** na ficha, abaixo da barra de PV. Fica em destaque quando há algum, e o Mestre pode ajustar à mão.
- **Regra:** o dano consome primeiro os PV temporários, depois os PV. O cálculo no chat mostra quanto foi para os temporários, e "Desfazer" devolve os dois.
- Os PV temporários **não se acumulam** (vale o maior) e a **cura não os restaura**. A **perda de PV** (Sangrando, Preço de Sangue, Faca na Ferida) também não mexe neles.
- Eles **somem no fim da cena** ("Encerrar cena") ou **quando o efeito de origem termina** (sair da Forma, sair da Ascensão ou apagar o efeito).
- Ligados ao campo:
  - **Forma de Urso** (2 × nível) e **Fera Ancestral** (3 × nível): somem com a Forma;
  - **Não Caio** (4d8);
  - **Pano e Linha** (metade do nível, no aliado). Se o aliado é de outro jogador, o chat mostra um botão "Aplicar" para o Mestre;
  - **Forma Ancestral** da Ascensão (3 × nível): some com a Ascensão.

### PM temporários
- Novo campo **PM temporários** na ficha, abaixo da barra de PM.
- **Regra:** ao gastar PM, os temporários saem primeiro. O PM disponível para conferir custos é PM + PM temporários. Isso vale em todo lugar que gasta PM: poderes, magias, magias mantidas, Brio e Talento, e as ações das classes.
- Os PM temporários não se acumulam (vale o maior), salvo quando o poder diz que acumulam. Recuperar PM não os restaura. Eles somem no fim da cena ou quando o efeito de origem termina.
- Violar um Dogma tira também os PM temporários.
- **Golpe Mágico (Bardo):** sob a Chama da Musa, o card do ataque corpo a corpo ganha o botão "+2 PM temporários". Eles acumulam até o nível do bardo por cena.

## 0.30.0

### Místico
- `classes.json` com o **Místico** (15 classes; 9 habilidades e 29 poderes; 531 poderes no total). As outras classes ficam iguais e o `magias.json` não mudou. PV 14 + CON (+4 + CON por nível), **PM 5 × nível + Sabedoria** (atributo só uma vez). Misticismo e Vontade + 4 perícias; armas simples e túnicas, sem armadura e sem escudo. Ícone `img/Icones/classes/Místico.png`.
- **Conjuração Mística:** lista Arcana com CD de Sabedoria e 4 escolas permanentes (a Espiritual é fixa; **Escola Estendida** dá a 5ª). Magias conhecidas: 3 no 1º nível e +1 a cada nível ímpar. **Ecos dos Ancestrais:** 2 magias Divinas das mesmas escolas por escolha, do 1º nível de magia no 5º até o 4º no 17º; sem ele, nada de magia Divina.
- **Dobra Elemental:** elemento permanente (Chama, Maré, Rocha, Vento); os **Domínios** ensinam os outros e a **Harmonia** dá os quatro. **Rajada Elemental** na aba Classe: 1 PM, ataque à distância com Sabedoria, 1d8 a 5d8 do tipo do elemento (Fogo, Frio, Impacto, Corte). Rajada Potente usa d10, o Domínio soma +2, a Rajada Dupla custa +2 PM e a Rajada Veloz +1 PM. Os poderes de técnica só aparecem para quem conhece o elemento.
- **Familiar Elemental:** novo compêndio **Familiares Elementais** com Raposa de Brasa, Lontra de Maré, Tatu de Pedra e Ave de Vendaval (`tools/dados/familiares.json`), com as imagens `Familiar Elemental - <Nome>.png`. A escolha mostra a ficha de cada um. "Invocar" custa 1 PM e usa o mesmo código do Vínculo Selvagem: PV 10 + metade do nível, Defesa 10 + metade do nível + bônus, CD com a Sabedoria do místico. Familiar Robusto (+10 PV, +1 Defesa) e Evolução do Familiar (+2 Defesa, dano um passo maior) entram sozinhos. **Segundo Familiar** dá outro invocável, e invocar um dispensa o outro.
- **Meditação** (1/dia; Concentração CD 15; só gasta o uso no sucesso), **Alma Desperta** (informação), **Ascensão Espiritual** (forma permanente; 1/dia, 2 com Harmonia; 8 PM; efeito até o fim da cena, sem Fatigado) e **Harmonia** (imune a medo).
- Mente Calma (+2 Vontade e Concentração), Domínio do Vento (+3 m) e as reduções do Domínio da Chama e do Domínio da Maré entram na ficha.

## 0.29.0

### Anátema
- `classes.json` com o **Anátema** (14 classes; 21 habilidades e 25 poderes; 502 poderes no total). Nas outras classes só muda a lista de perícias à escolha (Luta, Pontaria e Iniciativa onde faltavam). PV 26 + CON (+6 + CON por nível), **PM 2 × nível + Sabedoria** (atributo só uma vez) **+1 a cada 2 níveis** pela **Mana Coagulada**. Fortitude e Intimidação + 3 perícias; armas simples e marciais, armaduras pesadas e escudos. Ícone `img/Icones/classes/Anátema.png`.
- **Abandonado:** o Anátema não escolhe divindade nem recebe Poderes Concedidos (o Mestre é só avisado). **Preço de Sangue:** os diálogos de usar poder, lançar magia e as ações do Anátema têm o campo "Pagar com PV": até 2 PM por turno, 3 PV cada (**Preço Barato:** até 3, 2 PV cada). É perda de PV e nunca deixa os PV em 0; uma vez por turno em combate.
- **Sangria de Guerra:** botão no card do ataque corpo a corpo com arma de Corte ou Perfuração (1 PM). O Sangrando guarda quem o causou: CD 15 (**Ferida Teimosa:** 10 + metade do nível + Sabedoria) e perda 1d6 (**Hemorragia Pesada:** 2d6), e o lembrete de turno usa esses valores. **Corte Gêmeo** (+1 PM) pega o segundo alvo marcado. Alvo de outro jogador ou do Mestre recebe um botão "Aplicar" no chat.
- **Selar Feridas** (remove Sangrando e cura 1d6 a 4d6; Costura Rápida, Cicatriz Viva em si, Selar à Distância, Pano e Linha) e **Olhar Funesto** (Sabedoria em Intimidação; rola a Intimidação e o card aplica Abalado, ou Apavorado por 1 rodada se o alvo estiver Sangrando; Voz Blasfema: 2 alvos; Voz que Quebra: ação livre por 1 PM) na aba Classe.
- **Ruptura** (Pecado, Tragédia, Blasfêmia) permanente: habilidades e poderes só da escolhida. Carne Aberta, Mão Pesada, Sangue Fervente e Medo Ambulante entram no ataque; Sangria Total, Não Caio, Maldição Rubra, Aclamação do Pavor, Dente por Dente, Faca na Ferida, Insulto ao Céu e Amortecer têm automação simples; Pele de Cicatrizes (RD 2/4), Voz Rouca, Voz Blasfema, Veias de Ferro (+2 Fortitude, +5 contra Sangrando) e Armadura Rubra (+1 Defesa em armadura pesada) são calculados na ficha.
- **Dor Fértil:** ao perder PV, +1 PM (1 vez por rodada; até metade do nível por cena). **Banho Rubro:** 1/dia; +2 em ataque e Intimidação e Sangria sem PM até o fim da cena, depois Fatigado.
- **Palavras de Sangue:** a única forma de o Anátema lançar magias: 2 magias da lista **Sangue** por escolha, do 1º nível de magia no 5º até o 4º no 17º, CD com Sabedoria. Sem o poder, a aba Magias avisa e não aceita magias.

### Correção
- **Mosaico Vivo (Druida):** Olhos de Coruja e Nariz de Lobo não davam os +5 em Visão e Olfato (a chave do efeito estava errada).

## 0.28.0

### Druida
- `classes.json` com o **Druida** (13 classes; 20 habilidades e 33 poderes; 477 poderes no total). As outras 12 classes ficam iguais. PV 16 + CON (+4 + CON por nível), **PM 5 × nível + Sabedoria** (atributo só uma vez). Sobrevivência e Vontade + 4 perícias; armas simples, túnicas, armaduras leves e escudos. Ícone `img/Icones/classes/Druida.png`.
- **Fé Selvagem:** a mesma escolha permanente de divindade do Clérigo. **Floressa** concede os 3 Poderes Concedidos; outra divindade, **2 à escolha**. A aba Classe mostra o Dogma, e o Mestre usa o mesmo "Agir contra um Dogma".
- **Conjuração Divina:** lista Divina, CD com Sabedoria, magias conhecidas n + 2 (+2 por **Sementes de Magia**), até o 5º nível de magia (17º). **Afinidade Natural:** +1 na CD das magias de Natureza.
- **Mudar de Forma:** "Assumir Forma" na aba Classe, com as Formas que o Druida tem (Lobo, Urso, Águia, Serpente, Aranha, Tubarão). Cria o efeito "Forma: X" até o fim da cena e a arma natural (Luta; +1 passo no 11º e no 17º). A Defesa vira 10 + Destreza + bônus da forma, sem armadura nem escudo. Sob a Forma, magias, itens e armas ficam bloqueados (**Palavra na Fera** e **Mil Formas** liberam as magias). Voltar é um botão; ficar Inconsciente também encerra a Forma. Mergulho, Frenesi e Faro de Caçador viram opções no ataque; Derrubar, Abraço, Constrição e Alcateia aparecem como lembrete; Teia tem botão (1/cena). PV temporários do Urso e Fera Ancestral vão para o chat.
- **Mosaico Vivo:** escolhe 1 parte (2 no 10º, 3 no 16º) até o fim da cena, sem bloquear nada.
- **Ervas Frescas:** "Preparar ervas" (o Mestre confirma o descanso em ambiente natural) e "Usar erva" (cura 1d6 a 4d6 ou remove condição). Mãos de Seiva, Boticário, Erva Rara, Desabrochar e Infusão Revigorante entram nos diálogos.
- **Círculo** (Fera, Mata, Broto) permanente: habilidades e poderes só do Círculo escolhido. **Instinto Bestial:** 2 Formas de graça (não ocupam escolha de poder) e −1 PM em todas. Raízes Vigilantes, Floresta Desperta, Florescer, Espinhos de Retorno, Seiva Pegajosa, Flor Protetora, Canteiro e Primavera rolam e postam no chat.
- **Caminho das Raízes:** lista de Árvores Conhecidas (limite Sabedoria + metade do nível; a mais antiga é esquecida), guarda a cena e o ponto do token; o portal cobra 4 PM (+1 por criatura com Trilha Compartilhada) e o Mestre move o token.
- **Sangue Verde** (imune a Doente) e **Mil Formas** (1/dia; troca livre sem PM, +2d6 nas armas naturais, Fatigado no fim da cena; o "Passou 1 dia" do Mestre libera de novo).

## 0.27.2

### Custo das habilidades que recuperam PM
- `classes.json` reimportado: **Embalo de Batalha** (Guerreiro), **Meditação de Combate** (Samurai), **Fúria Sanguinária** (Bárbaro) e **Mana Transbordante** (Arcanista) ficam **sem custo**, como a Dívida Paga (Paladino). O número do texto ("recupera 1 PM", "1d6 PM", "2 PM") tinha sido lido como custo. Assim elas não mostram mais um botão "Usar" cobrando PM.
- As fichas que já tinham essas habilidades são corrigidas na primeira abertura do mundo pelo Mestre. Um custo ajustado à mão fica como está.

## 0.27.1

### Paladino: respostas do Mestre
- **Último Aviso:** os +4 de dano valem no primeiro ataque contra **cada** sentenciada na cena (antes era um só por cena). Uma nova sentenciada, pela Cadeia de Sentenças ou por um novo Olhar do Juiz, ganha os +4 de novo. O marcador zera no fim da cena.
- **Dívida Paga:** sem custo (recupera 2 PM). O "2 PM" do `classes.json` vinha do texto e foi corrigido.
- **Retribuição:** confirmado como estava: o 1 PM é da marcação; a reação não cobra PM.

## 0.27.0

### Paladino
- `classes.json` com o **Paladino** (12 classes; 19 habilidades e 30 poderes; 444 poderes no total). PV 18 + CON (+4 + CON por nível), **PM 4 por nível, fixo** (sem atributo). Carisma só nas habilidades e na CD das magias. Luta e Vontade + 3 perícias; armas simples e marciais, armaduras pesadas e escudos, sem túnicas.
- **Fé Jurada:** mesma escolha permanente do Clérigo; o Paladino escolhe **2 dos 3 Poderes Concedidos**. A aba Classe mostra o Dogma e a **Palavra Empenhada**; o Mestre usa o mesmo "Agir contra um Dogma".
- **Punição Consagrada:** botão no card de ataque corpo a corpo. Gasta até 1/2/3/4/5 PM (pelo nível; +1 contra a sentenciada; sem limite na Hora Final), +1d6 de Essência por PM (d8 contra mortos-vivos; Lâmina de Essência d8/d10; Golpe Final +1d6). No mesmo card: **Carga Fulgurante** e o **Veredito**.
- **Toque Restaurador:** Nd8 + Carisma (1d8 no 2º até 5d8 no 17º), 2 PM (1 com Mãos Abertas), uma vez por cena por criatura (com aviso). Alívio Imediato, Remédio dos Fiéis, Mãos Largas, Aliado Primeiro e Chama Persistente no diálogo.
- **Voto** (Muralha, Mão Aberta, Sentença) permanente: habilidades e poderes só do Voto escolhido. Muralha Inquebrável (RD 5 e +2 Defesa nos aliados), Aurora de Esperança, Olhar do Juiz (sentenciada, +1 no ataque), Olhar sem Piedade, Dívida Paga, Cadeia de Sentenças, Último Aviso e Veredito.
- **Aura de Resguardo** (informação e interruptor no Paladino), **Coragem Inabalável** (imune a Abalado e Apavorado), **Hora Final** (1/dia: +2 ataque e Defesa, RD 5, fica em 1 PV uma vez, Fatigado no fim da cena).
- **Preces de Guerra:** única forma de o Paladino lançar magias (2 Divinas por escolha; 1º nível de magia no 5º, 2º no 9º, 3º no 13º, 4º no 17º; CD com Carisma). Sem o poder, a aba Magias mostra o aviso.
- **Fé Marcial** (Carisma no ataque e dano corpo a corpo, opção no diálogo), **Retribuição** (só contra a criatura marcada), **Corpo Escudo** (reduz o próximo dano em 1 + nível), **Fôlego da Fé** (cura só o Paladino).

## 0.26.1

### Correções: alvos da área e Teste de Concentração
- Os alvos que a área de uma magia marca (por exemplo, a esfera da Inversão da Gravidade, que pegou o próprio conjurador) valem só para aquela magia. Um dano de outra origem aplicado depois vai para os tokens selecionados, com um aviso. Se o jogador mudar os alvos à mão, os novos alvos valem normalmente.
- O cartão "Teste de Concentração CD N" agora sai direto do botão de aplicar dano (por quem aplicou, jogador ou Mestre), em vez de depender da atualização do PV.
- A magia de concentração ou sustentada entra na lista de mantidas logo depois do cartão da magia, mesmo que a rolagem dê erro.

## 0.26.0

### Sustentada × concentração (correção de regra)
- `magias.json` atualizado: Espectro Ilusório, Assassino Fantasmagórico, Projetar Consciência, Prisão de Ilusões, Inversão da Gravidade e Moldar Pensamentos passam de "sustentada (concentração)" para **concentração**. As durações agora são tipos separados.
- **Sustentada:** ao lançar, a magia fica mantida e custa **1 PM no início de cada turno** do conjurador; sem PM, termina. Nunca pede Teste de Concentração. **Magia Duradoura** (Arcanista) só vale para sustentadas: +2 PM ao lançar e ela não paga mais por turno.
- **Concentração:** sem custo por turno; dura até o fim da cena ou até encerrar. Ao sofrer dano, o conjurador recebe o botão **"Teste de Concentração CD N"**, com **CD = 10 + nível da magia + 2** (3º nível → CD 15, qualquer que seja o nível do conjurador). Falhou, a magia termina. Só uma por vez (duas com **Mente Dividida**; perdeu uma, perde as duas). Termina também com Atordoado, Inconsciente, Paralisado, Pasmo ou Indefeso.
- Aba Magias: lista das magias mantidas com o botão **Encerrar**. Todas terminam em "Encerrar cena".

## 0.25.3

### Papel de parede: nome novo do arquivo
- O papel de parede do cartão do sistema passou a se chamar `img/ui/wallpaper-sistema.webp` (o original em `wallpaper-sistema.png`). Com o nome antigo, o navegador continuava mostrando a imagem velha do cache.

## 0.25.2

### Papel de parede corrigido
- `img/ui/wallpaper-fvtt.png` e `wallpaper-fvtt.webp` trocados pela imagem certa (1920×1080, com o logo Icarus). O cartão do sistema na tela de configuração continua apontando para o mesmo arquivo.

## 0.25.1

### Clérigo: Arma Consagrada no ataque
- Ao usar **Arma Consagrada**, a arma empunhada fica consagrada até o fim da cena. No diálogo de ataque dela aparece a opção **Arma Consagrada** (já marcada): **Sabedoria** no lugar do atributo no teste de ataque e no dano, e o dado da arma sobe **um passo** (1d4 → 1d6 → 1d8 → 1d10 → 1d12 → 3d6 → 4d6 → 4d8…; com 2 ou mais dados, o tipo do dado sobe: 2d6 → 2d8, 2d12 → 3d12). O ataque rápido também usa.

## 0.25.0

### Clérigo, PM dos conjuradores, imagens dos focos e papel de parede
- **Correção de regra: PM dos conjuradores** (Núcleo, seção 4). O atributo-chave soma ao PM **uma vez, no 1º nível**; cada nível seguinte soma só o incremento da classe: **PM = base × nível + atributo**. Bases novas: Mago e Mago de Sangue 5 (INT), Feiticeiro 6 (CAR), Bardo 4 (CAR), Clérigo 4 (SAB); o Monge já era assim. Fichas já existentes de Arcanista e Bardo são recalculadas na primeira abertura do mundo pelo Mestre (o PM atual não passa do novo máximo; fichas em modo manual ficam como estão).
- **Clérigo** (11 classes; 5 habilidades e 28 poderes): PV 16 + CON (+4 + CON por nível), PM 4 + SAB no 1º (+4 por nível), Religião e Vontade + 4 perícias, armas simples, todas as armaduras e escudos, sem túnicas.
- **Fé Jurada:** escolha permanente de 1 das 20 divindades; grava a devoção da ficha e concede os **3 Poderes Concedidos**. Só o Mestre troca. A aba Classe mostra o Dogma.
- **Agir contra um Dogma** (botão do Mestre): na 1ª vez zera o PM e bloqueia a recuperação por 1d4 dias (contador "Passou 1 dia"); na 2ª a divindade abandona o clérigo (sai a devoção e os Poderes Concedidos, aviso de **Anátema**; a classe não muda sozinha).
- **Conjuração Divina:** lista Divina com Sabedoria, magias até o 5º nível (17º), conhecidas nível + 2 (+2 por Teologia).
- **Onda de Fé** (até SAB + 2 PM: cura Nd6 nos vivos e Nd6 de Essência nos mortos-vivos; Onda Ampla), **Solo Sagrado**, **Intervenção Divina** (1d100 ≤ nível, sempre no 20º; 7 dias de espera ou uma noite depois da falha), **Milagre** (3 magias Divinas sem o custo base, depois Atordoado 1d4 rodadas), **Palavra de Resguardo** (reduz o próximo dano do aliado), **Última Graça**, **Fé como Escudo** e **Arma Consagrada**.
- **Imagens dos 6 focos arcanos** (Varinha, Cetro de Osso, Grimório, Cetro de Ferro, Orbe de Prata e Bordão Arcano) no compêndio Itens Comuns e nas fichas que ainda tinham o ícone padrão. Script repetível: `npm run build:icones-focos -- --de "<pasta>"`.
- **Papel de parede do sistema** no cartão "Icarus RPG" da tela de configuração (`media` do tipo `setup` e `background` no `system.json`, arquivo `img/ui/wallpaper-fvtt.webp`). O fundo "sem cena" (`img/ui/wallpaper.webp`) não mudou.

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
