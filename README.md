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
| Raças | Combobox com as 17 raças. Escolher uma raça preenche a coluna RAÇA dos atributos, cria os poderes raciais (com o ícone da raça) na aba Poderes e aplica os bônus passivos por Efeitos Ativos. Raças com escolhas (Araké, Karadun, Ayomi, Harukan, Kirai, Ikori, Azakar, Ara'Maku) abrem um diálogo. Trocar de raça remove só o que é automático. Botão **Reaplicar raça** refaz a automação. |
| Atributos | FOR, DES, CON, INT, SAB, CAR como modificador direto. Total = Base + Raça + Temp. Clicar no hexágono rola `1d20 + total` no chat. |
| Perícias | 30 perícias com marcador de treino (Destreinado +0, Treinado +2, Especialista +4), atributo trocável, campo Outros. Total = Atributo + Treino + Outros. Clicar no total rola no chat. Fortitude, Reflexos e Vontade são também as Resistências. |
| PV e PM | `inicial + por nível × (nível − 1) + atributo × nível + bônus por nível de poderes` (diálogo **Nível**). PM só soma atributo-chave (INT, SAB ou CAR) em classes conjuradoras. Modo Manual e Bônus. |
| Defesa | `10 + DES + Armadura + Escudo + Outros` + modificador de condição. Armadura e escudo vêm dos itens equipados; só uma armadura e um escudo ficam equipados por vez. |
| Armaduras e escudos | Compêndio **Icarus — Armaduras e Escudos** (12 itens: leves, médias, pesadas, túnicas e escudos). A **penalidade de armadura** soma das peças equipadas e sai de Acrobacia, Furtividade e Prestidigitação (o tooltip mostra a origem). Escudo acoplado com arma de duas mãos empunhada gera aviso. |
| Divindade | Combobox em árvore no cabeçalho: Nenhum(a) / **Alfars** / **Baldurs** (20 divindades com símbolo) / Outra. Setas, Enter, Esc, Home e End funcionam. Abaixo, **Dogmas e poderes** mostra dogma e os 3 poderes. Ao escolher, abre **Poderes Concedidos** com caixas de seleção e contador; trocar de divindade pergunta se mantém ou remove os poderes da anterior. |
| Poderes concedidos | Compêndio **Icarus — Poderes Concedidos** (60 poderes, pastas Alfars/Baldurs > divindade, ícone = símbolo da divindade). Bônus fixos viram Efeitos Ativos; bônus condicionais ficam só no texto. Na aba Poderes aparecem no grupo da divindade com a tag **Concedido** e botão de enviar ao chat. |
| Dano e resistências | 13 tipos de dano. Aba **Combate** com tabela de Redução, Imune e Vulnerável por tipo, mais RD geral. Card de dano tem **Aplicar**, **Metade**, **Dobro** e **Perda de PV** nos tokens selecionados: imunidade → vulnerável ×1,5 (para baixo) → redução do tipo → RD → mínimo 0, com o cálculo no chat. Perda de PV ignora tudo. `game.icarus.aplicarDano(...)`, `game.icarus.rolarDanoAvulso(...)`. |
| Condições | 36 condições como Status Effects (ícone no token). Aba Combate: chips com o texto, **+ Condição**, botão direito para Remover/Escalar; faixa de avisos no topo da ficha. Penalidades **não se acumulam** (vale a maior) e entram em Defesa, perícias, ataque e deslocamento; condições que incluem outras (Agarrado → Desprevenido + Imóvel) aplicam e removem as filhas. Duração: até remover, rodadas (sai no Combat Tracker) ou fim da cena. Anúncio no chat configurável. |
| Painel do Mestre | Sem abrir ficha: ícone de condições nos controles de token, **Token HUD** do Foundry, macro **Aplicar Condição** ou `game.icarus.condicoes.painel()`. Busca, filtro por descritor, vários alvos, duração, **Remover todas** e **Encerrar cena**. API: `game.icarus.condicoes.aplicar/remover/removerTodas/escalar/encerrarCena`. |
| PV 0 e morte | PV 0 aplica **Morrendo** (com Inconsciente e Indefeso). Aba Combate: marcadores de sucesso e falha, **Rolar teste de morte** (1–9 falha, 10–19 sucesso, 20 recupera 1 PV, 1 = duas falhas), dano em Morrendo e **Estabilizar (Cura CD 10)**. Voltar a 1 PV limpa tudo. No início do turno, lembretes com botões para Em Chamas, Sangrando, Confuso e Morrendo. |
| Nível | 1 a 25. A partir do 21 aparece **PARAGON** e os 5 últimos segmentos ficam dourados. |
| Deslocamento | Em metros, exibido também em quadrados de 1,5 m. Médio 9 m, Pequeno 6 m. |
| Rolagens | Vão para o **chat do Foundry** como cartão próprio, respeitando o modo de rolagem do chat. 20 natural = CRÍTICO (dourado), 1 natural = FALHA CRÍTICA (vermelho), só visual. |
| Iniciativa | `1d20 + total da perícia Iniciativa` no Combat Tracker. |
| Armas | Compêndio **Icarus — Armas** com 46 armas em 4 pastas (Simples, Marciais, Exóticas, de Fogo). Na ficha: ataque com a perícia certa (Luta no corpo a corpo; Pontaria em distância, arremesso e fogo), **Ágil** usa DES em vez de FOR, crítico por margem e multiplicador, card de chat com **Rolar dano** e **Dano crítico**. |
| Munição | Compêndio **Icarus — Munições** (Flechas, Virotes, Pedras, Balas; pacote de 20 = 1 espaço). Cada disparo de arco, besta e funda gasta 1; armas de fogo têm disparos carregados e **Recarregar**; arma arremessada sai do inventário e volta com **Recolher arma**. |
| Moedas e carga | Ouro Real, Reais e Centavos na ficha (preços guardados em centavos). Arrastar um item do compêndio pergunta **Comprar** ou **Adicionar grátis**. Carga = 10 + 2 × FOR espaços; acima disso fica vermelha (sem penalidade). |
| Telão | Botão **Telão** (ícone de TV) na ponta esquerda da barra de atalhos, embaixo, sempre visível (e também na barra de tokens, quando há cena aberta). Atalho: `game.icarus.telao()`. O Mestre escolhe um vídeo de uma pasta ou cola um link do YouTube, vê a prévia, e com **Mostrar para todos** a janela abre para os jogadores. **Play**, **Pausar**, **Voltar ao início** e a barra de posição valem para todos; cada jogador ajusta o próprio volume. Quem entra no meio da sessão cai no ponto certo. Se o navegador bloquear o som, aparece **Clique para assistir**. |
| Itens | `poder` (fonte, custo em PM, pré-requisito, nível, descrição) e `equipamento` (tipo, quantidade, equipado, bônus de Defesa, descrição). Arrastar e soltar entre fichas e compêndios funciona. |
| Efeitos | Efeitos Ativos do Foundry, modo **Somar**, nas chaves `system.atributos.<FOR…>.temp`, `system.defesa.outros`, `system.pericias.<pericia>.outros`, `system.bonus.ataque` e `system.resistencias.reducao.<tipo>`. |
| Tokens | Barra 1 = PV, barra 2 = PM. Personagem novo recebe o ícone do dado azul e token ligado à ficha. |
| Interface | Logo do Icarus no lugar da bigorna do Foundry, dado vermelho na mensagem de jogo pausado e wallpaper no fundo quando não há cena aberta (imagens otimizadas em `img/ui/`). |

## Personagem de teste

No Foundry, abra o console (F12) ou crie uma macro do tipo **Script** com:

```js
const actor = await game.icarus.criarKaelen();   // cria Kaelen Vorhal (nível 5, Koruma Lanceiro)
game.icarus.verificarKaelen(actor);               // confere PV 42, PM 20, Defesa 19, Fortitude +6…
await game.icarus.verificarRacas();               // testa as raças num personagem temporário (tabela no console)
await game.icarus.verificarArmas();               // testa armas, munição, moedas e carga (tabela no console)
```

## Estrutura

```
system.json                 manifesto (id, compatibilidade v12, tipos de documento)
icarus.mjs                  ponto de entrada: registra modelos, fichas, iniciativa e templates
module/
  config.mjs                listas: atributos, perícias, tamanhos, tipos de item, fontes de poder
  regras.mjs                fórmulas puras (testadas no Node)
  rolls.mjs                 rolagens e cartão de chat
  derivar.mjs               cálculos da ficha (usados pelo Foundry e pelos testes)
  racas.mjs                 aplicar, trocar e reaplicar raças no Foundry
  data/                     modelos de dados e racas.mjs (dados das 17 raças)
  sheets/                   ficha de personagem e de item, diálogos (nível, raça, poderes concedidos), árvore de divindade, painel de condições
  moeda.mjs                 preço em centavos, formatação, débito e crédito
  combate.mjs               regras de ataque e dano (as provisórias ficam em REGRAS)
  combate-chat.mjs          rolar ataque e dano, munição, recarga, arremesso e cards de chat
  inventario.mjs            comprar ou adicionar itens, somar munição, botão + Item
  dados-itens.mjs           converte tools/dados/armas.json em itens do Foundry
  compendios.mjs            plano B: popular os compêndios dentro do Foundry
  dados-compendios.mjs      converte armaduras, poderes concedidos, condições e macros em documentos
  dados/                    gerado de tools/dados/*.json (não editar à mão)
  armaduras.mjs             uma armadura e um escudo equipados por vez
  panteao.mjs               divindades, símbolos e poderes concedidos
  dano.mjs                  aplicar dano com resistências, botões do card de dano
  condicoes.mjs             regras puras das condições (composição, maior penalidade)
  condicoes-foundry.mjs     Status Effects, duração, anúncio e API das condições
  morte.mjs / morte-foundry.mjs  testes de morte e lembretes de turno
  dev/                      personagem de teste e verificações (Kaelen, raças, armas)
templates/                  Handlebars da ficha, dos itens, do diálogo e do chat
styles/icarus.css           visual escuro da ficha e do cartão de chat
fonts/                      Cinzel e Alegreya Sans (licença OFL)
lang/pt-BR.json             todos os textos da interface
img/                        ícones e imagens: raças, armas, munições, armaduras e escudos, símbolos do panteão e interface (256 px)
tests/                      testes das fórmulas, raças, armas, armaduras, panteão, dano, condições e morte
tools/dados/                fonte única: armas, armaduras, poderes concedidos, panteão, tipos de dano, condições e mapas de ícones
tools/gerar-dados.mjs       gera module/dados/ a partir de tools/dados/
tools/build-packs.mjs       gera packs-src/ (JSON) e compila os compêndios em packs/ (LevelDB)
packs-src/                  JSON dos compêndios (gerado; packs/ é compilado na hora do release)
macros/popular-compendios.js  macro do plano B (também no compêndio Icarus — Macros)
```

## Desenvolvimento

Testes das fórmulas (Node 20 ou mais novo):

```bash
npm test
```

Compêndios (precisa de `npm install` uma vez, que instala o CLI do Foundry):

```bash
npm run build:packs
```

Para testar no seu Foundry sem publicar, copie ou ligue esta pasta em `Data/systems/icarus-rpg`.

### Como estender

- **Novo tamanho, tipo de item ou fonte de poder:** acrescente em `module/config.mjs` e a tradução em `lang/pt-BR.json`.
- **Nova regra derivada:** a fórmula vai em `module/regras.mjs` (com teste), e o cálculo em `prepareDerivedData` de `module/data/actor-personagem.mjs`.
- **Novo tipo de ator ou item:** crie o modelo em `module/data/`, registre em `icarus.mjs` e declare em `documentTypes` no `system.json`.

## Raças

Os dados ficam em `module/data/racas.mjs`, uma entrada por raça:

```js
{
  id: "koruma", nome: "Koruma", significado: "Os Senhores dos Labirintos", icone: "Koruma.png",
  atributos: { FOR: 1, DES: 1, CAR: 1 },
  escolhas: [],   // opcional: atributosLivres, variante, periciaEspecialista, periciaTreinada, texto
  poderes: [
    { nome: "Couro Brutal", descricao: "+1 na Defesa. +2 em Fortitude.",
      efeitos: [add("system.defesa.outros", 1), add(outros("fortitude"), 2)] },
    { nome: "Enterre-me de Pé", custoPM: 2, descricao: "…" }
  ]
}
```

- **Editar uma raça:** mude a entrada e, nos personagens que já têm a raça, use **Reaplicar raça** na ficha.
- **Nova raça:** acrescente a entrada e o ícone em `img/Icones/raças/` com o nome exato do campo `icone`.
- **Efeitos:** `add(chave, valor)` soma, `override(chave, valor)` substitui e `upgrade(chave, valor)` garante um mínimo (usado para treino). Chaves aceitas: `system.pericias.<pericia>.outros|treino|atributo`, `system.defesa.outros`, `system.deslocamento`, `system.tamanho`, `system.classeConfig.bonusPvPorNivel|bonusPmPorNivel|bonusPmNivelImpar`.
- **Poder só de uma variante:** `variante: "luz"`, com a escolha `{ tipo: "variante", opcoes: [{ id: "luz", rotulo: "Luz" }, …] }`.
- Rode `node --test tests/racas.test.mjs`: o teste confere se as chaves e escolhas estão coerentes.

Os poderes criados pela raça ficam marcados com `flags["icarus-rpg"].auto` e são os únicos removidos ao trocar de raça.

## Armas e munições

A fonte única é `tools/dados/armas.json`. Para **editar ou adicionar uma arma**:

1. Mude a entrada (ou copie uma parecida) em `armas`. Preço em **centavos** (R$ 15 = 1500). O campo `icone` é o nome exato do arquivo em `img/Icones/itens/equipamentos/armas/`; `null` usa o dado azul.
2. Rode `npm run build:packs`. O `_id` vem do campo `id`, então nada se duplica.
3. Publique uma versão nova. Quem já tem a arma numa ficha continua com a cópia antiga: arraste de novo do compêndio.

Sem conseguir compilar no seu computador, use o **plano B** dentro do Foundry, como Mestre: `await game.icarus.popularCompendios()` (ou a macro `macros/popular-compendios.js`). Ela lê o mesmo JSON e cria ou atualiza os itens sem duplicar.

## Armaduras, poderes concedidos e condições

Fontes únicas em `tools/dados/`: `armaduras.json`, `poderes-concedidos.json`, `panteao.json`, `tipos-dano.json` e `condicoes.json`, copiadas dos anexos do livro. Os ícones ficam em `icones-armaduras.json`, `icones-divindades.json` (caminho dentro de `img/Icones/panteão/simbolos/`) e `icones-condicoes.json` (vazio: as condições usam os ícones do próprio Foundry).

1. Edite o JSON e rode `npm run build:packs` (gera `module/dados/` e os compêndios). O teste `tests/dados.test.mjs` falha se `module/dados/` ficar desatualizado.
2. Ícone mapeado que não existe faz o build parar com o nome do arquivo.
3. Plano B no Foundry: macro **Popular compêndios** ou `await game.icarus.popularCompendios()`, que agora cobre todos os compêndios.

As condições também estão no compêndio **Icarus — Condições** (um diário com uma página por condição, em ordem alfabética, com descritores e marcas de pendência).

## Publicar uma versão

1. Atualize `version` e o número da versão no link `download` do `system.json`.
2. Crie e envie a tag com o mesmo número: `git tag v0.1.0 && git push origin v0.1.0`.
3. O GitHub Actions monta `icarus-rpg.zip` e publica o release com o `system.json`. O Foundry passa a oferecer a atualização.

## Pendências (espaços reservados)

Ainda não definidos nas regras, por isso a ficha só tem campo livre ou espaço reservado:

- Magias e custo de PM por círculo
- Rolagem de itens e poderes com efeito mecânico (hoje os poderes só vão ao chat como texto)
- Lista de Origens e automação das perícias de Origem
- Detalhes das Profissões (atributo mínimo, perícias, poderes, itens) e automação
- Compêndios com as 17 raças e 16 classes
- Actor de NPC e criatura (as condições e o dano já funcionam em qualquer token com a ficha de personagem)
- Deslocamento do tamanho Grande e outros tamanhos
- Perícias personalizadas ("Nova Perícia / Criar")
- PV e PM no tier Paragon e mecânica de ascensão
- Anotações de sessão no Diário (lista com data e resumo)
- Bônus de ataque e dano de poderes raciais (ficam como texto até existir o combate)
- Visão no escuro como campo mecânico (Sentidos e Imunidades em texto continuam preenchidos à mão)
- Magias raciais (Astúcia Arcana, Luz Sagrada, Sombras Profanas)
- Compêndios de raças e de poderes de classe
- Telão: vídeos do YouTube que o dono não permite incorporar não tocam (aparece um aviso); a sincronia é feita a cada ação do Mestre (sem correção contínua durante a reprodução)
- Filtro por digitação na combobox de raça (hoje vale a busca nativa: digitar a inicial)

**Armas (regras [PROVISÓRIO], em `REGRAS` de `module/combate.mjs`):**
- Dano soma FOR no corpo a corpo e no arremesso; arcos, bestas, funda e armas de fogo não somam atributo
- Crítico multiplica tudo: (dados + bônus) × multiplicador
- Sem acerto automático; o card só compara com a Defesa se houver exatamente 1 alvo
- Sem proficiência na arma: só aviso, sem penalidade numérica
- Penalidade de armadura no ataque sem proficiência em armadura: gancho `penalidadeDeAtaque` (sem valor no livro, continua 0)
- Ágil usa DES quando ela é maior que FOR (a regra permite usar DES)
- Carga 10 + 2 × FOR (referência do Tormenta 20, a conferir); sobrecarga sem efeito
- Fora de escopo por enquanto: duas armas, Arma Dupla completa, desarmado e armas naturais, aplicar dano nos tokens, medir alcance, munições especiais e recuperação de munição, efeitos de poderes sobre armas

**Armaduras, dano, condições e morte ([PROVISÓRIO]):**
- Espaços de todas as armaduras e escudos; preço das túnicas; nome da Túnica Bordada (campo `provisorio` em `tools/dados/armaduras.json`, mostrado no item)
- Ordem do dano: imunidade → vulnerabilidade ×1,5 arredondada para baixo → redução do tipo → RD geral → mínimo 0 (`regras` em `tools/dados/tipos-dano.json`)
- Condições com texto marcado PENDENTE ou CONFIRMAR no livro: Agarrado, Cego, Doente, Envenenado, Petrificado, Sobrecarregado, Surdo (efeitos não automatizados ficam só no texto)
- Teste de morte soma só bônus gerais de resistência, campo que ainda não existe (nada é somado)
- Lembretes de turno (Em Chamas, Sangrando, Confuso, Morrendo) só avisam; nada é aplicado sem clicar
- Bônus condicionais dos poderes concedidos ficam só no texto
