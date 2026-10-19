/**
 * Poderes comuns de classe (Aumento de Atributo, Perícia Especializada) e Perícia Refinada (Ladino).
 * O efeito é derivado dos itens (classes-dados.mjs → bonusDeItensDeClasse): remover o item desfaz.
 */
import { SISTEMA_ID, ATRIBUTOS, PERICIAS } from "./config.mjs";
import { patamarDe, podeAumentarAtributo } from "./classes-dados.mjs";
import { ANTES_DE_ESCOLHER } from "./sheets/dialogo-poderes-classe.mjs";
import { APOS_CONCEDER } from "./classes.mjs";

const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);
const esc = t => Handlebars.escapeExpression(t ?? "");

/** Aumentos de Atributo que o personagem já tem: [{ atributo, patamar }]. */
const aumentosDoAtor = actor => actor.items.map(i => i.flags?.[SISTEMA_ID]?.aumentoAtributo).filter(Boolean);

/** Perícias já especialistas (treino +4 efetivo). */
const especialistas = actor => new Set(PERICIAS.filter(p => actor.system.pericias[p.chave].treino >= 2).map(p => p.chave));

/** Aumento de Atributo: escolhe o atributo (6 botões), confere "uma vez por patamar por atributo". */
ANTES_DE_ESCOLHER.set("aumento-de-atributo", async (actor, dados, { forcado }) => {
  const nivel = actor.system.nivel;
  const patamar = patamarDe(nivel);
  const existentes = aumentosDoAtor(actor);
  const atributo = await foundry.applications.api.DialogV2.wait({
    window: { title: loc("ICARUS.Comuns.AumentoTitulo") },
    content: `<p>${esc(fmt("ICARUS.Comuns.AumentoTexto", { patamar: loc(`ICARUS.Patamares.${patamar}`) }))}</p>`,
    buttons: ATRIBUTOS.map(k => ({
      action: k, label: `${loc(`ICARUS.Atributos.${k}`)}${podeAumentarAtributo(existentes, k, patamar) ? "" : " ✗"}`
    })),
    rejectClose: false
  });
  if (!ATRIBUTOS.includes(atributo)) return null;
  if (!podeAumentarAtributo(existentes, atributo, patamar) && !forcado) {
    const permitir = game.user.isGM && await foundry.applications.api.DialogV2.confirm({
      window: { title: loc("ICARUS.Comuns.AumentoTitulo") },
      content: `<p>${esc(loc("ICARUS.Comuns.UmaVezPorPatamar"))}</p><p>${esc(loc("ICARUS.Comuns.PermitirMesmoAssim"))}</p>`,
      rejectClose: false
    });
    if (!permitir) { ui.notifications.warn(loc("ICARUS.Comuns.UmaVezPorPatamar")); return null; }
  }
  dados.name = `${dados.name} (${loc(`ICARUS.Atributos.${atributo}`)})`;
  dados.flags[SISTEMA_ID].aumentoAtributo = { atributo, nivel, patamar };
  return dados;
});

/** Escolhe perícias numa lista (checkboxes), até "quantas". */
async function escolherPericias(actor, { titulo, texto, opcoes, quantas }) {
  if (!opcoes.length) { ui.notifications.warn(loc("ICARUS.Comuns.SemPericias")); return null; }
  const content = `<p>${esc(texto)}</p><div class="grade-pericias-classe">${opcoes.map(k =>
    `<label class="chk"><input type="checkbox" name="pericia" value="${k}"> ${esc(loc(`ICARUS.Pericias.${k}`))}</label>`).join("")}</div>`;
  const escolha = await foundry.applications.api.DialogV2.wait({
    window: { title: titulo },
    content,
    buttons: [
      { action: "ok", label: loc("ICARUS.Devocao.Confirmar"), default: true, callback: (ev, b) => [...b.form.querySelectorAll("input[name=pericia]:checked")].map(i => i.value) },
      { action: "cancelar", label: loc("ICARUS.Testes.Cancelar") }
    ],
    rejectClose: false
  });
  if (!Array.isArray(escolha)) return null;
  if (escolha.length !== quantas) { ui.notifications.warn(fmt("ICARUS.Comuns.EscolhaN", { n: quantas })); return null; }
  return escolha;
}

/** Perícia Especializada: uma perícia treinada e ainda não especialista vira especialista (+4). */
ANTES_DE_ESCOLHER.set("pericia-especializada", async (actor, dados) => {
  const ja = especialistas(actor);
  const opcoes = PERICIAS.map(p => p.chave).filter(k => actor.system.pericias[k].treino === 1 && !ja.has(k));
  const escolha = await escolherPericias(actor, { titulo: loc("ICARUS.Comuns.EspecializadaTitulo"), texto: loc("ICARUS.Comuns.EspecializadaTexto"), opcoes, quantas: 1 });
  if (!escolha) return null;
  dados.name = `${dados.name} (${loc(`ICARUS.Pericias.${escolha[0]}`)})`;
  dados.flags[SISTEMA_ID].periciaEspecializada = { pericia: escolha[0] };
  return dados;
});

/** Perícia Refinada (Ladino, 8º): duas perícias treinadas viram especialistas. */
export async function escolherPericiaRefinada(actor, item) {
  const ja = especialistas(actor);
  const opcoes = PERICIAS.map(p => p.chave).filter(k => actor.system.pericias[k].treino === 1 && !ja.has(k));
  const escolha = await escolherPericias(actor, { titulo: item.name, texto: loc("ICARUS.Comuns.RefinadaTexto"), opcoes, quantas: 2 });
  if (escolha) await item.setFlag(SISTEMA_ID, "periciaRefinada", escolha);
  return escolha;
}
APOS_CONCEDER.set("pericia-refinada", (actor, item) => escolherPericiaRefinada(actor, item));
