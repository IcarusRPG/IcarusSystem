# Automação das magias: proposta para validar

Gerado por `npm run magias:automacao` a partir do texto de cada magia. **Nada é usado como pronto antes da sua validação:** responda por lote (ex.: "lote 1 ok, exceto Bola de Fogo: ..."), e as magias aprovadas recebem `"validada": true` em `tools/dados/magias_automacao.json`.

- Magias: 200
- Confiança **auto** (padrão claro): 66
- **manual** (revisar com atenção): 50
- **somente-texto** (gasta PM e mostra o cartão): 84
- Validadas: 0

Legenda: resistência *metade* = sucesso sofre metade; *anula* = sucesso não sofre nada / não recebe a condição; *parcial* = o efeito do sucesso fica no texto. "não acumula" = bônus de Defesa de magias (vale o maior).

## Lote 1: dano e cura (54)

| Magia | Nível | Proposta | Confiança | Observações |
|---|---|---|---|---|
| Chama Sagrada | 1º | **Dano** 3d6 luz · Reflexos anula · aprimoramentos: #1 +1d6 luz<br>VFX projetil/luz | auto |  |
| Chicote de Sangue | 1º | **Dano** 3d6 corte · Reflexos metade · aprimoramentos: #1 +1d6 corte<br>VFX projetil/sangue | auto |  |
| Cone de Chamas | 1º | **Dano** 2d6 fogo · área cone 4,5 m · Reflexos metade · aprimoramentos: #1 +1d6 fogo<br>VFX cone/fogo | auto |  |
| Curar Ferimentos | 1º | **Cura** 2d8+2 · aprimoramento +1d8+1 | auto | contra mortos-vivos vira dano (aplicar à mão) |
| Escudo Carmesim | 1º | **Dano** 1d6 trevas<br>**Efeito** (pessoal, cena) +2 defesa (não acumula), +2 reducao:corte, +2 reducao:perfuracao<br>VFX projetil/sangue | manual | bônus/penalidade com condição ("contra", "até o fim", "próximo teste"): conferir |
| Fome Carmesim | 1º | **Cura** 1d6 | auto |  |
| Golpe Espiritual | 1º | **Dano** 3d6 essencia · Vontade metade · aprimoramentos: #1 +1d6 essencia<br>VFX projetil/essencia | auto |  |
| Mísseis Mágicos | 1º | **Dano** 1d4+1+1d4+1+1d4+1 essencia · aprimoramentos: #1 +1d4+1 essencia<br>**Efeito** (alvo, instantanea) +1 dano<br>VFX projetil/essencia | manual | dano condicional ou por dardo: "Cada dardo causa 1d4+1 de dano de essência"<br>3 dardos de 1d4+1 somados num alvo; dividir entre alvos é à mão<br>efeito com duração instantânea: conferir quanto tempo dura |
| Pulso de Mana | 1º | **Dano** 2d6 impacto · Fortitude metade · aprimoramentos: #1 +1d6 impacto<br>VFX projetil/arcano | auto |  |
| Toque Vampírico | 1º | **Dano** 3d6 trevas · Fortitude metade · aprimoramentos: #1 +1d6 trevas<br>VFX aura/sangue | auto |  |
| Arma Sagrada | 2º | **Dano** 1d6 luz<br>VFX aura/luz | auto |  |
| Cipós Prensores | 2º | **Dano** 2d6 impacto · área quadrado 6 m · Reflexos anula<br>**Efeito** (alvo, cena) condição enredado · Reflexos anula<br>VFX chuva/arcano | auto |  |
| Despedaçar | 2º | **Dano** 4d6 impacto · área esfera 3 m · Fortitude metade · aprimoramentos: #1 +1d6 impacto<br>VFX explosao/arcano | auto |  |
| Flecha Ácida | 2º | **Dano** 4d6 acido · Reflexos metade · aprimoramentos: #1 +1d6 acido<br>VFX projetil/acido | auto |  |
| Garras Carmesins | 2º | **Dano** 1d8 corte<br>**Efeito** (pessoal, cena) condição sangrando<br>VFX projetil/arcano | auto |  |
| Hemorragia | 2º | **Dano** 4d6 trevas · Fortitude metade · aprimoramentos: #1 +1d6 trevas<br>VFX projetil/sangue | auto |  |
| Lança de Luz | 2º | **Dano** 5d6 luz · Reflexos metade · aprimoramentos: #1 +1d6 luz<br>**Efeito** (alvo, rodadas 1) condição ofuscado · Reflexos anula<br>VFX projetil/luz | auto |  |
| Pele de Casca | 2º | **Dano** 1d6 dano<br>**Efeito** (alvo, cena) +3 defesa (não acumula), +2 reducao:corte, +2 reducao:perfuracao<br>VFX aura/arcano | manual | bônus/penalidade com condição ("contra", "até o fim", "próximo teste"): conferir |
| Sangue Vivo | 2º | **Cura** 3d8 | auto |  |
| Bola de Fogo | 3º | **Dano** 6d6 fogo · área esfera 6 m · Reflexos metade · aprimoramentos: #1 +1d6 fogo<br>VFX explosao/fogo | auto |  |
| Chuva de Sangue | 3º | **Dano** 6d6 acido · área esfera 6 m · Fortitude metade · aprimoramentos: #1 +1d6 acido<br>**Efeito** (alvo, instantanea) condição sangrando · Fortitude anula<br>VFX explosao/sangue | manual | efeito com duração instantânea: conferir quanto tempo dura |
| Convocar Espírito da Natureza | 3º | **Dano** 3d6 impacto + 2d6 eletrico + 4d6 eletrico · aprimoramentos: #1 +1d6 impacto<br>**Cura** 3d8+3<br>**Efeito** (alvo, cena) +1 defesa (não acumula), +3 rd, condição enredado<br>VFX projetil/arcano | auto |  |
| Cura em Massa | 3º | **Cura** 3d8+3 · aprimoramento +1d8+1 | auto |  |
| Espíritos Guardiões | 3º | **Dano** 3d8 luz · área esfera 4,5 m · Vontade metade<br>**Efeito** (pessoal, sustentada) condição lento · Vontade anula<br>VFX explosao/luz | auto | duração sustentada |
| Lamento Espectral | 3º | **Dano** 6d6 essencia · área cone 9 m · Vontade metade · aprimoramentos: #1 +1d6 essencia<br>**Efeito** (alvo, rodadas 1) condição abalado · Vontade anula<br>VFX cone/essencia | auto |  |
| Relâmpago | 3º | **Dano** 6d6 eletrico · área linha 18 m · Reflexos metade · aprimoramentos: #1 +1d6 eletrico<br>**Efeito** (alvo, rodadas 1) condição ofuscado · Reflexos anula<br>VFX linha/eletrico | auto |  |
| Explosão Hemorrágica | 4º | **Dano** 10d6 trevas · Fortitude parcial<br>VFX projetil/sangue | manual | resistência parcial: o efeito no sucesso fica no texto (o Mestre aplica) |
| Forma Selvagem | 4º | **Dano** 2d8 corte<br>**Efeito** (pessoal, cena) +5 rd<br>VFX projetil/arcano | manual | bônus/penalidade com condição ("contra", "até o fim", "próximo teste"): conferir |
| Guardião da Fé | 4º | **Dano** 6d6 luz · Vontade metade<br>VFX projetil/luz | auto |  |
| Hino de Coragem | 4º | **Dano** 1d6 dano · área esfera 9 m<br>**Efeito** (pessoal, sustentada) +2 resistencia<br>VFX explosao/arcano | auto | duração sustentada |
| Horda de Sombras | 4º | **Dano** 8d6 psiquico · área esfera 6 m · Vontade metade · aprimoramentos: #1 +2d6 psiquico<br>**Efeito** (alvo, instantanea) condição abalado · Vontade anula<br>VFX explosao/espirito | manual | efeito com duração instantânea: conferir quanto tempo dura |
| Lanças de Sangue | 4º | **Dano** 4d6 perfuracao · Reflexos metade<br>VFX projetil/sangue | auto |  |
| Manto Sagrado | 4º | **Dano** 2d8 luz · área esfera 6 m<br>**Efeito** (pessoal, sustentada) +2 defesa (não acumula), +3 rd<br>VFX explosao/luz | auto | duração sustentada |
| Martelo do Julgamento | 4º | **Dano** 8d6 luz + 4d6 impacto · Fortitude parcial · aprimoramentos: #1 +1d6 luz<br>**Efeito** (alvo, rodadas 1) condição atordoado · Fortitude parcial<br>VFX projetil/luz | manual | resistência parcial: o efeito no sucesso fica no texto (o Mestre aplica) |
| Muralha de Espinhos | 4º | **Dano** 4d6 perfuracao · Reflexos metade<br>**Efeito** (alvo, cena) condição sangrando · Reflexos anula<br>VFX projetil/arcano | auto |  |
| Muralha de Fogo | 4º | **Dano** 6d6 fogo · Reflexos metade · aprimoramentos: #1 +1d6 fogo<br>**Efeito** (alvo, cena) condição em-chamas · Reflexos anula<br>VFX projetil/fogo | auto |  |
| Muralha de Ossos | 4º | **Dano** 4d6 perfuracao<br>VFX projetil/arcano | auto |  |
| Porta Dimensional | 4º | **Dano** 4d6 impacto<br>VFX projetil/arcano | auto |  |
| Servo de Sangue | 4º | **Dano** 2d8+4 corte<br>**Efeito** (alvo, cena) +4 dano<br>VFX projetil/sangue | auto |  |
| Tempestade de Gelo | 4º | **Dano** 4d6 impacto + 4d6 frio · área esfera 6 m · Reflexos metade · aprimoramentos: #1 +1d6 frio<br>**Efeito** (alvo, instantanea) condição lento · Reflexos anula<br>VFX explosao/arcano | manual | efeito com duração instantânea: conferir quanto tempo dura |
| Tormenta de Estilhaços | 4º | **Dano** 8d6 corte · área esfera 4,5 m · Reflexos metade · aprimoramentos: #1 +1d6 corte<br>**Efeito** (alvo, instantanea) condição sangrando · Reflexos anula<br>VFX explosao/arcano | manual | efeito com duração instantânea: conferir quanto tempo dura |
| Chuva de Meteoros | 5º | **Dano** 6d6 impacto + 6d6 fogo · Reflexos metade<br>VFX projetil/arcano | auto |  |
| Colapso Gravitacional | 5º | **Dano** 10d6 impacto · área esfera 6 m · Fortitude metade · aprimoramentos: #1 +1d6 impacto<br>**Efeito** (alvo, instantanea) condição caido · Fortitude anula<br>VFX explosao/arcano | manual | efeito com duração instantânea: conferir quanto tempo dura |
| Coluna Flamejante | 5º | **Dano** 6d6 fogo + 6d6 luz · área esfera 6 m · Reflexos metade · aprimoramentos: #1 +1d6 fogo<br>VFX pilar/fogo | auto |  |
| Cone Glacial | 5º | **Dano** 12d6 frio · área cone 12 m · Fortitude metade · aprimoramentos: #1 +1d6 frio<br>**Efeito** (alvo, rodadas 1) condição lento · Fortitude anula<br>VFX cone/frio | auto |  |
| Desintegrar | 5º | **Dano** 14d6 essencia · Fortitude parcial · aprimoramentos: #1 +1d6 essencia<br>VFX projetil/essencia | manual | resistência parcial: o efeito no sucesso fica no texto (o Mestre aplica) |
| Exsanguinar | 5º | **Dano** 15d6 trevas · Fortitude parcial<br>VFX projetil/sangue | manual | resistência parcial: o efeito no sucesso fica no texto (o Mestre aplica) |
| Forma de Colosso | 5º | **Dano** 2d6 dano<br>**Efeito** (pessoal, cena) +5 rd<br>VFX projetil/arcano | manual | bônus/penalidade com condição ("contra", "até o fim", "próximo teste"): conferir |
| Ira dos Céus | 5º | **Dano** 6d6 eletrico + 6d6 impacto · área esfera 12 m · Reflexos metade · aprimoramentos: #1 +1d6 eletrico +1d6 impacto<br>VFX explosao/eletrico | manual | bônus/penalidade com condição ("contra", "até o fim", "próximo teste"): conferir |
| Julgamento Final | 5º | **Dano** 12d6 luz · Vontade parcial<br>**Efeito** (alvo, instantanea) condição vulneravel · Vontade parcial<br>VFX projetil/luz | manual | efeito com duração instantânea: conferir quanto tempo dura<br>resistência parcial: o efeito no sucesso fica no texto (o Mestre aplica) |
| Maré Carmesim | 5º | **Dano** 12d6 trevas · área esfera 9 m · Fortitude metade · aprimoramentos: #1 +1d6 trevas<br>**Efeito** (alvo, instantanea) condição sangrando · Fortitude anula<br>VFX explosao/sangue | manual | efeito com duração instantânea: conferir quanto tempo dura |
| Onda Necrótica | 5º | **Dano** 12d6 trevas · área esfera 12 m · Fortitude metade · aprimoramentos: #1 +2d6 trevas<br>VFX explosao/trevas | auto |  |
| Sentença de Sangue | 5º | **Dano** 2d6 trevas · Vontade anula<br>**Efeito** (alvo, outra) -2 testes · Vontade anula<br>VFX projetil/sangue | auto |  |
| Tempestade de Relâmpagos | 5º | **Dano** 12d6 eletrico + 1d6 dano · área esfera 12 m · Reflexos metade · aprimoramentos: #1 +2d6 eletrico<br>**Efeito** (alvo, rodadas 1) condição atordoado · Reflexos anula<br>VFX explosao/eletrico | auto |  |

## Lote 2: bônus, penalidade e condição (61)

| Magia | Nível | Proposta | Confiança | Observações |
|---|---|---|---|---|
| Acalmar Espírito | 1º | **Efeito** (alvo, instantanea) condição abalado | manual | bônus/penalidade com condição ("contra", "até o fim", "próximo teste"): conferir<br>efeito com duração instantânea: conferir quanto tempo dura |
| Arma Encantada | 1º | **Efeito** (alvo, cena) +1 ataque, +1 dano | auto |  |
| Armadura Arcana | 1º | **Efeito** (pessoal, cena) +4 defesa (não acumula) | auto |  |
| Bênção | 1º | **Efeito** (alvo, cena) +1 ataque, +1 resistencia | auto |  |
| Escudo Arcano | 1º | **Efeito** (pessoal, instantanea) +5 defesa (não acumula) | manual | bônus/penalidade com condição ("contra", "até o fim", "próximo teste"): conferir<br>efeito com duração instantânea: conferir quanto tempo dura |
| Escudo da Fé | 1º | **Efeito** (alvo, instantanea) +4 defesa (não acumula) | manual | bônus/penalidade com condição ("contra", "até o fim", "próximo teste"): conferir<br>efeito com duração instantânea: conferir quanto tempo dura |
| Oferenda de Sangue | 1º | **Efeito** (alvo, cena) +2 ataque, +2 dano | auto |  |
| Proteção contra o Mal | 1º | **Efeito** (alvo, cena) +2 defesa (não acumula), +2 resistencia | manual | bônus/penalidade com condição ("contra", "até o fim", "próximo teste"): conferir |
| Raio Debilitante | 1º | **Efeito** (alvo, cena) condição fraco · Fortitude anula | auto |  |
| Sangria | 1º | **Efeito** (alvo, instantanea) condição sangrando · Fortitude anula | manual | efeito com duração instantânea: conferir quanto tempo dura |
| Sono | 1º | **Efeito** (alvo, cena) condição inconsciente · Vontade anula | auto |  |
| Teia | 1º | **Efeito** (alvo, cena) condição enredado · Reflexos anula | manual | dano condicional ou por situação: "qualquer fogo que a toque a incendeia por inteiro de uma vez, destruindo-a em 1 rodada e causando 2d6 de dano de fogo a quem estiver nela" |
| Drenar Vigor | 2º | **Efeito** (alvo, instantanea) condição fatigado · Fortitude parcial | manual | efeito com duração instantânea: conferir quanto tempo dura<br>resistência parcial: o efeito no sucesso fica no texto (o Mestre aplica) |
| Enfeitiçar Pessoa | 2º | **Efeito** (alvo, cena) condição enfeiticado · Vontade anula | auto |  |
| Exortar Espíritos | 2º | **Efeito** (alvo, rodadas 1) condição apavorado · Vontade anula | auto |  |
| Hipnotismo | 2º | **Efeito** (alvo, sustentada) condição fascinado · Vontade anula | auto | duração sustentada |
| Silêncio | 2º | **Efeito** (alvo, cena) condição surdo · Vontade anula | manual | resistência com ressalva: só criaturas |
| Sussurro de Sangue | 2º | **Efeito** (alvo, cena) -2 ataque · Vontade anula | auto |  |
| Véu da Alma | 2º | **Efeito** (alvo, cena) +5 resistencia | manual | bônus/penalidade com condição ("contra", "até o fim", "próximo teste"): conferir |
| Véu Rubro | 2º | **Efeito** (alvo, cena) condição enjoado | manual | dano condicional ou por situação: "camuflagem leve, e quem respirar nela sofre 1d6 de dano de veneno no início do turno" |
| Algemas Espirituais | 3º | **Efeito** (alvo, cena) condição paralisado · Vontade anula | auto |  |
| Cárcere de Espelhos | 3º | **Efeito** (alvo, cena) condição frustrado · Vontade anula | auto |  |
| Corpo de Sangue | 3º | **Efeito** (pessoal, cena) +5 reducao:corte, +5 reducao:perfuracao, +5 reducao:impacto | auto |  |
| Espectro Ilusório | 3º | **Efeito** (alvo, concentracao) condição apavorado · Vontade parcial | manual | resistência parcial: o efeito no sucesso fica no texto (o Mestre aplica)<br>duração concentracao |
| Imobilizar | 3º | **Efeito** (alvo, sustentada) condição paralisado · Vontade anula | auto | duração sustentada |
| Lentidão | 3º | **Efeito** (alvo, cena) -2 defesa, -2 pericia:reflexos, condição lento · Fortitude anula | auto |  |
| Manto de Sombras | 3º | **Efeito** (pessoal, cena) +3 reducao:luz | manual | bônus/penalidade com condição ("contra", "até o fim", "próximo teste"): conferir |
| Projeção Espiritual | 3º | **Efeito** (pessoal, sustentada) condição inconsciente | auto | duração sustentada |
| Proteção contra Energia | 3º | **Efeito** (alvo, cena) +2 resistencia | manual | bônus/penalidade com condição ("contra", "até o fim", "próximo teste"): conferir |
| Revivificar | 3º | **Efeito** (alvo, instantanea) condição fatigado | manual | efeito com duração instantânea: conferir quanto tempo dura |
| Rogar Maldição | 3º | **Efeito** (alvo, cena) -3 ataque, -3 dano · Vontade anula | manual | bônus/penalidade com condição ("contra", "até o fim", "próximo teste"): conferir |
| Sede de Sangue | 3º | **Efeito** (alvo, cena) +2 ataque, +2 dano, -2 defesa | auto |  |
| Selo de Descanso | 3º | **Efeito** (alvo, outra) -2 defesa, -2 ataque | auto |  |
| Sentido de Perigo | 3º | **Efeito** (alvo, cena) +5 pericia:reflexos, condição desprevenido | manual | bônus/penalidade com condição ("contra", "até o fim", "próximo teste"): conferir |
| Tendões Rubros | 3º | **Efeito** (alvo, sustentada) condição agarrado · Reflexos anula | manual | dano condicional ou por situação: "Quem falhar no teste fica Agarrado e Sangrando, e sofre 2d6 de dano de corte no início de cada turno dele enquanto estiver preso"<br>duração sustentada |
| Velocidade | 3º | **Efeito** (alvo, rodadas 1) +2 defesa (não acumula), +2 pericia:reflexos, condição fatigado | auto |  |
| Assassino Fantasmagórico | 4º | **Efeito** (alvo, concentracao) condição apavorado · Vontade parcial | manual | dano condicional ou por situação: "se falhar, sofre 6d6 de dano psíquico e fica Apavorado; se passar, sofre metade e a magia termina"<br>resistência parcial: o efeito no sucesso fica no texto (o Mestre aplica)<br>duração concentracao |
| Aura de Pureza | 4º | **Efeito** (pessoal, sustentada) +5 resistencia, +2 reducao:veneno | manual | bônus/penalidade com condição ("contra", "até o fim", "próximo teste"): conferir<br>duração sustentada |
| Banimento | 4º | **Efeito** (alvo, rodadas 1) condição atordoado · Vontade anula | auto |  |
| Confusão | 4º | **Efeito** (alvo, rodadas 4) condição confuso · Vontade anula | auto |  |
| Exorcismo | 4º | **Efeito** (alvo, rodadas 1) condição atordoado · Vontade parcial | manual | dano condicional ou por situação: "Se o alvo for um morto-vivo, espírito ou criatura profana, ele sofre 8d6 de dano de luz e, se falhar no teste, fica Atordoado por 1 rodada (se passar, sofre metade do dano)"<br>resistência parcial: o efeito no sucesso fica no texto (o Mestre aplica) |
| Glifo de Sangue | 4º | **Efeito** (alvo, outra) condição sangrando · Reflexos anula | manual | dano condicional ou por situação: "Quando uma criatura (que não seja você nem aliados que você tenha indicado) tocar o glifo, abrir o objeto marcado ou entrar na área, ele explode em uma esfera de 4,5 m de raio e causa 8d6 de dano de trevas" |
| Inversão da Gravidade | 4º | **Efeito** (alvo, concentracao) -2 defesa, condição caido · Reflexos anula | manual | dano condicional ou por situação: "Quando a magia termina, elas caem e sofrem 6d6 de dano de impacto (a queda não anula Reflexos)"<br>duração concentracao |
| Liberdade de Movimento | 4º | **Efeito** (alvo, cena) condição agarrado | auto |  |
| Metamorfose Sanguínea | 4º | **Efeito** (pessoal, cena) +4 defesa (não acumula), +2 ataque, +2 dano | auto |  |
| Nuvem de Podridão | 4º | **Efeito** (alvo, cena) condição enjoado · Fortitude parcial | manual | dano condicional ou por situação: "Criaturas na área sofrem 6d6 de dano de trevas ao entrar e no início de cada turno; quem passar sofre metade e fica Enjoado"<br>resistência parcial: o efeito no sucesso fica no texto (o Mestre aplica) |
| Pele de Pedra | 4º | **Efeito** (alvo, cena) +5 reducao:corte, +5 reducao:perfuracao, +5 reducao:impacto | manual | bônus/penalidade com condição ("contra", "até o fim", "próximo teste"): conferir |
| Peste Carmesim | 4º | **Efeito** (alvo, cena) condição fraco · Fortitude anula | auto |  |
| Rasgar o Véu | 4º | **Efeito** (alvo, cena) -2 defesa, -2 ataque · Vontade anula | auto |  |
| Semblante Divino | 4º | **Efeito** (pessoal, cena) condição abalado · Vontade anula | manual | bônus/penalidade com condição ("contra", "até o fim", "próximo teste"): conferir |
| Aprisionamento | 5º | **Efeito** (alvo, outra) condição inconsciente, condição paralisado · Vontade anula | auto |  |
| Eclipse Carmesim | 5º | **Efeito** (pessoal, sustentada) +1 ataque, +1 dano · Fortitude anula | manual | dano condicional ou por situação: "No início de cada turno seu, inimigos na área sofrem 4d6 de dano de trevas e você recupera 10 PV"<br>duração sustentada |
| Forma de Vampiro | 5º | **Efeito** (pessoal, cena) +2 ataque, +2 dano | manual | bônus/penalidade com condição ("contra", "até o fim", "próximo teste"): conferir |
| Hoste Ancestral | 5º | **Efeito** (pessoal, sustentada) +2 ataque, +2 resistencia, +3 rd | manual | dano condicional ou por situação: "Mortos-vivos e espíritos hostis na área sofrem 4d6 de dano de luz no início de cada turno seu"<br>duração sustentada |
| Onda de Desespero | 5º | **Efeito** (alvo, cena) condição esmorecido · Vontade parcial | manual | resistência parcial: o efeito no sucesso fica no texto (o Mestre aplica) |
| Palavra Divina | 5º | **Efeito** (alvo, rodadas 1) condição atordoado · Vontade anula | auto |  |
| Prisão de Ilusões | 5º | **Efeito** (alvo, concentracao) condição pasmo · Vontade anula | auto | duração concentracao |
| Projetar Consciência | 5º | **Efeito** (pessoal, concentracao) condição indefeso | auto | duração concentracao |
| Ressurreição | 5º | **Efeito** (alvo, instantanea) condição debilitado | manual | efeito com duração instantânea: conferir quanto tempo dura |
| Sangue Ancestral | 5º | **Efeito** (pessoal, rodadas 1) condição exausto | manual | bônus/penalidade com condição ("contra", "até o fim", "próximo teste"): conferir |
| Tribunal das Almas | 5º | **Efeito** (alvo, instantanea) condição abalado · Vontade anula | manual | dano condicional ou por situação: "Mortos-vivos, espíritos e criaturas profanas sofrem 14d6 de dano de luz; os demais sofrem 7d6 de dano de essência e ficam Abalados"<br>dano condicional ou por situação: "Mortos-vivos, espíritos e criaturas profanas sofrem 14d6 de dano de luz; os demais sofrem 7d6 de dano de essência e ficam Abalados"<br>efeito com duração instantânea: conferir quanto tempo dura |

## Lote 3: só texto e casos especiais (85)

| Magia | Nível | Proposta | Confiança | Observações |
|---|---|---|---|---|
| Criar Alimento | 1º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Detectar Magia | 1º | só texto (gasta PM e mostra o cartão) | somente-texto | duração sustentada |
| Disfarce Ilusório | 1º | só texto (gasta PM e mostra o cartão) | somente-texto | resistência com ressalva: para desmascarar<br>bônus/penalidade com condição ("contra", "até o fim", "próximo teste"): conferir |
| Falar com Animais | 1º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Falar com Espíritos | 1º | só texto (gasta PM e mostra o cartão) | somente-texto | bônus/penalidade com condição ("contra", "até o fim", "próximo teste"): conferir |
| Faro de Sangue | 1º | só texto (gasta PM e mostra o cartão) | somente-texto | bônus/penalidade com condição ("contra", "até o fim", "próximo teste"): conferir |
| Fio de Alarme | 1º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Ilusão Menor | 1º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Lâmina Rubra | 1º | **Arma conjurada** (Atacar com Luta) | manual |  |
| Luz | 1º | só texto (gasta PM e mostra o cartão) | somente-texto | resistência não reconhecida: "— (Vontade anula, só no aprimoramento)" |
| Mão Arcana | 1º | só texto (gasta PM e mostra o cartão) | somente-texto | duração sustentada |
| Marca de Sangue | 1º | só texto (gasta PM e mostra o cartão) | somente-texto | bônus/penalidade com condição ("contra", "até o fim", "próximo teste"): conferir |
| Olhar Espiritual | 1º | só texto (gasta PM e mostra o cartão) | somente-texto | bônus/penalidade com condição ("contra", "até o fim", "próximo teste"): conferir |
| Orientação Divina | 1º | só texto (gasta PM e mostra o cartão) | somente-texto | bônus/penalidade com condição ("contra", "até o fim", "próximo teste"): conferir |
| Palavra de Comando | 1º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Ruído Fantasma | 1º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Salto Arcano | 1º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Santuário | 1º | só texto (gasta PM e mostra o cartão) | somente-texto | resistência com ressalva: do atacante |
| Acalmar Emoções | 2º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Âncora de Mana | 2º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Arma Espiritual | 2º | só texto (gasta PM e mostra o cartão) | somente-texto | dano condicional ou por situação: "No momento em que é criada e em cada turno seu, como ação livre, ela atinge um alvo em alcance curto e causa 2d8 de dano de luz (acerta automaticamente)"<br>duração sustentada |
| Augúrio | 2º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Escudo dos Antepassados | 2º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Escuridão | 2º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Espírito Mensageiro | 2º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Imagem de Sangue | 2º | só texto (gasta PM e mostra o cartão) | somente-texto | dano condicional ou por situação: "Quando a cópia sofre dano, ela explode e causa 2d6 de dano de trevas nas criaturas adjacentes (Reflexos reduz à metade)" |
| Imagem Espelhada | 2º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Invisibilidade | 2º | só texto (gasta PM e mostra o cartão) | somente-texto | bônus/penalidade com condição ("contra", "até o fim", "próximo teste"): conferir |
| Ler Pensamentos | 2º | só texto (gasta PM e mostra o cartão) | somente-texto | bônus/penalidade com condição ("contra", "até o fim", "próximo teste"): conferir<br>duração sustentada |
| Levitação | 2º | só texto (gasta PM e mostra o cartão) | somente-texto | resistência com ressalva: se involuntário |
| Localizar Objeto | 2º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Névoa | 2º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Oração | 2º | só texto (gasta PM e mostra o cartão) | somente-texto | bônus/penalidade com condição ("contra", "até o fim", "próximo teste"): conferir<br>duração sustentada |
| Passo Espectral | 2º | só texto (gasta PM e mostra o cartão) | somente-texto | dano condicional ou por situação: "Se terminar o turno dentro de um obstáculo sólido, é expelido para o espaço livre mais próximo e sofre 4d6 de dano de impacto" |
| Passo Nebuloso | 2º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Patas de Aranha | 2º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Resistência a Energia | 2º | só texto (gasta PM e mostra o cartão) | somente-texto | bônus/penalidade com condição ("contra", "até o fim", "próximo teste"): conferir |
| Restauração Menor | 2º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Sentidos Agudos | 2º | só texto (gasta PM e mostra o cartão) | somente-texto | bônus/penalidade com condição ("contra", "até o fim", "próximo teste"): conferir |
| Tranca Arcana | 2º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Vínculo de Dor | 2º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Banquete Rubro | 3º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Cálice de Vitalidade | 3º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Chamado Selvagem | 3º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Chamar Relâmpagos | 3º | só texto (gasta PM e mostra o cartão) | somente-texto | dano condicional ou por situação: "Quando a magia é lançada, e depois como ação padrão em cada turno seu, um raio cai em um ponto à sua escolha e causa 4d6 de dano elétrico em esfera de 3 m de raio"<br>duração sustentada |
| Clarividência | 3º | só texto (gasta PM e mostra o cartão) | somente-texto | duração sustentada |
| Dissipar Magia | 3º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Esqueleto Servil | 3º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Falar com os Mortos | 3º | só texto (gasta PM e mostra o cartão) | somente-texto | resistência com ressalva: a cada pergunta |
| Forma Gasosa | 3º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Imagem Maior | 3º | só texto (gasta PM e mostra o cartão) | somente-texto | duração sustentada |
| Línguas | 3º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Luz do Dia | 3º | só texto (gasta PM e mostra o cartão) | somente-texto | bônus/penalidade com condição ("contra", "até o fim", "próximo teste"): conferir |
| Maldição de Sangue | 3º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Marionete de Sangue | 3º | só texto (gasta PM e mostra o cartão) | somente-texto | duração sustentada |
| Remover Maldição | 3º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Terreno Ilusório | 3º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Voo | 3º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Comunhão com a Natureza | 4º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Dominar Pessoa | 4º | só texto (gasta PM e mostra o cartão) | somente-texto | duração sustentada |
| Duplicata Ilusória | 4º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Enfeitiçar em Massa | 4º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Forma Etérea | 4º | só texto (gasta PM e mostra o cartão) | somente-texto | dano condicional ou por situação: "Se a magia terminar com você dentro de um objeto sólido, é expelido para o espaço livre mais próximo e sofre 6d6 de dano de impacto" |
| Nuvem de Morcegos | 4º | só texto (gasta PM e mostra o cartão) | somente-texto | dano condicional ou por situação: "Um enxame de morcegos de sangue cobre a área e causa 4d6 de dano de perfuração no início de cada turno seu a todas as criaturas nela, A visão fica limitada: camuflagem leve"<br>duração sustentada |
| Passo Carmesim | 4º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Restauração | 4º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Sentinela Ancestral | 4º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Vidência | 4º | só texto (gasta PM e mostra o cartão) | somente-texto | duração sustentada |
| Visão da Verdade | 4º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Alterar Destino | 5º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Ancestral Convocado | 5º | só texto (gasta PM e mostra o cartão) | somente-texto | bônus/penalidade com condição ("contra", "até o fim", "próximo teste"): conferir |
| Árvore da Vida | 5º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Cura Completa | 5º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Dominar Monstro | 5º | só texto (gasta PM e mostra o cartão) | somente-texto | bônus/penalidade com condição ("contra", "até o fim", "próximo teste"): conferir<br>duração sustentada |
| Eclipse Arcano | 5º | só texto (gasta PM e mostra o cartão) | somente-texto | duração sustentada |
| Libertação das Almas | 5º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Moldar Pensamentos | 5º | só texto (gasta PM e mostra o cartão) | somente-texto | dano condicional ou por situação: "** o alvo sente ferimentos que não existem; no início de cada turno dele, sofre 6d6 de dano psíquico (sem teste adicional)"<br>duração concentracao |
| Pacto Sanguinário | 5º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Parar o Tempo | 5º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Prisão Dimensional | 5º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Santuário Consagrado | 5º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Semiplano | 5º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Teleporte | 5º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Troca de Almas | 5º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
| Véu da Divindade | 5º | só texto (gasta PM e mostra o cartão) | somente-texto |  |
