/** Origens, Poderes de Origem e Itens Comuns: dados, compêndios e regras puras. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ORIGENS, ITENS_COMUNS, documentosDeOrigens, itensDaOrigem, origemPorId, itemComumPorId, dadosDoItemComum
} from "../module/origens-dados.mjs";
import { idEstavel } from "../module/dados-itens.mjs";
import { PERICIAS } from "../module/config.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("1. 25 origens, 25 poderes e 49 itens; cada origem soma 2 itens que existem; perícias válidas", () => {
  assert.equal(ORIGENS.length, 25);
  assert.equal(ITENS_COMUNS.length, 49);
  const chaves = new Set(PERICIAS.map(p => p.chave));
  for (const o of ORIGENS) {
    assert.equal(o.itens.fixos.length + o.itens.escolhas.length, 2, o.id);
    assert.ok(chaves.has(o.pericia), o.pericia);
    for (const id of [...o.itens.fixos, ...o.itens.escolhas.flat()]) assert.ok(itemComumPorId(id), id);
  }
  assert.equal(origemPorId("musico").pericia, "atuacao");
  assert.deepEqual(itensDaOrigem(origemPorId("circense"), [1]), ["traje-colorido", "corda-fina-de-equilibrio"]);
  // JSON exatamente como o Anexo (uma linha)
  assert.equal(fs.readFileSync(path.join(RAIZ, "tools/dados/origens.json"), "utf8").trim().split("\n").length, 1);
});

test("1. Compêndios: pastas (6 categorias), ícone padrão, _id estável e idempotente", () => {
  const a = documentosDeOrigens({}, idEstavel), b = documentosDeOrigens({}, idEstavel);
  assert.deepEqual(a, b);
  assert.equal(a.origens.itens.length, 25);
  assert.equal(a["poderes-origem"].itens.length, 25);
  assert.equal(a["itens-comuns"].itens.length, 49);
  assert.equal(a["itens-comuns"].pastas.length, 6);
  assert.ok(a["itens-comuns"].itens.every(i => i.folder));
  assert.equal(new Set([...a.origens.itens, ...a["poderes-origem"].itens, ...a["itens-comuns"].itens].map(d => d._id)).size, 99);
  const poder = a["poderes-origem"].itens.find(p => p.flags["icarus-rpg"].poderId === "gracejo");
  assert.equal(poder.system.fonte, "origem");
  assert.equal(poder.system.custoPM, 1);
  assert.equal(poder.flags["icarus-rpg"].cdAtributo, "CAR");
  assert.equal(poder.flags["icarus-rpg"].auto, true);
});

test("11/12. Joia sem preço de compra e venda R$ 200; espaços fracionários; item com usos", () => {
  const joia = dadosDoItemComum(itemComumPorId("joia-de-familia"));
  assert.equal(joia.system.preco, 0);
  assert.equal(joia.system.precoVenda, 20000);
  assert.equal(dadosDoItemComum(itemComumPorId("bussola")).system.espacos, 0.5);
  assert.deepEqual(dadosDoItemComum(itemComumPorId("saco-de-ervas")).system.usos, { max: 2, atual: 2 });
  assert.equal(dadosDoItemComum(itemComumPorId("instrumento-musical"), { escolhaTexto: "alaúde" }).name, "Instrumento musical (alaúde)");
});

test("2/4. Perícia da origem: já treinado escolhe outra; trocar de origem tira só a fonte origem", async () => {
  const { periciaDaOrigem, semFonteOrigem, origemPorId } = await import("../module/origens-dados.mjs");
  const musico = origemPorId("musico");
  assert.deepEqual(periciaDaOrigem(musico, { atuacao: 0 }).pericia, "atuacao");
  const ja = periciaDaOrigem(musico, { atuacao: 1 });
  assert.equal(ja.precisaEscolher, true);
  assert.equal(ja.opcoes.includes("atuacao"), false);
  assert.equal(periciaDaOrigem(musico, { atuacao: 1 }, "luta").pericia, "luta");
  const r = semFonteOrigem({ atuacao: ["origem"], luta: ["classe", "origem"], furtividade: ["raca", "origem"], cura: ["classe"] },
    { atuacao: 1, luta: 1, furtividade: 1, cura: 1 });
  assert.deepEqual(r.treinos, { atuacao: 0, furtividade: 0 }, "só origem → 0; classe fica; raça treina pelo efeito");
  assert.deepEqual(r.treinoPor, { luta: ["classe"], furtividade: ["raca"], cura: ["classe"] });
});

test("4. Item de origem editado ou multiplicado não sai na troca (assinatura)", async () => {
  const { assinaturaDoItem, dadosDoItemComum, itemComumPorId } = await import("../module/origens-dados.mjs");
  const d = dadosDoItemComum(itemComumPorId("traje-real"), { origemItem: true });
  const a = assinaturaDoItem(d);
  assert.equal(assinaturaDoItem({ ...d, system: { ...d.system, vestido: true } }), a, "vestir não é editar");
  assert.notEqual(assinaturaDoItem({ ...d, name: "Traje do rei" }), a);
});
