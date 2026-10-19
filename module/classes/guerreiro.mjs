/**
 * Guerreiro:
 * - Recobrar o Fôlego (1/cena, ação de movimento): recupera 1d8 + nível + CON PV (rola e aplica).
 * - Ataque Extra (7º) / Aprimorado (15º): gasta PM para uma ação de Agredir adicional; aqui só o
 *   contador "Agredir extra" do turno (zera no início do turno) e o PM com confirmação.
 * - Segunda Tentativa, Embalo de Batalha etc.: botões "Usar" (PM e card no chat), sem automação.
 */
import { SISTEMA_ID } from "../config.mjs";
import { INICIO_DO_TURNO } from "../acoes.mjs";
import { ACOES_DE_MECANICA } from "../classes.mjs";
import { FIM_DA_CENA } from "../condicoes-foundry.mjs";
import { registrarLinhas, itemDeClasse, avisarNoChat, USO_PROPRIO } from "./comum.mjs";

const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);

const folegoUsado = actor => !!actor.getFlag(SISTEMA_ID, "folegoUsado");

USO_PROPRIO.add("guerreiro__recobrar-o-folego");
ACOES_DE_MECANICA.set("guerreiro:folego", async actor => {
  if (folegoUsado(actor)) return ui.notifications.warn(loc("ICARUS.Guerreiro.FolegoUsado"));
  const s = actor.system;
  const formula = `1d8 + ${s.nivel} + ${s.atributos.CON.total}`.replace("+ -", "- ");
  const ok = await foundry.applications.api.DialogV2.confirm({
    window: { title: loc("ICARUS.Guerreiro.Folego") },
    content: `<p>${Handlebars.escapeExpression(fmt("ICARUS.Guerreiro.FolegoConfirma", { formula }))}</p>`,
    rejectClose: false
  });
  if (!ok) return;
  const roll = await new Roll(formula).evaluate();
  const antes = s.pv.value;
  const depois = Math.min(s.pv.max, antes + Math.max(0, roll.total));
  await actor.update({ "system.pv.value": depois });
  await actor.setFlag(SISTEMA_ID, "folegoUsado", true);
  return avisarNoChat(actor, fmt("ICARUS.Guerreiro.FolegoChat", { nome: actor.name, total: roll.total, antes, depois }), { rolls: [roll] });
});
FIM_DA_CENA.push(async actor => { if (folegoUsado(actor)) await actor.unsetFlag(SISTEMA_ID, "folegoUsado"); });

/** Ataque Extra: custo do item que o personagem tem (Aprimorado, se tiver). */
function ataqueExtra(actor) {
  return itemDeClasse(actor, "guerreiro", "ataque-extra-aprimorado") ?? itemDeClasse(actor, "guerreiro", "ataque-extra");
}
USO_PROPRIO.add("guerreiro__ataque-extra");
USO_PROPRIO.add("guerreiro__ataque-extra-aprimorado");
ACOES_DE_MECANICA.set("guerreiro:extra", async actor => {
  const item = ataqueExtra(actor);
  if (!item) return;
  const custo = item.system.custoPM ?? 1;
  const ok = await foundry.applications.api.DialogV2.confirm({
    window: { title: item.name },
    content: `<p>${Handlebars.escapeExpression(fmt("ICARUS.Guerreiro.ExtraConfirma", { custo, pm: actor.system.pm.value }))}</p>`,
    rejectClose: false
  });
  if (!ok) return;
  if (custo > actor.system.pm.value) return ui.notifications.warn(fmt("ICARUS.Poderes.SemPM", { nome: actor.name, pm: custo, atual: actor.system.pm.value }));
  const n = (actor.getFlag(SISTEMA_ID, "agredirExtra") ?? 0) + 1;
  await actor.update({ "system.pm.value": actor.system.pm.value - custo, [`flags.${SISTEMA_ID}.agredirExtra`]: n });
  return avisarNoChat(actor, fmt("ICARUS.Guerreiro.ExtraChat", { nome: actor.name, custo, n }));
});
INICIO_DO_TURNO.push(async actor => { if (actor.getFlag(SISTEMA_ID, "agredirExtra")) await actor.unsetFlag(SISTEMA_ID, "agredirExtra"); });

registrarLinhas("guerreiro", actor => {
  const linhas = [];
  if (itemDeClasse(actor, "guerreiro", "recobrar-o-folego")) {
    const s = actor.system;
    linhas.push({ id: "guerreiro:folego", botao: true, rotulo: loc("ICARUS.Guerreiro.Folego"), desativado: folegoUsado(actor),
      info: folegoUsado(actor) ? loc("ICARUS.Guerreiro.FolegoUsado") : fmt("ICARUS.Guerreiro.FolegoInfo", { nivel: s.nivel, con: s.atributos.CON.total }) });
  }
  const extra = ataqueExtra(actor);
  if (extra) {
    linhas.push({ id: "guerreiro:extra", botao: true, rotulo: extra.name,
      info: fmt("ICARUS.Guerreiro.ExtraInfo", { custo: extra.system.custoPM ?? 1, n: actor.getFlag(SISTEMA_ID, "agredirExtra") ?? 0 }) });
  }
  return linhas;
});
