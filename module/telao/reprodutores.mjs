/**
 * Reprodutores do Telão, com a mesma interface para vídeo de arquivo e YouTube:
 * pronto(), play() → true/false (false = navegador bloqueou o som), pause(), seek(s),
 * tempo, duracao, tocando, volume(v), destruir().
 */

/* ------------------------------ Vídeo de arquivo ------------------------------ */

export class ReprodutorArquivo {
  constructor(palco, url) {
    this.video = document.createElement("video");
    this.video.src = url;
    this.video.preload = "auto";
    this.video.playsInline = true;
    this.video.controls = false;
    this.video.className = "telao-video";
    palco.append(this.video);
  }

  pronto() {
    if (this.video.readyState >= 1) return Promise.resolve();
    return new Promise((resolve, reject) => {
      this.video.addEventListener("loadedmetadata", () => resolve(), { once: true });
      this.video.addEventListener("error", () => reject(new Error("arquivo")), { once: true });
    });
  }

  async play() {
    try {
      await this.video.play();
      return true;
    } catch (erro) {
      if (erro.name === "NotAllowedError") return false;
      throw erro;
    }
  }

  pause() { this.video.pause(); }
  seek(segundos) { this.video.currentTime = Math.max(0, segundos); }
  get tempo() { return this.video.currentTime || 0; }
  get duracao() { return Number.isFinite(this.video.duration) ? this.video.duration : 0; }
  get tocando() { return !this.video.paused && !this.video.ended; }
  volume(v) { this.video.volume = Math.min(1, Math.max(0, v)); }

  destruir() {
    this.video.pause();
    this.video.removeAttribute("src");
    this.video.load();
    this.video.remove();
  }
}

/* ------------------------------ YouTube ------------------------------ */

let promessaApi = null;

/** Carrega a API de iframe do YouTube uma vez só. */
function carregarApiYoutube() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  promessaApi ??= new Promise((resolve, reject) => {
    const anterior = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { anterior?.(); resolve(window.YT); };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => { promessaApi = null; reject(new Error("youtube-api")); };
    document.head.append(script);
  });
  return promessaApi;
}

/** Estados do player do YouTube. */
const YT_TOCANDO = 1;
const YT_CARREGANDO = 3;

export class ReprodutorYoutube {
  /**
   * @param {HTMLElement} palco
   * @param {string} id       id do vídeo
   * @param {object} opcoes   { inicio, aoErro(codigo) }
   */
  constructor(palco, id, { inicio = 0, aoErro } = {}) {
    const alvo = document.createElement("div");
    palco.append(alvo);
    this._promessa = carregarApiYoutube().then(YT => new Promise((resolve, reject) => {
      this.player = new YT.Player(alvo, {
        videoId: id,
        width: "100%",
        height: "100%",
        // Sem controles do YouTube: quem controla é o Mestre pelos botões do Telão
        playerVars: { controls: 0, disablekb: 1, modestbranding: 1, rel: 0, playsinline: 1, iv_load_policy: 3, fs: 0, start: Math.floor(inicio), origin: window.location.origin },
        events: {
          onReady: () => resolve(),
          onError: ev => { aoErro?.(ev.data); reject(new Error(`youtube-${ev.data}`)); }
        }
      });
    }));
  }

  pronto() { return this._promessa; }

  /** Dá play e confere se começou mesmo (o navegador pode bloquear vídeo com som). */
  play() {
    this.player.playVideo();
    return new Promise(resolve => {
      const inicio = Date.now();
      const conferir = () => {
        const estado = this.player.getPlayerState?.();
        if (estado === YT_TOCANDO || estado === YT_CARREGANDO) return resolve(true);
        if (Date.now() - inicio > 2000) return resolve(false);
        setTimeout(conferir, 150);
      };
      conferir();
    });
  }

  pause() { this.player?.pauseVideo?.(); }
  seek(segundos) { this.player?.seekTo?.(Math.max(0, segundos), true); }
  get tempo() { return this.player?.getCurrentTime?.() ?? 0; }
  get duracao() { return this.player?.getDuration?.() ?? 0; }
  get tocando() { return this.player?.getPlayerState?.() === YT_TOCANDO; }
  volume(v) { this.player?.setVolume?.(Math.round(Math.min(1, Math.max(0, v)) * 100)); }

  destruir() {
    try { this.player?.destroy?.(); } catch { /* o iframe já pode ter saído */ }
  }
}
