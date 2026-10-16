/**
 * Atalhos na ponta esquerda da barra de macros (hotbar), entre Players e os atalhos:
 *   [Telão] [Condições] [Teste Oposto] [Teste de Resistência]
 * Ponto único de injeção (hook renderHotbar). O Telão aparece para todos; os outros três só
 * para o Mestre. Cada atalho do Mestre executa a macro correspondente do compêndio
 * icarus-rpg.macros (localizada por flags["icarus-rpg"].id); sem o compêndio, chama a API direto.
 */
import { SISTEMA_ID } from "./config.mjs";
import { imagemOuPadrao } from "./imagens.mjs";
import { abrirTelao } from "./telao/telao.mjs";

const loc = k => game.i18n.localize(k);

export const ATALHOS = [
  { id: "telao", imagem: "monitor", rotulo: "ICARUS.Telao.Titulo", todos: true, api: () => abrirTelao() },
  { id: "aplicar-condicao", imagem: "condicoes", rotulo: "ICARUS.Atalhos.Condicoes", macro: true, api: () => game.icarus.condicoes.abrirPainel() },
  { id: "teste-oposto", imagem: "testeOposto", rotulo: "ICARUS.Atalhos.TesteOposto", macro: true, api: () => game.icarus.testes.abrirOposto() },
  { id: "teste-resistencia", imagem: "testeResistencia", rotulo: "ICARUS.Atalhos.TesteResistencia", macro: true, api: () => game.icarus.testes.abrirResistencia() }
];

/** Executa a macro do compêndio pelo id; se não achar (ou falhar), usa a API. */
async function executar(atalho) {
  if (atalho.macro) {
    try {
      const pack = game.packs.get(`${SISTEMA_ID}.macros`);
      const indice = pack ? await pack.getIndex({ fields: [`flags.${SISTEMA_ID}.id`] }) : null;
      const entrada = indice?.find(e => foundry.utils.getProperty(e, `flags.${SISTEMA_ID}.id`) === atalho.id);
      const macro = entrada ? await pack.getDocument(entrada._id) : null;
      if (macro) return await macro.execute();
    } catch (erro) {
      console.warn(`Icarus RPG | Macro "${atalho.id}" falhou; usando a API direto.`, erro);
    }
  }
  return atalho.api();
}

function criarBotao(atalho) {
  const botao = document.createElement("a");
  botao.className = "icarus-atalho";
  botao.dataset.atalho = atalho.id;
  botao.dataset.tooltip = loc(atalho.rotulo);
  botao.setAttribute("aria-label", loc(atalho.rotulo));
  botao.setAttribute("role", "button");
  botao.tabIndex = 0;
  const img = document.createElement("img");
  img.src = imagemOuPadrao(atalho.imagem);
  img.alt = "";
  img.width = img.height = 32;
  img.addEventListener("error", () => { img.src = imagemOuPadrao("dadoAzul"); }, { once: true });
  botao.append(img);
  return botao;
}

export function registrarAtalhos() {
  Hooks.on("renderHotbar", (app, html) => {
    const raiz = html instanceof HTMLElement ? html : html?.[0];
    if (!raiz || raiz.querySelector(".icarus-atalhos")) return;
    const bloco = document.createElement("nav");
    bloco.className = "bar-controls icarus-atalhos";
    bloco.setAttribute("aria-label", loc("ICARUS.Atalhos.Titulo"));
    for (const atalho of ATALHOS) if (atalho.todos || game.user.isGM) bloco.append(criarBotao(atalho));
    raiz.prepend(bloco);
  });

  // O clique é ouvido no documento inteiro, na fase de captura: assim nenhuma camada da interface
  // do Foundry por cima da barra consegue engolir o clique antes de chegar ao botão.
  const botaoDoEvento = ev => {
    const direto = ev.target?.closest?.(".icarus-atalho");
    if (direto) return direto;
    // Clique "atravessado" por uma camada invisível: confere se caiu na área de algum botão
    if (ev.type !== "click") return null;
    return [...document.querySelectorAll("#hotbar .icarus-atalho")].find(b => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
    }) ?? null;
  };
  const aoAcionar = ev => {
    const botao = botaoDoEvento(ev);
    if (!botao) return;
    if (ev.type === "keydown" && ev.key !== "Enter" && ev.key !== " ") return;
    ev.preventDefault();
    ev.stopPropagation();
    const atalho = ATALHOS.find(a => a.id === botao.dataset.atalho);
    if (atalho && (atalho.todos || game.user.isGM)) executar(atalho);
  };
  document.addEventListener("click", aoAcionar, true);
  document.addEventListener("keydown", aoAcionar, true);
}
