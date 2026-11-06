/**
 * Números flutuantes de PV (e PM, opcional) sobre os tokens, estilo RPG clássico:
 * dano em vermelho (−N) com "pop" e tremida, cura em verde (+N) subindo suave; somem em ~1,25 s.
 *
 * Detecção (em cada cliente, sem socket): cada cliente guarda o último PV/PM conhecido de cada token
 * da cena (semeado quando o token é desenhado; por isso carregar a cena ou criar o token não anima).
 * Em updateActor (vinculados) e updateToken (não vinculados, via delta) compara com o retrato e anima
 * a diferença. preUpdateActor/preUpdateToken guardam o valor anterior em options como reserva.
 * Visibilidade: a das barras (PJ: todos; NPC: opção do mundo), nunca em token que o jogador não enxerga.
 * Regras puras: module/numeros-pv-dados.mjs.
 */
import { SISTEMA_ID } from "./config.mjs";
import { existeArquivoUi } from "./token-barras.mjs";
import {
  mudancas, estiloDoNumero, podeVerNumero, deslocamento, quadro, excedentes,
  DURACAO_MS, ATRASO_MESMO_TOKEN
} from "./numeros-pv-dados.mjs";

const F = SISTEMA_ID;
const BASE = `systems/${SISTEMA_ID}`;
const SONS = { dano: "audio/ui/dano.ogg", cura: "audio/ui/cura.ogg" };
const cfg = k => game.settings.get(F, k);

/** Último PV/PM conhecido por token (uuid do TokenDocument). */
const retratos = new Map();
/** Números na tela: { texto, tokenId, inicio, x, y, subida, tipo, reduzido } */
const ativos = [];
let camada = null;
let tique = null;
let ultimoSom = 0;

const retrato = actor => (actor?.system?.pv ? { pv: actor.system.pv.value, pm: actor.system.pm?.value, pvMax: actor.system.pv.max } : null);

/** Guarda o retrato do token sem animar (carga da cena, token novo). */
function semear(doc, forcar = false) {
  if (!doc?.uuid || (!forcar && retratos.has(doc.uuid))) return;
  const r = retrato(doc.actor);
  if (r) retratos.set(doc.uuid, r);
}

/** Compara o token com o retrato e anima a diferença. */
function verificarToken(doc, reserva = null) {
  if (!doc?.actor || doc.parent?.id !== canvas?.scene?.id) return;
  const depois = retrato(doc.actor);
  if (!depois) return;
  const antes = retratos.get(doc.uuid) ?? reserva;
  retratos.set(doc.uuid, depois);
  if (!antes || !cfg("numerosAtivo")) return;
  const lista = mudancas(antes, depois, { pm: cfg("numerosPM") });
  if (!lista.length) return;
  const token = doc.object;
  if (!token) return;
  const visivel = !doc.hidden && (token.isVisible ?? token.visible) !== false;
  if (!podeVerNumero({ ehMestre: game.user.isGM, ehPJ: !!doc.actor.hasPlayerOwner, npcsParaJogadores: cfg("numerosNpc"), visivel })) return;
  for (const m of lista) {
    const max = m.recurso === "pm" ? doc.actor.system.pm?.max : depois.pvMax;
    mostrarNumero(token, estiloDoNumero({ ...m, max, depois: depois[m.recurso], tamanho: cfg("numerosTamanho") }));
  }
}

/** Todos os tokens do ator na cena exibida (o token, se o ator não for vinculado). */
function verificarAtor(actor, reserva) {
  const docs = actor.isToken ? [actor.token] : actor.getActiveTokens?.(false, true) ?? [];
  for (const d of docs) verificarToken(d, reserva);
}

/* ------------------------------ Desenho e animação ------------------------------ */

function garantirCamada() {
  if (camada && !camada.destroyed && camada.parent) return camada;
  camada = new PIXI.Container();
  camada.name = "icarus-numeros-pv";
  camada.eventMode = "none";
  camada.zIndex = 1000;
  (canvas.interface ?? canvas.stage).addChild(camada);
  return camada;
}

const reduzirMovimento = () => !!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function mostrarNumero(token, estilo) {
  const grade = canvas.grid?.size ?? 100;
  // Mesmo tamanho na tela com zoom afastado (até 2,2×); de perto, o tamanho natural
  const zoom = canvas.stage?.scale?.x || 1;
  const k = Math.max(1, Math.min(2.2, 1 / zoom));
  const tamanho = Math.round(grade * 0.36 * estilo.escala * k);
  const texto = new PIXI.Text(estilo.texto, {
    fontFamily: ["Signika", "Arial Black", "sans-serif"], fontWeight: "900", fontSize: tamanho,
    fill: estilo.cores.fill, fillGradientStops: [0.15, 0.85],
    stroke: 0x000000, strokeThickness: Math.max(3, Math.round(tamanho * 0.16)), lineJoin: "round",
    dropShadow: true, dropShadowColor: estilo.tipo === "dano" ? 0x000000 : estilo.cores.brilho,
    dropShadowBlur: estilo.tipo === "dano" ? 4 : Math.round(tamanho * 0.35), dropShadowDistance: estilo.tipo === "dano" ? 3 : 0, dropShadowAlpha: 0.85
  });
  texto.anchor.set(0.5, 1);
  texto.alpha = 0;
  // Fila: números do mesmo token saem em cascata, deslocados para os lados
  const doMesmo = ativos.filter(a => a.tokenId === token.id && !a.fim).length;
  for (let i = 0, n = excedentes(ativos.length); i < n; i++) encerrar(ativos[0]);
  const item = {
    texto, tokenId: token.id, tipo: estilo.tipo, reduzido: reduzirMovimento(),
    inicio: performance.now() + doMesmo * ATRASO_MESMO_TOKEN,
    x: token.x + token.w / 2 + deslocamento(doMesmo) * Math.max(token.w, grade),
    y: token.y + Math.min(grade * 0.1, token.h * 0.1),
    subida: grade * 0.75 * k, tremida: grade * 0.06 * k
  };
  texto.position.set(item.x, item.y);
  garantirCamada().addChild(texto);
  ativos.push(item);
  tocarSom(estilo.tipo);
  ligarTique();
}

function encerrar(item) {
  if (!item) return;
  item.fim = true;
  const i = ativos.indexOf(item);
  if (i >= 0) ativos.splice(i, 1);
  if (!item.texto.destroyed) item.texto.destroy(true);
}

function animar() {
  const agora = performance.now();
  for (const item of [...ativos]) {
    const t = (agora - item.inicio) / DURACAO_MS;
    if (t < 0) continue;
    if (t >= 1 || item.texto.destroyed) { encerrar(item); continue; }
    const q = quadro(t, { tipo: item.tipo, reduzido: item.reduzido });
    item.texto.alpha = q.alpha;
    item.texto.scale.set(q.escala);
    item.texto.position.set(item.x + q.tremida * item.tremida, item.y - q.subida * item.subida);
  }
  if (!ativos.length) desligarTique();
}

function ligarTique() {
  if (tique) return;
  tique = animar;
  canvas.app.ticker.add(tique);
}
function desligarTique() {
  if (!tique) return;
  canvas.app?.ticker?.remove(tique);
  tique = null;
}

/** Limpa tudo (troca de cena). */
function limpar() {
  for (const item of [...ativos]) encerrar(item);
  desligarTique();
  if (camada && !camada.destroyed) camada.destroy({ children: true });
  camada = null;
  retratos.clear();
}

function tocarSom(tipo) {
  if (!cfg("numerosSom")) return;
  const rel = tipo === "dano" ? SONS.dano : tipo === "cura" ? SONS.cura : null;
  if (!rel || !existeArquivoUi(rel)) return;
  const agora = performance.now();
  if (agora - ultimoSom < 150) return; // dano em área: um som só
  ultimoSom = agora;
  /* eslint-disable-next-line no-undef */
  const Audio = foundry.audio?.AudioHelper ?? (typeof AudioHelper !== "undefined" ? AudioHelper : null);
  Audio?.play({ src: `${BASE}/${rel}`, volume: 0.6, autoplay: true, loop: false }, false);
}

/* ------------------------------ Registro ------------------------------ */

const tocaRecursos = mudou => {
  const s = mudou?.system ?? mudou?.delta?.system ?? mudou?.actorData?.system;
  return !!s && ("pv" in s || "pm" in s);
};

export function registrarNumerosDePV() {
  const reg = (chave, escopo, dados) => game.settings.register(F, chave, { scope: escopo, config: true, ...dados });
  reg("numerosAtivo", "client", { name: "ICARUS.Numeros.Config.Ativo", hint: "ICARUS.Numeros.Config.AtivoDica", type: Boolean, default: true });
  reg("numerosTamanho", "client", { name: "ICARUS.Numeros.Config.Tamanho", type: String, default: "m",
    choices: { p: "ICARUS.Numeros.Config.Pequeno", m: "ICARUS.Numeros.Config.Medio", g: "ICARUS.Numeros.Config.Grande" } });
  reg("numerosSom", "client", { name: "ICARUS.Numeros.Config.Som", hint: "ICARUS.Numeros.Config.SomDica", type: Boolean, default: true });
  reg("numerosNpc", "world", { name: "ICARUS.Numeros.Config.Npc", hint: "ICARUS.Numeros.Config.NpcDica", type: Boolean, default: true });
  reg("numerosPM", "world", { name: "ICARUS.Numeros.Config.PM", hint: "ICARUS.Numeros.Config.PMDica", type: Boolean, default: false });

  // Valor anterior em options (reserva para quando o retrato ainda não existe neste cliente)
  Hooks.on("preUpdateActor", (actor, mudou, options) => { if (tocaRecursos(mudou)) options.icarusPvAntes = retrato(actor); });
  Hooks.on("preUpdateToken", (doc, mudou, options) => { if (tocaRecursos(mudou)) options.icarusPvAntes = retrato(doc.actor); });
  Hooks.on("updateActor", (actor, mudou, options) => { if (tocaRecursos(mudou)) verificarAtor(actor, options?.icarusPvAntes ?? null); });
  Hooks.on("updateToken", (doc, mudou, options) => { if (tocaRecursos(mudou)) verificarToken(doc, options?.icarusPvAntes ?? null); });
  // Retratos sem animar: token desenhado (carga da cena, token novo, troca de ator)
  Hooks.on("drawToken", token => semear(token.document));
  Hooks.on("deleteToken", doc => retratos.delete(doc.uuid));
  Hooks.on("canvasTearDown", limpar);
  Hooks.on("canvasReady", () => { for (const t of canvas.tokens?.placeables ?? []) semear(t.document, true); });
}

/** Para testes do navegador. */
export const _numeros = { ativos, retratos, verificarToken, verificarAtor, limpar };
