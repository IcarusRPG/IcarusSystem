# Changelog — Icarus RPG (Foundry VTT)

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
