# Icarus RPG — sistema para Foundry VTT

Sistema do **Icarus RPG**, um RPG de fantasia medieval original com testes de `1d20 + modificador`.
Esta primeira versão traz a **Ficha de Personagem** completa.

- **Foundry VTT:** versão 12 (verificado na 12.331). A migração para o v13 vem depois.
- **Id do sistema:** `icarus-rpg`
- **Idioma:** português do Brasil. O mesmo arquivo de tradução também é carregado quando o Foundry está em inglês, para a ficha nunca aparecer com as chaves cruas.

## Instalação

No Foundry: **Game Systems → Install System**, e cole no campo **Manifest URL**:

```
https://github.com/IcarusRPG/IcarusSystem/releases/latest/download/system.json
```

O link só funciona depois do primeiro release publicado no GitHub (veja "Publicar uma versão" abaixo).

## O que a ficha faz

| Parte | Regra implementada |
|---|---|
| Atributos | FOR, DES, CON, INT, SAB, CAR como modificador direto. Total = Base + Raça + Temp. Clicar no hexágono rola `1d20 + total` no chat. |
| Perícias | 30 perícias com marcador de treino (Destreinado +0, Treinado +2, Especialista +4), atributo trocável, campo Outros. Total = Atributo + Treino + Outros. Clicar no total rola no chat. Fortitude, Reflexos e Vontade são também as Resistências. |
| PV e PM | `inicial + por nível × (nível − 1) + atributo × nível` (diálogo **Nível**). PM só soma atributo-chave (INT, SAB ou CAR) em classes conjuradoras. Modo Manual e Bônus. |
| Defesa | `10 + DES + Armadura + Escudo + Outros`. Armadura e escudo vêm dos itens equipados. |
| Nível | 1 a 25. A partir do 21 aparece **PARAGON** e os 5 últimos segmentos ficam dourados. |
| Deslocamento | Em metros, exibido também em quadrados de 1,5 m. Médio 9 m, Pequeno 6 m. |
| Rolagens | Vão para o **chat do Foundry** como cartão próprio, respeitando o modo de rolagem do chat. 20 natural = CRÍTICO (dourado), 1 natural = FALHA CRÍTICA (vermelho), só visual. |
| Iniciativa | `1d20 + total da perícia Iniciativa` no Combat Tracker. |
| Itens | `poder` (fonte, custo em PM, pré-requisito, nível, descrição) e `equipamento` (tipo, quantidade, equipado, bônus de Defesa, descrição). Arrastar e soltar entre fichas e compêndios funciona. |
| Efeitos | Efeitos Ativos do Foundry, modo **Somar**, nas chaves `system.atributos.<FOR…>.temp`, `system.defesa.outros` e `system.pericias.<pericia>.outros`. |
| Tokens | Barra 1 = PV, barra 2 = PM. Personagem novo recebe o ícone do dado azul e token ligado à ficha. |
| Interface | Logo do Icarus no lugar da bigorna do Foundry, dado vermelho na mensagem de jogo pausado e wallpaper no fundo quando não há cena aberta (imagens otimizadas em `img/ui/`). |

## Personagem de teste

No Foundry, abra o console (F12) ou crie uma macro do tipo **Script** com:

```js
const actor = await game.icarus.criarKaelen();   // cria Kaelen Vorhal (nível 5, Koruma Lanceiro)
game.icarus.verificarKaelen(actor);               // confere PV 42, PM 20, Defesa 19, Luta +6…
```

## Estrutura

```
system.json                 manifesto (id, compatibilidade v12, tipos de documento)
icarus.mjs                  ponto de entrada: registra modelos, fichas, iniciativa e templates
module/
  config.mjs                listas: atributos, perícias, tamanhos, tipos de item, fontes de poder
  regras.mjs                fórmulas puras (testadas no Node)
  rolls.mjs                 rolagens e cartão de chat
  data/                     modelos de dados (personagem, poder, equipamento)
  sheets/                   ficha de personagem, ficha de item, diálogo de nível
  dev/kaelen.mjs            personagem de teste e verificação
templates/                  Handlebars da ficha, dos itens, do diálogo e do chat
styles/icarus.css           visual escuro da ficha e do cartão de chat
fonts/                      Cinzel e Alegreya Sans (licença OFL)
lang/pt-BR.json             todos os textos da interface
img/                        ícones e imagens do sistema
tests/                      testes das fórmulas
```

## Desenvolvimento

Testes das fórmulas (Node 20 ou mais novo):

```bash
node --test tests/regras.test.mjs
```

Para testar no seu Foundry sem publicar, copie ou ligue esta pasta em `Data/systems/icarus-rpg`.

### Como estender

- **Novo tamanho, tipo de item ou fonte de poder:** acrescente em `module/config.mjs` e a tradução em `lang/pt-BR.json`.
- **Nova regra derivada:** a fórmula vai em `module/regras.mjs` (com teste), e o cálculo em `prepareDerivedData` de `module/data/actor-personagem.mjs`.
- **Novo tipo de ator ou item:** crie o modelo em `module/data/`, registre em `icarus.mjs` e declare em `documentTypes` no `system.json`.

## Publicar uma versão

1. Atualize `version` e o número da versão no link `download` do `system.json`.
2. Crie e envie a tag com o mesmo número: `git tag v0.1.0 && git push origin v0.1.0`.
3. O GitHub Actions monta `icarus-rpg.zip` e publica o release com o `system.json`. O Foundry passa a oferecer a atualização.

## Pendências (espaços reservados)

Ainda não definidos nas regras, por isso a ficha só tem campo livre ou espaço reservado:

- Magias e custo de PM por círculo
- Combate: ataque, dano e crítico de arma; rolagem de itens e poderes
- Lista de Origens e automação das perícias de Origem
- Detalhes das Profissões (atributo mínimo, perícias, poderes, itens) e automação
- Moedas, carga e riqueza
- Compêndios com as 17 raças e 16 classes
- Actor de NPC e criatura
- Deslocamento do tamanho Grande e outros tamanhos
- Perícias personalizadas ("Nova Perícia / Criar")
- PV e PM no tier Paragon e mecânica de ascensão
- Anotações de sessão no Diário (lista com data e resumo)
