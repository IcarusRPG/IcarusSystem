/**
 * Assistente "Subir para o nível N" (§5.5.2). Vários níveis são processados um por vez
 * ("Nível 4 de 6"), acumulando as escolhas (a validação de um nível enxerga as dos anteriores).
 * Cada nível mostra: resumo (PV/PM ganhos, mudança de patamar), habilidades da progressão
 * (marcadas e travadas: "Obrigatório da progressão") e, a partir do 2º nível, a lista de poderes
 * em que o jogador marca exatamente 1 (mais as escolhas pendentes, no primeiro nível do salto).
 * Confirmar: grava o nível, cria as habilidades e os poderes (as telas de escolha abrem em
 * seguida) e posta um resumo no chat. Cancelar não altera nada.
 */
import { SISTEMA_ID, ATRIBUTOS } from "../config.mjs";
import { habilidadesDoNivel, nivelTemPoder, ganhoDoNivel, validarPoder, patamarDe, normalizarNome } from "../classes-dados.mjs";
import { classeDoAtor, contadorDePoderes, concederHabilidades } from "../classes.mjs";
import { situacaoParaValidar, escolherPoderDeClasse } from "./dialogo-poderes-classe.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);
const sinal = v => (v < 0 ? `−${Math.abs(v)}` : `+${v}`);

export class DialogoSubirNivel extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @param {{ de: number, ate: number }} faixa  de = nível atual (0 ao aplicar a classe), ate = nível alvo */
  constructor(actor, { de, ate }, options = {}) {
    super({ id: `icarus-subir-nivel-${actor.id}`, ...options });
    this.actor = actor;
    this.classe = classeDoAtor(actor);
    this.niveis = Array.from({ length: Math.max(0, ate - de) }, (_, i) => de + 1 + i);
    this.indice = 0;
    this.selecoes = new Map(this.niveis.map(n => [n, new Set()]));
    // Escolhas pendentes de níveis anteriores (entram no primeiro nível do salto)
    this.pendentesAntes = de >= 1 ? (contadorDePoderes(actor)?.disponiveis ?? 0) : 0;
    this.busca = "";
  }

  static DEFAULT_OPTIONS = {
    classes: ["icarus", "icarus-dialogo", "icarus-subir-nivel"],
    window: { title: "ICARUS.Assistente.SubirTitulo", icon: "fa-solid fa-arrow-up-right-dots", resizable: true },
    position: { width: 780, height: 780 },
    actions: {
      proximo: DialogoSubirNivel._aoProximo, voltar: DialogoSubirNivel._aoVoltar,
      confirmar: DialogoSubirNivel._aoConfirmar, cancelar: DialogoSubirNivel._aoCancelar
    }
  };

  static PARTS = { corpo: { template: `systems/${SISTEMA_ID}/templates/dialogo-subir-nivel.hbs` } };

  get title() {
    return fmt("ICARUS.Assistente.SubirPara", { nivel: this.niveis.at(-1) ?? this.actor.system.nivel });
  }

  get nivel() {
    return this.niveis[this.indice];
  }

  /** Vagas de poder no nível do passo atual. */
  vagas(n) {
    return (nivelTemPoder(this.classe, n) ? 1 : 0) + (n === this.niveis[0] ? this.pendentesAntes : 0);
  }

  /** Situação para validar o nível n: nível n e os poderes escolhidos nos passos anteriores. */
  situacao(n) {
    const base = situacaoParaValidar(this.actor, this.classe);
    const tem = new Set(base.tem);
    const contagem = new Map(base.contagem);
    for (const m of this.niveis) {
      if (m >= n) break;
      for (const id of this.selecoes.get(m)) { tem.add(id); contagem.set(id, (contagem.get(id) ?? 0) + 1); }
    }
    return { ...base, nivel: n, tem, contagem };
  }

  async _prepareContext() {
    const n = this.nivel;
    const c = this.classe;
    if (!c || n === undefined) return { vazio: true };
    const s = this.actor.system;
    const atributos = Object.fromEntries(ATRIBUTOS.map(k => [k, s.atributos[k].total]));
    const ganho = ganhoDoNivel(s.classeConfig, atributos, n);
    const vagas = this.vagas(n);
    const situacao = this.situacao(n);
    const marcados = this.selecoes.get(n);
    const termo = normalizarNome(this.busca);
    const poderes = vagas ? c.grupos.map(g => ({
      nome: g,
      itens: c.poderes.filter(p => p.grupo === g).map(p => {
        const v = validarPoder(c, p, situacao);
        const razao = v.jaEscolhido ? loc("ICARUS.Classe.JaTem") : v.itens.filter(i => i.estado === "falta").map(i => i.texto).join(", ");
        return {
          id: p.id, nome: p.nome, custo: p.custoPM, grupo: g, descricao: p.descricao, visivel: v.visivel,
          marcado: marcados.has(p.id), disponivel: v.disponivel, razao,
          avisos: v.itens.filter(i => i.estado === "conferir").map(i => i.texto).join(", "),
          oculto: !!termo && !normalizarNome(`${p.nome} ${g}`).includes(termo)
        };
      }).filter(p => p.visivel)
    })).filter(g => g.itens.length) : [];
    return {
      passo: fmt("ICARUS.Assistente.Passo", { nivel: n, ate: this.niveis.at(-1) }),
      primeiro: this.indice === 0, ultimo: this.indice === this.niveis.length - 1,
      resumo: {
        pv: sinal(ganho.pv), pm: sinal(ganho.pm),
        monge: !!s.classeConfig.pmAtributoSoNoPrimeiroNivel && n > 1,
        patamar: n > 1 && patamarDe(n) !== patamarDe(n - 1) ? fmt("ICARUS.Assistente.NovoPatamar", { patamar: loc(`ICARUS.Patamares.${patamarDe(n)}`) }) : ""
      },
      habilidades: habilidadesDoNivel(c, n).map(h => ({
        rotulo: h.rotulo, nova: h.nova, escolha: !!h.habilidade?.escolha,
        descricao: h.nova ? h.habilidade?.descricao ?? "" : loc("ICARUS.Assistente.Aprimoramento")
      })),
      vagas, marcados: marcados.size, poderes, busca: this.busca,
      semPoder: n === 1 ? loc("ICARUS.Assistente.SemPoderNoPrimeiro") : !vagas ? loc("ICARUS.Assistente.SemPoderNoNivel") : ""
    };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    if (this._ouvindo) return;
    this._ouvindo = true;
    this.element.addEventListener("change", ev => {
      const t = ev.target;
      if (t.name !== "poder") return;
      const sel = this.selecoes.get(this.nivel);
      if (t.checked) {
        if (sel.size >= this.vagas(this.nivel)) { t.checked = false; return ui.notifications.warn(fmt("ICARUS.Assistente.MarqueN", { n: this.vagas(this.nivel) })); }
        sel.add(t.value);
      } else sel.delete(t.value);
      const contador = this.element.querySelector(".contador-vagas");
      if (contador) contador.textContent = fmt("ICARUS.Assistente.Vagas", { n: sel.size, max: this.vagas(this.nivel) });
    });
    this.element.addEventListener("input", ev => {
      if (ev.target.name !== "busca") return;
      this.busca = ev.target.value;
      const termo = normalizarNome(this.busca);
      for (const el of this.element.querySelectorAll(".opcao-poder")) el.hidden = !!termo && !normalizarNome(el.dataset.busca).includes(termo);
    });
  }

  /** Confere o passo atual: exatamente as vagas (ou menos, se não houver poderes disponíveis). */
  async _conferirPasso() {
    const n = this.nivel;
    const vagas = this.vagas(n);
    const marcados = this.selecoes.get(n).size;
    if (marcados === vagas) return true;
    return foundry.applications.api.DialogV2.confirm({
      window: { title: loc("ICARUS.Assistente.SubirTitulo") },
      content: `<p>${Handlebars.escapeExpression(fmt("ICARUS.Assistente.FaltamEscolhas", { n: vagas - marcados }))}</p>`,
      rejectClose: false
    });
  }

  static async _aoProximo() {
    if (!(await this._conferirPasso())) return;
    this.indice = Math.min(this.niveis.length - 1, this.indice + 1);
    this.busca = "";
    this.render();
  }

  static _aoVoltar() {
    this.indice = Math.max(0, this.indice - 1);
    this.render();
  }

  static async _aoConfirmar() {
    if (!(await this._conferirPasso())) return;
    const actor = this.actor;
    const c = this.classe;
    const ate = this.niveis.at(-1);
    this.close();
    await actor.update({ "system.nivel": ate }, { icarusAssistente: true });
    const habilidades = await concederHabilidades(actor, { nivel: ate });
    const poderes = [];
    for (const n of this.niveis) {
      for (const id of this.selecoes.get(n)) {
        const p = c.poderes.find(x => x.id === id);
        const item = p ? await escolherPoderDeClasse(actor, c, p) : null;
        if (item) poderes.push(item.name);
      }
    }
    const linhas = [
      ...habilidades.map(i => `<li>${Handlebars.escapeExpression(i.name)}</li>`),
      ...poderes.map(nome => `<li><b>${Handlebars.escapeExpression(nome)}</b></li>`)
    ].join("");
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="icarus-rolagem icarus-lembrete"><h3 class="rolagem-nome">${Handlebars.escapeExpression(fmt("ICARUS.Assistente.ChegouAo", { nome: actor.name, nivel: ate }))}</h3>${linhas ? `<ul class="condicao-avisos">${linhas}</ul>` : ""}</div>`
    });
  }

  static _aoCancelar() {
    this.close();
  }
}

/** Abre o assistente de nível (de → ate). Sem classe do sistema, só grava o nível. */
export async function abrirAssistenteDeNivel(actor, { de, ate }) {
  if (!classeDoAtor(actor) || ate <= de) return actor.update({ "system.nivel": Math.max(1, ate) }, { icarusAssistente: true });
  return new DialogoSubirNivel(actor, { de, ate }).render(true);
}
