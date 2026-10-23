/**
 * Editor do token (aba Token da ficha): galeria de molduras, prévia em <canvas>, arrastar (ponteiro
 * e toque), zoom (+ / − / roda do mouse no cursor / slider), Centralizar, Aplicar e Restaurar.
 * Não depende do Foundry: quem usa passa o estado salvo e as funções de salvar/aplicar
 * (module/token.mjs). A regra principal fica na composição: retrato → silhueta (destination-in) →
 * moldura por cima; nenhum pixel do retrato sai da silhueta, na prévia e no PNG final.
 */
import {
  opacosDe, silhueta, limitar, retanguloDoRetrato, zoomNoPonto, enquadramentoInicial, ZOOM_MAXIMO, PERMITIR_ZOOM_OUT_LIVRE
} from "./token-mascara.mjs";

/** Passo do zoom nos botões e na roda. */
export const PASSO_ZOOM = 1.15;
/** Lado do PNG final; se passar do limite (2 MB), cai para os seguintes. */
export const TAMANHOS_FINAIS = [1024, 768, 512, 384, 256];
export const LIMITE_BYTES = 2 * 1024 * 1024;

const cacheImagens = new Map();
const cacheMascaras = new Map();

/** Carrega uma imagem (crossOrigin anônimo, para o canvas poder exportar). */
export function carregarImagem(src) {
  if (!cacheImagens.has(src)) {
    cacheImagens.set(src, new Promise((ok, falha) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.onload = () => ok(img);
      img.onerror = () => { cacheImagens.delete(src); falha(new Error(src)); };
      img.src = src;
    }));
  }
  return cacheImagens.get(src);
}

/**
 * Silhueta da moldura como canvas (alfa 255 dentro, 0 fora), na resolução nativa. Em cache por moldura.
 * @param {{ id, fechamento }} moldura  entrada do manifesto
 */
export async function mascaraDaMoldura(moldura, img) {
  if (cacheMascaras.has(moldura.id)) return cacheMascaras.get(moldura.id);
  const w = img.naturalWidth, h = img.naturalHeight;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const dados = ctx.getImageData(0, 0, w, h); // falha aqui = canvas "tainted" (CORS)
  const s = silhueta(opacosDe(dados.data, w, h), w, h, moldura.fechamento ?? 0);
  for (let i = 0; i < w * h; i++) { const o = i * 4; dados.data[o] = dados.data[o + 1] = dados.data[o + 2] = 0; dados.data[o + 3] = s[i] ? 255 : 0; }
  ctx.putImageData(dados, 0, 0);
  cacheMascaras.set(moldura.id, c);
  return c;
}

/**
 * Máscara no tamanho de destino, binária: reduzir com suavização espalha alfa para fora da borda,
 * então só fica o que é 100% silhueta (alfa 255). Encolhe menos de 1 px na borda externa, que fica
 * sob o aro opaco; assim nenhum pixel do retrato passa da silhueta em nenhuma resolução.
 */
export function mascaraNoTamanho(mascara, lado) {
  const chave = `${mascara.dataset?.id ?? ""}:${lado}`;
  const cache = mascara._porTamanho ??= new Map();
  if (cache.has(chave)) return cache.get(chave);
  const c = document.createElement("canvas");
  c.width = c.height = lado;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(mascara, 0, 0, lado, lado);
  const d = ctx.getImageData(0, 0, lado, lado);
  for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] === 255 ? 255 : 0;
  ctx.putImageData(d, 0, 0);
  cache.set(chave, c);
  return c;
}

/**
 * Composição do token num contexto 2D de lado `lado` px: retrato (enquadramento e) → silhueta
 * (destination-in) → moldura por cima. Sem retrato: só a moldura.
 */
export function compor(ctx, lado, { retrato, moldura, mascara, caixa, e }) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, lado, lado);
  ctx.imageSmoothingQuality = "high";
  if (retrato) {
    const r = retanguloDoRetrato(e, { w: retrato.naturalWidth, h: retrato.naturalHeight }, caixa, lado);
    ctx.drawImage(retrato, r.x, r.y, r.w, r.h);
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(mascaraNoTamanho(mascara, lado), 0, 0);
    ctx.globalCompositeOperation = "source-over";
  }
  ctx.drawImage(moldura, 0, 0, lado, lado);
  ctx.restore();
}

/** PNG final (Blob) do lado pedido. */
export function gerarPng({ retrato, moldura, mascara, caixa, e }, lado) {
  const c = document.createElement("canvas");
  c.width = c.height = lado;
  compor(c.getContext("2d"), lado, { retrato, moldura, mascara, caixa, e });
  return new Promise((ok, falha) => c.toBlob(b => (b ? ok(b) : falha(new Error("toBlob"))), "image/png"));
}

/** PNG final dentro do limite de bytes: tenta 1024 px e vai reduzindo. */
export async function pngDentroDoLimite(partes, limite = LIMITE_BYTES) {
  let blob = null;
  for (const lado of TAMANHOS_FINAIS) {
    blob = await gerarPng(partes, lado);
    if (blob.size <= limite) return blob;
  }
  return blob;
}

/**
 * Editor ligado a um elemento .token-editor da ficha.
 * @param {HTMLElement} raiz
 * @param {object} op
 * @param {{ tokens: object[], pasta: string }} op.manifesto
 * @param {(t) => string} op.urlDaMoldura
 * @param {object|null} op.estado       salvo (flags.token) { molduraId, retratoSrc, x, y, escala, aplicado }
 * @param {string|null} op.retratoAtual  imagem do ator (null = sem imagem)
 * @param {boolean} op.editavel
 * @param {(estado) => void} op.aoMudar      salvar o rascunho (já com debounce aqui)
 * @param {(partes, estado) => Promise} op.aoAplicar
 * @param {() => void} op.aoEscolherRetrato
 * @param {(chave, dados?) => string} op.t   tradução
 */
export class EditorDeToken {
  constructor(raiz, op) {
    this.raiz = raiz;
    this.op = op;
    this.canvas = raiz.querySelector("canvas.token-previa");
    this.ctx = this.canvas.getContext("2d");
    const salvo = op.estado ?? {};
    this.molduraId = op.manifesto.tokens.some(t => t.id === salvo.molduraId) ? salvo.molduraId : op.manifesto.tokens[0]?.id;
    this.retratoSrc = salvo.retratoSrc || op.retratoAtual;
    this.e = salvo.escala ? { x: salvo.x, y: salvo.y, escala: salvo.escala } : null;
    this.arrasto = null;
    this.ponteiros = new Map();
    this.timer = null;
    this.ouvintes = [];
  }

  get moldura() { return this.op.manifesto.tokens.find(t => t.id === this.molduraId); }
  get caixa() { return this.moldura?.abertura ?? { x0: 0.2, y0: 0.2, x1: 0.8, y1: 0.8 }; }
  get retratoTam() { return this.retrato ? { w: this.retrato.naturalWidth, h: this.retrato.naturalHeight } : { w: 1, h: 1 }; }

  ouvir(el, evento, fn, opcoes) { el?.addEventListener(evento, fn, opcoes); this.ouvintes.push(() => el?.removeEventListener(evento, fn, opcoes)); }
  destruir() { for (const f of this.ouvintes) f(); this.ouvintes = []; clearTimeout(this.timer); }

  mensagem(chave, dados) {
    const el = this.raiz.querySelector(".token-mensagem");
    if (!el) return;
    el.textContent = chave ? this.op.t(chave, dados) : "";
    el.hidden = !chave;
  }

  async iniciar() {
    // Galeria
    for (const b of this.raiz.querySelectorAll("[data-moldura]")) {
      b.classList.toggle("ativa", b.dataset.moldura === this.molduraId);
      b.setAttribute("aria-pressed", String(b.dataset.moldura === this.molduraId));
      if (this.op.editavel) this.ouvir(b, "click", () => this.escolherMoldura(b.dataset.moldura));
    }
    if (this.op.editavel) this.ligarInteracao();
    this.ajustarResolucao();
    this.ouvir(window, "resize", () => { this.ajustarResolucao(); this.desenhar(); });
    await this.carregar();
  }

  /** Canvas da prévia com devicePixelRatio (nítido). */
  ajustarResolucao() {
    const lado = Math.round((this.canvas.clientWidth || 320) * (window.devicePixelRatio || 1));
    if (this.canvas.width !== lado) this.canvas.width = this.canvas.height = lado;
  }

  async carregar() {
    this.mensagem(null);
    const t = this.moldura;
    if (!t) return this.mensagem("ICARUS.Token.SemMolduras");
    try {
      this.imgMoldura = await carregarImagem(this.op.urlDaMoldura(t));
      this.mascara = await mascaraDaMoldura(t, this.imgMoldura);
    } catch (erro) {
      console.warn("Icarus RPG | Token: moldura não carregou", erro);
      this.imgMoldura = this.mascara = null;
      this.mensagem("ICARUS.Token.ErroMoldura", { nome: t.nome });
      return this.desenhar();
    }
    this.retrato = null;
    if (!this.retratoSrc) this.mensagem("ICARUS.Token.SemRetrato");
    else {
      try { this.retrato = await carregarImagem(this.retratoSrc); }
      catch (erro) { console.warn("Icarus RPG | Token: retrato não carregou", erro); this.mensagem("ICARUS.Token.ErroRetrato"); }
    }
    this.e = limitar(this.e ?? enquadramentoInicial(this.caixa), this.retratoTam, this.caixa, this.canvas.width);
    this.atualizarControles();
    this.desenhar();
  }

  desenhar() {
    const lado = this.canvas.width;
    if (!this.imgMoldura) { this.ctx.clearRect(0, 0, lado, lado); return; }
    compor(this.ctx, lado, { retrato: this.retrato, moldura: this.imgMoldura, mascara: this.mascara, caixa: this.caixa, e: this.e });
  }

  atualizarControles() {
    const slider = this.raiz.querySelector("input.token-zoom");
    if (slider) { slider.min = PERMITIR_ZOOM_OUT_LIVRE ? "0.2" : "1"; slider.max = String(ZOOM_MAXIMO); slider.value = String(this.e?.escala ?? 1); }
    const sem = !this.retrato || !this.op.editavel;
    for (const b of this.raiz.querySelectorAll("[data-token-acao]")) {
      if (["mais", "menos", "centralizar", "aplicar"].includes(b.dataset.tokenAcao)) b.disabled = sem;
    }
    if (slider) slider.disabled = sem;
  }

  /** Muda o enquadramento (sempre limitado), redesenha e agenda o salvamento do rascunho. */
  mudar(e) {
    this.e = limitar(e, this.retratoTam, this.caixa, this.canvas.width);
    const slider = this.raiz.querySelector("input.token-zoom");
    if (slider) slider.value = String(this.e.escala);
    this.desenhar();
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.op.aoMudar?.(this.estado()), 600);
  }

  estado() {
    return { molduraId: this.molduraId, retratoSrc: this.retratoSrc, x: this.e?.x, y: this.e?.y, escala: this.e?.escala, versao: 1 };
  }

  partes() {
    return { retrato: this.retrato, moldura: this.imgMoldura, mascara: this.mascara, caixa: this.caixa, e: this.e };
  }

  async escolherMoldura(id) {
    if (id === this.molduraId) return;
    this.molduraId = id;
    for (const b of this.raiz.querySelectorAll("[data-moldura]")) {
      b.classList.toggle("ativa", b.dataset.moldura === id);
      b.setAttribute("aria-pressed", String(b.dataset.moldura === id));
    }
    await this.carregar();
    this.mudar(this.e);
  }

  /** Ponto do evento em 0–1 do canvas. */
  ponto(ev) {
    const r = this.canvas.getBoundingClientRect();
    return { x: (ev.clientX - r.left) / r.width, y: (ev.clientY - r.top) / r.height };
  }

  ligarInteracao() {
    const c = this.canvas;
    c.style.touchAction = "none";
    this.ouvir(c, "pointerdown", ev => {
      if (!this.retrato) return;
      c.setPointerCapture(ev.pointerId);
      this.ponteiros.set(ev.pointerId, this.ponto(ev));
      this.arrasto = { inicio: this.ponto(ev), e: { ...this.e }, pinca: null };
      if (this.ponteiros.size === 2) {
        const [a, b] = [...this.ponteiros.values()];
        this.arrasto.pinca = { d: Math.hypot(a.x - b.x, a.y - b.y), e: { ...this.e } };
      }
      c.classList.add("arrastando");
    });
    this.ouvir(c, "pointermove", ev => {
      if (!this.arrasto || !this.ponteiros.has(ev.pointerId)) return;
      const p = this.ponto(ev);
      this.ponteiros.set(ev.pointerId, p);
      if (this.ponteiros.size === 2 && this.arrasto.pinca) {
        // Pinça (toque): zoom pelo centro dos dois dedos
        const [a, b] = [...this.ponteiros.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const meio = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const base = this.arrasto.pinca.e;
        return this.mudar(zoomNoPonto(base, d / (this.arrasto.pinca.d || d), meio.x, meio.y, this.retratoTam, this.caixa, this.canvas.width));
      }
      const { inicio, e } = this.arrasto;
      this.mudar({ ...e, x: e.x + (p.x - inicio.x), y: e.y + (p.y - inicio.y) });
    });
    const soltar = ev => {
      this.ponteiros.delete(ev.pointerId);
      if (!this.ponteiros.size) { this.arrasto = null; c.classList.remove("arrastando"); }
      else this.arrasto = { inicio: [...this.ponteiros.values()][0], e: { ...this.e }, pinca: null };
    };
    this.ouvir(c, "pointerup", soltar);
    this.ouvir(c, "pointercancel", soltar);
    // Roda: zoom em direção ao cursor; não rola a ficha
    this.ouvir(c, "wheel", ev => {
      ev.preventDefault();
      ev.stopPropagation();
      if (!this.retrato) return;
      const p = this.ponto(ev);
      const fator = ev.deltaY < 0 ? PASSO_ZOOM : 1 / PASSO_ZOOM;
      this.mudar(zoomNoPonto(this.e, fator, p.x, p.y, this.retratoTam, this.caixa, this.canvas.width));
    }, { passive: false });
    this.ouvir(this.raiz.querySelector("input.token-zoom"), "input", ev => this.mudar({ ...this.e, escala: Number(ev.currentTarget.value) }));
    for (const b of this.raiz.querySelectorAll("[data-token-acao]")) this.ouvir(b, "click", () => this.acao(b.dataset.tokenAcao));
  }

  async acao(acao) {
    const centro = { x: (this.caixa.x0 + this.caixa.x1) / 2, y: (this.caixa.y0 + this.caixa.y1) / 2 };
    switch (acao) {
      case "mais": return this.mudar(zoomNoPonto(this.e, PASSO_ZOOM, centro.x, centro.y, this.retratoTam, this.caixa, this.canvas.width));
      case "menos": return this.mudar(zoomNoPonto(this.e, 1 / PASSO_ZOOM, centro.x, centro.y, this.retratoTam, this.caixa, this.canvas.width));
      case "centralizar": return this.mudar(enquadramentoInicial(this.caixa));
      case "retrato": return this.op.aoEscolherRetrato?.();
      case "usar-retrato-atual":
        this.retratoSrc = this.op.retratoAtual;
        await this.carregar();
        return this.mudar(this.e);
      case "restaurar": {
        const a = this.op.estado?.aplicado;
        if (!a) return;
        this.molduraId = a.molduraId;
        this.retratoSrc = a.retratoSrc;
        this.e = { x: a.x, y: a.y, escala: a.escala };
        for (const b of this.raiz.querySelectorAll("[data-moldura]")) b.classList.toggle("ativa", b.dataset.moldura === this.molduraId);
        await this.carregar();
        return this.mudar(this.e);
      }
      case "aplicar": {
        if (!this.retrato || !this.mascara) return;
        const botao = this.raiz.querySelector("[data-token-acao='aplicar']");
        if (botao) botao.disabled = true;
        try { await this.op.aoAplicar?.(this.partes(), this.estado()); }
        finally { if (botao) botao.disabled = false; }
      }
    }
  }
}
