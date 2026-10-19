/**
 * Classes: dados (tools/dados/classes.json, embutido em module/dados/classes.mjs), ícones e regras
 * puras de progressão, patamares e pré-requisitos. Sem Foundry (testado em tests/classes.test.mjs).
 * Novas classes entram só acrescentando ao JSON (e o ícone em icones-classes.json).
 */
import { SISTEMA_ID, ICONE_PADRAO, PERICIAS } from "./config.mjs";
import CLASSES_JSON from "./dados/classes.mjs";
import ICONES_CLASSES from "./dados/icones-classes.mjs";
import PROFICIENCIAS_CLASSES from "./dados/proficiencias-classes.mjs";

export const CLASSES = CLASSES_JSON.classes;
export const PASTA_ICONES_CLASSES = `systems/${SISTEMA_ID}/img/Icones/classes`;

export const classePorId = id => CLASSES.find(c => c.id === id) ?? null;

/** Normaliza um nome para comparação (sem acento, minúsculo). */
export const normalizarNome = t => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Id da classe a partir do nome digitado ("Bárbaro", "barbaro") — ou null. */
export const idDaClassePorNome = nome => CLASSES.find(c => normalizarNome(c.nome) === normalizarNome(nome) || c.id === nome)?.id ?? null;

/** Ícone da classe (img do item classe, das habilidades e dos poderes dela). */
export function iconeDaClasse(id, mapa = ICONES_CLASSES) {
  const arquivo = mapa?.[id];
  return arquivo ? encodeURI(`${PASTA_ICONES_CLASSES}/${arquivo}`) : ICONE_PADRAO;
}

/** Proficiências estruturadas da classe ({ armas, armaduras, escudo, tunicas }). */
export const proficienciasDaClasse = id => PROFICIENCIAS_CLASSES[id] ?? { armas: ["simples"], armaduras: [], escudo: false, tunicas: false };

/** Confere no servidor os ícones das classes (só o Mestre, no início); avisa no console o que faltar. */
export async function verificarIconesClasses() {
  const faltando = [];
  for (const c of CLASSES) {
    const url = iconeDaClasse(c.id);
    if (url === ICONE_PADRAO) { faltando.push(`${c.nome} (sem entrada em icones-classes.json)`); continue; }
    const ok = await fetch(url, { method: "HEAD" }).then(r => r.ok).catch(() => false);
    if (!ok) faltando.push(decodeURI(url));
  }
  if (faltando.length) console.warn(`Icarus RPG | Ícones de classe não encontrados (usam o dado azul): ${faltando.join(", ")}`);
  return faltando;
}

/* ------------------------------ Perícias da classe ------------------------------ */

/** Chave da perícia pelo nome ("Prestidigitação" → "prestidigitacao"), ou null. */
export function chaveDaPericia(nome) {
  const n = normalizarNome(nome);
  return PERICIAS.find(p => normalizarNome(p.nome) === n)?.chave ?? null;
}

/**
 * Perícias obrigatórias a partir do texto da classe: "Fortitude e (Luta ou Pontaria)" →
 * [{ tipo: "fixa", chave: "fortitude" }, { tipo: "escolha", opcoes: ["luta", "pontaria"] }].
 */
export function parseObrigatorias(texto) {
  const partes = [];
  const re = /\(([^)]*)\)|([^()]+)/g;
  for (const m of String(texto ?? "").matchAll(re)) {
    if (m[1]) {
      const opcoes = m[1].split(/\s+ou\s+/i).map(chaveDaPericia).filter(Boolean);
      if (opcoes.length) partes.push({ tipo: "escolha", opcoes });
    } else {
      for (const nome of m[2].split(/\s*(?:,|\be\b)\s*/i)) {
        const chave = chaveDaPericia(nome);
        if (chave) partes.push({ tipo: "fixa", chave });
      }
    }
  }
  return partes;
}

/* ------------------------------ Progressão ------------------------------ */

/** Nível em que a habilidade é recebida (null no JSON = 1º nível, ex.: Restrição de Equipamento). */
export const nivelDaHabilidade = h => h.nivel ?? 1;

/** Habilidades da classe recebidas até um nível (uma por habilidade; versões por nível ficam na descrição). */
export const habilidadesAteNivel = (classe, nivel) => (classe?.habilidades ?? []).filter(h => nivelDaHabilidade(h) <= nivel);

/** Quantos poderes de classe a classe concede até o nível (linhas com poder: true). */
export const poderesConcedidosAteNivel = (classe, nivel) => (classe?.progressao ?? []).filter(p => p.poder && p.nivel <= nivel).length;

/**
 * Contador "Poderes de classe X / Y": escolhidos e concedidos até o nível; disponiveis = Y − X.
 * @param {number} escolhidos  quantos poderes de classe (tipoPoder "poder") o personagem tem
 */
export function contagemDePoderes(classe, nivel, escolhidos) {
  const total = poderesConcedidosAteNivel(classe, nivel);
  return { escolhidos, total, disponiveis: Math.max(0, total - escolhidos) };
}

/** Linhas da tabela de progressão (1º–20º) com o nível atual marcado. */
export function tabelaDeProgressao(classe, nivel) {
  return (classe?.progressao ?? []).map(p => ({ ...p, atual: p.nivel === nivel, alcancado: p.nivel <= nivel }));
}

/* ------------------------------ Patamares ------------------------------ */

/** Patamares (Tormenta 20 até o 20º; Paragon é o seguinte). */
export const PATAMARES = [
  { id: "iniciante", de: 1, ate: 4 },
  { id: "veterano", de: 5, ate: 10 },
  { id: "campeao", de: 11, ate: 16 },
  { id: "lenda", de: 17, ate: 20 },
  { id: "paragon", de: 21, ate: 25 }
];

/** Patamar de um nível ("iniciante", "veterano", "campeao", "lenda", "paragon"). */
export const patamarDe = nivel => (PATAMARES.find(p => nivel >= p.de && nivel <= p.ate) ?? PATAMARES[0]).id;

/* ------------------------------ Escolhas permanentes (caminho, senda, vínculo) ------------------------------ */

/**
 * Habilidades que seguem a escolha de outra (mesma posição na lista de subitens):
 * Caminho Aprofundado/Supremo seguem o Caminho do Monge; O Ápice da Senda segue a Senda.
 */
export const ESCOLHA_SEGUE = { "caminho-aprofundado": "caminho-do-monge", "caminho-supremo": "caminho-do-monge", "o-apice-da-senda": "senda-do-combatente" };

/** Habilidades da classe com escolha entre subitens (as que não seguem outra). */
export const habilidadesComEscolha = classe => (classe?.habilidades ?? []).filter(h => h.subs?.length && !ESCOLHA_SEGUE[h.id]);

/** Nome sem o parêntese ("Kyudo (Arco)" → "kyudo"). */
const nucleo = nome => normalizarNome(String(nome).replace(/\(.*?\)/g, ""));

/**
 * Subitem escolhido de uma habilidade (índice) a partir das escolhas guardadas
 * ({ [habilidadeId]: índice }), seguindo ESCOLHA_SEGUE.
 */
export function escolhaDaHabilidade(habId, escolhas = {}) {
  const base = ESCOLHA_SEGUE[habId] ?? habId;
  const i = escolhas?.[base];
  return Number.isInteger(i) ? i : null;
}

/** Nomes dos grupos liberados pelas escolhas (ex.: "Caminho Astral", "Kyudo (Arco)"). */
export function gruposEscolhidos(classe, escolhas = {}) {
  return habilidadesComEscolha(classe).map(h => {
    const i = escolhaDaHabilidade(h.id, escolhas);
    return i === null ? null : h.subs[i]?.nome;
  }).filter(Boolean);
}

/** O grupo exigido pelo poder ("Senda do Kyudo", "Caminho Astral") foi escolhido? */
export function atendeGrupo(requerGrupo, grupos = []) {
  if (!requerGrupo) return true;
  const alvo = normalizarNome(requerGrupo);
  return grupos.some(g => { const n = nucleo(g); return n && (alvo === n || alvo.includes(n) || n.includes(alvo)); });
}

/* ------------------------------ Pré-requisitos dos poderes ------------------------------ */

const NOMES_ATRIBUTO = { FOR: "Força", DES: "Destreza", CON: "Constituição", INT: "Inteligência", SAB: "Sabedoria", CAR: "Carisma" };

/**
 * Valida um poder de classe para o personagem. Nunca bloqueia (só ✓ / ✗ / ⚠), exceto
 * "já escolhido" em poder não repetível.
 * @param {object} classe
 * @param {object} poder  entrada de classes.json
 * @param {{ nivel, atributos: {FOR:n…}, treino: {pericia: 0|1|2}, tem: Set<string>, contagem?: Map<string, number>, grupos: string[] }} p
 * @returns {{ itens: {texto, estado: "ok"|"falta"|"conferir"}[], ok: boolean, jaEscolhido: boolean, visivel: boolean, disponivel: boolean }}
 */
export function validarPoder(classe, poder, p) {
  const itens = [];
  const nomePoder = id => classe.poderes.find(x => x.id === id)?.nome ?? id;
  if (poder.nivelMinimo) itens.push({ texto: `${poder.nivelMinimo}º nível`, estado: p.nivel >= poder.nivelMinimo ? "ok" : "falta" });
  const atrs = Object.entries(poder.atributoMinimo ?? {});
  if (atrs.length) {
    // "Força 1 ou Destreza 1": basta um
    const qualquer = /\bou\b/i.test(poder.prerequisito ?? "") && atrs.length > 1;
    const atende = ([k, v]) => (p.atributos?.[k] ?? 0) >= v;
    const texto = atrs.map(([k, v]) => `${NOMES_ATRIBUTO[k] ?? k} ${v}`).join(qualquer ? " ou " : " e ");
    itens.push({ texto, estado: (qualquer ? atrs.some(atende) : atrs.every(atende)) ? "ok" : "falta" });
  }
  for (const id of poder.requerPoderes ?? []) itens.push({ texto: nomePoder(id), estado: p.tem?.has(id) ? "ok" : "falta" });
  if (poder.requerGrupo) itens.push({ texto: poder.requerGrupo, estado: atendeGrupo(poder.requerGrupo, p.grupos) ? "ok" : "falta" });
  // "treinado em X" também é conferido; o resto do texto fica para o Mestre confirmar
  let resto = String(poder.prerequisito ?? "");
  for (const m of resto.matchAll(/treinad[oa] em ([A-Za-zÀ-ú]+)/gi)) {
    const chave = chaveDaPericia(m[1]);
    if (chave) itens.push({ texto: m[0], estado: (p.treino?.[chave] ?? 0) >= 1 ? "ok" : "falta" });
  }
  resto = resto.replace(/treinad[oa] em [A-Za-zÀ-ú]+/gi, "").replace(/\d+º nível/g, "");
  for (const [, nome] of Object.entries(NOMES_ATRIBUTO)) resto = resto.replace(new RegExp(`${nome} \d+`, "g"), "");
  for (const id of poder.requerPoderes ?? []) resto = resto.replace(nomePoder(id), "");
  if (poder.requerGrupo) resto = resto.replace(poder.requerGrupo, "");
  resto = resto.replace(/[,;.]|\b(e|ou)\b/gi, " ").trim();
  if (resto.length > 2) itens.push({ texto: resto, estado: "conferir" });
  // Não repetível: uma vez; repetível com maxEscolhas (Treino Extra: 2): até o limite
  const vezes = p.contagem?.get?.(poder.id) ?? (p.tem?.has(poder.id) ? 1 : 0);
  const jaEscolhido = poder.repetivel ? (Number(poder.maxEscolhas) > 0 && vezes >= poder.maxEscolhas) : vezes > 0;
  const ok = itens.every(i => i.estado !== "falta");
  return {
    itens, ok, jaEscolhido,
    // Poderes de caminho/senda só aparecem para quem escolheu o caminho
    visivel: atendeGrupo(poder.requerGrupo, p.grupos),
    disponivel: ok && !jaEscolhido
  };
}

/* ------------------------------ Poderes comuns ------------------------------ */

/**
 * Aumento de Atributo: +1 num atributo, várias vezes, mas só uma vez por patamar para o mesmo
 * atributo. existentes = [{ atributo, patamar }] dos que o personagem já tem.
 */
export const podeAumentarAtributo = (existentes, atributo, patamar) => !existentes.some(e => e.atributo === atributo && e.patamar === patamar);

/**
 * Bônus derivados dos itens (sem Efeito Ativo e sem mexer na Base):
 * - aumentos: { FOR: n, … } dos Aumentos de Atributo;
 * - especialistas: perícias que viram especialista (+4) por Perícia Especializada ou Perícia Refinada.
 * @param {{ flags? }[]} itens
 */
export function bonusDeItensDeClasse(itens = []) {
  const aumentos = {};
  const especialistas = new Set();
  const treinadas = new Set();
  for (const i of itens) {
    const f = i?.flags?.[SISTEMA_ID];
    if (!f) continue;
    if (f.aumentoAtributo?.atributo) aumentos[f.aumentoAtributo.atributo] = (aumentos[f.aumentoAtributo.atributo] ?? 0) + 1;
    if (f.periciaEspecializada?.pericia) especialistas.add(f.periciaEspecializada.pericia);
    for (const p of f.periciaRefinada ?? []) especialistas.add(p);
    for (const p of f.periciasTreinadas ?? []) treinadas.add(p);
  }
  return { aumentos, especialistas, treinadas };
}

/* ------------------------------ Efeitos passivos de habilidades ------------------------------ */

/** Habilidade de classe que o personagem tem? (itens = lista de { flags }) */
export const temHabilidadeNosItens = (itens, classeId, habId) => (itens ?? []).some(i => i?.flags?.[SISTEMA_ID]?.id === `${classeId}__${habId}`);

/**
 * Bônus passivos derivados de habilidades (regras no texto do Anexo A):
 * - Pele Rija (Bárbaro): +2 Defesa sem armadura ou com leve, e sem túnica;
 * - Defesa Interior (Monge): +SAB na Defesa sem armadura nem escudo (túnica não impede);
 * - Passo Ligeiro (Monge): +3 m de deslocamento sem armadura.
 * @param {object[]} itens
 * @param {{ tipoArmadura: string, usandoEscudo: boolean, vestindoTunica: boolean, SAB: number }} situacao
 * @returns {{ defesa: {valor, origem}[], deslocamento: {valor, origem}[] }}
 */
export function passivosDeClasse(itens, situacao) {
  const defesa = [];
  const deslocamento = [];
  const semArmadura = situacao.tipoArmadura === "nenhuma";
  if (temHabilidadeNosItens(itens, "barbaro", "pele-rija") && ["nenhuma", "leve"].includes(situacao.tipoArmadura) && !situacao.vestindoTunica) {
    defesa.push({ valor: 2, origem: "Pele Rija" });
  }
  if (temHabilidadeNosItens(itens, "monge", "defesa-interior") && semArmadura && !situacao.usandoEscudo && situacao.SAB) {
    defesa.push({ valor: situacao.SAB, origem: "Defesa Interior" });
  }
  if (temHabilidadeNosItens(itens, "monge", "passo-ligeiro") && semArmadura) deslocamento.push({ valor: 3, origem: "Passo Ligeiro" });
  return { defesa, deslocamento };
}

/** Perícia Infalível (Ladino, 11º): d20 menor que 10 conta como 10 nestas perícias. */
export const PERICIAS_INFALIVEIS = ["acrobacia", "furtividade", "investigacao", "prestidigitacao", "audicao", "visao", "reflexos"];

/** Mínimo do d20 de uma perícia vindo de habilidades (ou null). */
export const minimoD20DeHabilidades = (itens, pericia) =>
  (temHabilidadeNosItens(itens, "ladino", "pericia-infalivel") && PERICIAS_INFALIVEIS.includes(pericia) ? 10 : null);

/** Dados de dano que crescem a cada 4 níveis (1º, 5º, 9º, 13º, 17º): 1 a 5. */
export const dadosPorNivel = nivel => Math.min(5, 1 + Math.floor((Math.max(1, nivel) - 1) / 4));

/* ------------------------------ Duas armas por poder ------------------------------ */

/** Poderes/habilidades que tiram a penalidade de duas armas (o segundo ataque fica sem atributo no dano). */
export const DUAS_ARMAS_SEM_PENALIDADE = ["ladino__duas-armas", "patrulheiro__laminas-do-mato", "pistoleiro__duas-pistolas", "guerreiro__par-de-laminas"];
/** Poderes que devolvem o atributo ao dano do segundo ataque. */
export const DUAS_ARMAS_ATRIBUTO_NO_SEGUNDO = ["guerreiro__ambidestria", "ladino__mao-habilidosa", "patrulheiro__mao-firme", "pistoleiro__pulso-firme"];

/** Flags de duas armas do ator somando as que vêm dos poderes de classe. */
export function flagsDeDuasArmas(itens, flags = {}) {
  const ids = new Set((itens ?? []).map(i => i?.flags?.[SISTEMA_ID]?.id).filter(Boolean));
  const r = { ...flags };
  if (DUAS_ARMAS_SEM_PENALIDADE.some(id => ids.has(id))) r.duasArmas = "sem-penalidade";
  if (DUAS_ARMAS_ATRIBUTO_NO_SEGUNDO.some(id => ids.has(id))) r.duasArmasAtributoNoSegundo = true;
  return r;
}

/* ------------------------------ Vínculo Selvagem (Patrulheiro) ------------------------------ */

/**
 * Valores do animal do Vínculo que dependem do patrulheiro (Anexo B, PROVISÓRIO):
 * PV = 10 + metade do nível; Defesa = 10 + metade do nível + defesaBonus; dano dos ataques +
 * metade do nível; CD das habilidades = 10 + metade do nível + DES do patrulheiro. O ataque e os
 * testes usam as perícias da ficha do próprio animal.
 * @param {object} animal  entrada de vinculos.json (vinculos[])
 * @param {{ nivel: number, DES: number }} p  nível e DES (total) do patrulheiro
 */
export function estatisticasDoVinculo(animal, p) {
  const metade = Math.floor(Math.max(1, Number(p.nivel) || 1) / 2);
  return {
    pv: 10 + metade,
    defesa: 10 + metade + (animal.defesaBonus ?? 0),
    // A Defesa da ficha é 10 + DES + Outros: Outros acerta a conta para não somar a DES do animal
    defesaOutros: metade + (animal.defesaBonus ?? 0) - (animal.atributos?.DES ?? 0),
    bonusDano: metade,
    cd: 10 + metade + (Number(p.DES) || 0)
  };
}

/* ------------------------------ Regras numéricas das classes ------------------------------ */

/** Bônus da Fúria pelo nível (conferido no texto da habilidade Fúria do Anexo A). */
export function bonusDaFuria(nivel) {
  if (nivel >= 17) return { dano: 4, ataque: 3 };
  if (nivel >= 9) return { dano: 3, ataque: 2 };
  return { dano: 2, ataque: 1 };
}

/** Máximo de PM no Tiro Carregado pelo nível (+2 com Calibre Pesado usando mosquete). */
export function maximoTiroCarregado(nivel, { calibrePesado = false, mosquete = false } = {}) {
  const base = nivel >= 20 ? 5 : nivel >= 15 ? 4 : nivel >= 10 ? 3 : nivel >= 5 ? 2 : 1;
  return base + (calibrePesado && mosquete ? 2 : 0);
}

/** Dano desarmado do Monge (Punhos Disciplinados): 1d8; 1d10 no 9º; 1d12 no 17º. */
export const danoDesarmadoDoMonge = nivel => (nivel >= 17 ? "1d12" : nivel >= 9 ? "1d10" : "1d8");

/* ------------------------------ Assistente de nível ------------------------------ */

/**
 * Habilidades da linha de progressão de um nível: o rótulo da tabela ("Ataque Furtivo (2d6)") e a
 * habilidade do JSON; nova = recebida neste nível (senão é o aprimoramento de uma que já tem).
 */
export function habilidadesDoNivel(classe, nivel) {
  const linha = (classe?.progressao ?? []).find(p => p.nivel === nivel);
  return (linha?.habilidades ?? []).map(rotulo => {
    const base = normalizarNome(String(rotulo).replace(/\(.*?\)/g, ""));
    const h = (classe.habilidades ?? []).find(x => normalizarNome(x.nome) === base) ?? null;
    return { rotulo, habilidade: h, nova: !!h && nivelDaHabilidade(h) === nivel };
  });
}

/** O nível concede escolha de poder de classe? (nunca no 1º) */
export const nivelTemPoder = (classe, nivel) => nivel >= 2 && !!(classe?.progressao ?? []).find(p => p.nivel === nivel)?.poder;

/**
 * PV e PM ganhos ao chegar a um nível (fórmula da classe; Monge: atributo de PM só no 1º).
 * @param {object} cc  classeConfig
 * @param {{ FOR,DES,CON,INT,SAB,CAR }} atributos  totais
 */
export function ganhoDoNivel(cc, atributos, nivel) {
  const at = k => (k ? Number(atributos?.[k]) || 0 : 0);
  if (nivel <= 1) {
    return { pv: (cc.pvInicial ?? 0) + at(cc.pvAtributo), pm: (cc.pmInicial ?? 0) + at(cc.pmAtributo) };
  }
  return {
    pv: (cc.pvPorNivel ?? 0) + at(cc.pvAtributo),
    pm: (cc.pmPorNivel ?? 0) + (cc.pmAtributoSoNoPrimeiroNivel ? 0 : at(cc.pmAtributo))
  };
}
