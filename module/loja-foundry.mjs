/**
 * Loja do Mercador no Foundry: o jogador pede ao Mestre pelo socket (ação "loja:comprar" ou
 * "loja:vender", mesmo canal do dano) e só o Mestre ativo executa. O jogador manda só
 * { mercadorUuid, itemId, quantidade, compradorUuid }; preço e estoque são recalculados aqui
 * (module/loja.mjs). Débito, item e estoque são um bloco: se um passo falha, os anteriores voltam.
 */
import { SISTEMA_ID } from "./config.mjs";
import { formatarPreco } from "./moeda.mjs";
import {
  validarCompra, validarVenda, validarPedidoDeLoja, dadosDaCompra, itemParaEmpilhar, unidadesCompradas, lojaDoItem
} from "./loja.mjs";

const F = SISTEMA_ID;
const CANAL = `system.${SISTEMA_ID}`;
const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);
const esc = t => Handlebars.escapeExpression(t ?? "");

/** Texto da recusa pelo motivo de validarCompra/validarVenda. */
export function textoDoMotivo(r, dados = {}) {
  return fmt(`ICARUS.Loja.Motivos.${r.motivo}`, { total: formatarPreco(r.total ?? 0), estoque: r.estoque ?? 0, ...dados });
}

/** Ator a partir do uuid (sincrono: atores do mundo e de tokens da cena). */
const atorDe = uuid => {
  const d = fromUuidSync(uuid);
  return d?.documentName === "Actor" ? d : d?.actor ?? null;
};

/* ---------------- Lado do jogador ---------------- */

/**
 * Pede a compra (ou a venda, tipo "vender"). O Mestre executa direto; o jogador manda ao Mestre ativo.
 * @returns {Promise<boolean>} se o pedido foi feito
 */
export async function pedirNaLoja(tipo, { mercador, itemId, quantidade, comprador }) {
  const pedido = validarPedidoDeLoja({ mercadorUuid: mercador?.uuid, itemId, quantidade: Number(quantidade), compradorUuid: comprador?.uuid });
  if (!pedido) { ui.notifications.warn(loc("ICARUS.Loja.Motivos.quantidadeInvalida")); return false; }
  if (game.user.isGM) {
    const r = await executar(tipo, pedido, game.user.id);
    if (r.texto) ui.notifications[r.ok ? "info" : "warn"](r.texto);
    return r.ok;
  }
  if (!game.users.activeGM) { ui.notifications.warn(loc("ICARUS.Loja.SemMestre")); return false; }
  game.socket.emit(CANAL, { acao: `loja:${tipo}`, ...pedido });
  return true;
}

/* ---------------- Lado do Mestre ---------------- */

/**
 * Executa uma compra ou venda validada. @returns {Promise<{ ok: boolean, texto: string }>}
 */
export async function executar(tipo, pedido, usuarioId) {
  const usuario = game.users.get(usuarioId);
  const mercador = atorDe(pedido.mercadorUuid);
  const comprador = atorDe(pedido.compradorUuid);
  if (!usuario || !mercador || mercador.type !== "mercador" || !comprador) return { ok: false, texto: loc("ICARUS.Loja.Motivos.itemInvalido") };
  const dono = usuario.isGM || !!comprador.testUserPermission?.(usuario, "OWNER");
  return tipo === "vender" ? vender(mercador, comprador, pedido, dono, usuario) : comprar(mercador, comprador, pedido, dono, usuario);
}

/** Executa os passos em ordem; se um falha, desfaz os anteriores (do último para o primeiro). */
async function emBloco(passos) {
  const feitos = [];
  try {
    for (const p of passos) { await p.fazer(); feitos.push(p); }
    return true;
  } catch (erro) {
    console.error("Icarus RPG | Loja: falhou no meio, desfazendo", erro);
    for (const p of feitos.reverse()) { try { await p.desfazer(); } catch (e) { console.error("Icarus RPG | Loja: não desfez", e); } }
    return false;
  }
}

async function comprar(mercador, comprador, pedido, dono, usuario) {
  const item = mercador.items.get(pedido.itemId);
  const r = validarCompra(mercador.system, item, pedido.quantidade, comprador.system, { dono });
  if (!r.ok) return { ok: false, texto: textoDoMotivo(r, { item: item?.name ?? "" }) };
  const moedasAntes = foundry.utils.deepClone(comprador._source.system.moedas);
  const caixaAntes = foundry.utils.deepClone(mercador._source.system.caixa);
  const estoqueAntes = lojaDoItem(item).quantidade;
  const dados = dadosDaCompra(item.toObject(), pedido.quantidade);
  const pilha = itemParaEmpilhar([...comprador.items], dados);
  let criado = null;
  const passos = [
    { fazer: () => comprador.update({ "system.moedas": r.moedas }), desfazer: () => comprador.update({ "system.moedas": moedasAntes }) },
    pilha
      ? { fazer: () => pilha.update({ "system.quantidade": pilha.system.quantidade + unidadesCompradas(dados, pedido.quantidade) }),
        desfazer: () => pilha.update({ "system.quantidade": pilha.system.quantidade - unidadesCompradas(dados, pedido.quantidade) }) }
      : { fazer: async () => { [criado] = await comprador.createEmbeddedDocuments("Item", [dados]); }, desfazer: () => criado?.delete() },
    ...(r.estoque === null ? [] : [{ fazer: () => item.update({ [`flags.${F}.loja.quantidade`]: r.estoque }), desfazer: () => item.update({ [`flags.${F}.loja.quantidade`]: estoqueAntes }) }]),
    ...(r.caixa === null ? [] : [{ fazer: () => mercador.update({ "system.caixa": r.caixa }), desfazer: () => mercador.update({ "system.caixa": caixaAntes }) }])
  ];
  if (!(await emBloco(passos))) return { ok: false, texto: loc("ICARUS.Loja.Erro") };
  const texto = fmt("ICARUS.Loja.Comprou", { comprador: comprador.name, n: pedido.quantidade, item: item.name, mercador: mercador.name, total: formatarPreco(r.total) });
  await registrarNoChat(mercador, comprador, texto);
  return { ok: true, texto };
}

async function vender(mercador, vendedor, pedido, dono, usuario) {
  const item = vendedor.items.get(pedido.itemId);
  const r = validarVenda(mercador.system, item, pedido.quantidade, vendedor.system, { dono });
  if (!r.ok) return { ok: false, texto: textoDoMotivo(r, { item: item?.name ?? "" }) };
  const moedasAntes = foundry.utils.deepClone(vendedor._source.system.moedas);
  const caixaAntes = foundry.utils.deepClone(mercador._source.system.caixa);
  const dadosItem = item.toObject();
  const unidades = dadosItem.system.quantidade - r.resta;
  let estoque = null;
  const novo = dadosDaCompra(dadosItem, pedido.quantidade);
  novo.flags = { ...(novo.flags ?? {}), [F]: { ...(novo.flags?.[F] ?? {}), loja: { venda: true, quantidade: pedido.quantidade, precoBase: null, oculto: true } } };
  novo.system.quantidade = dadosItem.type === "municao" ? 20 : 1;
  const passos = [
    { fazer: () => vendedor.update({ "system.moedas": r.moedas }), desfazer: () => vendedor.update({ "system.moedas": moedasAntes }) },
    r.resta > 0
      ? { fazer: () => item.update({ "system.quantidade": r.resta }), desfazer: () => vendedor.items.get(pedido.itemId)?.update({ "system.quantidade": r.resta + unidades }) }
      : { fazer: () => item.delete(), desfazer: () => vendedor.createEmbeddedDocuments("Item", [dadosItem], { keepId: true }) },
    { fazer: async () => { [estoque] = await mercador.createEmbeddedDocuments("Item", [novo]); }, desfazer: () => estoque?.delete() },
    ...(r.caixa === null ? [] : [{ fazer: () => mercador.update({ "system.caixa": r.caixa }), desfazer: () => mercador.update({ "system.caixa": caixaAntes }) }])
  ];
  if (!(await emBloco(passos))) return { ok: false, texto: loc("ICARUS.Loja.Erro") };
  const texto = fmt("ICARUS.Loja.Vendeu", { vendedor: vendedor.name, n: pedido.quantidade, item: dadosItem.name, mercador: mercador.name, total: formatarPreco(r.total) });
  await registrarNoChat(mercador, vendedor, texto);
  return { ok: true, texto };
}

/** Mensagem no chat: pública ou só para o comprador e o Mestre (configuração "lojaChat"). */
function registrarNoChat(mercador, comprador, texto) {
  const privado = game.settings.get(F, "lojaChat") === "privado";
  const donos = game.users.filter(u => !u.isGM && comprador.testUserPermission?.(u, "OWNER")).map(u => u.id);
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: mercador }),
    content: `<div class="icarus-rolagem icarus-lembrete icarus-loja-chat"><p class="condicao-descricao">${esc(texto)}</p></div>`,
    ...(privado ? { whisper: [...donos, ...game.users.filter(u => u.isGM).map(u => u.id)] } : {})
  });
}

/** Mensagens do socket (exportada para os testes). */
export async function aoReceberLoja(msg, remetente) {
  if (!msg?.acao?.startsWith("loja:")) return;
  const de = typeof remetente === "string" ? remetente : msg.userId;
  if (msg.acao === "loja:resposta") {
    if (msg.para === game.user.id && game.users.get(de)?.isGM) ui.notifications[msg.ok ? "info" : "warn"](String(msg.texto ?? ""));
    return;
  }
  // Só o Mestre ativo executa (um só, mesmo com dois Mestres)
  if (!game.users.activeGM?.isSelf) return;
  const usuario = game.users.get(de);
  if (!usuario?.active) return;
  const pedido = validarPedidoDeLoja(msg);
  const tipo = msg.acao === "loja:vender" ? "vender" : msg.acao === "loja:comprar" ? "comprar" : null;
  const r = pedido && tipo ? await executar(tipo, pedido, de) : { ok: false, texto: loc("ICARUS.Loja.Motivos.quantidadeInvalida") };
  game.socket.emit(CANAL, { acao: "loja:resposta", para: de, ok: r.ok, texto: r.texto });
}

export function registrarLoja() {
  Hooks.once("init", () => {
    game.settings.register(F, "lojaChat", {
      name: "ICARUS.Loja.Config.Chat", hint: "ICARUS.Loja.Config.ChatDica",
      scope: "world", config: true, type: String, default: "publico",
      choices: { publico: "ICARUS.Loja.Config.Publico", privado: "ICARUS.Loja.Config.Privado" }
    });
  });
  Hooks.once("ready", () => game.socket.on(CANAL, aoReceberLoja));
}
