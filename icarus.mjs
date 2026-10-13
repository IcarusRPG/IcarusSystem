/**
 * Icarus RPG — ponto de entrada do sistema para o Foundry VTT v12.
 */
import { ICARUS, SISTEMA_ID, ICONE_PADRAO } from "./module/config.mjs";
import { PersonagemData } from "./module/data/actor-personagem.mjs";
import { PoderData } from "./module/data/item-poder.mjs";
import { EquipamentoData } from "./module/data/item-equipamento.mjs";
import { FichaPersonagem } from "./module/sheets/ficha-personagem.mjs";
import { FichaItem } from "./module/sheets/ficha-item.mjs";
import { rolarTeste, rolarPericia, rolarAtributo } from "./module/rolls.mjs";
import { criarKaelen, verificarKaelen } from "./module/dev/kaelen.mjs";
import { registrarInterface } from "./module/interface.mjs";

registrarInterface();

const TEMPLATES = [
  "actor/personagem.hbs",
  "actor/parts/cabecalho.hbs",
  "actor/parts/recursos.hbs",
  "actor/parts/caracteristicas.hbs",
  "actor/parts/inventario.hbs",
  "actor/parts/poderes.hbs",
  "actor/parts/diario.hbs",
  "actor/parts/efeitos.hbs",
  "item/poder.hbs",
  "item/equipamento.hbs",
  "dialogo-nivel.hbs",
  "chat/rolagem.hbs"
].map(t => `systems/${SISTEMA_ID}/templates/${t}`);

Hooks.once("init", () => {
  console.log("Icarus RPG | Iniciando o sistema");

  CONFIG.ICARUS = ICARUS;
  game.icarus = { rolarTeste, rolarPericia, rolarAtributo, criarKaelen, verificarKaelen };

  // Modelos de dados
  CONFIG.Actor.dataModels.personagem = PersonagemData;
  CONFIG.Item.dataModels.poder = PoderData;
  CONFIG.Item.dataModels.equipamento = EquipamentoData;

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
  Items.registerSheet(SISTEMA_ID, FichaItem, { types: ["poder", "equipamento"], makeDefault: true, label: "ICARUS.Ficha.Item" });

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
