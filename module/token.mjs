/**
 * Token do personagem no Foundry (aba Token da ficha):
 * - galeria só com as molduras do manifesto (module/dados/tokens.mjs, gerado de tools/dados/tokens.json);
 * - rascunho do enquadramento em flags["icarus-rpg"].token { molduraId, retratoSrc, x, y, escala,
 *   versao, imagemFinal, aplicado, pendente } (x/y/escala normalizados; a edição volta igual);
 * - Aplicar: gera o PNG, grava em worlds/<mundo>/icarus-tokens/<actorId>.png (nome estável, URL com
 *   cache-bust) e configura o prototypeToken (escala 1, anel dinâmico desligado); com ator vinculado,
 *   opcionalmente atualiza os tokens já colocados nas cenas.
 * Upload: quem tem a permissão "Upload New Files" envia direto. Quem não tem manda o PNG pelo socket
 * do sistema ao Mestre ativo, que confere (dono do ator, PNG, até 2 MB), grava e devolve a URL.
 * Sem Mestre online, o ajuste fica pendente e o Mestre finaliza ao entrar (gera o PNG a partir dos
 * ajustes salvos; a imagem não fica guardada na ficha).
 */
import { SISTEMA_ID, ICONE_PADRAO } from "./config.mjs";
import TOKENS from "./dados/tokens.mjs";
import { EditorDeToken, carregarImagem, mascaraDaMoldura, pngDentroDoLimite, LIMITE_BYTES } from "./token-editor.mjs";
import { limitar, enquadramentoInicial } from "./token-mascara.mjs";

const F = SISTEMA_ID;
const CANAL = `system.${SISTEMA_ID}`;
const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);
const t = (k, d) => (d ? fmt(k, d) : loc(k));
/** Pelo socket o PNG vai menor (o servidor recusa mensagens muito grandes). */
const LIMITE_SOCKET = 700 * 1024;
const ESPERA_MESTRE_MS = 30000;

export const urlDaMoldura = m => encodeURI(`systems/${SISTEMA_ID}/img/Icones/${TOKENS.pasta}/${m.arquivo}`);
export const urlDaMiniatura = m => encodeURI(`systems/${SISTEMA_ID}/img/Icones/${TOKENS.pasta}/${m.miniatura ?? m.arquivo}`);
export const molduraPorId = id => TOKENS.tokens.find(m => m.id === id) ?? null;

/**
 * Classes do Foundry (FilePicker, Actor) são globais do script, mas não propriedades de globalThis:
 * acessar pelo nome. No v13 o FilePicker fica em foundry.applications.apps.
 */
export function classeFilePicker() {
  const v13 = foundry.applications?.apps?.FilePicker;
  // eslint-disable-next-line no-undef
  const v12 = typeof FilePicker !== "undefined" ? FilePicker : null;
  const base = v13 ?? v12;
  return base?.implementation ?? base;
}
// eslint-disable-next-line no-undef
const iconePadraoDeAtor = () => (typeof Actor !== "undefined" ? Actor.DEFAULT_ICON : null);

/** Retrato do ator, ou null se for o ícone padrão (sem imagem). */
export function retratoDoAtor(actor) {
  const img = actor?.img;
  const padroes = [ICONE_PADRAO, iconePadraoDeAtor(), "icons/svg/mystery-man.svg"].filter(Boolean);
  return !img || padroes.includes(img) ? null : img;
}

/** Dados da aba Token para o template. */
export function contextoDoToken(actor, editavel) {
  const salvo = actor.flags?.[F]?.token ?? null;
  const retrato = retratoDoAtor(actor);
  const tokensNaCena = actor.prototypeToken?.actorLink && (game.scenes?.some(s => s.tokens.some(k => k.actorId === actor.id && k.actorLink)) ?? false);
  return {
    editavel,
    molduras: TOKENS.tokens.map(m => ({ id: m.id, nome: m.nome, url: urlDaMiniatura(m) })),
    semRetrato: !retrato,
    retratoMudou: !!(salvo?.retratoSrc && retrato && salvo.retratoSrc !== retrato),
    pendente: !!salvo?.pendente,
    aplicado: !!salvo?.aplicado,
    imagemFinal: salvo?.imagemFinal ?? "",
    tokensNaCena
  };
}

/* ------------------------------ Aba na ficha ------------------------------ */

/** Liga o editor na aba Token (chamado ao abrir a aba; refaz a cada render). */
export async function ligarEditor(ficha) {
  const raiz = ficha.element?.[0]?.querySelector(".token-editor");
  if (!raiz) return;
  // O mesmo HTML não ganha dois editores (aba aberta + render chamam juntos)
  if (ficha._editorToken?.raiz === raiz.closest(".token-aba")) return;
  ficha._editorToken?.destruir();
  const actor = ficha.actor;
  const editor = new EditorDeToken(raiz.closest(".token-aba"), {
    manifesto: TOKENS,
    urlDaMoldura,
    estado: actor.flags?.[F]?.token ?? null,
    retratoAtual: retratoDoAtor(actor),
    editavel: ficha.isEditable,
    t,
    aoMudar: estado => salvarRascunho(actor, estado),
    aoEscolherRetrato: () => escolherRetrato(actor),
    aoAplicar: (partes, estado) => aplicarToken(actor, partes, estado, {
      atualizarCena: raiz.closest(".token-aba")?.querySelector("input.token-atualizar-cena")?.checked ?? true
    })
  });
  ficha._editorToken = editor;
  // Mudanças nos controles da aba não enviam o formulário da ficha (o que redesenharia o editor)
  const aba = raiz.closest(".token-aba");
  if (aba && !aba.dataset.isolada) {
    aba.dataset.isolada = "1";
    for (const evento of ["change", "input"]) aba.addEventListener(evento, ev => ev.stopPropagation());
  }
  await editor.iniciar();
}

/** Rascunho do enquadramento (sem redesenhar a ficha). */
export function salvarRascunho(actor, estado) {
  if (!actor.isOwner) return;
  const atual = actor.flags?.[F]?.token ?? {};
  return actor.update({ [`flags.${F}.token`]: { ...atual, ...estado } }, { render: false });
}

export function escolherRetrato(actor) {
  const Picker = classeFilePicker();
  return new Picker({ type: "image", current: actor.img, callback: caminho => actor.update({ img: caminho }) }).browse();
}

/* ------------------------------ Aplicar ------------------------------ */

const pastaDoMundo = () => `worlds/${game.world.id}/icarus-tokens`;
/** Grava o PNG no mundo (quem chama tem permissão de upload). @returns {Promise<string>} caminho */
export async function gravarNoMundo(actorId, blob) {
  const Picker = classeFilePicker();
  if (!Picker) throw new Error("FilePicker");
  const pasta = pastaDoMundo();
  // Cria a pasta só se ainda não existir (criar uma que já existe dá erro no servidor)
  const existe = await Picker.browse("data", pasta).then(() => true).catch(() => false);
  if (!existe) await Picker.createDirectory("data", pasta);
  const arquivo = new File([blob], `${actorId}.png`, { type: "image/png" });
  const r = await Picker.upload("data", pasta, arquivo, {}, { notify: false });
  if (!r || r.status === "error" || !r.path) throw new Error(r?.message || "upload");
  return r.path;
}

/** Configura o prototypeToken (e os tokens na cena) com a imagem final; guarda o estado aplicado. */
export async function aplicarNoAtor(actor, caminho, estado, { atualizarCena = true } = {}) {
  const url = `${caminho}?v=${Date.now()}`;
  const aplicado = { molduraId: estado.molduraId, retratoSrc: estado.retratoSrc, x: estado.x, y: estado.y, escala: estado.escala };
  await actor.update({
    "prototypeToken.texture.src": url,
    "prototypeToken.texture.scaleX": 1,
    "prototypeToken.texture.scaleY": 1,
    "prototypeToken.ring.enabled": false,
    [`flags.${F}.token`]: { ...estado, versao: 1, imagemFinal: url, pendente: false, aplicado }
  });
  if (atualizarCena && actor.prototypeToken.actorLink) {
    for (const cena of game.scenes ?? []) {
      const ids = cena.tokens.filter(k => k.actorId === actor.id && k.actorLink).map(k => k.id);
      if (!ids.length) continue;
      await cena.updateEmbeddedDocuments("Token", ids.map(_id => ({ _id, "texture.src": url, "texture.scaleX": 1, "texture.scaleY": 1, "ring.enabled": false })))
        .catch(erro => console.warn(`Icarus RPG | Token: não atualizou os tokens da cena ${cena.name}`, erro));
    }
  }
  return url;
}

/**
 * Aplicar: com permissão de upload grava direto; sem ela, pede ao Mestre ativo pelo socket; sem
 * Mestre, salva como pendente. Nada muda no ator se o upload falhar.
 */
export async function aplicarToken(actor, partes, estado, { atualizarCena = true } = {}) {
  try {
    if (game.user.can("FILES_UPLOAD")) {
      const blob = await pngDentroDoLimite(partes, LIMITE_BYTES);
      const caminho = await gravarNoMundo(actor.id, blob);
      await aplicarNoAtor(actor, caminho, estado, { atualizarCena });
      return ui.notifications.info(fmt("ICARUS.Token.Aplicado", { nome: actor.name }));
    }
    if (!game.users.activeGM) {
      await actor.update({ [`flags.${F}.token`]: { ...(actor.flags?.[F]?.token ?? {}), ...estado, pendente: true, atualizarCena } });
      return ui.notifications.warn(loc("ICARUS.Token.SemMestre"));
    }
    const blob = await pngDentroDoLimite(partes, LIMITE_SOCKET);
    const caminho = await pedirAoMestre(actor, blob);
    await aplicarNoAtor(actor, caminho, estado, { atualizarCena });
    ui.notifications.info(fmt("ICARUS.Token.Aplicado", { nome: actor.name }));
  } catch (erro) {
    console.error("Icarus RPG | Token: falhou ao aplicar", erro);
    ui.notifications.error(fmt("ICARUS.Token.ErroAplicar", { motivo: erro?.message ?? "" }));
  }
}

/* ------------------------------ Socket (jogador sem permissão de upload) ------------------------------ */

const pedidos = new Map();
const blobParaBase64 = blob => new Promise((ok, falha) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = falha; r.readAsDataURL(blob); });

function pedirAoMestre(actor, blob) {
  return blobParaBase64(blob).then(dados => new Promise((ok, falha) => {
    const pedidoId = foundry.utils.randomID();
    const timer = setTimeout(() => { pedidos.delete(pedidoId); falha(new Error(loc("ICARUS.Token.MestreNaoRespondeu"))); }, ESPERA_MESTRE_MS);
    pedidos.set(pedidoId, { ok: caminho => { clearTimeout(timer); ok(caminho); }, falha: motivo => { clearTimeout(timer); falha(new Error(motivo)); } });
    game.socket.emit(CANAL, { acao: "token-upload", pedidoId, actorId: actor.id, userId: game.user.id, dados });
  }));
}

/** O Mestre confere o pedido: dono do ator, PNG de verdade e até 2 MB. @returns {string|null} motivo da recusa */
export function motivoDaRecusa({ dono, tipo, bytes, assinaturaPng }) {
  if (!dono) return "ICARUS.Token.RecusaDono";
  if (tipo !== "image/png" || !assinaturaPng) return "ICARUS.Token.RecusaTipo";
  if (bytes > LIMITE_BYTES) return "ICARUS.Token.RecusaTamanho";
  return null;
}

async function aoReceber(msg, remetente) {
  // O servidor acrescenta o id de quem enviou (não dá para se passar por outro usuário)
  const de = typeof remetente === "string" ? remetente : msg?.userId;
  if (msg?.acao === "token-resposta" && msg.para === game.user.id) {
    if (!game.users.get(de)?.isGM) return;
    const p = pedidos.get(msg.pedidoId);
    if (!p) return;
    pedidos.delete(msg.pedidoId);
    return msg.caminho ? p.ok(msg.caminho) : p.falha(loc(msg.motivo ?? "ICARUS.Token.ErroAplicar"));
  }
  if (msg?.acao !== "token-upload" || !game.users.activeGM?.isSelf) return;
  const responder = dados => game.socket.emit(CANAL, { acao: "token-resposta", para: de, pedidoId: msg.pedidoId, ...dados });
  try {
    const actor = game.actors.get(msg.actorId);
    const usuario = game.users.get(de);
    const blob = await (await fetch(msg.dados)).blob();
    const inicio = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
    const motivo = motivoDaRecusa({
      dono: !!actor && !!usuario && actor.testUserPermission(usuario, "OWNER"),
      tipo: blob.type, bytes: blob.size, assinaturaPng: inicio[1] === 0x50 && inicio[2] === 0x4e && inicio[3] === 0x47
    });
    if (motivo) return responder({ motivo });
    responder({ caminho: await gravarNoMundo(actor.id, blob) });
  } catch (erro) {
    console.error("Icarus RPG | Token: upload pelo Mestre falhou", erro);
    responder({ motivo: "ICARUS.Token.ErroAplicar" });
  }
}

/* ------------------------------ Pendentes (sem Mestre online) ------------------------------ */

/** PNG a partir dos ajustes salvos (o Mestre finaliza os pendentes). */
export async function renderizarDoEstado(estado) {
  const moldura = molduraPorId(estado.molduraId);
  if (!moldura || !estado.retratoSrc) throw new Error("estado");
  const imgMoldura = await carregarImagem(urlDaMoldura(moldura));
  const mascara = await mascaraDaMoldura(moldura, imgMoldura);
  const retrato = await carregarImagem(estado.retratoSrc);
  const caixa = moldura.abertura;
  const e = limitar(estado.escala ? estado : enquadramentoInicial(caixa), { w: retrato.naturalWidth, h: retrato.naturalHeight }, caixa, 1024);
  return pngDentroDoLimite({ retrato, moldura: imgMoldura, mascara, caixa, e }, LIMITE_BYTES);
}

export async function finalizarPendentes() {
  if (!game.users.activeGM?.isSelf) return;
  const pendentes = game.actors.filter(a => a.flags?.[F]?.token?.pendente);
  if (!pendentes.length) return;
  let feitos = 0;
  for (const actor of pendentes) {
    const estado = actor.flags[F].token;
    try {
      const caminho = await gravarNoMundo(actor.id, await renderizarDoEstado(estado));
      await aplicarNoAtor(actor, caminho, estado, { atualizarCena: estado.atualizarCena !== false });
      feitos++;
    } catch (erro) {
      console.warn(`Icarus RPG | Token pendente de ${actor.name} não foi finalizado`, erro);
    }
  }
  ui.notifications.info(fmt("ICARUS.Token.PendentesFeitos", { n: feitos, total: pendentes.length }));
}

export function registrarTokens() {
  Hooks.once("ready", () => {
    game.socket.on(CANAL, aoReceber);
    finalizarPendentes();
  });
}
