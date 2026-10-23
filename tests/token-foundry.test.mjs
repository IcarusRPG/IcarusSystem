/** Token no Foundry (simulado): aplicar no ator e nos tokens da cena, pendente sem Mestre, recusa do Mestre. */
import { test } from "node:test";
import assert from "node:assert/strict";

const getP = (o, k) => k.split(".").reduce((a, p) => a?.[p], o);
function setP(o, k, v) {
  const partes = k.split(".");
  const ultimo = partes.pop();
  const alvo = partes.reduce((a, p) => (a[p] ??= {}), o);
  alvo[ultimo] = structuredClone(v);
}
const avisos = [];
globalThis.foundry = { utils: { randomID: () => "id", getProperty: getP } };
globalThis.ui = { notifications: { info: m => avisos.push(["info", m]), warn: m => avisos.push(["warn", m]), error: m => avisos.push(["error", m]) } };
globalThis.Hooks = { once() {}, on() {} };

const { aplicarNoAtor, aplicarToken, motivoDaRecusa, contextoDoToken, retratoDoAtor } = await import("../module/token.mjs");

function cenario({ vinculado = true, podeEnviar = false, mestre = null } = {}) {
  const atualizacoesCena = [];
  const actor = {
    id: "a1", name: "Lira", img: "retratos/lira.webp", isOwner: true,
    prototypeToken: { actorLink: vinculado, texture: { src: "x" } },
    flags: { "icarus-rpg": {} },
    async update(m) { for (const [k, v] of Object.entries(m)) setP(this, k, v); }
  };
  const cena = {
    name: "Taverna",
    tokens: [{ id: "t1", actorId: "a1", actorLink: vinculado }, { id: "t2", actorId: "outro", actorLink: true }],
    async updateEmbeddedDocuments(_t, dados) { atualizacoesCena.push(...dados); }
  };
  globalThis.game = {
    i18n: { localize: k => k, format: k => k }, world: { id: "mundo" }, scenes: [cena],
    user: { id: "u1", can: () => podeEnviar }, users: { activeGM: mestre }
  };
  return { actor, atualizacoesCena };
}

const estado = { molduraId: "guerreiro", retratoSrc: "retratos/lira.webp", x: 0.5, y: 0.48, escala: 1.4, versao: 1 };

test("6. Aplicar no ator: prototypeToken com a imagem (cache-bust), escala 1, sem anel; estado aplicado guardado", async () => {
  const { actor, atualizacoesCena } = cenario();
  const url = await aplicarNoAtor(actor, "worlds/mundo/icarus-tokens/a1.png", estado, { atualizarCena: true });
  assert.match(url, /^worlds\/mundo\/icarus-tokens\/a1\.png\?v=\d+$/);
  assert.equal(actor.prototypeToken.texture.src, url);
  assert.equal(actor.prototypeToken.texture.scaleX, 1);
  assert.equal(actor.prototypeToken.ring.enabled, false);
  assert.deepEqual(actor.flags["icarus-rpg"].token.aplicado, { molduraId: "guerreiro", retratoSrc: "retratos/lira.webp", x: 0.5, y: 0.48, escala: 1.4 });
  assert.equal(actor.flags["icarus-rpg"].token.imagemFinal, url);
  assert.deepEqual(atualizacoesCena.map(t => t._id), ["t1"], "só os tokens deste ator vinculado");
});

test("6. Ator não vinculado: só o prototype; com a caixa desmarcada, a cena não muda", async () => {
  const a = cenario({ vinculado: false });
  await aplicarNoAtor(a.actor, "p.png", estado, { atualizarCena: true });
  assert.equal(a.atualizacoesCena.length, 0);
  const b = cenario();
  await aplicarNoAtor(b.actor, "p.png", estado, { atualizarCena: false });
  assert.equal(b.atualizacoesCena.length, 0);
});

test("8. Jogador sem permissão de upload e sem Mestre online: ajustes salvos como pendentes; nada quebra", async () => {
  const { actor } = cenario({ podeEnviar: false, mestre: null });
  avisos.length = 0;
  await aplicarToken(actor, {}, estado, { atualizarCena: true });
  assert.equal(actor.flags["icarus-rpg"].token.pendente, true);
  assert.equal(actor.flags["icarus-rpg"].token.molduraId, "guerreiro");
  assert.equal(actor.prototypeToken.texture.src, "x", "o token não muda enquanto pendente");
  assert.deepEqual(avisos, [["warn", "ICARUS.Token.SemMestre"]]);
});

test("8. O Mestre recusa: não dono, não PNG ou acima de 2 MB", () => {
  assert.equal(motivoDaRecusa({ dono: false, tipo: "image/png", bytes: 10, assinaturaPng: true }), "ICARUS.Token.RecusaDono");
  assert.equal(motivoDaRecusa({ dono: true, tipo: "image/jpeg", bytes: 10, assinaturaPng: false }), "ICARUS.Token.RecusaTipo");
  assert.equal(motivoDaRecusa({ dono: true, tipo: "image/png", bytes: 3 * 1024 * 1024, assinaturaPng: true }), "ICARUS.Token.RecusaTamanho");
  assert.equal(motivoDaRecusa({ dono: true, tipo: "image/png", bytes: 900 * 1024, assinaturaPng: true }), null);
});

test("2/9. Contexto da aba: galeria do manifesto; sem retrato (ícone padrão) avisa; retrato mudou avisa", () => {
  const { actor } = cenario();
  const ctx = contextoDoToken(actor, true);
  assert.equal(ctx.molduras.length, 22);
  assert.ok(ctx.molduras.every(m => m.url.includes("img/Icones/tokens/personagens/miniaturas/")));
  assert.equal(ctx.semRetrato, false);
  assert.equal(retratoDoAtor({ img: "icons/svg/mystery-man.svg" }), null);
  actor.flags["icarus-rpg"].token = { retratoSrc: "retratos/antigo.webp" };
  assert.equal(contextoDoToken(actor, true).retratoMudou, true);
  assert.equal(contextoDoToken(actor, true).tokensNaCena, true);
});
