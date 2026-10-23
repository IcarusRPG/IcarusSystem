/**
 * Porta trancada: o personagem (a até 1,5 m) tenta abrir com Prestidigitação ("Abrir fechadura":
 * −5 sem gazuas; 1 natural com gazuas quebra). Um teste por vez no mundo.
 *
 * Protocolo (socket do sistema, ações "porta:*"; o id de quem enviou vem do servidor):
 *   jogador → Mestre  porta:pedido   { pedidoId, cenaId, paredeId, actorId, tokenId }
 *   Mestre → jogador  porta:recusa   { pedidoId, motivo }                 (recusado, ocupado, expirou)
 *   Mestre → todos    porta:cena     { testeId, userId, nome, gazuas }    (imagem + dado; só o jogador clica)
 *   jogador → Mestre  porta:total    { testeId, total }
 *   Mestre → todos    porta:rolando  { testeId, total, sucesso, cd? }     (vídeo → SUCESSO/FALHA)
 *   Mestre → todos    porta:cancelar { testeId? }                         (fecha a cena; sem testeId = todas)
 * A CD fica só no cliente do Mestre (vai junto só com "mostrar a CD aos jogadores" ligado). O Mestre
 * decide (total ≥ CD), abre/destranca a porta e escreve no chat (linha pública + CD só para o Mestre).
 */
import { SISTEMA_ID } from "./config.mjs";
import { MIDIAS } from "./midias.mjs";
import { rolarPericia } from "./rolls.mjs";
import { temGazuas } from "./origens-dados.mjs";
import { AO_PORTA_TRANCADA } from "./interacao.mjs";

const F = SISTEMA_ID;
const CANAL = `system.${SISTEMA_ID}`;
const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);
const esc = t => Handlebars.escapeExpression(String(t ?? ""));
const { DialogV2, ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** Tempos (ms). */
export const TEMPOS = { respostaMestre: 5 * 60 * 1000, videoReserva: 20000, resultadoNaTela: 4000, cenaMaxima: 10 * 60 * 1000 };

/** Resultado: sucesso se total ≥ CD; a porta abre ou só destranca (configuração). */
export function resultadoDaPorta({ total, cd, aoSucesso = "abrir" }) {
  const sucesso = Number(total) >= Number(cd);
  const estados = globalThis.CONST?.WALL_DOOR_STATES ?? { CLOSED: 0, OPEN: 1, LOCKED: 2 };
  return { sucesso, ds: sucesso ? (aoSucesso === "destrancar" ? estados.CLOSED : estados.OPEN) : estados.LOCKED };
}

const emitir = (acao, dados = {}) => game.socket.emit(CANAL, { acao, ...dados });

/* ------------------------------ Jogador: pedir ------------------------------ */

const pedidosAbertos = new Map();

/** Clique numa porta trancada, perto: confirma e pede ao Mestre. */
export async function tentarAbrir(parede, token) {
  const ok = await DialogV2.confirm({
    window: { title: loc("ICARUS.Porta.Titulo") },
    content: `<p>${esc(loc("ICARUS.Porta.Pergunta"))}</p>`,
    rejectClose: false
  });
  if (!ok) return;
  if (!game.users.activeGM) return ui.notifications.warn(loc("ICARUS.Porta.SemMestre"));
  if (pedidosAbertos.size || OverlayPorta.atual) return ui.notifications.warn(loc("ICARUS.Porta.EmAndamento"));
  const actor = token?.actor;
  if (!actor) return ui.notifications.warn(loc("ICARUS.Interacao.SelecioneToken"));
  const pedidoId = foundry.utils.randomID();
  // Sem resposta (Mestre saiu): expira com aviso
  pedidosAbertos.set(pedidoId, setTimeout(() => { pedidosAbertos.delete(pedidoId); ui.notifications.warn(loc("ICARUS.Porta.Expirou")); }, TEMPOS.respostaMestre + 5000));
  emitir("porta:pedido", { pedidoId, cenaId: parede.document.parent.id, paredeId: parede.document.id, actorId: actor.id, tokenId: token.document?.id ?? token.id });
  ui.notifications.info(loc("ICARUS.Porta.Pedido"));
}

const encerrarPedido = pedidoId => { clearTimeout(pedidosAbertos.get(pedidoId)); pedidosAbertos.delete(pedidoId); };

/* ------------------------------ Mestre: janela da CD ------------------------------ */

/** Estado do teste em andamento (só no cliente do Mestre ativo). */
let teste = null;

export class JanelaCDPorta extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(dados, aoResponder) {
    super({ id: `icarus-porta-cd-${dados.pedidoId}` });
    this.dados = dados;
    this.aoResponder = aoResponder;
    this.respondido = false;
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["icarus", "icarus-dialogo", "icarus-porta-cd"],
    window: { title: "ICARUS.Porta.TituloMestre", icon: "fa-solid fa-door-closed" },
    position: { width: 420, height: "auto" },
    form: { handler: JanelaCDPorta._confirmar, closeOnSubmit: true },
    actions: { recusar: JanelaCDPorta._recusar }
  };

  static PARTS = { form: { template: `systems/${SISTEMA_ID}/templates/porta/cd.hbs` } };

  async _prepareContext() {
    return { ...this.dados, ultimaCD: game.settings.get(F, "ultimaCDPorta") };
  }

  responder(r) {
    if (this.respondido) return;
    this.respondido = true;
    this.aoResponder(r);
  }

  static async _confirmar(event, form, formData) {
    const cd = Math.trunc(Number(formData.object.cd));
    if (!Number.isFinite(cd) || cd < 1) return ui.notifications.warn(loc("ICARUS.Porta.CDInvalida"));
    await game.settings.set(F, "ultimaCDPorta", cd);
    this.responder({ cd });
  }

  static _recusar() {
    const motivo = this.element.querySelector("[name=motivo]")?.value?.trim() ?? "";
    this.responder({ recusa: true, motivo });
    this.close();
  }

  /** Fechar no X conta como recusar. */
  _onClose(options) {
    super._onClose?.(options);
    this.responder({ recusa: true, motivo: "" });
  }
}

async function aoPedido(msg, de) {
  if (!game.users.activeGM?.isSelf) return;
  if (teste) return emitir("porta:recusa", { para: de, pedidoId: msg.pedidoId, motivo: "ICARUS.Porta.EmAndamento" });
  const cena = game.scenes.get(msg.cenaId);
  const parede = cena?.walls.get(msg.paredeId);
  const actor = game.actors.get(msg.actorId) ?? cena?.tokens.get(msg.tokenId)?.actor;
  const usuario = game.users.get(de);
  if (!parede || !actor || !usuario || !actor.testUserPermission(usuario, "OWNER")) {
    return emitir("porta:recusa", { para: de, pedidoId: msg.pedidoId, motivo: "ICARUS.Porta.Invalido" });
  }
  const gazuas = temGazuas([...actor.items]);
  teste = { pedidoId: msg.pedidoId, testeId: foundry.utils.randomID(), userId: de, actorId: actor.id, tokenId: msg.tokenId, cenaId: msg.cenaId, paredeId: msg.paredeId, nome: actor.name, gazuas, fase: "cd" };
  const atual = teste;
  const janela = new JanelaCDPorta({ pedidoId: msg.pedidoId, nome: actor.name, jogador: usuario.name, gazuas }, r => aoRespostaDoMestre(atual, r));
  atual.janela = janela;
  atual.timer = setTimeout(() => {
    if (teste !== atual || atual.fase !== "cd") return;
    janela.respondido = true;
    janela.close();
    emitir("porta:recusa", { para: de, pedidoId: msg.pedidoId, motivo: "ICARUS.Porta.Expirou" });
    ui.notifications.warn(loc("ICARUS.Porta.Expirou"));
    teste = null;
  }, TEMPOS.respostaMestre);
  janela.render(true);
}

function aoRespostaDoMestre(atual, r) {
  if (teste !== atual) return;
  clearTimeout(atual.timer);
  if (r.recusa) {
    emitir("porta:recusa", { para: atual.userId, pedidoId: atual.pedidoId, motivo: "ICARUS.Porta.Recusado", texto: r.motivo });
    teste = null;
    return;
  }
  atual.cd = r.cd;
  atual.fase = "dado";
  const dados = { testeId: atual.testeId, pedidoId: atual.pedidoId, userId: atual.userId, nome: atual.nome, gazuas: atual.gazuas, actorId: atual.actorId, tokenId: atual.tokenId, cenaId: atual.cenaId };
  emitir("porta:cena", dados);
  OverlayPorta.abrir(dados, { souMestre: true, cd: atual.cd });
  // Segurança: a cena não fica aberta para sempre
  atual.timer = setTimeout(() => cancelarTeste(), TEMPOS.cenaMaxima);
}

async function aoTotal(msg, de) {
  const atual = teste;
  if (!game.users.activeGM?.isSelf || !atual || atual.testeId !== msg.testeId || de !== atual.userId || atual.fase !== "dado") return;
  atual.fase = "rolando";
  clearTimeout(atual.timer);
  const r = resultadoDaPorta({ total: msg.total, cd: atual.cd, aoSucesso: game.settings.get(F, "aoSucessoPorta") });
  atual.resultado = { total: Number(msg.total), sucesso: r.sucesso, ds: r.ds };
  const publico = { testeId: atual.testeId, total: atual.resultado.total, sucesso: r.sucesso, ...(game.settings.get(F, "mostrarCDParaJogadores") ? { cd: atual.cd } : {}) };
  emitir("porta:rolando", publico);
  // Se o vídeo do Mestre travar, conclui mesmo assim (antes de tocar: sem a cena, conclui na hora)
  atual.timer = setTimeout(() => concluir(atual), TEMPOS.videoReserva + TEMPOS.resultadoNaTela);
  OverlayPorta.rolando({ ...publico, cd: atual.cd }, () => concluir(atual));
}

/** Mestre: aplica o resultado na porta e escreve no chat (uma vez). */
async function concluir(atual) {
  if (atual.concluido) return;
  atual.concluido = true;
  clearTimeout(atual.timer);
  if (teste === atual) teste = null;
  const { sucesso, ds, total } = atual.resultado;
  const parede = game.scenes.get(atual.cenaId)?.walls.get(atual.paredeId);
  if (sucesso && parede) await parede.update({ ds }, { icarusPorta: true }).catch(e => console.error("Icarus RPG | Porta: não abriu", e));
  await ChatMessage.create({ content: `<p class="icarus-porta-chat">${esc(fmt(sucesso ? "ICARUS.Porta.ChatSucesso" : "ICARUS.Porta.ChatFalha", { nome: atual.nome }))}</p>` });
  await ChatMessage.create({ content: `<p>${esc(fmt("ICARUS.Porta.ChatMestre", { nome: atual.nome, cd: atual.cd, total }))}</p>`, whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id) });
}

/** Mestre: cancela o teste em andamento (botão na cena, desconexão do jogador). */
export function cancelarTeste() {
  const atual = teste;
  teste = null;
  if (atual) { clearTimeout(atual.timer); atual.janela?.close?.(); }
  emitir("porta:cancelar", { testeId: atual?.testeId ?? null });
  OverlayPorta.fechar();
}

/* ------------------------------ Cena animada (todos) ------------------------------ */

/**
 * Sobreposição em tela cheia (acima do canvas, abaixo das janelas; a barra lateral e o chat ficam
 * livres): imagem estática com o dado vermelho → vídeo → SUCESSO/FALHA. Só no DOM: recarregar a
 * página não deixa nada preso.
 */
export class OverlayPorta {
  static atual = null;

  static abrir(dados, { souMestre = false, cd = null } = {}) {
    OverlayPorta.fechar();
    const o = new OverlayPorta(dados, { souMestre, cd });
    OverlayPorta.atual = o;
    o.montar();
    return o;
  }

  static rolando(dados, aoTerminar) {
    const o = OverlayPorta.atual;
    if (!o || o.dados.testeId !== dados.testeId) { aoTerminar?.(); return; }
    o.tocar(dados, aoTerminar);
  }

  static fechar(testeId = null) {
    const o = OverlayPorta.atual;
    if (!o || (testeId && o.dados.testeId !== testeId)) return;
    o.desmontar();
    OverlayPorta.atual = null;
  }

  constructor(dados, { souMestre, cd }) {
    this.dados = dados;
    this.souMestre = souMestre;
    this.cd = cd;
    this.podeRolar = dados.userId === game.user.id;
  }

  montar() {
    const el = document.createElement("div");
    el.className = "icarus-porta-overlay";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", loc("ICARUS.Porta.Titulo"));
    const largura = document.getElementById("sidebar")?.getBoundingClientRect().width ?? 0;
    el.style.right = `${Math.round(largura)}px`;
    el.innerHTML = `
      <div class="porta-palco">
        <img class="porta-estatica" alt="">
        <video class="porta-video" playsinline preload="auto" hidden></video>
        <div class="porta-titulo"></div>
        <button type="button" class="porta-dado" aria-label="">
          <img alt="">
          <span class="porta-dado-texto"></span>
        </button>
        <div class="porta-dica"></div>
        <div class="porta-resultado" hidden><span class="porta-palavra"></span><span class="porta-total"></span></div>
        <div class="porta-erro" hidden></div>
      </div>
      ${this.souMestre ? `<div class="porta-mestre"><span class="porta-cd"></span><button type="button" class="porta-cancelar"></button></div>` : ""}`;
    el.querySelector(".porta-titulo").textContent = fmt("ICARUS.Porta.CenaTitulo", { nome: this.dados.nome });
    el.querySelector(".porta-dica").textContent = this.podeRolar
      ? loc("ICARUS.Porta.CliqueNoDado")
      : fmt("ICARUS.Porta.Aguardando", { nome: this.dados.nome });
    if (this.souMestre) {
      el.querySelector(".porta-cd").textContent = fmt("ICARUS.Porta.CDMestre", { cd: this.cd, gazuas: loc(this.dados.gazuas ? "ICARUS.Porta.ComGazuas" : "ICARUS.Porta.SemGazuas") });
      const cancelar = el.querySelector(".porta-cancelar");
      cancelar.textContent = loc("ICARUS.Porta.Cancelar");
      cancelar.addEventListener("click", () => cancelarTeste());
    }
    // Imagem estática; se não carregar, mostra o aviso e segue (o dado continua)
    const img = el.querySelector(".porta-estatica");
    img.onerror = () => this.erro("ICARUS.Porta.ErroMidia");
    img.src = MIDIAS.portaEstatica;
    const dado = el.querySelector(".porta-dado");
    const imgDado = dado.querySelector("img");
    imgDado.onerror = () => { imgDado.hidden = true; dado.querySelector(".porta-dado-texto").textContent = loc("ICARUS.Porta.Rolar"); };
    imgDado.src = MIDIAS.dadoVermelho;
    dado.setAttribute("aria-label", loc("ICARUS.Porta.Rolar"));
    dado.disabled = !this.podeRolar;
    dado.classList.toggle("pode", this.podeRolar);
    if (this.podeRolar) dado.addEventListener("click", () => this.rolar(), { once: true });
    this.teclado = ev => { if (ev.key === "Escape" && this.souMestre && this.fase === "fim") OverlayPorta.fechar(); };
    document.addEventListener("keydown", this.teclado);
    this.fase = "dado";
    this.el = el;
    document.body.appendChild(el);
  }

  erro(chave) {
    const e = this.el?.querySelector(".porta-erro");
    if (e) { e.textContent = loc(chave); e.hidden = false; }
  }

  /** Jogador do teste: rola Prestidigitação (Abrir fechadura) e manda o total ao Mestre. */
  async rolar() {
    const dado = this.el.querySelector(".porta-dado");
    dado.disabled = true;
    dado.classList.add("girando");
    // O token da cena (cobre ator não vinculado); senão o ator do mundo
    const d = this.dados;
    const actor = game.scenes.get(d.cenaId)?.tokens.get(d.tokenId)?.actor ?? game.actors.get(d.actorId);
    try {
      const msg = await rolarPericia(actor, "prestidigitacao", { abrirFechadura: true });
      const total = msg?.flags?.[F]?.total ?? msg?.getFlag?.(F, "total");
      if (total === undefined) throw new Error("sem total");
      emitir("porta:total", { testeId: this.dados.testeId, total });
      this.el.querySelector(".porta-dica").textContent = loc("ICARUS.Porta.Enviado");
    } catch (e) {
      console.error("Icarus RPG | Porta: rolagem falhou", e);
      dado.disabled = false;
      dado.classList.remove("girando");
      dado.addEventListener("click", () => this.rolar(), { once: true });
    }
  }

  /** Vídeo no lugar da imagem; ao terminar (ou se falhar), SUCESSO/FALHA e fecha sozinha. */
  tocar({ total, sucesso, cd }, aoTerminar) {
    if (this.fase !== "dado") return;
    this.fase = "video";
    const el = this.el;
    el.querySelector(".porta-dado").hidden = true;
    el.querySelector(".porta-dica").hidden = true;
    const video = el.querySelector(".porta-video");
    let fim = false;
    const mostrar = () => {
      if (fim) return;
      fim = true;
      clearTimeout(this.reserva);
      this.mostrarResultado({ total, sucesso, cd });
      aoTerminar?.();
    };
    video.onended = mostrar;
    video.onerror = () => { this.erro("ICARUS.Porta.ErroVideo"); mostrar(); };
    this.reserva = setTimeout(mostrar, TEMPOS.videoReserva);
    video.src = MIDIAS.portaVideo;
    video.hidden = false;
    el.querySelector(".porta-estatica").hidden = true;
    // Com som; se o navegador bloquear, sem som
    video.muted = false;
    video.play().catch(() => { video.muted = true; return video.play(); }).catch(() => { this.erro("ICARUS.Porta.ErroVideo"); mostrar(); });
  }

  mostrarResultado({ total, sucesso, cd }) {
    this.fase = "fim";
    const r = this.el.querySelector(".porta-resultado");
    r.classList.add(sucesso ? "sucesso" : "falha");
    r.querySelector(".porta-palavra").textContent = loc(sucesso ? "ICARUS.Porta.Sucesso" : "ICARUS.Porta.Falha");
    // O Mestre sempre vê a CD; os jogadores só com "mostrar a CD aos jogadores" (aí ela vem no evento)
    const cdVisivel = this.souMestre ? this.cd : cd;
    r.querySelector(".porta-total").textContent = cdVisivel !== null && cdVisivel !== undefined
      ? fmt("ICARUS.Porta.TotalECD", { total, cd: cdVisivel }) : fmt("ICARUS.Porta.Total", { total });
    r.hidden = false;
    this.el.addEventListener("click", () => OverlayPorta.fechar(), { once: true });
    this.fechamento = setTimeout(() => OverlayPorta.fechar(), TEMPOS.resultadoNaTela);
  }

  desmontar() {
    clearTimeout(this.reserva);
    clearTimeout(this.fechamento);
    document.removeEventListener("keydown", this.teclado);
    const v = this.el?.querySelector("video");
    if (v) { v.pause(); v.removeAttribute("src"); v.load(); }
    this.el?.remove();
  }
}

/* ------------------------------ Socket e registro ------------------------------ */

/** Mensagens do socket (exportada para os testes). */
export function aoReceberPorta(msg, remetente) {
  if (!msg?.acao?.startsWith("porta:")) return;
  const de = typeof remetente === "string" ? remetente : msg.userId;
  const doMestre = !!game.users.get(de)?.isGM;
  switch (msg.acao) {
    case "porta:pedido": return aoPedido(msg, de);
    case "porta:total": return aoTotal(msg, de);
    case "porta:recusa":
      if (!doMestre || msg.para !== game.user.id) return;
      encerrarPedido(msg.pedidoId);
      return ui.notifications.warn(msg.texto ? `${loc(msg.motivo)} ${msg.texto}` : loc(msg.motivo));
    case "porta:cena":
      if (!doMestre) return;
      if (msg.userId === game.user.id) encerrarPedido(msg.pedidoId);
      OverlayPorta.abrir(msg);
      return;
    case "porta:rolando":
      if (!doMestre) return;
      return OverlayPorta.rolando(msg);
    case "porta:cancelar":
      if (!doMestre) return;
      return OverlayPorta.fechar(msg.testeId);
  }
}

export function registrarPortaTrancada() {
  game.settings.register(F, "aoSucessoPorta", {
    name: "ICARUS.Porta.Config.AoSucesso", hint: "ICARUS.Porta.Config.AoSucessoDica",
    scope: "world", config: true, type: String, default: "abrir",
    choices: { abrir: "ICARUS.Porta.Config.Abrir", destrancar: "ICARUS.Porta.Config.Destrancar" }
  });
  game.settings.register(F, "mostrarCDParaJogadores", {
    name: "ICARUS.Porta.Config.MostrarCD", hint: "ICARUS.Porta.Config.MostrarCDDica",
    scope: "world", config: true, type: Boolean, default: false
  });
  game.settings.register(F, "ultimaCDPorta", { scope: "client", config: false, type: Number, default: 15 });
  AO_PORTA_TRANCADA.fn = tentarAbrir;
  Hooks.once("ready", () => {
    game.socket.on(CANAL, aoReceberPorta);
    // Mestre recarregou: nenhuma cena de porta fica presa nos jogadores
    if (game.users.activeGM?.isSelf) emitir("porta:cancelar", { testeId: null });
  });
  // Jogador do teste saiu: cancela
  Hooks.on("userConnected", (usuario, conectado) => {
    if (!conectado && teste && usuario.id === teste.userId && game.users.activeGM?.isSelf) cancelarTeste();
  });
}
