/**
 * Tela animada dos testes (a mesma para Teste Oposto e Teste de Resistência), aberta em todos os
 * clientes pela sessão (module/testes-sessao.mjs). Uma por cliente.
 * - Primeira renderização: animação de entrada (choque no centro / retratos subindo).
 *   As seguintes só atualizam (sem repetir a entrada); resultado novo ganha uma animação curta.
 * - O dado só é clicável para quem pode rolar (dono jogador; NPC = Mestre).
 */
import { SISTEMA_ID } from "../config.mjs";
import { imagemOuPadrao } from "../imagens.mjs";
import {
  permissaoLocal, rolarParticipante, souAnfitriao, cancelar, reenviarTela, fecharParaTodos, repetirEmpate
} from "../testes-sessao.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);
const sinal = v => (v < 0 ? `−${Math.abs(v)}` : `+${v}`);
/** Duração do giro do dado vermelho quando não há Dice So Nice (ms). */
const GIRO_MS = 700;

export class TelaTeste extends HandlebarsApplicationMixin(ApplicationV2) {
  static #instancia = null;
  static get instancia() {
    return (this.#instancia ??= new this());
  }

  /** Abre (ou reabre) a tela com a animação de entrada. */
  static mostrar(estado) {
    const tela = this.instancia;
    tela.estado = estado;
    tela.entrada = true;
    return tela.render({ force: true });
  }

  /** Atualiza a tela, se estiver aberta (quem fechou a sua não é reaberto). */
  static atualizar(estado) {
    const tela = this.instancia;
    tela.estado = estado;
    if (tela.rendered) return tela.render();
  }

  static fechar() {
    const tela = this.#instancia;
    if (tela?.rendered) return tela.close();
  }

  static DEFAULT_OPTIONS = {
    id: "icarus-teste-tela",
    classes: ["icarus", "icarus-teste-tela-app"],
    window: { frame: false, positioned: false },
    actions: {
      rolar: TelaTeste._aoRolar,
      rolarPor: TelaTeste._aoRolar,
      fechar: TelaTeste._aoFechar,
      fecharTodos: () => fecharParaTodos(),
      cancelar: () => cancelar(),
      reenviar: () => reenviarTela(),
      rolarNovamente: () => repetirEmpate()
    }
  };

  static PARTS = { tela: { template: `systems/${SISTEMA_ID}/templates/testes/tela.hbs` } };

  estado = null;
  entrada = false;
  /** Resultados já mostrados neste cliente (para animar só os novos). */
  vistos = new Set();
  /** Participante cujo dado está girando aqui. */
  girando = null;

  async _prepareContext() {
    const e = this.estado;
    if (!e) return {};
    const oposto = e.tipo === "oposto";
    const mostrarJogador = game.settings.get(SISTEMA_ID, "testesMostrarJogador");
    const animar = game.settings.get(SISTEMA_ID, "animacoesTestes");
    const resolvido = e.status === "resolvido";
    const vencedorId = e.resolucao?.vencedorId;
    const participantes = e.participantes.map((p, i) => {
      const r = p.resultado;
      const chave = `${e.sessaoId}:${e.rodada ?? 1}:${p.id}`;
      const novo = !!r && !this.vistos.has(chave);
      if (r) this.vistos.add(chave);
      const permissao = permissaoLocal(p);
      const aguardando = !r && e.status === "rolando";
      const quem = p.jogadores.length ? p.jogadores.join(", ") : loc("ICARUS.Testes.Mestre");
      let selo = null;
      if (!oposto && r) selo = (p.passou ?? (!r.falhaAuto && r.total >= e.resistencia.cd)) ? "passou" : "falhou";
      return {
        ...p, lado: oposto ? (i === 0 ? "a" : "b") : null, atraso: i * 120,
        jogador: mostrarJogador && p.jogadores.length ? p.jogadores.join(", ") : "",
        bonusTexto: sinal(p.bonus),
        mostrarDica: game.user.isGM,
        clicavel: aguardando && permissao.pode && !permissao.peloMestre,
        rolarPor: aguardando && permissao.peloMestre ? fmt("ICARUS.Testes.RolarPor", { nome: quem }) : "",
        dicaDado: aguardando
          ? (permissao.pode && !permissao.peloMestre ? loc("ICARUS.Testes.CliqueParaRolar") : fmt("ICARUS.Testes.SomenteDono", { nome: quem }))
          : "",
        aguardandoTexto: aguardando ? fmt("ICARUS.Testes.Aguardando", { nome: quem }) : "",
        girando: this.girando === p.id,
        novo, natural20: r?.d20 === 20, natural1: r?.d20 === 1,
        resultadoTexto: r && !r.falhaAuto ? `${r.d20} ${sinal(r.bonus)} = ${r.total}` : "",
        modoTexto: p.modo && p.modo !== "normal" ? loc(`ICARUS.Rolagem.Modo.${p.modo}`) : "",
        dadosTexto: r?.dados ? r.dados.map(d => (d.mantido ? `[${d.valor}]` : String(d.valor))).join(" · ") : "",
        falhaAutoTexto: r?.falhaAuto ? fmt("ICARUS.Testes.FalhaAutomatica", { causa: r.falhaAuto }) : "",
        peloMestre: r?.peloMestre,
        selo, seloTexto: selo ? loc(`ICARUS.Testes.Selo.${selo}`) : "",
        vencedor: resolvido && vencedorId === p.id,
        perdedor: resolvido && oposto && vencedorId && vencedorId !== p.id
      };
    });
    const vencedor = participantes.find(p => p.vencedor);
    const r = e.resistencia;
    return {
      oposto, entrada: this.entrada, animar, gm: game.user.isGM, anfitriao: souAnfitriao(),
      rolando: e.status === "rolando", resolvido,
      dado: imagemOuPadrao("dadoVermelho"), retratoPadrao: imagemOuPadrao("dadoAzul"),
      titulo: e.manobra ? `${loc("ICARUS.Manobra.Titulo")}: ${loc(`ICARUS.Manobra.Tipos.${e.manobra.id}`)}` : loc(oposto ? "ICARUS.Testes.Oposto.Titulo" : "ICARUS.Testes.Resistencia.Titulo"),
      subtitulo: oposto
        ? participantes.map(p => `${p.item.rotulo} (${loc(`ICARUS.Testes.Tipo.${p.item.tipo}`)})`).join(" × ")
        : loc(`ICARUS.Pericias.${r.pericia}`),
      origem: r ? [r.origem, r.conjurador ? fmt("ICARUS.Testes.Resistencia.ConjuradoPor", { nome: r.conjurador }) : ""].filter(Boolean).join(" — ") : "",
      cd: r?.cd, observacao: r?.observacao,
      participantes, primeiro: participantes[0], segundo: participantes[1],
      banner: resolvido
        ? (oposto
          ? (vencedor ? fmt("ICARUS.Testes.Vencedor", { nome: vencedor.nome }) : loc("ICARUS.Testes.Empate"))
          : fmt("ICARUS.Testes.Resumo", { passaram: e.resolucao.passaram, falharam: e.resolucao.falharam }))
        : "",
      empate: resolvido && oposto && !vencedor,
      muitos: participantes.length > 6
    };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    this.entrada = false;
    // Retrato inválido → dado azul
    for (const img of this.element.querySelectorAll("img[data-fallback]")) {
      img.addEventListener("error", () => { img.src = img.dataset.fallback; }, { once: true });
    }
  }

  /** Clique no dado (ou "Rolar por…" do Mestre). */
  static async _aoRolar(event, alvo) {
    const id = alvo.dataset.id;
    if (!id || this.girando) return;
    if (!game.dice3d && game.settings.get(SISTEMA_ID, "animacoesTestes")) {
      this.girando = id;
      alvo.closest(".participante")?.querySelector(".dado")?.classList.add("girando");
      await new Promise(r => setTimeout(r, GIRO_MS));
    }
    try {
      await rolarParticipante(id);
    } finally {
      this.girando = null;
      if (this.rendered) this.render();
    }
  }

  static _aoFechar() {
    this.close();
  }
}
