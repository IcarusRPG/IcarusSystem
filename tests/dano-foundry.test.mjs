/** Botões de dano no Foundry (simulado): pedido do jogador ao Mestre pelo socket, validação, registro e confirmação. */
import { test } from "node:test";
import assert from "node:assert/strict";

const enviados = [];
const chat = [];
const avisos = [];
const config = new Map([["icarus-rpg.danoJogadoresOutros", "alvos"], ["icarus-rpg.danoQualquerRolagem", false], ["icarus-rpg.danoBotaoDobro", false]]);

globalThis.foundry = { utils: { deepClone: o => structuredClone(o), escapeHTML: s => s, getProperty: () => undefined } };
globalThis.Hooks = { on() {}, once() {} };
globalThis.ui = { notifications: { warn: m => avisos.push(m), info() {} } };
globalThis.renderTemplate = async (_t, d) => JSON.stringify(d);
globalThis.ChatMessage = { create: async d => chat.push(d), getSpeaker: () => ({}) };
globalThis.CONFIG = { sounds: {} };

function ator(nome, pv, { rd = 0, dono = null } = {}) {
  return {
    name: nome, uuid: `Actor.${nome}`, statuses: new Set(), isOwner: false,
    system: { pv: { value: pv, max: pv }, resistencias: { rdGeral: rd, reducao: {}, imunidade: {}, vulnerabilidade: {} } },
    getFlag: () => null,
    testUserPermission: u => u.id === dono,
    async update(m) { this.system.pv.value = m["system.pv.value"]; }
  };
}
const ogro = ator("Ogro", 40, { rd: 3 });
const lira = ator("Lira", 20, { dono: "j1" });
const tokens = {
  "Scene.c1.Token.t1": { uuid: "Scene.c1.Token.t1", name: "Ogro", actor: ogro, parent: { id: "c1" }, documentName: "Token" },
  "Scene.c2.Token.t9": { uuid: "Scene.c2.Token.t9", name: "Ogro distante", actor: ogro, parent: { id: "c2" }, documentName: "Token" }
};
globalThis.fromUuidSync = u => tokens[u] ?? (u === lira.uuid ? lira : null);

function mensagem(id, flags, extra = {}) {
  return {
    id, flags: { "icarus-rpg": flags }, rolls: [], whisper: [], blind: false, author: { id: "j1" }, isOwner: true,
    getFlag(_s, k) { return this.flags["icarus-rpg"][k]; },
    async setFlag(_s, k, v) { this.flags["icarus-rpg"][k] = v; },
    ...extra
  };
}
const msgs = new Map([
  ["m1", mensagem("m1", { dano: { rollType: "dano", total: 14, componentes: [{ tipo: "corte", valor: 14 }] }, aplicacoes: [] })],
  ["m2", mensagem("m2", { dano: { total: 99999 } })],
  ["m3", mensagem("m3", { dano: { total: 5, tipo: "corte" }, aplicacoes: [] }, { whisper: ["mestre"], author: { id: "mestre" } })]
]);
const usuarios = {
  mestre: { id: "mestre", isGM: true, active: true, name: "Mestre" },
  j1: { id: "j1", isGM: false, active: true, name: "Ana", viewedScene: "c1", targets: new Set([{ document: tokens["Scene.c1.Token.t1"] }]) },
  j2: { id: "j2", isGM: false, active: false, name: "Bia", viewedScene: "c1", targets: new Set() }
};
globalThis.game = {
  user: { id: "mestre", isGM: true }, users: { activeGM: { isSelf: true }, get: id => usuarios[id], filter: f => Object.values(usuarios).filter(f) },
  i18n: { localize: k => k, format: (k, d) => `${k} ${JSON.stringify(d ?? {})}` },
  settings: { get: (s, k) => config.get(`${s}.${k}`) },
  messages: { get: id => msgs.get(id) },
  socket: { emit: (_c, m) => enviados.push(m) }
};

const { aoReceberDano, htmlDaBarra } = await import("../module/dano.mjs");
const pedido = (extra = {}) => ({ acao: "dano:aplicar", botao: "dano", mensagemId: "m1", alvos: ["Scene.c1.Token.t1"], origem: "alvos", ...extra });

test("Jogador pede dano no monstro marcado: o Mestre aplica com RD e registra (sem mensagem nova no chat)", async () => {
  await aoReceberDano(pedido(), "j1");
  assert.equal(ogro.system.pv.value, 29); // 40 − (14 − 3)
  const reg = msgs.get("m1").flags["icarus-rpg"].aplicacoes;
  assert.equal(reg.length, 1);
  assert.deepEqual([reg[0].alvo, reg[0].antes, reg[0].depois, reg[0].usuario], ["Ogro", 40, 29, "j1"]);
  assert.match(reg[0].detalhe, /14 ICARUS.TiposDano.corte → RD 3 → 11/);
  assert.equal(chat.length, 0, "nenhuma mensagem de confirmação");
});

test("O valor vem da mensagem: total absurdo ou campos extras do jogador são ignorados/recusados", async () => {
  const antes = ogro.system.pv.value;
  await aoReceberDano(pedido({ total: 5000, componentes: [{ tipo: "corte", valor: 5000 }] }), "j1");
  assert.equal(ogro.system.pv.value, antes - 11, "usou os 14 da mensagem, não o valor enviado");
  await aoReceberDano(pedido({ mensagemId: "m2" }), "j1");
  assert.equal(enviados.at(-1).acao, "dano:recusa");
  assert.equal(ogro.system.pv.value, antes - 11);
});

test("Recusas: token de outra cena, alvo não marcado, botão inválido, usuário desligado, sussurro alheio", async () => {
  const pv = ogro.system.pv.value;
  enviados.length = 0;
  await aoReceberDano(pedido({ alvos: ["Scene.c2.Token.t9"] }), "j1");
  assert.match(enviados.at(-1).texto, /ForaDaCena/);
  usuarios.j1.targets = new Set([{ document: { uuid: "Scene.c1.Token.outro" } }]);
  await aoReceberDano(pedido(), "j1");
  assert.match(enviados.at(-1).texto, /MarqueOAlvo/);
  usuarios.j1.targets = new Set([{ document: tokens["Scene.c1.Token.t1"] }]);
  await aoReceberDano(pedido({ botao: "matar" }), "j1");
  assert.match(enviados.at(-1).texto, /PedidoInvalido/);
  const n = enviados.length;
  await aoReceberDano(pedido(), "j2");
  assert.equal(enviados.length, n, "usuário desligado: ignorado");
  await aoReceberDano(pedido({ mensagemId: "m3" }), "j1");
  assert.match(enviados.at(-1).texto, /PedidoInvalido/);
  config.set("icarus-rpg.danoJogadoresOutros", "nunca");
  await aoReceberDano(pedido(), "j1");
  assert.match(enviados.at(-1).texto, /OutrosProibido/);
  config.set("icarus-rpg.danoJogadoresOutros", "alvos");
  assert.equal(ogro.system.pv.value, pv);
});

test("Só o Mestre ativo executa; jogador só recebe recusa do Mestre", async () => {
  game.users.activeGM = { isSelf: false };
  const pv = ogro.system.pv.value;
  await aoReceberDano(pedido(), "j1");
  assert.equal(ogro.system.pv.value, pv);
  game.users.activeGM = { isSelf: true };
});

test("Registro vindo do jogador: só atores que ele possui", async () => {
  const m = msgs.get("m3");
  m.whisper = [];
  const antes = m.flags["icarus-rpg"].aplicacoes.length;
  await aoReceberDano({ acao: "dano:registro", mensagemId: "m3", registros: [
    { actorUuid: lira.uuid, botao: "cura", antes: 10, depois: 15 },
    { actorUuid: "Scene.c1.Token.t1", botao: "dano", antes: 40, depois: 0 }
  ] }, "j1");
  const reg = m.flags["icarus-rpg"].aplicacoes;
  assert.equal(reg.length, antes + 1);
  assert.equal(reg.at(-1).alvo, "Lira");
});

test("Barra: dicas com o valor exato, desfazer só para o Mestre, registro visível", () => {
  const dados = { rollType: "dano", total: 14 };
  const html = htmlDaBarra(dados, [{ alvo: "Ogro", antes: 40, depois: 29, detalhe: "Ogro: −11 PV (14 Corte → RD 3 → 11)" }], { mestre: true });
  assert.ok(html.includes(`title="Ogro: −11 PV (14 Corte → RD 3 → 11)">Ogro (−11)</span>`));
  assert.match(html, /data-icarus-botao="dano" title="ICARUS.Dano.DicaAplicar \{"n":14\}"/);
  assert.match(html, /data-icarus-botao="metade" title="ICARUS.Dano.DicaAplicar \{"n":7\}"/);
  assert.match(html, /data-icarus-botao="cura" title="ICARUS.Dano.DicaCurar \{"n":14\}"/);
  assert.doesNotMatch(html, /data-icarus-botao="dobro"/);
  assert.match(html, /data-icarus-desfazer/);
  assert.match(html, /Ogro \(−11\)/);
  assert.doesNotMatch(htmlDaBarra(dados, [{ alvo: "Ogro", antes: 40, depois: 29 }], { mestre: false }), /data-icarus-desfazer/);
  assert.match(htmlDaBarra(dados, [], { dobro: true }), /DicaAplicar \{"n":28\}/);
});

test("Dano aplicado chama os ganchos de 'sofrer dano' (Teste de Concentração) com o valor final, e cura não", async () => {
  const { AO_SOFRER_DANO } = await import("../module/dano.mjs");
  const vistos = [];
  const gancho = async (actor, dano) => vistos.push(dano);
  AO_SOFRER_DANO.push(gancho);
  await aoReceberDano(pedido(), "j1");
  AO_SOFRER_DANO.splice(AO_SOFRER_DANO.indexOf(gancho), 1);
  assert.equal(vistos.length, 1);
  assert.ok(vistos[0] > 0);
});
