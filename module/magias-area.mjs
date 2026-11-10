/**
 * Área da magia no mapa: ao lançar uma magia de área, o jogador posiciona o modelo (MeasuredTemplate)
 * antes de gastar o PM.
 *   - esfera / quadrado: o centro segue o mouse (encaixa na grade; Shift solta o encaixe);
 *   - cone / linha: saem do token do conjurador e apontam para o mouse (sem token: seguem o mouse e
 *     giram com Ctrl/Shift + roda);
 *   - "pessoal" / "centrada em você" / "ao seu redor": já fica no conjurador, sem posicionar.
 * Clique esquerdo confirma; clique direito ou Esc cancela (a magia não é lançada, o PM não é gasto).
 * Ao confirmar: cria o modelo na cena, marca como alvos os tokens dentro da área e passa a posição e a
 * direção para a animação (flags magiaVfx.area). Modelo de magia instantânea some depois da animação.
 * Regras puras (testáveis fora do Foundry): areaDaMagia, dadosDoTemplate, dentroDaArea.
 */
import { SISTEMA_ID } from "./config.mjs";

const F = SISTEMA_ID;
const semAcento = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const num = s => Number(String(s).replace(",", "."));

/* ------------------------------ Regras puras ------------------------------ */

/**
 * Área do texto da magia (alcance + alvo).
 * @returns {{forma:"esfera"|"cone"|"linha"|"quadrado", tamanho:number, noConjurador:boolean, opcional:boolean}|null}
 *   tamanho em metros: raio da esfera, comprimento do cone e da linha, lado do quadrado.
 *   opcional: "1 criatura, objeto ou esfera" — lança sem posicionar.
 */
export function areaDaMagia(system = {}) {
  const alvo = semAcento(system.alvo);
  const alcance = semAcento(system.alcance);
  const t = `${alvo} | ${alcance}`;
  if (/imagem de ate/.test(t)) return null;
  let r, forma;
  if ((r = t.match(/(?:esfera|esferas|cilindro) de (\d+(?:,\d+)?) m/))) forma = "esfera";
  else if ((r = t.match(/cone de (\d+(?:,\d+)?) m/))) forma = "cone";
  else if ((r = t.match(/linha de (\d+(?:,\d+)?) m/))) forma = "linha";
  else if ((r = t.match(/(?:cubo|quadrado) de (\d+(?:,\d+)?) m/))) forma = "quadrado";
  else return null;
  const pessoal = /^pessoal/.test(alcance) || /centrada em voce|ao seu redor/.test(t);
  return { forma, tamanho: num(r[1]), noConjurador: pessoal, opcional: /\bou (?:uma )?(?:esfera|cone|linha|cubo|quadrado)/.test(alvo) };
}

/** Ângulo do cone (graus) e largura da linha (metros) — os padrões do Foundry. */
export const ANGULO_CONE = 53.13;

/**
 * Dados do MeasuredTemplate para a área posicionada.
 * @param {{forma, tamanho}} area
 * @param {{x:number, y:number, direcao:number}} pos  px; direção em graus (0 = direita, horário)
 * @param {{pxPorMetro:number, largura?:number, angulo?:number}} o
 */
export function dadosDoTemplate(area, pos, { pxPorMetro, largura = 1.5, angulo = ANGULO_CONE }) {
  const base = { x: pos.x, y: pos.y, direction: pos.direcao ?? 0 };
  switch (area.forma) {
    case "cone": return { ...base, t: "cone", distance: area.tamanho, angle: angulo };
    case "linha": return { ...base, t: "ray", distance: area.tamanho, width: largura };
    case "quadrado": {
      // O "rect" do Foundry nasce no canto e mede pela diagonal: centralizar no ponto
      const meio = area.tamanho * pxPorMetro / 2;
      return { t: "rect", x: pos.x - meio, y: pos.y - meio, distance: Math.round(area.tamanho * Math.SQRT2 * 100) / 100, direction: 45 };
    }
    default: return { ...base, t: "circle", distance: area.tamanho };
  }
}

/** O centro do token (ponto, em px) está dentro da área posicionada? Folga de meio quadrado na largura da linha. */
export function dentroDaArea(area, ponto, { pxPorMetro, largura = 1.5, angulo = ANGULO_CONE, folga = 1 }) {
  const dx = ponto.x - area.x, dy = ponto.y - area.y;
  const dist = Math.hypot(dx, dy);
  const alcance = area.tamanho * pxPorMetro + folga;
  const rad = (area.direcao ?? 0) * Math.PI / 180;
  switch (area.forma) {
    case "cone": {
      if (dist > alcance) return false;
      if (dist < folga) return true;
      let d = Math.atan2(dy, dx) - rad;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      return Math.abs(d) <= (angulo / 2) * Math.PI / 180 + 1e-6;
    }
    case "linha": {
      const ao = dx * Math.cos(rad) + dy * Math.sin(rad);
      const lado = -dx * Math.sin(rad) + dy * Math.cos(rad);
      return ao >= -folga && ao <= alcance && Math.abs(lado) <= (largura * pxPorMetro) / 2 + folga;
    }
    case "quadrado": {
      const meio = area.tamanho * pxPorMetro / 2 + folga;
      return Math.abs(dx) <= meio && Math.abs(dy) <= meio;
    }
    default: return dist <= alcance;
  }
}

/** Cone e linha saem do conjurador e apontam (se ele tiver token na cena). */
export const apontaDoConjurador = area => area.forma === "cone" || area.forma === "linha";

/* ------------------------------ Foundry ------------------------------ */

const pxPorMetro = () => (canvas.grid?.size ?? 100) / (canvas.scene?.grid?.distance || canvas.dimensions?.distance || 1.5);
const larguraPadrao = () => canvas.scene?.grid?.distance || canvas.dimensions?.distance || 1.5;
const anguloPadrao = () => CONFIG.MeasuredTemplate?.defaults?.angle ?? ANGULO_CONE;
const centroDoToken = t => t.center ?? { x: t.x + t.w / 2, y: t.y + t.h / 2 };

/** Ponto do mouse com encaixe na grade (Shift solta). */
function pontoDoMouse(evento) {
  const p = evento.getLocalPosition(canvas.templates);
  if (evento.shiftKey) return { x: p.x, y: p.y };
  if (canvas.templates.getSnappedPoint) return canvas.templates.getSnappedPoint(p);
  const s = canvas.grid.getSnappedPosition(p.x, p.y, 2);
  return { x: s.x, y: s.y };
}

/**
 * Posicionamento interativo (prévia do modelo seguindo o mouse).
 * @returns {Promise<{x:number,y:number,direcao:number}|null>}  null = cancelado
 */
function posicionar(area, { origem, cor, ficha }) {
  const pxm = pxPorMetro();
  const opcoes = { pxPorMetro: pxm, largura: larguraPadrao(), angulo: anguloPadrao() };
  const aponta = apontaDoConjurador(area) && origem;
  const inicio = canvas.mousePosition ?? origem ?? { x: canvas.dimensions.width / 2, y: canvas.dimensions.height / 2 };
  const pos = aponta ? { x: origem.x, y: origem.y, direcao: Math.atan2(inicio.y - origem.y, inicio.x - origem.x) * 180 / Math.PI }
    : { x: inicio.x, y: inicio.y, direcao: 0 };
  const Doc = CONFIG.MeasuredTemplate.documentClass;
  const doc = new Doc({ ...dadosDoTemplate(area, pos, opcoes), user: game.user.id, fillColor: cor ?? game.user.color }, { parent: canvas.scene });
  const obj = new CONFIG.MeasuredTemplate.objectClass(doc);
  const camadaAntes = canvas.activeLayer;
  canvas.templates.activate();
  ficha?.minimize?.();

  return new Promise(resolve => {
    let ultimo = 0;
    const redesenhar = () => {
      doc.updateSource(dadosDoTemplate(area, pos, opcoes));
      if (obj.renderFlags) obj.renderFlags.set({ refresh: true });
      else obj.refresh?.();
    };
    const mover = evento => {
      const agora = Date.now();
      if (agora - ultimo < 25) return;
      ultimo = agora;
      const p = aponta ? evento.getLocalPosition(canvas.templates) : pontoDoMouse(evento);
      if (aponta) pos.direcao = Math.round(Math.atan2(p.y - origem.y, p.x - origem.x) * 180 / Math.PI);
      else { pos.x = p.x; pos.y = p.y; }
      redesenhar();
    };
    const girar = evento => {
      if (aponta || !(evento.ctrlKey || evento.shiftKey) || area.forma === "esfera") return;
      evento.preventDefault();
      evento.stopPropagation();
      pos.direcao += Math.sign(evento.deltaY || evento.deltaX) * 15;
      redesenhar();
    };
    const terminar = resultado => {
      canvas.stage.off("mousemove", mover);
      canvas.stage.off("mousedown", confirmar);
      canvas.app.view.removeEventListener("contextmenu", cancelar);
      canvas.app.view.removeEventListener("wheel", girar, { capture: true });
      window.removeEventListener("keydown", tecla, { capture: true });
      try { canvas.interface?.grid?.destroyHighlightLayer?.(obj.highlightId); } catch { /* sem destaque */ }
      if (!obj.destroyed) { obj.parent?.removeChild(obj); obj.destroy({ children: true }); }
      camadaAntes?.activate?.();
      ficha?.maximize?.();
      resolve(resultado);
    };
    const confirmar = evento => {
      if (evento.button !== 0) return;
      evento.stopPropagation();
      terminar({ x: pos.x, y: pos.y, direcao: ((pos.direcao % 360) + 360) % 360 });
    };
    const cancelar = evento => { evento.preventDefault(); terminar(null); };
    const tecla = evento => {
      if (evento.key !== "Escape") return;
      evento.preventDefault();
      evento.stopPropagation();
      terminar(null);
    };
    obj.draw().then(() => {
      canvas.templates.preview.addChild(obj);
      redesenhar();
      canvas.stage.on("mousemove", mover);
      canvas.stage.on("mousedown", confirmar);
      canvas.app.view.addEventListener("contextmenu", cancelar);
      canvas.app.view.addEventListener("wheel", girar, { capture: true, passive: false });
      window.addEventListener("keydown", tecla, { capture: true });
    });
  });
}

/** Marca como alvos (do usuário) os tokens dentro da área; o conjurador fica de fora quando a área sai dele. */
/**
 * Últimos alvos marcados por uma área: { magiaId, ids } (só neste cliente). Servem para aquela
 * magia; outro dano aplicado depois não usa esses alvos (module/dano.mjs → alvosDaAreaDeOutraMagia).
 */
let ultimaArea = null;
export const ultimaAreaMarcada = () => ultimaArea;

/** Os alvos atuais são os que a área de outra magia marcou (e o usuário não mexeu)? */
export function alvosDaAreaDeOutraMagia(idsAtuais, magiaIdDaMensagem) {
  if (!ultimaArea || !idsAtuais.length) return false;
  const iguais = idsAtuais.length === ultimaArea.ids.length && idsAtuais.every(id => ultimaArea.ids.includes(id));
  return iguais && ultimaArea.magiaId !== (magiaIdDaMensagem ?? null);
}

function marcarAlvosNaArea(areaPos, tokenConjurador, magiaId = null) {
  const opcoes = { pxPorMetro: pxPorMetro(), largura: larguraPadrao(), angulo: anguloPadrao(), folga: 1 };
  const tirarConjurador = apontaDoConjurador(areaPos) || areaPos.noConjurador;
  const dentro = canvas.tokens.placeables.filter(t => (game.user.isGM || (!t.document.hidden && t.visible !== false))
    && !(tirarConjurador && tokenConjurador && t.document.uuid === tokenConjurador.uuid)
    && dentroDaArea(areaPos, centroDoToken(t), opcoes));
  for (const t of [...game.user.targets]) t.setTarget(false, { releaseOthers: false, groupSelection: true });
  for (const t of dentro) t.setTarget(true, { releaseOthers: false, groupSelection: true });
  game.user.broadcastActivity?.({ targets: game.user.targets.ids ?? [...game.user.targets].map(t => t.id) });
  ultimaArea = { magiaId, ids: dentro.map(t => t.document.uuid) };
  return dentro;
}

/**
 * Pede a área no mapa (se a magia tiver e a opção estiver ligada), cria o modelo e marca os alvos.
 * @returns {Promise<object|undefined|null>}  área posicionada; undefined = magia sem área; null = cancelado
 */
export async function areaNoMapa({ actor, item, tokenConjurador, cor, instantanea }) {
  if (!canvas?.ready || !canvas.scene || !game.settings.get(F, "magiasPosicionarArea")) return undefined;
  const area = areaDaMagia(item.system);
  if (!area || area.opcional) return undefined;
  const origem = tokenConjurador?.object ? centroDoToken(tokenConjurador.object) : null;
  let pos;
  if (area.noConjurador && origem && !apontaDoConjurador(area)) pos = { x: origem.x, y: origem.y, direcao: 0 };
  else {
    ui.notifications.info(game.i18n.format("ICARUS.Magias.Area.Instrucoes", { nome: item.name }));
    pos = await posicionar(area, { origem, cor, ficha: actor.sheet?.rendered ? actor.sheet : null });
    if (!pos) return null;
  }
  const pxm = pxPorMetro();
  const dados = dadosDoTemplate(area, pos, { pxPorMetro: pxm, largura: larguraPadrao(), angulo: anguloPadrao() });
  const areaPos = { ...area, ...pos, cena: canvas.scene.id, angulo: anguloPadrao(), largura: larguraPadrao() };
  try {
    const [modelo] = await canvas.scene.createEmbeddedDocuments("MeasuredTemplate", [{
      ...dados, user: game.user.id, fillColor: cor ?? game.user.color,
      flags: { [F]: { magia: { id: item.flags?.[F]?.id ?? item.id, actorUuid: actor.uuid, nome: item.name } } }
    }]);
    areaPos.modeloUuid = modelo?.uuid ?? null;
    // Magia instantânea: o modelo some depois da animação
    if (modelo && instantanea) setTimeout(() => { if (canvas.scene?.templates?.has(modelo.id)) modelo.delete().catch(() => {}); }, 4500);
  } catch (erro) {
    console.warn("Icarus RPG | não foi possível criar o modelo da área", erro);
  }
  marcarAlvosNaArea(areaPos, tokenConjurador, item.flags?.[F]?.id ?? item.id);
  return areaPos;
}

export function registrarAreaDasMagias() {
  Hooks.once("init", () => {
    game.settings.register(F, "magiasPosicionarArea", {
      name: "ICARUS.Magias.Area.Opcao", hint: "ICARUS.Magias.Area.OpcaoDica",
      scope: "client", config: true, type: Boolean, default: true
    });
  });
}
