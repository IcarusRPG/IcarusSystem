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
  assert.equal(L.precoTotal(item({ preco: 333 }), 3, 1.1), 1098, "unitário 333 × 1,1 = 366,3 → 366; × 3 = 1098");
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

test("Estoque sempre finito (o antigo null conta 1 e a migração grava 1); caixa do mercador recebe quando não é infinita", () => {
  const r = L.validarCompra(mercador({}, { caixaInfinita: false, caixa: { ouroReal: 0, real: 1, centavo: 50 } }), item({}, { quantidade: 4 }), 4, moedas(50));
  assert.equal(r.ok, true);
  assert.equal(r.estoque, 0);
  assert.equal(totalEmCentavos(r.caixa), 150 + 2000);
  assert.equal(L.lojaDoItem(item({}, { quantidade: null })).quantidade, 1);
  assert.equal(L.validarCompra(mercador(), item({}, { quantidade: null }), 2, moedas(50)).motivo, "semEstoque");
  assert.equal(L.migrarQuantidadeDoEstoque({ quantidade: null }), 1);
  assert.equal(L.migrarQuantidadeDoEstoque({ quantidade: 0 }), null);
  assert.equal(L.esgotado(item({}, { quantidade: 0 })), true);
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
  // O preço do mercador prevalece: "sem venda" e preço 0 se vendem com preço definido
  assert.equal(L.validarCompra(mercador(), item({ semVenda: true }, { precoBase: 700 }), 1, moedas(50)).total, 700);
  assert.equal(L.validarCompra(mercador(), item({ preco: 0 }, { precoBase: 300 }), 1, moedas(50)).total, 300);
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

/* ---------------- Barganha ---------------- */

const { processarBarganha, reiniciarBarganhas, acalmarGuardas, efeitosDoMercador } = await import("../module/loja-foundry.mjs");
const { migrarEstoqueInfinito } = await import("../module/migracoes.mjs");

test("Barganha: 20 natural = crítico e 1 natural = falha crítica, mesmo com o total do outro lado da CD (vantagem usa o dado que valeu)", () => {
  assert.equal(L.resultadoDoTeste({ natural: 20, total: 8, cd: 15 }), "critico");
  assert.equal(L.resultadoDoTeste({ natural: 1, total: 30, cd: 15 }), "falhaCritica");
  assert.equal(L.resultadoDoTeste({ natural: 12, total: 15, cd: 15 }), "sucesso");
  assert.equal(L.resultadoDoTeste({ natural: 12, total: 14, cd: 15 }), "falha");
  // Com vantagem, a mensagem guarda o natural do dado mantido (rolls.mjs → flags.natural)
  const v = L.validarMensagemDeBarganha({ autor: "u", atorFalante: "a", chave: "barganha", total: 9, natural: 20, quando: 1000 }, { teste: "barganha", usuarioId: "u", compradorId: "a", dono: true, agora: 2000 });
  assert.equal(L.resultadoDoTeste({ ...v, cd: 15 }), "critico");
});

test("Efeitos: um desconto (15% com 20 natural, senão 5%) e um acréscimo (10%), sem acumular; preço = base × (1 − d) × (1 + a), unitário arredondado", () => {
  const e = estado => L.efeitosDaBarganha(estado, L.BARGANHA_PADRAO);
  assert.deepEqual(e({}), { desconto: 0, acrescimo: 0, liberados: [], guardas: false });
  assert.equal(e({ barganha: { feito: true, resultado: "sucesso" }, diplomacia: { feito: true, resultado: "sucesso" } }).desconto, 5, "dois sucessos: um desconto só");
  assert.equal(e({ barganha: { feito: true, resultado: "sucesso" }, diplomacia: { feito: true, resultado: "critico" } }).desconto, 15, "o crítico no lugar dos 5%");
  assert.equal(e({ barganha: { feito: true, resultado: "falha" }, diplomacia: { feito: true, resultado: "falha" } }).acrescimo, 0, "falha comum em Barganha/Diplomacia: nada");
  assert.equal(e({ intimidacao: { feito: true, resultado: "falha" } }).acrescimo, 10);
  assert.equal(e({ barganha: { feito: true, resultado: "falhaCritica" }, intimidacao: { feito: true, resultado: "falha" } }).acrescimo, 10, "um acréscimo só");
  const juntos = e({ barganha: { feito: true, resultado: "critico" }, diplomacia: { feito: true, resultado: "falhaCritica" } });
  assert.deepEqual([juntos.desconto, juntos.acrescimo], [15, 10]);
  assert.equal(L.precoUnitario(item({ preco: 1000 }), 1, juntos), 935, "1000 × 0,85 × 1,1 = 935");
  assert.equal(L.precoUnitario(item({ preco: 333 }), 1, { desconto: 5, acrescimo: 0 }), 316, "333 × 0,95 = 316,35 → 316");
  assert.equal(L.precoTotal(item({ preco: 333 }), 3, 1, { desconto: 5 }), 948, "o total é o unitário mostrado × quantidade");
  const r = L.validarCompra(mercador(), item({ preco: 333 }), 3, moedas(50), { efeitos: { desconto: 5, acrescimo: 0, liberados: [] } });
  assert.deepEqual([r.unitario, r.total], [316, 948]);
});

test("Itens ocultos: aparecem com qualquer teste que passou, ou só com o teste ligado a eles", () => {
  const oculto = liberaCom => item({}, { oculto: true, liberaCom });
  const com = liberados => ({ liberados });
  assert.equal(L.visivelNaVitrine(oculto("qualquer"), com([])), false);
  assert.equal(L.visivelNaVitrine(oculto("qualquer"), com(["diplomacia"])), true);
  assert.equal(L.visivelNaVitrine(oculto("intimidacao"), com(["diplomacia"])), false);
  assert.equal(L.visivelNaVitrine(oculto("intimidacao"), com(["intimidacao"])), true);
  assert.equal(L.validarCompra(mercador(), oculto("barganha"), 1, moedas(50)).motivo, "itemInvalido");
  assert.equal(L.validarCompra(mercador(), oculto("barganha"), 1, moedas(50), { efeitos: com(["barganha"]) }).ok, true);
});

test("Um teste, uma vez, para o grupo; falas sorteadas por resultado com {personagem} e {mercador}", () => {
  const a = L.registrarTeste({}, "barganha", { por: "Kaelen", resultado: "sucesso" });
  assert.equal(a.ok, true);
  assert.deepEqual(L.registrarTeste(a.estado, "barganha", { por: "Lira" }), { ok: false, motivo: "jaFeito", por: "Kaelen" });
  assert.equal(L.registrarTeste(a.estado, "diplomacia", { por: "Lira" }).ok, true, "os outros testes continuam livres");
  assert.equal(L.registrarTeste({}, "furtividade", {}).motivo, "testeInvalido");
  assert.equal(L.sortearFala("um {personagem}\ndois {mercador}\n\n", { personagem: "Kaelen", mercador: "Boticário" }, () => 0.99), "dois Boticário");
  assert.equal(L.sortearFala("", {}), "");
  for (const t of L.TESTES_DE_BARGANHA) for (const r of L.RESULTADOS) assert.equal(L.FALAS_PADRAO[t][r].length, 3, t + "/" + r);
  assert.match(L.sortearFala(L.textoDasFalasPadrao("barganha", "sucesso"), { personagem: "Kaelen" }, () => 0.5), /Kaelen/);
});

test("Mensagem da rolagem: autor, falante (dono), perícia, recente e não usada", () => {
  const ok = { autor: "u", atorFalante: "a", chave: "diplomacia", total: 17, natural: 11, quando: 1000000 };
  const p = { teste: "diplomacia", usuarioId: "u", compradorId: "a", dono: true, agora: 1000000 + 60000 };
  assert.deepEqual(L.validarMensagemDeBarganha(ok, p), { ok: true, total: 17, natural: 11 });
  assert.equal(L.validarMensagemDeBarganha({ ...ok, autor: "outro" }, p).motivo, "mensagemInvalida");
  assert.equal(L.validarMensagemDeBarganha({ ...ok, atorFalante: "b" }, p).motivo, "mensagemInvalida");
  assert.equal(L.validarMensagemDeBarganha(ok, { ...p, dono: false }).motivo, "mensagemInvalida");
  assert.equal(L.validarMensagemDeBarganha({ ...ok, chave: "barganha" }, p).motivo, "mensagemInvalida");
  assert.equal(L.validarMensagemDeBarganha({ ...ok, usada: true }, p).motivo, "mensagemUsada");
  assert.equal(L.validarMensagemDeBarganha(ok, { ...p, agora: 1000000 + 180000 }).motivo, "mensagemAntiga");
  assert.equal(L.validarMensagemDeBarganha({ ...ok, natural: 21 }, p).motivo, "mensagemInvalida");
  assert.equal(L.validarPedidoDeBarganha({ mercadorUuid: "Actor.aaaaaaaaaaaaaaaa", teste: "barganha", mensagemId: "bbbbbbbbbbbbbbbb", compradorUuid: "Actor.cccccccccccccccc", total: 30 }).total, undefined, "o total nunca vem do jogador");
});

/** Mercador e mensagens simulados para o fluxo do Mestre. */
function mercadorDeBarganha() {
  const falas = Object.fromEntries(L.TESTES_DE_BARGANHA.map(t => [t, Object.fromEntries(L.RESULTADOS.map(r => [r, L.textoDasFalasPadrao(t, r)]))]));
  const m = atorSimulado("Actor.mmmmmmmmmmmmmmmm", "mercador", mercador({ barganha: { ...structuredClone(L.BARGANHA_PADRAO), falas } }), [{ ...item({}, { oculto: true }), id: "iiiiiiiiiiiiiiii" }]);
  m.flags = { [F]: {} };
  m.getFlag = (_s, k) => m.flags[F][k];
  const original = m.update;
  const prefixo = "flags." + F + ".";
  m.update = async mudancas => {
    const resto = {};
    for (const [k, v] of Object.entries(mudancas)) {
      if (k.startsWith(prefixo + "-=")) delete m.flags[F][k.slice(prefixo.length + 2)];
      else if (k.startsWith(prefixo)) m.flags[F][k.slice(prefixo.length)] = v;
      else resto[k] = v;
    }
    return original.call(m, resto);
  };
  return m;
}
const mensagens = new Map();
globalThis.game.messages = { get: id => mensagens.get(id) };
function rolagem(id, { chave = "barganha", total = 18, natural = 12, autor = "jog", ator = "cccccccccccccccc" } = {}) {
  const msg = { id, author: { id: autor }, speaker: { actor: ator }, timestamp: Date.now(), flags: { [F]: { tipo: "pericia", chave, total, natural } },
    async setFlag(_s, k, v) { msg.flags[F][k] = v; } };
  mensagens.set(id, msg);
  return msg;
}
const pedidoB = (teste, mensagemId) => ({ mercadorUuid: "Actor.mmmmmmmmmmmmmmmm", teste, mensagemId, compradorUuid: "Actor.cccccccccccccccc" });

test("Mestre: dois pedidos simultâneos do mesmo teste dão um só; a mensagem não vale duas vezes; preço e itens mudam", async () => {
  usuarios.set("jog", { id: "jog", isGM: false, active: true });
  usuarios.set("jog2", { id: "jog2", isGM: false, active: true });
  const merc = mercadorDeBarganha();
  const comp = atorSimulado("Actor.cccccccccccccccc", "personagem", { moedas: { ouroReal: 0, real: 20, centavo: 0 } });
  comp.id = "cccccccccccccccc";
  rolagem("aaaaaaaaaaaaaaa1", { total: 18, natural: 12 });
  rolagem("aaaaaaaaaaaaaaa2", { total: 25, natural: 20 });
  const [r1, r2] = await Promise.all([processarBarganha(pedidoB("barganha", "aaaaaaaaaaaaaaa1"), "jog"), processarBarganha(pedidoB("barganha", "aaaaaaaaaaaaaaa2"), "jog")]);
  assert.equal(r1.ok, true);
  assert.equal(r2.ok, false);
  assert.match(r2.texto, /jaFeitoPor/);
  assert.deepEqual([merc.flags[F].barganha.barganha.resultado, merc.flags[F].barganha.barganha.por], ["sucesso", "Kaelen"]);
  assert.ok(merc.flags[F].barganha.ultima.fala.length > 10, "a fala fica para o balão");
  assert.match(chat.at(-1).content, /icarus-loja-fala/);
  const ef = efeitosDoMercador(merc);
  assert.deepEqual([ef.desconto, ef.liberados], [5, ["barganha"]]);
  assert.equal(L.visivelNaVitrine(merc.items[0], ef), true, "o item oculto foi liberado");
  // A mesma mensagem não serve de novo, nem a de outro usuário
  assert.equal((await processarBarganha(pedidoB("barganha", "aaaaaaaaaaaaaaa1"), "jog")).ok, false);
  rolagem("aaaaaaaaaaaaaaa3", { chave: "diplomacia", autor: "jog2" });
  assert.equal((await processarBarganha(pedidoB("diplomacia", "aaaaaaaaaaaaaaa3"), "jog")).ok, false, "mensagem de outro usuário");
  // Reiniciar libera tudo e volta preço e ocultos
  game.user.isGM = true;
  await reiniciarBarganhas(merc);
  assert.deepEqual(efeitosDoMercador(merc), { desconto: 0, acrescimo: 0, liberados: [], guardas: false });
  assert.equal(L.visivelNaVitrine(merc.items[0], efeitosDoMercador(merc)), false);
  game.user.isGM = false;
});

test("Guardas: 1 natural na Intimidação fecha a loja, avisa o Mestre e o botão reabre", async () => {
  const merc = mercadorDeBarganha();
  const comp = atorSimulado("Actor.cccccccccccccccc", "personagem", { moedas: { ouroReal: 0, real: 20, centavo: 0 } });
  comp.id = "cccccccccccccccc";
  merc.system.loja.barganha.guardas.nota = "2 guardas chegam em 1d4 rodadas";
  usuarios.set("mestre", { id: "mestre", isGM: true, active: true });
  rolagem("aaaaaaaaaaaaaaa4", { chave: "intimidacao", total: 40, natural: 1 });
  const r = await processarBarganha(pedidoB("intimidacao", "aaaaaaaaaaaaaaa4"), "jog");
  assert.equal(r.ok, true);
  assert.equal(merc.system.loja.aberta, false);
  assert.equal(merc.flags[F].guardas, true);
  assert.equal(efeitosDoMercador(merc).acrescimo, 0, "os guardas não somam o acréscimo");
  assert.ok(chat.some(c => c.whisper?.includes("mestre") && /2 guardas chegam/.test(c.content)), "sussurro ao Mestre com a nota");
  rolagem("aaaaaaaaaaaaaaa5", { chave: "barganha" });
  assert.match((await processarBarganha(pedidoB("barganha", "aaaaaaaaaaaaaaa5"), "jog")).texto, /lojaFechada/);
  game.user.isGM = true;
  await acalmarGuardas(merc);
  game.user.isGM = false;
  assert.deepEqual([merc.system.loja.aberta, merc.flags[F].guardas], [true, undefined]);
});

test("Migração 0.33.0: estoque antigo null vira 1 (só no mercador)", async () => {
  const alterados = [];
  const ator = (type, quantidades) => ({ type, items: quantidades.map((q, i) => ({ id: "i" + i, flags: { [F]: { loja: { quantidade: q } } } })),
    async updateEmbeddedDocuments(_t, l) { alterados.push(...l); } });
  const n = await migrarEstoqueInfinito([ator("mercador", [null, 3, undefined]), ator("personagem", [null])]);
  assert.equal(n, 2);
  assert.deepEqual(alterados.map(a => a["flags." + F + ".loja.quantidade"]), [1, 1]);
});

/* ---------------- Roubo e compra sem dinheiro ---------------- */

const { processarRoubo, zerarTentativasDoUsuario } = await import("../module/loja-foundry.mjs");

test("Compra sem dinheiro: contagem por jogador; aviso na 1ª e 2ª; guardas na 3ª; zerar", () => {
  let c = {};
  const r1 = L.registrarTentativaSemDinheiro(c, "jog");
  const r2 = L.registrarTentativaSemDinheiro(r1.contagem, "jog");
  const outro = L.registrarTentativaSemDinheiro(r2.contagem, "jog2");
  const r3 = L.registrarTentativaSemDinheiro(outro.contagem, "jog");
  assert.deepEqual([r1.guardas, r2.guardas, outro.guardas, r3.guardas], [false, false, false, true]);
  assert.deepEqual(r3.contagem, { jog: 3, jog2: 1 });
  assert.equal(L.registrarTentativaSemDinheiro({}, "a", 1).guardas, true, "limite configurável");
  assert.deepEqual(L.zerarTentativas(r3.contagem, "jog"), { jog2: 1 });
  assert.deepEqual(L.zerarTentativas(r3.contagem), {});
});

test("Roubo: CD do item sobrescreve a do mercador; esgotado, oculto, loja fechada e roubo desligado não deixam; dinheiro não importa", () => {
  const m = mercador({ roubo: { ...L.ROUBO_PADRAO } });
  assert.equal(L.cdDoRoubo(item(), m), 15);
  assert.equal(L.cdDoRoubo(item({}, { cdRoubo: 22 }), m), 22);
  assert.deepEqual(L.validarRoubo(m, item()), { ok: true });
  assert.equal(L.validarRoubo(m, item({}, { quantidade: 0 })).motivo, "esgotado");
  assert.equal(L.validarRoubo(m, item({}, { oculto: true })).motivo, "itemInvalido");
  assert.equal(L.validarRoubo(m, item({}, { oculto: true }), { efeitos: { liberados: ["barganha"] } }).ok, true, "oculto liberado pode");
  assert.equal(L.validarRoubo(mercador({ aberta: false, roubo: { ...L.ROUBO_PADRAO } }), item()).motivo, "lojaFechada");
  assert.equal(L.validarRoubo(mercador({ roubo: { ...L.ROUBO_PADRAO, permitir: false } }), item()).motivo, "rouboDesligado");
  assert.deepEqual([L.rouboPassou({ total: 15, cd: 15 }), L.rouboPassou({ total: 14, cd: 15 })], [true, false]);
  assert.equal(L.validarPedidoDeRoubo({ mercadorUuid: "Actor.aaaaaaaaaaaaaaaa", itemId: "bbbbbbbbbbbbbbbb", mensagemId: "cccccccccccccccc", compradorUuid: "Actor.dddddddddddddddd", total: 99 }).total, undefined);
  assert.equal(L.sortearFala(L.ROUBO_PADRAO.falasGuardas, { personagem: "Kaelen" }, () => 0.5), "Chega! Eu avisei, Kaelen! (bate no sino do balcão) Guardas! Tem um ladrão na minha loja!");
  assert.equal(L.comItem(L.ROUBO_PADRAO.sucesso, "Adaga"), "Seus dedos foram mais rápidos que os olhos do mercador: Adaga é seu.");
});

/** Mercador com item visível (para comprar e roubar) e o comprador sem dinheiro. */
function lojaParaRoubo({ real = 0, cdRoubo = null } = {}) {
  const merc = mercadorDeBarganha();
  merc.items[0].flags[F].loja.oculto = false;
  merc.items[0].flags[F].loja.cdRoubo = cdRoubo;
  const comp = atorSimulado("Actor.cccccccccccccccc", "personagem", { moedas: { ouroReal: 0, real, centavo: 0 } });
  comp.id = "cccccccccccccccc";
  return { merc, comp };
}
const compra = q => ({ mercadorUuid: "Actor.mmmmmmmmmmmmmmmm", itemId: "iiiiiiiiiiiiiiii", quantidade: q, compradorUuid: "Actor.cccccccccccccccc" });

test("Mestre: comprar sem dinheiro 3 vezes chama os guardas; outros motivos não contam; outro jogador não é afetado; zerar", async () => {
  usuarios.set("jog", { id: "jog", isGM: false, active: true });
  usuarios.set("mestre", { id: "mestre", isGM: true, active: true });
  const { merc } = lojaParaRoubo();
  const r1 = await executar("comprar", compra(1), "jog");
  assert.deepEqual([r1.ok, r1.texto], [false, "Está tentando me roubar?"]);
  assert.deepEqual([merc.flags[F].falaLoja.texto, merc.flags[F].falaLoja.para], ["Está tentando me roubar?", "jog"], "balão só para quem tentou");
  assert.match(chat.at(-1).content, /Está tentando me roubar\?/);
  await executar("comprar", compra(9), "jog");
  assert.equal(merc.flags[F].tentativasSemDinheiro.jog, 1, "sem estoque não conta");
  assert.equal((await executar("comprar", compra(1), "jog")).texto, "Está tentando me roubar?");
  // Outro jogador (com outro personagem) começa do zero
  const comp2 = atorSimulado("Actor.eeeeeeeeeeeeeeee", "personagem", { moedas: { ouroReal: 0, real: 0, centavo: 0 } });
  comp2.testUserPermission = u => u.id === "jog2" || u.isGM;
  usuarios.set("jog2", { id: "jog2", isGM: false, active: true });
  await executar("comprar", { ...compra(1), compradorUuid: "Actor.eeeeeeeeeeeeeeee" }, "jog2");
  assert.deepEqual(merc.flags[F].tentativasSemDinheiro, { jog: 2, jog2: 1 });
  await executar("comprar", compra(1), "jog");
  assert.equal(merc.system.loja.aberta, false, "3ª: guardas, loja fechada");
  assert.equal(merc.flags[F].guardas, true);
  assert.ok(chat.some(c => c.whisper?.includes("mestre") && /SemDinheiroMestre.*Kaelen.*"n":3/.test(c.content)), "o Mestre sabe quem provocou");
  assert.match((await executar("comprar", compra(1), "jog")).texto, /lojaFechada/, "loja fechada: ninguém compra");
  assert.equal(merc.flags[F].tentativasSemDinheiro.jog, 3, "loja fechada não conta");
  game.user.isGM = true;
  await zerarTentativasDoUsuario(merc, "jog2");
  assert.deepEqual(merc.flags[F].tentativasSemDinheiro, { jog: 3 });
  await acalmarGuardas(merc);
  assert.equal(merc.flags[F].tentativasSemDinheiro, undefined, "reabrir zera");
  merc.flags[F].tentativasSemDinheiro = { jog: 2 };
  await reiniciarBarganhas(merc);
  assert.equal(merc.flags[F].tentativasSemDinheiro, undefined, "reiniciar zera");
  game.user.isGM = false;
});

test("Mestre: roubo que passa entrega 1 unidade, baixa o estoque e avisa só o jogador e o Mestre; a rolagem não vale duas vezes", async () => {
  const { merc, comp } = lojaParaRoubo();
  rolagem("rrrrrrrrrrrrrrr1", { chave: "prestidigitacao", total: 16, natural: 9 });
  const r = await processarRoubo({ mercadorUuid: merc.uuid, itemId: "iiiiiiiiiiiiiiii", mensagemId: "rrrrrrrrrrrrrrr1", compradorUuid: comp.uuid }, "jog");
  assert.equal(r.ok, true, r.texto);
  assert.equal(merc.items[0].flags[F].loja.quantidade, 2);
  assert.deepEqual([comp.items.length, comp.items[0].system.quantidade, comp.items[0].flags?.[F]?.loja], [1, 1, undefined]);
  assert.deepEqual(chat.at(-1).whisper.sort(), ["jog", "mestre"]);
  assert.match(chat.at(-1).content, /Saco de ervas é seu/);
  assert.equal(merc.flags[F].roubos.at(-1).passou, true);
  assert.equal((await processarRoubo({ mercadorUuid: merc.uuid, itemId: "iiiiiiiiiiiiiiii", mensagemId: "rrrrrrrrrrrrrrr1", compradorUuid: comp.uuid }, "jog")).ok, false, "mensagem usada");
  rolagem("rrrrrrrrrrrrrrr2", { chave: "diplomacia", total: 30 });
  assert.equal((await processarRoubo({ mercadorUuid: merc.uuid, itemId: "iiiiiiiiiiiiiiii", mensagemId: "rrrrrrrrrrrrrrr2", compradorUuid: comp.uuid }, "jog")).ok, false, "precisa ser Prestidigitação");
});

test("Mestre: roubo que falha (CD do item) chama os guardas sem entregar nada; roubo desligado é recusado", async () => {
  const { merc, comp } = lojaParaRoubo({ cdRoubo: 25 });
  rolagem("rrrrrrrrrrrrrrr3", { chave: "prestidigitacao", total: 20, natural: 14 });
  const r = await processarRoubo({ mercadorUuid: merc.uuid, itemId: "iiiiiiiiiiiiiiii", mensagemId: "rrrrrrrrrrrrrrr3", compradorUuid: comp.uuid }, "jog");
  assert.equal(r.ok, false);
  assert.deepEqual([merc.system.loja.aberta, merc.flags[F].guardas, merc.items[0].flags[F].loja.quantidade, comp.items.length], [false, true, 3, 0]);
  assert.ok(chat.some(c => c.whisper?.includes("mestre") && /FlagranteMestre/.test(c.content)));
  assert.ok(merc.flags[F].falaLoja.texto.length > 10, "fala de flagrante no balão de todos");
  assert.equal(merc.flags[F].falaLoja.para, null);
  const outra = lojaParaRoubo();
  outra.merc.system.loja.roubo = { ...L.ROUBO_PADRAO, permitir: false };
  rolagem("rrrrrrrrrrrrrrr4", { chave: "prestidigitacao", total: 30, natural: 15 });
  assert.match((await processarRoubo({ mercadorUuid: outra.merc.uuid, itemId: "iiiiiiiiiiiiiiii", mensagemId: "rrrrrrrrrrrrrrr4", compradorUuid: outra.comp.uuid }, "jog")).texto, /rouboDesligado/);
});
