/**
 * Magias: regras puras e documentos do compêndio (sem Foundry; usado pelo build, pelo sistema e
 * pelos testes em tests/magias.test.mjs). Fonte: tools/dados/magias.json (texto sem alteração).
 *
 * Regras (núcleo):
 * - Custo por nível de magia: 1 / 3 / 6 / 10 / 15 PM. Acesso pelo nível do personagem: 1º, 5º, 9º, 13º, 17º.
 * - CD da magia = 10 + metade do nível do personagem + atributo-chave do conjurador.
 * - Aprimoramento: custo extra em PM; cada um no máximo uma vez por lançamento; podem ser combinados.
 * Acesso por classe e número de magias conhecidas: pendência do projeto (nada é bloqueado).
 */
import { SISTEMA_ID, ICONE_PADRAO } from "./config.mjs";

export const CUSTO_POR_NIVEL = { 1: 1, 2: 3, 3: 6, 4: 10, 5: 15 };
export const NIVEL_PERSONAGEM_POR_NIVEL_MAGIA = { 1: 1, 2: 5, 3: 9, 4: 13, 5: 17 };
export const NIVEIS_MAGIA = [1, 2, 3, 4, 5];
export const ATRIBUTOS_MAGIA = ["INT", "SAB", "CAR"];
export const PASTA_ICONES_MAGIAS = `systems/${SISTEMA_ID}/img/magias`;

/** Atributo-chave da magia: o escolhido na ficha; senão o de PM da classe; senão Inteligência. */
export function atributoDeMagia(system) {
  const escolhido = system?.magia?.atributo;
  if (ATRIBUTOS_MAGIA.includes(escolhido)) return escolhido;
  const daClasse = system?.classeConfig?.pmAtributo;
  return ATRIBUTOS_MAGIA.includes(daClasse) ? daClasse : "INT";
}

/** CD = 10 + metade do nível + atributo-chave. */
export function cdDaMagia(system) {
  const nivel = Math.max(1, Math.trunc(Number(system?.nivel) || 1));
  const atributo = atributoDeMagia(system);
  const valor = Math.trunc(Number(system?.atributos?.[atributo]?.total) || 0);
  return 10 + Math.floor(nivel / 2) + valor;
}

/** Maior nível de magia que o nível do personagem alcança (1 a 5). Só informativo: nada é bloqueado. */
export function nivelMaximoDeMagia(nivelPersonagem) {
  const n = Math.trunc(Number(nivelPersonagem) || 1);
  return NIVEIS_MAGIA.filter(m => n >= NIVEL_PERSONAGEM_POR_NIVEL_MAGIA[m]).at(-1) ?? 1;
}

/**
 * Custo total de um lançamento: custo base + aprimoramentos escolhidos (índices; cada um uma vez).
 * @returns {{ base:number, extra:number, total:number, indices:number[] }}
 */
export function custoDoLancamento(magia, indices = []) {
  const lista = magia?.aprimoramentos ?? [];
  const validos = [...new Set(indices.map(Number))].filter(i => Number.isInteger(i) && i >= 0 && i < lista.length).sort((a, b) => a - b);
  const base = Math.max(0, Math.trunc(Number(magia?.custoPM) || 0));
  const extra = validos.reduce((s, i) => s + Math.max(0, Math.trunc(Number(lista[i].custo) || 0)), 0);
  return { base, extra, total: base + extra, indices: validos };
}

/** Pode lançar? (PM suficiente) Devolve o motivo quando não pode. */
export function podeLancar(pmAtual, custoTotal) {
  const pm = Math.trunc(Number(pmAtual) || 0);
  if (custoTotal > pm) return { pode: false, motivo: "semPM", falta: custoTotal - pm };
  return { pode: true };
}

/** "Sustentada", "(concentração)" e afins, a partir do texto da duração. */
export function tipoDeDuracao(duracao = "") {
  const d = String(duracao).toLowerCase();
  if (d.includes("concentra")) return "concentracao";
  if (d.includes("sustentada")) return "sustentada";
  if (d.includes("instant")) return "instantanea";
  if (d.includes("cena")) return "cena";
  if (d.includes("rodada")) return "rodadas";
  return "outra";
}

/** Linha de metadados: "Evocação · padrão · médio · até 3 criaturas · instantânea". */
export function metaDaMagia(m) {
  return [m.escola, m.execucao, m.alcance, m.alvo, m.duracao].filter(Boolean).join(" · ");
}

/** Ícone do item: img/magias/<arquivo> do manifesto, ou o padrão até a imagem chegar. */
export function iconeDaMagia(id, manifesto = []) {
  const achado = manifesto.find(x => x.id === id);
  return achado ? `${PASTA_ICONES_MAGIAS}/${achado.arquivo}` : ICONE_PADRAO;
}

const escapar = t => String(t ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/** Descrição em HTML (parágrafos do texto original). */
export const htmlDaDescricao = texto => String(texto ?? "").split(/\n+/).filter(Boolean).map(p => `<p>${escapar(p)}</p>`).join("");

/** Dados do item "magia" a partir de uma entrada do magias.json. */
export function systemDaMagia(m) {
  return {
    nivel: m.nivel, custoPM: m.custoPM, escola: m.escola ?? "", execucao: m.execucao ?? "", alcance: m.alcance ?? "",
    alvo: m.alvo ?? "", duracao: m.duracao ?? "", resistencia: m.resistencia ?? "",
    descricao: htmlDaDescricao(m.descricao),
    aprimoramentos: (m.aprimoramentos ?? []).map(a => ({ custo: a.custo, texto: a.texto })),
    tradicoes: [...(m.tradicoes ?? [])], afinidade: m.afinidade ?? "", original: !!m.original, concentracao: !!m.concentracao
  };
}

/**
 * Documentos do compêndio "Magias": uma pasta por nível e os 200 itens (ids estáveis).
 * @param {{ magias: object[] }} dados   tools/dados/magias.json
 * @param {{id:string, arquivo:string}[]} manifesto  tools/dados/magias_icones.json
 * @param {(texto:string)=>string} idEstavel
 */
export function documentosDeMagias(dados, manifesto, idEstavel) {
  const pastas = NIVEIS_MAGIA.map(n => ({
    _id: idEstavel(`pasta:magias:${n}`), name: `${n}º nível (${CUSTO_POR_NIVEL[n]} PM)`, type: "Item", folder: null,
    sorting: "a", sort: n * 1000, color: null, flags: { [SISTEMA_ID]: { id: `magias-${n}` } }
  }));
  const itens = dados.magias.map(m => ({
    _id: idEstavel(`magia:${m.id}`),
    name: m.nome,
    type: "magia",
    img: iconeDaMagia(m.id, manifesto),
    folder: idEstavel(`pasta:magias:${m.nivel}`),
    sort: 0,
    system: systemDaMagia(m),
    effects: [],
    flags: { [SISTEMA_ID]: { id: m.id } }
  }));
  return { pastas, itens };
}

/**
 * Lista da aba Magias: agrupa por nível, com filtro de texto, nível e escola.
 * @param {{id,name,img,system}[]} itens
 */
export function gruposDeMagias(itens, { busca = "", nivel = "", escola = "" } = {}) {
  const termo = String(busca).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const passa = i => (!nivel || String(i.system.nivel) === String(nivel)) && (!escola || i.system.escola === escola)
    && (!termo || i.name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().includes(termo));
  return NIVEIS_MAGIA.map(n => ({
    nivel: n, custo: CUSTO_POR_NIVEL[n],
    magias: itens.filter(i => Number(i.system.nivel) === n && passa(i)).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
  })).filter(g => g.magias.length);
}
