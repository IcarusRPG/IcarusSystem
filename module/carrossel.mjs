/**
 * Carrossel de combate do Icarus: faixa de cartas no topo (ou na base) com os combatentes na ordem
 * de iniciativa, complementando o Combat Tracker. Turno ativo maior, com brilho, runa e coroa; os
 * 2 próximos destacados; troca de turno desliza; banner "RODADA N"; aviso "SEU TURNO".
 * Elemento fixo (sem janela): só as cartas e os botões recebem cliques; não cobre a barra de cenas
 * nem a barra lateral. As cartas são reaproveitadas por id (as transições animam a troca de turno).
 * Arte opcional em img/ui/carrossel/ (carta.png, carta-ativa.png, faixa.png, banner-rodada.png) e
 * som opcional em audio/ui/seu-turno.ogg: usados se existirem; senão, CSS.
 * Se o módulo "Combat Carousel" estiver ativo, o nosso fica desligado (o Mestre pode forçar).
 */
import { SISTEMA_ID } from "./config.mjs";
import { cartasDoCombate, rodadaNova } from "./carrossel-dados.mjs";
import { existeArquivoUi } from "./token-barras.mjs";

const F = SISTEMA_ID;
const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);
const BASE = `systems/${SISTEMA_ID}`;
const ARTES = { carta: "img/ui/carrossel/carta.png", cartaAtiva: "img/ui/carrossel/carta-ativa.png", faixa: "img/ui/carrossel/faixa.png", banner: "img/ui/carrossel/banner-rodada.png" };
const SOM_SEU_TURNO = "audio/ui/seu-turno.ogg";
const existentes = { artes: {}, som: false };

const cfg = k => game.settings.get(F, k);
const moduloConcorrente = () => !!game.modules?.get("combat-carousel")?.active;
const ligado = () => cfg("carrosselAtivo") && cfg("carrosselMostrar") && (!moduloConcorrente() || cfg("carrosselForcar"));

/** Combate a mostrar: o da cena que o usuário está vendo (ou sem cena), com combatentes. */
function combateDaCena() {
  const c = game.combat;
  if (!c || !c.combatants.size) return null;
  if (c.scene && c.scene.id !== canvas?.scene?.id) return null;
  return c;
}

/** Combatentes na ordem do Foundry (combat.turns), no formato da lógica pura. */
function combatentesDe(combate) {
  return combate.turns.map(cb => {
    const actor = cb.actor;
    const s = actor?.system;
    return {
      id: cb.id, nome: cb.name, img: cb.token?.texture?.src || cb.img || actor?.img,
      iniciativa: cb.initiative, oculto: cb.hidden, derrotado: cb.isDefeated,
      disposicao: cb.token?.disposition ?? 0, ehPJ: !!actor?.hasPlayerOwner,
      pv: s?.pv ? { value: s.pv.value, max: s.pv.max } : null, pm: s?.pm ? { value: s.pm.value, max: s.pm.max } : null
    };
  });
}

const visao = () => ({
  ehMestre: game.user.isGM,
  mostrarBarras: cfg("carrosselBarras"),
  hud: { npcModo: cfg("hudNpcModo"), mostrarPM: cfg("hudMostrarPM"), mostrarDefesa: cfg("hudMostrarDefesa"), texto: cfg("hudTexto") }
});

/* ------------------------------ Elemento ------------------------------ */

class Carrossel {
  constructor() {
    this.el = null;
    this.cartas = new Map();
    this.ultimo = { combateId: null, rodada: null, turnoId: null };
    this.agendado = false;
  }

  montar() {
    if (this.el) return;
    const el = document.createElement("section");
    el.id = "icarus-carrossel";
    el.className = "icarus-carrossel";
    el.setAttribute("aria-label", loc("ICARUS.Carrossel.Titulo"));
    el.innerHTML = `
      <div class="carrossel-faixa">
        <div class="carrossel-rodada" aria-live="polite"><span></span><b></b></div>
        <button type="button" class="carrossel-seta esq" aria-label=""><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>
        <div class="carrossel-trilho" role="list"></div>
        <button type="button" class="carrossel-seta dir" aria-label=""><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>
        <div class="carrossel-mestre" hidden>
          <button type="button" data-acao="anterior" aria-label=""><i class="fa-solid fa-backward-step" aria-hidden="true"></i></button>
          <button type="button" data-acao="proximo" aria-label=""><i class="fa-solid fa-forward-step" aria-hidden="true"></i></button>
          <button type="button" data-acao="encerrar" aria-label=""><i class="fa-solid fa-flag-checkered" aria-hidden="true"></i></button>
        </div>
      </div>`;
    el.querySelector(".carrossel-rodada span").textContent = loc("ICARUS.Carrossel.Rodada");
    const titulos = { anterior: "ICARUS.Carrossel.Anterior", proximo: "ICARUS.Carrossel.Proximo", encerrar: "ICARUS.Carrossel.Encerrar" };
    for (const b of el.querySelectorAll("[data-acao]")) {
      b.title = b.ariaLabel = loc(titulos[b.dataset.acao]);
      b.addEventListener("click", () => this.acaoDoMestre(b.dataset.acao));
    }
    const trilho = el.querySelector(".carrossel-trilho");
    el.querySelector(".esq").title = el.querySelector(".esq").ariaLabel = loc("ICARUS.Carrossel.RolarEsquerda");
    el.querySelector(".dir").title = el.querySelector(".dir").ariaLabel = loc("ICARUS.Carrossel.RolarDireita");
    el.querySelector(".esq").addEventListener("click", () => trilho.scrollBy({ left: -trilho.clientWidth * 0.6, behavior: "smooth" }));
    el.querySelector(".dir").addEventListener("click", () => trilho.scrollBy({ left: trilho.clientWidth * 0.6, behavior: "smooth" }));
    // Roda do mouse rola na horizontal
    trilho.addEventListener("wheel", ev => { ev.preventDefault(); trilho.scrollBy({ left: ev.deltaY + ev.deltaX }); }, { passive: false });
    trilho.addEventListener("scroll", () => this.setas());
    for (const [chave, rel] of Object.entries(existentes.artes)) if (rel) el.style.setProperty(`--carrossel-arte-${chave}`, `url("${encodeURI(`${BASE}/${rel}`)}")`);
    document.body.appendChild(el);
    this.el = el;
    this.trilho = trilho;
    this.posicionar();
  }

  desmontar() {
    this.el?.remove();
    this.el = null;
    this.cartas.clear();
  }

  /** Abaixo da barra de cenas (ou acima da hotbar), entre a esquerda e a barra lateral; até 70% da tela. */
  posicionar() {
    if (!this.el) return;
    const el = this.el;
    const base = cfg("carrosselPosicao") === "base";
    const lateral = document.getElementById("sidebar")?.getBoundingClientRect();
    const direita = lateral && lateral.width ? lateral.left : window.innerWidth;
    const esquerda = (document.getElementById("controls")?.getBoundingClientRect().right ?? 0) + 8;
    const largura = Math.min(window.innerWidth * 0.7, direita - esquerda - 16);
    el.style.width = `${Math.max(240, largura)}px`;
    el.style.left = `${esquerda + (direita - esquerda - Math.max(240, largura)) / 2}px`;
    el.classList.toggle("pos-base", base);
    el.classList.toggle("pos-topo", !base);
    if (base) {
      const hotbar = document.getElementById("hotbar")?.getBoundingClientRect();
      el.style.top = "";
      el.style.bottom = `${(hotbar ? window.innerHeight - hotbar.top : 0) + 8}px`;
    } else {
      const nav = document.getElementById("navigation")?.getBoundingClientRect();
      el.style.bottom = "";
      el.style.top = `${(nav ? nav.bottom : 0) + 6}px`;
    }
    el.classList.remove("tam-p", "tam-m", "tam-g");
    el.classList.add(`tam-${cfg("carrosselTamanho")}`);
  }

  agendar() {
    if (this.agendado) return;
    this.agendado = true;
    // Junta as atualizações do mesmo instante (setTimeout: também roda com a aba em segundo plano)
    setTimeout(() => { this.agendado = false; this.render(); }, 0);
  }

  render() {
    const combate = ligado() ? combateDaCena() : null;
    if (!combate) { this.desmontar(); this.ultimo = { combateId: null, rodada: null, turnoId: null }; return; }
    this.montar();
    this.posicionar();
    const turnoId = combate.started ? combate.combatant?.id ?? null : null;
    const cartas = cartasDoCombate({ combatentes: combatentesDe(combate), turnoId, visao: visao() });
    this.el.querySelector(".carrossel-rodada b").textContent = combate.started ? String(combate.round) : "–";
    this.el.querySelector(".carrossel-mestre").hidden = !game.user.isGM;
    this.reconciliar(cartas);
    // Rodada nova e turno novo (mesmo combate)
    const mesmo = this.ultimo.combateId === combate.id;
    if (mesmo && combate.started && rodadaNova(this.ultimo.rodada, combate.round) && cfg("carrosselBanner")) bannerDeRodada(combate.round);
    if (mesmo && turnoId && turnoId !== this.ultimo.turnoId) avisarSeuTurno(combate.combatant);
    this.ultimo = { combateId: combate.id, rodada: combate.round, turnoId };
    this.centralizarAtiva(mesmo);
  }

  /** Atualiza as cartas existentes (por id), cria as novas, remove as que saíram e reordena. */
  reconciliar(cartas) {
    const ids = new Set(cartas.map(c => c.id));
    for (const [id, el] of this.cartas) if (!ids.has(id)) { el.classList.add("saindo"); setTimeout(() => el.remove(), 300); this.cartas.delete(id); }
    cartas.forEach((c, i) => {
      let el = this.cartas.get(c.id);
      if (!el) { el = this.novaCarta(c.id); this.cartas.set(c.id, el); }
      this.preencher(el, c);
      if (this.trilho.children[i] !== el) this.trilho.insertBefore(el, this.trilho.children[i] ?? null);
    });
    this.setas();
  }

  novaCarta(id) {
    const el = document.createElement("div");
    el.className = "carta entrando";
    el.dataset.id = id;
    el.setAttribute("role", "listitem");
    el.tabIndex = 0;
    el.innerHTML = `
      <div class="carta-runa" aria-hidden="true"></div>
      <div class="carta-coroa" aria-hidden="true"><i class="fa-solid fa-crown"></i></div>
      <div class="carta-moldura">
        <div class="carta-retrato"><img alt="" draggable="false"></div>
        <span class="carta-ini"></span>
        <span class="carta-estado" aria-hidden="true"></span>
      </div>
      <div class="carta-nome"></div>
      <div class="carta-barras"><i class="pv"><b></b></i><i class="pm"><b></b></i></div>`;
    el.addEventListener("click", () => focarCombatente(id));
    el.addEventListener("keydown", ev => { if (ev.key === "Enter") focarCombatente(id); });
    el.addEventListener("dblclick", () => abrirFicha(id));
    el.addEventListener("mouseenter", ev => destacarToken(id, true, ev));
    el.addEventListener("mouseleave", ev => destacarToken(id, false, ev));
    setTimeout(() => el.classList.remove("entrando"), 30);
    return el;
  }

  preencher(el, c) {
    el.classList.toggle("ativa", c.ativo);
    el.classList.toggle("proxima-1", c.proximo === 1);
    el.classList.toggle("proxima-2", c.proximo === 2);
    el.classList.toggle("derrotada", c.derrotado);
    el.classList.toggle("oculta", c.oculto);
    el.dataset.disposicao = c.disposicao;
    const img = el.querySelector(".carta-retrato img");
    if (img.getAttribute("src") !== c.img) img.src = c.img ?? "";
    el.querySelector(".carta-nome").textContent = c.nome;
    el.title = c.nome;
    el.querySelector(".carta-ini").textContent = c.iniciativa === null ? "–" : String(c.iniciativa);
    const estado = el.querySelector(".carta-estado");
    estado.innerHTML = c.derrotado ? `<i class="fa-solid fa-skull"></i>` : c.oculto ? `<i class="fa-solid fa-eye-slash"></i>` : "";
    for (const tipo of ["pv", "pm"]) {
      const b = el.querySelector(`.carta-barras .${tipo}`);
      const dados = c[tipo];
      b.hidden = !dados;
      if (dados) { b.style.setProperty("--f", dados.fracao); b.title = dados.texto; }
    }
  }

  /** Mantém a carta ativa visível (centralizada); desliza ao trocar de turno. */
  centralizarAtiva(animar) {
    const ativa = this.trilho.querySelector(".carta.ativa");
    if (!ativa) return;
    const alvo = ativa.offsetLeft + ativa.offsetWidth / 2 - this.trilho.clientWidth / 2;
    this.trilho.scrollTo({ left: alvo, behavior: animar && !reduzirMovimento() ? "smooth" : "auto" });
  }

  setas() {
    if (!this.trilho) return;
    const t = this.trilho;
    const sobra = t.scrollWidth - t.clientWidth > 2;
    this.el.querySelector(".esq").hidden = !sobra || t.scrollLeft <= 2;
    this.el.querySelector(".dir").hidden = !sobra || t.scrollLeft >= t.scrollWidth - t.clientWidth - 2;
  }

  async acaoDoMestre(acao) {
    const c = game.combat;
    if (!game.user.isGM || !c) return;
    if (acao === "anterior") return c.previousTurn();
    if (acao === "proximo") return c.started ? c.nextTurn() : c.startCombat();
    if (acao === "encerrar") return c.endCombat();
  }
}

const reduzirMovimento = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------ Interações ------------------------------ */

const combatente = id => game.combat?.combatants.get(id) ?? null;
const tokenDo = id => combatente(id)?.token?.object ?? null;

/** Clique: seleciona (se for dono) e centraliza a câmera no token (se o usuário o enxerga). */
function focarCombatente(id) {
  const t = tokenDo(id);
  if (!t || !t.visible) return;
  if (t.isOwner) t.control({ releaseOthers: true });
  canvas.animatePan({ x: t.center.x, y: t.center.y, duration: 350 });
}

function abrirFicha(id) {
  const actor = combatente(id)?.actor;
  if (actor?.isOwner) actor.sheet.render(true);
}

function destacarToken(id, ligar, ev) {
  const t = tokenDo(id);
  if (!t || !t.visible) return;
  if (ligar) t._onHoverIn?.(ev, { hoverOutOthers: true });
  else t._onHoverOut?.(ev);
}

/** Banner épico "RODADA N" (aparece, brilha, some; não bloqueia nada). */
function bannerDeRodada(n) {
  document.querySelector(".icarus-banner-rodada")?.remove();
  const b = document.createElement("div");
  b.className = "icarus-banner-rodada";
  b.setAttribute("role", "status");
  if (existentes.artes.banner) b.style.setProperty("--carrossel-arte-banner", `url("${encodeURI(`${BASE}/${existentes.artes.banner}`)}")`);
  b.innerHTML = `<span></span>`;
  b.querySelector("span").textContent = fmt("ICARUS.Carrossel.RodadaN", { n });
  document.body.appendChild(b);
  setTimeout(() => b.remove(), reduzirMovimento() ? 1500 : 2400);
}

/** "SEU TURNO" para o dono do combatente (não para o Mestre), com som opcional. */
function avisarSeuTurno(cb) {
  if (game.user.isGM || !cb?.actor?.isOwner || !cb.actor.hasPlayerOwner) return;
  document.querySelector(".icarus-seu-turno")?.remove();
  const a = document.createElement("div");
  a.className = "icarus-seu-turno";
  a.setAttribute("role", "alert");
  a.textContent = loc("ICARUS.Carrossel.SeuTurno");
  document.body.appendChild(a);
  setTimeout(() => a.remove(), 2200);
  if (existentes.som && cfg("carrosselSom")) {
    /* eslint-disable-next-line no-undef */
    const Audio = foundry.audio?.AudioHelper ?? (typeof AudioHelper !== "undefined" ? AudioHelper : null);
    Audio?.play({ src: `${BASE}/${SOM_SEU_TURNO}`, volume: 0.7, autoplay: true, loop: false }, false);
  }
}

/* ------------------------------ Registro ------------------------------ */

const carrossel = new Carrossel();

export function registrarCarrossel() {
  const reg = (chave, escopo, dados) => game.settings.register(F, chave, {
    scope: escopo, config: true, onChange: () => { carrossel.desmontar(); carrossel.agendar(); }, ...dados
  });
  reg("carrosselAtivo", "world", { name: "ICARUS.Carrossel.Config.Ativo", hint: "ICARUS.Carrossel.Config.AtivoDica", type: Boolean, default: true });
  reg("carrosselForcar", "world", { name: "ICARUS.Carrossel.Config.Forcar", hint: "ICARUS.Carrossel.Config.ForcarDica", type: Boolean, default: false });
  reg("carrosselMostrar", "client", { name: "ICARUS.Carrossel.Config.Mostrar", type: Boolean, default: true });
  reg("carrosselPosicao", "client", { name: "ICARUS.Carrossel.Config.Posicao", type: String, default: "topo",
    choices: { topo: "ICARUS.Carrossel.Config.Topo", base: "ICARUS.Carrossel.Config.Base" } });
  reg("carrosselTamanho", "client", { name: "ICARUS.Carrossel.Config.Tamanho", type: String, default: "m",
    choices: { p: "ICARUS.Carrossel.Config.Pequeno", m: "ICARUS.Carrossel.Config.Medio", g: "ICARUS.Carrossel.Config.Grande" } });
  reg("carrosselBarras", "client", { name: "ICARUS.Carrossel.Config.Barras", type: Boolean, default: true });
  reg("carrosselBanner", "client", { name: "ICARUS.Carrossel.Config.Banner", type: Boolean, default: true });
  reg("carrosselSom", "client", { name: "ICARUS.Carrossel.Config.Som", hint: "ICARUS.Carrossel.Config.SomDica", type: Boolean, default: true });

  const atualizar = () => carrossel.agendar();
  for (const h of ["createCombat", "updateCombat", "deleteCombat", "combatStart", "combatRound", "combatTurn",
    "createCombatant", "updateCombatant", "deleteCombatant", "canvasReady", "updateActor", "updateToken"]) Hooks.on(h, atualizar);
  window.addEventListener("resize", () => carrossel.posicionar());
  Hooks.on("collapseSidebar", () => setTimeout(() => carrossel.posicionar(), 250));

  Hooks.once("ready", () => {
    // Artes e som opcionais pela lista do build (sem pedir ao servidor: ausente daria 404 no console)
    for (const [chave, rel] of Object.entries(ARTES)) existentes.artes[chave] = existeArquivoUi(rel) ? rel : null;
    existentes.som = existeArquivoUi(SOM_SEU_TURNO);
    if (moduloConcorrente() && game.user.isGM && !cfg("carrosselForcar")) {
      console.warn("Icarus RPG | Módulo Combat Carousel ativo: o carrossel do Icarus fica desligado (Configurações → forçar).");
      ui.notifications.info(loc("ICARUS.Carrossel.Concorrente"));
    }
    carrossel.agendar();
  });
}
