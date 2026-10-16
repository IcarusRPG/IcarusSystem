/**
 * Icarus RPG — ponto de entrada do sistema para o Foundry VTT v12.
 */
import { ICARUS, SISTEMA_ID, ICONE_PADRAO } from "./module/config.mjs";
import { PersonagemData } from "./module/data/actor-personagem.mjs";
import { PoderData } from "./module/data/item-poder.mjs";
import { EquipamentoData } from "./module/data/item-equipamento.mjs";
import { ArmaData } from "./module/data/item-arma.mjs";
import { MunicaoData } from "./module/data/item-municao.mjs";
import { FichaPersonagem } from "./module/sheets/ficha-personagem.mjs";
import { FichaItem } from "./module/sheets/ficha-item.mjs";
import { rolarTeste, rolarPericia, rolarAtributo } from "./module/rolls.mjs";
import { criarKaelen, verificarKaelen, dadosKaelen } from "./module/dev/kaelen.mjs";
import { aplicarRaca, trocarRaca, reaplicarRaca, verificarIconesRacas, verificarRacas } from "./module/racas.mjs";
import { registrarInterface } from "./module/interface.mjs";
import { rolarAtaque, rolarDano, recarregar, recolherArma, registrarBotoesDoChat, registrarConfiguracoesDeCombate } from "./module/combate-chat.mjs";
import { adicionarItem } from "./module/inventario.mjs";
import { popularCompendios } from "./module/compendios.mjs";
import { verificarArmas } from "./module/dev/verificar-armas.mjs";
import { registrarTelao, abrirTelao } from "./module/telao/telao.mjs";
import { registrarArmaduras } from "./module/armaduras.mjs";
import { registrarBotoesDeDano, aplicarNosSelecionados, rolarDanoAvulso } from "./module/dano.mjs";
import { registrarCondicoes } from "./module/condicoes-foundry.mjs";
import { abrirPainelDoMestre } from "./module/sheets/painel-condicoes.mjs";
import { registrarMorte, rolarTesteDeMorte } from "./module/morte-foundry.mjs";
import { verificarImagensDoSistema } from "./module/imagens.mjs";
import { registrarTestes } from "./module/testes-sessao.mjs";
import { registrarAtalhos } from "./module/atalhos.mjs";

registrarInterface();
registrarBotoesDoChat();
registrarArmaduras();
registrarBotoesDeDano();
registrarMorte();
registrarAtalhos();

const TEMPLATES = [
  "actor/personagem.hbs",
  "actor/parts/cabecalho.hbs",
  "actor/parts/recursos.hbs",
  "actor/parts/caracteristicas.hbs",
  "actor/parts/combate.hbs",
  "actor/parts/condicoes.hbs",
  "actor/parts/morte.hbs",
  "actor/parts/inventario.hbs",
  "actor/parts/poderes.hbs",
  "actor/parts/diario.hbs",
  "actor/parts/efeitos.hbs",
  "item/poder.hbs",
  "item/equipamento.hbs",
  "item/arma.hbs",
  "item/municao.hbs",
  "dialogo-nivel.hbs",
  "dialogo-escolhas-raca.hbs",
  "chat/rolagem.hbs",
  "chat/ataque.hbs",
  "chat/dano.hbs",
  "chat/aviso.hbs",
  "chat/dano-aplicado.hbs",
  "chat/condicao.hbs",
  "chat/lembrete.hbs",
  "painel-condicoes.hbs",
  "dialogo-poderes-concedidos.hbs",
  "telao/telao.hbs",
  "testes/tela.hbs",
  "testes/chat.hbs",
  "testes/oposto-config.hbs",
  "testes/resistencia-config.hbs",
  "testes/seletor.hbs"
].map(t => `systems/${SISTEMA_ID}/templates/${t}`);

Hooks.once("init", () => {
  console.log("Icarus RPG | Iniciando o sistema");

  CONFIG.ICARUS = ICARUS;
  game.icarus = {
    rolarTeste, rolarPericia, rolarAtributo,
    aplicarRaca, trocarRaca, reaplicarRaca, verificarIconesRacas,
    rolarAtaque, rolarDano, recarregar, recolherArma, adicionarItem, popularCompendios,
    telao: abrirTelao,
    aplicarDano: aplicarNosSelecionados, rolarDanoAvulso, rolarTesteDeMorte,
    criarKaelen, verificarKaelen, verificarArmas,
    verificarRacas: () => verificarRacas({ dadosBase: dadosKaelen() })
  };

  // Modelos de dados
  CONFIG.Actor.dataModels.personagem = PersonagemData;
  CONFIG.Item.dataModels.poder = PoderData;
  CONFIG.Item.dataModels.equipamento = EquipamentoData;
  CONFIG.Item.dataModels.arma = ArmaData;
  CONFIG.Item.dataModels.municao = MunicaoData;

  // Opções de mundo
  registrarConfiguracoesDeCombate();
  registrarTelao();
  game.icarus.condicoes = { ...registrarCondicoes(), painel: abrirPainelDoMestre, abrirPainel: abrirPainelDoMestre };
  game.icarus.testes = registrarTestes();

  // Barras do token: primária PV, secundária PM
  CONFIG.Actor.trackableAttributes = {
    personagem: { bar: ["pv", "pm"], value: ["defesa.total", "deslocamento"] }
  };

  // Iniciativa = 1d20 + total da perícia Iniciativa
  CONFIG.Combat.initiative = { formula: "1d20 + @pericias.iniciativa.total", decimals: 0 };

  // Efeitos de itens passam para o personagem sem serem copiados
  CONFIG.ActiveEffect.legacyTransferral = false;

  // Fichas
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet(SISTEMA_ID, FichaPersonagem, { types: ["personagem"], makeDefault: true, label: "ICARUS.Ficha.Personagem" });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet(SISTEMA_ID, FichaItem, { types: ["poder", "equipamento", "arma", "municao"], makeDefault: true, label: "ICARUS.Ficha.Item" });

  return loadTemplates(TEMPLATES);
});

/** Personagem novo recebe o dado azul como imagem e token, e o token fica ligado à ficha. */
Hooks.on("preCreateActor", (actor, dados) => {
  if (actor.type !== "personagem") return;
  const atualizacao = { "prototypeToken.actorLink": true };
  if (!dados.img || dados.img === Actor.DEFAULT_ICON) {
    atualizacao.img = ICONE_PADRAO;
    atualizacao["prototypeToken.texture.src"] = ICONE_PADRAO;
  }
  actor.updateSource(atualizacao);
});

/** O Mestre é avisado se algum ícone de raça estiver faltando em img/Icones/raças/. */
Hooks.once("ready", () => {
  if (game.user.isGM) verificarIconesRacas();
  if (game.user.isGM) verificarImagensDoSistema();
});

/** Botão "Condições do Mestre" nas ferramentas de token (só para o Mestre). */
Hooks.on("getSceneControlButtons", controles => {
  if (!game.user.isGM) return;
  controles.find(c => c.name === "token")?.tools.push({
    name: "icarus-condicoes",
    title: "ICARUS.Condicoes.PainelMestre",
    icon: "fa-solid fa-person-falling-burst",
    button: true,
    onClick: () => abrirPainelDoMestre()
  });
});
