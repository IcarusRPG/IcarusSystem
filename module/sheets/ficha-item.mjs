import {
  CATEGORIAS_ARMADURA, SISTEMA_ID, FONTES_PODER, TIPOS_EQUIPAMENTO, TIPOS_EQUIPAVEIS, CATEGORIAS_ARMA, GRUPOS_ARMA, EMPUNHADURAS,
  ALCANCES, TIPOS_DANO, PROPRIEDADES_ARMA, TIPOS_MUNICAO, ALCANCE_METROS, TAMANHO_PACOTE, ACOES_PODER, FREQUENCIAS_PODER } from "../config.mjs";
import { numero } from "../regras.mjs";
import { formatarPreco, precoEmOuro } from "../moeda.mjs";
import { textoCritico, faixaCritico } from "../combate.mjs";

/**
 * Ficha dos itens (um template por tipo: poder, equipamento, arma, municao).
 * Foundry v12: ficha clássica (ItemSheet). Preços aparecem em Reais e são gravados em centavos.
 */
export class FichaItem extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["icarus", "sheet", "item"],
      width: 600,
      height: 640,
      resizable: true
    });
  }

  get template() {
    return `systems/${SISTEMA_ID}/templates/item/${this.item.type}.hbs`;
  }

  async getData(options) {
    const ctx = await super.getData(options);
    const item = this.item;
    const s = item.system;
    const src = item._source.system;
    const loc = k => game.i18n.localize(k);
    const opcoes = (lista, prefixo) => Object.fromEntries(lista.map(k => [k, `${prefixo}.${k}`]));
    ctx.item = item;
    ctx.system = s;
    ctx.source = src;
    ctx.editable = this.isEditable;
    ctx.owner = item.isOwner;
    ctx.opcoesFonte = opcoes(FONTES_PODER, "ICARUS.Poderes.Fontes");
    if (item.type === "classe") {
      const pmAtributo = src.pm.atributo ? (src.pm.atributoSoNoPrimeiroNivel ? game.i18n.format("ICARUS.Classe.PMAtributoPrimeiro", { atributo: src.pm.atributo }) : ` + ${src.pm.atributo}`) : "";
      ctx.classe = {
        pv: game.i18n.format("ICARUS.Classe.PVTexto", { inicial: src.pv.inicial, porNivel: src.pv.porNivel, atributo: src.pv.atributo ?? "CON" }),
        pm: game.i18n.format("ICARUS.Classe.PMTexto", { inicial: src.pm.inicial, porNivel: src.pm.porNivel }) + pmAtributo,
        pericias: game.i18n.format("ICARUS.Classe.PericiasTexto", { obrigatorias: src.pericias.obrigatorias, n: src.pericias.escolha, lista: src.pericias.lista.join(", ") })
      };
      ctx.introHTML = await TextEditor.enrichHTML(src.intro, { async: true });
    }
    ctx.opcoesAcao = { "": "ICARUS.Poderes.SemAcao", ...opcoes(ACOES_PODER, "ICARUS.Poderes.Acoes") };
    ctx.opcoesFrequencia = { "": "ICARUS.Poderes.SemFrequencia", ...opcoes(FREQUENCIAS_PODER, "ICARUS.Poderes.Frequencias") };
    ctx.opcoesTipo = opcoes(TIPOS_EQUIPAMENTO, "ICARUS.Equipamento.Tipos");
    ctx.equipavel = TIPOS_EQUIPAVEIS.includes(s.tipo);
    if (item.type === "equipamento") {
      ctx.opcoesCategoriaArmadura = { "": "ICARUS.Armaduras.SemCategoria", ...opcoes(CATEGORIAS_ARMADURA, "ICARUS.Armaduras.Categorias") };
      ctx.provisorio = (s.provisorio ?? []).map(c => loc(`ICARUS.Armaduras.Campos.${c}`)).join(", ");
    }
    ctx.descricaoHTML = await TextEditor.enrichHTML(src.descricao, { async: true, secrets: item.isOwner, relativeTo: item });

    // Preço: editado em Reais, gravado em centavos
    const centavos = item.type === "municao" ? src.precoPacote : src.preco;
    if (centavos !== undefined) {
      ctx.preco = { reais: numero(centavos) / 100, texto: formatarPreco(centavos), ouro: precoEmOuro(centavos) };
    }

    if (item.type === "arma") {
      ctx.opcoesCategoria = opcoes(CATEGORIAS_ARMA, "ICARUS.Armas.Categorias");
      ctx.opcoesGrupo = opcoes(GRUPOS_ARMA, "ICARUS.Armas.Grupos");
      ctx.opcoesEmpunhadura = opcoes(EMPUNHADURAS, "ICARUS.Armas.Empunhaduras");
      ctx.opcoesAlcance = opcoes(ALCANCES, "ICARUS.Armas.Alcances");
      ctx.opcoesArremesso = { "": "ICARUS.Armas.SemArremesso", curto: "ICARUS.Armas.Alcances.curto" };
      ctx.opcoesMunicao = { "": "ICARUS.Armas.SemMunicao", ...opcoes(TIPOS_MUNICAO, "ICARUS.Municao.Tipos") };
      ctx.opcoesProficiencia = opcoes(["auto", "sim", "nao"], "ICARUS.Armas.Proficiencia");
      // Pacote de munição a usar: "auto" ou um item munição do mesmo tipo no inventário do dono
      const pacotes = item.parent?.items.filter(i => i.type === "municao" && i.system.tipo === s.municaoTipo) ?? [];
      ctx.opcoesMunicaoUsada = { auto: "ICARUS.Armas.MunicaoAuto", ...Object.fromEntries(pacotes.map(p => [p.id, `${p.name} (${p.system.quantidade})`])) };
      ctx.temMunicaoUsada = pacotes.length > 0;
      ctx.chipsPropriedades = PROPRIEDADES_ARMA.map(p => ({ valor: p, rotulo: loc(`ICARUS.Armas.Propriedades.${p}`), ativo: s.propriedades.includes(p) }));
      ctx.chipsTiposDano = TIPOS_DANO.map(t => ({ valor: t, rotulo: loc(`ICARUS.TiposDano.${t}`), ativo: s.tiposDano.includes(t) }));
      ctx.categoriaRotulo = loc(`ICARUS.Armas.Categorias.${s.categoria}`);
      ctx.textoPropriedades = s.propriedades.map(p => loc(`ICARUS.Armas.Propriedades.${p}`)).join(", ");
      ctx.critico = { texto: textoCritico(s), faixa: faixaCritico(s) };
      const alcances = [s.alcance, s.alcanceArremesso].filter(Boolean);
      ctx.textoAlcance = alcances.map(a => `${loc(`ICARUS.Armas.Alcances.${a}`)} (${ALCANCE_METROS[a].toLocaleString("pt-BR")} m)`).join(" / ");
      ctx.ehFogo = s.grupo === "fogo";
      ctx.temDanoExtra = !!s.danoExtra || s.propriedades.includes("dupla");
      ctx.rotuloDanoExtra = s.propriedades.includes("dupla") ? loc("ICARUS.Armas.DanoOutraExtremidade") : loc("ICARUS.Armas.DanoDuasMaos");
    }

    if (item.type === "municao") {
      ctx.opcoesTipoMunicao = opcoes(TIPOS_MUNICAO, "ICARUS.Municao.Tipos");
      ctx.pacotes = game.i18n.format("ICARUS.Municao.Pacotes", {
        n: new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(s.quantidade / TAMANHO_PACOTE), espacos: s.espacos
      });
    }
    return ctx;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;
    // Chips de propriedades e tipos de dano (listas): liga e desliga
    html.on("click", "[data-chip-lista]", ev => {
      const { chipLista: campo, valor } = ev.currentTarget.dataset;
      const atual = new Set(this.item._source.system[campo] ?? []);
      if (atual.has(valor)) atual.delete(valor); else atual.add(valor);
      return this.item.update({ [`system.${campo}`]: [...atual] });
    });
  }

  /** Preço digitado em Reais vira centavos; carregados nunca passa da capacidade. */
  async _updateObject(event, formData) {
    if ("precoReais" in formData) {
      const centavos = Math.max(0, Math.round(numero(formData.precoReais) * 100));
      formData[this.item.type === "municao" ? "system.precoPacote" : "system.preco"] = centavos;
      delete formData.precoReais;
    }
    if (this.item.type === "arma" && "system.carregados" in formData) {
      const cap = numero(formData["system.capacidadeDisparos"] ?? this.item.system.capacidadeDisparos);
      formData["system.carregados"] = Math.min(Math.max(0, numero(formData["system.carregados"])), Math.max(0, cap));
    }
    return super._updateObject(event, formData);
  }
}
