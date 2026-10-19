/**
 * Monge:
 * - Caminho do Monge (5º): escolha permanente (comum.mjs); guarda flags caminho
 *   ("meditacao" | "sombras" | "astral"); Aprofundado (11º) e Supremo (17º) seguem a escolha;
 *   os poderes de caminho só aparecem para quem tem o caminho.
 * - Ataque desarmado (Punhos Disciplinados): arma natural criada com a habilidade; dano 1d8, 1d10 no
 *   9º e 1d12 no 17º (derivado do nível), Impacto, 20/x2, Leve e Ágil.
 * - Braços Astrais (Caminho Astral): ação de movimento, 2 PM, até o fim da cena ou dispensar.
 *   Ativos: ataque desarmado com alcance de 3 m, dano de Essência e Sabedoria no lugar de
 *   Força/Destreza no ataque e no dano.
 * - Rajada de Golpes (3º): 1 PM ao Agredir desarmado: ataque adicional sem atributo no dano.
 * - Restrição de equipamento: aviso ao empunhar arma ou vestir armadura/escudo (túnica pode).
 * - Defesa Interior e Passo Ligeiro: passivos (classes-dados.mjs).
 * - Atacar nas Sombras: botão que abre o Teste de Resistência já preenchido (Visão ou Audição,
 *   CD = 10 + metade do nível + Sabedoria); para jogador, o card com a CD vai ao chat.
 */
import { SISTEMA_ID, CATEGORIAS_ARMADURA_CORPO } from "../config.mjs";
import { calcularAtaque, calcularCD } from "../combate.mjs";
import { PROVEDORES_ATAQUE, MODIFICADORES_ATAQUE, ATAQUES_ADICIONAIS, executarAtaque, itensDoAtor } from "../combate-chat.mjs";
import { ACOES_DE_MECANICA, APOS_CONCEDER, classeDoAtor } from "../classes.mjs";
import { FIM_DA_CENA } from "../condicoes-foundry.mjs";
import { registrarLinhas, itemDeClasse, marcarStatus, avisarNoChat, DEPOIS_DA_ESCOLHA, USO_PROPRIO } from "./comum.mjs";

// Rajada de Golpes é escolhida no diálogo de ataque (não no botão Usar)
USO_PROPRIO.add("monge__rajada-de-golpes");

const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);

export const CAMINHOS = ["meditacao", "sombras", "astral"];
const CUSTO_BRACOS = 2;

const ehMonge = actor => classeDoAtor(actor)?.id === "monge";
const bracosAtivos = actor => !!actor.getFlag(SISTEMA_ID, "bracosAstrais");
const ehDesarmadoDoMonge = item => !!item?.flags?.[SISTEMA_ID]?.desarmadoMonge;

/* ---------------- Caminho ---------------- */
DEPOIS_DA_ESCOLHA.set("caminho-do-monge", (actor, i) => actor.setFlag(SISTEMA_ID, "caminho", CAMINHOS[i]));

/* ---------------- Ataque desarmado ---------------- */
async function criarAtaqueDesarmado(actor) {
  if (actor.items.some(ehDesarmadoDoMonge)) return null;
  const [item] = await actor.createEmbeddedDocuments("Item", [{
    name: loc("ICARUS.Monge.Desarmado"), type: "arma", img: "icons/svg/combat.svg",
    system: {
      categoria: "simples", grupo: "corpo-a-corpo", empunhadura: "leve", dano: "1d8", tiposDano: ["impacto"],
      criticoMargem: 20, criticoMult: 2, alcance: "corpo-a-corpo", propriedades: ["leve", "agil"],
      proficiencia: "sim", empunhada: true, quantidade: 1, espacos: 0, preco: 0
    },
    flags: { [SISTEMA_ID]: { desarmado: true, desarmadoMonge: true } }
  }]);
  return item;
}
APOS_CONCEDER.set("punhos-disciplinados", actor => criarAtaqueDesarmado(actor));
ACOES_DE_MECANICA.set("monge:desarmado", actor => criarAtaqueDesarmado(actor));

/* ---------------- Braços Astrais ---------------- */
ACOES_DE_MECANICA.set("monge:bracos", async actor => {
  if (bracosAtivos(actor)) {
    await actor.unsetFlag(SISTEMA_ID, "bracosAstrais");
    await marcarStatus(actor, "bracos-astrais", false);
    return avisarNoChat(actor, fmt("ICARUS.Monge.BracosDispensou", { nome: actor.name }));
  }
  const ok = await foundry.applications.api.DialogV2.confirm({
    window: { title: loc("ICARUS.Monge.BracosAstrais") },
    content: `<p>${Handlebars.escapeExpression(fmt("ICARUS.Monge.BracosConfirma", { custo: CUSTO_BRACOS, pm: actor.system.pm.value }))}</p>`,
    rejectClose: false
  });
  if (!ok) return;
  if (actor.system.pm.value < CUSTO_BRACOS) return ui.notifications.warn(fmt("ICARUS.Poderes.SemPM", { nome: actor.name, pm: CUSTO_BRACOS, atual: actor.system.pm.value }));
  await actor.update({ "system.pm.value": actor.system.pm.value - CUSTO_BRACOS, [`flags.${SISTEMA_ID}.bracosAstrais`]: true });
  await marcarStatus(actor, "bracos-astrais", true);
  return avisarNoChat(actor, fmt("ICARUS.Monge.BracosManifestou", { nome: actor.name }));
});
FIM_DA_CENA.push(async actor => {
  if (!bracosAtivos(actor)) return;
  await actor.unsetFlag(SISTEMA_ID, "bracosAstrais");
  await marcarStatus(actor, "bracos-astrais", false);
});

// Braços Astrais ativos: Sabedoria no lugar de Força/Destreza no ataque e no dano desarmado
MODIFICADORES_ATAQUE.push(({ actor, item, modo }) => {
  if (!bracosAtivos(actor) || !ehDesarmadoDoMonge(item)) return null;
  const s = actor.system;
  const atq = calcularAtaque(s, item.system, modo, itensDoAtor(actor));
  const usado = atq.agil ? s.atributos.DES.total : s.atributos[s.pericias.luta.atributo].total;
  return { bonus: s.atributos.SAB.total - usado, atributoDano: "SAB", linhas: [loc("ICARUS.Monge.LinhaBracos")] };
});

/* ---------------- Rajada de Golpes ---------------- */
PROVEDORES_ATAQUE.push((actor, item) => {
  if (!ehDesarmadoDoMonge(item) || !itemDeClasse(actor, "monge", "rajada-de-golpes")) return null;
  return {
    id: "rajada", titulo: loc("ICARUS.Monge.Rajada"),
    campos: [{ tipo: "checkbox", nome: "rajada", valor: false, rotulo: loc("ICARUS.Monge.RajadaRotulo"), dica: fmt("ICARUS.Monge.RajadaDica", { pm: actor.system.pm.value }) }]
  };
});
ATAQUES_ADICIONAIS.push(async (actor, item, modo, escolhas) => {
  if (!escolhas.rajada || !ehDesarmadoDoMonge(item)) return;
  if (actor.system.pm.value < 1) return ui.notifications.warn(fmt("ICARUS.Poderes.SemPM", { nome: actor.name, pm: 1, atual: actor.system.pm.value }));
  await actor.update({ "system.pm.value": actor.system.pm.value - 1 });
  // Ataque adicional: mesma rolagem/alvos, sem atributo no dano e sem repetir opções de uso único
  return executarAtaque(actor, item, modo, { ...escolhas, rajada: false, segundoSemAtributo: true, bonusExtra: escolhas.bonusExtra });
});

/* ---------------- Restrição de equipamento ---------------- */
function avisarRestricao(item) {
  const actor = item.parent;
  if (!actor || !ehMonge(actor)) return;
  if (item.type === "arma" && item.system.empunhada && !item.flags?.[SISTEMA_ID]?.desarmado) ui.notifications.warn(loc("ICARUS.Monge.NaoUsaArmas"));
  if (item.type === "equipamento" && item.system.equipado && ([...CATEGORIAS_ARMADURA_CORPO, "escudo", "escudo-acoplado"].includes(item.system.categoria))) {
    ui.notifications.warn(loc("ICARUS.Monge.NaoUsaArmaduras"));
  }
}
Hooks.on("updateItem", (item, mudancas, opcoes, userId) => {
  if (userId !== game.user.id) return;
  if (foundry.utils.hasProperty(mudancas, "system.empunhada") || foundry.utils.hasProperty(mudancas, "system.equipado")) avisarRestricao(item);
});

/* ---------------- Atacar nas Sombras ---------------- */
ACOES_DE_MECANICA.set("monge:sombras", async actor => {
  const cd = calcularCD(actor.system, "SAB").cd;
  if (game.user.isGM) {
    return game.icarus.testes.abrirResistencia({ tipos: ["visao", "audicao"], pericia: "visao", origem: loc("ICARUS.Monge.AtacarNasSombras"), cd });
  }
  return avisarNoChat(actor, fmt("ICARUS.Monge.SombrasChat", { nome: actor.name, cd }));
});

/* ---------------- Aba Classe ---------------- */
registrarLinhas("monge", actor => {
  const linhas = [];
  if (itemDeClasse(actor, "monge", "punhos-disciplinados") && !actor.items.some(ehDesarmadoDoMonge)) {
    linhas.push({ id: "monge:desarmado", botao: true, rotulo: loc("ICARUS.Monge.CriarDesarmado") });
  }
  if (itemDeClasse(actor, "monge", "atacar-nas-sombras")) {
    linhas.push({ id: "monge:sombras", botao: true, rotulo: loc("ICARUS.Monge.AtacarNasSombras"), info: fmt("ICARUS.Monge.SombrasInfo", { cd: calcularCD(actor.system, "SAB").cd }) });
  }
  if (actor.getFlag(SISTEMA_ID, "caminho") === "astral") {
    const ativo = bracosAtivos(actor);
    linhas.push({ id: "monge:bracos", botao: true, ativo, rotulo: ativo ? loc("ICARUS.Monge.DispensarBracos") : loc("ICARUS.Monge.ManifestarBracos"),
      info: ativo ? loc("ICARUS.Monge.BracosInfoAtivo") : fmt("ICARUS.Monge.BracosInfo", { custo: CUSTO_BRACOS }) });
  }
  return linhas;
});
