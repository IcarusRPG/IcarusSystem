/**
 * Barras de PV (vermelho) e PM (azul) abaixo do token e escudo com a Defesa no canto inferior
 * esquerdo, desenhados em PIXI (hooks drawToken/refreshToken; nada muda no protótipo do Token).
 * Valores sempre derivados (system.pv, system.pm, system.defesa.total). As barras padrão do
 * Foundry ficam ocultas no desenho (não há duas); o nome do token desce para não cobrir as barras.
 * Quem vê o quê: module/token-barras-dados.mjs (configurações do Mestre). Token que o jogador não
 * enxerga não desenha nada (o HUD é filho do token, some junto).
 * Desempenho: cada token só redesenha quando os valores mudam; a animação (300 ms) e o pulso de
 * PV baixo só usam o ticker enquanto acontecem.
 */
import { SISTEMA_ID } from "./config.mjs";
import { fracao, pvBaixo, visibilidade, layoutDoHud, textoDaBarra, categoriaDoAtor } from "./token-barras-dados.mjs";
import ARQUIVOS_UI from "./dados/arquivos-ui.mjs";

/** O arquivo opcional de interface existe no sistema? (lista gerada no build: tools/gerar-dados.mjs) */
export const existeArquivoUi = rel => ARQUIVOS_UI.arquivos.includes(rel);

const F = SISTEMA_ID;
const ANIMACAO_MS = 300;
const CORES = {
  moldura: 0xd8b45a, molduraEscura: 0x5a4a22, fundo: 0x0b0d14,
  pv: 0xb3121c, pvBrilho: 0xff5a4f, pm: 0x1d4ed8, pmBrilho: 0x6fa0ff,
  escudoFundo: 0x16111f, escudoRoxo: 0x8b5cf6, texto: 0xffffff
};
/** Arte opcional do escudo (img/ui/escudo-defesa.png): usada se existir. */
const ARTE_ESCUDO = `systems/${SISTEMA_ID}/img/ui/escudo-defesa.png`;
let arteEscudo = null;

const config = () => ({
  ativo: game.settings.get(F, "hudAtivo"),
  npcModo: game.settings.get(F, "hudNpcModo"),
  mostrarPM: game.settings.get(F, "hudMostrarPM"),
  mostrarDefesa: game.settings.get(F, "hudMostrarDefesa"),
  ocultarNpc: game.settings.get(F, "hudOcultarNpc"),
  ocultarAmeacas: game.settings.get(F, "hudOcultarAmeacas"),
  texto: game.settings.get(F, "hudTexto")
});
const ticker = () => canvas?.app?.ticker ?? PIXI.Ticker.shared;
const suave = t => 1 - Math.pow(1 - t, 3);

/** Uma barra (moldura metálica, fundo escuro, preenchimento com brilho, texto opcional). */
class Barra {
  constructor(pai, cor, brilho) {
    this.cor = cor;
    this.brilho = brilho;
    this.g = pai.addChild(new PIXI.Graphics());
    this.texto = null;
    this.mostrada = null;
    this.alvo = 0;
    this.pulso = 1;
  }

  /** Moldura e fundo (só quando o tamanho muda). */
  moldura(r) {
    this.r = r;
  }

  desenhar() {
    const { r } = this;
    const g = this.g;
    const raio = Math.min(r.h / 2, 4);
    const borda = Math.max(1, r.h * 0.14);
    g.clear();
    // Moldura metálica: contorno escuro + filete dourado
    g.beginFill(CORES.fundo, 0.92).lineStyle(borda, CORES.molduraEscura, 1).drawRoundedRect(r.x, r.y, r.w, r.h, raio).endFill();
    g.lineStyle(Math.max(0.75, borda * 0.5), CORES.moldura, 0.9).drawRoundedRect(r.x + borda * 0.5, r.y + borda * 0.5, r.w - borda, r.h - borda, Math.max(0, raio - 1));
    const f = this.mostrada ?? this.alvo;
    if (f > 0) {
      const ix = r.x + borda, iy = r.y + borda, iw = Math.max(0, (r.w - 2 * borda) * f), ih = r.h - 2 * borda;
      g.lineStyle(0);
      // Preenchimento com "gradiente": cor base, faixa de brilho em cima e filete claro
      g.beginFill(this.cor, this.pulso).drawRoundedRect(ix, iy, iw, ih, Math.max(0, raio - borda)).endFill();
      g.beginFill(this.brilho, 0.45 * this.pulso).drawRect(ix, iy, iw, ih * 0.42).endFill();
      g.beginFill(0xffffff, 0.35 * this.pulso).drawRect(ix, iy, iw, Math.max(0.5, ih * 0.12)).endFill();
    }
  }

  /** Novo valor: anima até ele (300 ms). */
  definir(f, animar) {
    if (this.mostrada === null || !animar) { this.mostrada = f; this.alvo = f; return this.desenhar(); }
    if (f === this.alvo) return;
    const de = this.mostrada;
    this.alvo = f;
    const inicio = performance.now();
    this.parar?.();
    const passo = () => {
      const t = Math.min(1, (performance.now() - inicio) / ANIMACAO_MS);
      this.mostrada = de + (f - de) * suave(t);
      this.desenhar();
      if (t >= 1) this.parar();
    };
    this.parar = () => { ticker().remove(passo); this.parar = null; };
    ticker().add(passo);
  }

  /** Pulso leve (PV baixo). */
  pulsar(ligar) {
    if (ligar === !!this.pararPulso) return;
    if (!ligar) { this.pararPulso(); this.pulso = 1; return this.desenhar(); }
    const inicio = performance.now();
    const passo = () => { this.pulso = 0.7 + 0.3 * (0.5 + 0.5 * Math.cos((performance.now() - inicio) / 260)); this.desenhar(); };
    this.pararPulso = () => { ticker().remove(passo); this.pararPulso = null; };
    ticker().add(passo);
  }

  rotulo(texto, visivel) {
    if (!visivel) { if (this.texto) this.texto.visible = false; return; }
    const tam = Math.max(9, Math.round(this.r.h * 1.15));
    if (!this.texto) {
      this.texto = this.g.parent.addChild(new PIXI.Text("", { fontFamily: "Signika, sans-serif", fontWeight: "700", fill: CORES.texto, stroke: 0x000000, strokeThickness: 3 }));
      this.texto.anchor.set(0.5, 0.5);
    }
    this.texto.style.fontSize = tam;
    this.texto.text = texto;
    this.texto.position.set(this.r.x + this.r.w / 2, this.r.y + this.r.h / 2);
    this.texto.visible = true;
  }

  destruir() { this.parar?.(); this.pararPulso?.(); }
}

/** Escudo com o valor da Defesa (desenho em PIXI ou a arte opcional). */
function desenharEscudo(c, r, valor) {
  c.removeChildren().forEach(x => x.destroy());
  if (arteEscudo) {
    const s = c.addChild(new PIXI.Sprite(arteEscudo));
    s.position.set(r.x, r.y);
    s.width = r.w; s.height = r.h;
  } else {
    const g = c.addChild(new PIXI.Graphics());
    const { x, y, w, h } = r;
    const borda = Math.max(1.5, w * 0.07);
    const caminho = gg => gg.moveTo(x, y).lineTo(x + w, y).lineTo(x + w, y + h * 0.55)
      .quadraticCurveTo(x + w, y + h * 0.85, x + w / 2, y + h).quadraticCurveTo(x, y + h * 0.85, x, y + h * 0.55).closePath();
    g.beginFill(CORES.escudoFundo, 0.95).lineStyle(borda, CORES.moldura, 1);
    caminho(g); g.endFill();
    // Brilho roxo por dentro
    g.lineStyle(Math.max(1, borda * 0.45), CORES.escudoRoxo, 0.65);
    const m = borda * 1.1;
    g.moveTo(x + m, y + m).lineTo(x + w - m, y + m).lineTo(x + w - m, y + h * 0.55)
      .quadraticCurveTo(x + w - m, y + h * 0.82, x + w / 2, y + h - m * 1.4).quadraticCurveTo(x + m, y + h * 0.82, x + m, y + h * 0.55).closePath();
  }
  const t = c.addChild(new PIXI.Text(String(valor), {
    fontFamily: "Cinzel, Signika, serif", fontWeight: "700", fontSize: Math.max(11, Math.round(r.w * 0.5)),
    fill: CORES.texto, stroke: 0x000000, strokeThickness: Math.max(2, Math.round(r.w * 0.08))
  }));
  t.anchor.set(0.5, 0.5);
  t.position.set(r.x + r.w / 2, r.y + r.h * 0.45);
}

/** HUD de um token. */
class HudDoToken {
  constructor(token) {
    this.token = token;
    this.raiz = token.addChild(new PIXI.Container());
    this.raiz.eventMode = "none";
    this.raiz.sortableChildren = false;
    this.pv = new Barra(this.raiz, CORES.pv, CORES.pvBrilho);
    this.pm = new Barra(this.raiz, CORES.pm, CORES.pmBrilho);
    this.escudo = this.raiz.addChild(new PIXI.Container());
    this.chave = null;
  }

  atualizar(forcar = false) {
    const token = this.token;
    const actor = token.actor;
    const cfg = config();
    if (!cfg.ativo || !actor?.system?.pv || token.destroyed) { this.raiz.visible = false; return; }
    const ver = visibilidade({ ehMestre: game.user.isGM, ehPJ: !!actor.hasPlayerOwner, categoria: categoriaDoAtor(actor), config: cfg });
    const s = actor.system;
    const w = token.w, h = token.h;
    const hover = !!token.hover || !!token.controlled;
    const chave = JSON.stringify([w, h, ver, s.pv.value, s.pv.max, s.pm.value, s.pm.max, s.defesa?.total, hover]);
    // Barras padrão do Foundry nunca aparecem junto com as nossas
    if (token.bars) token.bars.visible = false;
    this.raiz.visible = ver.pv || ver.pm || ver.defesa;
    // O Foundry reposiciona o nome a cada refresh: desce de novo mesmo sem mudança nos valores
    if (!forcar && chave === this.chave) return this.ajustarNome(ver);
    const tamanhoMudou = !this.chave || JSON.parse(this.chave)[0] !== w || JSON.parse(this.chave)[1] !== h;
    this.chave = chave;
    const l = layoutDoHud(w, h, { comPM: ver.pm });
    this.layout = l;
    this.ajustarNome(ver);
    const textoVisivel = ver.texto === "sempre" || (ver.texto === "passarMouse" && hover);
    // PV
    this.pv.g.visible = ver.pv;
    if (ver.pv) {
      this.pv.moldura(l.pv);
      this.pv.definir(fracao(s.pv.value, s.pv.max), !tamanhoMudou);
      this.pv.pulsar(pvBaixo(s.pv.value, s.pv.max));
      this.pv.rotulo(textoDaBarra(s.pv.value, s.pv.max, ver.numeros), textoVisivel);
    } else { this.pv.pulsar(false); this.pv.rotulo("", false); }
    // PM
    this.pm.g.visible = ver.pm;
    if (ver.pm) {
      this.pm.moldura(l.pm);
      this.pm.definir(fracao(s.pm.value, s.pm.max), !tamanhoMudou);
      this.pm.rotulo(textoDaBarra(s.pm.value, s.pm.max, true), textoVisivel);
    } else this.pm.rotulo("", false);
    // Escudo
    this.escudo.visible = ver.defesa;
    const chaveEscudo = `${w}|${h}|${s.defesa?.total ?? 0}|${!!arteEscudo}`;
    if (ver.defesa && (forcar || chaveEscudo !== this.chaveEscudo)) {
      this.chaveEscudo = chaveEscudo;
      desenharEscudo(this.escudo, l.escudo, s.defesa?.total ?? 0);
    }
  }

  /** O nome do token desce para baixo das barras. */
  ajustarNome(ver) {
    const nome = this.token.nameplate;
    if (!nome || !this.layout) return;
    if (ver.pv || ver.pm) nome.y = this.token.h + this.layout.ocupado + 2;
  }

  destruir() {
    this.pv.destruir();
    this.pm.destruir();
    if (!this.raiz.destroyed) this.raiz.destroy({ children: true });
  }
}

/* ------------------------------ Hooks ------------------------------ */

const hud = token => token?.icarusHud;
/** Tokens do ator na cena aberta (vinculados e o token de um ator não vinculado). */
function atualizarDoAtor(actor) { for (const t of actor?.getActiveTokens?.() ?? []) hud(t)?.atualizar(); }
export function atualizarTodos(forcar = true) { for (const t of canvas?.tokens?.placeables ?? []) hud(t)?.atualizar(forcar); }

export function registrarBarrasDoToken() {
  const mudou = () => atualizarTodos(true);
  const reg = (chave, dados) => game.settings.register(F, chave, { scope: "world", config: true, onChange: mudou, ...dados });
  reg("hudAtivo", { name: "ICARUS.Hud.Config.Ativo", hint: "ICARUS.Hud.Config.AtivoDica", type: Boolean, default: true });
  reg("hudNpcModo", { name: "ICARUS.Hud.Config.Npc", hint: "ICARUS.Hud.Config.NpcDica", type: String, default: "mestre",
    choices: { mestre: "ICARUS.Hud.Config.NpcMestre", porcentagem: "ICARUS.Hud.Config.NpcPorcentagem" } });
  // NPCs/mercadores e ameaças: barras ocultas para todos por padrão (até para o Mestre)
  reg("hudOcultarNpc", { name: "ICARUS.Hud.Config.OcultarNpc", hint: "ICARUS.Hud.Config.OcultarNpcDica", type: Boolean, default: true });
  reg("hudOcultarAmeacas", { name: "ICARUS.Hud.Config.OcultarAmeacas", hint: "ICARUS.Hud.Config.OcultarAmeacasDica", type: Boolean, default: true });
  reg("hudMostrarPM", { name: "ICARUS.Hud.Config.PM", type: Boolean, default: true });
  reg("hudMostrarDefesa", { name: "ICARUS.Hud.Config.Defesa", hint: "ICARUS.Hud.Config.DefesaDica", type: Boolean, default: true });
  reg("hudTexto", { name: "ICARUS.Hud.Config.Texto", type: String, default: "passarMouse",
    choices: { passarMouse: "ICARUS.Hud.Config.TextoMouse", sempre: "ICARUS.Hud.Config.TextoSempre", nunca: "ICARUS.Hud.Config.TextoNunca" } });

  Hooks.on("drawToken", token => {
    hud(token)?.destruir();
    token.icarusHud = new HudDoToken(token);
  });
  Hooks.on("refreshToken", token => hud(token)?.atualizar());
  Hooks.on("destroyToken", token => { hud(token)?.destruir(); token.icarusHud = null; });
  Hooks.on("updateActor", atualizarDoAtor);
  Hooks.on("updateToken", doc => hud(doc.object)?.atualizar());
  // Defesa muda com itens (armadura) e efeitos (condições)
  for (const h of ["createItem", "updateItem", "deleteItem", "createActiveEffect", "updateActiveEffect", "deleteActiveEffect"]) {
    Hooks.on(h, doc => { const a = doc.parent?.documentName === "Actor" ? doc.parent : doc.parent?.parent; if (a) atualizarDoAtor(a); });
  }
  Hooks.once("ready", async () => {
    // A lista do build diz se a arte existe (sem pedir ao servidor: arquivo ausente daria 404 no console)
    if (existeArquivoUi("img/ui/escudo-defesa.png")) { arteEscudo = await PIXI.Assets.load(ARTE_ESCUDO).catch(() => null); atualizarTodos(); }
  });
}
