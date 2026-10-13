import {
  SISTEMA_ID, ICONE_PADRAO, ATRIBUTOS, PERICIAS, RESISTENCIAS, TAMANHOS, FONTES_PODER, TIPOS_EQUIPAVEIS, NIVEL_PARAGON, chavesDeEfeito
} from "../config.mjs";
import { numero, limitar, comSinal, semMais } from "../regras.mjs";
import { rolarPericia, rolarAtributo } from "../rolls.mjs";
import { RACAS, racaPorId, iconeDaRaca, resolverRaca } from "../data/racas.mjs";
import { trocarRaca, reaplicarRaca, refazerEscolhas, ehPoderRacialAuto, escolhasGuardadas } from "../racas.mjs";
import { DialogoNivel } from "./dialogo-nivel.mjs";

const T = `systems/${SISTEMA_ID}/templates/actor`;

/**
 * Ficha do Actor "personagem".
 * Foundry v12: usa a ficha clássica (ActorSheet + Handlebars). Ao migrar para o v13,
 * esta classe vira ActorSheetV2; templates, dados e rolagens continuam os mesmos.
 */
export class FichaPersonagem extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["icarus", "sheet", "actor", "personagem"],
      template: `${T}/personagem.hbs`,
      width: 1280,
      height: 920,
      resizable: true,
      tabs: [{ navSelector: ".abas-lista", contentSelector: ".corpo", initial: "caracteristicas" }],
      scrollY: [".corpo"],
      dragDrop: [{ dragSelector: "[data-item-id], [data-effect-id]", dropSelector: null }]
    });
  }

  async getData(options) {
    const ctx = await super.getData(options);
    const actor = this.actor;
    const s = actor.system;            // valores com Efeitos e derivados (para exibir)
    const src = actor._source.system;  // valores salvos (para os campos editáveis)
    const loc = k => game.i18n.localize(k);

    ctx.actor = actor;
    ctx.system = s;
    ctx.source = src;
    ctx.editable = this.isEditable;
    ctx.owner = actor.isOwner;
    ctx.iconePadrao = ICONE_PADRAO;

    // De onde vem cada bônus de Efeito Ativo (vira dica ao passar o mouse)
    const origens = this._origensDosEfeitos();
    const dica = (...chaves) => chaves.flatMap(c => origens[c] ?? []).join("\n");

    // Raça (combobox)
    const raca = racaPorId(src.identidade.raca);
    const personalizada = src.identidade.raca && !raca ? src.identidade.raca : "";
    const pendentesRaca = raca ? resolverRaca(raca, escolhasGuardadas(actor)).pendentes : [];
    ctx.raca = {
      id: raca?.id ?? "",
      nome: raca?.nome ?? personalizada,
      significado: raca?.significado ?? (personalizada ? loc("ICARUS.Racas.Personalizada") : ""),
      icone: raca ? iconeDaRaca(raca) : ICONE_PADRAO,
      temEscolhas: !!raca?.escolhas?.length,
      pendente: pendentesRaca.length > 0,
      opcoes: [
        { valor: "", rotulo: loc("ICARUS.Racas.Nenhuma"), selecionado: !src.identidade.raca },
        ...(personalizada ? [{ valor: personalizada, rotulo: `${personalizada} (${loc("ICARUS.Racas.Personalizada").toLowerCase()})`, selecionado: true }] : []),
        ...[...RACAS].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
          .map(r => ({ valor: r.id, rotulo: r.nome, selecionado: r.id === raca?.id }))
      ]
    };

    ctx.identidade = ["origem", "classe", "profissao", "divindade"].map(k => ({
      chave: k,
      rotulo: loc(`ICARUS.Identidade.${k}`),
      valor: src.identidade[k],
      placeholder: k === "origem" ? loc("ICARUS.Identidade.Obrigatoria") : k === "profissao" ? loc("ICARUS.Identidade.Opcional") : ""
    }));

    ctx.nivel = {
      valor: s.nivel,
      paragon: s.paragon,
      pips: Array.from({ length: 25 }, (_, i) => ({
        classe: [i >= NIVEL_PARAGON - 1 ? "par" : "", i < s.nivel ? "on" : ""].join(" ").trim()
      }))
    };

    const pct = (v, m) => (m > 0 ? Math.round(100 * v / m) : 0);
    ctx.pv = { value: s.pv.value, max: s.pv.max, pct: pct(s.pv.value, s.pv.max), dica: dica("system.classeConfig.bonusPvPorNivel") };
    ctx.pm = { value: s.pm.value, max: s.pm.max, pct: pct(s.pm.value, s.pm.max), dica: dica("system.classeConfig.bonusPmPorNivel", "system.classeConfig.bonusPmNivelImpar") };
    ctx.defesa = {
      total: s.defesa.total,
      outros: src.defesa.outros,
      dica: dica("system.defesa.outros"),
      formula: game.i18n.format("ICARUS.Defesa.Formula", {
        des: semMais(s.atributos.DES.total), armadura: semMais(s.defesa.armadura),
        escudo: semMais(s.defesa.escudo), outros: semMais(s.defesa.outros)
      })
    };
    ctx.deslocamento = {
      metros: src.deslocamento,
      exibicao: semMais(s.deslocamento),
      quadrados: s.deslocamentoQuadrados,
      dica: dica("system.deslocamento"),
      mudou: s.deslocamento !== src.deslocamento
    };

    ctx.atributos = ATRIBUTOS.map(k => ({
      chave: k,
      nome: loc(`ICARUS.Atributos.${k}`),
      base: src.atributos[k].base,
      racial: src.atributos[k].racial,
      temp: src.atributos[k].temp,
      // Temp diferente do salvo = há Efeito Ativo mexendo nele
      tempEfeito: s.atributos[k].temp !== src.atributos[k].temp ? comSinal(s.atributos[k].temp - src.atributos[k].temp) : "",
      tempDica: dica(`system.atributos.${k}.temp`),
      total: comSinal(s.atributos[k].total)
    }));

    const opcoesAtributo = Object.fromEntries(ATRIBUTOS.map(a => [a, a]));
    const pericias = PERICIAS.map(p => {
      const d = s.pericias[p.chave];
      const fonte = src.pericias[p.chave];
      const nome = loc(`ICARUS.Pericias.${p.chave}`);
      const k = `system.pericias.${p.chave}`;
      const origem = dica(`${k}.treino`, `${k}.outros`, `${k}.atributo`);
      const rolar = game.i18n.format("ICARUS.Pericia.Rolar", { pericia: nome, total: comSinal(d.total) });
      return {
        chave: p.chave,
        nome,
        treino: d.treino,
        treinoDica: [game.i18n.format("ICARUS.Pericia.TreinoDica", { pericia: nome, grau: loc(`ICARUS.Treino.${d.treino}`) }), dica(`${k}.treino`)].filter(Boolean).join("\n"),
        resistencia: !!p.resistencia,
        atributo: fonte.atributo,
        atributoMudou: d.atributo !== p.atributo,
        atributoDica: dica(`${k}.atributo`),
        outros: fonte.outros,
        outrosDica: dica(`${k}.outros`),
        comEfeito: !!origem,
        total: comSinal(d.total),
        rolarDica: [rolar, origem].filter(Boolean).join("\n")
      };
    });
    ctx.opcoesAtributo = opcoesAtributo;
    ctx.periciasA = pericias.slice(0, 15);
    ctx.periciasB = pericias.slice(15);

    ctx.tamanho = src.tamanho;
    ctx.opcoesTamanho = Object.fromEntries(Object.keys(TAMANHOS).map(k => [k, `ICARUS.Tamanhos.${k}`]));
    ctx.tamanhoEfetivo = s.tamanho !== src.tamanho
      ? game.i18n.format("ICARUS.Outras.TamanhoEfetivo", { tamanho: loc(`ICARUS.Tamanhos.${s.tamanho}`), origem: dica("system.tamanho") })
      : "";
    const padrao = TAMANHOS[s.tamanho]?.deslocamento;
    ctx.dicaTamanho = padrao != null && padrao !== s.deslocamento && !ctx.deslocamento.dica
      ? game.i18n.format("ICARUS.Outras.PadraoTamanho", { tamanho: loc(`ICARUS.Tamanhos.${s.tamanho}`), metros: padrao })
      : "";
    ctx.resistencias = RESISTENCIAS.map(r => ({
      chave: r.chave, abrev: r.abrev, nome: loc(`ICARUS.Pericias.${r.chave}`), total: comSinal(s.pericias[r.chave].total)
    }));

    // Inventário
    ctx.equipamentos = actor.items.filter(i => i.type === "equipamento")
      .sort((a, b) => (a.sort || 0) - (b.sort || 0))
      .map(i => ({
        id: i.id, name: i.name, img: i.img,
        tipo: loc(`ICARUS.Equipamento.Tipos.${i.system.tipo}`),
        quantidade: i.system.quantidade,
        equipavel: TIPOS_EQUIPAVEIS.includes(i.system.tipo),
        equipado: i.system.equipado,
        bonus: comSinal(i.system.bonusDefesa)
      }));

    // Poderes agrupados por fonte (Raça primeiro, com o ícone da raça)
    const poderes = actor.items.filter(i => i.type === "poder").sort((a, b) => (a.sort || 0) - (b.sort || 0));
    const subtitulo = { raca: ctx.raca.nome, classe: src.identidade.classe, origem: src.identidade.origem, profissao: src.identidade.profissao };
    ctx.gruposPoder = await Promise.all(FONTES_PODER.map(async fonte => {
      const lista = poderes.filter(p => p.system.fonte === fonte);
      const nomeFonte = loc(`ICARUS.Poderes.Fontes.${fonte}`);
      const titulo = fonte === "geral" ? loc("ICARUS.Poderes.Gerais") : [nomeFonte, subtitulo[fonte]].filter(Boolean).join(" — ");
      return {
        fonte,
        titulo,
        ehRaca: fonte === "raca",
        icone: fonte === "raca" && raca ? ctx.raca.icone : "",
        tag: fonte === "classe"
          ? game.i18n.format("ICARUS.Poderes.TagNivel", { nivel: s.nivel })
          : game.i18n.format(lista.length === 1 ? "ICARUS.Poderes.ContaUm" : "ICARUS.Poderes.Conta", { n: lista.length }),
        vazio: game.i18n.format("ICARUS.Poderes.Vazio", { fonte: nomeFonte.toLowerCase() }),
        poderes: await Promise.all(lista.map(async p => {
          const flags = p.flags?.[SISTEMA_ID] ?? {};
          return {
            id: p.id, name: p.name, img: p.img,
            mostrarIcone: fonte === "raca",
            auto: ehPoderRacialAuto(p),
            pendente: ehPoderRacialAuto(p) && flags.pendente === true,
            custo: p.system.custoPM ?? null,
            meta: [
              p.system.nivel ? game.i18n.format("ICARUS.Poderes.NivelN", { n: p.system.nivel }) : "",
              p.system.prerequisito ? `${loc("ICARUS.Poderes.Prerequisito")}: ${p.system.prerequisito}` : ""
            ].filter(Boolean).join(" · "),
            descricao: await TextEditor.enrichHTML(p.system.descricao, { async: true, secrets: actor.isOwner, relativeTo: p })
          };
        }))
      };
    }));

    // Efeitos Ativos do personagem e dos itens que transferem efeitos
    ctx.efeitos = Array.from(actor.allApplicableEffects()).map(e => ({
      id: e.id,
      parentId: e.parent === actor ? "" : e.parent.id,
      name: e.name,
      img: e.img,
      descricao: e.description ?? "",
      ativo: !e.disabled,
      origem: e.parent === actor ? "" : e.parent.name,
      mudancas: e.changes.length
        ? e.changes.map(c => this._descreverMudanca(c)).join(" · ")
        : loc("ICARUS.Efeitos.SemAlteracao")
    }));
    ctx.chavesEfeito = chavesDeEfeito().join(", ");

    const enriquecer = html => TextEditor.enrichHTML(html, { async: true, secrets: actor.isOwner, relativeTo: actor });
    ctx.notasHTML = await enriquecer(src.notas);
    ctx.diarioHTML = await enriquecer(src.diario);
    return ctx;
  }

  /** Nome legível de uma chave de efeito ("Fortitude · Outros"). */
  _nomeDaChave(chave) {
    const loc = k => game.i18n.localize(k);
    const p = chave.replace(/^system\./, "").split(".");
    if (p[0] === "atributos") return `${p[1]} · Temp`;
    if (p[0] === "defesa") return `${loc("ICARUS.Defesa.Rotulo")} · ${loc("ICARUS.Defesa.Outros")}`;
    if (p[0] === "pericias") {
      const campo = { outros: "ICARUS.Defesa.Outros", treino: "ICARUS.Pericia.Treino", atributo: "ICARUS.Pericia.Atributo" }[p[2]];
      return `${loc(`ICARUS.Pericias.${p[1]}`)} · ${campo ? loc(campo) : p[2]}`;
    }
    if (p[0] === "classeConfig") return loc(`ICARUS.NivelDialogo.Campos.${p[1]}`);
    if (p[0] === "deslocamento") return loc("ICARUS.Deslocamento");
    if (p[0] === "tamanho") return loc("ICARUS.Outras.Tamanho");
    return chave;
  }

  /** Valor de uma mudança como texto: "+2", "= 12", "Especialista". */
  _valorDaMudanca(change) {
    const modos = CONST.ACTIVE_EFFECT_MODES;
    if (change.key.endsWith(".treino")) return game.i18n.localize(`ICARUS.Treino.${numero(change.value)}`);
    if (change.key === "system.tamanho") return game.i18n.localize(`ICARUS.Tamanhos.${change.value}`);
    if (change.mode === modos.ADD) return comSinal(numero(change.value));
    if (change.mode === modos.OVERRIDE) return `= ${change.value}`;
    if (change.mode === modos.UPGRADE) return `≥ ${change.value}`;
    return String(change.value);
  }

  _descreverMudanca(change) {
    return `${this._nomeDaChave(change.key)} ${this._valorDaMudanca(change)}`;
  }

  /** Mapa chave → ["+2 Couro Brutal", …] com os efeitos ativos. */
  _origensDosEfeitos() {
    const origens = {};
    for (const efeito of this.actor.allApplicableEffects()) {
      if (efeito.disabled || efeito.isSuppressed) continue;
      for (const c of efeito.changes) (origens[c.key] ??= []).push(`${this._valorDaMudanca(c)} ${efeito.name}`);
    }
    return origens;
  }

  activateListeners(html) {
    super.activateListeners(html);
    // Rolar é permitido a quem é dono da ficha, mesmo com ela travada
    if (this.actor.isOwner) {
      html.on("click", "[data-action='rolar-pericia']", ev => rolarPericia(this.actor, ev.currentTarget.dataset.pericia));
      html.on("click", "[data-action='rolar-atributo']", ev => rolarAtributo(this.actor, ev.currentTarget.dataset.atributo));
    }
    // Clicar no card do poder abre a ficha do item (fora dos botões)
    html.on("click", "[data-abrir-item]", ev => {
      if (ev.target.closest("button, a, input, select")) return;
      this.actor.items.get(ev.currentTarget.dataset.itemId)?.sheet.render(true);
    });
    if (!this.isEditable) return;
    html.on("click", "[data-action]", this._onAcao.bind(this));
    html.on("change", ".sel-raca", async ev => {
      const mudou = await trocarRaca(this.actor, ev.currentTarget.value);
      if (!mudou) this.render(false);  // cancelou: volta a combobox para a raça atual
    });
  }

  /** Botões com data-action (exceto rolagens, tratadas acima). */
  async _onAcao(event) {
    const el = event.currentTarget;
    const acao = el.dataset.action;
    const actor = this.actor;
    const s = actor.system;
    const itemDe = () => actor.items.get(el.closest("[data-item-id]")?.dataset.itemId);
    switch (acao) {
      case "nivel":
        return actor.update({ "system.nivel": limitar(s.nivel + Number(el.dataset.delta), 1, 25) });
      case "recurso": {
        const k = el.dataset.recurso;
        return actor.update({ [`system.${k}.value`]: limitar(s[k].value + Number(el.dataset.delta), 0, s[k].max) });
      }
      case "treino": {
        const k = el.dataset.pericia;
        // Cicla 0 → 1 → 2 → 0 o treino salvo, sem bloquear; Efeitos (UPGRADE) agem por cima
        return actor.update({ [`system.pericias.${k}.treino`]: (actor._source.system.pericias[k].treino + 1) % 3 });
      }
      case "abrir-nivel":
        return new DialogoNivel(actor).render(true);
      case "raca-reaplicar":
        return reaplicarRaca(actor);
      case "raca-escolhas":
        return refazerEscolhas(actor);
      case "item-criar": {
        const tipo = el.dataset.tipo;
        const dados = {
          name: game.i18n.localize(tipo === "poder" ? "ICARUS.Poderes.Novo" : "ICARUS.Equipamento.Novo"),
          type: tipo,
          system: tipo === "poder" ? { fonte: el.dataset.fonte || "geral" } : {}
        };
        const [item] = await actor.createEmbeddedDocuments("Item", [dados]);
        return item?.sheet.render(true);
      }
      case "item-editar":
        return itemDe()?.sheet.render(true);
      case "item-excluir":
        return this._confirmarExclusao(itemDe());
      case "item-equipar": {
        const item = itemDe();
        return item?.update({ "system.equipado": !item.system.equipado });
      }
      case "efeito-criar": {
        const [efeito] = await actor.createEmbeddedDocuments("ActiveEffect", [{
          name: game.i18n.localize("ICARUS.Efeitos.Novo"),
          img: "icons/svg/aura.svg",
          origin: actor.uuid
        }]);
        return efeito?.sheet.render(true);
      }
      case "efeito-editar":
        return this._efeitoDe(el)?.sheet.render(true);
      case "efeito-excluir":
        return this._confirmarExclusao(this._efeitoDe(el));
      case "efeito-alternar": {
        const efeito = this._efeitoDe(el);
        return efeito?.update({ disabled: !efeito.disabled });
      }
    }
  }

  _efeitoDe(el) {
    const linha = el.closest("[data-effect-id]");
    if (!linha) return null;
    const dono = linha.dataset.parentId ? this.actor.items.get(linha.dataset.parentId) : this.actor;
    return dono?.effects.get(linha.dataset.effectId);
  }

  async _confirmarExclusao(doc) {
    if (!doc) return;
    const nome = Handlebars.escapeExpression(doc.name);
    const aviso = ehPoderRacialAuto(doc) ? `<p>${game.i18n.localize("ICARUS.Racas.ExcluirAuto")}</p>` : "";
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("ICARUS.Acoes.ExcluirTitulo") },
      content: `<p>${game.i18n.format("ICARUS.Acoes.ExcluirConfirmar", { nome })}</p>${aviso}`,
      rejectClose: false
    });
    if (ok) return doc.delete();
  }

  /** PV e PM digitados ficam entre 0 e o máximo. */
  async _updateObject(event, formData) {
    for (const k of ["pv", "pm"]) {
      const chave = `system.${k}.value`;
      if (chave in formData) formData[chave] = limitar(numero(formData[chave]), 0, this.actor.system[k].max);
    }
    return super._updateObject(event, formData);
  }
}
