/**
 * Mercador com as regras do personagem (sem Foundry; testado em tests/mercador.test.mjs).
 * Desde a 0.35.0 o ator "mercador" usa o mesmo modelo de dados do personagem (atributos,
 * perícias com treino/outros, Defesa derivada, proficiências) mais a loja. Aqui ficam a conversão
 * dos mercadores antigos (atributos, Defesa e perícias digitados) e os padrões.
 */
import { ATRIBUTOS, PERICIAS, PROFICIENCIAS_ARMA, CATEGORIAS_ARMADURA_CORPO } from "./config.mjs";

const n = v => Math.trunc(Number(v) || 0);
const sem = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/** Proficiências do mercador: tudo, para não gerar penalidade inesperada (o Mestre restringe). */
export const PROFICIENCIAS_DO_MERCADOR = { armas: [...PROFICIENCIAS_ARMA], armaduras: [...CATEGORIAS_ARMADURA_CORPO], escudo: true, tunicas: true, texto: "" };

/** Chave da perícia pelo nome livre ("Barganha", "intimidação"), ou null. */
export const chaveDaPericiaPorNome = nome => PERICIAS.find(p => sem(p.nome) === sem(nome) || p.chave === sem(nome).replace(/ /g, ""))?.chave ?? null;

/**
 * Bônus antigo (o total digitado) → { treino, outros } que reproduzem o mesmo total com a fórmula
 * do personagem (atributo + treino + outros). Bônus acima do atributo vira treinado (+2) e o resto em "outros".
 */
export function periciaDoBonusAntigo(bonus, atributoTotal) {
  const resto = n(bonus) - n(atributoTotal);
  if (resto >= 2) return { treino: 1, outros: resto - 2 };
  return { treino: 0, outros: resto };
}

/** O mercador ainda está no formato antigo (antes da 0.35.0)? */
export const ehMercadorAntigo = source =>
  typeof source?.defesa === "number" || Array.isArray(source?.pericias) || ATRIBUTOS.some(k => typeof source?.atributos?.[k] === "number");

/**
 * Converte o system de um mercador antigo para o formato do personagem (muda e devolve source):
 * atributos digitados → base; Defesa digitada → "Defesa manual" ligada com o valor antigo;
 * perícias livres → chaves de PERICIAS (as que não casam vão para as notas). As habilidades
 * livres ficam em "habilidades" até a migração do mundo criar os poderes (itens não nascem aqui).
 */
export function converterMercadorAntigo(source) {
  // Nível do personagem vai de 1 a 25 (o mercador antigo aceitava 0)
  if (source && typeof source.nivel === "number" && source.nivel < 1) source.nivel = 1;
  if (!source || !ehMercadorAntigo(source)) return source;
  const atributos = {};
  for (const k of ATRIBUTOS) {
    const v = source.atributos?.[k];
    atributos[k] = typeof v === "number" ? { base: n(v), racial: 0, temp: 0 } : { base: n(v?.base), racial: n(v?.racial), temp: n(v?.temp) };
  }
  source.atributos = atributos;
  if (typeof source.defesa === "number") {
    source.defesaManual = { ativo: true, valor: n(source.defesa) };
    source.defesa = { outros: 0 };
  }
  if (Array.isArray(source.pericias)) {
    const pericias = {};
    const sobra = [];
    for (const p of source.pericias) {
      if (!String(p?.nome ?? "").trim()) continue;
      const chave = chaveDaPericiaPorNome(p.nome);
      if (!chave) { sobra.push(`${p.nome} ${n(p.bonus) >= 0 ? "+" : ""}${n(p.bonus)}`); continue; }
      const atributo = PERICIAS.find(x => x.chave === chave).atributo;
      pericias[chave] = { ...periciaDoBonusAntigo(p.bonus, atributos[atributo].base), atributo };
    }
    source.pericias = pericias;
    if (sobra.length) source.notas = `${source.notas ?? ""}<p><strong>Perícias antigas (não reconhecidas):</strong> ${esc(sobra.join(", "))}</p>`;
  }
  source.classeConfig = { ...(source.classeConfig ?? {}), manual: true };
  if (!source.proficiencias || typeof source.proficiencias !== "object" || Array.isArray(source.proficiencias)) source.proficiencias = structuredClone(PROFICIENCIAS_DO_MERCADOR);
  return source;
}

/** Itens "poder" a partir das habilidades livres antigas ({ nome, descricao }). */
export function poderesDasHabilidades(habilidades = []) {
  return (habilidades ?? []).filter(h => String(h?.nome ?? "").trim()).map(h => ({
    name: String(h.nome).trim(), type: "poder", img: "icons/svg/aura.svg",
    system: { fonte: "geral", descricao: h.descricao ? `<p>${esc(h.descricao)}</p>` : "" }
  }));
}

/**
 * Os jogadores conseguem abrir a vitrine? O Foundry só entrega o duplo clique (token ou diretório)
 * a quem tem pelo menos "Limitado" (1) no ator. @param {object} ownership  actor.ownership
 * @param {string[]} jogadores  ids dos usuários que não são Mestre
 */
export function jogadoresVeemALoja(ownership = {}, jogadores = []) {
  const padrao = Number(ownership.default ?? 0);
  // -1 = herdar (o padrão)
  const nivel = id => (ownership[id] === undefined || Number(ownership[id]) === -1 ? padrao : Number(ownership[id]));
  return jogadores.length === 0 || jogadores.every(id => nivel(id) >= 1);
}

/** O item é do estoque da loja (vende) ou é do próprio mercador (equipamento, poder, magia)? */
export const ehEstoque = item => !!item?.flags?.["icarus-rpg"]?.loja && item.flags["icarus-rpg"].loja.venda !== false;
