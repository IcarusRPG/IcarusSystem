/** Panteão e poderes concedidos (critério 15, parte de dados). */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DIVINDADES, GRUPOS_DIVINOS, divindadePorId, idDaDivindadePorNome, poderesDaDivindade, itemDoPoderConcedido, limiteDeDevocao, simboloDaDivindade
} from "../module/panteao.mjs";

test("20 divindades em Alfars e Baldurs, 10 em cada, cada uma com 3 poderes", () => {
  assert.deepEqual(GRUPOS_DIVINOS, ["Alfars", "Baldurs"]);
  assert.equal(DIVINDADES.filter(d => d.grupo === "Alfars").length, 10);
  assert.equal(DIVINDADES.filter(d => d.grupo === "Baldurs").length, 10);
  for (const d of DIVINDADES) assert.equal(poderesDaDivindade(d.id).length, 3, d.id);
});

test("Texto antigo do campo Divindade vira o id; texto desconhecido não", () => {
  assert.equal(idDaDivindadePorNome("Draconara"), "draconara");
  assert.equal(idDaDivindadePorNome("Sólem"), "solem");
  assert.equal(idDaDivindadePorNome("alétris"), "aletris");
  assert.equal(idDaDivindadePorNome("Deus do Mar Antigo"), null);
  assert.equal(divindadePorId("bellica").nome, "Béllica");
});

test("Item do poder concedido: fonte divindade, pré-requisito, símbolo e Efeito Ativo", () => {
  const item = itemDoPoderConcedido("draconara__couraca-draconica");
  assert.equal(item.type, "poder");
  assert.equal(item.system.fonte, "divindade");
  assert.equal(item.system.prerequisito, "Devoto de Draconara");
  assert.equal(item.img, simboloDaDivindade("draconara"));
  assert.equal(item._id, undefined);
  assert.equal(item.effects.length, 1);
  assert.equal(item.effects[0]._id, undefined);
  assert.deepEqual(item.flags["icarus-rpg"], { id: "draconara__couraca-draconica", divindade: "draconara", concedido: true });
});

test("Limite de devoção (informativo)", () => {
  assert.deepEqual(limiteDeDevocao("Lanceiro", "draconara").limite, 1);
  assert.equal(limiteDeDevocao("Paladino", "solem").limite, 2);
  assert.equal(limiteDeDevocao("Clérigo", "solem").todos, true);
  assert.equal(limiteDeDevocao("Druida", "floressa").todos, true);
  assert.equal(limiteDeDevocao("Druida", "solem").limite, 2);
  assert.equal(limiteDeDevocao("", "solem").limite, null);
});
