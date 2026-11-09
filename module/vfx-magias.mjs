/**
 * Animações das magias de dano (sem módulos externos).
 * Disparo: cada cliente, ao receber a rolagem da magia (flags["icarus-rpg"].magiaVfx), desenha
 * localmente (sem socket). Só desenha na cena exibida e com tokens visíveis para o usuário.
 * Ordem de preferência:
 *   1. vídeo do usuário em img/animacoes/magias/<id>.webm (ou .mp4), se existir (lista do build);
 *   2. efeito procedural (PIXI) pelo preset do bloco de automação:
 *      projetil, explosao, cone, linha, pilar, chuva, aura, nuvem — cor e partículas pelo elemento.
 * Duração ~1 a 1,6 s; respeita "reduzir movimento" (só um clarão) e a opção do usuário.
 * Som opcional: audio/magias/<elemento>.ogg.
 */
import { SISTEMA_ID } from "./config.mjs";
import { existeArquivoUi } from "./token-barras.mjs";

const F = SISTEMA_ID;
const BASE = `systems/${SISTEMA_ID}`;
const cfg = k => game.settings.get(F, k);

/** Cores e partícula por elemento: [principal, clara, forma] */
export const ELEMENTOS = {
  fogo: { cor: 0xff6a1a, clara: 0xffd27a, forma: "brasa" },
  frio: { cor: 0x5fc8ff, clara: 0xe6f8ff, forma: "estilhaco" },
  eletrico: { cor: 0x7fb8ff, clara: 0xffffff, forma: "faisca" },
  acido: { cor: 0x5ccf2e, clara: 0xd6ff9e, forma: "bolha" },
  luz: { cor: 0xffc93a, clara: 0xfff6c8, forma: "raio" },
  trevas: { cor: 0x4b1f7a, clara: 0xa77bd8, forma: "fumaca" },
  essencia: { cor: 0x9b4dff, clara: 0xe2c8ff, forma: "brasa" },
  sangue: { cor: 0x8a0f1c, clara: 0xff5a64, forma: "gota" },
  espirito: { cor: 0x9fc4ff, clara: 0xf0f6ff, forma: "fiapo" },
  natureza: { cor: 0x3f9e3a, clara: 0xb8f08a, forma: "folha" },
  arcano: { cor: 0x8b5cf6, clara: 0xe0d0ff, forma: "runa" }
};
const INTENSIDADE = { baixa: 0.5, media: 1, alta: 1.6 };

/* ------------------------------ Geometria ------------------------------ */

const centro = t => ({ x: t.x + t.w / 2, y: t.y + t.h / 2 });
const metrosEmPx = m => (Number(m) || 0) / (canvas.scene?.grid?.distance || canvas.dimensions?.distance || 1.5) * (canvas.grid?.size ?? 100);

/** Pontos da animação: origem (conjurador) e alvos visíveis; centro = média dos alvos. */
export function pontosDaAnimacao(origem, alvos) {
  const o = origem ? centro(origem) : null;
  const a = alvos.map(centro);
  const meio = a.length ? { x: a.reduce((s, p) => s + p.x, 0) / a.length, y: a.reduce((s, p) => s + p.y, 0) / a.length } : o;
  return { origem: o, alvos: a, meio };
}

/* ------------------------------ Partículas ------------------------------ */

class Cena {
  constructor() {
    this.raiz = new PIXI.Container();
    this.raiz.eventMode = "none";
    (canvas.interface ?? canvas.stage).addChild(this.raiz);
    this.itens = [];
    this.inicio = performance.now();
    this.fim = 0;
    this.tique = () => this.animar();
    canvas.app.ticker.add(this.tique);
  }
  /** Agenda um objeto: atualizar(obj, t de 0 a 1) do instante atraso por duracao ms. */
  add(obj, { atraso = 0, duracao = 800, atualizar }) {
    obj.visible = false;
    this.raiz.addChild(obj);
    this.itens.push({ obj, atraso, duracao, atualizar });
    this.fim = Math.max(this.fim, atraso + duracao);
    return obj;
  }
  animar() {
    const agora = performance.now() - this.inicio;
    for (const it of this.itens) {
      const t = (agora - it.atraso) / it.duracao;
      if (it.obj.destroyed) continue;
      it.obj.visible = t >= 0 && t <= 1;
      if (t >= 0 && t <= 1) it.atualizar(it.obj, t);
    }
    if (agora > this.fim + 50) this.destruir();
  }
  destruir() {
    canvas.app?.ticker?.remove(this.tique);
    if (!this.raiz.destroyed) this.raiz.destroy({ children: true });
  }
}

const sai = t => 1 - Math.pow(1 - t, 3);
const aleat = (a, b) => a + Math.random() * (b - a);

/** Uma partícula pela forma do elemento. */
function particula(el, tam) {
  const g = new PIXI.Graphics();
  const cor = Math.random() < 0.5 ? el.cor : el.clara;
  g.beginFill(cor, 1);
  switch (el.forma) {
    case "estilhaco": g.drawPolygon([0, -tam, tam * 0.4, 0, 0, tam, -tam * 0.4, 0]); break;
    case "faisca": g.drawRect(-tam, -tam * 0.2, tam * 2, tam * 0.4); break;
    case "bolha": g.endFill(); g.lineStyle(Math.max(1, tam * 0.3), cor, 1).drawCircle(0, 0, tam); break;
    case "gota": g.drawEllipse(0, 0, tam * 0.6, tam); break;
    case "folha": g.drawEllipse(0, 0, tam, tam * 0.45); break;
    case "fumaca": g.drawCircle(0, 0, tam * 1.6); g.alpha = 0.6; break;
    case "runa": g.drawRect(-tam * 0.6, -tam * 0.6, tam * 1.2, tam * 1.2); break;
    default: g.drawCircle(0, 0, tam);
  }
  g.endFill();
  g.blendMode = el.forma === "fumaca" ? PIXI.BLEND_MODES.NORMAL : PIXI.BLEND_MODES.ADD;
  return g;
}

/** Explosão de partículas a partir de um ponto (raio em px). */
function estouro(cena, el, p, raio, n, { atraso = 0, duracao = 700, direcao = null, abertura = Math.PI * 2 } = {}) {
  for (let i = 0; i < n; i++) {
    const ang = direcao === null ? aleat(0, Math.PI * 2) : direcao + aleat(-abertura / 2, abertura / 2);
    const dist = raio * aleat(0.35, 1);
    const tam = Math.min(14, Math.max(2, raio * aleat(0.03, 0.07)));
    const g = particula(el, tam);
    g.rotation = ang;
    cena.add(g, {
      atraso: atraso + aleat(0, 120), duracao: duracao * aleat(0.7, 1.1),
      atualizar: (o, t) => { const k = sai(t); o.position.set(p.x + Math.cos(ang) * dist * k, p.y + Math.sin(ang) * dist * k); o.alpha = 1 - t; o.scale.set(1 - t * 0.5); }
    });
  }
}

/** Clarão e onda de choque. */
function clarao(cena, el, p, raio, { atraso = 0, duracao = 600 } = {}) {
  const luz = new PIXI.Graphics().beginFill(el.clara, 0.9).drawCircle(0, 0, raio).endFill();
  luz.blendMode = PIXI.BLEND_MODES.ADD;
  luz.position.set(p.x, p.y);
  cena.add(luz, { atraso, duracao: duracao * 0.6, atualizar: (o, t) => { o.scale.set(0.15 + sai(t) * 0.75); o.alpha = (1 - t) * 0.4; } });
  const onda = new PIXI.Graphics().lineStyle(Math.max(3, raio * 0.08), el.cor, 1).drawCircle(0, 0, raio);
  onda.position.set(p.x, p.y);
  cena.add(onda, { atraso, duracao, atualizar: (o, t) => { o.scale.set(0.1 + sai(t) * 1.05); o.alpha = 1 - t; } });
}

/** Projétil com rastro de origem até destino; ao chegar, um estouro pequeno. */
function projetil(cena, el, de, ate, tam, n, { atraso = 0 } = {}) {
  const dur = Math.min(700, 250 + Math.hypot(ate.x - de.x, ate.y - de.y) * 0.5);
  for (let r = 0; r < 6; r++) {
    const g = particula(el, tam * (1 - r * 0.12));
    g.alpha = 1 - r * 0.15;
    cena.add(g, { atraso: atraso + r * 18, duracao: dur, atualizar: (o, t) => { const k = sai(t); o.position.set(de.x + (ate.x - de.x) * k, de.y + (ate.y - de.y) * k); } });
  }
  estouro(cena, el, ate, tam * 6, n, { atraso: atraso + dur, duracao: 500 });
  clarao(cena, el, ate, tam * 4, { atraso: atraso + dur, duracao: 450 });
}

/** Raio (linha) com zigue-zague para elétrico; feixe reto para os demais. */
function feixe(cena, el, de, ate, largura) {
  const g = new PIXI.Graphics();
  g.blendMode = PIXI.BLEND_MODES.ADD;
  cena.add(g, {
    duracao: 700,
    atualizar: (o, t) => {
      o.clear();
      const passos = el.forma === "faisca" ? 10 : 1;
      const perp = Math.atan2(ate.y - de.y, ate.x - de.x) + Math.PI / 2;
      for (const [cor, w] of [[el.cor, largura], [el.clara, largura * 0.4]]) {
        o.lineStyle(w * (1 - t * 0.6), cor, 1 - t).moveTo(de.x, de.y);
        for (let i = 1; i <= passos; i++) {
          const k = i / passos, jit = i === passos ? 0 : aleat(-1, 1) * largura * 1.5;
          o.lineTo(de.x + (ate.x - de.x) * k + Math.cos(perp) * jit, de.y + (ate.y - de.y) * k + Math.sin(perp) * jit);
        }
      }
    }
  });
}

/* ------------------------------ Presets ------------------------------ */

function tocarProcedural(dados, pontos) {
  const el = ELEMENTOS[dados.elemento] ?? ELEMENTOS.arcano;
  const grade = canvas.grid?.size ?? 100;
  const k = INTENSIDADE[cfg("magiasIntensidade")] ?? 1;
  const n = m => Math.max(4, Math.round(m * k));
  const cena = new Cena();
  const { origem, alvos, meio } = pontos;
  const raioArea = dados.area?.tamanho ? metrosEmPx(dados.area.tamanho) : grade * 1.2;
  const preset = dados.preset;
  if (globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    for (const p of alvos.length ? alvos : [meio]) if (p) clarao(cena, el, p, grade * 0.8, { duracao: 500 });
    return;
  }
  if (preset === "projetil" && origem && alvos.length) {
    alvos.forEach((a, i) => projetil(cena, el, origem, a, grade * 0.12, n(14), { atraso: i * 120 }));
  } else if (preset === "explosao" && meio) {
    if (origem && origem !== meio) projetil(cena, el, origem, meio, grade * 0.14, n(6));
    const atraso = origem && origem !== meio ? Math.min(700, 250 + Math.hypot(meio.x - origem.x, meio.y - origem.y) * 0.5) : 0;
    clarao(cena, el, meio, raioArea, { atraso, duracao: 800 });
    estouro(cena, el, meio, raioArea, n(60), { atraso, duracao: 900 });
  } else if ((preset === "cone" || preset === "linha") && origem) {
    const destino = meio && meio !== origem ? meio : { x: origem.x + grade, y: origem.y };
    const ang = Math.atan2(destino.y - origem.y, destino.x - origem.x);
    const alcance = dados.area?.tamanho ? metrosEmPx(dados.area.tamanho) : Math.hypot(destino.x - origem.x, destino.y - origem.y);
    if (preset === "cone") estouro(cena, el, origem, alcance, n(70), { direcao: ang, abertura: Math.PI / 3, duracao: 900 });
    else {
      const fim = { x: origem.x + Math.cos(ang) * alcance, y: origem.y + Math.sin(ang) * alcance };
      feixe(cena, el, origem, fim, grade * 0.18);
      for (const a of alvos) estouro(cena, el, a, grade * 0.5, n(10), { atraso: 150, duracao: 500 });
    }
  } else if (preset === "pilar" && meio) {
    const coluna = new PIXI.Graphics().beginFill(el.clara, 0.85).drawRect(-raioArea * 0.35, -grade * 6, raioArea * 0.7, grade * 6).endFill();
    coluna.blendMode = PIXI.BLEND_MODES.ADD;
    coluna.position.set(meio.x, meio.y);
    cena.add(coluna, { duracao: 600, atualizar: (o, t) => { o.scale.set(1, sai(Math.min(1, t * 2))); o.alpha = 1 - t * 0.8; } });
    clarao(cena, el, meio, raioArea, { atraso: 250, duracao: 700 });
    estouro(cena, el, meio, raioArea, n(50), { atraso: 250, duracao: 800 });
  } else if (preset === "chuva" && meio) {
    for (let i = 0; i < n(18); i++) {
      const p = { x: meio.x + aleat(-1, 1) * raioArea, y: meio.y + aleat(-1, 1) * raioArea };
      projetil(cena, el, { x: p.x - grade * 0.5, y: p.y - grade * 3 }, p, grade * 0.08, n(4), { atraso: i * 50 });
    }
  } else {
    // aura / nuvem / sem alvo: anel pulsando em cada alvo (ou no conjurador)
    for (const p of alvos.length ? alvos : [origem].filter(Boolean)) {
      clarao(cena, el, p, grade * 0.7, { duracao: 700 });
      estouro(cena, el, p, grade * 0.7, n(16), { duracao: 700 });
    }
  }
}

/* ------------------------------ Vídeo do usuário ------------------------------ */

function arquivoDeVideo(id) {
  if (!id) return null;
  for (const ext of ["webm", "mp4"]) if (existeArquivoUi(`img/animacoes/magias/${id}.${ext}`)) return `${BASE}/img/animacoes/magias/${id}.${ext}`;
  return null;
}

async function tocarVideo(src, pontos, dados) {
  const p = pontos.meio ?? pontos.origem;
  if (!p) return;
  const textura = await PIXI.Assets.load(src).catch(() => null);
  if (!textura) return tocarProcedural(dados, pontos);
  const video = textura.baseTexture.resource.source;
  video.loop = false;
  video.muted = true;
  video.currentTime = 0;
  const sprite = new PIXI.Sprite(textura);
  sprite.anchor.set(0.5);
  const lado = dados.area?.tamanho ? metrosEmPx(dados.area.tamanho) * 2 : (canvas.grid?.size ?? 100) * 2;
  sprite.width = sprite.height = lado;
  sprite.position.set(p.x, p.y);
  sprite.eventMode = "none";
  (canvas.interface ?? canvas.stage).addChild(sprite);
  const fim = () => { if (!sprite.destroyed) sprite.destroy(); };
  video.addEventListener("ended", fim, { once: true });
  setTimeout(fim, 8000);
  video.play().catch(fim);
}

/* ------------------------------ Disparo ------------------------------ */

/** Toca a animação de uma rolagem de magia neste cliente (exportada para testes). */
export function tocarAnimacao(dados) {
  if (!canvas?.ready || !cfg("magiasAnimacoes")) return;
  const visivel = d => d && d.parent?.id === canvas.scene?.id && d.object && (game.user.isGM || (!d.hidden && d.object.isVisible !== false));
  const origemDoc = dados.origem ? fromUuidSync(dados.origem) : null;
  const alvos = (dados.alvos ?? []).map(u => fromUuidSync(u)).filter(visivel).map(d => d.object);
  const origem = visivel(origemDoc) ? origemDoc.object : null;
  if (!origem && !alvos.length) return;
  const pontos = pontosDaAnimacao(origem, alvos);
  const video = arquivoDeVideo(dados.id);
  if (video) tocarVideo(video, pontos, dados);
  else tocarProcedural(dados, pontos);
  if (cfg("magiasSom") && existeArquivoUi(`audio/magias/${dados.elemento}.ogg`)) {
    /* eslint-disable-next-line no-undef */
    const Audio = foundry.audio?.AudioHelper ?? (typeof AudioHelper !== "undefined" ? AudioHelper : null);
    Audio?.play({ src: `${BASE}/audio/magias/${dados.elemento}.ogg`, volume: 0.6, autoplay: true, loop: false }, false);
  }
}

export function registrarAnimacoesDeMagias() {
  const reg = (chave, dados) => game.settings.register(F, chave, { scope: "client", config: true, ...dados });
  Hooks.once("init", () => {
    reg("magiasAnimacoes", { name: "ICARUS.Magias.Config.Animacoes", hint: "ICARUS.Magias.Config.AnimacoesDica", type: Boolean, default: true });
    reg("magiasIntensidade", { name: "ICARUS.Magias.Config.Intensidade", type: String, default: "media",
      choices: { baixa: "ICARUS.Magias.Config.Baixa", media: "ICARUS.Magias.Config.Media", alta: "ICARUS.Magias.Config.Alta" } });
    reg("magiasSom", { name: "ICARUS.Magias.Config.Som", hint: "ICARUS.Magias.Config.SomDica", type: Boolean, default: true });
  });
  // Cada cliente desenha quando a rolagem da magia chega (sem socket)
  Hooks.on("createChatMessage", mensagem => {
    const dados = mensagem.flags?.[F]?.magiaVfx;
    if (!dados || !mensagem.visible) return;
    try { tocarAnimacao(dados); } catch (err) { console.error("Icarus RPG | animação de magia", err); }
  });
}
