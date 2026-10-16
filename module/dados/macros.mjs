// GERADO por tools/gerar-dados.mjs a partir de tools/dados/macros.json — não edite à mão.
export default {
  "_leiame": "Macros do compêndio Icarus — Macros. icone = caminho dentro de img/Icones/ (com acento e espaço; o build confere se existe); iconeCore = ícone do próprio Foundry quando não há imagem do sistema. O _id vem do id: mudar o id cria uma macro nova.",
  "macros": [
    {
      "id": "aplicar-condicao",
      "nome": "Aplicar Condição",
      "icone": "system/Condições.png",
      "comando": "game.icarus.condicoes.abrirPainel();"
    },
    {
      "id": "teste-oposto",
      "nome": "Teste Oposto",
      "icone": "system/Teste Oposto.png",
      "comando": "game.icarus.testes.abrirOposto();"
    },
    {
      "id": "teste-resistencia",
      "nome": "Teste de Resistência",
      "icone": "system/Teste de Resistência.png",
      "comando": "game.icarus.testes.abrirResistencia();"
    },
    {
      "id": "telao",
      "nome": "Telão",
      "icone": "system/Monitor.png",
      "comando": "game.icarus.telao();"
    },
    {
      "id": "popular-compendios",
      "nome": "Popular compêndios (Mestre)",
      "icone": null,
      "iconeCore": "icons/svg/book.svg",
      "comando": "await game.icarus.popularCompendios();"
    }
  ]
};
