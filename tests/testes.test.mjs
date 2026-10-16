/** Teste Oposto e Teste de Resistência: bônus, permissões, resolução e CD (critérios 5–8). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { bonusDoItem, itensDeTeste, podeRolar, registrarRolagem, resolver, rolarNovamente, resultadoInicial, todosRolaram, passou } from "../module/testes.mjs";
import { resolverOposto, calcularCD } from "../module/combate.mjs";
import { derivarPersonagem } from "../module/derivar.mjs";
import { sistemaCompleto } from "./simulacao.mjs";

const ficha = (parcial = {}, condicoes = []) => derivarPersonagem(sistemaCompleto(parcial), [], condicoes);
const JOGADOR_A = { id: "ua", isGM: false };
const JOGADOR_B = { id: "ub", isGM: false };
const MESTRE = { id: "gm", isGM: true };

function sessaoOposta() {
  const participantes = [
    { id: "p0", nome: "Kaelen", donos: ["ua"], bonus: 5, falhaAuto: null },
    { id: "p1", nome: "Goblin 1", donos: [], bonus: 6, falhaAuto: null }
  ].map(p => ({ ...p, resultado: resultadoInicial(p) }));
  return { sessaoId: "s1", tipo: "oposto", gmId: "gm", status: "rolando", participantes, resolucao: null };
}

test("Bônus do atributo = total da ficha (base + raça + temporário), sem treino", () => {
  const s = ficha({ atributos: { FOR: { base: 2, racial: 1, temp: 1 } } });
  const b = bonusDoItem(s, { tipo: "atributo", chave: "FOR" });
  assert.equal(b.bonus, 4);
  assert.deepEqual(b.detalhes.map(d => d.chave), ["base", "racial", "temp"]);
});

test("6. Bônus da perícia = total da ficha (atributo + treino + outros, com condições)", () => {
  const s = ficha({ atributos: { FOR: { base: 3 } }, pericias: { atletismo: { treino: 1, outros: 1 } } }, ["abalado"]);
  const b = bonusDoItem(s, { tipo: "pericia", chave: "atletismo" });
  assert.equal(b.bonus, 3 + 2 + 1 - 2);
  assert.equal(b.bonus, s.pericias.atletismo.total);
  assert.ok(b.detalhes.some(d => d.chave === "condicao" && d.valor === -2 && d.origem === "Abalado"));
});

test("8. Indefeso → Reflexos é falha automática (sem rolar), com a causa", () => {
  const b = bonusDoItem(ficha({}, ["indefeso"]), { tipo: "pericia", chave: "reflexos" });
  assert.equal(b.falhaAuto, "Indefeso");
  const r = resultadoInicial({ falhaAuto: b.falhaAuto, bonus: b.bonus });
  assert.equal(r.falhaAuto, "Indefeso");
  assert.equal(passou(r, 5), false);
});

test("Árvore: 6 atributos e 30 perícias em ordem alfabética, com Fortitude, Reflexos e Vontade", () => {
  const { atributos, pericias } = itensDeTeste();
  assert.equal(atributos.length, 6);
  assert.equal(pericias.length, 30);
  assert.deepEqual(pericias.map(p => p.nome), [...pericias.map(p => p.nome)].sort((a, b) => a.localeCompare(b, "pt-BR")));
  for (const k of ["fortitude", "reflexos", "vontade"]) assert.ok(pericias.some(p => p.chave === k));
});

test("5. Permissões: dono jogador rola o seu; outro jogador não; Mestre só NPC (ou PJ com a opção ligada)", () => {
  const pj = { donos: ["ua"] }, npc = { donos: [] };
  assert.equal(podeRolar(pj, JOGADOR_A).pode, true);
  assert.equal(podeRolar(pj, JOGADOR_B).pode, false);
  assert.equal(podeRolar(npc, JOGADOR_A).pode, false);
  assert.equal(podeRolar(npc, MESTRE).pode, true);
  assert.equal(podeRolar(pj, MESTRE).pode, false);
  assert.deepEqual(podeRolar(pj, MESTRE, { mestreRolaPorJogador: true }), { pode: true, peloMestre: true });
});

test("5. Rolagem forjada é descartada pelo anfitrião", () => {
  const e = sessaoOposta();
  assert.equal(registrarRolagem(e, { participanteId: "p0", d20: 10, total: 15 }, JOGADOR_B).erro, "permissao");
  assert.equal(registrarRolagem(e, { participanteId: "p1", d20: 10, total: 16 }, JOGADOR_A).erro, "permissao");
  assert.equal(registrarRolagem(e, { participanteId: "p0", d20: 25, total: 30 }, JOGADOR_A).erro, "dado");
  assert.equal(registrarRolagem(e, { participanteId: "p0", d20: 10, total: 40 }, JOGADOR_A).erro, "total");
  assert.equal(registrarRolagem(e, { participanteId: "px", d20: 10, total: 15 }, JOGADOR_A).erro, "participante");
  const ok = registrarRolagem(e, { participanteId: "p0", d20: 10, total: 15 }, JOGADOR_A);
  assert.equal(ok.estado.participantes[0].resultado.total, 15);
  assert.equal(e.participantes[0].resultado, null, "não altera o estado original");
  assert.equal(registrarRolagem(ok.estado, { participanteId: "p0", d20: 12, total: 17 }, JOGADOR_A).erro, "jaRolou");
});

test("6. Teste Oposto: maior total vence; empate → maior bônus; empate no bônus → Empate e rolar de novo", () => {
  assert.deepEqual(resolverOposto({ total: 14, bonus: 5 }, { total: 12, bonus: 6 }), { vencedor: "A", motivo: "total" });
  assert.deepEqual(resolverOposto({ total: 14, bonus: 5 }, { total: 14, bonus: 6 }), { vencedor: "B", motivo: "bonus" });
  assert.deepEqual(resolverOposto({ total: 14, bonus: 5 }, { total: 14, bonus: 5 }), { vencedor: null, motivo: "empate" });
  assert.deepEqual(resolverOposto({ falhaAuto: "Cego" }, { total: 3, bonus: 0 }), { vencedor: "B", motivo: "falhaAuto" });
  assert.deepEqual(resolverOposto({ falhaAuto: "Cego" }, { falhaAuto: "Surdo" }), { vencedor: null, motivo: "empate" });

  let e = sessaoOposta();
  e = registrarRolagem(e, { participanteId: "p0", d20: 9, total: 14 }, JOGADOR_A).estado;
  assert.equal(todosRolaram(e), false);
  e = registrarRolagem(e, { participanteId: "p1", d20: 6, total: 12 }, MESTRE).estado;
  assert.equal(todosRolaram(e), true);
  const r = resolver(e);
  assert.equal(r.status, "resolvido");
  assert.equal(r.resolucao.vencedorId, "p0");

  let empate = sessaoOposta();
  empate.participantes[1].bonus = 5;
  empate = registrarRolagem(empate, { participanteId: "p0", d20: 10, total: 15 }, JOGADOR_A).estado;
  empate = registrarRolagem(empate, { participanteId: "p1", d20: 10, total: 15 }, MESTRE).estado;
  const re = resolver(empate);
  assert.equal(re.resolucao.vencedorId, null);
  const de = rolarNovamente(re);
  assert.equal(de.status, "rolando");
  assert.ok(de.participantes.every(p => p.resultado === null));
});

test("7. CD = 10 + metade do nível (para baixo) + atributo-chave", () => {
  const conj = nivel => ({ nivel, atributos: { CAR: { total: 3 } } });
  assert.equal(calcularCD(conj(5), "CAR").cd, 15);
  assert.equal(calcularCD(conj(4), "CAR").cd, 15);
  assert.equal(calcularCD(conj(6), "CAR").cd, 16);
  assert.deepEqual(calcularCD(conj(5), "CAR"), { cd: 15, nivel: 5, metade: 2, mod: 3, semNivel: false });
  const semNivel = calcularCD({ atributos: { CAR: { total: 3 } } }, "CAR");
  assert.equal(semNivel.semNivel, true);
  assert.equal(semNivel.cd, 13);
  // Na ficha: o total do atributo já inclui raça e temporário
  const s = ficha({ nivel: 5, atributos: { CAR: { base: 2, temp: 1 } } });
  assert.equal(calcularCD(s, "CAR").cd, 15);
});

test("7b. Teste de Resistência: passa com total ≥ CD; resumo de quem passou e falhou", () => {
  const participantes = [
    { id: "p0", donos: ["ua"], bonus: 3, falhaAuto: null },
    { id: "p1", donos: ["ub"], bonus: 1, falhaAuto: null },
    { id: "p2", donos: [], bonus: 0, falhaAuto: "Indefeso" }
  ].map(p => ({ ...p, resultado: resultadoInicial(p) }));
  let e = { sessaoId: "s2", tipo: "resistencia", gmId: "gm", status: "rolando", resistencia: { pericia: "reflexos", cd: 14 }, participantes };
  e = registrarRolagem(e, { participanteId: "p0", d20: 11, total: 14 }, JOGADOR_A).estado;
  e = registrarRolagem(e, { participanteId: "p1", d20: 12, total: 13 }, JOGADOR_B).estado;
  assert.equal(todosRolaram(e), true);
  const r = resolver(e);
  assert.deepEqual(r.participantes.map(p => p.passou), [true, false, false]);
  assert.deepEqual(r.resolucao, { passaram: 1, falharam: 2 });
});
