/**
 * Mídias das cenas animadas (URLs num lugar só) e pré-carregamento em todos os clientes.
 * Servidas pelo próprio Foundry (systems/icarus-rpg/...): mesma origem, tipo MIME e Range certos
 * para vídeo, e funciona sem internet. Arquivos em img/animacoes/ (nomes ASCII) e o dado vermelho
 * que o sistema já usa (img/Icones/default/).
 */
import { SISTEMA_ID } from "./config.mjs";

const caminho = rel => encodeURI(`systems/${SISTEMA_ID}/img/${rel}`);

export const MIDIAS = {
  portaEstatica: caminho("animacoes/teste-abrir-porta-estatico.jpg"),
  portaVideo: caminho("animacoes/teste-abrir-porta-video.mp4"),
  dadoVermelho: caminho("Icones/default/Dado Vermelho 500x500.png")
};

const carregadas = new Map();

/** Pré-carrega imagens e vídeo (uma vez por cliente). @returns {Promise<Record<string, boolean>>} ok por mídia */
export function preCarregarMidias() {
  const tarefas = Object.entries(MIDIAS).map(([chave, url]) => {
    if (!carregadas.has(chave)) {
      carregadas.set(chave, new Promise(ok => {
        if (url.endsWith(".mp4")) {
          const v = document.createElement("video");
          v.preload = "auto";
          v.muted = true;
          v.oncanplaythrough = () => ok(true);
          v.onerror = () => { carregadas.delete(chave); ok(false); };
          v.src = url;
          v.load();
          // Guarda a referência para o navegador não descartar o que já baixou
          preCarregarMidias.video = v;
        } else {
          const img = new Image();
          img.onload = () => ok(true);
          img.onerror = () => { carregadas.delete(chave); ok(false); };
          img.src = url;
        }
      }));
    }
    return carregadas.get(chave).then(r => [chave, r]);
  });
  return Promise.all(tarefas).then(Object.fromEntries);
}

export function registrarMidias() {
  Hooks.once("ready", () => preCarregarMidias());
  Hooks.on("canvasReady", () => preCarregarMidias());
}
