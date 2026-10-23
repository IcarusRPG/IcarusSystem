/**
 * Interação por proximidade (serviço único, API em game.icarus.interacao / IcarusInteracao):
 * o personagem só interage com portas e objetos marcados a até 1,5 m (1 quadrado; configurável).
 * O Mestre é isento. Longe: aviso em destaque (sem repetir em menos de 1 s).
 * - Portas: o clique no controle da porta passa por aqui (wrapper do DoorControl) e o hook
 *   preUpdateWall barra outros caminhos (mudar o estado da porta de longe).
 * - Porta trancada perto: abre o fluxo de "tentar abrir" (module/porta-trancada.mjs).
 * - Tiles, notas e tokens com flags["icarus-rpg"].interacao.exigeProximidade: o duplo clique do
 *   jogador passa pela mesma checagem (caixa "Exigir proximidade" nas configurações).
 * Classes do Foundry pelo nome global (no v12 não são propriedades de globalThis).
 */
import { SISTEMA_ID } from "./config.mjs";
import { distanciaAoAlvo, alcanceEmPixels, dentroDoAlcance } from "./interacao-geometria.mjs";

const F = SISTEMA_ID;
const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);

/* eslint-disable no-undef */
const classes = () => ({
  DoorControl: foundry.canvas?.containers?.DoorControl ?? (typeof DoorControl !== "undefined" ? DoorControl : null),
  Note: foundry.canvas?.placeables?.Note ?? (typeof Note !== "undefined" ? Note : null),
  Tile: foundry.canvas?.placeables?.Tile ?? (typeof Tile !== "undefined" ? Tile : null),
  Token: foundry.canvas?.placeables?.Token ?? (typeof Token !== "undefined" ? Token : null)
});
/* eslint-enable no-undef */

/* ------------------------------ Quem interage e o alvo ------------------------------ */

/** Token do jogador: o controlado, ou o do personagem dele na cena. */
export function tokenDoJogador() {
  const controlado = canvas?.tokens?.controlled?.[0];
  if (controlado) return controlado;
  return game.user.character?.getActiveTokens?.(true, false)?.find(t => t.scene?.id === canvas?.scene?.id) ?? null;
}

/** Retângulo (px) ocupado pelo token. */
export function retanguloDoToken(token) {
  const d = token.document ?? token;
  const g = canvas.grid.size;
  return { x: d.x, y: d.y, w: d.width * g, h: d.height * g };
}

/** Forma do alvo para a geometria: parede/porta (segmento), tile/token (retângulo), nota (ponto). */
export function formaDoAlvo(alvo) {
  const d = alvo.document ?? alvo;
  const nome = d.documentName;
  if (nome === "Wall") return { tipo: "segmento", c: d.c };
  if (nome === "Tile") return { tipo: "retangulo", r: { x: d.x, y: d.y, w: d.width, h: d.height } };
  if (nome === "Token") return { tipo: "retangulo", r: retanguloDoToken(alvo) };
  return { tipo: "ponto", x: d.x, y: d.y };
}

/** Nome do alvo na mensagem ("esta porta", "este objeto"…). */
export function rotuloDoAlvo(alvo) {
  const nome = (alvo.document ?? alvo).documentName;
  return loc(nome === "Wall" ? "ICARUS.Interacao.EstaPorta" : nome === "Note" ? "ICARUS.Interacao.EstaNota" : "ICARUS.Interacao.EsteObjeto");
}

/** Alcance em metros (configuração) e em pixels na cena atual. */
export function alcanceAtual() {
  const metros = Number(game.settings.get(F, "alcanceInteracao")) || 1.5;
  const px = alcanceEmPixels({ tamanhoQuadrado: canvas.grid.size, distanciaQuadrado: canvas.scene?.grid?.distance ?? 1.5, distanciaMaxima: metros });
  return { metros, px };
}

/**
 * Distância do token ao alvo dentro do alcance?
 * @returns {{ ok: boolean, distancia: number, alcance: number }}
 */
export function checarProximidade(token, alvo) {
  const distancia = distanciaAoAlvo(retanguloDoToken(token), formaDoAlvo(alvo));
  const { px } = alcanceAtual();
  return { ok: dentroDoAlcance(distancia, px), distancia, alcance: px };
}

/* ------------------------------ Aviso ------------------------------ */

let ultimoAviso = { texto: "", em: 0 };

/** Aviso em destaque (faixa no topo, estilo Icarus) e notificação de reserva; não repete em < 1 s. */
export function avisar(texto) {
  const agora = Date.now();
  if (texto === ultimoAviso.texto && agora - ultimoAviso.em < 1000) return;
  ultimoAviso = { texto, em: agora };
  ui.notifications.warn(texto);
  document.getElementById("icarus-aviso-interacao")?.remove();
  const faixa = document.createElement("div");
  faixa.id = "icarus-aviso-interacao";
  faixa.className = "icarus-aviso-interacao";
  faixa.setAttribute("role", "alert");
  faixa.innerHTML = `<i class="fa-solid fa-hand" aria-hidden="true"></i> <span></span>`;
  faixa.querySelector("span").textContent = texto;
  document.body.appendChild(faixa);
  setTimeout(() => faixa.classList.add("saindo"), 2600);
  setTimeout(() => faixa.remove(), 3200);
}

export const avisarLonge = alvo => avisar(fmt("ICARUS.Interacao.Longe", { objeto: rotuloDoAlvo(alvo), alcance: String(alcanceAtual().metros).replace(".", ",") }));

/**
 * Exige proximidade para o usuário atual interagir com o alvo. O Mestre é isento.
 * @returns {boolean} pode interagir
 */
export function exigirProximidade(alvo) {
  if (game.user.isGM) return true;
  const token = tokenDoJogador();
  if (!token) { avisar(loc("ICARUS.Interacao.SelecioneToken")); return false; }
  if (checarProximidade(token, alvo).ok) return true;
  avisarLonge(alvo);
  return false;
}

/* ------------------------------ Portas ------------------------------ */

/** Ação ao clicar numa porta trancada perto (registrada por module/porta-trancada.mjs). */
export const AO_PORTA_TRANCADA = { fn: null };

function embrulharPortas() {
  const { DoorControl: Porta } = classes();
  const original = Porta?.prototype?._onMouseDown;
  if (!original || original._icarus) return;
  const embrulho = function (event, ...resto) {
    // Botão esquerdo de jogador: proximidade; trancada perto: tentar abrir
    if (game.user.isGM || (event?.button ?? event?.data?.button ?? 0) !== 0) return original.call(this, event, ...resto);
    const parede = this.wall;
    const pode = exigirProximidade(parede);
    if (pode && parede?.document?.ds === CONST.WALL_DOOR_STATES.LOCKED && AO_PORTA_TRANCADA.fn) {
      event?.stopPropagation?.();
      AO_PORTA_TRANCADA.fn(parede, tokenDoJogador());
      return false;
    }
    if (!pode) { event?.stopPropagation?.(); return false; }
    return original.call(this, event, ...resto);
  };
  embrulho._icarus = true;
  Porta.prototype._onMouseDown = embrulho;
}

/* ------------------------------ Tiles, notas e tokens ------------------------------ */

export const exigeProximidade = alvo => !!(alvo.document ?? alvo)?.flags?.[F]?.interacao?.exigeProximidade;

function embrulharDuploClique() {
  for (const Classe of [classes().Note, classes().Tile, classes().Token]) {
    const original = Classe?.prototype?._onClickLeft2;
    if (!original || original._icarus) continue;
    const embrulho = function (event, ...resto) {
      if (!game.user.isGM && exigeProximidade(this) && !exigirProximidade(this)) {
        event?.stopPropagation?.();
        return false;
      }
      return original.call(this, event, ...resto);
    };
    embrulho._icarus = true;
    Classe.prototype._onClickLeft2 = embrulho;
  }
}

/** Caixa "Exigir proximidade (1,5 m)" nas configurações de Tile, Nota e Token. */
function caixaNasConfiguracoes(app, html) {
  const doc = app.document ?? app.object;
  if (!doc) return;
  const raiz = html?.[0] ?? html;
  const form = raiz?.querySelector?.("form") ?? (raiz?.tagName === "FORM" ? raiz : null);
  if (!form || form.querySelector(".icarus-exige-proximidade")) return;
  const marcado = !!doc.flags?.[F]?.interacao?.exigeProximidade;
  const grupo = document.createElement("div");
  grupo.className = "form-group icarus-exige-proximidade";
  grupo.innerHTML = `<label></label><div class="form-fields"><input type="checkbox" name="flags.${F}.interacao.exigeProximidade"${marcado ? " checked" : ""}></div><p class="hint"></p>`;
  grupo.querySelector("label").textContent = fmt("ICARUS.Interacao.ExigirProximidade", { alcance: String(game.settings.get(F, "alcanceInteracao")).replace(".", ",") });
  grupo.querySelector(".hint").textContent = loc("ICARUS.Interacao.ExigirProximidadeDica");
  const destino = form.querySelector(".tab[data-tab]") ?? form;
  const rodape = destino === form ? form.querySelector("footer, .sheet-footer, button[type='submit']") : null;
  if (rodape) rodape.before(grupo); else destino.appendChild(grupo);
  app.setPosition?.({ height: "auto" });
}

/* ------------------------------ Barreira e cena ------------------------------ */

const avisadasCenas = new Set();

/** Avisa o Mestre (uma vez por cena) se a cena não estiver a 1,5 m por quadrado, em metros. */
function conferirCena() {
  const cena = canvas?.scene;
  if (!game.user.isGM || !cena || avisadasCenas.has(cena.id)) return;
  avisadasCenas.add(cena.id);
  const g = cena.grid;
  if (Number(g.distance) !== 1.5 || !/^m$/i.test(String(g.units ?? "").trim())) {
    ui.notifications.warn(fmt("ICARUS.Interacao.CenaFora", { cena: cena.name, distancia: g.distance, unidade: g.units || "?" }));
  }
}

export function registrarInteracao() {
  game.settings.register(F, "alcanceInteracao", {
    name: "ICARUS.Interacao.Config.Alcance", hint: "ICARUS.Interacao.Config.AlcanceDica",
    scope: "world", config: true, type: Number, default: 1.5
  });
  Hooks.once("setup", () => { embrulharPortas(); embrulharDuploClique(); });
  Hooks.on("canvasReady", conferirCena);
  for (const h of ["renderTileConfig", "renderNoteConfig", "renderTokenConfig"]) Hooks.on(h, caixaNasConfiguracoes);
  // Barreira: jogador mudando o estado de uma porta de longe (qualquer caminho)
  Hooks.on("preUpdateWall", (parede, mudancas, opcoes) => {
    if (game.user.isGM || opcoes.icarusPorta || !("ds" in (mudancas ?? {}))) return;
    if (!canvas?.ready || parede.parent?.id !== canvas.scene?.id) return;
    const objeto = parede.object ?? parede;
    if (!exigirProximidade(objeto)) return false;
  });
  game.icarus.interacao = { checarProximidade, exigirProximidade, tokenDoJogador, avisar };
  globalThis.IcarusInteracao = game.icarus.interacao;
}
