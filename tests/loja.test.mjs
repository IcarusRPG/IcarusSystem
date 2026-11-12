/** Loja do Mercador: preço, validação, empilhamento, estoque, caixa, venda e o pedido pelo socket. */
import { test } from "node:test";
import assert from "node:assert/strict";

const avisos = [];
const emitidos = [];
const chat = [];
globalThis.foundry = { utils: { deepClone: o => structuredClone(o) }, applications: { api: { DialogV2: {}, ApplicationV2: class {}, HandlebarsApplicationMixin: c => c } } };
globalThis.Handlebars = { escapeExpression: t => String(t ?? "") };
globalThis.Hooks = { on() {}, once() {} };
globalThis.ui = { notifications: { warn: m => avisos.push(["warn", m]), info: m => avisos.push(["info", m]) } };
globalThis.ChatMessage = { create: async d => { chat.push(d); return d; }, getSpeaker: () => ({}) };
const usuarios = new Map();
globalThis.game = {
  user: { id: "jog", isGM: false }, socket: { emit: (c, m) => emitidos.push(m), on() {} },
  users: Object.assign([], { get: id => usuarios.get(id), activeGM: null, filter: f => [...usuarios.values()].filter(f) }),
  settings: { get: () => "publico" }, i18n: { localize: k => k, format: (k, d) => `${k} ${JSON.stringify(d ?? {})}` }
};
const documentos = new Map();
globalThis.fromUuidSync = uuid => documentos.get(uuid) ?? null;

const L = await import("../module/loja.mjs");
const { debitar, podePagar, totalEmCentavos } = await import("../module/moeda.mjs");
const { executar, pedirNaLoja, aoReceberLoja, textoDoMotivo } = await import("../module/loja-foundry.mjs");

const F = "icarus-rpg";
const item = (extra = {}, loja = {}) => ({ type: "equipamento", name: "Saco de ervas", system: { tipo: "item-comum", preco: 500, quantidade: 1, ...extra },
  flags: { [F]: { id: "saco-de-ervas", loja: { venda: true, quantidade: 3, precoBase: null, oculto: false, ...loja } } } });
const mercador = (loja = {}, extra = {}) => ({ loja: { aberta: true, multiplicadorPreco: 1, compra: { ativo: false, percentual: 0.5 }, ...loja }, caixa: { ouroReal: 0, real: 0, centavo: 0 }, caixaInfinita: true, ...extra });
const moedas = (real = 0, centavo = 0, ouroReal = 0) => ({ moedas: { ouroReal, real, centavo } });

test("Preço: base do item ou da loja × multiplicador × quantidade, arredondado em centavos; munição por pacote", () => {
  assert.equal(L.precoTotal(item(), 2, 1), 1000);
  assert.equal(L.precoTotal(item(), 1, 1.25), 625);
  assert.equal(L.precoTotal(item({ preco: 333 }), 3, 1.1), 1099, "333 × 1,1 × 3 = 1098,9 → 1099");
  assert.equal(L.precoTotal(item({}, { precoBase: 800 }), 1, 1), 800, "preço da loja sobrescreve");
  assert.equal(L.precoUnitario({ type: "municao", system: { precoPacote: 100 }, flags: {} }), 100);
  assert.equal(podePagar({ real: 5 }, 500), true);
  assert.equal(podePagar({ real: 4, centavo: 99 }, 500), false);
});

test("Compra válida: débito com troco em moedas, estoque diminui, caixa infinita não muda", () => {
  const r = L.validarCompra(mercador(), item(), 2, moedas(0, 0, 1));
  assert.equal(r.ok, true);
  assert.equal(r.total, 1000);
  assert.deepEqual(r.moedas, { ouroReal: 0, real: 990, centavo: 0 }, "1 Ouro Real − R$ 10 = R$ 990");
  assert.equal(r.estoque, 1);
  assert.equal(r.caixa, null);
  assert.deepEqual(r.moedas, debitar({ ouroReal: 1, real: 0, centavo: 0 }, 1000));
});

test("Estoque infinito não muda; caixa do mercador recebe quando não é infinita", () => {
  const r = L.validarCompra(mercador({}, { caixaInfinita: false, caixa: { ouroReal: 0, real: 1, centavo: 50 } }), item({}, { quantidade: null }), 4, moedas(50));
  assert.equal(r.ok, true);
  assert.equal(r.estoque, null);
  assert.equal(totalEmCentavos(r.caixa), 150 + 2000);
});

test("Recusas: loja fechada, oculto, esgotado, sem estoque, quantidade inválida, sem dinheiro, sem preço, sem permissão", () => {
  const motivo = (...a) => L.validarCompra(...a).motivo;
  assert.equal(motivo(mercador({ aberta: false }), item(), 1, moedas(50)), "lojaFechada");
  assert.equal(motivo(mercador(), item({}, { oculto: true }), 1, moedas(50)), "itemInvalido");
  assert.equal(motivo(mercador(), item({}, { quantidade: 0 }), 1, moedas(50)), "esgotado");
  assert.equal(motivo(mercador(), item(), 4, moedas(50)), "semEstoque");
  for (const q of [0, -1, 1.5, "2", 1000]) assert.equal(motivo(mercador(), item(), q, moedas(50)), "quantidadeInvalida", String(q));
  assert.equal(motivo(mercador(), item(), 1, moedas(4, 99)), "semDinheiro");
  assert.equal(motivo(mercador(), item({ preco: 0 }), 1, moedas(50)), "semPreco");
  assert.equal(motivo(mercador(), item({ semVenda: true }), 1, moedas(50)), "semPreco");
  assert.equal(motivo(mercador(), { type: "poder", system: {}, flags: { [F]: { loja: {} } } }, 1, moedas(50)), "itemInvalido");
  assert.equal(L.validarCompra(mercador(), item(), 1, moedas(50), { dono: false }).motivo, "semPermissao");
});

test("Empilhamento: munição pelo tipo; equipamento não vestível com mesmo nome e origem; armadura e arma não", () => {
  const ervas = item();
  assert.equal(L.empilha(ervas), true);
  assert.equal(L.empilha({ type: "equipamento", system: { tipo: "armadura" } }), false);
  assert.equal(L.empilha({ type: "equipamento", system: { tipo: "item-comum", vestimenta: true } }), false);
  assert.equal(L.empilha({ type: "arma", system: {} }), false);
  const meus = [{ type: "equipamento", name: "Saco de ervas", system: {}, flags: { [F]: { id: "saco-de-ervas" } } }, { type: "municao", system: { tipo: "flechas" } }];
  assert.equal(L.itemParaEmpilhar(meus, ervas), meus[0]);
  assert.equal(L.itemParaEmpilhar(meus, { ...ervas, flags: { [F]: { id: "outro" } } }), null, "mesmo nome, outra origem");
  assert.equal(L.itemParaEmpilhar(meus, { type: "municao", system: { tipo: "flechas" } }), meus[1]);
  const d = L.dadosDaCompra({ _id: "x", type: "municao", name: "Flechas", system: { quantidade: 20, precoPacote: 100 }, flags: { [F]: { loja: { quantidade: null } } } }, 3);
  assert.deepEqual([d._id, d.system.quantidade, d.flags[F].loja], [undefined, 60, undefined], "3 pacotes = 60 flechas; sem flags de loja");
});

test("Venda ao mercador (Fase 2): precoVenda ou preço × percentual; caixa; semVenda recusado; desligada por padrão", () => {
  const m = mercador({ compra: { ativo: true, percentual: 0.5 } }, { caixaInfinita: false, caixa: { ouroReal: 0, real: 3, centavo: 0 } });
  const meu = { type: "equipamento", system: { preco: 500, precoVenda: null, quantidade: 2 } };
  assert.equal(L.precoDeVenda(meu, 0.5), 250);
  assert.equal(L.precoDeVenda({ ...meu, system: { ...meu.system, precoVenda: 100 } }, 0.5), 100);
  const r = L.validarVenda(m, meu, 1, moedas(0));
  assert.deepEqual([r.ok, r.total, totalEmCentavos(r.moedas), totalEmCentavos(r.caixa), r.resta], [true, 250, 250, 50, 1]);
  assert.equal(L.validarVenda(m, meu, 2, moedas(0)).motivo, "caixaSemDinheiro");
  assert.equal(L.validarVenda(m, { ...meu, system: { ...meu.system, semVenda: true } }, 1, moedas(0)).motivo, "semVenda");
  assert.equal(L.validarVenda(mercador(), meu, 1, moedas(0)).motivo, "naoCompra");
});

test("Pedido do socket: só uuids, id e quantidade inteira; preço nunca é aceito", () => {
  const ok = { mercadorUuid: "Actor.aaaaaaaaaaaaaaaa", itemId: "bbbbbbbbbbbbbbbb", quantidade: 2, compradorUuid: "Actor.cccccccccccccccc", preco: 1 };
  assert.deepEqual(L.validarPedidoDeLoja(ok), { mercadorUuid: ok.mercadorUuid, itemId: ok.itemId, quantidade: 2, compradorUuid: ok.compradorUuid });
  assert.equal(L.validarPedidoDeLoja({ ...ok, quantidade: "2" }), null);
  assert.equal(L.validarPedidoDeLoja({ ...ok, itemId: "../x" }), null);
  assert.equal(L.validarPedidoDeLoja({ ...ok, mercadorUuid: "Item.aaaaaaaaaaaaaaaa" }), null);
});

/* ---------------- Camada do Foundry (Mestre) com atores simulados ---------------- */

function atorSimulado(uuid, tipo, system, itens = [], { falharItem = false } = {}) {
  const a = {
    uuid, type: tipo, name: tipo === "mercador" ? "Boticário" : "Kaelen", documentName: "Actor", system, _source: { system: structuredClone(system) },
    items: Object.assign([], { get: id => a.items.find(i => i.id === id) }),
    testUserPermission: u => u.id === "jog" || u.isGM,
    async update(m) { for (const [k, v] of Object.entries(m)) { const p = k.split("."); p.slice(0, -1).reduce((o, x) => o[x], a)[p.at(-1)] = v; } a._source.system = structuredClone(a.system); },
    async createEmbeddedDocuments(_t, lista) {
      if (falharItem) throw new Error("falha simulada");
      const criados = lista.map((d, i) => itemSimulado(a, { ...d, id: `n${a.items.length + i}` }));
      a.items.push(...criados);
      return criados;
    }
  };
  for (const i of itens) a.items.push(itemSimulado(a, i));
  documentos.set(uuid, a);
  return a;
}
function itemSimulado(dono, d) {
  const i = { ...structuredClone(d), parent: dono,
    toObject: () => structuredClone({ ...d, _id: d.id }),
    async update(m) { for (const [k, v] of Object.entries(m)) { const p = k.split("."); p.slice(0, -1).reduce((o, x) => (o[x] ??= {}), i)[p.at(-1)] = v; } },
    async delete() { dono.items.splice(dono.items.indexOf(i), 1); } };
  return i;
}
const pedido = q => ({ mercadorUuid: "Actor.mmmmmmmmmmmmmmmm", itemId: "iiiiiiiiiiiiiiii", quantidade: q, compradorUuid: "Actor.cccccccccccccccc" });

test("Mestre executa a compra: dinheiro sai, item entra (empilhando), estoque cai, chat registra", async () => {
  usuarios.set("jog", { id: "jog", isGM: false, active: true });
  const merc = atorSimulado("Actor.mmmmmmmmmmmmmmmm", "mercador", mercador(), [{ ...item(), id: "iiiiiiiiiiiiiiii" }]);
  const comp = atorSimulado("Actor.cccccccccccccccc", "personagem", { moedas: { ouroReal: 0, real: 20, centavo: 0 } },
    [{ id: "e1", type: "equipamento", name: "Saco de ervas", system: { tipo: "item-comum", quantidade: 1 }, flags: { [F]: { id: "saco-de-ervas" } } }]);
  const r = await executar("comprar", pedido(2), "jog");
  assert.equal(r.ok, true, r.texto);
  assert.deepEqual(comp.system.moedas, { ouroReal: 0, real: 10, centavo: 0 });
  assert.equal(comp.items.length, 1, "empilhou");
  assert.equal(comp.items[0].system.quantidade, 3);
  assert.equal(merc.items[0].flags[F].loja.quantidade, 1);
  assert.match(chat.at(-1).content, /Comprou/);
  const r2 = await executar("comprar", pedido(5), "jog");
  assert.equal(r2.ok, false);
  assert.match(r2.texto, /semEstoque/);
});

test("Bloco: se entregar o item falha, o dinheiro volta e o estoque fica", async () => {
  const merc = atorSimulado("Actor.mmmmmmmmmmmmmmmm", "mercador", mercador(), [{ ...item({ tipo: "armadura" }), id: "iiiiiiiiiiiiiiii" }]);
  const comp = atorSimulado("Actor.cccccccccccccccc", "personagem", { moedas: { ouroReal: 0, real: 20, centavo: 0 } }, [], { falharItem: true });
  const r = await executar("comprar", pedido(1), "jog");
  assert.equal(r.ok, false);
  assert.deepEqual(comp.system.moedas, { ouroReal: 0, real: 20, centavo: 0 });
  assert.equal(merc.items[0].flags[F].loja.quantidade, 3);
});

test("Sem Mestre conectado: o jogador é avisado e nada é enviado; com Mestre, o pedido vai sem preço", async () => {
  const merc = documentos.get("Actor.mmmmmmmmmmmmmmmm");
  const comp = documentos.get("Actor.cccccccccccccccc");
  emitidos.length = 0;
  game.users.activeGM = null;
  assert.equal(await pedirNaLoja("comprar", { mercador: merc, itemId: "iiiiiiiiiiiiiiii", quantidade: 1, comprador: comp }), false);
  assert.deepEqual(avisos.at(-1), ["warn", "ICARUS.Loja.SemMestre"]);
  assert.equal(emitidos.length, 0);
  game.users.activeGM = { isSelf: false };
  await pedirNaLoja("comprar", { mercador: merc, itemId: "iiiiiiiiiiiiiiii", quantidade: 1, comprador: comp });
  assert.deepEqual(emitidos.at(-1), { acao: "loja:comprar", mercadorUuid: merc.uuid, itemId: "iiiiiiiiiiiiiiii", quantidade: 1, compradorUuid: comp.uuid });
});

test("Socket: só o Mestre ativo executa e responde ao jogador; outro cliente ignora", async () => {
  atorSimulado("Actor.mmmmmmmmmmmmmmmm", "mercador", mercador(), [{ ...item(), id: "iiiiiiiiiiiiiiii" }]);
  atorSimulado("Actor.cccccccccccccccc", "personagem", { moedas: { ouroReal: 0, real: 20, centavo: 0 } });
  emitidos.length = 0;
  game.users.activeGM = { isSelf: false };
  await aoReceberLoja({ acao: "loja:comprar", ...pedido(1) }, "jog");
  assert.equal(emitidos.length, 0, "não é o Mestre ativo");
  game.users.activeGM = { isSelf: true };
  await aoReceberLoja({ acao: "loja:comprar", ...pedido(1) }, "jog");
  assert.deepEqual([emitidos.at(-1).acao, emitidos.at(-1).para, emitidos.at(-1).ok], ["loja:resposta", "jog", true]);
  assert.match(textoDoMotivo({ motivo: "semDinheiro", total: 1000 }, { item: "X" }), /R\$ 10/);
});

test("Compêndio Icarus: Mercadores: 3 mercadores com estoque dos compêndios do sistema (preço deles, flags de loja)", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const dir = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..", "packs-src", "mercadores");
  const atores = fs.readdirSync(dir).map(f => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
  assert.deepEqual(atores.map(a => a.name).sort(), ["Boticário", "Ferreiro", "Mercador de Rua"]);
  for (const a of atores) {
    assert.equal(a.type, "mercador");
    assert.equal(a.ownership.default, 2, "jogadores como observadores (vitrine)");
    assert.ok(a.items.length >= 5, a.name);
    for (const i of a.items) {
      assert.ok(L.TIPOS_VENDAVEIS.includes(i.type), i.name);
      assert.equal(i.flags[F].loja.venda, true);
      assert.ok(L.precoUnitario(i) > 0, `${a.name}: ${i.name} sem preço`);
    }
  }
});
