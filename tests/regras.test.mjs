/** Ajustes de regras oficiais: túnicas, proficiências, d20 com vantagem, acerto/crítico, flanco, RD e mais. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dadosDaArmadura } from "../module/dados-compendios.mjs";
import {
  usandoArmadura, tipoArmadura, armaduraLeveOuNenhuma, vestindoTunica, temProficienciaArmadura, temProficienciaArma,
  penalidadeDeAtaque, calcularAtaque, modoD20, escolherD20, vantagemDasFlags, minimoDasFlags,
  resolverAtaque, resolverAtaqueMultiplo
} from "../module/combate.mjs";
import { resultadoTesteMorte } from "../module/morte.mjs";
import { derivarPersonagem } from "../module/derivar.mjs";
import { sistemaCompleto } from "./simulacao.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ler = nome => JSON.parse(fs.readFileSync(path.join(RAIZ, "tools", "dados", `${nome}.json`), "utf8"));
const ARMADURAS = ler("armaduras");
const ICONES = ler("icones-armaduras");
const ARMAS = ler("armas");
const vestir = id => { const d = dadosDaArmadura(ARMADURAS.itens.find(a => a.id === id), ICONES); d.system.equipado = true; return d; };
const arma = nome => ({ ...ARMAS.armas.find(a => a.nome === nome), proficiencia: "auto", bonusAtaque: 0, bonusDano: 0 });
const ficha = (parcial, itens = []) => derivarPersonagem(sistemaCompleto(parcial), itens);

test("Túnica não é armadura; escudo não é armadura; leve/média/pesada são", () => {
  assert.equal(usandoArmadura([vestir("tunica-simples")]), false);
  assert.equal(usandoArmadura([vestir("escudo-pesado")]), false);
  assert.equal(usandoArmadura([vestir("tunica-bordada"), vestir("escudo-leve")]), false);
  assert.equal(vestindoTunica([vestir("tunica-simples")]), true);
  for (const [id, tipo] of [["couro-batido", "leve"], ["cota-de-malha", "media"], ["armadura-de-placas", "pesada"]]) {
    assert.equal(usandoArmadura([vestir(id)]), true, id);
    assert.equal(tipoArmadura([vestir(id)]), tipo, id);
  }
  assert.equal(tipoArmadura([]), "nenhuma");
  assert.equal(armaduraLeveOuNenhuma([vestir("couro-batido")]), true);
  assert.equal(armaduraLeveOuNenhuma([vestir("cota-de-malha")]), false);
  const desequipada = vestir("armadura-de-placas"); desequipada.system.equipado = false;
  assert.equal(usandoArmadura([desequipada]), false);
});

test("Túnica sem proficiência: penalidade também no ataque; com proficiência: só nas perícias", () => {
  const itens = [vestir("tunica-bordada")];
  const sem = ficha({ atributos: { FOR: { base: 2 } } }, itens);
  assert.equal(penalidadeDeAtaque(sem, itens), -2);
  assert.equal(calcularAtaque(sem, arma("Clava"), "corpo-a-corpo", itens).bonus, 2 - 2);
  assert.equal(sem.pericias.acrobacia.total, -2);
  const com = ficha({ atributos: { FOR: { base: 2 } }, proficiencias: { tunicas: true } }, itens);
  assert.equal(penalidadeDeAtaque(com, itens), 0);
  assert.equal(calcularAtaque(com, arma("Clava"), "corpo-a-corpo", itens).bonus, 2);
  assert.equal(com.pericias.acrobacia.total, -2, "a penalidade nas perícias continua");
});

test("Armadura/escudo sem proficiência penalizam o ataque; hierarquia leve < média < pesada", () => {
  const prof = { armaduras: ["pesada"], escudo: true };
  assert.equal(temProficienciaArmadura(prof, "leve"), true);
  assert.equal(temProficienciaArmadura(prof, "media"), true);
  assert.equal(temProficienciaArmadura({ armaduras: ["leve"] }, "media"), false);
  assert.equal(temProficienciaArmadura({}, "tunica"), false);
  assert.equal(temProficienciaArmadura({ tunicas: true }, "tunica"), true);
  const itens = [vestir("cota-de-malha"), vestir("escudo-pesado")];
  assert.equal(penalidadeDeAtaque(ficha({}), itens), -(3 + 2));
  assert.equal(penalidadeDeAtaque(ficha({ proficiencias: { armaduras: ["media"] } }), itens), -2);
  assert.equal(penalidadeDeAtaque(ficha({ proficiencias: { armaduras: ["media"], escudo: true } }), itens), 0);
});

test("Proficiência em armas: simples sempre; marciais Leves/Ágeis (Ladino); exóticas de corte (Samurai); fogo", () => {
  assert.equal(temProficienciaArma({ armas: [] }, arma("Adaga")), true);
  assert.equal(temProficienciaArma({ armas: ["simples"] }, arma("Espada longa")), false);
  assert.equal(temProficienciaArma({ armas: ["marciais"] }, arma("Espada longa")), true);
  assert.equal(temProficienciaArma({ armas: ["marciais-leves-ageis"] }, arma("Florete")), true);
  assert.equal(temProficienciaArma({ armas: ["marciais-leves-ageis"] }, arma("Machadinha")), true);
  assert.equal(temProficienciaArma({ armas: ["marciais-leves-ageis"] }, arma("Espada longa")), false);
  assert.equal(temProficienciaArma({ armas: ["exoticas-corte"] }, arma("Katana")), true);
  assert.equal(temProficienciaArma({ armas: ["exoticas-corte"] }, arma("Nunchaku")), false);
  assert.equal(temProficienciaArma({ armas: ["fogo"] }, arma("Pistola")), true);
  assert.equal(temProficienciaArma({ armas: ["marciais"] }, arma("Pistola")), false);
});

test("Vantagem fica com o maior, desvantagem com o menor; juntas se anulam; não acumulam", () => {
  assert.equal(modoD20({ vantagem: true }), "vantagem");
  assert.equal(modoD20({ desvantagem: true }), "desvantagem");
  assert.equal(modoD20({ vantagem: true, desvantagem: true }), "normal");
  assert.equal(escolherD20([7, 15], "vantagem").d20, 15);
  assert.equal(escolherD20([7, 15], "desvantagem").d20, 7);
  assert.deepEqual(escolherD20([7, 15], "vantagem").dados, [{ valor: 7, mantido: false }, { valor: 15, mantido: true }]);
  // Várias fontes de vantagem continuam sendo 2d20 (o modo é o mesmo)
  const flags = { vantagem: { ataque: true, todos: true }, desvantagem: {} };
  assert.deepEqual(vantagemDasFlags(flags, ["ataque"]), { vantagem: true, desvantagem: false });
  assert.equal(modoD20(vantagemDasFlags(flags, ["ataque"])), "vantagem");
  assert.deepEqual(vantagemDasFlags({ vantagem: { pericia: { luta: true } } }, ["pericia.luta"]), { vantagem: true, desvantagem: false });
  assert.deepEqual(vantagemDasFlags({ vantagem: { pericia: { luta: true } } }, ["pericia.acrobacia"]), { vantagem: false, desvantagem: false });
});

test("20 e 1 naturais contam pelo dado que ficou", () => {
  assert.equal(escolherD20([20, 3], "desvantagem").natural, 3);
  assert.equal(escolherD20([1, 20], "vantagem").natural, 20);
  assert.equal(escolherD20([1, 20], "desvantagem").natural, 1);
});

test("Mínimo do d20 (Perícia Infalível) vale para o dado mantido", () => {
  assert.deepEqual(escolherD20([4], "normal", 10), { natural: 4, d20: 10, dados: [{ valor: 4, mantido: true }], minimoAplicado: true });
  assert.equal(escolherD20([4, 8], "vantagem", 10).d20, 10);
  assert.equal(escolherD20([4, 14], "vantagem", 10).d20, 14);
  assert.equal(minimoDasFlags({ minimoD20: { pericia: { reflexos: 10 } } }, ["pericia.reflexos"]), 10);
  assert.equal(minimoDasFlags({ minimoD20: { pericia: { reflexos: 10 } } }, ["pericia.luta"]), null);
});

test("Teste de morte com vantagem: faixas fixas pelo dado mantido", () => {
  const comVantagem = escolherD20([5, 20], "vantagem");
  assert.equal(resultadoTesteMorte(comVantagem.d20, {}).resultado, "reanima");
  const comDesvantagem = escolherD20([12, 1], "desvantagem");
  assert.equal(resultadoTesteMorte(comDesvantagem.d20, {}).resultado, "duasFalhas");
  assert.equal(resultadoTesteMorte(escolherD20([9, 10], "vantagem").d20, {}).resultado, "sucesso");
});

test("Acerto e crítico: só o 20 natural acerta sem alcançar a Defesa; margem precisa acertar", () => {
  // Exemplo do livro: margem 19, d20 = 19, total 25
  assert.deepEqual(resolverAtaque({ d20: 19, total: 25, margem: 19, defesa: 24 }), { acerta: true, critico: true, ameaca: true, automatico: false });
  assert.deepEqual(resolverAtaque({ d20: 19, total: 25, margem: 19, defesa: 26 }), { acerta: false, critico: false, ameaca: true, automatico: false });
  // 20 natural: acerta e é crítico contra qualquer Defesa
  assert.deepEqual(resolverAtaque({ d20: 20, total: 21, margem: 20, defesa: 40 }), { acerta: true, critico: true, ameaca: true, automatico: true });
  // Fora da margem: acerta sem crítico
  assert.deepEqual(resolverAtaque({ d20: 15, total: 22, margem: 19, defesa: 20 }), { acerta: true, critico: false, ameaca: false, automatico: false });
  assert.equal(resolverAtaque({ d20: 15, total: 19, margem: 19, defesa: 20 }).acerta, false);
  // 1 natural sem efeito especial
  assert.equal(resolverAtaque({ d20: 1, total: 30, defesa: 20 }).acerta, true);
  // Margem 18: 18 é ameaça
  assert.equal(resolverAtaque({ d20: 18, total: 24, margem: 18, defesa: 24 }).critico, true);
  // Sem alvo: acerta desconhecido, ameaça indicada
  assert.deepEqual(resolverAtaque({ d20: 19, total: 25, margem: 19 }), { acerta: null, critico: false, ameaca: true, automatico: false });
  // Tiro Lendário
  assert.deepEqual(resolverAtaque({ d20: 2, total: 5, defesa: 30, forcarAcerto: true }), { acerta: true, critico: true, ameaca: true, automatico: true });
});

test("Ataque contra vários alvos com um único d20", () => {
  const alvos = [{ id: "a", defesa: 20 }, { id: "b", defesa: 24 }, { id: "c", defesa: 26 }];
  const r19 = resolverAtaqueMultiplo({ d20: 19, total: 25, margem: 19 }, alvos);
  assert.deepEqual(r19.map(x => [x.id, x.acerta, x.critico]), [["a", true, true], ["b", true, true], ["c", false, false]]);
  const r20 = resolverAtaqueMultiplo({ d20: 20, total: 22, margem: 20 }, alvos);
  assert.ok(r20.every(x => x.acerta && x.critico));
  const r12 = resolverAtaqueMultiplo({ d20: 12, total: 24, margem: 19 }, alvos);
  assert.deepEqual(r12.map(x => [x.id, x.acerta, x.critico]), [["a", true, false], ["b", true, false], ["c", false, false]]);
});

test("Dano: extras de poderes entram na multiplicação (salvo naoMultiplica); segundo ataque sem atributo", async () => {
  const { calcularDano } = await import("../module/combate.mjs");
  const s = ficha({ atributos: { FOR: { base: 3 }, SAB: { base: 4 } } });
  const espada = arma("Espada longa");
  assert.equal(calcularDano(s, espada, "corpo-a-corpo").formula, "1d8 + 3");
  assert.equal(calcularDano(s, espada, "corpo-a-corpo", { semAtributo: true }).formula, "1d8");
  assert.equal(calcularDano(s, espada, "corpo-a-corpo", { atributo: "SAB" }).formula, "1d8 + 4");
  const furtivo = { rotulo: "Ataque Furtivo", formula: "2d6" };
  assert.equal(calcularDano(s, espada, "corpo-a-corpo", { extras: [furtivo] }).formula, "1d8 + 3 + 2d6");
  assert.equal(calcularDano(s, espada, "corpo-a-corpo", { extras: [furtivo], critico: true }).formula, "(1d8 + 3 + 2d6) * 2");
  const fora = { rotulo: "X", formula: "1d4", naoMultiplica: true };
  assert.equal(calcularDano(s, espada, "corpo-a-corpo", { extras: [fora], critico: true }).formula, "(1d8 + 3) * 2 + 1d4");
});

test("Reação: 1 por rodada; Desprevenido ou Surpreendido não reagem", async () => {
  const { podeReagir } = await import("../module/combate.mjs");
  assert.deepEqual(podeReagir({ reacao: { disponivel: true } }, []), { pode: true, motivo: "" });
  assert.deepEqual(podeReagir({ reacao: { disponivel: false } }, []), { pode: false, motivo: "usada" });
  assert.deepEqual(podeReagir({ reacao: { disponivel: true } }, new Set(["desprevenido"])), { pode: false, motivo: "desprevenido" });
  assert.deepEqual(podeReagir({ reacao: { disponivel: true } }, ["surpreendido"]), { pode: false, motivo: "surpreendido" });
  assert.equal(podeReagir({ reacao: { disponivel: true } }, ["abalado", "aguardando"]).pode, true);
});

test("Flanco: aliado do lado oposto, os dois corpo a corpo; não com aliado ao lado; poder conta em qualquer posição", async () => {
  const { estaFlanqueando, adjacentes } = await import("../module/combate.mjs");
  const q = (x, y, extra = {}) => ({ x, y, w: 1, h: 1, ...extra });
  const alvo = q(5, 5, { uuid: "alvo" });
  assert.equal(adjacentes(q(4, 5), alvo), true);
  assert.equal(adjacentes(q(3, 5), alvo), false);
  // Atacante a oeste, aliado a leste: flanco (para os dois)
  assert.equal(estaFlanqueando(q(4, 5), alvo, [q(6, 5)]), true);
  assert.equal(estaFlanqueando(q(6, 5), alvo, [q(4, 5)]), true);
  // Diagonais opostas também
  assert.equal(estaFlanqueando(q(4, 4), alvo, [q(6, 6)]), true);
  // Aliado ao lado (90°): sem flanco
  assert.equal(estaFlanqueando(q(4, 5), alvo, [q(5, 4)]), false);
  // Atacante longe (à distância): sem flanco
  assert.equal(estaFlanqueando(q(2, 5), alvo, [q(6, 5)]), false);
  // Aliado longe, mas com flanco por poder (Companheiro de Crime)
  assert.equal(estaFlanqueando(q(4, 5), alvo, [q(9, 9, { flanqueadorPor: ["alvo"] })]), true);
  // Alvo que não pode ser flanqueado
  assert.equal(estaFlanqueando(q(4, 5), { ...alvo, naoFlanqueavel: true }, [q(6, 5)]), false);
  // Alvo Grande (2×2): aliados em lados opostos
  const grande = { x: 5, y: 5, w: 2, h: 2, uuid: "g" };
  assert.equal(estaFlanqueando(q(4, 5), grande, [q(7, 6)]), true);
});

test("Camuflagem: leve falha com 1–2; total com 1–5", async () => {
  const { falhaPorCamuflagem } = await import("../module/combate.mjs");
  assert.deepEqual([1, 2, 3].map(d => falhaPorCamuflagem(d, "leve")), [true, true, false]);
  assert.deepEqual([1, 5, 6, 10].map(d => falhaPorCamuflagem(d, "total")), [true, true, false, false]);
  assert.equal(falhaPorCamuflagem(1, "nenhuma"), false);
});

test("Manobras: Fortitude oposta; Empurrar 1,5 m + 1,5 m a cada 5 de diferença; Desarmar por 5 empurra o item", async () => {
  const { efeitoDaManobra, MANOBRAS } = await import("../module/combate.mjs");
  const { bonusDoItem } = await import("../module/testes.mjs");
  assert.deepEqual(MANOBRAS, ["agarrar", "derrubar", "desarmar", "empurrar", "quebrar"]);
  assert.equal(efeitoDaManobra("agarrar", 3).condicao, "agarrado");
  assert.equal(efeitoDaManobra("derrubar", 0).condicao, "caido");
  assert.deepEqual([0, 4, 5, 9, 10, 15].map(d => efeitoDaManobra("empurrar", d).metros), [1.5, 1.5, 3, 3, 4.5, 6]);
  assert.equal(efeitoDaManobra("desarmar", 4).empurraItem, false);
  assert.equal(efeitoDaManobra("desarmar", 5).empurraItem, true);
  assert.equal(efeitoDaManobra("quebrar", 7).condicao, null);
  // Lado A da manobra usa o total de ataque corpo a corpo (Luta + bônus de ataque + condições)
  const s = ficha({ atributos: { FOR: { base: 3 } }, pericias: { luta: { treino: 1 } }, bonus: { ataque: 1 } });
  assert.equal(bonusDoItem(s, { tipo: "ataque", chave: "luta" }).bonus, 3 + 2 + 1);
  assert.equal(bonusDoItem(s, { tipo: "pericia", chave: "fortitude" }).bonus, 0);
});

test("RD: fontes diferentes somam; a mesma fonte não soma consigo mesma; teto 8 + metade do nível", async () => {
  const { somarRD, tetoDeRD } = await import("../module/combate.mjs");
  assert.equal(tetoDeRD(1), 8);
  assert.equal(tetoDeRD(5), 10);
  assert.equal(tetoDeRD(6), 11);
  assert.equal(tetoDeRD(undefined), null);
  const armadura = { chave: "item:armadura-x|rdGeral", origem: "Armadura X", valor: 3 };
  const poder = { chave: "item:poder-y|rdGeral", origem: "Poder Y", valor: 2 };
  assert.equal(somarRD(1, [armadura, poder], 10).total, 6);
  // Duas cópias do mesmo poder contam uma vez
  assert.equal(somarRD(0, [poder, { ...poder }], 10).total, 2);
  // Teto
  const r = somarRD(5, [armadura, poder, { chave: "c", origem: "Z", valor: 4 }], 10);
  assert.deepEqual([r.total, r.bruto, r.cortado], [10, 14, true]);
  // Sem nível: sem teto
  assert.equal(somarRD(5, [armadura, poder, { chave: "c", origem: "Z", valor: 4 }], null).total, 14);
  // Na ficha: RD geral e Redução de fogo têm o teto contado à parte
  const s = ficha({ nivel: 4 }, []);
  const comFontes = derivarPersonagem(sistemaCompleto({ nivel: 4 }), [], [], {
    rd: { base: { rdGeral: 6, reducao: { fogo: 9 } }, fontes: [{ ...armadura, valor: 5 }, { chave: "f|fogo", origem: "Manto", valor: 4, tipo: "fogo" }] }
  });
  assert.equal(s.resistencias.teto, 10);
  assert.equal(comFontes.resistencias.rdGeral, 10);
  assert.equal(comFontes.resistencias.reducao.fogo, 10);
  assert.equal(comFontes.resistencias.reducao.frio, 0);
  // Petrificado (condição) entra como fonte
  const petrificado = derivarPersonagem(sistemaCompleto({ nivel: 2 }), [], ["petrificado"]);
  assert.ok(petrificado.resistencias.rdGeral > 0);
});

test("Ataque que ignora a RD ignora o total; perda de PV não passa por resistências", async () => {
  const { calcularDanoRecebido } = await import("../module/combate.mjs");
  const res = { rdGeral: 3, reducao: { fogo: 5 }, imunidade: {}, vulnerabilidade: {} };
  assert.equal(calcularDanoRecebido(res, 12, "fogo").final, 4);
  assert.equal(calcularDanoRecebido(res, 12, "fogo", undefined, { ignoraRD: true }).final, 12);
});
