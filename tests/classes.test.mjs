/** Classes: dados, ícones, progressão, PV/PM, pré-requisitos e poderes comuns. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CLASSES, classePorId, iconeDaClasse, idDaClassePorNome } from "../module/classes-dados.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("7 classes, 44 habilidades e 245 poderes no JSON", () => {
  assert.deepEqual(CLASSES.map(c => c.id), ["guerreiro", "samurai", "barbaro", "ladino", "patrulheiro", "monge", "pistoleiro"]);
  assert.equal(CLASSES.reduce((s, c) => s + c.habilidades.length, 0), 44);
  assert.equal(CLASSES.reduce((s, c) => s + c.poderes.length, 0), 245);
});

test("Ícones das classes existem no disco (Bárbaro com acento)", () => {
  for (const c of CLASSES) {
    const url = iconeDaClasse(c.id);
    assert.ok(url.includes("img/Icones/classes/"), c.id);
    assert.ok(fs.existsSync(path.join(RAIZ, decodeURI(url).replace("systems/icarus-rpg/", ""))), url);
  }
  assert.equal(idDaClassePorNome("Bárbaro"), "barbaro");
  assert.equal(idDaClassePorNome("barbaro"), "barbaro");
  assert.equal(classePorId("monge").pm.atributoSoNoPrimeiroNivel, true);
});

test("Compêndios de classes: 7 classes, 44 habilidades e 245 poderes; pastas por classe > grupo; idempotente", async () => {
  const { documentosDeClasses } = await import("../module/dados-compendios.mjs");
  const ler = n => JSON.parse(fs.readFileSync(path.join(RAIZ, "tools", "dados", `${n}.json`), "utf8"));
  const d = { classes: ler("classes"), iconesClasses: ler("icones-classes"), proficienciasClasses: ler("proficiencias-classes") };
  const docs = documentosDeClasses(d);
  assert.equal(docs.classes.itens.length, 7);
  assert.equal(docs["habilidades-classe"].itens.length, 44);
  assert.equal(docs["poderes-classe"].itens.length, 245);
  const pastas = new Set(docs["poderes-classe"].pastas.map(p => p._id));
  for (const p of docs["poderes-classe"].itens) assert.ok(pastas.has(p.folder), `${p.name} sem pasta (${p.system.grupo})`);
  const ids = docs["poderes-classe"].itens.map(p => p._id);
  assert.equal(new Set(ids).size, ids.length, "ids repetidos");
  assert.equal(new Set(docs["habilidades-classe"].itens.map(p => p._id)).size, 44);
  assert.deepEqual(documentosDeClasses(d), docs);
  // Poderes comuns em cada classe, com ids diferentes
  const comuns = docs["poderes-classe"].itens.filter(p => p.name === "Aumento de Atributo");
  assert.equal(comuns.length, 7);
  assert.equal(new Set(comuns.map(p => p._id)).size, 7);
  // Ícone da classe em todos
  const monge = docs.classes.itens.find(c => c.system.classeId === "monge");
  assert.ok(docs["poderes-classe"].itens.filter(p => p.system.classe === "monge").every(p => p.img === monge.img));
  assert.deepEqual([monge.system.proficiencias.tunicas, monge.system.pm.atributoSoNoPrimeiroNivel], [true, true]);
});

test("Perícias obrigatórias: fixas e (Luta ou Pontaria) como escolha", async () => {
  const { parseObrigatorias, chaveDaPericia } = await import("../module/classes-dados.mjs");
  assert.equal(chaveDaPericia("Prestidigitação"), "prestidigitacao");
  assert.deepEqual(parseObrigatorias("Fortitude e (Luta ou Pontaria)"), [{ tipo: "fixa", chave: "fortitude" }, { tipo: "escolha", opcoes: ["luta", "pontaria"] }]);
  assert.deepEqual(parseObrigatorias("Furtividade e Prestidigitação"), [{ tipo: "fixa", chave: "furtividade" }, { tipo: "fixa", chave: "prestidigitacao" }]);
  for (const c of CLASSES) {
    const p = parseObrigatorias(c.pericias.obrigatorias);
    assert.ok(p.length === 2, `${c.id}: ${c.pericias.obrigatorias}`);
    for (const nome of c.pericias.lista) assert.ok(chaveDaPericia(nome), `${c.id}: perícia desconhecida ${nome}`);
  }
});

test("Progressão: habilidades por nível e contador de poderes de classe", async () => {
  const { habilidadesAteNivel, contagemDePoderes, poderesConcedidosAteNivel } = await import("../module/classes-dados.mjs");
  const ladino = classePorId("ladino");
  assert.deepEqual(habilidadesAteNivel(ladino, 1).map(h => h.id).sort(), ["ataque-furtivo", "duas-armas"]);
  assert.ok(habilidadesAteNivel(ladino, 8).some(h => h.id === "pericia-refinada"));
  // A partir do 2º nível: 1 no 2º, 19 no 20º (classes com poder:true do 2º ao 20º)
  assert.equal(poderesConcedidosAteNivel(ladino, 1), 0);
  assert.equal(poderesConcedidosAteNivel(ladino, 2), 1);
  assert.equal(poderesConcedidosAteNivel(ladino, 20), 19);
  assert.deepEqual(contagemDePoderes(ladino, 5, 2), { escolhidos: 2, total: 4, disponiveis: 2 });
  // Guerreiro: o Anexo A marca poder também no 1º nível (20 no 20º) — divergência relatada
  assert.equal(poderesConcedidosAteNivel(classePorId("guerreiro"), 20), 20);
  // Monge: Restrição de Equipamento (nível vazio no JSON) vem no 1º nível
  assert.ok(habilidadesAteNivel(classePorId("monge"), 1).some(h => h.id === "restricao-de-equipamento"));
});

test("3. PV/PM pela classe: Monge 5 com SAB +3 = 23 PM; Guerreiro 5 = 15 PM; Bárbaro 5 com CON +2 = 58 PV", async () => {
  const { derivarPersonagem } = await import("../module/derivar.mjs");
  const { sistemaCompleto } = await import("./simulacao.mjs");
  const comClasse = (id, atributos) => {
    const c = classePorId(id);
    return derivarPersonagem(sistemaCompleto({
      nivel: 5, atributos,
      classeConfig: {
        pvInicial: c.pv.inicial, pvPorNivel: c.pv.porNivel, pvAtributo: "CON",
        pmInicial: c.pm.inicial, pmPorNivel: c.pm.porNivel, pmAtributo: c.pm.atributo ?? null,
        pmAtributoSoNoPrimeiroNivel: !!c.pm.atributoSoNoPrimeiroNivel
      }
    }));
  };
  assert.equal(comClasse("monge", { SAB: { base: 3 } }).pm.max, 4 + 3 + 4 * 4);
  assert.equal(comClasse("guerreiro", {}).pm.max, 3 + 3 * 4);
  assert.equal(comClasse("barbaro", { CON: { base: 2 } }).pv.max, 24 + 6 * 4 + 2 * 5);
});

test("5. Validação de poderes: nível, atributo (inclui \"ou\"), poderes exigidos, caminho e ⚠ para o resto", async () => {
  const { validarPoder, gruposEscolhidos, atendeGrupo } = await import("../module/classes-dados.mjs");
  const patrulheiro = classePorId("patrulheiro");
  const rastreio = patrulheiro.poderes.find(p => p.id === "rastreio-infalivel");
  const base = { nivel: 5, atributos: { SAB: 0 }, treino: {}, tem: new Set(), grupos: [] };
  assert.equal(validarPoder(patrulheiro, rastreio, base).ok, false);
  assert.equal(validarPoder(patrulheiro, rastreio, { ...base, atributos: { SAB: 1 } }).ok, true);
  const guerreiro = classePorId("guerreiro");
  const avancar = guerreiro.poderes.find(p => p.id === "avancar-e-golpear");
  assert.equal(validarPoder(guerreiro, avancar, { ...base, atributos: { FOR: 0, DES: 1 } }).ok, true, "Força 1 ou Destreza 1");
  const golpeCruzado = guerreiro.poderes.find(p => p.id === "golpe-cruzado");
  const r = validarPoder(guerreiro, golpeCruzado, { ...base, nivel: 9 });
  assert.deepEqual(r.itens.map(i => i.estado), ["falta", "falta"]);
  assert.equal(validarPoder(guerreiro, golpeCruzado, { ...base, nivel: 10, tem: new Set(["ambidestria"]) }).ok, true);
  // Pré-requisito só informativo: ⚠
  const baluarte = guerreiro.poderes.find(p => p.prerequisito === "estar usando armadura pesada");
  assert.equal(validarPoder(guerreiro, baluarte, base).itens.at(-1).estado, "conferir");
  // Não repetível já escolhido
  const ambid = guerreiro.poderes.find(p => p.id === "ambidestria");
  assert.equal(validarPoder(guerreiro, ambid, { ...base, nivel: 6, tem: new Set(["par-de-laminas", "ambidestria"]) }).jaEscolhido, true);
  const aumento = guerreiro.poderes.find(p => p.id === "aumento-de-atributo");
  assert.equal(validarPoder(guerreiro, aumento, { ...base, tem: new Set(["aumento-de-atributo"]) }).jaEscolhido, false);
  // Caminhos do Monge e Senda do Samurai
  const monge = classePorId("monge");
  const astral = monge.poderes.find(p => p.requerGrupo === "Caminho Astral");
  assert.equal(validarPoder(monge, astral, base).visivel, false);
  const grupos = gruposEscolhidos(monge, { "caminho-do-monge": 2 });
  assert.deepEqual(grupos, ["Caminho Astral"]);
  assert.equal(validarPoder(monge, astral, { ...base, grupos }).visivel, true);
  assert.equal(atendeGrupo("Senda do Kyudo", gruposEscolhidos(classePorId("samurai"), { "senda-do-combatente": 2 })), true);
  assert.equal(atendeGrupo("Senda do Kyudo", gruposEscolhidos(classePorId("samurai"), { "senda-do-combatente": 0 })), false);
});
