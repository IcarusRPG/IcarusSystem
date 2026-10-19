// GERADO por tools/gerar-dados.mjs a partir de tools/dados/vinculos.json — não edite à mão.
export default {
  "_leiame": "Animais do Vínculo Selvagem (Patrulheiro), estruturados a partir do texto do Anexo A (classes.json → patrulheiro → vinculo-selvagem → subs). Regra geral: PV = 10 + metade do nível do patrulheiro; Defesa = 10 + DES do patrulheiro + defesa; ataques e resistências iguais aos do patrulheiro; dano + metade do nível (somaNivel). O texto completo de cada animal vai para a ficha.",
  "animais": [
    {
      "id": "lobo",
      "nome": "Lobo",
      "defesa": 2,
      "deslocamento": 12,
      "movimentos": "",
      "rd": 0,
      "pericias": {},
      "ataques": [
        {
          "nome": "Mordida",
          "dano": "1d6",
          "tipos": [
            "perfuracao"
          ],
          "somaNivel": true
        }
      ]
    },
    {
      "id": "pantera",
      "nome": "Pantera",
      "defesa": 3,
      "deslocamento": 15,
      "movimentos": "escalada 9 m",
      "rd": 0,
      "pericias": {
        "furtividade": 4
      },
      "ataques": [
        {
          "nome": "Mordida",
          "dano": "1d6",
          "tipos": [
            "perfuracao"
          ],
          "somaNivel": true
        }
      ]
    },
    {
      "id": "cobra-voadora",
      "nome": "Cobra Voadora",
      "defesa": 4,
      "deslocamento": 9,
      "movimentos": "voo 12 m",
      "rd": 0,
      "pericias": {},
      "ataques": [
        {
          "nome": "Mordida",
          "dano": "1d4 + 1d6",
          "tipos": [
            "perfuracao",
            "veneno"
          ],
          "somaNivel": true
        }
      ]
    },
    {
      "id": "urso-negro",
      "nome": "Urso Negro",
      "defesa": 1,
      "deslocamento": 9,
      "movimentos": "escalada 6 m",
      "rd": 2,
      "pericias": {},
      "ataques": [
        {
          "nome": "Garras",
          "dano": "1d8",
          "tipos": [
            "corte"
          ],
          "somaNivel": true
        }
      ]
    },
    {
      "id": "sapo-gigante",
      "nome": "Sapo Gigante",
      "defesa": 1,
      "deslocamento": 9,
      "movimentos": "salto de 6 m",
      "rd": 0,
      "pericias": {},
      "ataques": [
        {
          "nome": "Mordida",
          "dano": "1d6",
          "tipos": [
            "perfuracao"
          ],
          "somaNivel": true
        }
      ]
    },
    {
      "id": "teixugo-gigante",
      "nome": "Teixugo Gigante",
      "defesa": 2,
      "deslocamento": 6,
      "movimentos": "escavação 6 m",
      "rd": 0,
      "pericias": {},
      "ataques": [
        {
          "nome": "Mordida",
          "dano": "1d6",
          "tipos": [
            "perfuracao"
          ],
          "somaNivel": true
        },
        {
          "nome": "Garras",
          "dano": "1d4",
          "tipos": [
            "corte"
          ],
          "somaNivel": false
        }
      ]
    }
  ]
};
