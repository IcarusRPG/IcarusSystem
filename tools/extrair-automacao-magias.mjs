/**
 * Proposta de automação das magias (Fase 3): lê tools/dados/magias.json e escreve
 *   tools/dados/magias_automacao.json  (um bloco por magia; o sistema usa só os validados)
 *   tools/relatorio_automacao.md       (o que foi automatizado e o que ficou só em texto, por lote)
 *   npm run magias:automacao
 * Repetível: blocos com "validada": true (ou revisao "manual") são mantidos como estão; os demais
 * são refeitos a partir do texto. Para validar um lote, marque "validada": true no JSON (ou peça
 * ao Claude Code), corrigindo o que for preciso.
 *
 * Confiança:
 *   auto           o texto tem padrão claro (dano/cura/condição/bônus e resistência reconhecidos)
 *   manual         achou algo, mas há condição, exceção ou valor por dardo/alvo: revisar à mão
 *   somente-texto  nenhum padrão: gasta PM e mostra o cartão
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DADOS = path.join(RAIZ, "tools", "dados");

const semAcento = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Tipo de dano a partir do texto ("de fogo", "elétrico", "psíquico"...). */
const TIPOS = {
  fogo: "fogo", frio: "frio", eletrico: "eletrico", acido: "acido", luz: "luz", trevas: "trevas", essencia: "essencia",
  corte: "corte", perfuracao: "perfuracao", impacto: "impacto", psiquico: "psiquico", veneno: "veneno"
};
const tipoDe = palavra => TIPOS[semAcento(palavra ?? "")] ?? "dano";

/** Condições do sistema por radical (Fascinadas → fascinado, Lentas → lento, Em Chamas → em-chamas). */
const CONDICOES = JSON.parse(fs.readFileSync(path.join(DADOS, "condicoes.json"), "utf8"));
const LISTA_CONDICOES = (CONDICOES.condicoes ?? CONDICOES).map(c => ({ id: c.id, radical: semAcento(c.nome).replace(/[oa]s?$/, "").replace(/\s+/g, " ") }));
function condicaoDe(palavra) {
  const p = semAcento(palavra).replace(/s$/, "").replace(/[oa]$/, "");
  return LISTA_CONDICOES.find(c => c.radical === p || c.radical.replace(/[oa]$/, "") === p)?.id ?? null;
}

/** Elemento e cor do efeito visual por tipo de dano. */
const ELEMENTO = { fogo: ["fogo", "#ff7a1a"], frio: ["frio", "#7fd4ff"], eletrico: ["eletrico", "#b9e4ff"], acido: ["acido", "#7ee04a"],
  luz: ["luz", "#ffd76a"], trevas: ["trevas", "#6b3fa0"], essencia: ["essencia", "#b06cff"], psiquico: ["espirito", "#c7b8ff"],
  veneno: ["natureza", "#5fbf4a"], corte: ["arcano", "#d8b45a"], perfuracao: ["arcano", "#d8b45a"], impacto: ["arcano", "#c9a26b"], dano: ["arcano", "#a78bfa"] };

/** Área a partir de alvo/alcance: esfera, cone, linha, quadrado (cubo), cilindro → esfera. */
export function areaDe(m) {
  const t = semAcento(`${m.alvo ?? ""} ${m.alcance ?? ""}`);
  const num = s => Number(String(s).replace(",", "."));
  let r;
  if ((r = t.match(/esfera de (\d+(?:,\d+)?) m/))) return { forma: "esfera", tamanho: num(r[1]) };
  if ((r = t.match(/cilindro de (\d+(?:,\d+)?) m/))) return { forma: "esfera", tamanho: num(r[1]), cilindro: true };
  if ((r = t.match(/cone de (\d+(?:,\d+)?) m/))) return { forma: "cone", tamanho: num(r[1]) };
  if ((r = t.match(/linha de (\d+(?:,\d+)?) m/))) return { forma: "linha", tamanho: num(r[1]) };
  if ((r = t.match(/(?:cubo|quadrado) de (\d+(?:,\d+)?) m/))) return { forma: "quadrado", tamanho: num(r[1]) };
  return null;
}

/** Resistência: atributo e efeito (metade, anula, parcial); o que estiver entre parênteses vira nota. */
export function resistenciaDe(texto) {
  if (!texto || /^—/.test(texto)) return null;
  const t = semAcento(texto);
  const atributo = t.includes("reflexos") ? "reflexos" : t.includes("fortitude") ? "fortitude" : t.includes("vontade") ? "vontade" : null;
  if (!atributo) return null;
  const efeito = t.includes("metade") ? "metade" : t.includes("parcial") ? "parcial" : (t.includes("anula") || t.includes("desacredita")) ? "anula" : null;
  const nota = (texto.match(/\(([^)]+)\)/) ?? [])[1] ?? null;
  return { atributo, efeito, ...(nota ? { nota } : {}) };
}

const FORMULA = "(\\d+d\\d+(?:\\s*\\+\\s*\\d+)?)";
const formula = f => f.replace(/\s+/g, "");

/** Componentes de dano de um texto: "6d6 de dano elétrico e 6d6 de dano de impacto". */
export function danosDe(texto) {
  const lista = [];
  const re = new RegExp(`${FORMULA}\\s+de\\s+dano(?:\\s+(?:de\\s+)?([a-zà-úç]+))?`, "gi");
  for (const x of texto.matchAll(re)) lista.push({ formula: formula(x[1]), tipoDano: tipoDe(x[2]), indice: x.index });
  return lista;
}

/** Frase onde está a posição (para achar "Se...", "quem falhar..."). */
const fraseEm = (texto, i) => {
  const ini = Math.max(texto.lastIndexOf(".", i - 1), texto.lastIndexOf(":", i - 1)) + 1;
  const fim = texto.indexOf(".", i);
  return texto.slice(ini, fim < 0 ? undefined : fim).trim();
};

/** Bônus e penalidades numéricos ("+4 na Defesa", "–2 em testes de ataque"). */
export function mudancasDe(texto) {
  const mudancas = [];
  let condicional = false;
  // Cada trecho vai até a vírgula ou o próximo +/– ("+2 em ataque e dano, +3 m..., mas –2 na Defesa")
  const re = /([+–-])(\d+)\s+(?:na|no|nos|nas|em)\s+([^.;,+–]{0,60})/g;
  for (const x of texto.matchAll(re)) {
    const valor = (x[1] === "+" ? 1 : -1) * Number(x[2]);
    const alvo = semAcento(x[3]);
    if (/\bcontra\b|\bproximo\b|ate o fim|\bse\b/.test(alvo)) condicional = true;
    const chaves = [];
    if (/^defesa/.test(alvo)) chaves.push("defesa");
    if (/testes? de ataque|^ataques?\b|^ataque\b/.test(alvo)) chaves.push("ataque");
    // "+2 em ataque e dano corpo a corpo", "+1 em ataques e dano" (não "RD 2 contra dano de corte")
    if (/^(testes de )?ataques? e dano\b/.test(alvo)) chaves.push("dano");
    if (/testes? de resistencia|testes de ataque e de resistencia/.test(alvo)) chaves.push("resistencia");
    if (/em reflexos|e em reflexos/.test(` ${alvo}`) || /^reflexos/.test(alvo)) chaves.push("pericia:reflexos");
    if (/^todos os testes/.test(alvo)) chaves.push("testes");
    for (const chave of chaves) {
      const m = { chave, valor, modo: "somar" };
      // Bônus de Defesa de magias não acumulam (vale o maior); penalidades somam normalmente
      if (chave === "defesa" && valor > 0) m.grupoAcumulo = "defesa-magia";
      mudancas.push(m);
    }
    if (!chaves.length) condicional = true;
  }
  // "+2 de dano" (Oferenda de Sangue)
  const danoFixo = texto.match(/\+(\d+) de dano\b/);
  if (danoFixo && !mudancas.some(m => m.chave === "dano")) mudancas.push({ chave: "dano", valor: Number(danoFixo[1]), modo: "somar" });
  // RD: geral ("RD 3") ou por tipo ("RD 2 contra dano de corte e perfuração" → Redução de corte e de perfuração)
  const rd = texto.match(/\bRD (\d+)(\s+contra dano (de|não)\s+([^.(]+))?/);
  if (rd) {
    const valor = Number(rd[1]);
    if (/^RD \d+ contra/.test(rd[0] + texto.slice(rd.index + rd[0].length, rd.index + rd[0].length + 7)) && !rd[2]) condicional = true; // "RD 5 contra um tipo..."
    else if (!rd[2]) mudancas.push({ chave: "rd", valor, modo: "somar" });
    else if (rd[3] === "de") {
      const tipos = semAcento(rd[4]).split(/,|\be\b/).map(s => TIPOS[s.trim()]).filter(Boolean);
      if (tipos.length) for (const t of tipos) mudancas.push({ chave: `reducao:${t}`, valor, modo: "somar" });
      else condicional = true;
    } else condicional = true; // "contra dano não mágico"
  }
  if (/RD \d+ contra um tipo/.test(texto)) condicional = true;
  return { mudancas, condicional };
}

/** Condições citadas como resultado ("ficam Enredadas", "fica Inconsciente"). */
export function condicoesDe(texto) {
  const ids = new Set();
  for (const x of texto.matchAll(/fica(?:m|r)?\s+(Em Chamas|[A-ZÁÉÍÓÚ][a-zà-úç]+)/g)) {
    const id = x[1] === "Em Chamas" ? "em-chamas" : condicaoDe(x[1]);
    if (id) ids.add(id);
  }
  return [...ids];
}

/** Duração estruturada a partir do texto da duração. */
export function duracaoDe(texto = "") {
  const t = semAcento(texto);
  if (t.includes("concentra")) return { tipo: "concentracao" };
  if (t.includes("sustentada")) return { tipo: "sustentada" };
  if (t.includes("instant")) return { tipo: "instantanea" };
  if (t.includes("cena")) return { tipo: "cena" };
  const r = t.match(/(\d+)\s+rodada/);
  if (r) return { tipo: "rodadas", rodadas: Number(r[1]) };
  if (t.includes("rodada")) return { tipo: "rodadas", rodadas: 1, nota: texto };
  return { tipo: "outra", texto };
}

/** Aprimoramentos com dano/cura extra ("+1d6 de dano", "+1d6 de dano elétrico e +1d6 de dano de impacto", "+1d8+1 de cura"). */
export function aprimoramentosDe(m, danos) {
  const lista = [];
  (m.aprimoramentos ?? []).forEach((a, indice) => {
    const extras = [];
    for (const x of a.texto.matchAll(new RegExp(`\\+${FORMULA}\\s+de\\s+(dano|cura)(?:\\s+(?:de\\s+)?([a-zà-úç]+))?`, "gi"))) {
      if (x[2].toLowerCase() === "cura") extras.push({ tipo: "cura", formulaExtra: formula(x[1]) });
      else extras.push({ tipo: "dano", formulaExtra: formula(x[1]), tipoDano: x[3] && TIPOS[semAcento(x[3])] ? tipoDe(x[3]) : (danos[0]?.tipoDano ?? "dano") });
    }
    if (extras.length) lista.push({ indice, extras, ...(/um dos tipos/i.test(a.texto) ? { nota: "o jogador escolhe o tipo" } : {}) });
  });
  return lista;
}

/**
 * Proposta de automação de uma magia.
 * @returns {{ id, revisao, validada:false, acoes:object[], vfx:object|null, notas:string[] }}
 */
export function propostaDaMagia(m) {
  const texto = m.descricao ?? "";
  const notas = [];
  const acoes = [];
  const area = areaDe(m);
  const resistencia = resistenciaDe(m.resistencia);
  if (m.resistencia && !resistencia) notas.push(`resistência não reconhecida: "${m.resistencia}"`);
  if (resistencia?.nota) notas.push(`resistência com ressalva: ${resistencia.nota}`);
  const duracao = duracaoDe(m.duracao);
  let manual = !!resistencia?.nota || (m.resistencia && !resistencia);

  // Dano: componentes do texto; os de frases condicionais ("Se...", "contra mortos-vivos") ficam fora
  const danos = danosDe(texto);
  const principais = [];
  for (const d of danos) {
    const frase = semAcento(fraseEm(texto, d.indice));
    if (/^se |\bse for\b|\bquando\b|mortos-vivos|\bcada (dardo|rodada|turno)|incendeia|enquanto|\bpor rodada\b|no inicio/.test(frase)) {
      notas.push(`dano condicional ou por ${/cada dardo/.test(frase) ? "dardo" : "situação"}: "${fraseEm(texto, d.indice)}"`);
      manual = true;
      continue;
    }
    principais.push(d);
  }
  // Dardos (Mísseis Mágicos): "Três dardos ... Cada dardo causa 1d4+1 de dano de essência" → 3 × (1d4+1)
  const dardos = texto.match(/(Dois|Três|Quatro|Cinco)\s+dardos/i);
  const porDardo = danos.find(d => /cada dardo/i.test(fraseEm(texto, d.indice)));
  if (dardos && porDardo && !principais.length) {
    const n = { dois: 2, tres: 3, quatro: 4, cinco: 5 }[semAcento(dardos[1])];
    principais.push({ ...porDardo, formula: Array(n).fill(porDardo.formula).join("+"), dardo: porDardo.formula, dardos: n });
    notas.push(`${n} dardos de ${porDardo.formula} somados num alvo; dividir entre alvos é à mão`);
  }
  const extras = aprimoramentosDe(m, principais);
  // "+1 dardo" no aprimoramento: soma mais um dardo
  if (porDardo) (m.aprimoramentos ?? []).forEach((a, indice) => {
    if (/\+1 dardo/i.test(a.texto)) extras.push({ indice, extras: [{ tipo: "dano", formulaExtra: porDardo.formula, tipoDano: porDardo.tipoDano }] });
  });
  // "+1d6 de um dos tipos de dano" (Coluna Flamejante): o jogador escolhe o tipo
  (m.aprimoramentos ?? []).forEach((a, indice) => {
    const x = a.texto.match(/\+(\d+d\d+) de um dos tipos/i);
    if (x && principais.length) extras.push({ indice, extras: [{ tipo: "dano", formulaExtra: x[1], tipoDano: principais[0].tipoDano }], nota: "o jogador escolhe o tipo" });
  });
  if (principais.length) {
    acoes.push({
      tipo: "dano",
      componentes: principais.map(d => ({ formula: d.formula, tipoDano: d.tipoDano })),
      ...(area ? { area } : {}),
      ...(resistencia ? { resistencia } : {}),
      aprimoramentos: extras.filter(e => e.extras.some(x => x.tipo === "dano"))
    });
  }

  // Cura: "cura 2d8+2 PV", "recupera 3d8+3 PV"
  const cura = texto.match(new RegExp(`(?:cura|recupera)\\s+${FORMULA}\\s*(?:PV|pontos de vida)`, "i"));
  if (cura) {
    acoes.push({ tipo: "cura", formula: formula(cura[1]), aprimoramentos: extras.filter(e => e.extras.some(x => x.tipo === "cura")) });
    if (/mortos-vivos/i.test(texto)) notas.push("contra mortos-vivos vira dano (aplicar à mão)");
  }

  // Efeito: condições e bônus/penalidades
  const condicoes = condicoesDe(texto);
  const { mudancas, condicional } = mudancasDe(texto);
  if (condicional) { notas.push("bônus/penalidade com condição (\"contra\", \"até o fim\", \"próximo teste\"): conferir"); manual = true; }
  if (condicoes.length || mudancas.length) {
    const alvoEf = /^(você|voce)$/i.test(m.alvo ?? "") || m.alcance === "pessoal" ? "pessoal" : "alvo";
    // "fica Ofuscado por 1 rodada": a condição tem duração própria (a magia pode ser instantânea)
    const porRodadas = texto.match(/fica(?:m|r)?\s+[A-ZÁÉÍÓÚ][a-zà-úç]+\s+por\s+(\d+)\s+rodada/);
    const duracaoEf = porRodadas ? { tipo: "rodadas", rodadas: Number(porRodadas[1]) } : duracao;
    // No efeito, "reduz à metade" do dano vira "anula" (quem passa no teste não recebe a condição)
    const resEf = resistencia ? { ...resistencia, efeito: resistencia.efeito === "metade" ? "anula" : resistencia.efeito } : null;
    acoes.push({
      tipo: "efeito", alvo: alvoEf, duracao: duracaoEf,
      ...(mudancas.length ? { mudancas } : {}),
      ...(condicoes.length ? { condicoes } : {}),
      ...(resEf ? { resistencia: resEf } : {})
    });
    if (duracaoEf.tipo === "instantanea") { notas.push("efeito com duração instantânea: conferir quanto tempo dura"); manual = true; }
  }
  if (resistencia?.efeito === "parcial") { notas.push("resistência parcial: o efeito no sucesso fica no texto (o Mestre aplica)"); manual = true; }
  if (/arma de sangue|forma na m[aã]o uma arma|cria uma arma/i.test(texto)) { acoes.push({ tipo: "arma", nota: "ataque com Luta; dano da arma conjurada" }); manual = true; }

  // Efeito visual: só para magias de dano
  let vfx = null;
  const tipoVfx = principais[0]?.tipoDano;
  if (tipoVfx) {
    const [elemento, cor] = ELEMENTO[tipoVfx] ?? ELEMENTO.dano;
    const preset = area?.cilindro ? "pilar" : area?.forma === "esfera" ? "explosao" : area?.forma === "cone" ? "cone" : area?.forma === "linha" ? "linha"
      : area?.forma === "quadrado" ? "chuva" : m.alcance === "toque" ? "aura" : "projetil";
    vfx = { preset, elemento: /sangue/i.test(m.nome) || (m.tradicoes ?? []).includes("sangue") && tipoVfx === "trevas" ? "sangue" : elemento, cor };
  }

  const revisao = !acoes.length ? "somente-texto" : manual ? "manual" : "auto";
  if (duracao.tipo === "sustentada" || duracao.tipo === "concentracao") notas.push(`duração ${duracao.tipo}`);
  return { id: m.id, revisao, validada: false, acoes, vfx, notas };
}

/* ------------------------------ Relatório ------------------------------ */

const NOMES_RES = { reflexos: "Reflexos", fortitude: "Fortitude", vontade: "Vontade" };
function resumoDaProposta(p) {
  const partes = [];
  for (const a of p.acoes) {
    if (a.tipo === "dano") {
      partes.push(`**Dano** ${a.componentes.map(c => `${c.formula} ${c.tipoDano}`).join(" + ")}`
        + (a.area ? ` · área ${a.area.forma} ${String(a.area.tamanho).replace(".", ",")} m` : "")
        + (a.resistencia ? ` · ${NOMES_RES[a.resistencia.atributo]} ${a.resistencia.efeito}` : "")
        + (a.aprimoramentos?.length ? ` · aprimoramentos: ${a.aprimoramentos.map(x => `#${x.indice + 1} ${x.extras.map(e => `+${e.formulaExtra}${e.tipoDano ? ` ${e.tipoDano}` : ""}`).join(" ")}`).join("; ")}` : ""));
    }
    if (a.tipo === "cura") partes.push(`**Cura** ${a.formula}${a.aprimoramentos?.length ? ` · aprimoramento +${a.aprimoramentos[0].extras[0].formulaExtra}` : ""}`);
    if (a.tipo === "efeito") {
      const m = (a.mudancas ?? []).map(x => `${x.valor > 0 ? "+" : ""}${x.valor} ${x.chave}${x.grupoAcumulo ? " (não acumula)" : ""}`);
      const c = (a.condicoes ?? []).map(x => `condição ${x}`);
      partes.push(`**Efeito** (${a.alvo}, ${a.duracao.tipo}${a.duracao.rodadas ? ` ${a.duracao.rodadas}` : ""}) ${[...m, ...c].join(", ")}${a.resistencia ? ` · ${NOMES_RES[a.resistencia.atributo]} ${a.resistencia.efeito}` : ""}`);
    }
    if (a.tipo === "arma") partes.push("**Arma conjurada** (Atacar com Luta)");
  }
  if (p.vfx) partes.push(`VFX ${p.vfx.preset}/${p.vfx.elemento}`);
  return partes.join("<br>") || "só texto (gasta PM e mostra o cartão)";
}

export function relatorio(magias, propostas) {
  const porId = new Map(propostas.map(p => [p.id, p]));
  const conta = r => propostas.filter(p => p.revisao === r).length;
  const temDano = p => p.acoes.some(a => a.tipo === "dano" || a.tipo === "cura");
  const temEfeito = p => p.acoes.some(a => a.tipo === "efeito");
  const lotes = [
    ["Lote 1: dano e cura", m => temDano(porId.get(m.id))],
    ["Lote 2: bônus, penalidade e condição", m => !temDano(porId.get(m.id)) && temEfeito(porId.get(m.id))],
    ["Lote 3: só texto e casos especiais", m => !temDano(porId.get(m.id)) && !temEfeito(porId.get(m.id))]
  ];
  let md = `# Automação das magias: proposta para validar\n\n`
    + `Gerado por \`npm run magias:automacao\` a partir do texto de cada magia. **Nada é usado como pronto antes da sua validação:** `
    + `responda por lote (ex.: "lote 1 ok, exceto Bola de Fogo: ..."), e as magias aprovadas recebem \`"validada": true\` em \`tools/dados/magias_automacao.json\`.\n\n`
    + `- Magias: ${magias.length}\n- Confiança **auto** (padrão claro): ${conta("auto")}\n- **manual** (revisar com atenção): ${conta("manual")}\n- **somente-texto** (gasta PM e mostra o cartão): ${conta("somente-texto")}\n- Validadas: ${propostas.filter(p => p.validada).length}\n\n`
    + `Legenda: resistência *metade* = sucesso sofre metade; *anula* = sucesso não sofre nada / não recebe a condição; *parcial* = o efeito do sucesso fica no texto. `
    + `"não acumula" = bônus de Defesa de magias (vale o maior).\n`;
  for (const [titulo, filtro] of lotes) {
    const lista = magias.filter(filtro).sort((a, b) => a.nivel - b.nivel || a.nome.localeCompare(b.nome, "pt-BR"));
    md += `\n## ${titulo} (${lista.length})\n\n| Magia | Nível | Proposta | Confiança | Observações |\n|---|---|---|---|---|\n`;
    for (const m of lista) {
      const p = porId.get(m.id);
      const obs = p.notas.map(n => n.replace(/\|/g, "/")).join("<br>");
      md += `| ${m.nome}${p.validada ? " ✅" : ""} | ${m.nivel}º | ${resumoDaProposta(p).replace(/\|/g, "/")} | ${p.revisao} | ${obs} |\n`;
    }
  }
  return md;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const magias = JSON.parse(fs.readFileSync(path.join(DADOS, "magias.json"), "utf8")).magias;
  const arquivo = path.join(DADOS, "magias_automacao.json");
  const anteriores = fs.existsSync(arquivo) ? JSON.parse(fs.readFileSync(arquivo, "utf8")).magias : [];
  const mantidos = new Map(anteriores.filter(p => p.validada).map(p => [p.id, p]));
  const propostas = magias.map(m => mantidos.get(m.id) ?? propostaDaMagia(m));
  fs.writeFileSync(arquivo, JSON.stringify({ versao: 1, magias: propostas }, null, 2) + "\n");
  fs.writeFileSync(path.join(RAIZ, "tools", "relatorio_automacao.md"), relatorio(magias, propostas));
  const c = r => propostas.filter(p => p.revisao === r).length;
  console.log(`auto ${c("auto")} · manual ${c("manual")} · somente-texto ${c("somente-texto")} · validadas ${mantidos.size}`);
}
