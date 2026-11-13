/**
 * Painel de combate do Mestre: janela que se move pela tela inteira (e pode virar uma janela
 * separada do navegador, o "pop-out") com uma carta para cada combatente do Mestre (ator sem dono
 * jogador). Destaca o próximo deles a agir (ou o que está agindo agora). Duplo clique abre a ficha
 * (no caso de token não vinculado, a ficha do próprio token); clique seleciona o token e centraliza.
 * Só o Mestre vê. Abre sozinho quando há combate na cena com algum combatente do Mestre (opção do
 * mundo "Painel de combate do Mestre", ligada por padrão); fechado à mão, só volta no próximo
 * combate ou pelo botão do carrossel / game.icarus.painelCombate.abrir().
 */
import { SISTEMA_ID } from "./config.mjs";
import { cartasDoPainel, rotuloDoDestaque, comSinal } from "./painel-combate-dados.mjs";
import { CONDICAO_POR_ID } from "./condicoes.mjs";
import { iconeDaCondicao } from "./condicoes-foundry.mjs";

const F = SISTEMA_ID;
const TEMPLATE = `systems/${SISTEMA_ID}/templates/painel-combate.hbs`;
const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const renderizar = (caminho, dados) => (foundry.applications?.handlebars?.renderTemplate ?? renderTemplate)(caminho, dados);

const ativo = () => game.user?.isGM && game.settings.get(F, "painelCombateMestre");

/** Combate da cena que o Mestre está vendo (ou sem cena), com combatentes. */
function combateAtual() {
  const c = game.combat;
  if (!c || !c.combatants.size) return null;
  if (c.scene && c.scene.id !== canvas?.scene?.id) return null;
  return c;
}

const doMestre = actor => !!actor && !actor.hasPlayerOwner;

function combatentesDe(combate) {
  return combate.turns.map(cb => {
    const a = cb.actor;
    const s = a?.system;
    const p = s?.pericias;
    const ameaca = a?.type === "ameaca";
    return {
      id: cb.id, actorUuid: a?.uuid ?? null, nome: cb.name, img: cb.token?.texture?.src || cb.img || a?.img,
      iniciativa: cb.initiative, doMestre: doMestre(a), derrotado: !!cb.isDefeated, oculto: !!cb.hidden,
      pv: s?.pv ? { value: s.pv.value, max: s.pv.max } : null,
      pm: s?.pm ? { value: s.pm.value, max: s.pm.max } : null,
      defesa: s?.defesa?.total ?? null,
      fort: p?.fortitude?.total ?? null, ref: p?.reflexos?.total ?? null, von: p?.vontade?.total ?? null,
      nd: ameaca ? s.nd : null, tipo: ameaca ? s.tipo : null,
      condicoes: [...(a?.statuses ?? [])].map(id => CONDICAO_POR_ID[id]).filter(Boolean).map(c => ({ nome: c.nome, img: iconeDaCondicao(c) }))
    };
  });
}

/** Dados do template (janela e pop-out usam o mesmo). */
function contexto(popout) {
  const base = {
    popout, comecou: false, rodada: 0, noTurno: null, cartas: [],
    dicaCarta: loc("ICARUS.PainelCombate.DicaCarta"), dicaOculto: loc("ICARUS.PainelCombate.Oculto"),
    rotuloDefesa: loc("ICARUS.PainelCombate.Defesa"), rotuloIniciativa: loc("ICARUS.PainelCombate.Iniciativa")
  };
  const combate = combateAtual();
  if (!combate) return base;
  const comecou = !!combate.started;
  const turnoId = comecou ? combate.combatant?.id ?? null : null;
  const cartas = cartasDoPainel({ combatentes: combatentesDe(combate), turnoId, comecou }).map(c => {
    const r = rotuloDoDestaque(c);
    const pct = b => (b ? Math.round(b.fracao * 100) : 0);
    return {
      ...c,
      rotulo: r ? (r.dados ? fmt(r.chave, r.dados) : loc(r.chave)) : null,
      pv: c.pv && { ...c.pv, pct: pct(c.pv) }, pm: c.pm && { ...c.pm, pct: pct(c.pm) },
      iniciativaTexto: c.iniciativa === null ? null : String(c.iniciativa),
      fortTexto: comSinal(c.fort), refTexto: comSinal(c.ref), vonTexto: comSinal(c.von)
    };
  });
  return { ...base, comecou, rodada: combate.round, noTurno: comecou ? combate.combatant?.name ?? null : null, cartas };
}

/* ------------------------------ Interações ------------------------------ */

const combatente = id => game.combat?.combatants.get(id) ?? null;

function abrirFicha(id) {
  const actor = combatente(id)?.actor;
  if (actor) actor.sheet.render(true);
}

function focarToken(id) {
  const t = combatente(id)?.token?.object;
  if (!t) return;
  t.control({ releaseOthers: true });
  canvas.animatePan({ x: t.center.x, y: t.center.y, duration: 350 });
}

/** Eventos por delegação (uma vez por raiz): servem para a janela e para o pop-out. */
function ligarEventos(raiz) {
  if (!raiz || raiz.dataset.pcLigado) return;
  raiz.dataset.pcLigado = "1";
  const carta = ev => ev.target?.closest?.(".pc-carta")?.dataset.pcId ?? null;
  raiz.addEventListener("click", ev => {
    if (ev.target?.closest?.('[data-pc-acao="popout"]')) { ev.preventDefault(); abrirPopout(); return; }
    const id = carta(ev);
    if (id) focarToken(id);
  });
  raiz.addEventListener("dblclick", ev => { const id = carta(ev); if (id) { ev.preventDefault(); abrirFicha(id); } });
  raiz.addEventListener("keydown", ev => { if (ev.key !== "Enter") return; const id = carta(ev); if (id) abrirFicha(id); });
}

/* ------------------------------ Janela ------------------------------ */

let fechadoNoCombate = null;   // id do combate em que o Mestre fechou o painel à mão
let fechamentoInterno = false; // fechado pelo sistema (fim do combate, pop-out): não conta como "à mão"

class PainelCombate extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "icarus-painel-combate",
    tag: "section",
    classes: ["icarus", "icarus-painel-combate"],
    window: {
      title: "ICARUS.PainelCombate.Titulo", icon: "fa-solid fa-chess-board", resizable: true,
      controls: [{ action: "popout", icon: "fa-solid fa-up-right-from-square", label: "ICARUS.PainelCombate.Popout" }]
    },
    position: { width: 600, height: 520 },
    actions: { popout: () => abrirPopout() }
  };

  static PARTS = { conteudo: { template: TEMPLATE } };

  async _prepareContext() { return contexto(false); }

  _onRender(context, options) {
    super._onRender?.(context, options);
    ligarEventos(this.element);
  }

  /** Lembra a posição (por Mestre) para abrir no mesmo lugar. */
  setPosition(pos) {
    const r = super.setPosition(pos);
    clearTimeout(this._salvar);
    this._salvar = setTimeout(() => {
      const { left, top, width, height } = this.position;
      game.settings.set(F, "painelCombateLugar", { left, top, width, height });
    }, 400);
    return r;
  }

  _onClose(options) {
    super._onClose?.(options);
    if (!fechamentoInterno) fechadoNoCombate = game.combat?.id ?? "sem-combate";
  }
}

let painel = null;
function obterPainel() {
  if (!painel) {
    const lugar = game.settings.get(F, "painelCombateLugar");
    painel = new PainelCombate(lugar ? { position: lugar } : {});
  }
  return painel;
}

async function fecharInterno() {
  if (!painel?.rendered) return;
  fechamentoInterno = true;
  try { await painel.close({ animate: false }); } finally { fechamentoInterno = false; }
}

/* ------------------------------ Pop-out ------------------------------ */

let janela = null;
const popoutAberto = () => !!janela && !janela.closed;

/** Janela separada do navegador, com os estilos do Foundry copiados; os cliques rodam aqui. */
async function abrirPopout() {
  if (popoutAberto()) { janela.focus(); return; }
  const pos = painel?.rendered ? painel.position : { width: 600, height: 520 };
  janela = window.open("", "icarus-painel-combate", `popup=yes,width=${Math.round(pos.width || 600)},height=${Math.round(pos.height || 520)}`);
  if (!janela) { ui.notifications.warn(loc("ICARUS.PainelCombate.PopoutBloqueado")); return; }
  const d = janela.document;
  d.open();
  d.write(`<!doctype html><html lang="${game.i18n.lang}"><head><meta charset="utf-8"></head>`
    + `<body class="icarus-pc-popout"><section class="icarus icarus-painel-combate popout"></section></body></html>`);
  d.close();
  d.title = loc("ICARUS.PainelCombate.Titulo");
  const base = d.createElement("base");
  base.href = document.baseURI;
  d.head.prepend(base);
  for (const n of document.querySelectorAll('link[rel="stylesheet"], style')) d.head.append(d.importNode(n, true));
  const raiz = d.querySelector("section");
  ligarEventos(raiz);
  janela.addEventListener("pagehide", () => {
    janela = null;
    agendar();
  });
  await fecharInterno();
  await desenharPopout();
}

async function desenharPopout() {
  if (!popoutAberto()) return;
  const raiz = janela.document.querySelector("section");
  if (!raiz) return;
  raiz.innerHTML = await renderizar(TEMPLATE, contexto(true));
  // O tooltip do Foundry não existe na janela separada: usa o title do navegador
  for (const el of raiz.querySelectorAll("[data-tooltip]")) el.title = el.dataset.tooltip;
}

/* ------------------------------ Atualização ------------------------------ */

let agendado = false;
let combateVisto = null; // combate que estava na tela na última atualização
function agendar() {
  if (agendado) return;
  agendado = true;
  setTimeout(() => { agendado = false; atualizar(); }, 60);
}

async function atualizar() {
  if (!game.user?.isGM) return;
  const combate = combateAtual();
  // Opção desligada, ou o combate que estava na tela acabou: fecha (aberto à mão sem combate fica)
  if (!ativo() || (!combate && combateVisto)) {
    combateVisto = null;
    fechadoNoCombate = null;
    if (popoutAberto()) janela.close();
    await fecharInterno();
    return;
  }
  if (!combate) return (painel?.rendered ? painel.render() : undefined);
  combateVisto = combate.id;
  if (popoutAberto()) return desenharPopout();
  const p = obterPainel();
  if (p.rendered) return p.render();
  const temDoMestre = combate.turns.some(cb => doMestre(cb.actor));
  if (temDoMestre && fechadoNoCombate !== combate.id) p.render(true);
}

/** Abre à mão (botão do carrossel ou macro): mesmo fora de combate, mostra o aviso de vazio. */
export function abrirPainelCombate() {
  if (!game.user.isGM) return;
  fechadoNoCombate = null;
  if (popoutAberto()) { janela.focus(); return desenharPopout(); }
  return obterPainel().render(true);
}

export function registrarPainelCombate() {
  game.settings.register(F, "painelCombateMestre", {
    name: "ICARUS.PainelCombate.Config.Ativo", hint: "ICARUS.PainelCombate.Config.AtivoDica",
    scope: "world", config: true, type: Boolean, default: true, onChange: () => agendar()
  });
  game.settings.register(F, "painelCombateLugar", { scope: "client", config: false, type: Object, default: null });

  for (const h of ["createCombat", "updateCombat", "deleteCombat", "combatStart", "combatRound", "combatTurn",
    "createCombatant", "updateCombatant", "deleteCombatant", "canvasReady", "updateActor", "updateToken",
    "createActiveEffect", "updateActiveEffect", "deleteActiveEffect"]) Hooks.on(h, agendar);
  Hooks.once("ready", agendar);
  window.addEventListener("beforeunload", () => { if (popoutAberto()) janela.close(); });
  return { abrir: abrirPainelCombate, popout: abrirPopout };
}
