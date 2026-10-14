/**
 * Inventário no Foundry: adicionar ou comprar itens (ao arrastar de um compêndio),
 * somar munição do mesmo tipo e criar itens em branco pelo botão "+ Item".
 */
import { TAMANHO_PACOTE } from "./config.mjs";
import { numero } from "./regras.mjs";
import { formatarPreco, debitar, totalEmCentavos } from "./moeda.mjs";

const { DialogV2 } = foundry.applications.api;
const loc = k => game.i18n.localize(k);

/** Preço do item em centavos (munição: preço do pacote proporcional à quantidade). */
export function precoDoItem(dados) {
  const s = dados.system ?? {};
  if (dados.type === "municao") return Math.round(numero(s.precoPacote) * numero(s.quantidade) / TAMANHO_PACOTE);
  if (dados.type === "arma" || dados.type === "equipamento") return numero(s.preco) * Math.max(1, numero(s.quantidade));
  return 0;
}

/**
 * Coloca o item no personagem. Munição do mesmo tipo soma na quantidade existente.
 * @param {boolean} [comprar=false]  debita o preço das moedas (falha se faltar dinheiro)
 * @returns {Promise<Item|null>}
 */
export async function adicionarItem(actor, dados, { comprar = false } = {}) {
  if (comprar) {
    const preco = precoDoItem(dados);
    const novas = debitar(actor._source.system.moedas, preco);
    if (!novas) {
      ui.notifications.warn(game.i18n.format("ICARUS.Inventario.SemDinheiro", { item: dados.name, preco: formatarPreco(preco) }));
      return null;
    }
    await actor.update({ "system.moedas": novas });
  }
  if (dados.type === "municao") {
    const existente = actor.items.find(i => i.type === "municao" && i.system.tipo === dados.system.tipo);
    if (existente) {
      await existente.update({ "system.quantidade": existente.system.quantidade + numero(dados.system.quantidade) });
      return existente;
    }
  }
  const [criado] = await actor.createEmbeddedDocuments("Item", [dados]);
  return criado;
}

/**
 * Pergunta se o item do compêndio entra grátis ou comprado.
 * Sem dinheiro suficiente, avisa e só oferece "Adicionar grátis".
 * @returns {Promise<"comprar"|"gratis"|null>}
 */
export async function perguntarCompra(actor, dados) {
  const preco = precoDoItem(dados);
  const saldo = totalEmCentavos(actor._source.system.moedas);
  const podeComprar = saldo >= preco;
  const nome = Handlebars.escapeExpression(dados.name);
  const linhas = [
    `<p>${game.i18n.format("ICARUS.Inventario.Compra.Pergunta", { item: nome, preco: formatarPreco(preco) })}</p>`,
    `<p class="dica">${game.i18n.format("ICARUS.Inventario.Compra.Saldo", { saldo: formatarPreco(saldo) || "R$ 0" })}</p>`,
    podeComprar ? "" : `<p class="aviso">${loc("ICARUS.Inventario.Compra.SemDinheiro")}</p>`
  ];
  const botoes = [
    ...(podeComprar ? [{ action: "comprar", label: game.i18n.format("ICARUS.Inventario.Compra.Comprar", { preco: formatarPreco(preco) }), icon: "fa-solid fa-coins", default: true }] : []),
    { action: "gratis", label: loc("ICARUS.Inventario.Compra.Gratis"), icon: "fa-solid fa-gift", default: !podeComprar },
    { action: "cancelar", label: loc("ICARUS.NivelDialogo.Cancelar") }
  ];
  const escolha = await DialogV2.wait({
    window: { title: loc("ICARUS.Inventario.Compra.Titulo") },
    content: linhas.join(""),
    buttons: botoes,
    rejectClose: false
  });
  return escolha === "comprar" || escolha === "gratis" ? escolha : null;
}

/** Botão "+ Item": escolhe Arma, Munição ou Outro, cria em branco e abre a ficha. */
export async function novoItem(actor) {
  const tipo = await DialogV2.wait({
    window: { title: loc("ICARUS.Inventario.NovoItem.Titulo") },
    content: `<p>${loc("ICARUS.Inventario.NovoItem.Pergunta")}</p>`,
    buttons: [
      { action: "arma", label: loc("TYPES.Item.arma"), icon: "fa-solid fa-khanda" },
      { action: "municao", label: loc("TYPES.Item.municao"), icon: "fa-solid fa-bullseye" },
      { action: "equipamento", label: loc("ICARUS.Inventario.NovoItem.Outro"), icon: "fa-solid fa-box" }
    ],
    rejectClose: false
  });
  if (!tipo) return null;
  const nomes = { arma: "ICARUS.Armas.Nova", municao: "ICARUS.Municao.Nova", equipamento: "ICARUS.Equipamento.Novo" };
  const [item] = await actor.createEmbeddedDocuments("Item", [{ name: loc(nomes[tipo]), type: tipo }]);
  item?.sheet.render(true);
  return item;
}
