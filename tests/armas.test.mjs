/**
 * Critérios de aceite do compêndio de armas (seção 9 do prompt), sem o Foundry.
 * No Foundry, o mesmo roteiro roda com os itens do compêndio: await game.icarus.verificarArmas()
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { formatarPreco, precoEmOuro, totalEmCentavos, debitar, creditar } from "../module/moeda.mjs";
import { calcularAtaque, calcularDano, ehAmeaca, planejarAtaque, planejarRecarga, alcanceDoModo, modosDeAtaque, avisoEmpunhadura } from "../module/combate.mjs";
import { documentosDosCompendios, dadosDaArma, dadosDaMunicao, idEstavel } from "../module/dados-itens.mjs";
import { derivarPersonagem } from "../module/derivar.mjs";
import { sistemaCompleto } from "./simulacao.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DADOS = JSON.parse(fs.readFileSync(path.join(RAIZ, "tools", "dados", "armas.json"), "utf8"));
const arma = id => dadosDaArma(DADOS.armas.find(a => a.id === id));
const municao = (id, quantidade = 20) => {
  const d = dadosDaMunicao(DADOS.municoes.find(m => m.id === id));
  d.system.quantidade = quantidade;
  return d;
};
/** Personagem de teste: FOR +1, DES +4, Luta e Pontaria Treinadas. */
const personagem = (itens = [], extra = {}) => derivarPersonagem(sistemaCompleto({
  nivel: 1,
  atributos: { FOR: { base: 1 }, DES: { base: 4 } },
  pericias: { luta: { treino: 1 }, pontaria: { treino: 1 } },
  ...extra
}), itens);
/** Item com id, como o Foundry entrega. */
let n = 0;
const comId = d => ({ ...d, id: `i${++n}` });

test("1. Dados: 46 armas em 4 categorias, 4 munições, todas com ícone e todos os arquivos existem", () => {
  const docs = documentosDosCompendios(DADOS);
  assert.equal(docs.armas.itens.length, 46);
  assert.equal(docs.armas.pastas.length, 4);
  assert.equal(docs.municoes.itens.length, 4);
  const porCategoria = c => DADOS.armas.filter(a => a.categoria === c).length;
  assert.deepEqual([porCategoria("simples"), porCategoria("marcial"), porCategoria("exotica"), porCategoria("fogo")], [12, 20, 10, 4]);
  assert.deepEqual(DADOS.armas.filter(a => !a.icone).map(a => a.nome), []);
  const faltando = [
    ...DADOS.armas.filter(a => a.icone && !fs.existsSync(path.join(RAIZ, "img/Icones/itens/equipamentos/armas", a.icone))).map(a => a.icone),
    ...DADOS.municoes.filter(m => !fs.existsSync(path.join(RAIZ, "img/Icones/itens/equipamentos/munições", m.icone))).map(m => m.icone)
  ];
  assert.deepEqual(faltando, []);
  // Cada arma está na pasta da sua categoria
  for (const item of docs.armas.itens) assert.equal(item.folder, idEstavel(`pasta:${item.system.categoria}`));
});

test("2. Florete (Ágil): ataque +6, dano 1d6+1, ameaça no 18 e crítico (1d6+1)×2", () => {
  const s = personagem();
  const f = arma("florete").system;
  assert.equal(calcularAtaque(s, f, "corpo-a-corpo").bonus, 6);
  assert.equal(calcularAtaque(s, f, "corpo-a-corpo").agil, true);
  assert.equal(calcularDano(s, f, "corpo-a-corpo").formula, "1d6 + 1");
  assert.equal(ehAmeaca(18, f), true);
  assert.equal(ehAmeaca(17, f), false);
  assert.equal(calcularDano(s, f, "corpo-a-corpo", { critico: true }).formula, "(1d6 + 1) * 2");
});

test("3. Espada longa (não Ágil): +3; com Luta destreinada, +1", () => {
  const e = arma("espada-longa").system;
  assert.equal(calcularAtaque(personagem(), e, "corpo-a-corpo").bonus, 3);
  assert.equal(calcularAtaque(personagem([], { pericias: { luta: { treino: 0 }, pontaria: { treino: 1 } } }), e, "corpo-a-corpo").bonus, 1);
});

test("4. Arco curto: Pontaria +6, gasta 1 flecha por ataque, dano 1d6 sem atributo; sem flechas bloqueia", () => {
  const arco = comId(arma("arco-curto"));
  const flechas = comId(municao("flechas", 20));
  assert.equal(calcularAtaque(personagem(), arco.system, "distancia").bonus, 6);
  const plano = planejarAtaque([arco, flechas], arco, "distancia");
  assert.equal(plano.ok, true);
  assert.deepEqual(plano.gastos, [{ itemId: flechas.id, campo: "system.quantidade", valor: 19 }]);
  assert.equal(calcularDano(personagem(), arco.system, "distancia").formula, "1d6");
  flechas.system.quantidade = 0;
  assert.equal(planejarAtaque([arco, flechas], arco, "distancia").motivo, "semMunicao");
  assert.equal(planejarAtaque([arco], arco, "distancia").motivo, "semMunicao");
});

test("5. Pistola: 1 disparo, depois bloqueia, recarga volta a 1; Cano duplo: 2 disparos e recarga até 2", () => {
  const pistola = comId(arma("pistola"));
  const balas = comId(municao("balas", 20));
  assert.equal(pistola.system.carregados, 1);
  const p1 = planejarAtaque([pistola, balas], pistola, "fogo");
  assert.deepEqual(p1.gastos.map(g => g.valor), [0, 19]);
  pistola.system.carregados = 0;
  assert.equal(planejarAtaque([pistola, balas], pistola, "fogo").motivo, "descarregada");
  assert.equal(planejarRecarga([pistola, balas], pistola.system), 1);
  balas.system.quantidade = 0;
  assert.equal(planejarRecarga([pistola, balas], pistola.system), null);

  const duplo = comId(arma("mosquete-de-cano-duplo"));
  const balas2 = comId(municao("balas", 20));
  assert.equal(duplo.system.carregados, 2);
  duplo.system.carregados = 1;
  assert.equal(planejarAtaque([duplo, balas2], duplo, "fogo").ok, true);
  duplo.system.carregados = 0;
  assert.equal(planejarAtaque([duplo, balas2], duplo, "fogo").ok, false);
  assert.equal(planejarRecarga([duplo, balas2], duplo.system), 2);
  balas2.system.quantidade = 1;
  assert.equal(planejarRecarga([duplo, balas2], duplo.system), 1);
});

test("6. Adaga arremessada: Pontaria, alcance Curto, quantidade 1 → 0; Azagaia tem alcance Médio", () => {
  const adaga = comId(arma("adaga"));
  assert.deepEqual(modosDeAtaque(adaga.system), ["corpo-a-corpo", "arremesso"]);
  assert.equal(calcularAtaque(personagem(), adaga.system, "arremesso").pericia, "pontaria");
  assert.equal(alcanceDoModo(adaga.system, "arremesso"), "curto");
  assert.deepEqual(planejarAtaque([adaga], adaga, "arremesso").gastos, [{ itemId: adaga.id, campo: "system.quantidade", valor: 0 }]);
  assert.deepEqual(planejarAtaque([adaga], adaga, "arremesso", { consumirArremesso: false }).gastos, []);
  adaga.system.quantidade = 0;
  assert.equal(planejarAtaque([adaga], adaga, "corpo-a-corpo").motivo, "semArma");
  // Chakram: corpo a corpo (Luta, com Ágil) e arremesso (Pontaria, alcance Curto); arremessado não volta
  const chakram = comId(arma("chakram"));
  assert.deepEqual(modosDeAtaque(chakram.system), ["corpo-a-corpo", "arremesso"]);
  assert.equal(calcularAtaque(personagem(), chakram.system, "corpo-a-corpo").bonus, 6);
  assert.equal(calcularAtaque(personagem(), chakram.system, "arremesso").pericia, "pontaria");
  assert.equal(alcanceDoModo(chakram.system, "arremesso"), "curto");
  assert.equal(planejarAtaque([chakram], chakram, "arremesso").gastos[0].valor, 0);
  const azagaia = arma("azagaia").system;
  assert.deepEqual(modosDeAtaque(azagaia), ["arremesso"]);
  assert.equal(alcanceDoModo(azagaia, "arremesso"), "medio");
  // Arremesso soma FOR no dano; arco não
  assert.equal(calcularDano(personagem(), adaga.system, "arremesso").formula, "1d4 + 1");
});

test("7. Carga com FOR +1: Adaga + Mosquete + 40 Balas = 5 / 12; acima da capacidade é excedida", () => {
  const s = personagem([arma("adaga"), arma("mosquete"), municao("balas", 40)]);
  assert.equal(s.carga.capacidade, 12);
  assert.equal(s.carga.usado, 5);
  assert.equal(s.carga.excedida, false);
  assert.equal(personagem([municao("balas", 0)]).carga.usado, 0);
  const pesado = personagem(Array.from({ length: 7 }, () => arma("mosquete")));
  assert.equal(pesado.carga.usado, 14);
  assert.equal(pesado.carga.excedida, true);
});

test("8. Preço e moedas: formatos, dica em Ouro Real e débito quebrando moedas só quando preciso", () => {
  assert.equal(formatarPreco(DADOS.municoes.find(m => m.id === "pedras").precoPacote), "50 Centavos");
  assert.equal(formatarPreco(arma("mosquete").system.preco), "R$ 500");
  assert.equal(formatarPreco(arma("mosquete-de-cano-duplo").system.preco), "R$ 900");
  assert.equal(precoEmOuro(arma("mosquete-de-cano-duplo").system.preco), "0,9 Ouro Real");
  assert.equal(formatarPreco(0), "—");
  assert.equal(formatarPreco(150000), "R$ 1.500");
  assert.equal(formatarPreco(1250), "R$ 12,50");
  assert.equal(precoEmOuro(150000), "1,5 Ouro Real");

  const r300 = { ouroReal: 0, real: 300, centavo: 0 };
  assert.deepEqual(debitar(r300, arma("adaga").system.preco), { ouroReal: 0, real: 295, centavo: 0 });
  assert.equal(debitar(r300, arma("mosquete").system.preco), null);
  assert.deepEqual(debitar({ ouroReal: 1, real: 0, centavo: 0 }, 500), { ouroReal: 0, real: 995, centavo: 0 });
  assert.deepEqual(debitar({ ouroReal: 0, real: 1, centavo: 0 }, 50), { ouroReal: 0, real: 0, centavo: 50 });
  assert.deepEqual(debitar({ ouroReal: 2, real: 10, centavo: 30 }, 1050), { ouroReal: 1, real: 999, centavo: 80 });
  assert.equal(totalEmCentavos({ ouroReal: 1, real: 2, centavo: 3 }), 100203);
  assert.deepEqual(creditar({ ouroReal: 0, real: 1, centavo: 90 }, 120), { ouroReal: 0, real: 3, centavo: 10 });
});

test("9. Idempotência: os mesmos dados geram exatamente os mesmos documentos e _id", () => {
  const a = JSON.stringify(documentosDosCompendios(DADOS));
  const b = JSON.stringify(documentosDosCompendios(structuredClone(DADOS)));
  assert.equal(a, b);
  const docs = documentosDosCompendios(DADOS);
  const ids = [...docs.armas.pastas, ...docs.armas.itens, ...docs.municoes.itens].map(d => d._id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every(id => /^[a-zA-Z0-9]{16}$/.test(id)));
});

test("Dano de duas mãos e outra extremidade; bloco Ataques avisa empunhadura estranha", () => {
  const s = personagem();
  assert.equal(calcularDano(s, arma("katana").system, "corpo-a-corpo").dado, "1d8");
  assert.equal(calcularDano(s, arma("katana").system, "corpo-a-corpo", { duasMaos: true }).dado, "1d10");
  assert.equal(calcularDano(s, arma("bordao").system, "corpo-a-corpo", { duasMaos: true }).dado, "1d6");
  assert.equal(calcularDano(s, arma("corrente-de-espinhos").system, "corpo-a-corpo", { outraExtremidade: true }).dado, "2d4");
  assert.equal(avisoEmpunhadura([arma("adaga").system, arma("espada-curta").system]), "");
  assert.equal(avisoEmpunhadura([arma("adaga").system, arma("adaga").system, arma("adaga").system]), "maisDeDuas");
  assert.equal(avisoEmpunhadura([arma("montante").system, arma("adaga").system]), "duasMaosComOutra");
});

test("Proficiência: automática só nas armas simples", () => {
  assert.equal(calcularAtaque(personagem(), arma("adaga").system, "corpo-a-corpo").proficiente, true);
  assert.equal(calcularAtaque(personagem(), arma("katana").system, "corpo-a-corpo").proficiente, false);
  const katana = { ...arma("katana").system, proficiencia: "sim" };
  assert.equal(calcularAtaque(personagem(), katana, "corpo-a-corpo").proficiente, true);
});
