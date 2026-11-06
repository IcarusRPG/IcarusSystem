/** Botões de dano e cura do chat: regras puras (module/dano-aplicacao.mjs). */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  valorDoBotao, componentesDoBotao, danoPorComponentes, calcularAplicacao, validarPedido,
  dadosDaMensagem, botoesDaBarra, ultimaDesfazivel, textoDoRegistro, LIMITE_VALOR
} from "../module/dano-aplicacao.mjs";
import { calcularDanoRecebido } from "../module/combate.mjs";

const res = (extra = {}) => ({ rdGeral: 0, reducao: {}, imunidade: {}, vulnerabilidade: {}, ...extra });
const nome = t => ({ corte: "Corte", eletrico: "Elétrico", impacto: "Impacto", fogo: "Fogo", dano: "Dano" }[t] ?? t);

test("Valor do botão: metade arredonda para baixo; dobro; cura", () => {
  assert.equal(valorDoBotao(14, "dano"), 14);
  assert.equal(valorDoBotao(15, "metade"), 7);
  assert.equal(valorDoBotao(14, "dobro"), 28);
  assert.equal(valorDoBotao(14, "cura"), 14);
  assert.equal(valorDoBotao(-3, "dano"), 0);
});

test("Metade com vários tipos: soma bate com a metade do total", () => {
  const c = componentesDoBotao([{ tipo: "eletrico", valor: 7 }, { tipo: "impacto", valor: 7 }], "metade");
  assert.deepEqual(c.map(x => x.valor), [4, 3]);
  assert.equal(c.reduce((s, x) => s + x.valor, 0), 7);
});

test("Um tipo: mesmo resultado de calcularDanoRecebido (com vulnerabilidade, redução e RD)", () => {
  const r = res({ rdGeral: 3, reducao: { fogo: 2 }, vulnerabilidade: { fogo: true } });
  for (const v of [0, 1, 5, 12, 40]) {
    assert.equal(danoPorComponentes(r, [{ tipo: "fogo", valor: v }]).final, calcularDanoRecebido(r, v, "fogo").final);
  }
});

test("Aplicar dano: 14 de corte, RD 3 → −11, texto com o cálculo", () => {
  const a = calcularAplicacao({ acao: "dano", componentes: [{ tipo: "corte", valor: 14 }], resistencias: res({ rdGeral: 3 }), pv: { value: 30, max: 30 }, nomeDoTipo: nome });
  assert.equal(a.final, 11);
  assert.equal(a.depois, 19);
  assert.equal(a.detalhe, "14 Corte → RD 3 → 11");
});

test("Metade divide antes da RD", () => {
  const a = calcularAplicacao({ acao: "metade", componentes: [{ tipo: "corte", valor: 15 }], resistencias: res({ rdGeral: 3 }), pv: { value: 30, max: 30 }, nomeDoTipo: nome });
  assert.equal(a.final, 4);
  assert.match(a.detalhe, /^15 ÷ 2 = 7 → 7 Corte → RD 3 → 4$/);
});

test("Dois tipos: resistências por tipo e RD geral uma vez só", () => {
  const a = calcularAplicacao({
    acao: "dano", componentes: [{ tipo: "eletrico", valor: 20 }, { tipo: "impacto", valor: 18 }],
    resistencias: res({ rdGeral: 3, imunidade: { eletrico: true }, reducao: { impacto: 2 } }), pv: { value: 40, max: 40 }, nomeDoTipo: nome
  });
  assert.equal(a.final, 13); // 0 + (18 − 2) − 3
  assert.equal(a.partes.length, 2);
  assert.match(a.detalhe, /imune → 0/);
  assert.match(a.detalhe, /= 16 → RD 3 → 13$/);
});

test("Dano mínimo 0 e PV mínimo 0", () => {
  const a = calcularAplicacao({ acao: "dano", componentes: [{ tipo: "corte", valor: 2 }], resistencias: res({ rdGeral: 5 }), pv: { value: 10, max: 10 } });
  assert.equal(a.final, 0);
  const b = calcularAplicacao({ acao: "dano", componentes: [{ tipo: "corte", valor: 50 }], resistencias: res(), pv: { value: 10, max: 10 } });
  assert.equal(b.depois, 0);
});

test("Cura não passa do máximo e ignora RD; perda ignora resistências", () => {
  const c = calcularAplicacao({ acao: "cura", componentes: [{ tipo: "dano", valor: 14 }], resistencias: res({ rdGeral: 9 }), pv: { value: 20, max: 25 } });
  assert.equal(c.depois, 25);
  assert.equal(c.final, 5);
  const p = calcularAplicacao({ acao: "perda", componentes: [{ tipo: "fogo", valor: 6 }], resistencias: res({ rdGeral: 9, imunidade: { fogo: true } }), pv: { value: 20, max: 25 } });
  assert.equal(p.depois, 14);
});

test("Pedido do socket: só botão, mensagem e uuids de token; valores absurdos não passam", () => {
  const ok = validarPedido({ botao: "dano", mensagemId: "abc123", alvos: ["Scene.s1.Token.t1"], origem: "alvos" });
  assert.deepEqual(ok, { botao: "dano", mensagemId: "abc123", alvos: ["Scene.s1.Token.t1"], origem: "alvos" });
  assert.equal(validarPedido({ botao: "explodir", mensagemId: "abc", alvos: ["Scene.s.Token.t"] }), null);
  assert.equal(validarPedido({ botao: "dano", mensagemId: "a b", alvos: ["Scene.s.Token.t"] }), null);
  assert.equal(validarPedido({ botao: "dano", mensagemId: "abc", alvos: ["Actor.x"] }), null);
  assert.equal(validarPedido({ botao: "dano", mensagemId: "abc", alvos: [] }), null);
  assert.equal(validarPedido({ botao: "dano", mensagemId: "abc", alvos: Array(51).fill("Scene.s.Token.t") }), null);
  assert.equal(validarPedido(null), null);
});

test("Dados da mensagem: flags novas, antigas, rolagem manual e limite", () => {
  const nova = dadosDaMensagem({ dano: { rollType: "dano", total: 12, componentes: [{ tipo: "eletrico", valor: 6 }, { tipo: "impacto", valor: 6 }] } });
  assert.equal(nova.componentes.length, 2);
  const antiga = dadosDaMensagem({ dano: { total: 9, tipo: "fogo" } });
  assert.deepEqual(antiga.componentes, [{ tipo: "fogo", valor: 9 }]);
  assert.equal(dadosDaMensagem({ dano: { total: 3, tipo: "dano", perda: true } }).rollType, "perda");
  assert.equal(dadosDaMensagem({ dano: { rollType: "cura", total: 8 } }).rollType, "cura");
  assert.equal(dadosDaMensagem({}, [{ total: 7 }]), null);
  assert.equal(dadosDaMensagem({}, [{ total: 7 }], { qualquerRolagem: true }).total, 7);
  assert.equal(dadosDaMensagem({ dano: { total: LIMITE_VALOR + 1 } }), null);
  assert.equal(dadosDaMensagem({ dano: { total: Infinity } }), null);
});

test("Botões da barra por tipo de rolagem", () => {
  assert.deepEqual(botoesDaBarra("dano"), ["dano", "metade", "cura", "perda"]);
  assert.deepEqual(botoesDaBarra("dano", { dobro: true }), ["dano", "metade", "dobro", "cura", "perda"]);
  assert.deepEqual(botoesDaBarra("cura"), ["cura"]);
  assert.deepEqual(botoesDaBarra("perda"), ["perda", "cura"]);
});

test("Registro: última desfazível e texto", () => {
  const lista = [{ alvo: "A", antes: 10, depois: 4 }, { alvo: "B", antes: 3, depois: 8, desfeita: true }];
  assert.equal(ultimaDesfazivel(lista), 0);
  assert.equal(ultimaDesfazivel([{ desfeita: true }]), -1);
  assert.equal(textoDoRegistro(lista[0]), "A (−6)");
  assert.equal(textoDoRegistro(lista[1]), "B (+5)");
});
