/**
 * Aprovação do Mestre para rolagens grandes digitadas no chat (opção do mundo, ligada por padrão).
 * Jogador digita uma rolagem com mais dados que o limite (16): a rolagem não acontece; vai uma
 * mensagem sussurrada ao Mestre, que aparece de um jeito para cada um:
 * - Mestre: "<jogador> quer rolar 20d6 (20 dados). Aprovar / Recusar";
 * - quem pediu: "O Mestre está avaliando se você poderá fazer esta rolagem".
 * O Mestre decide (grava a decisão na mensagem); aprovada, o cliente de quem pediu faz a rolagem
 * original (uma vez só). Sem Mestre conectado, a rolagem não é feita. Ataques, poderes,
 * habilidades e magias rolam pelo sistema e não passam por aqui.
 * Regras puras: module/rolagem-aprovacao-dados.mjs.
 */
import { SISTEMA_ID } from "./config.mjs";
import { precisaAprovar, dadosDaMensagem, LIMITE_PADRAO } from "./rolagem-aprovacao-dados.mjs";

const F = SISTEMA_ID;
const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);
const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
/** Rolagens aprovadas que este cliente pode mandar sem perguntar de novo. */
const liberadas = new Set();
const executadas = new Set();
const autorDe = m => m.author ?? m.user;

async function pedirAprovacao(texto) {
  const n = dadosDaMensagem(texto);
  if (!game.users.activeGM) {
    ui.notifications.warn(fmt("ICARUS.RolagemGrande.SemMestre", { n }));
    return;
  }
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker(),
    whisper: game.users.filter(u => u.isGM).map(u => u.id),
    content: `<p>${esc(fmt("ICARUS.RolagemGrande.Pedido", { nome: game.user.name, n }))} <code>${esc(texto)}</code></p>`,
    flags: { [F]: { pedidoRolagem: { texto, dados: n, estado: "pendente" } } }
  });
  ui.notifications.info(loc("ICARUS.RolagemGrande.Avaliando"));
}

/** Conteúdo da mensagem para quem está vendo (Mestre, quem pediu ou outro). */
function htmlDoPedido(mensagem, pedido) {
  const nome = autorDe(mensagem)?.name ?? "?";
  const rolagem = `<code>${esc(pedido.texto)}</code> (${esc(fmt("ICARUS.RolagemGrande.NDados", { n: pedido.dados }))})`;
  if (pedido.estado === "aprovada") return `<p><i class="fa-solid fa-check"></i> ${esc(fmt("ICARUS.RolagemGrande.Aprovada", { nome, por: pedido.por ?? "" }))} ${rolagem}</p>`;
  if (pedido.estado === "recusada") return `<p><i class="fa-solid fa-xmark"></i> ${esc(fmt("ICARUS.RolagemGrande.Recusada", { nome, por: pedido.por ?? "" }))} ${rolagem}</p>`;
  if (game.user.isGM) {
    return `<p>${esc(fmt("ICARUS.RolagemGrande.PerguntaMestre", { nome }))} ${rolagem}</p>
      <div class="rolagem-botoes"><button type="button" data-icarus-rolagem="aprovada"><i class="fa-solid fa-check"></i> ${esc(loc("ICARUS.RolagemGrande.Aprovar"))}</button>
      <button type="button" data-icarus-rolagem="recusada"><i class="fa-solid fa-xmark"></i> ${esc(loc("ICARUS.RolagemGrande.Recusar"))}</button></div>`;
  }
  return `<p><i class="fa-solid fa-hourglass-half"></i> ${esc(loc("ICARUS.RolagemGrande.AvaliandoChat"))} ${rolagem}</p>`;
}

/** Aprovada: o cliente de quem pediu faz a rolagem original (uma vez). */
async function executarSeAprovada(mensagem) {
  const pedido = mensagem.flags?.[F]?.pedidoRolagem;
  if (!pedido || autorDe(mensagem)?.id !== game.user.id || executadas.has(mensagem.id) || pedido.executada) return;
  if (pedido.estado === "recusada") {
    executadas.add(mensagem.id);
    return ui.notifications.warn(loc("ICARUS.RolagemGrande.RecusadaAviso"));
  }
  if (pedido.estado !== "aprovada") return;
  executadas.add(mensagem.id);
  await mensagem.update({ [`flags.${F}.pedidoRolagem.executada`]: true });
  liberadas.add(pedido.texto);
  await ui.chat.processMessage(pedido.texto);
}

export function registrarAprovacaoDeRolagens() {
  game.settings.register(F, "aprovarRolagensGrandes", {
    name: "ICARUS.RolagemGrande.Config.Ativo", hint: "ICARUS.RolagemGrande.Config.AtivoDica",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register(F, "limiteDadosRolagem", {
    name: "ICARUS.RolagemGrande.Config.Limite", hint: "ICARUS.RolagemGrande.Config.LimiteDica",
    scope: "world", config: true, type: Number, default: LIMITE_PADRAO
  });

  // Antes de o Foundry interpretar o que o jogador digitou: false = não envia
  Hooks.on("chatMessage", (_chat, texto) => {
    if (liberadas.delete(texto)) return true;
    const pedir = precisaAprovar({
      texto, ehMestre: game.user.isGM,
      ativo: game.settings.get(F, "aprovarRolagensGrandes"), limite: game.settings.get(F, "limiteDadosRolagem")
    });
    if (!pedir) return true;
    pedirAprovacao(texto);
    return false;
  });

  Hooks.on("renderChatMessage", (mensagem, html) => {
    const pedido = mensagem.flags?.[F]?.pedidoRolagem;
    if (!pedido) return;
    const raiz = html instanceof HTMLElement ? html : html[0];
    const conteudo = raiz?.querySelector(".message-content");
    if (!conteudo) return;
    conteudo.innerHTML = htmlDoPedido(mensagem, pedido);
    for (const botao of conteudo.querySelectorAll("[data-icarus-rolagem]")) {
      botao.addEventListener("click", async ev => {
        ev.preventDefault();
        if (!game.user.isGM) return;
        conteudo.querySelectorAll("[data-icarus-rolagem]").forEach(b => { b.disabled = true; });
        await mensagem.update({ [`flags.${F}.pedidoRolagem.estado`]: botao.dataset.icarusRolagem, [`flags.${F}.pedidoRolagem.por`]: game.user.name });
      });
    }
  });

  Hooks.on("updateChatMessage", mensagem => { executarSeAprovada(mensagem); });
}
