/**
 * Objetos (regra oficial de Quebrar) e focos arcanos: regras puras, sem Foundry.
 * Fonte: tools/dados/objetos.json (embutido em module/dados/objetos.mjs).
 * - Defesa do objeto solto: pelo tamanho (+5 em movimento). Empunhado/vestido: Defesa do portador.
 * - Dano: normal, menos a RD do objeto (SEM o teto de RD dos personagens). 0 PV ou menos = destruído.
 * - Item de ator como objeto: flags.objeto { rd, pvMax, tamanho }, flags.pvObjeto e flags.destruido.
 */
import { SISTEMA_ID } from "./config.mjs";
import OBJETOS from "./dados/objetos.mjs";

const F = SISTEMA_ID;
const semAcento = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export { OBJETOS };
export const TAMANHOS_OBJETO = Object.keys(OBJETOS.defesaPorTamanho);

/** Defesa do objeto solto pelo tamanho (+5 em movimento). Defesa manual (número) tem precedência. */
export function defesaDoObjeto({ tamanho = "medio", emMovimento = false, defesa = null } = {}) {
  const base = Number.isFinite(defesa) ? defesa : OBJETOS.defesaPorTamanho[tamanho] ?? OBJETOS.defesaPorTamanho.medio;
  return base + (emMovimento ? OBJETOS.bonusEmMovimento : 0);
}

/** PV do objeto pelo porte do item (reduzido ÷ 2, aumentado × 2, gigante × 5). */
export const pvPeloPorte = (pv, porte = "normal") => Math.max(1, Math.floor(pv * (OBJETOS.multiplicadorPv[porte] ?? 1)));

/**
 * Dano num objeto: subtrai a RD do objeto, sem o teto de RD dos personagens.
 * @returns {{ efetivo:number, pv:number, destruido:boolean }}
 */
export function danoNoObjeto({ pv, rd = 0 }, dano) {
  const efetivo = Math.max(0, Math.trunc(Number(dano) || 0) - Math.max(0, Math.trunc(Number(rd) || 0)));
  const restante = Math.trunc(Number(pv) || 0) - efetivo;
  return { efetivo, pv: restante, destruido: restante <= 0 };
}

/* ------------------------------ Itens de ator ------------------------------ */

const flags = item => item?.flags?.[F] ?? {};

/**
 * O item é um foco arcano? Equipamento "foco" ou qualquer item com flags.focoArcano (o Bordão
 * Arcano é uma arma com a flag; o Bordão comum não é foco).
 */
export const ehFoco = item => (item?.type === "equipamento" && item.system?.tipo === "foco") || (["equipamento", "arma"].includes(item?.type) && !!flags(item).focoArcano);

/** O item foi destruído (0 PV)? */
export const estaDestruido = item => !!flags(item).destruido;

/** O foco está em mãos (equipado / empunhado) e inteiro? */
const emMaos = item => (item.type === "arma" ? !!item.system?.empunhada : !!item.system?.equipado);

/** Foco arcano empunhado e inteiro (o primeiro), ou null. */
export const focoEmpunhado = (itens = []) => [...itens].find(i => ehFoco(i) && emMaos(i) && !estaDestruido(i)) ?? null;

/** Só o Mago precisa de foco (Feiticeiro e Mago de Sangue não). */
export const linhagemPrecisaDeFoco = linhagem => linhagem === "mago";

/**
 * Estatísticas de objeto de um item de ator: as gravadas (flags.objeto) ou, no foco, as do material
 * (o Bordão é madeira). Sem dado: null (o diálogo pede RD e PV manuais).
 * @returns {{ rd:number, pvMax:number, pv:number, tamanho:string, destruido:boolean }|null}
 */
export function objetoDoItem(item) {
  const f = flags(item);
  let base = f.objeto ?? null;
  if (!base && ehFoco(item)) {
    const material = f.focoArcano?.material ?? "madeira";
    const m = OBJETOS.materiaisFoco[material] ?? OBJETOS.materiaisFoco.madeira;
    base = { rd: m.rd, pvMax: m.pv, tamanho: "minusculo" };
  }
  if (!base) return null;
  // Dado incompleto (só a RD preenchida na ficha): sem PV não há objeto
  if (!Number.isFinite(Number(base.pvMax)) || base.pvMax === "" || base.pvMax === null) return null;
  base = { ...base, rd: Math.max(0, Math.trunc(Number(base.rd) || 0)), pvMax: Math.trunc(Number(base.pvMax)) };
  const pv = Number.isFinite(f.pvObjeto) ? f.pvObjeto : base.pvMax;
  return { rd: base.rd, pvMax: base.pvMax, pv, tamanho: base.tamanho ?? "minusculo", destruido: !!f.destruido || pv <= 0 };
}

/**
 * Mudanças do item depois de sofrer dano: PV e, ao zerar, destruído e fora de "em mãos"/"equipado".
 * @returns {{ mudancas:object, efetivo:number, pv:number, destruido:boolean }}
 */
export function mudancasDoDanoNoItem(item, dano, manual = null) {
  // Item sem RD/PV gravados (armas e armaduras do compêndio): usa os valores manuais do diálogo
  const obj = objetoDoItem(item) ?? (manual ? { rd: manual.rd, pvMax: manual.pv, pv: manual.pv, tamanho: "pequeno" } : null);
  if (!obj) return null;
  const r = danoNoObjeto({ pv: obj.pv, rd: obj.rd }, dano);
  const mudancas = { [`flags.${F}.pvObjeto`]: r.pv };
  if (!flags(item).objeto) mudancas[`flags.${F}.objeto`] = { rd: obj.rd, pvMax: obj.pvMax, tamanho: obj.tamanho };
  if (r.destruido) {
    mudancas[`flags.${F}.destruido`] = true;
    if (item.type === "arma") mudancas["system.empunhada"] = false;
    else mudancas["system.equipado"] = false;
  }
  return { mudancas, ...r };
}

/* ------------------------------ Compêndio ------------------------------ */

/** Nome para casar com a tabela: sem acento, minúsculo, sem o parêntese ("Escudo Leve (Broquel)" → "escudo leve"). */
const chaveDeNome = nome => semAcento(String(nome).replace(/\(.*?\)/g, ""));

/**
 * RD/PV de uma arma, armadura ou escudo do compêndio pela tabela validada (itensPorNome); sem linha,
 * pela categoria da armadura. Devolve { rd, pvMax, tamanho } ou null (para relatar).
 */
export function objetoDoCompendio(dados, tipo, nome, categoria = "") {
  const lista = tipo === "arma" ? dados.itensPorNome.armas : dados.itensPorNome.armaduras;
  const linha = lista.find(x => chaveDeNome(x.nome) === chaveDeNome(nome));
  const v = linha ?? (tipo !== "arma" ? dados.porCategoriaArmadura[categoria] : null);
  if (!v) return null;
  const tamanho = tipo === "arma" ? (/duas-maos/.test(linha?.categoria) ? "medio" : "pequeno") : "medio";
  return { rd: v.rd, pvMax: v.pv, tamanho };
}

/** Grava RD/PV (flags.objeto) nos documentos de armas e armaduras/escudos; devolve os nomes sem valor. */
export function aplicarObjetosNosCompendios(dados, armas, armaduras) {
  const semValor = [];
  for (const [tipo, docs] of [["arma", armas], ["armadura", armaduras]]) {
    for (const d of docs) {
      const o = objetoDoCompendio(dados, tipo, d.name, d.system?.categoria);
      if (!o) { semValor.push(d.name); continue; }
      d.flags = { ...d.flags, [F]: { ...(d.flags?.[F] ?? {}), objeto: o } };
    }
  }
  return semValor;
}

/**
 * Focos arcanos (pasta "Focos arcanos" no compêndio Itens Comuns): os 5 equipamentos e o Bordão
 * Arcano (cópia do Bordão do compêndio de armas, com a flag de foco). Preços em Reais no JSON.
 */
export function documentosDeFocos(dados, idEstavel, { img = "icons/svg/item-bag.svg", bordao = null, icones = {} } = {}) {
  const pasta = { _id: idEstavel("pasta:focos-arcanos"), name: "Focos arcanos", type: "Item", folder: null, sorting: "m", sort: 900000, color: "#3a2a5a", flags: {} };
  const itens = dados.focos.map((f, i) => {
    const m = dados.materiaisFoco[f.material];
    return {
      _id: idEstavel(`foco:${f.id}`), name: f.nome, type: "equipamento", img: icones[`foco:${f.id}`] ?? img, folder: pasta._id, sort: (i + 1) * 100,
      system: { tipo: "foco", quantidade: 1, equipado: false, espacos: f.espacos ?? 1, preco: Math.round((f.preco ?? 0) * 100),
        descricao: `<p>${f.descricao}</p><p><strong>${f.materialNome ?? m.nome}:</strong> RD ${m.rd}, PV ${m.pv}. ${f.maos === 2 ? "Duas mãos." : "Uma mão."}</p>` },
      effects: [],
      flags: { [F]: { id: `foco:${f.id}`, focoArcano: { material: f.material, maos: f.maos ?? 1 }, objeto: { rd: m.rd, pvMax: m.pv, tamanho: f.tamanho }, pvObjeto: m.pv } }
    };
  });
  if (bordao && dados.bordaoArcano) {
    const b = dados.bordaoArcano;
    itens.push({
      ...structuredClone(bordao), _id: idEstavel(`foco:${b.id}`), name: b.nome, folder: pasta._id, img: icones[`foco:${b.id}`] ?? bordao.img, sort: (itens.length + 1) * 100,
      system: { ...structuredClone(bordao.system), preco: Math.round(b.preco * 100), espacos: b.espacos, descricao: `<p>${b.descricao}</p><p><strong>Madeira, duas mãos:</strong> RD ${b.rd}, PV ${b.pv}.</p>` },
      flags: { [F]: { ...(bordao.flags?.[F] ?? {}), id: `foco:${b.id}`, focoArcano: { material: b.material, maos: 2 }, objeto: { rd: b.rd, pvMax: b.pv, tamanho: "medio" }, pvObjeto: b.pv } }
    });
  }
  return { pasta, itens };
}
