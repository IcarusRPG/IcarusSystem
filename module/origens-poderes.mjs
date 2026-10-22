/**
 * Poderes de Origem no Foundry (usados pelo botão "Usar" do card, module/acoes.mjs → usarPoder,
 * que já confirma e desconta o PM):
 * - uso limitado (cena, dia ou cidade): consome o recurso do poder; sem uso, avisa e não usa;
 * - CD (Gracejo, Charme Fatal, Sátira Cortante): o card mostra a CD 10 + metade do nível + atributo
 *   e um botão para o Mestre abrir o Teste de Resistência (Vontade) já preenchido.
 * Condições e efeitos sem mecânica de ficha não são aplicados: o card traz o texto e o Mestre decide.
 */
import { SISTEMA_ID } from "./config.mjs";
import { ORIGENS } from "./origens-dados.mjs";
import { GANCHOS_DE_PODER } from "./acoes.mjs";
import { calcularCD } from "./combate.mjs";
import { alterarRecurso } from "./recursos.mjs";
import { idDoRecurso } from "./origens.mjs";

const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);
const esc = t => Handlebars.escapeExpression(String(t ?? ""));

for (const origem of ORIGENS) {
  const p = origem.poder;
  GANCHOS_DE_PODER.set(`origem__${p.id}`, {
    antes: actor => {
      if (!p.usoLimitado) return true;
      const r = (actor.system.recursos ?? []).find(x => x.id === idDoRecurso(p.id));
      if (r && r.valor <= 0) {
        ui.notifications.warn(fmt("ICARUS.Origens.SemUso", { poder: p.nome, recarga: loc(`ICARUS.Recursos.Recargas.${p.usoLimitado}`) }));
        return false;
      }
      return true;
    },
    depois: async actor => {
      const r = (actor.system.recursos ?? []).find(x => x.id === idDoRecurso(p.id));
      if (p.usoLimitado && r) await alterarRecurso(actor, r.id, { valor: r.valor - 1 });
      if (!p.cdAtributo) return;
      const cd = calcularCD(actor.system, p.cdAtributo).cd;
      const content = `<div class="icarus-rolagem icarus-poder"><h3 class="rolagem-nome">${esc(p.nome)}</h3>
        <div class="rolagem-tipo">${esc(fmt("ICARUS.Origens.CD", { cd, atributo: p.cdAtributo }))}</div>
        <p class="dica">${esc(loc("ICARUS.Origens.CondicaoSugerida"))}</p>
        <button type="button" class="btn peq" data-action="origem-resistencia" data-cd="${cd}" data-poder="${esc(p.nome)}">${esc(fmt("ICARUS.Origens.AbrirResistencia", { cd }))}</button></div>`;
      await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content, flags: { [SISTEMA_ID]: { cdOrigem: cd } } });
    }
  });
}

export function registrarPoderesDeOrigem() {
  Hooks.on("renderChatMessage", (mensagem, html) => {
    const raiz = html[0] ?? html;
    raiz.querySelector?.("[data-action='origem-resistencia']")?.addEventListener("click", ev => {
      ev.preventDefault();
      if (!game.user.isGM) return ui.notifications.info(loc("ICARUS.Origens.SoMestreAbre"));
      const { cd, poder } = ev.currentTarget.dataset;
      return game.icarus.testes.abrirResistencia({ tipos: ["vontade"], pericia: "vontade", origem: poder, cd: Number(cd) });
    });
  });
}
