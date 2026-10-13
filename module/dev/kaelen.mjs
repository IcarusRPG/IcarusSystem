/**
 * Personagem de teste Kaelen Vorhal (seção 6 do prompt da ficha).
 * Uso no Foundry, numa macro de script ou no console (F12):
 *   await game.icarus.criarKaelen();          // cria o personagem
 *   game.icarus.verificarKaelen(actor);       // confere as fórmulas
 */

/** Dados do personagem; também usados pelos testes em tests/. */
export function dadosKaelen() {
  const treino = { luta: 1, cavalgar: 2, fortitude: 1, iniciativa: 1, atletismo: 1, intimidacao: 1 };
  const eq = (name, tipo, quantidade, equipado, bonusDefesa) =>
    ({ name, type: "equipamento", system: { tipo, quantidade, equipado, bonusDefesa } });
  const pod = (name, fonte, custoPM, nivel, descricao) =>
    ({ name, type: "poder", system: { fonte, custoPM, nivel, descricao: `<p>${descricao}</p>` } });
  return {
    name: "Kaelen Vorhal",
    type: "personagem",
    system: {
      nivel: 5,
      identidade: { raca: "Koruma", origem: "Caçador de Feras", classe: "Lanceiro", profissao: "Ferreiro", divindade: "Draconara" },
      atributos: {
        FOR: { base: 2, racial: 1, temp: 1 }, DES: { base: 0, racial: 1, temp: 0 }, CON: { base: 2, racial: 0, temp: 0 },
        INT: { base: 0, racial: 0, temp: 0 }, SAB: { base: 1, racial: 0, temp: 0 }, CAR: { base: 1, racial: 1, temp: 0 }
      },
      classeConfig: { pvInicial: 16, pvPorNivel: 4, pmInicial: 4, pmPorNivel: 4, pvAtributo: "CON", pmAtributo: null, bonusPv: 0, bonusPm: 0, manual: false },
      pv: { value: 42, max: 42 },
      pm: { value: 20, max: 20 },
      defesa: { outros: 1 },
      // Koruma: Avanço do Touro (12 m em vez de 9 m)
      deslocamento: 12,
      tamanho: "medio",
      pericias: Object.fromEntries(Object.entries(treino).map(([k, t]) => [k, { treino: t }])),
      proficiencias: { armas: "Lanças", armaduras: "Armaduras pesadas e escudos" }
    },
    items: [
      eq("Lança de Guerra", "arma", 1, false, 0),
      eq("Armadura de Placas", "armadura", 1, true, 5),
      eq("Escudo de Torre", "escudo", 1, true, 2),
      eq("Ferramentas de Ferreiro", "profissao", 1, false, 0),
      eq("Ração de Viagem", "consumivel", 6, false, 0),
      pod("Couro Brutal", "raca", null, null, "+1 na Defesa. +2 em Fortitude."),
      pod("Enterre-me de Pé", "raca", 2, null, "Ao sofrer um efeito ou golpe que o deixaria caído, pode gastar 2 PM como reação para ignorar o efeito e permanecer de pé."),
      pod("Chifres de Dannan", "raca", 1, null, "Arma natural de chifres (dano 1d6, crítico x2, perfuração). 1x por rodada, ao atacar com outra arma na ação Agredir, pode gastar 1 PM para um ataque corpo a corpo extra com os chifres."),
      pod("Avanço do Touro", "raca", null, null, "Deslocamento 12 m (em vez de 9 m)."),
      pod("Montaria de Guerra", "classe", null, 1, "Ganha uma montaria (cavalo de guerra): Iniciante (1º), Veterano (7º), Mestre (13º). Se morrer, treina outra em 1 semana."),
      pod("Lança Montada", "classe", null, 1, "Montado, empunha a lança com uma mão. Em investida montada, +2d8 de dano adicional (não multiplicado por crítico)."),
      pod("Avanço Irrefreável", "classe", 1, 1, "Em Investida, ignora terreno difícil. Gasta 1 PM: +2 ataque/+2 dano. A cada 4 níveis (5º/9º/13º/17º), +1 PM adicional aumenta os bônus em +2."),
      pod("Investida Implacável", "classe", null, 3, "Investida não sofre a penalidade de −2 na Defesa."),
      pod("Presença Marcial", "classe", null, 5, "Testes de Carisma com militares/guerreiros: role 2d20, fique com o melhor.")
    ]
  };
}

/** Valores esperados da seção 6. */
export const ESPERADO_KAELEN = {
  atributos: { FOR: 4, DES: 1, CON: 2, INT: 0, SAB: 1, CAR: 2 },
  pvMax: 42, pmMax: 20, defesa: 19,
  pericias: { luta: 6, cavalgar: 5, fortitude: 4, iniciativa: 3 }
};

/** Compara um Actor com os valores esperados e devolve a lista de diferenças. */
export function compararKaelen(system) {
  const erros = [];
  const conferir = (nome, obtido, esperado) => { if (obtido !== esperado) erros.push(`${nome}: esperado ${esperado}, obtido ${obtido}`); };
  for (const [k, v] of Object.entries(ESPERADO_KAELEN.atributos)) conferir(k, system.atributos[k].total, v);
  conferir("PV máx", system.pv.max, ESPERADO_KAELEN.pvMax);
  conferir("PM máx", system.pm.max, ESPERADO_KAELEN.pmMax);
  conferir("Defesa", system.defesa.total, ESPERADO_KAELEN.defesa);
  for (const [k, v] of Object.entries(ESPERADO_KAELEN.pericias)) conferir(k, system.pericias[k].total, v);
  return erros;
}

export async function criarKaelen() {
  const actor = await Actor.create(dadosKaelen());
  actor?.sheet.render(true);
  return actor;
}

export function verificarKaelen(actor) {
  const alvo = actor ?? game.actors.getName("Kaelen Vorhal");
  if (!alvo) return ui.notifications.warn(game.i18n.localize("ICARUS.Dev.SemKaelen"));
  const erros = compararKaelen(alvo.system);
  if (erros.length) {
    console.error("Icarus RPG | Kaelen Vorhal com diferenças:", erros);
    ui.notifications.error(game.i18n.format("ICARUS.Dev.Falhou", { n: erros.length }));
  } else {
    ui.notifications.info(game.i18n.localize("ICARUS.Dev.Passou"));
  }
  return erros;
}
