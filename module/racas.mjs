/**
 * Automação de raças no Foundry: aplicar, trocar e reaplicar a raça de um personagem.
 * Os dados e a lógica pura ficam em module/data/racas.mjs.
 *
 * Tudo o que a raça cria é reversível:
 * - atributos raciais vão na coluna RAÇA (system.atributos.X.racial);
 * - poderes raciais são itens "poder" marcados com flags["icarus-rpg"].auto = true;
 * - bônus numéricos são Efeitos Ativos nesses itens (transfer), que somem junto com eles.
 * Base, Temp, Outros, treino, deslocamento e tamanho digitados pelo jogador nunca são alterados.
 */
import { SISTEMA_ID, ICONE_PADRAO, ATRIBUTOS } from "./config.mjs";
import { marcarTreinoDaRaca } from "./assistente.mjs";
import { RACAS, racaPorId, iconeDaRaca, resolverRaca, descricaoHTML } from "./data/racas.mjs";
import { DialogoEscolhasRaca } from "./sheets/dialogo-escolhas-raca.mjs";

const FLAG = SISTEMA_ID;

/** Poder criado automaticamente pela raça (será removido ao trocar de raça). */
export function ehPoderRacialAuto(item) {
  return item.type === "poder" && item.flags?.[FLAG]?.auto === true;
}

/** Escolhas da raça guardadas no personagem (para "Reaplicar raça"). */
export function escolhasGuardadas(actor) {
  try {
    return JSON.parse(actor.flags?.[FLAG]?.escolhasRaca || "{}");
  } catch {
    return {};
  }
}

/* --------------------------- Ícones --------------------------- */

const cacheIcones = new Map();
function arquivoExiste(url) {
  if (!cacheIcones.has(url)) {
    cacheIcones.set(url, fetch(url, { method: "HEAD" }).then(r => r.ok).catch(() => false));
  }
  return cacheIcones.get(url);
}

/** Ícone da raça, ou o dado azul se o arquivo não existir no servidor. */
export async function iconeDisponivel(raca) {
  const url = iconeDaRaca(raca);
  return (await arquivoExiste(url)) ? url : ICONE_PADRAO;
}

/** Confere os 17 ícones e avisa o Mestre quais estão faltando. */
export async function verificarIconesRacas({ avisar = true } = {}) {
  const faltando = [];
  for (const raca of RACAS) {
    if (!(await arquivoExiste(iconeDaRaca(raca)))) faltando.push(raca.icone);
  }
  if (faltando.length) {
    console.warn(`Icarus RPG | Ícones de raça não encontrados em img/Icones/raças/: ${faltando.join(", ")}`);
    if (avisar) {
      ui.notifications.warn(game.i18n.format("ICARUS.Racas.IconesFaltando", { n: faltando.length, lista: faltando.join(", ") }), { permanent: true });
    }
  }
  return faltando;
}

/* --------------------------- Aplicação --------------------------- */

/**
 * Aplica a raça ao personagem (ou remove tudo, se racaId for vazio).
 * @param {Actor} actor
 * @param {string} racaId   id de module/data/racas.mjs, ou "" para nenhuma
 * @param {object} [escolhas]  resultado do diálogo de escolhas
 */
export async function aplicarRaca(actor, racaId, escolhas = {}) {
  const raca = racaPorId(racaId);

  // 1. Remove os poderes raciais automáticos (e, com eles, seus efeitos)
  const automaticos = actor.items.filter(ehPoderRacialAuto).map(i => i.id);
  if (automaticos.length) await actor.deleteEmbeddedDocuments("Item", automaticos);

  // 2. Atributos raciais, raça e escolhas
  const resolvido = raca ? resolverRaca(raca, escolhas) : null;
  const atualizacao = {
    "system.identidade.raca": raca ? raca.id : "",
    [`flags.${FLAG}.escolhasRaca`]: raca ? JSON.stringify(escolhas ?? {}) : ""
  };
  for (const k of ATRIBUTOS) atualizacao[`system.atributos.${k}.racial`] = resolvido?.racial[k] ?? 0;
  // Fonte do treino (para o reset de classe): perícias que os poderes raciais treinam
  const treinadasPelaRaca = (resolvido?.poderes ?? []).flatMap(p => p.efeitos ?? [])
    .map(e => String(e.chave).match(/^system\.pericias\.(\w+)\.treino$/)?.[1]).filter(Boolean);
  Object.assign(atualizacao, marcarTreinoDaRaca(actor, treinadasPelaRaca));
  await actor.update(atualizacao);
  if (!raca) return [];

  // 3. Cria os poderes raciais, cada um com o ícone da raça e seus Efeitos Ativos
  const img = await iconeDisponivel(raca);
  const modos = CONST.ACTIVE_EFFECT_MODES;
  const dados = resolvido.poderes.map(p => ({
    name: p.nome,
    type: "poder",
    img,
    system: { fonte: "raca", custoPM: p.custoPM, descricao: descricaoHTML(p) },
    flags: { [FLAG]: { auto: true, racaId: raca.id, poderId: p.poderId, escolha: p.escolha, pendente: p.pendente } },
    effects: p.efeitos.length ? [{
      name: p.nome,
      img,
      transfer: true,
      changes: p.efeitos.map(e => ({ key: e.chave, mode: modos[e.modo], value: String(e.valor) }))
    }] : []
  }));
  return actor.createEmbeddedDocuments("Item", dados);
}

/**
 * Troca a raça pela combobox da ficha: confirma, abre o diálogo de escolhas e aplica.
 * @returns {Promise<boolean>} false se o jogador cancelou a troca
 */
export async function trocarRaca(actor, novoId) {
  const atual = actor._source.system.identidade.raca;
  if (novoId === atual) return false;
  const temAutomaticos = actor.items.some(ehPoderRacialAuto);
  if (atual || temAutomaticos) {
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("ICARUS.Racas.TrocarTitulo") },
      content: `<p>${game.i18n.localize("ICARUS.Racas.ConfirmarTroca")}</p>`,
      rejectClose: false
    });
    if (!ok) return false;
  }
  const raca = racaPorId(novoId);
  let escolhas = {};
  if (raca?.escolhas?.length) escolhas = (await DialogoEscolhasRaca.escolher(actor, raca, {})) ?? {};
  await aplicarRaca(actor, novoId, escolhas);
  return true;
}

/** Refaz a automação da raça atual com as escolhas já feitas (botão "Reaplicar raça"). */
export async function reaplicarRaca(actor) {
  const id = actor._source.system.identidade.raca;
  if (!racaPorId(id)) return ui.notifications.warn(game.i18n.localize("ICARUS.Racas.SemRaca"));
  await aplicarRaca(actor, id, escolhasGuardadas(actor));
  ui.notifications.info(game.i18n.format("ICARUS.Racas.Reaplicada", { raca: racaPorId(id).nome }));
}

/** Abre de novo o diálogo de escolhas (para escolhas pendentes) e reaplica a raça. */
export async function refazerEscolhas(actor) {
  const raca = racaPorId(actor._source.system.identidade.raca);
  if (!raca?.escolhas?.length) return;
  const escolhas = await DialogoEscolhasRaca.escolher(actor, raca, escolhasGuardadas(actor));
  if (escolhas) await aplicarRaca(actor, raca.id, escolhas);
}

/* --------------------------- Verificação no Foundry --------------------------- */

/**
 * Testa os critérios de aceite das raças num personagem temporário (Kaelen sem raça)
 * e apaga o personagem no final. Uso no console (F12): await game.icarus.verificarRacas()
 */
export async function verificarRacas({ dadosBase }) {
  const base = foundry.utils.deepClone(dadosBase);
  base.name = "Teste de Raças (temporário)";
  base.system.identidade.raca = "";
  for (const k of ATRIBUTOS) base.system.atributos[k].racial = 0;
  base.system.defesa.outros = 0;
  base.system.deslocamento = 9;
  const actor = await Actor.create(base, { renderSheet: false });
  const resultados = [];
  const conferir = (caso, nome, obtido, esperado) =>
    resultados.push({ caso, nome, esperado: String(esperado), obtido: String(obtido), ok: obtido === esperado });
  const s = () => actor.system;
  const autos = () => actor.items.filter(ehPoderRacialAuto);
  const fontes = () => actor._source.system;

  try {
    // 1. Koruma
    await aplicarRaca(actor, "koruma");
    conferir("Koruma", "Raça FOR/DES/CAR", ["FOR", "DES", "CAR"].map(k => s().atributos[k].racial).join(","), "1,1,1");
    conferir("Koruma", "Poderes raciais", autos().length, 4);
    conferir("Koruma", "Defesa (Outros do jogador = 0)", s().defesa.total, 19);
    conferir("Koruma", "Fortitude (CON 2 + Treinado 2 + Couro Brutal 2)", s().pericias.fortitude.total, 6);
    conferir("Koruma", "Deslocamento", `${s().deslocamento} m (${s().deslocamentoQuadrados}q)`, "12 m (8q)");

    // 2. Ogbari
    await aplicarRaca(actor, "ogbari");
    conferir("Ogbari", "PV por nível (+1 × 5)", s().pv.max - s().pv.formula, 5);
    conferir("Ogbari", "Intimidação usa FOR", s().pericias.intimidacao.atributo, "FOR");
    conferir("Ogbari", "Intimidação (FOR 4 + Treinado 2 + 2)", s().pericias.intimidacao.total, 8);

    // 3. Ayoran
    await aplicarRaca(actor, "ayoran");
    conferir("Ayoran", "PM por nível (+1 × 5)", s().pm.max - s().pm.formula, 5);
    conferir("Ayoran", "Deslocamento", s().deslocamento, 12);

    // 4. Karadun
    await aplicarRaca(actor, "karadun", { atributos: ["FOR", "DES", "INT"], pericias: { Adaptabilidade: "historia" } });
    conferir("Karadun", "PM nos níveis 1, 3 e 5", s().pm.max - s().pm.formula, 3);
    conferir("Karadun", "Raça FOR/DES/INT (+2/+1/−1)", ["FOR", "DES", "INT"].map(k => s().atributos[k].racial).join(","), "2,1,-1");
    conferir("Karadun", "Misticismo Treinado", s().pericias.misticismo.treino, 1);
    conferir("Karadun", "História Treinada (escolha)", s().pericias.historia.treino, 1);

    // 5. Araké
    await aplicarRaca(actor, "arake", { atributos: ["SAB", "INT", "CAR"], pericias: { "Aprendizado Plural": "luta" } });
    conferir("Araké", "Raça SAB/INT/CAR", ["SAB", "INT", "CAR"].map(k => s().atributos[k].racial).join(","), "1,1,1");
    conferir("Araké", "Luta: Treinado vira Especialista", s().pericias.luta.treino, 2);
    conferir("Araké", "Treino salvo da Luta não muda", fontes().pericias.luta.treino, 1);
    await aplicarRaca(actor, "arake", { atributos: ["SAB", "INT", "CAR"], pericias: { "Aprendizado Plural": "cavalgar" } });
    conferir("Araké", "Cavalgar já Especialista continua", s().pericias.cavalgar.treino, 2);

    // 6. Azakar
    const nomes = () => autos().map(i => i.name).sort().join(" · ");
    await aplicarRaca(actor, "azakar", { variante: "luz" });
    conferir("Azakar Luz", "Poderes", nomes(), "Condutor (Luz) · Luz Sagrada (Luz)");
    await aplicarRaca(actor, "azakar", { variante: "sombra" });
    conferir("Azakar Sombra", "Poderes", nomes(), "Corrosivo (Sombra) · Sombras Profanas (Sombra)");

    // 7. Ikori
    await aplicarRaca(actor, "ikori", { variante: "macho" });
    conferir("Ikori Macho", "Tamanho", s().tamanho, "pequeno");
    conferir("Ikori Macho", "Tamanho salvo continua Médio", fontes().tamanho, "medio");
    conferir("Ikori Macho", "Reflexos e Furtividade Outros", `${s().pericias.reflexos.outros},${s().pericias.furtividade.outros}`, "2,2");
    await aplicarRaca(actor, "ikori", { variante: "femea" });
    conferir("Ikori Fêmea", "Atletismo e Fortitude Outros", `${s().pericias.atletismo.outros},${s().pericias.fortitude.outros}`, "2,2");
    conferir("Ikori Fêmea", "Tamanho", s().tamanho, "medio");

    // 8. Trocar Koruma → Dorun mantendo o que é do jogador
    await aplicarRaca(actor, "koruma");
    await actor.createEmbeddedDocuments("Item", [{ name: "Poder manual de teste", type: "poder", system: { fonte: "raca" } }]);
    await actor.update({ "system.atributos.FOR.base": 3, "system.atributos.FOR.temp": 2, "system.pericias.luta.outros": 1 });
    await aplicarRaca(actor, "dorun");
    conferir("Troca → Dorun", "Raça FOR/CON/SAB e DES/CAR zerados", ATRIBUTOS.map(k => s().atributos[k].racial).join(","), "1,0,1,0,1,0");
    conferir("Troca → Dorun", "Poderes automáticos", autos().map(i => i.name).sort().join(" · "), "Passo da Montanha · Sangue de Aço · Tradição da Forja");
    conferir("Troca → Dorun", "Poder manual preservado", actor.items.some(i => i.name === "Poder manual de teste"), true);
    conferir("Troca → Dorun", "Base/Temp/Outros do jogador", `${fontes().atributos.FOR.base},${fontes().atributos.FOR.temp},${fontes().pericias.luta.outros}`, "3,2,1");
    conferir("Troca → Dorun", "Deslocamento", s().deslocamento, 6);

    // 9. Nenhuma
    await aplicarRaca(actor, "");
    conferir("Nenhuma", "Poderes automáticos", autos().length, 0);
    conferir("Nenhuma", "Atributos raciais", ATRIBUTOS.map(k => s().atributos[k].racial).join(","), "0,0,0,0,0,0");
    conferir("Nenhuma", "Deslocamento volta ao do jogador", s().deslocamento, 9);
  } finally {
    await actor.delete();
  }

  // 10. Ícones
  const faltando = await verificarIconesRacas({ avisar: false });
  conferir("Ícones", "Ícones de raça encontrados", 17 - faltando.length, 17);

  const falhas = resultados.filter(r => !r.ok);
  console.table(resultados);
  if (falhas.length) ui.notifications.error(game.i18n.format("ICARUS.Dev.RacasFalhou", { n: falhas.length, total: resultados.length }));
  else ui.notifications.info(game.i18n.format("ICARUS.Dev.RacasPassou", { total: resultados.length }));
  return resultados;
}
