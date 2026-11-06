/** Carrossel de combate: cartas visíveis, turno, próximos, ocultos, derrotados e barras. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { cartasDoCombate, rodadaNova } from "../module/carrossel-dados.mjs";

const hud = { npcModo: "mestre", mostrarPM: true, mostrarDefesa: true, texto: "passarMouse" };
const c = (id, extra = {}) => ({ id, nome: id, img: `${id}.png`, iniciativa: 10, oculto: false, derrotado: false, disposicao: 1, ehPJ: true, pv: { value: 10, max: 20 }, pm: { value: 3, max: 6 }, ...extra });
const lista = [c("Ana"), c("Ogro", { ehPJ: false, disposicao: -1, oculto: true }), c("Bia"), c("Rato", { ehPJ: false, disposicao: -1, pv: { value: 0, max: 5 } }), c("Caio")];

test("Jogador não vê ocultos (nem a iniciativa deles); Mestre vê, marcado", () => {
  const jogador = cartasDoCombate({ combatentes: lista, turnoId: "Ana", visao: { ehMestre: false, hud, mostrarBarras: true } });
  assert.deepEqual(jogador.map(x => x.id), ["Ana", "Bia", "Rato", "Caio"]);
  const mestre = cartasDoCombate({ combatentes: lista, turnoId: "Ana", visao: { ehMestre: true, hud, mostrarBarras: true } });
  assert.equal(mestre.find(x => x.id === "Ogro").oculto, true);
});

test("Turno ativo e os 2 próximos (dando a volta); combate não começado não destaca ninguém", () => {
  const cartas = cartasDoCombate({ combatentes: lista, turnoId: "Rato", visao: { ehMestre: false, hud, mostrarBarras: true } });
  assert.equal(cartas.find(x => x.ativo).id, "Rato");
  assert.deepEqual(cartas.filter(x => x.proximo).map(x => [x.id, x.proximo]), [["Ana", 2], ["Caio", 1]]);
  const antes = cartasDoCombate({ combatentes: lista, turnoId: null, visao: { ehMestre: false, hud, mostrarBarras: true } });
  assert.equal(antes.some(x => x.ativo || x.proximo), false);
});

test("Derrotado (0 PV ou marcado); disposição; barras pelas regras do token", () => {
  const cartas = cartasDoCombate({ combatentes: lista, turnoId: "Ana", visao: { ehMestre: false, hud, mostrarBarras: true } });
  const rato = cartas.find(x => x.id === "Rato");
  assert.equal(rato.derrotado, true);
  assert.equal(rato.disposicao, "hostil");
  assert.equal(rato.pv, null, "NPC: jogador não vê a barra (padrão só o Mestre)");
  assert.deepEqual(cartas.find(x => x.id === "Ana").pv, { fracao: 0.5, texto: "10/20" });
  assert.deepEqual(cartas.find(x => x.id === "Ana").pm, { fracao: 0.5, texto: "3/6" });
  const pct = cartasDoCombate({ combatentes: lista, turnoId: "Ana", visao: { ehMestre: false, hud: { ...hud, npcModo: "porcentagem" }, mostrarBarras: true } });
  assert.deepEqual(pct.find(x => x.id === "Rato").pv, { fracao: 0, texto: "0%" });
  assert.equal(pct.find(x => x.id === "Rato").pm, null);
  const sem = cartasDoCombate({ combatentes: lista, turnoId: "Ana", visao: { ehMestre: true, hud, mostrarBarras: false } });
  assert.ok(sem.every(x => !x.pv && !x.pm));
  assert.equal(cartasDoCombate({ combatentes: [c("X", { derrotado: true })], turnoId: null, visao: { ehMestre: true, hud, mostrarBarras: true } })[0].derrotado, true);
});

test("Banner de rodada só quando a rodada muda (e é maior que 0)", () => {
  assert.equal(rodadaNova(1, 2), true);
  assert.equal(rodadaNova(2, 2), false);
  assert.equal(rodadaNova(0, 0), false);
  assert.equal(rodadaNova(0, 1), true);
});
