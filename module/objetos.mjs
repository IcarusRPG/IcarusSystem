/**
 * Objetos no Foundry (regra oficial de Quebrar):
 * - "Atacar objeto" (aba Combate e macro game.icarus.atacarObjeto): escolhe a arma e o objeto — da
 *   tabela (tools/dados/objetos.json), manual (tamanho, Defesa, RD, PV) ou um item do alvo marcado
 *   (arma empunhada, escudo/armadura vestidos, foco, Estandarte). Rola o ataque contra a Defesa
 *   (objeto solto: pelo tamanho, +5 em movimento; item empunhado/vestido por outra criatura: a
 *   Defesa dela, manobra Quebrar), rola o dano e tira a RD do objeto SEM o teto de RD.
 * - Item de ator: PV em flags.pvObjeto; ao zerar, destruído (flags.destruido), sai de "em mãos"/
 *   "equipado" e avisa no chat. Quem não pode mexer no item do alvo deixa o botão
 *   "Aplicar no item" para o Mestre.
 * - Manobra Quebrar (manobras.mjs): abre este diálogo com o alvo, contra a Defesa dele.
 * Regras puras: module/objetos-dados.mjs.
 */
import { SISTEMA_ID } from "./config.mjs";
import { OBJETOS, TAMANHOS_OBJETO, ehFoco, objetoDoItem, defesaDoObjeto, danoNoObjeto, mudancasDoDanoNoItem, estaDestruido } from "./objetos-dados.mjs";
import { calcularAtaque, calcularDano, rolarD20, modosDeAtaque } from "./combate.mjs";
import { itensDoAtor } from "./combate-chat.mjs";

const F = SISTEMA_ID;
const loc = k => game.i18n.localize(k);
const fmt = (k, d) => game.i18n.format(k, d);
const esc = t => Handlebars.escapeExpression(t ?? "");

/** Aviso no chat de item destruído (foco: aviso do Mago). */
export function avisarDestruido(item) {
  const actor = item.parent;
  const texto = ehFoco(item) && actor
    ? fmt("ICARUS.Arcanista.FocoDestruido", { item: item.name, nome: actor.name })
    : fmt("ICARUS.Objetos.Destruido", { item: item.name, nome: actor?.name ?? "" });
  return ChatMessage.create({
    speaker: actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker(),
    content: `<div class="icarus-rolagem icarus-lembrete"><p class="condicao-descricao">${esc(texto)}</p></div>`
  });
}

/** Itens do ator que podem ser alvo de Quebrar (em mãos ou vestidos, inteiros). */
export function itensQuebraveis(actor) {
  if (!actor) return [];
  return actor.items.filter(i => !estaDestruido(i) && (
    (i.type === "arma" && i.system.empunhada) ||
    (i.type === "equipamento" && i.system.equipado && (["armadura", "escudo", "foco"].includes(i.system.tipo)))
  ));
}

/* ------------------------------ Diálogo ------------------------------ */

/**
 * Abre o "Atacar objeto". alvo: token marcado (Quebrar: só os itens dele).
 * @param {Actor} actor  quem ataca
 * @param {{ alvo?: Token, quebrar?: boolean }} [opcoes]
 */
export async function abrirAtacarObjeto(actor, { alvo = [...(game.user.targets ?? [])][0] ?? null, quebrar = false } = {}) {
  const armas = actor.items.filter(i => i.type === "arma" && !estaDestruido(i));
  if (!armas.length) return ui.notifications.warn(loc("ICARUS.Objetos.SemArma"));
  const ordem = [...armas].sort((a, b) => Number(b.system.empunhada) - Number(a.system.empunhada));
  const alvoActor = alvo?.actor ?? null;
  const doAlvo = itensQuebraveis(alvoActor);
  const estandarte = alvoActor?.getFlag?.(F, "estandarte")?.ativo ? alvoActor.getFlag(F, "estandarte") : null;
  if (quebrar && !doAlvo.length && !estandarte) return ui.notifications.warn(fmt("ICARUS.Objetos.AlvoSemItem", { alvo: alvo?.name ?? "?" }));

  const opt = (v, t, sel = false) => `<option value="${esc(v)}"${sel ? " selected" : ""}>${esc(t)}</option>`;
  const opcoesObjeto = [
    ...doAlvo.map((i, n) => { const o = objetoDoItem(i); return opt(`item:${i.id}`, `${alvo.name}: ${i.name}${o ? ` (RD ${o.rd}, PV ${o.pv})` : ""}`, n === 0); }),
    ...(estandarte ? [opt("estandarte", `${alvo.name}: ${loc("ICARUS.Nobre.Estandarte")} (RD ${estandarte.rd}, PV ${estandarte.pv})`, !doAlvo.length)] : []),
    ...(quebrar ? [] : [
      ...OBJETOS.objetos.map(o => opt(`tabela:${o.id}`, `${o.nome} (${OBJETOS.nomesTamanho[o.tamanho]}, Defesa ${OBJETOS.defesaPorTamanho[o.tamanho]}, RD ${o.rd}, PV ${o.pv})`, !doAlvo.length && !estandarte && o.id === "porta-de-madeira")),
      opt("manual", loc("ICARUS.Objetos.Manual"))
    ])
  ].join("");
  const content = `<div class="icarus-uso icarus-objeto">
    ${quebrar ? `<p class="dica">${esc(fmt("ICARUS.Objetos.QuebrarDica", { alvo: alvo.name }))}</p>` : `<p class="dica">${esc(loc("ICARUS.Objetos.Dica"))}</p>`}
    <label class="linha">${esc(loc("ICARUS.Objetos.Arma"))} <select name="arma">${ordem.map(a => opt(a.id, `${a.name}${a.system.empunhada ? "" : ` (${loc("ICARUS.Objetos.NaoEmpunhada")})`}`)).join("")}</select></label>
    <label class="linha">${esc(loc("ICARUS.Objetos.Objeto"))} <select name="objeto">${opcoesObjeto}</select></label>
    <fieldset class="objeto-manual"><legend>${esc(loc("ICARUS.Objetos.ManualLegenda"))}</legend>
      <label class="linha">${esc(loc("ICARUS.Objetos.Tamanho"))} <select name="tamanho">${TAMANHOS_OBJETO.map(t => opt(t, `${OBJETOS.nomesTamanho[t]} (Defesa ${OBJETOS.defesaPorTamanho[t]})`, t === "medio")).join("")}</select></label>
      <label class="linha">${esc(loc("ICARUS.Objetos.DefesaManual"))} <input type="number" name="defesa" placeholder="—" step="1"></label>
      <label class="linha">RD <input type="number" name="rd" value="5" min="0" step="1"></label>
      <label class="linha">${esc(loc("ICARUS.Objetos.PvAtuais"))} <input type="number" name="pv" placeholder="—" min="0" step="1"></label>
    </fieldset>
    ${quebrar ? "" : `<label class="chk"><input type="checkbox" name="movimento"> ${esc(loc("ICARUS.Objetos.EmMovimento"))}</label>`}
  </div>`;
  const escolha = await foundry.applications.api.DialogV2.wait({
    window: { title: quebrar ? `${loc("ICARUS.Manobra.Tipos.quebrar")}: ${alvo.name}` : loc("ICARUS.Objetos.Titulo") },
    position: { width: 520 },
    content,
    buttons: [
      { action: "ok", label: loc("ICARUS.Objetos.Atacar"), default: true, callback: (ev, b) => {
        const e = b.form.elements;
        const num = v => (v === "" || v === undefined ? null : Math.trunc(Number(v)));
        return { arma: e.arma.value, objeto: e.objeto.value, tamanho: e.tamanho.value, defesa: num(e.defesa.value), rd: num(e.rd.value), pv: num(e.pv.value), movimento: !!e.movimento?.checked };
      } },
      { action: "cancelar", label: loc("ICARUS.Testes.Cancelar") }
    ],
    rejectClose: false
  });
  if (!escolha || typeof escolha !== "object") return null;
  return atacarObjeto(actor, { ...escolha, alvo });
}

/**
 * Descreve o objeto escolhido: { nome, defesa, rd, pv, item?, estandarte? }.
 * Item/Estandarte do alvo: Defesa do alvo (Quebrar). Tabela/manual: pelo tamanho (+5 em movimento).
 */
export function objetoEscolhido(escolha, alvoActor) {
  const defesaDoAlvo = alvoActor?.system?.defesa?.total ?? 10;
  if (escolha.objeto?.startsWith("item:")) {
    const item = alvoActor?.items.get(escolha.objeto.slice(5));
    const o = item ? objetoDoItem(item) : null;
    const rd = o?.rd ?? escolha.rd ?? 0;
    // Sem dado no item e sem PV manual: só mostra a conta (o Mestre preenche RD/PV na ficha do item)
    const pv = o?.pv ?? escolha.pv ?? null;
    return item ? { nome: item.name, defesa: defesaDoAlvo, rd, pv, item, semDado: !o } : null;
  }
  if (escolha.objeto === "estandarte") {
    const e = alvoActor.getFlag(F, "estandarte");
    return { nome: loc("ICARUS.Nobre.Estandarte"), defesa: defesaDoAlvo, rd: e.rd, pv: e.pv, estandarte: true };
  }
  if (escolha.objeto?.startsWith("tabela:")) {
    const o = OBJETOS.objetos.find(x => x.id === escolha.objeto.slice(7));
    return { nome: o.nome, defesa: defesaDoObjeto({ tamanho: o.tamanho, emMovimento: escolha.movimento }), rd: o.rd, pv: escolha.pv ?? o.pv };
  }
  return {
    nome: fmt("ICARUS.Objetos.ObjetoManual", { tamanho: OBJETOS.nomesTamanho[escolha.tamanho] ?? "" }),
    defesa: defesaDoObjeto({ tamanho: escolha.tamanho, emMovimento: escolha.movimento, defesa: Number.isFinite(escolha.defesa) ? escolha.defesa : null }),
    rd: escolha.rd ?? 0, pv: escolha.pv ?? 1
  };
}

/** Rola o ataque contra o objeto e, se acertar, o dano menos a RD; atualiza o item/Estandarte. */
export async function atacarObjeto(actor, escolha) {
  const arma = actor.items.get(escolha.arma);
  const alvoActor = escolha.alvo?.actor ?? null;
  const obj = objetoEscolhido(escolha, alvoActor);
  if (!arma || !obj) return null;
  const modo = arma.system.modos?.[0] ?? modosDeAtaque(arma.system)[0] ?? "corpo-a-corpo";
  const itens = itensDoAtor(actor);
  const atq = calcularAtaque(actor.system, arma.system, modo, itens);
  const r = await rolarD20({ bonus: atq.bonus });
  // 20 natural acerta sempre; 1 natural sem efeito especial (como nos ataques)
  const acertou = r.natural === 20 || r.total >= obj.defesa;
  const rolls = [r.roll];
  let dano = null, res = null;
  if (acertou) {
    const d = calcularDano(actor.system, arma.system, modo);
    const roll = await new Roll(d.formula).evaluate();
    rolls.push(roll);
    dano = roll.total;
    res = obj.pv === null ? { ...danoNoObjeto({ pv: 0, rd: obj.rd }, dano), pv: null, destruido: false } : danoNoObjeto({ pv: obj.pv, rd: obj.rd }, dano);
  }
  const linhas = [
    fmt("ICARUS.Objetos.LinhaAtaque", { arma: arma.name, total: r.total, defesa: obj.defesa, resultado: loc(acertou ? "ICARUS.Objetos.Acertou" : "ICARUS.Objetos.Errou") }),
    ...(res ? [fmt("ICARUS.Objetos.LinhaDano", { dano, rd: obj.rd, efetivo: res.efetivo, pv: res.pv === null ? "?" : Math.max(0, res.pv), destruido: res.destruido ? ` · ${loc("ICARUS.Objetos.DestruidoCurto")}` : "" })] : []),
    ...(obj.semDado ? [loc("ICARUS.Objetos.SemDado")] : [])
  ];
  // Item do alvo / Estandarte: quem pode atualiza já; senão o Mestre aplica pelo botão
  const pendente = res && res.pv !== null && (obj.item || obj.estandarte)
    ? { itemUuid: obj.item?.uuid ?? null, actorUuid: alvoActor?.uuid ?? null, estandarte: !!obj.estandarte, dano, manual: obj.semDado ? { rd: obj.rd, pv: obj.pv } : null, aplicado: false } : null;
  const mensagem = await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }), rolls, sound: CONFIG.sounds?.dice,
    content: `<div class="icarus-rolagem icarus-objeto-cartao"><h4>${esc(fmt("ICARUS.Objetos.CartaoTitulo", { objeto: obj.nome }))}</h4>${linhas.map(l => `<p>${esc(l)}</p>`).join("")}</div>`,
    flags: { [F]: { objeto: pendente } }
  });
  if (pendente && (game.user.isGM || (obj.item ?? alvoActor)?.isOwner)) await aplicarNoObjeto(mensagem);
  return { acertou, dano, res, mensagem };
}

/** Aplica o dano guardado na mensagem ao item (ou ao Estandarte) e marca como aplicado. */
export async function aplicarNoObjeto(mensagem) {
  const p = mensagem?.flags?.[F]?.objeto;
  if (!p || p.aplicado) return;
  if (p.estandarte) {
    const actor = fromUuidSync(p.actorUuid);
    const e = actor?.getFlag(F, "estandarte");
    if (e?.ativo) {
      const r = danoNoObjeto({ pv: e.pv, rd: e.rd }, p.dano);
      if (r.destruido) {
        await actor.unsetFlag(F, "estandarte");
        await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<div class="icarus-rolagem icarus-lembrete"><p>${esc(fmt("ICARUS.Objetos.Destruido", { item: loc("ICARUS.Nobre.Estandarte"), nome: actor.name }))}</p></div>` });
      } else await actor.setFlag(F, "estandarte", { ...e, pv: r.pv });
    }
  } else {
    const item = fromUuidSync(p.itemUuid);
    const m = item ? mudancasDoDanoNoItem(item, p.dano, p.manual) : null;
    if (m) await item.update(m.mudancas);
  }
  if (mensagem.isOwner || game.user.isGM) await mensagem.setFlag(F, "objeto", { ...p, aplicado: true });
}

/* ------------------------------ Registro ------------------------------ */

function aoRenderizar(mensagem, html) {
  const p = mensagem.flags?.[F]?.objeto;
  if (!p || p.aplicado || !game.user.isGM) return;
  const raiz = html instanceof HTMLElement ? html : html?.[0];
  const conteudo = raiz?.querySelector(".icarus-objeto-cartao");
  if (!conteudo) return;
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "btn";
  botao.textContent = loc("ICARUS.Objetos.AplicarNoItem");
  botao.addEventListener("click", () => { botao.disabled = true; aplicarNoObjeto(mensagem); });
  conteudo.appendChild(botao);
}

export function registrarObjetos() {
  // Destruído por edição (o Mestre zerou os PV ou marcou): tira de "em mãos" (sem bloquear a edição)
  Hooks.on("preUpdateItem", (item, mudancas) => {
    const pv = foundry.utils.getProperty(mudancas, `flags.${F}.pvObjeto`);
    if (Number.isFinite(pv) && pv <= 0 && !item.flags?.[F]?.destruido) foundry.utils.setProperty(mudancas, `flags.${F}.destruido`, true);
    if (foundry.utils.getProperty(mudancas, `flags.${F}.destruido`) === true) {
      if (item.type === "arma") foundry.utils.setProperty(mudancas, "system.empunhada", false);
      else if (item.type === "equipamento") foundry.utils.setProperty(mudancas, "system.equipado", false);
    }
  });
  Hooks.on("updateItem", (item, mudancas, opcoes, userId) => {
    if (userId !== game.user.id) return;
    if (foundry.utils.getProperty(mudancas, `flags.${F}.destruido`) === true) avisarDestruido(item);
  });
  Hooks.once("setup", () => {
    if ((game.release?.generation ?? 12) >= 13) Hooks.on("renderChatMessageHTML", aoRenderizar);
    else Hooks.on("renderChatMessage", aoRenderizar);
  });
}
