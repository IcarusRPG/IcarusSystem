/**
 * Verificação dos critérios de aceite do compêndio de armas (seção 9 do prompt), dentro do Foundry.
 * Cria um personagem temporário (FOR +1, DES +4, Luta e Pontaria Treinadas, R$ 300),
 * usa as armas do compêndio, confere os números e apaga o personagem.
 * Uso no console (F12):  await game.icarus.verificarArmas()
 */
import { SISTEMA_ID, ICONE_PADRAO } from "../config.mjs";
import { comSinal } from "../regras.mjs";
import { formatarPreco, precoEmOuro } from "../moeda.mjs";
import { calcularAtaque, calcularDano, ehAmeaca, alcanceDoModo } from "../combate.mjs";
import { rolarAtaque, recarregar, recolherArma } from "../combate-chat.mjs";
import { adicionarItem } from "../inventario.mjs";
import { idEstavel } from "../dados-itens.mjs";
import { carregarDadosDeArmas } from "../compendios.mjs";

export async function verificarArmas() {
  const resultados = [];
  const conferir = (caso, nome, obtido, esperado) =>
    resultados.push({ caso, nome, esperado: String(esperado), obtido: String(obtido), ok: obtido === esperado });

  // 1. Compêndios e ícones
  const packArmas = game.packs.get(`${SISTEMA_ID}.armas`);
  const packMunicoes = game.packs.get(`${SISTEMA_ID}.municoes`);
  const armas = (await packArmas?.getDocuments()) ?? [];
  const municoes = (await packMunicoes?.getDocuments()) ?? [];
  conferir("1", "Armas no compêndio", armas.length, 46);
  conferir("1", "Pastas do compêndio de armas", packArmas?.folders.size ?? 0, 4);
  conferir("1", "Munições no compêndio", municoes.length, 4);
  const faltando = [];
  for (const doc of [...armas, ...municoes]) {
    const ok = await fetch(doc.img, { method: "HEAD" }).then(r => r.ok).catch(() => false);
    if (!ok) faltando.push(`${doc.name}: ${decodeURI(doc.img)}`);
  }
  if (faltando.length) console.warn("Icarus RPG | Ícones que não carregaram:", faltando);
  conferir("1", "Ícones que não carregam", faltando.length, 0);
  conferir("1", "Armas com o dado azul (sem ícone)", armas.filter(a => a.img === ICONE_PADRAO).map(a => a.name).sort().join(", "), "Azagaia, Machado de guerra, Marreta");

  const doCompendio = (lista, id) => {
    const doc = lista.find(d => d.flags?.[SISTEMA_ID]?.id === id);
    const dados = doc.toObject();
    delete dados._id;
    return dados;
  };
  const actor = await Actor.create({
    name: "Teste de Armas (temporário)",
    type: "personagem",
    system: {
      atributos: { FOR: { base: 1 }, DES: { base: 4 } },
      pericias: { luta: { treino: 1 }, pontaria: { treino: 1 } },
      moedas: { ouroReal: 0, real: 300, centavo: 0 }
    }
  }, { renderSheet: false });
  const add = async dados => (await actor.createEmbeddedDocuments("Item", [dados]))[0];
  const qtd = item => actor.items.get(item.id).system.quantidade;

  try {
    // 2. Florete (Ágil)
    const florete = await add(doCompendio(armas, "florete"));
    conferir("2", "Florete: ataque (DES 4 + Treinado 2)", comSinal(calcularAtaque(actor.system, florete.system, "corpo-a-corpo").bonus), "+6");
    conferir("2", "Florete: dano", calcularDano(actor.system, florete.system, "corpo-a-corpo").formula, "1d6 + 1");
    conferir("2", "Florete: d20 natural 18 é ameaça", ehAmeaca(18, florete.system), true);
    conferir("2", "Florete: dano crítico", calcularDano(actor.system, florete.system, "corpo-a-corpo", { critico: true }).formula, "(1d6 + 1) * 2");

    // 3. Espada longa (não Ágil)
    const espada = await add(doCompendio(armas, "espada-longa"));
    conferir("3", "Espada longa: ataque (FOR 1 + Treinado 2)", comSinal(calcularAtaque(actor.system, espada.system, "corpo-a-corpo").bonus), "+3");
    await actor.update({ "system.pericias.luta.treino": 0 });
    conferir("3", "Espada longa com Luta destreinada", comSinal(calcularAtaque(actor.system, espada.system, "corpo-a-corpo").bonus), "+1");
    await actor.update({ "system.pericias.luta.treino": 1 });

    // 4. Arco curto + Flechas
    const arco = await add(doCompendio(armas, "arco-curto"));
    const flechas = await adicionarItem(actor, doCompendio(municoes, "flechas"));
    conferir("4", "Arco curto: Pontaria", comSinal(calcularAtaque(actor.system, arco.system, "distancia").bonus), "+6");
    await rolarAtaque(actor, arco, "distancia", { criarMensagem: false });
    conferir("4", "Flechas depois de 1 ataque", qtd(flechas), 19);
    conferir("4", "Arco curto: dano sem atributo", calcularDano(actor.system, arco.system, "distancia").formula, "1d6");
    await flechas.update({ "system.quantidade": 0 });
    conferir("4", "Sem flechas: ataque bloqueado", await rolarAtaque(actor, arco, "distancia", { criarMensagem: false }), null);

    // 5. Pistola e Mosquete de cano duplo
    const pistola = await add(doCompendio(armas, "pistola"));
    const balas = await adicionarItem(actor, doCompendio(municoes, "balas"));
    conferir("5", "Pistola nasce carregada", pistola.system.carregados, 1);
    await rolarAtaque(actor, pistola, "fogo", { criarMensagem: false });
    conferir("5", "Pistola: carregados e Balas depois do disparo", `${actor.items.get(pistola.id).system.carregados},${qtd(balas)}`, "0,19");
    conferir("5", "Pistola descarregada: ataque bloqueado", await rolarAtaque(actor, actor.items.get(pistola.id), "fogo", { criarMensagem: false }), null);
    conferir("5", "Recarregar a pistola", await recarregar(actor, actor.items.get(pistola.id), { criarMensagem: false }), 1);
    const duplo = await add(doCompendio(armas, "mosquete-de-cano-duplo"));
    await rolarAtaque(actor, duplo, "fogo", { criarMensagem: false });
    const segundo = await rolarAtaque(actor, actor.items.get(duplo.id), "fogo", { criarMensagem: false });
    conferir("5", "Cano duplo: segundo disparo seguido", segundo !== null, true);
    conferir("5", "Cano duplo: terceiro bloqueado", await rolarAtaque(actor, actor.items.get(duplo.id), "fogo", { criarMensagem: false }), null);
    conferir("5", "Cano duplo: recarrega 2", await recarregar(actor, actor.items.get(duplo.id), { criarMensagem: false }), 2);
    await balas.update({ "system.quantidade": 1 });
    await actor.items.get(duplo.id).update({ "system.carregados": 0 });
    conferir("5", "Cano duplo com 1 Bala: recarrega 1", await recarregar(actor, actor.items.get(duplo.id), { criarMensagem: false }), 1);

    // 6. Adaga arremessada e Azagaia
    const adaga = await add(doCompendio(armas, "adaga"));
    conferir("6", "Adaga arremessada: alcance", alcanceDoModo(adaga.system, "arremesso"), "curto");
    await rolarAtaque(actor, adaga, "arremesso", { criarMensagem: false });
    conferir("6", "Adaga depois do arremesso", qtd(adaga), 0);
    await recolherArma(actor, actor.items.get(adaga.id));
    conferir("6", "Recolher arma", qtd(adaga), 1);
    const azagaia = doCompendio(armas, "azagaia");
    conferir("6", "Azagaia: alcance", alcanceDoModo(azagaia.system, "arremesso"), "medio");

    // 7. Carga: Adaga (1) + Mosquete (2) + 40 Balas (2) = 5 / 12
    await actor.deleteEmbeddedDocuments("Item", actor.items.map(i => i.id));
    await add(doCompendio(armas, "adaga"));
    await add(doCompendio(armas, "mosquete"));
    await add({ ...doCompendio(municoes, "balas"), system: { ...doCompendio(municoes, "balas").system, quantidade: 40 } });
    conferir("7", "Carga com FOR +1", `${actor.system.carga.usado}/${actor.system.carga.capacidade}`, "5/12");

    // 8. Preço e moedas
    conferir("8", "Pacote de Pedras", formatarPreco(doCompendio(municoes, "pedras").system.precoPacote), "50 Centavos");
    conferir("8", "Mosquete", formatarPreco(doCompendio(armas, "mosquete").system.preco), "R$ 500");
    conferir("8", "Mosquete de cano duplo", formatarPreco(doCompendio(armas, "mosquete-de-cano-duplo").system.preco), "R$ 900");
    conferir("8", "Dica do cano duplo", precoEmOuro(doCompendio(armas, "mosquete-de-cano-duplo").system.preco), "0,9 Ouro Real");
    await adicionarItem(actor, doCompendio(armas, "adaga"), { comprar: true });
    conferir("8", "Comprar Adaga com R$ 300", actor.system.moedas.real, 295);
    conferir("8", "Comprar Mosquete sem dinheiro", await adicionarItem(actor, doCompendio(armas, "mosquete"), { comprar: true }), null);
    await actor.update({ "system.moedas": { ouroReal: 1, real: 0, centavo: 0 } });
    await adicionarItem(actor, doCompendio(armas, "adaga"), { comprar: true });
    const m = actor.system.moedas;
    conferir("8", "Comprar Adaga com 1 Ouro Real", `${m.ouroReal} Ouro, ${m.real} Reais, ${m.centavo} Centavos`, "0 Ouro, 995 Reais, 0 Centavos");
  } finally {
    await actor.delete();
  }

  // 9. Idempotência: os _id do compêndio são os mesmos gerados a partir dos dados
  const dados = await carregarDadosDeArmas();
  const esperados = dados.armas.map(a => idEstavel(`arma:${a.id}`)).sort().join();
  conferir("9", "_id das armas estáveis", armas.map(a => a.id).sort().join(), esperados);

  const falhas = resultados.filter(r => !r.ok);
  console.table(resultados);
  if (falhas.length) ui.notifications.error(game.i18n.format("ICARUS.Dev.ArmasFalhou", { n: falhas.length, total: resultados.length }));
  else ui.notifications.info(game.i18n.format("ICARUS.Dev.ArmasPassou", { total: resultados.length }));
  return resultados;
}
