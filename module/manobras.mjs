/**
 * Manobras pela ficha (aba Combate) ou pelo card de ataque corpo a corpo: escolhe a manobra e o
 * alvo marcado, e inicia o teste oposto (module/testes-sessao.mjs → iniciarManobra).
 * A manobra é feita NO LUGAR de um ataque (aviso no diálogo).
 */
import { MANOBRAS, MANOBRAS_A_DISTANCIA } from "./combate.mjs";
import { iniciarManobra } from "./testes-sessao.mjs";
import { tokenDoAtor } from "./regras-ataque.mjs";

const loc = k => game.i18n.localize(k);
const esc = t => Handlebars.escapeExpression(t ?? "");

export async function abrirManobra(actor) {
  const alvos = Array.from(game.user.targets ?? []);
  if (alvos.length !== 1) return ui.notifications.warn(loc("ICARUS.Manobra.UmAlvo"));
  const alvo = alvos[0];
  const content = `<div class="icarus-uso">
    <p class="dica">${esc(loc("ICARUS.Manobra.NoLugar"))}</p>
    <label class="linha">${esc(loc("ICARUS.Manobra.Escolha"))}<select name="manobra">
      ${MANOBRAS.map(m => `<option value="${m}">${esc(loc(`ICARUS.Manobra.Tipos.${m}`))}</option>`).join("")}
    </select></label>
    <label class="linha">${esc(loc("ICARUS.Manobra.Pericia"))}<select name="pericia">
      <option value="luta">${esc(loc("ICARUS.Pericias.luta"))}</option>
      <option value="pontaria">${esc(loc("ICARUS.Pericias.pontaria"))}</option>
    </select></label>
    <label class="chk"><input type="checkbox" name="poder"> ${esc(loc("ICARUS.Manobra.PoderPermite"))}</label>
    <p class="dica">${esc(game.i18n.format("ICARUS.Manobra.Alvo", { alvo: alvo.name }))} · ${esc(loc("ICARUS.Manobra.Quebrar"))}</p>
  </div>`;
  const escolha = await foundry.applications.api.DialogV2.wait({
    window: { title: `${loc("ICARUS.Manobra.Titulo")}: ${actor.name}` },
    content,
    buttons: [
      { action: "ok", label: loc("ICARUS.Manobra.Iniciar"), default: true, callback: (ev, b) => ({
        manobra: b.form.elements.manobra.value, pericia: b.form.elements.pericia.value, poder: b.form.elements.poder.checked }) },
      { action: "cancelar", label: loc("ICARUS.Testes.Cancelar") }
    ],
    rejectClose: false
  });
  if (!escolha || typeof escolha !== "object") return null;
  // À distância (Pontaria) só Desarmar, salvo poder que permita
  if (escolha.pericia === "pontaria" && !MANOBRAS_A_DISTANCIA.includes(escolha.manobra) && !escolha.poder) {
    return ui.notifications.warn(loc("ICARUS.Manobra.SoDesarmarDistancia"));
  }
  const meu = tokenDoAtor(actor);
  return iniciarManobra({
    manobra: escolha.manobra, pericia: escolha.pericia,
    atacanteUuid: meu?.document?.uuid ?? actor.uuid, alvoUuid: alvo.document.uuid
  });
}
