/**
 * Ameaças (ator "ameaca"): regras puras, sem Foundry. Usadas pelo modelo de dados, pela ficha,
 * pelo gerador do compêndio (tools/build-packs.mjs) e pelos testes.
 * - ND: ordem (1/4, 1/2, 1 … 20, S, S+), patamar e pasta do compêndio;
 * - tamanho → casas do token (Pequeno e Médio 1×1, Grande 2×2, Enorme 3×3, Colossal 4×4);
 * - ataques naturais: "perfuração, mais 1d6 de veneno" → partes de dano; crítico dobra só os dados
 *   da arma natural (os dados extras, como o veneno, não se multiplicam);
 * - leitura dos textos do bestiário: RD e imunidades a tipos de dano nas habilidades, Visão/Audição
 *   nos sentidos, iniciativa "+2";
 * - casamento tolerante das imagens (sem acento, minúsculas, sem prefixo ameaca-/lacaio-/especial-).
 */
import { TIPOS_DANO_COM_RESISTENCIA } from "./config.mjs";

export const PAPEIS = ["solo", "lacaio", "especial", "outro"];

/** Tamanho → casas do token (largura = altura). */
export const TAMANHOS_AMEACA = { minusculo: 1, pequeno: 1, medio: 1, grande: 2, enorme: 3, colossal: 4 };

/** "Médio" → "medio" (tamanho desconhecido: médio). */
export function chaveDoTamanho(texto) {
  const k = semAcento(texto).toLowerCase().trim();
  return k in TAMANHOS_AMEACA ? k : "medio";
}
export const casasDoTamanho = tamanho => TAMANHOS_AMEACA[chaveDoTamanho(tamanho)] ?? 1;

export const ORDEM_ND = ["1/4", "1/2", ...Array.from({ length: 20 }, (_, i) => String(i + 1)), "S", "S+"];

/** Posição do ND na ordem (desconhecido vai para o fim). */
export function ordemDoNd(nd) {
  const i = ORDEM_ND.indexOf(String(nd ?? "").trim().toUpperCase());
  return i < 0 ? ORDEM_ND.length : i;
}

/** Valor numérico do ND (1/4 = 0,25; S e S+ contam como 20, ou o ndContaComo). */
export function valorDoNd(nd, ndContaComo = null) {
  const t = String(nd ?? "").trim();
  if (t === "1/4") return 0.25;
  if (t === "1/2") return 0.5;
  if (/^S\+?$/i.test(t)) return Number(ndContaComo) || 20;
  return Number(t) || 0;
}

export const PATAMARES = [
  { id: "iniciante", nome: "Iniciante", faixa: "ND 1/4 a 4" },
  { id: "veterano", nome: "Veterano", faixa: "ND 5 a 10" },
  { id: "campeao", nome: "Campeão", faixa: "ND 11 a 16" },
  { id: "lenda", nome: "Lenda", faixa: "ND 17 a 20" },
  { id: "lenda-mais", nome: "Lenda+", faixa: "ND S e S+" }
];

/** Patamar do ND (S e S+ são Lenda+). */
export function patamarDoNd(nd) {
  const t = String(nd ?? "").trim();
  if (/^S\+?$/i.test(t)) return PATAMARES[4];
  const v = valorDoNd(t);
  if (v <= 4) return PATAMARES[0];
  if (v <= 10) return PATAMARES[1];
  if (v <= 16) return PATAMARES[2];
  return PATAMARES[3];
}

/**
 * Temas do compêndio "Icarus: Ameaças" (pastas de 1º nível, nesta ordem). dados = arquivo em
 * tools/dados/<dados>.json (tema sem arquivo é ignorado no build); imagens = subpasta de img/Ameacas/.
 */
export const TEMAS = [
  { id: "fauna", nome: "Fauna", dados: "ameacas-fauna", imagens: "Fauna" },
  { id: "espectros", nome: "Espectros", dados: "ameacas-espectros", imagens: "Espectros" }
];

/** Ordem dos papéis nas pastas do compêndio (alfabética). */
export const ORDEM_PAPEIS_COMPENDIO = ["especial", "lacaio", "solo", "outro"];
/** Nome da pasta de ND: "ND 1/4", "ND 10", "ND S+". */
export const pastaDoNd = nd => `ND ${String(nd ?? "").trim()}`;

/** Ordena por ND e depois por nome. */
export const compararAmeacas = (a, b) => ordemDoNd(a.nd) - ordemDoNd(b.nd) || String(a.nome ?? a.name).localeCompare(String(b.nome ?? b.name), "pt-BR");

/* ------------------------------ Textos ------------------------------ */

const semAcento = t => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");
/** "Elétrico" → "eletrico"; só vale se for um tipo de dano do sistema. */
export function tipoDeDano(texto) {
  const k = semAcento(texto).toLowerCase().trim();
  return TIPOS_DANO_COM_RESISTENCIA.includes(k) ? k : null;
}

/** "+2" / "–1" (travessão) / 3 → número. */
export function inteiroDoTexto(texto) {
  const m = String(texto ?? "").replace(/[–—−]/g, "-").match(/[+-]?\s*\d+/);
  return m ? Number(m[0].replace(/\s+/g, "")) : 0;
}

/**
 * Tipo do ataque em partes: "perfuração, mais 1d6 de veneno" → { tipo: "perfuracao", tipos: [...],
 * extras: [{ formula: "1d6", tipo: "veneno" }], nota: "" }; "impacto, só contra alvo Caído" → nota.
 * "fogo e perfuração": os dois tipos no texto; o cálculo de resistência usa o primeiro (como a Alabarda).
 */
export function lerTipoDoAtaque(texto) {
  const [principal, ...resto] = String(texto ?? "").split(",").map(s => s.trim()).filter(Boolean);
  const tipos = String(principal ?? "").split(/\s+e\s+/).map(tipoDeDano).filter(Boolean);
  const extras = [];
  const notas = [];
  for (const parte of resto) {
    const m = parte.match(/^mais\s+(\d+d\d+(?:\s*[+-]\s*\d+)?)\s+de\s+(.+)$/i);
    const tipo = m ? tipoDeDano(m[2]) : null;
    if (m && tipo) extras.push({ formula: m[1].replace(/\s+/g, ""), tipo });
    else notas.push(parte);
  }
  return { tipo: tipos[0] ?? "dano", tipos: tipos.length ? tipos : ["dano"], extras, nota: notas.join(", ") };
}

/** "2d8" com crítico ×2 → "4d8" (sem dados reconhecíveis, devolve como está). */
export function multiplicarDados(dados, mult = 2) {
  const m = String(dados ?? "").trim().match(/^(\d+)d(\d+)$/i);
  return m ? `${Number(m[1]) * mult}d${m[2]}` : String(dados ?? "").trim();
}

/**
 * Partes de dano de um ataque natural: [{ formula, tipo }] (a primeira é a arma natural, dados + fixo;
 * as seguintes, os dados extras do tipo). Crítico multiplica só os dados da arma natural.
 */
export function partesDoAtaque(ataque, { critico = false, mult = 2 } = {}) {
  const lido = lerTipoDoAtaque(ataque?.tipo);
  const dados = critico ? multiplicarDados(ataque?.dados, mult) : String(ataque?.dados ?? "").trim();
  const fixo = Math.trunc(Number(ataque?.fixo) || 0);
  const formula = [dados, fixo ? `${fixo < 0 ? "-" : "+"} ${Math.abs(fixo)}` : ""].filter(Boolean).join(" ") || "0";
  return [{ formula, tipo: lido.tipo }, ...lido.extras.map(e => ({ formula: e.formula, tipo: e.tipo }))];
}

/** Texto curto do dano para a ficha: "2d8+26 perfuração, mais 6d6 de veneno". */
export function textoDoDano(ataque) {
  const fixo = Math.trunc(Number(ataque?.fixo) || 0);
  const base = `${ataque?.dados ?? ""}${fixo ? (fixo > 0 ? `+${fixo}` : fixo) : ""}`;
  return [base, ataque?.tipo].filter(Boolean).join(" ");
}

/**
 * Redução de Dano das habilidades ("Redução de Dano 6"; "imune a fogo e Redução de Dano 5").
 * Frases condicionais ("enquanto houver…") ficam só no texto. @returns {number}
 */
export function rdDasHabilidades(habilidades = []) {
  let rd = 0;
  for (const h of habilidades) {
    const texto = String(h?.texto ?? "");
    if (/\b(enquanto|quando|se)\b/i.test(texto.split(/Redução de Dano/i)[0] ?? "")) continue;
    const m = texto.match(/Redução de Dano\s+(\d+)/i);
    if (m) rd = Math.max(rd, Number(m[1]));
  }
  return rd;
}

/**
 * Imunidades a tipos de dano ("imune a veneno, frio e Derrubar" → veneno, frio). Imunidade com
 * condição ("frio natural", "frio de origem natural") e a condições (Derrubar, Abalado) ficam no texto.
 */
export function imunidadesDasHabilidades(habilidades = []) {
  const tipos = new Set();
  for (const h of habilidades) {
    for (const m of String(h?.texto ?? "").matchAll(/imune a ([^.;:]+)/gi)) {
      for (const parte of m[1].split(/,|\s+e\s+/)) {
        const tipo = tipoDeDano(parte);
        if (tipo) tipos.add(tipo);
      }
    }
  }
  return [...tipos];
}

/** Perícias citadas nos sentidos ("Visão +6", "Audição +3", "visão fraca (Visão –4)") → totais. */
export function periciasDosSentidos(sentidos) {
  const totais = {};
  for (const [chave, nome] of [["visao", "Visão"], ["audicao", "Audição"]]) {
    const m = String(sentidos ?? "").replace(/[–—−]/g, "-").match(new RegExp(`${nome}\\s*([+-]\\s*\\d+)`));
    if (m) totais[chave] = Number(m[1].replace(/\s+/g, ""));
  }
  return totais;
}

/** Deslocamento em metros (o primeiro número do texto "9 m, natação 6 m"). */
export function metrosDoDeslocamento(texto) {
  const m = String(texto ?? "").replace(",", ".").match(/(\d+(?:\.\d+)?)\s*m/);
  return m ? Number(m[1]) : 9;
}

/** Markdown leve do bestiário (**negrito**) → HTML, com o resto escapado. */
export function htmlDoTexto(texto) {
  const esc = String(texto ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  return esc.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

/** Descrição do poder: gatilho no início, quando houver. */
export function descricaoDaHabilidade(h) {
  const gatilho = h?.gatilho ? `<em>(${htmlDoTexto(h.gatilho)})</em> ` : "";
  return `<p>${gatilho}${htmlDoTexto(h?.texto)}</p>`;
}

/* ------------------------------ Imagens ------------------------------ */

/** Slug da imagem: sem acento, minúsculas, sem extensão e sem o prefixo ameaca-/lacaio-/especial-. */
export function slugDaImagem(nome) {
  return semAcento(nome).toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    .replace(/^(ameaca|lacaio|especial)-/, "");
}

/**
 * Casa as criaturas com os arquivos de imagem (tolerante: slug da imagem, do id ou do nome).
 * @returns {{ porId: Record<string,string>, semImagem: string[], orfas: string[] }}
 */
export function casarImagens(ameacas = [], arquivos = []) {
  const porSlug = new Map();
  for (const f of arquivos) if (/\.(png|jpe?g|webp)$/i.test(f) && !porSlug.has(slugDaImagem(f))) porSlug.set(slugDaImagem(f), f);
  const usados = new Set();
  const porId = {};
  const semImagem = [];
  const pendentes = [];
  for (const a of ameacas) {
    const achado = [a.imagem, a.id, a.nome].map(slugDaImagem).map(s => porSlug.get(s)).find(Boolean);
    if (achado) { porId[a.id] = achado; usados.add(achado); }
    else pendentes.push(a);
  }
  // Nome cortado ("Coruja-Matriarc.png"): um arquivo livre cujo slug é o começo do slug da criatura
  for (const a of pendentes) {
    const alvo = slugDaImagem(a.imagem ?? a.id);
    const candidatos = [...porSlug].filter(([s, f]) => !usados.has(f) && s.length >= 6 && (alvo.startsWith(s) || s.startsWith(alvo)));
    if (candidatos.length === 1) { porId[a.id] = candidatos[0][1]; usados.add(candidatos[0][1]); }
    else semImagem.push(a.id);
  }
  return { porId, semImagem, orfas: arquivos.filter(f => /\.(png|jpe?g|webp)$/i.test(f) && !usados.has(f)) };
}

/* ------------------------------ Dados do ator ------------------------------ */

const ATRIBUTO_DO_JSON = { For: "FOR", Des: "DES", Con: "CON", Int: "INT", Sab: "SAB", Car: "CAR" };

/**
 * system do ator "ameaca" a partir de uma criatura do JSON (tools/dados/ameacas-fauna.json).
 * @param {object} a  criatura
 * @param {{chave:string, atributo:string}[]} pericias  PERICIAS do config
 */
export function sistemaDaAmeaca(a, pericias = []) {
  const atributos = Object.fromEntries(Object.entries(ATRIBUTO_DO_JSON).map(([de, para]) => [para, { base: Math.trunc(Number(a.atributos?.[de]) || 0), racial: 0, temp: 0 }]));
  // Visão/Audição dos sentidos: o total do bestiário (atributo + outros)
  const doSentido = periciasDosSentidos(a.sentidos);
  const periciasDoAtor = {};
  for (const [chave, total] of Object.entries(doSentido)) {
    const attr = pericias.find(p => p.chave === chave)?.atributo ?? "SAB";
    periciasDoAtor[chave] = { treino: 0, outros: total - atributos[attr].base };
  }
  const imunes = imunidadesDasHabilidades(a.habilidades);
  const pv = Math.max(0, Math.trunc(Number(a.pv) || 0));
  return {
    nivel: 1, classeConfig: { manual: true },
    nd: String(a.nd ?? ""), ndContaComo: a.ndContaComo ?? null, papel: PAPEIS.includes(a.papel) ? a.papel : "outro",
    tipo: a.tipo ?? "", subtitulo: a.subtitulo ?? "", tamanho: chaveDoTamanho(a.tamanho),
    defesa: { valor: Math.trunc(Number(a.defesa) || 10), outros: 0 },
    pv: { value: pv, max: pv, temp: 0 }, pm: { value: 0, max: 0, temp: 0 },
    iniciativa: inteiroDoTexto(a.iniciativa),
    deslocamento: metrosDoDeslocamento(a.deslocamento), deslocamentoTexto: a.deslocamento ?? "",
    sentidos: a.sentidos ?? "", cd: a.cd ?? null,
    salvaguardas: { fort: Math.trunc(Number(a.salvaguardas?.fort) || 0), ref: Math.trunc(Number(a.salvaguardas?.ref) || 0), von: Math.trunc(Number(a.salvaguardas?.von) || 0) },
    atributos, pericias: periciasDoAtor,
    ataques: (a.ataques ?? []).map(x => ({ nome: x.nome ?? "", bonus: Math.trunc(Number(x.bonus) || 0), dados: x.dados ?? "", fixo: Math.trunc(Number(x.fixo) || 0), tipo: x.tipo ?? "", alcance: x.alcance ?? "corpo-a-corpo" })),
    ataquesTexto: a.ataquesTexto ?? "",
    resistencias: { rdGeral: rdDasHabilidades(a.habilidades), imunidade: Object.fromEntries(imunes.map(t => [t, true])) },
    tesouro: a.tesouro ?? "", acompanha: a.acompanha ?? "", nota: a.nota ?? "",
    descricao: "", notas: a.nota ? `<p>${htmlDoTexto(a.nota)}</p>` : ""
  };
}

/**
 * Ajustes da derivação: as salvaguardas, a iniciativa e a Defesa do bestiário são valores prontos.
 * Devolve quanto somar em "outros" para o total derivado (atributo + treino + outros) bater com eles,
 * sem perder bônus de Efeitos e condições (que entram por cima). Usa os valores salvos (source).
 * @returns {{ defesa:number, pericias: Record<string,number> }}
 */
export function ajustesDaAmeaca(src, bonusTreino) {
  const attr = k => { const a = src.atributos?.[k] ?? {}; return (Number(a.base) || 0) + (Number(a.racial) || 0) + (Number(a.temp) || 0); };
  const base = (chave, padrao) => attr(src.pericias?.[chave]?.atributo ?? padrao) + bonusTreino(src.pericias?.[chave]?.treino ?? 0);
  const sv = src.salvaguardas ?? {};
  return {
    defesa: (Number(src.defesa?.valor) || 10) - 10 - attr("DES"),
    pericias: {
      fortitude: (Number(sv.fort) || 0) - base("fortitude", "CON"),
      reflexos: (Number(sv.ref) || 0) - base("reflexos", "DES"),
      vontade: (Number(sv.von) || 0) - base("vontade", "SAB"),
      iniciativa: (Number(src.iniciativa) || 0) - base("iniciativa", "DES")
    }
  };
}
