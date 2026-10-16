/**
 * Dados e compêndios novos (armaduras, poderes concedidos, condições, macros).
 * Critérios 1–4 do prompt de armaduras/poderes/condições.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GERADOS, moduloDe } from "../tools/gerar-dados.mjs";
import { documentosNovos, mudancasDoPoder, metaDoPoder } from "../module/dados-compendios.mjs";
import { idEstavel } from "../module/dados-itens.mjs";
import { ICONE_PADRAO, PERICIAS } from "../module/config.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ler = nome => JSON.parse(fs.readFileSync(path.join(RAIZ, "tools", "dados", `${nome}.json`), "utf8"));
const entrada = () => ({
  armaduras: ler("armaduras"), iconesArmaduras: ler("icones-armaduras"),
  poderes: ler("poderes-concedidos"), panteao: ler("panteao"), iconesDivindades: ler("icones-divindades"),
  condicoes: ler("condicoes"), nomePericia: k => PERICIAS.find(p => p.chave === k)?.nome ?? k
});

test("module/dados está em sincronia com tools/dados (rode npm run gerar:dados se falhar)", () => {
  for (const nome of GERADOS) {
    const gerado = fs.readFileSync(path.join(RAIZ, "module", "dados", `${nome}.mjs`), "utf8");
    assert.equal(gerado.replace(/\r\n/g, "\n"), moduloDe(nome), `module/dados/${nome}.mjs desatualizado`);
  }
});

test("Anexos: 13 tipos de dano, 12 armaduras, 60 poderes, 20 divindades, 36 condições, todos coerentes", () => {
  const td = ler("tipos-dano"), ar = ler("armaduras"), po = ler("poderes-concedidos"), pa = ler("panteao"), co = ler("condicoes");
  assert.equal(td.tipos.length, 13);
  assert.equal(ar.itens.length, 12);
  assert.equal(po.poderes.length, 60);
  assert.equal(pa.divindades.length, 20);
  assert.equal(co.condicoes.length, 36);
  const ids = new Set(po.poderes.map(p => p.id));
  for (const d of pa.divindades) {
    assert.equal(d.poderes.length, 3, d.id);
    for (const id of d.poderes) assert.ok(ids.has(id), `${d.id}: poder ${id} não existe`);
  }
  const condIds = new Set(co.condicoes.map(c => c.id));
  for (const c of co.condicoes) {
    for (const f of c.compoe ?? []) assert.ok(condIds.has(f), `${c.id} compõe ${f} inexistente`);
    if (c.escala) assert.ok(condIds.has(c.escala), `${c.id} escala para ${c.escala} inexistente`);
  }
  const pericias = new Set(PERICIAS.map(p => p.chave));
  for (const p of po.poderes) for (const e of p.efeitos ?? []) if (e.pericia) assert.ok(pericias.has(e.pericia), `${p.id}: perícia ${e.pericia}`);
});

test("1/3. Compêndio de armaduras: 12 itens em 5 pastas, todos com ícone da pasta real", () => {
  const d = documentosNovos(entrada())["armaduras-escudos"];
  assert.equal(d.itens.length, 12);
  assert.equal(d.pastas.length, 5);
  assert.ok(d.itens.every(i => i.img !== ICONE_PADRAO));
  for (const i of d.itens) assert.ok(fs.existsSync(path.join(RAIZ, decodeURI(i.img).replace("systems/icarus-rpg/", ""))), i.img);
  const couro = d.itens.find(i => i.flags["icarus-rpg"].id === "couro-reforcado");
  assert.deepEqual([couro.system.bonusDefesa, couro.system.penalidade, couro.system.tipo], [3, 1, "armadura"]);
  assert.equal(d.itens.find(i => i.flags["icarus-rpg"].id === "cota-de-malha").system.preco, 25000);
});

test("1/4. Compêndio de poderes concedidos: 60 itens, uma pasta por divindade dentro de Alfars e Baldurs, símbolo da divindade", () => {
  const d = documentosNovos(entrada())["poderes-concedidos"];
  assert.equal(d.itens.length, 60);
  const grupos = d.pastas.filter(p => !p.folder);
  assert.deepEqual(grupos.map(p => p.name).sort(), ["Alfars", "Baldurs"]);
  assert.equal(d.pastas.filter(p => p.folder).length, 20);
  for (const i of d.itens) {
    assert.equal(i.folder, idEstavel(`pasta:divindade:${i.system.divindade}`));
    assert.ok(fs.existsSync(path.join(RAIZ, decodeURI(i.img).replace("systems/icarus-rpg/", ""))), i.img);
  }
  // Os 3 poderes de uma divindade usam o mesmo ícone
  const porDivindade = {};
  for (const i of d.itens) (porDivindade[i.system.divindade] ??= new Set()).add(i.img);
  assert.ok(Object.values(porDivindade).every(s => s.size === 1));
  const couraca = d.itens.find(i => i.flags["icarus-rpg"].id === "draconara__couraca-draconica");
  assert.deepEqual(couraca.effects[0].changes.map(c => `${c.key}=${c.value}`), ["system.defesa.outros=1", "system.resistencias.reducao.fogo=5"]);
  assert.equal(couraca.effects[0].transfer, true);
});

test("Poderes: efeito condicional não vira Efeito Ativo; metadados Ação · Custo · Frequência", () => {
  const po = ler("poderes-concedidos").poderes;
  assert.deepEqual(mudancasDoPoder(po.find(p => p.id === "ardor__romper-amarras")), []);
  assert.equal(mudancasDoPoder(po.find(p => p.id === "floressa__voz-da-mata")).length, 2);
  assert.equal(metaDoPoder({ acao: "padrao", custoPM: 2, frequencia: "cena" }), "Ação padrão · 2 PM · 1x por cena");
  assert.equal(metaDoPoder({ acao: "passivo", custoPM: null, frequencia: "" }), "");
});

test("1. Condições: diário com 36 páginas em ordem alfabética e selo de pendência", () => {
  const d = documentosNovos(entrada()).condicoes.diarios[0];
  assert.equal(d.pages.length, 36);
  const nomes = d.pages.map(p => p.name);
  assert.deepEqual([...nomes].sort((a, b) => a.localeCompare(b, "pt-BR")), nomes);
  const agarrado = d.pages.find(p => p.name === "Agarrado").text.content;
  assert.match(agarrado, /Composição:<\/strong> = Desprevenido \+ Imóvel/);
  assert.match(agarrado, /Regra a confirmar/);
  assert.match(d.pages.find(p => p.name === "Cego").text.content, /Falha automática em Visão/);
});
