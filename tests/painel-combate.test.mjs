/** Painel de combate do Mestre (0.41.0): quem aparece, destaque do próximo a agir e ícones das condições. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { proximoDoMestre, cartasDoPainel, rotuloDoDestaque, comSinal } from "../module/painel-combate-dados.mjs";
import CONDICOES from "../module/dados/condicoes.mjs";

const pj = (id, extra = {}) => ({ id, nome: id, img: "", doMestre: false, ...extra });
const npc = (id, extra = {}) => ({ id, nome: id, img: "", doMestre: true, pv: { value: 10, max: 10 }, ...extra });

test("próximo do Mestre: o exemplo B → X → 3 → M destaca M", () => {
  const ordem = [pj("A"), pj("B"), pj("X"), pj("3"), npc("M"), npc("N")];
  assert.deepEqual(proximoDoMestre(ordem, "B"), { id: "M", faltam: 3 });
});

test("próximo do Mestre: turno atual é dele = agindo agora (faltam 0)", () => {
  const ordem = [pj("A"), npc("M"), npc("N")];
  assert.deepEqual(proximoDoMestre(ordem, "M"), { id: "M", faltam: 0 });
});

test("próximo do Mestre: dá a volta na rodada e pula derrotados", () => {
  const ordem = [npc("M", { derrotado: true }), npc("N"), pj("A"), pj("B")];
  assert.deepEqual(proximoDoMestre(ordem, "A"), { id: "N", faltam: 3 });
  assert.equal(proximoDoMestre([pj("A"), npc("M", { derrotado: true })], "A"), null);
  assert.equal(proximoDoMestre([], null), null);
});

test("próximo do Mestre: combate sem começar conta do primeiro da ordem", () => {
  assert.deepEqual(proximoDoMestre([pj("A"), npc("M")], null), { id: "M", faltam: 1 });
});

test("cartas: só os do Mestre, na ordem, com o destaque certo", () => {
  const combatentes = [pj("A"), npc("M"), pj("B"), npc("N"), npc("O")];
  const cartas = cartasDoPainel({ combatentes, turnoId: "B", comecou: true });
  assert.deepEqual(cartas.map(c => c.id), ["M", "N", "O"]);
  assert.deepEqual(cartas.filter(c => c.destaque).map(c => c.id), ["N"]);
  const n = cartas.find(c => c.id === "N");
  assert.equal(n.agindoAgora, false);
  assert.equal(n.faltam, 1);
  assert.equal(rotuloDoDestaque(n).chave, "ICARUS.PainelCombate.ProximoAAgir");
});

test("cartas: agindo agora e 'age em N turnos'", () => {
  const agora = cartasDoPainel({ combatentes: [pj("A"), npc("M")], turnoId: "M", comecou: true });
  assert.equal(agora[0].agindoAgora, true);
  assert.equal(agora[0].noTurno, true);
  assert.equal(rotuloDoDestaque(agora[0]).chave, "ICARUS.PainelCombate.AgindoAgora");
  const longe = cartasDoPainel({ combatentes: [pj("A"), pj("B"), pj("C"), npc("M")], turnoId: "A", comecou: true });
  assert.deepEqual(rotuloDoDestaque(longe[0]), { chave: "ICARUS.PainelCombate.AgeEm", dados: { n: 3 } });
  assert.equal(rotuloDoDestaque({ destaque: false }), null);
});

test("cartas: PV 0 conta como derrotado (sem destaque) e PV baixo marcado", () => {
  const cartas = cartasDoPainel({
    combatentes: [npc("M", { pv: { value: 0, max: 20 } }), npc("N", { pv: { value: 4, max: 20 } })],
    turnoId: "M", comecou: true
  });
  assert.equal(cartas[0].derrotado, true);
  assert.equal(cartas[1].pvBaixo, true);
  assert.equal(cartas[1].pv.fracao, 0.2);
  // O derrotado não pega destaque só pela marca do Foundry; PV 0 entra pela carta, não pela ordem
  assert.equal(cartas.filter(c => c.destaque).length, 1);
});

test("comSinal", () => {
  assert.equal(comSinal(3), "+3");
  assert.equal(comSinal(0), "+0");
  assert.equal(comSinal(-2), "−2");
  assert.equal(comSinal(null), "—");
});

test("condições: todo ícone do Foundry usado existe (Vulnerável tinha um que não existe)", () => {
  // Ícones de icons/svg/ que existem no Foundry v12/v13 (os usados pelas condições)
  const existentes = new Set(["anchor", "biohazard", "blind", "blood", "daze", "deaf", "downgrade", "eye", "falling", "fire",
    "heal", "light-off", "net", "paralysis", "poison", "skull", "sleep", "stoned", "terror", "unconscious", "upgrade", "target"]);
  for (const c of CONDICOES.condicoes) {
    const nome = c.iconeCore?.match(/^icons\/svg\/(.+)\.svg$/)?.[1];
    assert.ok(existentes.has(nome), `${c.id}: ${c.iconeCore}`);
  }
  assert.equal(CONDICOES.condicoes.find(c => c.id === "vulneravel").iconeCore, "icons/svg/target.svg");
});
