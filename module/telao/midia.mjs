/**
 * Telão: lógica pura (sem Foundry), testada em tests/telao.test.mjs.
 * Reconhece a fonte do vídeo e calcula em que ponto cada um deve estar.
 */

/** Extensões de vídeo que o navegador toca direto (as mesmas que o Foundry aceita). */
export const EXTENSOES_VIDEO = ["mp4", "webm", "ogg", "ogv", "m4v", "mov"];

/**
 * Id de um vídeo do YouTube a partir de qualquer formato de link:
 * youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID, /embed/ID, /live/ID ou só o ID.
 * @returns {string|null}
 */
export function idDoYoutube(texto) {
  const t = String(texto ?? "").trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(t)) return t;
  let url;
  try { url = new URL(t.startsWith("http") ? t : `https://${t}`); } catch { return null; }
  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, "");
  let id = null;
  if (host === "youtu.be") id = url.pathname.split("/")[1];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id = url.searchParams.get("v");
    const partes = url.pathname.split("/").filter(Boolean);
    if (!id && ["shorts", "embed", "live", "v"].includes(partes[0])) id = partes[1];
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

/** Segundo de início indicado no link do YouTube (?t=90, ?t=1m30s, ?start=90). */
export function inicioDoYoutube(texto) {
  let url;
  try { url = new URL(String(texto).trim()); } catch { return 0; }
  const t = url.searchParams.get("t") ?? url.searchParams.get("start");
  if (!t) return 0;
  if (/^\d+$/.test(t)) return Number(t);
  const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  return m ? (Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)) : 0;
}

/**
 * Fonte do vídeo a partir do que o Mestre escolheu ou colou.
 * @returns {{tipo:"youtube", id:string, inicio:number} | {tipo:"arquivo", url:string} | null}
 */
export function fonteDoTexto(texto) {
  const t = String(texto ?? "").trim();
  if (!t) return null;
  const id = idDoYoutube(t);
  if (id) return { tipo: "youtube", id, inicio: inicioDoYoutube(t) };
  const semParametros = t.split(/[?#]/)[0].toLowerCase();
  if (EXTENSOES_VIDEO.some(ext => semParametros.endsWith(`.${ext}`))) return { tipo: "arquivo", url: t };
  return null;
}

/** Duas fontes são o mesmo vídeo? */
export function mesmaFonte(a, b) {
  if (!a || !b || a.tipo !== b.tipo) return false;
  return a.tipo === "youtube" ? a.id === b.id : a.url === b.url;
}

/**
 * Ponto do vídeo (em segundos) onde todos devem estar agora.
 * Tocando: o tempo salvo pelo Mestre + o que passou desde então (relógio do servidor).
 * Pausado: o tempo salvo.
 * @param {{tocando:boolean, tempo:number, quando:number}} estado
 * @param {number} agora  relógio do servidor em milissegundos
 */
export function tempoAlvo(estado, agora) {
  const base = Math.max(0, Number(estado?.tempo) || 0);
  if (!estado?.tocando) return base;
  return base + Math.max(0, (Number(agora) - Number(estado.quando || agora)) / 1000);
}

/** Diferença a partir da qual vale a pena pular para o ponto certo (evita pulos à toa). */
export const TOLERANCIA_SINCRONIA = 1.0;

/** Precisa pular para sincronizar? */
export function precisaAjustar(tempoAtual, alvo) {
  return Math.abs((Number(tempoAtual) || 0) - alvo) > TOLERANCIA_SINCRONIA;
}

/** "1:05" ou "1:02:05" */
export function formatarTempo(segundos) {
  const s = Math.max(0, Math.floor(Number(segundos) || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const dois = n => String(n).padStart(2, "0");
  return h ? `${h}:${dois(m)}:${dois(r)}` : `${m}:${dois(r)}`;
}
