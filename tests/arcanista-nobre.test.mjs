/** Arcanista e Nobre: ramos da Linhagem, PM por linhagem, PV/PM dos critérios, grupos de poderes, túnicas. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { classePorId, habilidadesAteNivel, pmDaLinhagem, gruposEscolhidos, atendeGrupo, validarPoder, proficienciasDaClasse, tradicaoDaLinhagem } from "../module/classes-dados.mjs";
import { derivarPersonagem } from "../module/derivar.mjs";
import { sistemaCompleto } from "./simulacao.mjs";

const arcanista = classePorId("arcanista");
const nobre = classePorId("nobre");
const ids = (e, n = 20) => habilidadesAteNivel(arcanista, n, e).map(h => h.id);

test("Linhagem: sem escolha só as comuns; cada linhagem recebe só o próprio ramo; Herança só do Feiticeiro", () => {
  assert.deepEqual(ids({}), ["conjuracao-arcana", "linhagem", "mana-transbordante"]);
  assert.deepEqual(ids({ linhagem: 0 }, 5), ["conjuracao-arcana", "linhagem", "linhagem-do-mago", "foco-arcano", "grimorio-vivo", "escola-predileta"]);
  const feiticeiro = ids({ linhagem: 1 });
  assert.ok(feiticeiro.includes("heranca-ancestral") && !feiticeiro.includes("foco-arcano") && !feiticeiro.some(i => i.startsWith("heranca-de-")));
  assert.deepEqual(ids({ linhagem: 1, "heranca-ancestral": 2 }).filter(i => i.startsWith("heranca-de-")), ["heranca-de-fenix"]);
  // Herança escolhida sem ser Feiticeiro não entra
  assert.ok(!ids({ linhagem: 0, "heranca-ancestral": 0 }).includes("heranca-de-dragao"));
  const sangue = ids({ linhagem: 2 });
  assert.ok(sangue.includes("pacto-de-sangue") && sangue.includes("sangue-como-foco") && !sangue.includes("foco-arcano") && !sangue.includes("heranca-ancestral"));
  // Outras classes continuam iguais (Restrição de Equipamento do Monge sem nível = 1º)
  assert.ok(habilidadesAteNivel(classePorId("monge"), 1).some(h => h.id === "restricao-de-equipamento"));
});

test("Poderes da linhagem: Mago não vê os do Mago de Sangue (e vice-versa)", () => {
  const poderDe = grupo => arcanista.poderes.find(p => p.requerGrupo === grupo);
  const mago = gruposEscolhidos(arcanista, { linhagem: 0 });
  assert.deepEqual(mago, ["Linhagem do Mago"]);
  assert.ok(atendeGrupo("Linhagem do Mago", mago));
  assert.ok(!atendeGrupo("Linhagem do Mago de Sangue", mago));
  assert.ok(!atendeGrupo("Linhagem do Mago", gruposEscolhidos(arcanista, { linhagem: 2 })));
  const p = { nivel: 20, atributos: {}, treino: {}, tem: new Set(), grupos: gruposEscolhidos(arcanista, { linhagem: 1 }) };
  assert.equal(validarPoder(arcanista, poderDe("Linhagem do Feiticeiro"), p).visivel, true);
  assert.equal(validarPoder(arcanista, poderDe("Linhagem do Mago"), p).visivel, false);
});

/** PV e PM máximos de um personagem com a classe (classeConfig como a ficha grava). */
function maximos(classe, linhagem, nivel, atributos) {
  const pm = linhagem === undefined ? { pmInicial: classe.pm.inicial, pmPorNivel: classe.pm.porNivel, pmAtributo: classe.pm.atributo ?? null } : pmDaLinhagem(classe, linhagem);
  const s = derivarPersonagem(sistemaCompleto({
    nivel, magia: { atributo: "" },
    atributos: Object.fromEntries(Object.entries(atributos).map(([k, v]) => [k, { base: v }])),
    classeConfig: { pvInicial: classe.pv.inicial, pvPorNivel: classe.pv.porNivel, pvAtributo: "CON", ...pm, pmAtributoSoNoPrimeiroNivel: !!classe.pm.atributoSoNoPrimeiroNivel }
  }), []);
  return { pv: s.pv.max, pm: s.pm.max, cd: s.magia?.cd, atributoMagia: s.magia?.atributoEfetivo };
}

test("Critério 3: PM do Arcanista pela linhagem; PV do Arcanista nível 5 com CON +1 = 33", () => {
  assert.equal(maximos(arcanista, "mago", 5, { INT: 3 }).pm, 30);
  assert.equal(maximos(arcanista, "feiticeiro", 5, { CAR: 2 }).pm, 30);
  assert.equal(maximos(arcanista, "sangue", 5, { INT: 1 }).pm, 20);
  assert.equal(maximos(arcanista, undefined, 5, { INT: 3 }).pm, 30, "sem linhagem: 3 + INT");
  assert.equal(maximos(arcanista, "mago", 5, { CON: 1 }).pv, 33);
  // Feiticeiro conjura com Carisma: CD = 10 + 2 + 2
  const f = maximos(arcanista, "feiticeiro", 5, { CAR: 2, INT: 4 });
  assert.deepEqual([f.atributoMagia, f.cd], ["CAR", 14]);
  assert.deepEqual([tradicaoDaLinhagem("mago"), tradicaoDaLinhagem("feiticeiro"), tradicaoDaLinhagem("sangue")], ["arcana", "arcana", "sangue"]);
});

test("Critério 4: Nobre nível 5 com CON +1 → PV 37 e PM 20 (sem atributo)", () => {
  const n = maximos(nobre, undefined, 5, { CON: 1, CAR: 4 });
  assert.deepEqual([n.pv, n.pm], [37, 20]);
});

test("Túnicas e proficiências: Arcanista (simples, sem armadura, túnica) e Nobre (marciais, pesadas, escudo, túnica)", () => {
  assert.deepEqual(proficienciasDaClasse("arcanista"), { armas: ["simples"], armaduras: [], escudo: false, tunicas: true });
  assert.deepEqual(proficienciasDaClasse("nobre"), { armas: ["simples", "marciais"], armaduras: ["pesada"], escudo: true, tunicas: true });
  assert.equal(proficienciasDaClasse("guerreiro").tunicas, false);
});
