/**
 * Recursos de classe (genérico): { id, nome, valor, max, recarga: "cena" | "rodada" | "descanso" }.
 * Usados por usos limitados (Recobrar o Fôlego, Segunda Tentativa, Sorte de Ladino, Presa
 * Condenada…). O Mestre/jogador cria à mão ou pede "Sugerir pelos textos" (frases "uma vez por
 * cena/rodada/turno/dia" nas habilidades e poderes da ficha).
 * Recarga: "cena" ao Encerrar cena; "rodada" no início do turno do personagem; "descanso" pelo botão.
 */
import { INICIO_DO_TURNO } from "./acoes.mjs";
import { FIM_DA_CENA } from "./condicoes-foundry.mjs";
import { RECARGAS } from "./config.mjs";

export { RECARGAS };

/** Frequência citada no texto ("uma vez por cena" → "cena"), ou null. */
export function frequenciaDoTexto(html) {
  const t = String(html ?? "").replace(/<[^>]+>/g, " ").toLowerCase();
  if (/uma vez por cena/.test(t)) return "cena";
  if (/uma vez por (rodada|turno)/.test(t)) return "rodada";
  if (/uma vez por dia|por descanso/.test(t)) return "descanso";
  return null;
}

const lista = actor => foundry.utils.deepClone(actor.system.recursos ?? []);
const salvar = (actor, recursos) => actor.update({ "system.recursos": recursos });

export function adicionarRecurso(actor, { nome = game.i18n.localize("ICARUS.Recursos.Novo"), max = 1, recarga = "cena" } = {}) {
  return salvar(actor, [...lista(actor), { id: foundry.utils.randomID(), nome, valor: max, max, recarga }]);
}

export function alterarRecurso(actor, id, mudancas) {
  return salvar(actor, lista(actor).map(r => (r.id === id ? { ...r, ...mudancas, valor: Math.max(0, Math.min(mudancas.max ?? r.max, mudancas.valor ?? r.valor)) } : r)));
}

export function removerRecurso(actor, id) {
  return salvar(actor, lista(actor).filter(r => r.id !== id));
}

/** Recarrega os recursos de um tipo (ou todos). */
export async function recarregarRecursos(actor, recarga = null) {
  const atuais = lista(actor);
  if (!atuais.some(r => (!recarga || r.recarga === recarga) && r.valor < r.max)) return;
  return salvar(actor, atuais.map(r => (!recarga || r.recarga === recarga ? { ...r, valor: r.max } : r)));
}

/** Cria recursos para habilidades/poderes da ficha cujo texto cita uma frequência (sem repetir). */
export async function sugerirRecursos(actor) {
  const atuais = lista(actor);
  const nomes = new Set(atuais.map(r => r.nome));
  const novos = [];
  for (const item of actor.items.filter(i => i.type === "poder")) {
    const recarga = frequenciaDoTexto(item.system.descricao);
    if (!recarga || nomes.has(item.name)) continue;
    novos.push({ id: foundry.utils.randomID(), nome: item.name, valor: 1, max: 1, recarga });
  }
  if (!novos.length) return ui.notifications.info(game.i18n.localize("ICARUS.Recursos.NadaSugerido"));
  await salvar(actor, [...atuais, ...novos]);
  ui.notifications.info(game.i18n.format("ICARUS.Recursos.Sugeridos", { lista: novos.map(r => r.nome).join(", ") }));
}

INICIO_DO_TURNO.push(actor => recarregarRecursos(actor, "rodada"));
FIM_DA_CENA.push(actor => recarregarRecursos(actor, "cena"));
