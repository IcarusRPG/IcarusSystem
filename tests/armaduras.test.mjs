/** Armaduras e escudos: Defesa, penalidade de armadura e preço (critérios 5 e 6). */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dadosDaArmadura } from "../module/dados-compendios.mjs";
import { derivarPersonagem } from "../module/derivar.mjs";
import { debitar, formatarPreco } from "../module/moeda.mjs";
import { sistemaCompleto } from "./simulacao.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ler = nome => JSON.parse(fs.readFileSync(path.join(RAIZ, "tools", "dados", `${nome}.json`), "utf8"));
const ARMADURAS = ler("armaduras");
const ICONES = ler("icones-armaduras");
const item = (id, equipado = true) => {
  const d = dadosDaArmadura(ARMADURAS.itens.find(a => a.id === id), ICONES);
  d.system.equipado = equipado;
  return d;
};
const personagem = itens => derivarPersonagem(sistemaCompleto({ atributos: { DES: { base: 2 } } }), itens);

test("5. Couro Reforçado equipado: Defesa 10 + DES + 3 e −1 em Acrobacia, Furtividade e Prestidigitação", () => {
  const s = personagem([item("couro-reforcado")]);
  assert.equal(s.defesa.armadura, 3);
  assert.equal(s.defesa.total, 10 + 2 + 3);
  assert.equal(s.defesa.penalidade, 1);
  for (const k of ["acrobacia", "furtividade", "prestidigitacao"]) assert.equal(s.pericias[k].total, 2 - 1, k);
  assert.equal(s.pericias.atletismo.total, 0);
  assert.deepEqual(s.defesa.origensPenalidade, [{ nome: "Couro Reforçado", valor: 1 }]);
});

test("Penalidade soma armadura e escudo equipados; item não equipado não conta", () => {
  const s = personagem([item("cota-de-malha"), item("escudo-pesado"), item("armadura-de-placas", false)]);
  assert.equal(s.defesa.total, 10 + 2 + 5 + 2);
  assert.equal(s.defesa.penalidade, 3 + 2);
  assert.equal(s.pericias.furtividade.total, 2 - 5);
});

test("Túnica: ocupa o lugar da armadura, soma Defesa, mas NÃO é armadura e exige proficiência própria", () => {
  const tunica = item("tunica-simples");
  assert.equal(tunica.system.tipo, "armadura");
  assert.equal(tunica.system.categoria, "tunica");
  assert.equal(tunica.system.proficienciaLivre, undefined);
  assert.equal(personagem([tunica]).defesa.armadura, 1);
});

test("6. Comprar Cota de Malha debita R$ 250 (25.000 centavos)", () => {
  const cota = item("cota-de-malha", false);
  assert.equal(cota.system.preco, 25000);
  assert.equal(formatarPreco(cota.system.preco), "R$ 250");
  assert.deepEqual(debitar({ ouroReal: 0, real: 300, centavo: 0 }, cota.system.preco), { ouroReal: 0, real: 50, centavo: 0 });
});
