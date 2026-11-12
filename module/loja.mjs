/**
 * Loja do Mercador: regras puras (sem Foundry), testadas em tests/loja.test.mjs.
 * Todo preço em CENTAVOS (module/moeda.mjs). O estoque são os itens do próprio mercador, com
 * flags["icarus-rpg"].loja = { venda, quantidade (inteiro ≥ 0; 0 = esgotado), precoBase (null = preço
 * do item), oculto, liberaCom ("qualquer" | "barganha" | "diplomacia" | "intimidacao") }.
 * Munição se vende por pacote (20 unidades): o estoque e a quantidade comprada contam pacotes.
 * Barganha (Barganha, Diplomacia, Intimidação): estado em flags["icarus-rpg"].barganha do mercador;
 * os efeitos (desconto, acréscimo, itens liberados) saem só desse estado (efeitosDaBarganha).
 */
import { SISTEMA_ID, TAMANHO_PACOTE, TIPOS_EQUIPAVEIS } from "./config.mjs";
import { debitar, creditar, totalEmCentavos } from "./moeda.mjs";

const n0 = v => Math.max(0, Math.trunc(Number(v) || 0));
export const TIPOS_VENDAVEIS = ["arma", "equipamento", "municao"];
export const QUANTIDADE_MAXIMA = 999;
export const TESTES_DE_BARGANHA = ["barganha", "diplomacia", "intimidacao"];
export const LIBERA_COM = ["qualquer", ...TESTES_DE_BARGANHA];

/** Dados de loja do item (com os padrões). Quantidade antiga "∞" (null) conta como 1 (a migração grava 1). */
export function lojaDoItem(item) {
  const l = item?.flags?.[SISTEMA_ID]?.loja ?? {};
  return {
    venda: l.venda !== false,
    quantidade: l.quantidade === null || l.quantidade === undefined ? 1 : n0(l.quantidade),
    precoBase: l.precoBase === null || l.precoBase === undefined || l.precoBase === "" ? null : n0(l.precoBase),
    oculto: !!l.oculto,
    liberaCom: LIBERA_COM.includes(l.liberaCom) ? l.liberaCom : "qualquer"
  };
}

/** Preço do item sem a loja: munição pelo pacote; os outros pelo preço do item. */
export const precoDoItemNaLoja = item => n0(item?.type === "municao" ? item?.system?.precoPacote : item?.system?.preco);

/** Preço base: o que o Mestre definiu para o mercador prevalece; senão o do item ("sem venda" = 0). */
export function precoBase(item) {
  const daLoja = lojaDoItem(item).precoBase;
  if (daLoja !== null) return daLoja;
  return item?.system?.semVenda ? 0 : precoDoItemNaLoja(item);
}

/**
 * Preço de UMA unidade, em centavos, arredondado: base × multiplicador × (1 − desconto) × (1 + acréscimo).
 * A vitrine e a compra usam esta mesma função. @param {{ desconto?: number, acrescimo?: number }} [ajuste] em %
 */
export function precoUnitario(item, multiplicador = 1, { desconto = 0, acrescimo = 0 } = {}) {
  const m = Number(multiplicador);
  const fator = (Number.isFinite(m) && m > 0 ? m : 1) * (1 - n0(desconto) / 100) * (1 + n0(acrescimo) / 100);
  return Math.round(precoBase(item) * fator);
}

/** Total: preço unitário (já arredondado) × quantidade. */
export const precoTotal = (item, quantidade = 1, multiplicador = 1, ajuste = {}) => precoUnitario(item, multiplicador, ajuste) * n0(quantidade);

/** Esgotado? */
export const esgotado = item => lojaDoItem(item).quantidade === 0;

/**
 * O item aparece na vitrine? Vendável e à venda; o oculto só aparece liberado pela Barganha
 * (liberaCom "qualquer": qualquer teste que passou; senão, o teste dele).
 * @param {{ liberados?: string[] }} [efeitos]  efeitosDaBarganha
 */
export function visivelNaVitrine(item, efeitos = {}) {
  if (!TIPOS_VENDAVEIS.includes(item?.type)) return false;
  const l = lojaDoItem(item);
  if (!l.venda) return false;
  if (!l.oculto) return true;
  const liberados = efeitos.liberados ?? [];
  return l.liberaCom === "qualquer" ? liberados.length > 0 : liberados.includes(l.liberaCom);
}

/**
 * Valida uma compra e calcula o resultado (o Mestre chama com o estado atual).
 * @param {{ loja, caixa, caixaInfinita }} mercador  system do mercador
 * @param {object} item  item do estoque ({ type, system, flags })
 * @param {number} quantidade
 * @param {{ moedas }} comprador  system do comprador
 * @param {{ dono?: boolean, efeitos?: object }} [opcoes]  dono: o usuário que pediu controla o comprador;
 *   efeitos: efeitosDaBarganha (desconto, acréscimo, itens liberados)
 * @returns {{ ok: false, motivo: string } | { ok: true, total, unitario, moedas, estoque, caixa }}
 *   caixa: novas moedas do mercador (null = caixa infinita)
 */
export function validarCompra(mercador, item, quantidade, comprador, { dono = true, efeitos = {} } = {}) {
  if (!dono) return { ok: false, motivo: "semPermissao" };
  if (!mercador?.loja?.aberta) return { ok: false, motivo: "lojaFechada" };
  if (!item || !visivelNaVitrine(item, efeitos)) return { ok: false, motivo: "itemInvalido" };
  const q = quantidade;
  if (!Number.isInteger(q) || q < 1 || q > QUANTIDADE_MAXIMA) return { ok: false, motivo: "quantidadeInvalida" };
  const estoque = lojaDoItem(item).quantidade;
  if (estoque === 0) return { ok: false, motivo: "esgotado" };
  if (q > estoque) return { ok: false, motivo: "semEstoque", estoque };
  const unitario = precoUnitario(item, mercador.loja.multiplicadorPreco, efeitos);
  if (unitario <= 0) return { ok: false, motivo: "semPreco" };
  const total = unitario * q;
  const moedas = debitar(comprador?.moedas, total);
  if (!moedas) return { ok: false, motivo: "semDinheiro", total };
  return { ok: true, total, unitario, moedas, estoque: estoque - q, caixa: mercador.caixaInfinita ? null : creditar(mercador.caixa, total) };
}

/** Migração: estoque antigo "∞" (quantidade null) vira 1. Devolve a nova quantidade ou null se não muda. */
export const migrarQuantidadeDoEstoque = loja => (loja && (loja.quantidade === null || loja.quantidade === undefined) ? 1 : null);

/* ---------------- Entrega e empilhamento ---------------- */

/** O item empilha (soma a quantidade em vez de duplicar)? Munição e equipamentos que não se vestem. */
export function empilha(dados) {
  if (dados?.type === "municao") return true;
  if (dados?.type !== "equipamento") return false;
  const s = dados.system ?? {};
  return !TIPOS_EQUIPAVEIS.includes(s.tipo) && !s.vestimenta;
}

/** Origem do item (para "o mesmo item"): id do compêndio do sistema ou a fonte do compêndio. */
const origemDe = dados => dados?.flags?.[SISTEMA_ID]?.id ?? dados?._stats?.compendiumSource ?? dados?.flags?.core?.sourceId ?? null;

/** Item do comprador com o qual a compra empilha (mesmo tipo, nome e origem; munição: mesmo tipo de munição), ou null. */
export function itemParaEmpilhar(itensDoComprador, dados) {
  if (!empilha(dados)) return null;
  return (itensDoComprador ?? []).find(i => i.type === dados.type && (dados.type === "municao"
    ? i.system?.tipo === dados.system?.tipo
    : i.name === dados.name && origemDe(i) === origemDe(dados))) ?? null;
}

/** Unidades que entram no inventário: munição em unidades (pacotes × 20); os outros, a quantidade. */
export const unidadesCompradas = (dados, quantidade) => (dados?.type === "municao" ? n0(quantidade) * TAMANHO_PACOTE : n0(quantidade));

/** Dados do item para o comprador: cópia sem _id, sem as flags da loja, com a quantidade comprada. */
export function dadosDaCompra(dadosDoItem, quantidade) {
  const d = structuredClone(dadosDoItem);
  delete d._id;
  delete d.folder;
  delete d.sort;
  if (d.flags?.[SISTEMA_ID]) delete d.flags[SISTEMA_ID].loja;
  d.system = { ...(d.system ?? {}), quantidade: unidadesCompradas(d, quantidade) };
  if (d.system.equipado !== undefined) d.system.equipado = false;
  return d;
}

/* ---------------- Venda ao mercador (Fase 2: loja.compra.ativo) ---------------- */

/** Quanto o mercador paga por uma unidade: precoVenda do item, ou preço × percentual. 0 = não compra. */
export function precoDeVenda(item, percentual = 0.5) {
  if (!TIPOS_VENDAVEIS.includes(item?.type) || item.system?.semVenda) return 0;
  if (item.system?.precoVenda !== null && item.system?.precoVenda !== undefined) return n0(item.system.precoVenda);
  const p = Number(percentual);
  return Math.round(precoDoItemNaLoja(item) * (Number.isFinite(p) && p > 0 ? p : 0));
}

/** Quantidade que o jogador tem para vender (munição em pacotes inteiros). */
export const quantidadeVendavel = item => (item?.type === "municao" ? Math.floor(n0(item.system?.quantidade) / TAMANHO_PACOTE) : Math.max(1, n0(item?.system?.quantidade)));

/**
 * Valida uma venda ao mercador. @returns {{ ok:false, motivo } | { ok:true, total, moedas, caixa, resta }}
 *   moedas: do vendedor; caixa: do mercador (null = infinita); resta: quantidade que fica com o vendedor
 */
export function validarVenda(mercador, item, quantidade, vendedor, { dono = true } = {}) {
  if (!dono) return { ok: false, motivo: "semPermissao" };
  if (!mercador?.loja?.aberta) return { ok: false, motivo: "lojaFechada" };
  if (!mercador.loja.compra?.ativo) return { ok: false, motivo: "naoCompra" };
  const unitario = precoDeVenda(item, mercador.loja.compra.percentual);
  if (!unitario) return { ok: false, motivo: "semVenda" };
  const q = quantidade;
  const tem = quantidadeVendavel(item);
  if (!Number.isInteger(q) || q < 1 || q > tem) return { ok: false, motivo: "quantidadeInvalida" };
  const total = unitario * q;
  let caixa = null;
  if (!mercador.caixaInfinita) {
    caixa = debitar(mercador.caixa, total);
    if (!caixa) return { ok: false, motivo: "caixaSemDinheiro", total };
  }
  const unidades = item.type === "municao" ? q * TAMANHO_PACOTE : q;
  return { ok: true, total, moedas: creditar(vendedor?.moedas, total), caixa, resta: n0(item.system?.quantidade) - unidades };
}

/* ---------------- Pedido do jogador (socket) ---------------- */

const UUID_ATOR = /^(Actor\.[A-Za-z0-9]{16}|Scene\.[A-Za-z0-9]{16}\.Token\.[A-Za-z0-9]{16}\.Actor\.[A-Za-z0-9]{16})$/;
const ID = /^[A-Za-z0-9]{16}$/;

/**
 * Valida o pedido que o jogador manda ao Mestre ({ mercadorUuid, itemId, quantidade, compradorUuid }).
 * Preço nunca vem do jogador. Devolve o pedido limpo ou null.
 */
export function validarPedidoDeLoja(msg) {
  if (!msg || typeof msg !== "object") return null;
  const { mercadorUuid, itemId, quantidade, compradorUuid } = msg;
  if (typeof mercadorUuid !== "string" || !UUID_ATOR.test(mercadorUuid)) return null;
  if (typeof compradorUuid !== "string" || !UUID_ATOR.test(compradorUuid)) return null;
  if (typeof itemId !== "string" || !ID.test(itemId)) return null;
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > QUANTIDADE_MAXIMA) return null;
  return { mercadorUuid, itemId, quantidade, compradorUuid };
}

/** Saldo em centavos (atalho para a vitrine). */
export const saldo = moedas => totalEmCentavos(moedas);

/* ---------------- Barganha: Barganha, Diplomacia, Intimidação ---------------- */

export const RESULTADOS = ["critico", "sucesso", "falha", "falhaCritica"];

/** Falas padrão do mercador (uma por linha; o sistema sorteia uma). {personagem} e {mercador} são trocados. */
export const FALAS_PADRAO = {
  barganha: {
    critico: [
      "Por todos os mercadores do reino! Nunca fui tão bem roubado em plena luz do dia. Quinze por cento a menos, e leve também aquele item de trás: cortesia da casa!",
      "Você acaba de me ensinar um truque novo, {personagem}. Em respeito a isso, o preço cai um quinto... quase. Quinze por cento, e nem um centavo a menos!",
      "(batendo a mão no balcão) Fechado! Você tem sangue de mercador de rota longa. Quinze por cento de desconto, e a próxima rodada é por minha conta!"
    ],
    sucesso: [
      "Bah! Você regateia como quem contou moedas de rei desde o berço. Está bem, fica pelo seu preço. E não conte a ninguém.",
      "Dois comerciantes que se respeitam sabem quando perder um pouco. Pegue o desconto, {personagem}... e olhe o que guardei lá atrás.",
      "Você me deixou sem argumento, e isso quase nunca acontece. Fechado, desconto feito. Mas é a última vez!"
    ],
    falha: [
      "Meu preço é meu preço. Já enfrentei salteadores com mais jeito para o regateio.",
      "Ha! Boa tentativa, mas aprendi a contar antes de você aprender a falar.",
      "Quer pagar menos? Então volte quando seu bolso for tão pesado quanto sua lábia."
    ],
    falhaCritica: [
      "Você tentou me enganar com ISSO? Agora o preço sobe dez por cento, pela ofensa à minha inteligência.",
      "Essa foi tão ruim que me deu pena de mim mesmo por ter ouvido. Dez por cento a mais. Pela dor de ouvido.",
      "Hahaha! Hahaha! ...Dez por cento a mais, {personagem}. Pelo entretenimento."
    ]
  },
  diplomacia: {
    critico: [
      "Há anos ninguém falava comigo assim, {personagem}. Tome: quinze por cento de desconto e tudo o que guardo para os amigos. O resto do mundo pode esperar.",
      "Você poderia convencer uma pedra a pagar aluguel! Quinze por cento a menos, e abro o baú especial, aquele que ninguém vê.",
      "Que seu caminho seja sempre tão cheio de palavras boas! Quinze por cento de desconto, e uma xícara de chá junto, que hoje eu estou feliz!"
    ],
    sucesso: [
      "Sua companhia vale mais que a moeda, {personagem}. Para quem sabe conversar, abro o baú de baixo do balcão, e o preço abaixa também.",
      "Há quem venha aqui só para comprar. Você veio para conversar, e isso eu respeito. Preço melhor, e olhe estas peças.",
      "Que bom ser tratado como gente nesta estrada. Aqui, o que é meu é seu, por um preço de amigo."
    ],
    falha: [
      "Palavras bonitas não enchem prateleira, viajante. O preço é o que está na tábua.",
      "Gentil da sua parte. Inútil, mas gentil.",
      "Belo discurso. Pena que o aluguel da loja não aceita elogio."
    ],
    falhaCritica: [
      "Que coisa mais estranha de se dizer a um homem de negócios... O preço sobe dez por cento, e eu vou fingir que não ouvi o resto.",
      "Sabe o que é pior que falar demais? Falar mal. Dez por cento a mais, e use a porta da frente da próxima vez.",
      "Não sei qual de nós dois ficou mais constrangido, mas só um de nós cobra por isso: dez por cento a mais."
    ]
  },
  intimidacao: {
    critico: [
      "(o mercador larga tudo, as mãos tremendo) T-tudo! Leve tudo! Quinze por cento menos! Trinta, se quiser! Só... só não me olhe assim!",
      "(cai de joelhos atrás do balcão) Pelas minhas filhas, tenha piedade! Quinze por cento de desconto, e as coisas que escondi no porão... estão todas suas!",
      "Eu... eu vi nos seus olhos o que você faria. Quinze por cento a menos e todo o estoque aberto. E, por favor, jamais volte aqui sozinho comigo."
    ],
    sucesso: [
      "G-guarde essa lâmina! Leve o que quiser, pelo preço que quiser... só não me machuque!",
      "(a voz falha) Está bem, está bem! Desconto, e as coisas do fundo também. Agora saia da minha sombra.",
      "Não precisa dessa cara, {personagem}. Eu enxerguei seu olhar e entendi tudo. Pegue o desconto e vá antes que eu me arrependa de ter acordado hoje."
    ],
    falha: [
      "Você acha que me assusta? Já vi coisa pior pedindo fiado. O preço sobe 10%, e a conversa acabou.",
      "Ameaçar quem tem uma besta carregada embaixo do balcão e a guarda da cidade na esquina... Dez por cento a mais pelo susto, forasteiro.",
      "Cada palavra sua custa caro aqui. Pague 10% a mais, e agradeça por ainda poder pagar."
    ],
    falhaCritica: [
      "(pega o apito de metal e sopra com toda a força) GUARDAAAAAS! Ladrões! Assassinos! Aqui, na loja, AGORA!",
      "Você escolheu o mercador errado para ameaçar, forasteiro. (grita) GUARDA! ALGUÉM CHAME OS GUARDAS! ESTÃO TENTANDO ME ROUBAR!",
      "(um sorriso gelado) Eu estava esperando por isso. (bate no sino do balcão) Os rapazes da guarda já vêm aí, e eles não gostam de gente como você. Loja fechada!"
    ]
  }
};

/** Falas padrão como texto (uma por linha), no formato do campo da ficha. */
export const textoDasFalasPadrao = (teste, resultado) => FALAS_PADRAO[teste][resultado].join("\n");

/** Configuração padrão da Barganha (loja.barganha do mercador). */
export const BARGANHA_PADRAO = {
  testes: Object.fromEntries(TESTES_DE_BARGANHA.map(t => [t, { ativo: true, cd: 15 }])),
  descontoSucesso: 5, descontoCritico: 15, acrescimo: 10,
  guardas: { fecharLoja: true, avisarMestre: true, nota: "" },
  mostrarCD: false, falasNoChat: true
};

/**
 * Resultado de um teste pelo d20 natural (o dado que valeu) e o total: 20 natural = crítico (sucesso
 * automático); 1 natural = falha crítica (falha automática); senão total ≥ CD.
 */
export function resultadoDoTeste({ natural, total, cd }) {
  if (Number(natural) === 20) return "critico";
  if (Number(natural) === 1) return "falhaCritica";
  return Number(total) >= Number(cd) ? "sucesso" : "falha";
}

/**
 * Efeitos da Barganha sobre a loja, só pelo estado (flags.barganha): no máximo UM desconto (15% se
 * houve 20 natural, senão 5% se alguém passou) e UM acréscimo (10%: falha na Intimidação ou 1
 * natural em Barganha/Diplomacia). Itens ocultos: liberados pelos testes que passaram.
 * O 1 natural na Intimidação chama os guardas (guardas: true), sem acréscimo.
 * @returns {{ desconto: number, acrescimo: number, liberados: string[], guardas: boolean }}
 */
export function efeitosDaBarganha(estado = {}, config = BARGANHA_PADRAO) {
  const c = { ...BARGANHA_PADRAO, ...(config ?? {}) };
  const feitos = TESTES_DE_BARGANHA.filter(t => estado?.[t]?.feito).map(t => [t, estado[t].resultado]);
  const liberados = feitos.filter(([, r]) => r === "critico" || r === "sucesso").map(([t]) => t);
  const critico = feitos.some(([, r]) => r === "critico");
  const sobe = feitos.some(([t, r]) => (t === "intimidacao" ? r === "falha" : r === "falhaCritica"));
  return {
    desconto: critico ? n0(c.descontoCritico) : liberados.length ? n0(c.descontoSucesso) : 0,
    acrescimo: sobe ? n0(c.acrescimo) : 0,
    liberados,
    guardas: !!(estado?.intimidacao?.feito && estado.intimidacao.resultado === "falhaCritica")
  };
}

/**
 * Registra um teste no estado: cada teste só uma vez, para o grupo todo.
 * @returns {{ ok: false, motivo: "jaFeito"|"testeInvalido", por? } | { ok: true, estado }}
 */
export function registrarTeste(estado = {}, teste, dados) {
  if (!TESTES_DE_BARGANHA.includes(teste)) return { ok: false, motivo: "testeInvalido" };
  if (estado?.[teste]?.feito) return { ok: false, motivo: "jaFeito", por: estado[teste].por };
  return { ok: true, estado: { ...(estado ?? {}), [teste]: { feito: true, ...dados } } };
}

/** Sorteia uma fala (uma por linha) e troca {personagem} e {mercador}. aleatorio: () => [0, 1). */
export function sortearFala(texto, { personagem = "", mercador = "" } = {}, aleatorio = Math.random) {
  const linhas = String(texto ?? "").split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!linhas.length) return "";
  const linha = linhas[Math.min(linhas.length - 1, Math.floor(aleatorio() * linhas.length))];
  return linha.replaceAll("{personagem}", personagem).replaceAll("{mercador}", mercador);
}

/** Pedido do jogador ({ mercadorUuid, teste, mensagemId, compradorUuid }): limpo ou null. O resultado nunca vem dele. */
export function validarPedidoDeBarganha(msg) {
  if (!msg || typeof msg !== "object") return null;
  const { mercadorUuid, teste, mensagemId, compradorUuid } = msg;
  if (typeof mercadorUuid !== "string" || !UUID_ATOR.test(mercadorUuid)) return null;
  if (typeof compradorUuid !== "string" || !UUID_ATOR.test(compradorUuid)) return null;
  if (!TESTES_DE_BARGANHA.includes(teste)) return null;
  if (typeof mensagemId !== "string" || !ID.test(mensagemId)) return null;
  return { mercadorUuid, teste, mensagemId, compradorUuid };
}

export const IDADE_MAXIMA_DA_MENSAGEM = 2 * 60 * 1000;

/**
 * A mensagem de chat vale como o teste? Criada pelo usuário que pediu, o falante é o comprador (que
 * ele controla), a perícia é a do teste, é recente e ainda não foi usada.
 * @param {{ autor, atorFalante, chave, total, natural, quando, usada }} m  dados da mensagem
 * @param {{ teste, usuarioId, compradorId, dono, agora }} p
 * @returns {{ ok: false, motivo: string } | { ok: true, total: number, natural: number }}
 */
export function validarMensagemDeBarganha(m, p) {
  if (!m) return { ok: false, motivo: "mensagemInvalida" };
  if (m.autor !== p.usuarioId || m.atorFalante !== p.compradorId || !p.dono) return { ok: false, motivo: "mensagemInvalida" };
  if (m.chave !== p.teste) return { ok: false, motivo: "mensagemInvalida" };
  if (m.usada) return { ok: false, motivo: "mensagemUsada" };
  const quando = Number(m.quando);
  if (!(p.agora - quando <= IDADE_MAXIMA_DA_MENSAGEM) || quando > p.agora + 5000) return { ok: false, motivo: "mensagemAntiga" };
  const natural = Number(m.natural);
  if (!Number.isFinite(Number(m.total)) || !Number.isInteger(natural) || natural < 1 || natural > 20) return { ok: false, motivo: "mensagemInvalida" };
  return { ok: true, total: Number(m.total), natural };
}
