/** Porta trancada (Mestre simulado): pedido, CD só no Mestre, decisão, porta aberta, um teste por vez; proximidade. */
import { test } from "node:test";
import assert from "node:assert/strict";

const enviados = [];
const chat = [];
const atualizacoesParede = [];
const avisos = [];
let janela = null;
const config = new Map([["icarus-rpg.ultimaCDPorta", 15], ["icarus-rpg.aoSucessoPorta", "abrir"], ["icarus-rpg.mostrarCDParaJogadores", false], ["icarus-rpg.alcanceInteracao", 1.5]]);

class AppFalso { constructor(o) { this.options = o; } render() { janela = this; } close() { this._onClose?.({}); } }
globalThis.foundry = {
  utils: { randomID: (() => { let n = 0; return () => `id${++n}`; })() },
  applications: { api: { DialogV2: { confirm: async () => true }, ApplicationV2: AppFalso, HandlebarsApplicationMixin: c => c } }
};
globalThis.CONST = { WALL_DOOR_STATES: { CLOSED: 0, OPEN: 1, LOCKED: 2 } };
globalThis.Handlebars = { escapeExpression: t => String(t) };
globalThis.Hooks = { on() {}, once() {} };
globalThis.ui = { notifications: { warn: m => avisos.push(m), info() {} } };
globalThis.ChatMessage = { create: async d => chat.push(d), getWhisperRecipients: () => [{ id: "mestre" }] };
globalThis.document = { getElementById: () => null, createElement: () => ({ setAttribute() {}, querySelector: () => ({}), classList: { add() {} }, remove() {} }), body: { appendChild() {} } };
const usuarios = { mestre: { id: "mestre", isGM: true, name: "Mestre" }, j1: { id: "j1", isGM: false, name: "Ana" }, j2: { id: "j2", isGM: false, name: "Bia" } };
const ator = { id: "a1", name: "Alokerl", items: [], testUserPermission: u => u.id === "j1" };
const parede = { id: "w1", ds: 2, async update(m, o) { atualizacoesParede.push([m, o]); Object.assign(this, m); } };
const cena = { id: "c1", walls: new Map([["w1", parede]]), tokens: new Map([["k1", { actor: ator }]]) };
globalThis.game = {
  user: { id: "mestre", isGM: true }, users: { activeGM: { isSelf: true }, get: id => usuarios[id] },
  i18n: { localize: k => k, format: k => k },
  settings: { get: (s, k) => config.get(`${s}.${k}`), set: async (s, k, v) => config.set(`${s}.${k}`, v) },
  scenes: new Map([["c1", cena]]), actors: new Map([["a1", ator]]),
  socket: { emit: (_c, m) => enviados.push(m) }
};

const { aoReceberPorta, OverlayPorta, JanelaCDPorta, resultadoDaPorta } = await import("../module/porta-trancada.mjs");
// O overlay é DOM; aqui só registra e termina o "vídeo" na hora
const naTela = [];
OverlayPorta.abrir = (d, o) => naTela.push(["abrir", d, o]);
OverlayPorta.rolando = (d, fim) => { naTela.push(["rolando", d]); fim?.(); };
OverlayPorta.fechar = () => naTela.push(["fechar"]);
const espera = () => new Promise(r => setTimeout(r, 10));
const pedido = { acao: "porta:pedido", pedidoId: "p1", cenaId: "c1", paredeId: "w1", actorId: "a1", tokenId: "k1" };

test("Resultado: total ≥ CD abre (ou destranca); abaixo continua trancada", () => {
  assert.deepEqual(resultadoDaPorta({ total: 15, cd: 15 }), { sucesso: true, ds: 1 });
  assert.deepEqual(resultadoDaPorta({ total: 15, cd: 15, aoSucesso: "destrancar" }), { sucesso: true, ds: 0 });
  assert.deepEqual(resultadoDaPorta({ total: 14, cd: 15 }), { sucesso: false, ds: 2 });
});

test("4/6/7/8. Pedido → CD do Mestre → cena para todos (sem a CD) → total → Mestre decide e abre a porta", async () => {
  await aoReceberPorta(pedido, "j1");
  assert.ok(janela instanceof JanelaCDPorta, "janela da CD aberta no Mestre");
  assert.equal(janela.dados.nome, "Alokerl");
  assert.equal(janela.dados.gazuas, false, "indicador de gazuas");
  // Outro pedido com o teste em andamento: recusado
  await aoReceberPorta({ ...pedido, pedidoId: "p2" }, "j2");
  assert.equal(enviados.at(-1).acao, "porta:recusa");
  assert.equal(enviados.at(-1).motivo, "ICARUS.Porta.EmAndamento");
  // Mestre confirma CD 17
  await JanelaCDPorta._confirmar.call(janela, null, null, { object: { cd: "17" } });
  const cenaEnviada = enviados.find(m => m.acao === "porta:cena");
  assert.equal(cenaEnviada.userId, "j1", "só o jogador do teste rola");
  assert.equal("cd" in cenaEnviada, false, "a CD não vai aos jogadores");
  assert.equal(naTela.at(-1)[2].cd, 17, "o Mestre vê a CD");
  assert.equal(config.get("icarus-rpg.ultimaCDPorta"), 17, "lembra a última CD");
  // Total de outro usuário é ignorado
  await aoReceberPorta({ acao: "porta:total", testeId: cenaEnviada.testeId, total: 30 }, "j2");
  assert.equal(enviados.some(m => m.acao === "porta:rolando"), false);
  // Total do jogador: 18 ≥ 17
  await aoReceberPorta({ acao: "porta:total", testeId: cenaEnviada.testeId, total: 18 }, "j1");
  await espera();
  const rolando = enviados.find(m => m.acao === "porta:rolando");
  assert.deepEqual({ ...rolando, testeId: undefined }, { acao: "porta:rolando", testeId: undefined, total: 18, sucesso: true });
  assert.deepEqual(atualizacoesParede.at(-1), [{ ds: 1 }, { icarusPorta: true }], "a porta abre (pelo Mestre)");
  assert.equal(chat.length, 2);
  assert.equal(chat[0].whisper, undefined, "linha pública");
  assert.deepEqual(chat[1].whisper, ["mestre"], "a CD só para o Mestre");
});

test("8. Falha: a porta continua trancada; nova tentativa possível", async () => {
  enviados.length = 0; atualizacoesParede.length = 0; chat.length = 0; parede.ds = 2;
  await aoReceberPorta({ ...pedido, pedidoId: "p3" }, "j1");
  await JanelaCDPorta._confirmar.call(janela, null, null, { object: { cd: "20" } });
  const cenaEnviada = enviados.find(m => m.acao === "porta:cena");
  await aoReceberPorta({ acao: "porta:total", testeId: cenaEnviada.testeId, total: 12 }, "j1");
  await espera();
  assert.equal(enviados.find(m => m.acao === "porta:rolando").sucesso, false);
  assert.equal(atualizacoesParede.length, 0);
  assert.equal(parede.ds, 2);
  // Nova tentativa aceita (o teste anterior terminou)
  await aoReceberPorta({ ...pedido, pedidoId: "p4" }, "j1");
  assert.equal(janela.dados.pedidoId, "p4");
  JanelaCDPorta._recusar.call(Object.assign(janela, { element: { querySelector: () => ({ value: "agora não" }) } }));
  assert.equal(enviados.at(-1).acao, "porta:recusa");
  assert.equal(enviados.at(-1).texto, "agora não");
});

test("9. Pedido de quem não é dono do personagem é recusado", async () => {
  await aoReceberPorta({ ...pedido, pedidoId: "p5" }, "j2");
  assert.equal(enviados.at(-1).motivo, "ICARUS.Porta.Invalido");
});

test("2/9. Proximidade: jogador longe é barrado com aviso; perto passa; Mestre isento; sem token pede seleção", async () => {
  const { exigirProximidade } = await import("../module/interacao.mjs");
  const porta = { document: { documentName: "Wall", c: [500, 500, 500, 600] } };
  const tokenEm = (x, y) => ({ document: { x, y, width: 1, height: 1 } });
  globalThis.canvas = { grid: { size: 100 }, scene: { grid: { distance: 1.5 } }, tokens: { controlled: [tokenEm(400, 500)] } };
  game.user = { id: "j1", isGM: false, character: null };
  assert.equal(exigirProximidade(porta), true, "adjacente");
  canvas.tokens.controlled = [tokenEm(100, 500)];
  avisos.length = 0;
  assert.equal(exigirProximidade(porta), false, "longe");
  assert.equal(avisos[0], "ICARUS.Interacao.Longe");
  canvas.tokens.controlled = [];
  assert.equal(exigirProximidade(porta), false);
  assert.equal(avisos.at(-1), "ICARUS.Interacao.SelecioneToken");
  game.user = { id: "mestre", isGM: true };
  assert.equal(exigirProximidade(porta), true, "Mestre isento");
});
