/**
 * Lista de participantes para os diálogos dos testes: tokens da cena (inclusive não vinculados,
 * com o ator sintético) e atores do mundo que não têm token vinculado na cena.
 * Identificação por uuid (do token quando houver, senão do ator).
 * Tipos de ator aceitos: hoje o sistema só tem "personagem"; quem tem dono jogador é PJ, o resto é NPC.
 */
import { nomeDoParticipante, retratoDoParticipante, donosJogadores } from "../testes-sessao.mjs";

export const TIPOS_ACEITOS = ["personagem", "npc", "ameaca"];

const ordenar = (a, b) => a.nome.localeCompare(b.nome, "pt-BR", { numeric: true });

/** Todos os candidatos: [{ uuid, nome, img, jogadores, pj, token, actor }]. */
export function candidatos() {
  const lista = [];
  const vinculadosNaCena = new Set();
  for (const t of canvas?.scene?.tokens ?? []) {
    if (!t.actor || !TIPOS_ACEITOS.includes(t.actor.type)) continue;
    if (t.actorLink) vinculadosNaCena.add(t.actor.id);
    lista.push({ uuid: t.uuid, actor: t.actor, token: t });
  }
  for (const a of game.actors) {
    if (!TIPOS_ACEITOS.includes(a.type) || vinculadosNaCena.has(a.id)) continue;
    lista.push({ uuid: a.uuid, actor: a, token: null });
  }
  return lista.map(c => {
    const donos = donosJogadores(c.actor);
    return {
      ...c, nome: nomeDoParticipante(c.actor, c.token), img: retratoDoParticipante(c.actor, c.token),
      jogadores: donos.map(u => u.name).join(", "), pj: donos.length > 0, naCena: !!c.token
    };
  }).sort(ordenar);
}

/** Candidatos agrupados (Personagens de jogadores / NPCs), marcando os selecionados. */
export function gruposDeCandidatos(lista, selecionados = new Set()) {
  const marca = c => ({ uuid: c.uuid, nome: c.nome, img: c.img, jogadores: c.jogadores, naCena: c.naCena, marcado: selecionados.has(c.uuid) });
  return [
    { id: "pj", rotulo: "ICARUS.Testes.Grupos.pj", itens: lista.filter(c => c.pj).map(marca) },
    { id: "npc", rotulo: "ICARUS.Testes.Grupos.npc", itens: lista.filter(c => !c.pj).map(marca) }
  ].filter(g => g.itens.length);
}

/** uuids dos tokens selecionados na cena. */
export const uuidsSelecionados = () => (canvas?.tokens?.controlled ?? []).filter(t => t.actor).map(t => t.document.uuid);

/** Filtra as linhas do seletor pelo texto (sem re-renderizar). */
export function filtrarLinhas(raiz, termo) {
  const n = s => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const t = n(termo);
  for (const linha of raiz.querySelectorAll(".seletor-linha")) linha.hidden = !!t && !n(linha.dataset.nome).includes(t);
}
