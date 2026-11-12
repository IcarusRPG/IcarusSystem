/**
 * Loja do Mercador no Foundry: o jogador pede ao Mestre pelo socket (ação "loja:comprar" ou
 * "loja:vender", mesmo canal do dano) e só o Mestre ativo executa. O jogador manda só
 * { mercadorUuid, itemId, quantidade, compradorUuid }; preço e estoque são recalculados aqui
 * (module/loja.mjs). Débito, item e estoque são um bloco: se um passo falha, os anteriores voltam.
 */
import { SISTEMA_ID } from "./config.mjs";
import { formatarPreco } from "./moeda.mjs";
import {
  validarCompra, validarVenda, validarPedidoDeLoja, dadosDaCompra, itemParaEmpilhar, unidadesCompradas, lojaDoItem,
  efeitosDaBarganha, registrarTeste, testeFeitoPeloUsuario, resultadoDoTeste, sortearFala, validarPedidoDeBarganha, validarMensagemDeBarganha,
  registrarTentativaSemDinheiro, zerarTentativas, cdDoRoubo, validarRoubo, rouboPassou, validarPedidoDeRoubo, comItem, ROUBO_PADRAO, BARGANHA_PADRAO
} from "./loja.mjs";
import { rolarPericia } from "./rolls.mjs";

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
export function executar(tipo, pedido, usuarioId) {
  return emFila(() => executarAgora(tipo, pedido, usuarioId));
}

async function executarAgora(tipo, pedido, usuarioId) {
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
  const r = validarCompra(mercador.system, item, pedido.quantidade, comprador.system, { dono, efeitos: efeitosDoMercador(mercador) });
  // Só "dinheiro insuficiente" conta como tentativa de roubo (por usuário, por mercador)
  if (!r.ok && r.motivo === "semDinheiro") return semDinheiro(mercador, comprador, usuario);
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
    { fazer: () => item.update({ [`flags.${F}.loja.quantidade`]: r.estoque }), desfazer: () => item.update({ [`flags.${F}.loja.quantidade`]: estoqueAntes }) },
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

/* ---------------- Barganha ---------------- */

/** Estado da Barganha do mercador (flags.barganha) e os efeitos dele na loja. */
export const estadoDaBarganha = mercador => mercador?.flags?.[F]?.barganha ?? {};
export const efeitosDoMercador = mercador => efeitosDaBarganha(estadoDaBarganha(mercador), mercador?.system?.loja?.barganha);

/**
 * O jogador faz um teste (Barganha, Diplomacia ou Intimidação): rola a perícia do comprador (com o
 * diálogo de bônus de sempre) e manda a mensagem ao Mestre, que decide pelo total dela.
 */
export async function pedirBarganha({ mercador, teste, comprador }) {
  if (!comprador) { ui.notifications.warn(loc("ICARUS.Loja.SemComprador")); return false; }
  if (estadoDaBarganha(mercador)[teste]?.feito) { ui.notifications.warn(loc("ICARUS.Loja.Barganha.Motivos.jaFeito")); return false; }
  // Um teste por jogador: quem já fez um deixa os outros para os outros jogadores
  const meu = game.user.isGM ? null : testeFeitoPeloUsuario(estadoDaBarganha(mercador), game.user.id);
  if (meu) { ui.notifications.warn(fmt("ICARUS.Loja.Barganha.Motivos.jaFezUm", { teste: loc(`ICARUS.Pericias.${meu}`) })); return false; }
  if (!mercador.system.loja.aberta) { ui.notifications.warn(loc("ICARUS.Loja.Motivos.lojaFechada")); return false; }
  if (!game.user.isGM && !game.users.activeGM) { ui.notifications.warn(loc("ICARUS.Loja.SemMestre")); return false; }
  const mensagem = await rolarPericia(comprador, teste);
  if (!mensagem?.id) return false;
  const pedido = { mercadorUuid: mercador.uuid, teste, mensagemId: mensagem.id, compradorUuid: comprador.uuid };
  if (game.user.isGM) {
    const r = await processarBarganha(pedido, game.user.id);
    if (!r.ok) ui.notifications.warn(r.texto);
    return r.ok;
  }
  game.socket.emit(CANAL, { acao: "loja:barganha", ...pedido });
  return true;
}

/** Um teste por vez no Mestre: dois pedidos simultâneos do mesmo teste dão um só válido. */
let filaDeBarganha = Promise.resolve();
const emFila = fn => {
  const p = filaDeBarganha.then(fn, fn);
  filaDeBarganha = p.catch(() => null);
  return p;
};

/**
 * Lado do Mestre: confere o pedido e a mensagem da rolagem (autor, falante, perícia, recente, não
 * usada), decide o resultado pela CD guardada no mercador, grava o estado, publica a fala do mercador
 * e, no 1 natural da Intimidação, fecha a loja e avisa o Mestre. @returns {Promise<{ ok, texto }>}
 */
export function processarBarganha(pedidoBruto, usuarioId) {
  return emFila(async () => {
    const pedido = validarPedidoDeBarganha(pedidoBruto);
    const usuario = game.users.get(usuarioId);
    const mercador = pedido ? atorDe(pedido.mercadorUuid) : null;
    const comprador = pedido ? atorDe(pedido.compradorUuid) : null;
    if (!pedido || !usuario || mercador?.type !== "mercador" || !comprador) return { ok: false, texto: loc("ICARUS.Loja.Barganha.Motivos.mensagemInvalida") };
    const config = mercador.system.loja.barganha;
    if (!mercador.system.loja.aberta) return { ok: false, texto: loc("ICARUS.Loja.Motivos.lojaFechada") };
    if (!config.testes[pedido.teste]?.ativo) return { ok: false, texto: loc("ICARUS.Loja.Barganha.Motivos.testeInvalido") };
    const estado = estadoDaBarganha(mercador);
    if (estado[pedido.teste]?.feito) return { ok: false, texto: fmt("ICARUS.Loja.Barganha.Motivos.jaFeitoPor", { por: estado[pedido.teste].por }) };
    const jaFez = usuario.isGM ? null : testeFeitoPeloUsuario(estado, usuarioId);
    if (jaFez) return { ok: false, texto: fmt("ICARUS.Loja.Barganha.Motivos.jaFezUm", { teste: loc(`ICARUS.Pericias.${jaFez}`) }) };
    const mensagem = game.messages.get(pedido.mensagemId);
    const f = mensagem?.flags?.[F] ?? {};
    const v = validarMensagemDeBarganha(mensagem ? {
      autor: mensagem.author?.id ?? mensagem.user?.id, atorFalante: mensagem.speaker?.actor, chave: f.chave,
      total: f.total, natural: f.natural ?? f.d20, quando: mensagem.timestamp, usada: !!f.barganhaUsada
    } : null, { teste: pedido.teste, usuarioId, compradorId: comprador.id, dono: usuario.isGM || !!comprador.testUserPermission?.(usuario, "OWNER"), agora: Date.now() });
    if (!v.ok) return { ok: false, texto: loc(`ICARUS.Loja.Barganha.Motivos.${v.motivo}`) };
    const resultado = resultadoDoTeste({ natural: v.natural, total: v.total, cd: config.testes[pedido.teste].cd });
    const fala = sortearFala(config.falas?.[pedido.teste]?.[resultado], { personagem: comprador.name, mercador: mercador.name });
    const r = registrarTeste(estado, pedido.teste, { por: comprador.name, usuarioId, resultado, fala });
    if (!r.ok) return { ok: false, texto: loc(`ICARUS.Loja.Barganha.Motivos.${r.motivo}`) };
    const guardas = pedido.teste === "intimidacao" && resultado === "falhaCritica";
    await mensagem.setFlag(F, "barganhaUsada", true);
    await mercador.update({ [`flags.${F}.barganha`]: { ...r.estado, ultima: { teste: pedido.teste, fala, quando: Date.now() } } });
    if (guardas) await chamarGuardas(mercador, comprador, { fala, aviso: fmt("ICARUS.Loja.Barganha.GuardasMestre", { mercador: mercador.name, personagem: comprador.name }) });
    else await falarNoChat(mercador, comprador, fala, config.falasNoChat);
    const texto = fmt(`ICARUS.Loja.Barganha.Resultados.${resultado}`, { teste: loc(`ICARUS.Pericias.${pedido.teste}`), personagem: comprador.name });
    return { ok: true, texto };
  });
}

/** A fala do mercador no chat, dita por ele (pública ou só para o jogador e o Mestre). */
function falarNoChat(mercador, comprador, fala, paraTodos) {
  if (!fala) return null;
  const donos = game.users.filter(u => !u.isGM && comprador.testUserPermission?.(u, "OWNER")).map(u => u.id);
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: mercador }),
    content: `<div class="icarus-rolagem icarus-lembrete icarus-loja-fala"><p class="condicao-descricao">“${esc(fala)}”</p></div>`,
    ...(paraTodos ? {} : { whisper: [...donos, ...game.users.filter(u => u.isGM).map(u => u.id)] })
  });
}

/** Aviso ao Mestre (notificação e sussurro com a nota de consequência). */
function avisarGuardas(mercador, texto, nota) {
  ui.notifications.warn(texto, { permanent: true });
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: mercador }),
    content: `<div class="icarus-rolagem icarus-lembrete"><p class="condicao-descricao"><b>${esc(texto)}</b>${nota ? `<br>${esc(nota)}` : ""}</p></div>`,
    whisper: game.users.filter(u => u.isGM).map(u => u.id)
  });
}

/**
 * O mercador chama os guardas: a fala dele (balão e chat), a loja fecha (se a opção da Barganha
 * estiver marcada), flags.guardas e o aviso sussurrado ao Mestre com a nota de consequência.
 * O sistema não cria guardas nem combate. @param {{ fala?: string, aviso: string }} d
 */
export async function chamarGuardas(mercador, comprador, { fala = "", aviso }) {
  const config = { ...BARGANHA_PADRAO, ...(mercador.system.loja.barganha ?? {}) };
  await mercador.update({
    [`flags.${F}.guardas`]: true,
    ...(fala ? { [`flags.${F}.falaLoja`]: { texto: fala, para: null, quando: Date.now() } } : {}),
    ...(config.guardas.fecharLoja ? { "system.loja.aberta": false } : {})
  });
  if (fala) await falarNoChat(mercador, comprador, fala, config.falasNoChat);
  if (config.guardas.avisarMestre) await avisarGuardas(mercador, aviso, config.guardas.nota);
}

/**
 * Compra sem dinheiro (lado do Mestre): conta a tentativa do usuário; antes do limite, o aviso
 * ("Está tentando me roubar?") no balão de quem tentou e no chat; no limite, os guardas.
 */
async function semDinheiro(mercador, comprador, usuario) {
  const roubo = { ...ROUBO_PADRAO, ...(mercador.system.loja.roubo ?? {}) };
  const t = registrarTentativaSemDinheiro(mercador.getFlag(F, "tentativasSemDinheiro") ?? {}, usuario.id, roubo.tentativas);
  await mercador.update({ [`flags.${F}.tentativasSemDinheiro`]: t.contagem });
  if (t.guardas) {
    const fala = sortearFala(roubo.falasGuardas, { personagem: comprador.name, mercador: mercador.name });
    await chamarGuardas(mercador, comprador, { fala, aviso: fmt("ICARUS.Loja.Roubo.SemDinheiroMestre", { personagem: comprador.name, mercador: mercador.name, n: t.n }) });
    return { ok: false, texto: fala || loc("ICARUS.Loja.Barganha.Guardas") };
  }
  const aviso = sortearFala(roubo.aviso, { personagem: comprador.name, mercador: mercador.name });
  await mercador.update({ [`flags.${F}.falaLoja`]: { texto: aviso, para: usuario.id, quando: Date.now() } });
  await falarNoChat(mercador, comprador, aviso, mercador.system.loja.barganha?.falasNoChat ?? true);
  return { ok: false, texto: aviso };
}

/* ---------------- Roubar (Prestidigitação) ---------------- */

/** O jogador tenta roubar 1 unidade: rola Prestidigitação e manda a mensagem ao Mestre. */
export async function pedirRoubo({ mercador, itemId, comprador }) {
  if (!comprador) { ui.notifications.warn(loc("ICARUS.Loja.SemComprador")); return false; }
  const item = mercador.items.get(itemId);
  const v = validarRoubo(mercador.system, item, { efeitos: efeitosDoMercador(mercador) });
  if (!v.ok) { ui.notifications.warn(textoDoMotivo(v, { item: item?.name ?? "" })); return false; }
  if (!game.user.isGM && !game.users.activeGM) { ui.notifications.warn(loc("ICARUS.Loja.SemMestre")); return false; }
  const mensagem = await rolarPericia(comprador, "prestidigitacao");
  if (!mensagem?.id) return false;
  const pedido = { mercadorUuid: mercador.uuid, itemId, mensagemId: mensagem.id, compradorUuid: comprador.uuid };
  if (game.user.isGM) {
    const r = await processarRoubo(pedido, game.user.id);
    ui.notifications[r.ok ? "info" : "warn"](r.texto);
    return r.ok;
  }
  game.socket.emit(CANAL, { acao: "loja:roubar", ...pedido });
  return true;
}

/** Registro curto dos roubos no mercador (últimos 20). */
const registrarRoubo = (mercador, entrada) =>
  mercador.update({ [`flags.${F}.roubos`]: [...(mercador.getFlag(F, "roubos") ?? []), { ...entrada, quando: Date.now() }].slice(-20) });

/**
 * Lado do Mestre: confere o pedido e a mensagem de Prestidigitação (autor, falante dono, perícia,
 * recente, não usada) e compara o total com a CD guardada no mercador (ou no item). Passou: 1 unidade
 * sem pagar, estoque −1, aviso só para quem roubou e o Mestre. Não passou: flagrante e os guardas.
 */
export function processarRoubo(pedidoBruto, usuarioId) {
  return emFila(async () => {
    const pedido = validarPedidoDeRoubo(pedidoBruto);
    const usuario = game.users.get(usuarioId);
    const mercador = pedido ? atorDe(pedido.mercadorUuid) : null;
    const comprador = pedido ? atorDe(pedido.compradorUuid) : null;
    if (!pedido || !usuario || mercador?.type !== "mercador" || !comprador) return { ok: false, texto: loc("ICARUS.Loja.Barganha.Motivos.mensagemInvalida") };
    const item = mercador.items.get(pedido.itemId);
    const dono = usuario.isGM || !!comprador.testUserPermission?.(usuario, "OWNER");
    const pode = validarRoubo(mercador.system, item, { dono, efeitos: efeitosDoMercador(mercador) });
    if (!pode.ok) return { ok: false, texto: textoDoMotivo(pode, { item: item?.name ?? "" }) };
    const mensagem = game.messages.get(pedido.mensagemId);
    const f = mensagem?.flags?.[F] ?? {};
    const v = validarMensagemDeBarganha(mensagem ? {
      autor: mensagem.author?.id ?? mensagem.user?.id, atorFalante: mensagem.speaker?.actor, chave: f.chave,
      total: f.total, natural: f.natural ?? f.d20, quando: mensagem.timestamp, usada: !!f.barganhaUsada
    } : null, { teste: "prestidigitacao", usuarioId, compradorId: comprador.id, dono, agora: Date.now() });
    if (!v.ok) return { ok: false, texto: loc(`ICARUS.Loja.Barganha.Motivos.${v.motivo}`) };
    await mensagem.setFlag(F, "barganhaUsada", true);
    const roubo = { ...ROUBO_PADRAO, ...(mercador.system.loja.roubo ?? {}) };
    if (!rouboPassou({ total: v.total, cd: cdDoRoubo(item, mercador.system) })) {
      await registrarRoubo(mercador, { por: comprador.name, item: item.name, passou: false });
      const fala = sortearFala(roubo.falasFlagrante, { personagem: comprador.name, mercador: mercador.name });
      await chamarGuardas(mercador, comprador, { fala, aviso: fmt("ICARUS.Loja.Roubo.FlagranteMestre", { personagem: comprador.name, item: item.name, mercador: mercador.name }) });
      return { ok: false, texto: fala || loc("ICARUS.Loja.Barganha.Guardas") };
    }
    // Passou: 1 unidade, sem pagar; o estoque cai 1 (em bloco, como a compra)
    const estoqueAntes = lojaDoItem(item).quantidade;
    const dados = dadosDaCompra(item.toObject(), 1);
    const pilha = itemParaEmpilhar([...comprador.items], dados);
    let criado = null;
    const passos = [
      pilha
        ? { fazer: () => pilha.update({ "system.quantidade": pilha.system.quantidade + unidadesCompradas(dados, 1) }),
          desfazer: () => pilha.update({ "system.quantidade": pilha.system.quantidade - unidadesCompradas(dados, 1) }) }
        : { fazer: async () => { [criado] = await comprador.createEmbeddedDocuments("Item", [dados]); }, desfazer: () => criado?.delete() },
      { fazer: () => item.update({ [`flags.${F}.loja.quantidade`]: estoqueAntes - 1 }), desfazer: () => item.update({ [`flags.${F}.loja.quantidade`]: estoqueAntes }) }
    ];
    if (!(await emBloco(passos))) return { ok: false, texto: loc("ICARUS.Loja.Erro") };
    await registrarRoubo(mercador, { por: comprador.name, item: item.name, passou: true });
    const texto = sortearFala(comItem(roubo.sucesso, item.name), { personagem: comprador.name, mercador: mercador.name });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: comprador }),
      content: `<div class="icarus-rolagem icarus-lembrete"><p class="condicao-descricao">${esc(texto)}</p></div>`,
      whisper: [usuarioId, ...game.users.filter(u => u.isGM).map(u => u.id)]
    });
    return { ok: true, texto };
  });
}

/** Mestre: libera de novo os 3 testes (preço e itens ocultos voltam ao original) e zera as tentativas sem dinheiro. */
export async function reiniciarBarganhas(mercador) {
  if (!game.user.isGM) return;
  await mercador.update({ [`flags.${F}.-=barganha`]: null, [`flags.${F}.-=tentativasSemDinheiro`]: null, [`flags.${F}.-=falaLoja`]: null });
}

/** Mestre: acalma os guardas, reabre a loja e zera as tentativas sem dinheiro. */
export async function acalmarGuardas(mercador) {
  if (!game.user.isGM) return;
  await mercador.update({ "system.loja.aberta": true, [`flags.${F}.-=guardas`]: null, [`flags.${F}.-=tentativasSemDinheiro`]: null, [`flags.${F}.-=falaLoja`]: null });
}

/** Mestre: zera as tentativas sem dinheiro de um jogador. */
export async function zerarTentativasDoUsuario(mercador, usuarioId) {
  if (!game.user.isGM) return;
  await mercador.update({ [`flags.${F}.tentativasSemDinheiro`]: zerarTentativas(mercador.getFlag(F, "tentativasSemDinheiro") ?? {}, usuarioId) });
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
  if (msg.acao === "loja:barganha" || msg.acao === "loja:roubar") {
    const r = await (msg.acao === "loja:roubar" ? processarRoubo(msg, de) : processarBarganha(msg, de));
    game.socket.emit(CANAL, { acao: "loja:resposta", para: de, ok: r.ok, texto: r.texto });
    return;
  }
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
