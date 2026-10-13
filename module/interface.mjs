import { SISTEMA_ID } from "./config.mjs";

/**
 * Identidade visual do Icarus na interface do Foundry:
 * logo no lugar da bigorna, dado vermelho na mensagem "Jogo Pausado"
 * e wallpaper no fundo quando não há cena aberta (o wallpaper fica só no CSS).
 * O CSS (styles/icarus.css) já troca as imagens; aqui trocamos também o "src",
 * para navegadores que não aceitam "content: url()" em <img>.
 */
const PASTA = `systems/${SISTEMA_ID}/img/ui`;
export const IMAGENS_INTERFACE = {
  logo: `${PASTA}/logo-icarus.webp`,
  pausa: `${PASTA}/pausa-dado.webp`
};

export function registrarInterface() {
  Hooks.once("ready", () => {
    const logo = document.getElementById("logo");
    if (!logo) return;
    logo.src = IMAGENS_INTERFACE.logo;
    logo.alt = "Icarus RPG";
  });

  Hooks.on("renderPause", (app, html) => {
    const raiz = html instanceof HTMLElement ? html : html?.[0];
    const img = raiz?.querySelector("img");
    if (img) img.src = IMAGENS_INTERFACE.pausa;
  });
}
