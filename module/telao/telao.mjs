/**
 * Telão: o Mestre escolhe um vídeo (arquivo de uma pasta ou link do YouTube), mostra para
 * todos e controla play, pausa e posição. Cada jogador só ajusta o próprio volume.
 *
 * Sincronia: o estado do Telão fica numa configuração de mundo ("telao"). Quando o Mestre muda,
 * o Foundry avisa todos os clientes (onChange), e cada um pula para o ponto certo calculado com
 * o relógio do servidor. Quem entra no meio da sessão lê o mesmo estado ao carregar o mundo.
 */
import { SISTEMA_ID } from "../config.mjs";
import { fonteDoTexto, mesmaFonte, tempoAlvo, precisaAjustar, formatarTempo } from "./midia.mjs";
import { ReprodutorArquivo, ReprodutorYoutube } from "./reprodutores.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const loc = k => game.i18n.localize(k);

const ESTADO_INICIAL = { publico: false, fonte: null, tocando: false, tempo: 0, quando: 0 };
const estadoAtual = () => ({ ...ESTADO_INICIAL, ...game.settings.get(SISTEMA_ID, "telao") });

/** Salva o estado (só o Mestre). O onChange da configuração aplica em todos, inclusive nele. */
function salvarEstado(parcial) {
  return game.settings.set(SISTEMA_ID, "telao", { ...estadoAtual(), ...parcial, quando: game.time.serverTime });
}

export class Telao extends HandlebarsApplicationMixin(ApplicationV2) {
  static #instancia = null;
  /** Uma janela de Telão por cliente. */
  static get instancia() {
    return (this.#instancia ??= new this());
  }

  static DEFAULT_OPTIONS = {
    id: "icarus-telao",
    classes: ["icarus", "icarus-dialogo", "icarus-telao"],
    window: { title: "ICARUS.Telao.Titulo", icon: "fa-solid fa-tv", resizable: true },
    position: { width: 960, height: 660 },
    actions: {
      escolherArquivo: Telao._aoEscolherArquivo,
      carregarLink: Telao._aoCarregarLink,
      mostrar: Telao._aoMostrar,
      play: Telao._aoPlay,
      pausar: Telao._aoPausar,
      inicio: Telao._aoInicio,
      fecharTodos: Telao._aoFecharTodos,
      desbloquear: Telao._aoDesbloquear
    }
  };

  static PARTS = {
    corpo: { template: `systems/${SISTEMA_ID}/templates/telao/telao.hbs` }
  };

  /** Fonte carregada neste cliente e o reprodutor dela. */
  fonte = null;
  reprodutor = null;
  _relogio = null;

  async _prepareContext(options) {
    return { gm: game.user.isGM, volume: game.settings.get(SISTEMA_ID, "telaoVolume") };
  }

  _onFirstRender(context, options) {
    super._onFirstRender?.(context, options);
    const el = this.element;
    el.querySelector("[name='link']")?.addEventListener("keydown", ev => {
      if (ev.key === "Enter") { ev.preventDefault(); Telao._aoCarregarLink.call(this); }
    });
    el.querySelector("[name='volume']")?.addEventListener("input", ev => {
      const v = Number(ev.currentTarget.value);
      game.settings.set(SISTEMA_ID, "telaoVolume", v);
      this.reprodutor?.volume(v);
    });
    const barra = el.querySelector("[name='posicao']");
    barra?.addEventListener("pointerdown", () => { this._arrastando = true; });
    barra?.addEventListener("change", ev => { this._arrastando = false; this._pular(Number(ev.currentTarget.value)); });
    // Atualiza o tempo e a barra de posição
    this._relogio = setInterval(() => this._atualizarTempo(), 500);
    this._atualizarStatus();
  }

  _onClose(options) {
    super._onClose?.(options);
    clearInterval(this._relogio);
    this._relogio = null;
    this.reprodutor?.destruir();
    this.reprodutor = null;
    this.fonte = null;
  }

  /** Abre a janela (ou traz para a frente) e, se houver vídeo sendo exibido, sincroniza. */
  async abrir() {
    if (this.rendered) {
      if (this.minimized) await this.maximize();
      this.bringToFront();
    } else {
      await this.render(true);
    }
    const estado = estadoAtual();
    if (estado.publico && estado.fonte) await this.aplicarEstado(estado);
  }

  /* ------------------------------ Carregar vídeo ------------------------------ */

  async carregarFonte(fonte) {
    if (!this.rendered) await this.render(true);
    const palco = this.element.querySelector(".telao-palco");
    this.reprodutor?.destruir();
    this.reprodutor = null;
    palco.replaceChildren();
    this.fonte = fonte;
    this._mostrarDesbloqueio(false);
    try {
      this.reprodutor = fonte.tipo === "youtube"
        ? new ReprodutorYoutube(palco, fonte.id, { inicio: fonte.inicio, aoErro: codigo => this._erroYoutube(codigo) })
        : new ReprodutorArquivo(palco, fonte.url);
      await this.reprodutor.pronto();
      this.reprodutor.volume(game.settings.get(SISTEMA_ID, "telaoVolume"));
    } catch (erro) {
      console.warn("Icarus RPG | Telão:", erro);
      if (fonte.tipo !== "youtube") ui.notifications.error(loc("ICARUS.Telao.Aviso.ErroArquivo"));
      else if (erro.message === "youtube-api") ui.notifications.error(loc("ICARUS.Telao.Aviso.SemYoutube"));
    }
    this._atualizarStatus();
  }

  _erroYoutube(codigo) {
    const chave = [101, 150].includes(codigo) ? "Bloqueado" : [100].includes(codigo) ? "NaoEncontrado" : "ErroYoutube";
    ui.notifications.error(loc(`ICARUS.Telao.Aviso.${chave}`));
  }

  /** O Mestre carrega um vídeo: se já está exibindo para todos, troca para todos (pausado no início). */
  async _carregarDoMestre(fonte) {
    await this.carregarFonte(fonte);
    if (estadoAtual().publico) await salvarEstado({ fonte, tocando: false, tempo: fonte.inicio ?? 0 });
  }

  /* ------------------------------ Sincronia ------------------------------ */

  /** Aplica o estado salvo pelo Mestre (chamado em todos os clientes). */
  async aplicarEstado(estado) {
    if (!estado.publico || !estado.fonte) {
      // Fechado para todos: jogadores fecham a janela; o Mestre continua com a prévia
      if (game.user.isGM) this._atualizarStatus();
      else if (this.rendered) await this.close();
      return;
    }
    if (!this.rendered) await this.render(true);
    if (!mesmaFonte(this.fonte, estado.fonte) || !this.reprodutor) await this.carregarFonte(estado.fonte);
    const r = this.reprodutor;
    if (!r) return;
    const alvo = tempoAlvo(estado, game.time.serverTime);
    if (precisaAjustar(r.tempo, alvo)) r.seek(alvo);
    if (estado.tocando) {
      const tocou = await r.play();
      this._mostrarDesbloqueio(!tocou);
    } else {
      r.pause();
      this._mostrarDesbloqueio(false);
    }
    this._atualizarStatus();
  }

  async _pular(segundos) {
    if (!this.reprodutor) return;
    this.reprodutor.seek(segundos);
    if (game.user.isGM && estadoAtual().publico) await salvarEstado({ tempo: segundos, tocando: estadoAtual().tocando });
  }

  /* ------------------------------ Interface ------------------------------ */

  _mostrarDesbloqueio(mostrar) {
    const caixa = this.element?.querySelector(".telao-desbloqueio");
    if (caixa) caixa.hidden = !mostrar;
  }

  _atualizarTempo() {
    const r = this.reprodutor;
    const el = this.element;
    if (!el) return;
    const texto = el.querySelector(".telao-tempo");
    if (texto) texto.textContent = r ? `${formatarTempo(r.tempo)} / ${formatarTempo(r.duracao)}` : "";
    const barra = el.querySelector("[name='posicao']");
    if (barra && r && !this._arrastando) {
      barra.max = Math.max(1, Math.floor(r.duracao));
      barra.value = Math.floor(r.tempo);
    }
  }

  _atualizarStatus() {
    const el = this.element;
    if (!el) return;
    const estado = estadoAtual();
    const status = el.querySelector(".telao-status");
    if (status) {
      const quem = estado.publico && mesmaFonte(estado.fonte, this.fonte) ? loc("ICARUS.Telao.Status.ParaTodos") : loc("ICARUS.Telao.Status.Previa");
      const tocando = estado.publico ? (estado.tocando ? loc("ICARUS.Telao.Status.Tocando") : loc("ICARUS.Telao.Status.Pausado")) : "";
      status.textContent = this.fonte ? [quem, tocando].filter(Boolean).join(" · ") : loc("ICARUS.Telao.Status.Vazio");
      status.classList.toggle("ao-vivo", estado.publico && mesmaFonte(estado.fonte, this.fonte));
    }
    el.querySelector(".telao-vazio")?.toggleAttribute("hidden", !!this.fonte);
  }

  /* ------------------------------ Ações (botões) ------------------------------ */

  static _aoEscolherArquivo() {
    new FilePicker({
      type: "video",
      current: this.fonte?.tipo === "arquivo" ? this.fonte.url : "",
      callback: caminho => this._carregarDoMestre(fonteDoTexto(caminho) ?? { tipo: "arquivo", url: caminho })
    }).render(true);
  }

  static _aoCarregarLink() {
    const campo = this.element.querySelector("[name='link']");
    const fonte = fonteDoTexto(campo?.value);
    if (!fonte) return ui.notifications.warn(loc("ICARUS.Telao.Aviso.LinkInvalido"));
    return this._carregarDoMestre(fonte);
  }

  static async _aoMostrar() {
    if (!this.fonte || !this.reprodutor) return ui.notifications.warn(loc("ICARUS.Telao.Aviso.SemVideo"));
    await salvarEstado({ publico: true, fonte: this.fonte, tocando: this.reprodutor.tocando, tempo: this.reprodutor.tempo });
  }

  static async _aoPlay() {
    if (!this.reprodutor) return ui.notifications.warn(loc("ICARUS.Telao.Aviso.SemVideo"));
    if (estadoAtual().publico && mesmaFonte(estadoAtual().fonte, this.fonte)) {
      await salvarEstado({ tocando: true, tempo: this.reprodutor.tempo });
    } else {
      await this.reprodutor.play();  // só a prévia do Mestre
    }
  }

  static async _aoPausar() {
    if (!this.reprodutor) return;
    this.reprodutor.pause();
    if (estadoAtual().publico) await salvarEstado({ tocando: false, tempo: this.reprodutor.tempo });
  }

  static _aoInicio() {
    return this._pular(this.fonte?.inicio ?? 0);
  }

  static async _aoFecharTodos() {
    await salvarEstado({ publico: false, tocando: false });
    this.reprodutor?.pause();
  }

  /** Jogador cujo navegador bloqueou o som: o clique libera e entra sincronizado. */
  static async _aoDesbloquear() {
    this._mostrarDesbloqueio(false);
    await this.aplicarEstado(estadoAtual());
  }
}

/** Abre o Telão (botão da barra de ferramentas ou game.icarus.telao()). */
export function abrirTelao() {
  return Telao.instancia.abrir();
}

export function registrarTelao() {
  game.settings.register(SISTEMA_ID, "telao", {
    scope: "world",
    config: false,
    type: Object,
    default: ESTADO_INICIAL,
    onChange: estado => Telao.instancia.aplicarEstado({ ...ESTADO_INICIAL, ...estado })
  });
  game.settings.register(SISTEMA_ID, "telaoVolume", {
    scope: "client",
    config: false,
    type: Number,
    default: 0.8
  });

  // Botão "Telão" na ponta esquerda da barra de atalhos (entre Players e os atalhos), sempre visível
  Hooks.on("renderHotbar", (app, html) => {
    const raiz = html instanceof HTMLElement ? html : html?.[0];
    if (!raiz || raiz.querySelector(".icarus-hotbar-telao")) return;
    const bloco = document.createElement("nav");
    bloco.className = "bar-controls flexcol icarus-hotbar-telao";
    bloco.setAttribute("aria-label", loc("ICARUS.Telao.Titulo"));
    const botao = document.createElement("a");
    botao.className = "icarus-botao-telao";
    botao.dataset.tooltip = loc("ICARUS.Telao.Titulo");
    botao.setAttribute("aria-label", loc("ICARUS.Telao.Titulo"));
    botao.setAttribute("role", "button");
    botao.tabIndex = 0;
    botao.innerHTML = `<i class="fa-solid fa-tv" aria-hidden="true"></i>`;
    bloco.append(botao);
    raiz.prepend(bloco);
  });

  // O clique é ouvido no documento inteiro, na fase de captura: assim nenhuma camada da interface
  // do Foundry por cima da barra consegue engolir o clique antes de chegar ao botão.
  const dentroDoBotao = ev => {
    if (ev.target?.closest?.(".icarus-botao-telao")) return true;
    // Clique "atravessado" por uma camada invisível: confere se caiu na área do botão
    if (ev.type !== "click") return false;
    const botao = document.querySelector("#hotbar .icarus-botao-telao");
    const r = botao?.getBoundingClientRect();
    return !!r && r.width > 0 && ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
  };
  const aoAcionar = ev => {
    if (!dentroDoBotao(ev)) return;
    if (ev.type === "keydown" && ev.key !== "Enter" && ev.key !== " ") return;
    ev.preventDefault();
    ev.stopPropagation();
    abrirTelao();
  };
  document.addEventListener("click", aoAcionar, true);
  document.addEventListener("keydown", aoAcionar, true);

  // Botão "Telão" na barra de ferramentas dos tokens (só aparece com uma cena aberta)
  Hooks.on("getSceneControlButtons", controles => {
    const tokens = controles.find(c => c.name === "token");
    tokens?.tools.push({
      name: "icarus-telao",
      title: "ICARUS.Telao.Titulo",
      icon: "fa-solid fa-tv",
      button: true,
      onClick: () => abrirTelao()
    });
  });

  // Quem entra com um vídeo já sendo exibido abre o Telão no ponto certo
  Hooks.once("ready", () => {
    const estado = estadoAtual();
    if (estado.publico && estado.fonte) Telao.instancia.aplicarEstado(estado);
  });
}
