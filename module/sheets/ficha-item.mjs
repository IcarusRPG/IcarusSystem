import { SISTEMA_ID, FONTES_PODER, TIPOS_EQUIPAMENTO, TIPOS_EQUIPAVEIS } from "../config.mjs";

/** Ficha dos itens "poder" e "equipamento" (um template por tipo). */
export class FichaItem extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["icarus", "sheet", "item"],
      width: 560,
      height: 520,
      resizable: true
    });
  }

  get template() {
    return `systems/${SISTEMA_ID}/templates/item/${this.item.type}.hbs`;
  }

  async getData(options) {
    const ctx = await super.getData(options);
    const item = this.item;
    ctx.item = item;
    ctx.system = item.system;
    ctx.source = item._source.system;
    ctx.editable = this.isEditable;
    ctx.owner = item.isOwner;
    ctx.opcoesFonte = Object.fromEntries(FONTES_PODER.map(k => [k, `ICARUS.Poderes.Fontes.${k}`]));
    ctx.opcoesTipo = Object.fromEntries(TIPOS_EQUIPAMENTO.map(k => [k, `ICARUS.Equipamento.Tipos.${k}`]));
    ctx.equipavel = TIPOS_EQUIPAVEIS.includes(item.system.tipo);
    ctx.descricaoHTML = await TextEditor.enrichHTML(item._source.system.descricao, {
      async: true, secrets: item.isOwner, relativeTo: item
    });
    return ctx;
  }
}
