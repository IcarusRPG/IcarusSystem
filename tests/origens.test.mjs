/** Origens, Poderes de Origem e Itens Comuns: dados, compêndios e regras puras. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ORIGENS, ITENS_COMUNS, documentosDeOrigens, itensDaOrigem, origemPorId, itemComumPorId, dadosDoItemComum, dadosDoPoderDeOrigem
} from "../module/origens-dados.mjs";
import { idEstavel } from "../module/dados-itens.mjs";
import { PERICIAS } from "../module/config.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("1. 25 origens, 25 poderes e 49 itens; cada origem soma 2 itens que existem; perícias válidas", () => {
  assert.equal(ORIGENS.length, 25);
  assert.equal(ITENS_COMUNS.length, 49);
  const chaves = new Set(PERICIAS.map(p => p.chave));
  for (const o of ORIGENS) {
    assert.equal(o.itens.fixos.length, 2, o.id);
    assert.deepEqual(o.itens.escolhas, [], `${o.id}: sem escolha entre itens`);
    assert.ok(chaves.has(o.pericia), o.pericia);
    for (const id of [...o.itens.fixos, ...o.itens.escolhas.flat()]) assert.ok(itemComumPorId(id), id);
  }
  assert.equal(origemPorId("musico").pericia, "atuacao");
  assert.deepEqual(itensDaOrigem(origemPorId("circense")), ["bolas-de-malabarismo", "traje-colorido"]);
  assert.deepEqual(itensDaOrigem(origemPorId("membro-de-guilda")), ["insignia-da-guilda", "balanca-de-bolso"]);
  // Os que deixaram de vir da origem continuam no catálogo
  assert.ok(itemComumPorId("corda-fina-de-equilibrio") && itemComumPorId("ferramentas-leves-de-oficio"));
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

test("2. Origem: +2 de bônus na perícia (Efeito Ativo em outros, fonte origem); soma com treino; todas têm periciaBonus 2", async () => {
  const { efeitoDeOrigem, ehEfeitoDeOrigem } = await import("../module/origens-dados.mjs");
  assert.ok(ORIGENS.every(o => o.periciaBonus === 2));
  const e = efeitoDeOrigem(origemPorId("curandeiro"));
  assert.deepEqual(e.changes, [{ key: "system.pericias.cura.outros", mode: 2, value: "2" }]);
  assert.equal(ehEfeitoDeOrigem(e), true);
  // O Efeito soma em "outros" antes do derivado: não treinado +2; treinado +2 +2 = +4
  const { derivarPersonagem } = await import("../module/derivar.mjs");
  const { sistemaCompleto } = await import("./simulacao.mjs");
  assert.equal(derivarPersonagem(sistemaCompleto({ pericias: { cura: { treino: 0, outros: 2 } } })).pericias.cura.total, 2);
  const treinado = derivarPersonagem(sistemaCompleto({ pericias: { cura: { treino: 1, outros: 2 } } })).pericias.cura;
  assert.equal(treinado.total, 4);
  assert.equal(treinado.treino, 1, "continua só treinado");
  const doc = documentosDeOrigens({}, idEstavel).origens.itens.find(o => o.system.origemId === "curandeiro");
  assert.equal(doc.system.periciaBonus, 2);
});

test("6. Migração: tirar a fonte origem do treinoPor (perícia só volta a 0 sem outra fonte)", async () => {
  const { semFonteOrigem } = await import("../module/origens-dados.mjs");
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

/* ---------- Derivado: bônus de itens, Limite de Vestimentas e carga ---------- */
const { derivarPersonagem } = await import("../module/derivar.mjs");
const { sistemaCompleto } = await import("./simulacao.mjs");
let seq = 0;
const comum = (id, extra = {}, flags = {}) => {
  const d = dadosDoItemComum(itemComumPorId(id));
  return { ...d, id: `x${++seq}`, flags: { "icarus-rpg": { ...d.flags["icarus-rpg"], ...flags } }, system: { ...d.system, ...extra } };
};
const deriva = itens => derivarPersonagem(sistemaCompleto({ atributos: { DES: { base: 2 } } }), itens);

test("5. Traje real vestido soma +1 Diplomacia (e some ao tirar); dois iguais não duplicam; tooltip com o nome", () => {
  assert.equal(deriva([comum("traje-real")]).pericias.diplomacia.total, 0, "não vestido");
  const s = deriva([comum("traje-real", { vestido: true })]);
  assert.equal(s.pericias.diplomacia.total, 1);
  assert.deepEqual(s.pericias.diplomacia.bonusItens, [{ valor: 1, origem: "Traje real" }]);
  assert.equal(deriva([comum("traje-real", { vestido: true }), comum("traje-real", { vestido: true })]).pericias.diplomacia.total, 1);
  // Itens diferentes somam: Traje real + Joia de família
  assert.equal(deriva([comum("traje-real", { vestido: true }), comum("joia-de-familia", { vestido: true })]).pericias.diplomacia.total, 2);
});

test("5. Livro raro: +1 na perícia escolhida sem estar vestido; sai do inventário, perde o bônus", () => {
  const livro = comum("livro-raro-de-estudo", {}, { escolhaBonus: "historia" });
  assert.equal(deriva([livro]).pericias.historia.total, 1);
  assert.equal(deriva([]).pericias.historia.total, 0);
  assert.equal(deriva([comum("livro-raro-de-estudo", { quantidade: 0 }, { escolhaBonus: "historia" })]).pericias.historia.total, 0);
});

test("6. Bônus condicionais não somam no total (ficam para a rolagem); elo com ataque desarmado é automático", async () => {
  const { condicionaisDaPericia, vestimentasAtivas } = await import("../module/origens-dados.mjs");
  const itens = [comum("luneta"), comum("traje-de-apresentacao", { vestido: true }), comum("traje-de-apresentacao")];
  const s = deriva(itens);
  assert.equal(s.pericias.visao.total, 0);
  assert.deepEqual(condicionaisDaPericia(itens, "visao").map(c => c.valor), [5]);
  assert.deepEqual(condicionaisDaPericia(itens, "atuacao").map(c => c.valor), [2], "só o vestido, uma vez");
  assert.deepEqual(condicionaisDaPericia([comum("traje-de-apresentacao")], "atuacao", vestimentasAtivas([]).ativas), [], "tirado: não aparece");
  const elo = deriva([comum("elo-de-corrente-quebrada", { vestido: true }, { escolhaBonus: "ataqueDesarmado" }), comum("bandagens-de-luta", { vestido: true })]);
  assert.deepEqual(elo.bonusDesarmado.map(b => b.valor), [1, 1], "elo e bandagens somam (itens diferentes)");
});

test("9. Limite de 5 vestimentas: a 6ª não vale (nem bônus, nem Defesa); escudo não conta", () => {
  const armadura = { id: "arm", name: "Couro", type: "equipamento", flags: { "icarus-rpg": { vestidoEm: 9e12 } }, system: { tipo: "armadura", categoria: "leve", equipado: true, bonusDefesa: 2, penalidade: 0, quantidade: 1, espacos: 2 } };
  const escudo = { id: "esc", name: "Escudo", type: "equipamento", flags: {}, system: { tipo: "escudo", categoria: "escudo", equipado: true, bonusDefesa: 1, penalidade: 0, quantidade: 1, espacos: 1 } };
  const cinco = ["capa-de-viagem", "manto-de-pele", "traje-elegante", "anel-de-sinete", "simbolo-sagrado"].map((id, n) => comum(id, { vestido: true }, { vestidoEm: n + 1 }));
  const s = deriva([...cinco, armadura, escudo]);
  assert.equal(s.vestimentas.vestidas, 6);
  assert.equal(s.vestimentas.excedido, true);
  assert.deepEqual(s.vestimentas.fora, ["arm"], "a última vestida fica fora");
  assert.equal(s.defesa.armadura, 0, "armadura fora do limite não dá Defesa");
  assert.equal(s.defesa.escudo, 1, "escudo não conta no limite");
  assert.equal(s.pericias.religiao.total, 1, "símbolo sagrado (5ª) vale");
  const s2 = deriva([...cinco.slice(0, 4), armadura]);
  assert.equal(s2.defesa.armadura, 2);
});

test("12. Carga: dois itens de 0,5 ocupam 1 espaço; frações no cálculo", () => {
  const s = deriva([comum("bussola"), comum("mapa-regional"), comum("capuz-escuro")]);
  assert.equal(s.carga.usado, 1.5);
  assert.equal(Math.ceil(s.carga.usado), 2);
});

test("7. Gazuas: abrir fechadura sem gazuas −5; com gazuas 0; 1 natural com gazuas quebra", async () => {
  const { resultadoDaFechadura, temGazuas } = await import("../module/origens-dados.mjs");
  assert.deepEqual(resultadoDaFechadura({ abrir: true, gazuas: false, natural: 1 }), { modificador: -5, quebra: false });
  assert.deepEqual(resultadoDaFechadura({ abrir: true, gazuas: true, natural: 7 }), { modificador: 0, quebra: false });
  assert.deepEqual(resultadoDaFechadura({ abrir: true, gazuas: true, natural: 1 }), { modificador: 0, quebra: true });
  assert.deepEqual(resultadoDaFechadura({ abrir: false, gazuas: false, natural: 1 }), { modificador: 0, quebra: false });
  assert.equal(temGazuas([comum("gazuas")]), true);
  assert.equal(temGazuas([comum("gazuas", { quantidade: 0 })]), false);
});

test("10. Poderes: uso limitado (cena/dia/cidade), CD 10 + metade do nível + CAR, Sorte de Marujo e Faro gastam 2 PM", async () => {
  const { calcularCD } = await import("../module/combate.mjs");
  const p = id => ORIGENS.find(o => o.poder.id === id).poder;
  assert.deepEqual(["passo-firme", "corpo-calejado", "contatos-do-submundo", "refugio-da-fe"].map(id => p(id).usoLimitado), ["cena", "dia", "cidade", "cidade"]);
  assert.deepEqual(["gracejo", "charme-fatal", "satira-cortante"].map(id => p(id).cdAtributo), ["CAR", "CAR", "CAR"]);
  assert.equal(p("sorte-de-marujo").custoPM, 2);
  assert.equal(p("faro-para-mentiras").custoPM, 2);
  assert.equal(calcularCD({ nivel: 5, atributos: { CAR: { total: 3 } } }, "CAR").cd, 15);
  const d = dadosDoPoderDeOrigem(origemPorId("bobo-da-corte"));
  assert.equal(d.flags["icarus-rpg"].id, "origem__gracejo", "gancho do Usar pelo id");
});
