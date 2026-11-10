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
  // Árvore: Divinas / Arcanas / Sangue → 1º a 5º Nível. Magia de mais de uma tradição aparece em cada uma.
  const pastas = [];
  TRADICOES_COMPENDIO.forEach((t, i) => {
    const mae = idEstavel(`pasta:magias:${t.id}`);
    pastas.push({ _id: mae, name: t.nome, type: "Item", folder: null, sorting: "m", sort: (i + 1) * 100000, color: t.cor, flags: { [SISTEMA_ID]: { id: `magias-${t.id}` } } });
    for (const n of NIVEIS_MAGIA) pastas.push({
      _id: idEstavel(`pasta:magias:${t.id}:${n}`), name: `${n}º Nível`, type: "Item", folder: mae,
      sorting: "a", sort: n * 1000, color: null, flags: { [SISTEMA_ID]: { id: `magias-${t.id}-${n}` } }
    });
  });
  const itens = [];
  for (const m of dados.magias) {
    (m.tradicoes ?? []).filter(t => TRADICOES_COMPENDIO.some(x => x.id === t)).forEach((t, i) => itens.push({
      // A primeira cópia mantém o id da versão 0.16.0
      _id: idEstavel(i === 0 ? `magia:${m.id}` : `magia:${t}:${m.id}`),
      name: m.nome,
      type: "magia",
      img: iconeDaMagia(m.id, manifesto),
      folder: idEstavel(`pasta:magias:${t}:${m.nivel}`),
      sort: 0,
      system: systemDaMagia(m),
      effects: [],
      flags: { [SISTEMA_ID]: { id: m.id, tradicao: t } }
    }));
  }
  return { pastas, itens };
}

/** Pastas de tradição do compêndio (ordem da árvore). */
export const TRADICOES_COMPENDIO = [
  { id: "divina", nome: "Divinas", cor: "#5a4a22" },
  { id: "arcana", nome: "Arcanas", cor: "#2a1640" },
  { id: "sangue", nome: "Sangue", cor: "#4a0e14" }
];

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

/* ------------------------------ Automação (Fase 3/4) ------------------------------ */

/**
 * O que um lançamento faz, a partir do bloco de automação (tools/dados/magias_automacao.json) e dos
 * aprimoramentos escolhidos: dano (partes por tipo, com o dano extra dos aprimoramentos somado à
 * parte do mesmo tipo), cura, efeitos (bônus/penalidade/condição) e se cria arma.
 * @returns {{ dano: {partes:{formula,tipo}[], resistencia, area}|null, cura: {formula}|null, efeitos: object[], arma: boolean, vfx: object|null }}
 */
export function planoDoLancamento(automacao, indices = []) {
  const plano = { dano: null, cura: null, efeitos: [], arma: false, vfx: automacao?.vfx ?? null };
  if (!automacao) return plano;
  const escolhidos = new Set(indices);
  const extrasDe = acao => (acao.aprimoramentos ?? []).filter(a => escolhidos.has(a.indice)).flatMap(a => a.extras ?? []);
  for (const acao of automacao.acoes ?? []) {
    if (acao.tipo === "dano") {
      const partes = acao.componentes.map(c => ({ formula: c.formula, tipo: c.tipoDano || "dano" }));
      for (const e of extrasDe(acao).filter(x => x.tipo === "dano")) {
        const parte = partes.find(p => p.tipo === (e.tipoDano || "dano"));
        if (parte) parte.formula = `${parte.formula}+${e.formulaExtra}`;
        else partes.push({ formula: e.formulaExtra, tipo: e.tipoDano || "dano" });
      }
      plano.dano = { partes, resistencia: acao.resistencia ?? null, area: acao.area ?? null };
    } else if (acao.tipo === "cura") {
      const extras = extrasDe(acao).filter(x => x.tipo === "cura").map(x => x.formulaExtra);
      plano.cura = { formula: [acao.formula, ...extras].join("+") };
    } else if (acao.tipo === "efeito") {
      plano.efeitos.push(acao);
    } else if (acao.tipo === "arma") {
      plano.arma = true;
    }
  }
  return plano;
}

/** Perícias de teste de resistência (bônus "em testes de resistência"). */
const PERICIAS_RESISTENCIA = ["fortitude", "reflexos", "vontade"];
const MODO_SOMAR = 2; // CONST.ACTIVE_EFFECT_MODES.ADD

/**
 * Mudanças do bloco → changes do Efeito Ativo, só em campos que o sistema já tem.
 * O que não tem campo (bônus de ataque, de dano, "todos os testes") volta em semCampo (fica no texto).
 * @returns {{ changes:{key,mode,value}[], semCampo:object[], defesaMagia:number }}
 */
export function mudancasParaEfeito(mudancas = []) {
  const changes = [];
  const semCampo = [];
  let defesaMagia = 0;
  const somar = (key, value) => changes.push({ key, mode: MODO_SOMAR, value: String(value) });
  for (const m of mudancas) {
    const [chave, sub] = String(m.chave).split(":");
    if (chave === "defesa") {
      // Bônus de Defesa de magias: não acumulam (vale o maior); fica marcado no efeito
      if (m.grupoAcumulo === "defesa-magia") defesaMagia = Math.max(defesaMagia, m.valor);
      somar("system.defesa.outros", m.valor);
    } else if (chave === "pericia" && sub) somar(`system.pericias.${sub}.outros`, m.valor);
    else if (chave === "resistencia") for (const p of PERICIAS_RESISTENCIA) somar(`system.pericias.${p}.outros`, m.valor);
    else if (chave === "rd") somar("system.resistencias.rdGeral", m.valor);
    else if (chave === "reducao" && sub) somar(`system.resistencias.reducao.${sub}`, m.valor);
    else semCampo.push(m);
  }
  return { changes, semCampo, defesaMagia };
}

/** Duração do Efeito Ativo a partir da duração do bloco (rodadas com combate; cena/sustentada pelo "fim da cena"). */
export function duracaoDoEfeito(duracao = {}, combate = null) {
  if (duracao.tipo === "rodadas") {
    return { duration: { rounds: Math.max(1, Number(duracao.rodadas) || 1), ...(combate ? { combat: combate.id, startRound: combate.round, startTurn: combate.turn } : {}) }, flag: "rodadas" };
  }
  if (duracao.tipo === "instantanea") return { duration: { rounds: 1, ...(combate ? { combat: combate.id, startRound: combate.round, startTurn: combate.turn } : {}) }, flag: "rodadas" };
  return { duration: {}, flag: ["cena", "sustentada", "concentracao"].includes(duracao.tipo) ? "cena" : "remover" };
}

/**
 * Não acumular bônus de Defesa de magias: dado o novo bônus e os efeitos ativos de magia do ator
 * (com o valor de cada um), diz quais ficam ligados. Vale o maior; os outros ficam desligados.
 * @param {{id:string, valor:number, ligado:boolean}[]} atuais
 * @returns {{ ligar: string[], desligar: string[], novoLigado: boolean }}
 */
export function acumuloDeDefesa(atuais, novoValor) {
  const maior = Math.max(0, ...atuais.map(a => a.valor));
  if (novoValor > maior) return { ligar: [], desligar: atuais.filter(a => a.ligado).map(a => a.id), novoLigado: true };
  return { ligar: [], desligar: [], novoLigado: false };
}

/* ------------------------------ Arcanista: magias conhecidas e escolas ------------------------------ */

/**
 * Magias conhecidas do Arcanista: Mago e Mago de Sangue 3 no 1º e +1 por nível; Feiticeiro 3 no 1º e
 * +1 a cada nível ímpar a partir do 3º. extras: magias adicionais (Escola Predileta, Segunda Escola).
 */
export function limiteDeMagiasConhecidas(linhagem, nivel, extras = 0) {
  const n = Math.max(1, Math.trunc(Number(nivel) || 1));
  const base = linhagem === "feiticeiro" ? 3 + Math.floor((n - 1) / 2) : 3 + (n - 1);
  return base + Math.max(0, Math.trunc(Number(extras) || 0));
}

/**
 * Pode aprender a magia? Confere a tradição (Arcana ou Sangue), o nível de magia que já lança e o
 * limite de conhecidas. Devolve o primeiro motivo (chave de tradução + dados) ou null.
 * @param {{ nivel:number, tradicoes:string[] }} magia  system da magia
 * @param {{ nivel:number, tradicao:string|null, conhecidas:number, limite:number }} p
 */
export function motivoParaNaoAprender(magia, p) {
  if (p.tradicao && (magia.tradicoes ?? []).length && !magia.tradicoes.includes(p.tradicao)) return { chave: "ICARUS.Magias.Conhecidas.Tradicao", dados: { tradicao: p.tradicao } };
  const max = nivelMaximoDeMagia(p.nivel);
  if (Number(magia.nivel) > max) return { chave: "ICARUS.Magias.Conhecidas.Nivel", dados: { nivel: magia.nivel, max } };
  if (p.conhecidas >= p.limite) return { chave: "ICARUS.Magias.Conhecidas.Limite", dados: { limite: p.limite } };
  return null;
}

/**
 * Ajustes do Arcanista no lançamento, pelas escolas escolhidas e habilidades:
 * Escola Predileta/Segunda Escola +1 na CD das magias da escola; Maestria de Escola −1 PM nelas
 * (mínimo 1); Mana Transbordante +2 na CD de todas.
 * @param {{ escola:string }} magia
 * @param {{ escolas:string[], maestria:boolean, manaTransbordante:boolean }} a
 */
export function ajustesDoArcanista(magia, a = {}) {
  const daEscola = (a.escolas ?? []).includes(magia.escola);
  return { cd: (daEscola ? 1 : 0) + (a.manaTransbordante ? 2 : 0), desconto: daEscola && a.maestria ? 1 : 0 };
}

/** Pacto de Sangue: até metade do custo (arredondado para cima) em PM pago com 2 PV cada, sem chegar a 0 PV. */
export function maximoDoPacto(custoTotal, pvAtual) {
  const metade = Math.ceil(Math.max(0, custoTotal) / 2);
  const peloPv = Math.max(0, Math.floor((Math.max(0, pvAtual) - 1) / 2));
  return Math.min(metade, peloPv);
}
