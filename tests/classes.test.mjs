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

test("6. Aumento de Atributo: uma vez por patamar por atributo; +1 no total sem mexer na Base", async () => {
  const { podeAumentarAtributo, patamarDe } = await import("../module/classes-dados.mjs");
  const { derivarPersonagem } = await import("../module/derivar.mjs");
  const { sistemaCompleto } = await import("./simulacao.mjs");
  assert.deepEqual([1, 4, 5, 10, 11, 16, 17, 20, 21, 25].map(patamarDe),
    ["iniciante", "iniciante", "veterano", "veterano", "campeao", "campeao", "lenda", "lenda", "paragon", "paragon"]);
  const existentes = [{ atributo: "DES", patamar: "iniciante" }];
  assert.equal(podeAumentarAtributo(existentes, "DES", "iniciante"), false);
  assert.equal(podeAumentarAtributo(existentes, "DES", "veterano"), true);
  assert.equal(podeAumentarAtributo(existentes, "FOR", "iniciante"), true);
  const aumento = (atributo, patamar) => ({ type: "poder", system: {}, flags: { "icarus-rpg": { aumentoAtributo: { atributo, patamar } } } });
  const s = derivarPersonagem(sistemaCompleto({ atributos: { DES: { base: 2 } } }), [aumento("DES", "iniciante"), aumento("DES", "veterano")]);
  assert.equal(s.atributos.DES.total, 4);
  assert.equal(s.atributos.DES.base, 2);
  assert.equal(s.pericias.acrobacia.total, 4, "a perícia usa o total do atributo");
});

test("7. Perícia Especializada / Perícia Refinada: treinada vira especialista (+4); removendo, volta", async () => {
  const { derivarPersonagem } = await import("../module/derivar.mjs");
  const { sistemaCompleto } = await import("./simulacao.mjs");
  const especializada = { type: "poder", system: {}, flags: { "icarus-rpg": { periciaEspecializada: { pericia: "luta" } } } };
  const refinada = { type: "poder", system: {}, flags: { "icarus-rpg": { periciaRefinada: ["furtividade", "atletismo"] } } };
  const base = { pericias: { luta: { treino: 1 }, furtividade: { treino: 1 } } };
  const com = derivarPersonagem(sistemaCompleto(base), [especializada, refinada]);
  assert.equal(com.pericias.luta.treino, 2);
  assert.equal(com.pericias.luta.total, 4);
  assert.equal(com.pericias.furtividade.treino, 2);
  assert.equal(com.pericias.atletismo.treino, 0, "destreinada não vira especialista");
  const sem = derivarPersonagem(sistemaCompleto(base), []);
  assert.equal(sem.pericias.luta.treino, 1);
  // Perícia Especializada exige 10º nível
  const pe = classePorId("ladino").poderes.find(p => p.id === "pericia-especializada");
  assert.equal(pe.nivelMinimo, 10);
});

test("8/9. Túnica não é armadura: Monge mantém Defesa Interior e Passo Ligeiro; Pele Rija exige sem túnica", async () => {
  const { derivarPersonagem } = await import("../module/derivar.mjs");
  const { sistemaCompleto } = await import("./simulacao.mjs");
  const { dadosDaArmadura } = await import("../module/dados-compendios.mjs");
  const ler = n => JSON.parse(fs.readFileSync(path.join(RAIZ, "tools", "dados", `${n}.json`), "utf8"));
  const ARM = ler("armaduras"), ICA = ler("icones-armaduras");
  const vestir = id => { const d = dadosDaArmadura(ARM.itens.find(a => a.id === id), ICA); d.system.equipado = true; return d; };
  const hab = (classe, id) => ({ type: "poder", system: {}, flags: { "icarus-rpg": { id: `${classe}__${id}` } } });
  const monge = itens => derivarPersonagem(sistemaCompleto({ atributos: { SAB: { base: 3 } }, deslocamento: 9 }), [hab("monge", "defesa-interior"), hab("monge", "passo-ligeiro"), ...itens]);
  assert.equal(monge([]).defesa.total, 10 + 3);
  assert.equal(monge([]).deslocamento, 12);
  const comTunica = monge([vestir("tunica-bordada")]);
  assert.equal(comTunica.defesa.total, 10 + 2 + 3, "túnica soma com a Defesa Interior");
  assert.equal(comTunica.deslocamento, 12);
  const comArmadura = monge([vestir("couro-batido")]);
  assert.equal(comArmadura.defesa.total, 10 + 2);
  assert.equal(comArmadura.deslocamento, 9);
  assert.equal(monge([vestir("escudo-leve")]).defesa.total, 10 + 1, "escudo tira a Defesa Interior");
  const barbaro = itens => derivarPersonagem(sistemaCompleto({}), [hab("barbaro", "pele-rija"), ...itens]);
  assert.equal(barbaro([]).defesa.total, 12);
  assert.equal(barbaro([vestir("couro-batido")]).defesa.total, 10 + 2 + 2);
  assert.equal(barbaro([vestir("cota-de-malha")]).defesa.total, 10 + 5);
  assert.equal(barbaro([vestir("tunica-simples")]).defesa.total, 10 + 1, "Pele Rija não vale com túnica");
});

test("10. Perícia Infalível: d20 < 10 conta como 10 nas 7 perícias", async () => {
  const { minimoD20DeHabilidades, PERICIAS_INFALIVEIS, dadosPorNivel } = await import("../module/classes-dados.mjs");
  const itens = [{ flags: { "icarus-rpg": { id: "ladino__pericia-infalivel" } } }];
  assert.deepEqual(PERICIAS_INFALIVEIS, ["acrobacia", "furtividade", "investigacao", "prestidigitacao", "audicao", "visao", "reflexos"]);
  assert.equal(minimoD20DeHabilidades(itens, "reflexos"), 10);
  assert.equal(minimoD20DeHabilidades(itens, "luta"), null);
  assert.equal(minimoD20DeHabilidades([], "reflexos"), null);
  // Ataque Furtivo / Marca da Presa: +1 dado a cada 4 níveis
  assert.deepEqual([1, 4, 5, 9, 13, 17, 20].map(dadosPorNivel), [1, 1, 2, 3, 4, 5, 5]);
});

test("9. Fúria do Bárbaro: bônus pelo nível conforme o texto (1º, 9º, 17º)", async () => {
  const texto = classePorId("barbaro").habilidades.find(h => h.id === "furia").descricao;
  assert.match(texto, /\+2 nas rolagens de dano corpo a corpo e \+1 nos testes de ataque/);
  assert.match(texto, /No 9º nível, o bônus passa a \+3 no dano e \+2 no ataque; no 17º nível, a \+4 no dano e \+3 no ataque/);
  const furia = classePorId("barbaro").habilidades.find(h => h.id === "furia");
  assert.deepEqual([furia.custoPM, furia.acao], [2, "livre"]);
});

test("Duas armas por poder: Duas Armas do Ladino tira a penalidade; Mão Habilidosa devolve o atributo", async () => {
  const { flagsDeDuasArmas } = await import("../module/classes-dados.mjs");
  const it = id => ({ flags: { "icarus-rpg": { id } } });
  assert.deepEqual(flagsDeDuasArmas([it("ladino__duas-armas")]), { duasArmas: "sem-penalidade" });
  assert.deepEqual(flagsDeDuasArmas([it("ladino__duas-armas"), it("ladino__mao-habilidosa")]), { duasArmas: "sem-penalidade", duasArmasAtributoNoSegundo: true });
  assert.deepEqual(flagsDeDuasArmas([]), {});
});

test("11. Vínculo Selvagem: PV = 10 + metade do nível; Defesa = 10 + DES + bônus; dano + metade do nível", async () => {
  const { estatisticasDoVinculo } = await import("../module/classes-dados.mjs");
  const vinculos = JSON.parse(fs.readFileSync(path.join(RAIZ, "tools", "dados", "vinculos.json"), "utf8"));
  assert.equal(vinculos.animais.length, 6);
  const subs = classePorId("patrulheiro").habilidades.find(h => h.id === "vinculo-selvagem").subs.map(s => s.nome);
  assert.deepEqual(vinculos.animais.map(a => a.nome), subs, "mesmos animais e ordem do Anexo A");
  const lobo = vinculos.animais.find(a => a.id === "lobo");
  const e = estatisticasDoVinculo(lobo, { nivel: 7, DES: 3, ataque: 6, fortitude: 2, reflexos: 5, vontade: 1 });
  assert.equal(e.pv, 10 + 3);
  assert.equal(e.defesaOutros, 3 + 2);
  assert.deepEqual([e.ataques[0].bonusAtaque, e.ataques[0].bonusDano], [6, 3]);
  const teixugo = estatisticasDoVinculo(vinculos.animais.find(a => a.id === "teixugo-gigante"), { nivel: 4, DES: 1, ataque: 2 });
  assert.deepEqual(teixugo.ataques.map(a => a.bonusDano), [2, 0], "só a mordida soma a metade do nível");
  assert.equal(estatisticasDoVinculo(vinculos.animais.find(a => a.id === "urso-negro"), { nivel: 1 }).rd, 2);
});

test("12. Pistoleiro: máximo do Tiro Carregado; Mestre da Recarga exige Duas Pistolas e 11º nível", async () => {
  const { maximoTiroCarregado, bonusDaFuria } = await import("../module/classes-dados.mjs");
  assert.deepEqual([1, 8, 9, 16, 17, 20].map(n => bonusDaFuria(n).dano), [2, 2, 3, 3, 4, 4]);
  const texto = classePorId("pistoleiro").habilidades.find(h => h.id === "tiro-carregado").descricao;
  assert.match(texto, /1 no 1º nível, 2 no 5º, 3 no 10º, 4 no 15º e 5 no 20º/);
  assert.deepEqual([1, 4, 5, 10, 15, 20].map(n => maximoTiroCarregado(n)), [1, 1, 2, 3, 4, 5]);
  assert.equal(maximoTiroCarregado(10, { calibrePesado: true, mosquete: true }), 5);
  assert.equal(maximoTiroCarregado(10, { calibrePesado: true, mosquete: false }), 3);
  const { validarPoder } = await import("../module/classes-dados.mjs");
  const pist = classePorId("pistoleiro");
  const mestre = pist.poderes.find(p => p.id === "mestre-da-recarga");
  const base = { atributos: {}, treino: {}, grupos: [] };
  assert.equal(validarPoder(pist, mestre, { ...base, nivel: 11, tem: new Set() }).ok, false);
  assert.equal(validarPoder(pist, mestre, { ...base, nivel: 10, tem: new Set(["duas-pistolas"]) }).ok, false);
  assert.equal(validarPoder(pist, mestre, { ...base, nivel: 11, tem: new Set(["duas-pistolas"]) }).ok, true);
});

test("Samurai: Kiai pelo texto (1 dado no 1º, 2 no 5º, 3 no 9º, 4 no 13º, 5 no 17º)", () => {
  const kiai = classePorId("samurai").habilidades.find(h => h.id === "kiai");
  assert.match(kiai.descricao, /aumenta para 2 no 5º nível, 3 no 9º, 4 no 13º e 5 no 17º/);
  assert.deepEqual([kiai.custoPM], [2]);
});
