/**
 * Combobox em árvore do campo Divindade (componente próprio, não um <select>).
 * Ordem: Nenhum(a) · Alfars [+] · Baldurs [+] (· Outra: <texto antigo>, se houver).
 * Os grupos começam recolhidos; ao abrir, o grupo da divindade escolhida já vem expandido.
 * Teclado: ↑/↓ navegam, Enter seleciona (ou expande o grupo), → expande, ← recolhe ou sobe, Esc fecha.
 */

/** Liga a árvore dentro da raiz da ficha. aoEscolher(valor) recebe o id ("" = Nenhum(a)). */
export function ligarArvoreDivindade(raiz, aoEscolher) {
  const combo = raiz?.querySelector(".combo-divindade");
  if (!combo) return;
  const botao = combo.querySelector(".combo-botao");
  const arvore = combo.querySelector(".arvore-divindade");

  const grupos = () => [...arvore.querySelectorAll(":scope > .grupo")];
  const visiveis = () => [...arvore.querySelectorAll("[role='treeitem']")].filter(el => !el.closest("[role='group'][hidden]"));
  const focar = el => {
    for (const item of arvore.querySelectorAll("[role='treeitem']")) item.tabIndex = -1;
    el.tabIndex = 0;
    el.focus();
  };

  const expandir = (grupo, aberto) => {
    grupo.setAttribute("aria-expanded", String(aberto));
    grupo.querySelector("[role='group']").hidden = !aberto;
    grupo.querySelector(".expandir").textContent = aberto ? "[–]" : "[+]";
  };

  const abrir = () => {
    arvore.hidden = false;
    botao.setAttribute("aria-expanded", "true");
    for (const g of grupos()) expandir(g, false);
    const selecionado = arvore.querySelector("[aria-selected='true']") ?? arvore.querySelector("[role='treeitem']");
    const grupo = selecionado.closest(".grupo");
    if (grupo) expandir(grupo, true);
    focar(selecionado);
  };
  const fechar = (devolverFoco = true) => {
    arvore.hidden = true;
    botao.setAttribute("aria-expanded", "false");
    if (devolverFoco) botao.focus();
  };
  const escolher = folha => {
    fechar();
    aoEscolher(folha.dataset.valor ?? "");
  };

  botao.addEventListener("click", ev => {
    ev.preventDefault();
    if (arvore.hidden) abrir(); else fechar();
  });

  arvore.addEventListener("click", ev => {
    const folha = ev.target.closest(".folha");
    if (folha) return escolher(folha);
    const grupo = ev.target.closest(".grupo");
    if (grupo) {
      expandir(grupo, grupo.getAttribute("aria-expanded") !== "true");
      focar(grupo);
    }
  });

  arvore.addEventListener("keydown", ev => {
    const atual = ev.target.closest("[role='treeitem']");
    if (!atual) return;
    const lista = visiveis();
    const i = lista.indexOf(atual);
    const ehGrupo = atual.classList.contains("grupo");
    switch (ev.key) {
      case "ArrowDown": if (i < lista.length - 1) focar(lista[i + 1]); break;
      case "ArrowUp": if (i > 0) focar(lista[i - 1]); break;
      case "ArrowRight":
        if (ehGrupo && atual.getAttribute("aria-expanded") !== "true") expandir(atual, true);
        else if (ehGrupo) focar(atual.querySelector(".folha"));
        break;
      case "ArrowLeft":
        if (ehGrupo && atual.getAttribute("aria-expanded") === "true") expandir(atual, false);
        else if (atual.closest(".grupo") && !ehGrupo) { const g = atual.closest(".grupo"); expandir(g, false); focar(g); }
        break;
      case "Enter":
      case " ":
        if (ehGrupo) expandir(atual, atual.getAttribute("aria-expanded") !== "true");
        else escolher(atual);
        break;
      case "Escape": fechar(); break;
      case "Home": focar(lista[0]); break;
      case "End": focar(lista[lista.length - 1]); break;
      default: return;
    }
    ev.preventDefault();
    ev.stopPropagation();
  });

  // Foco saiu da combobox (clique fora, Tab): fecha. Fica preso aos elementos da ficha,
  // então não acumula ouvintes a cada redesenho.
  combo.addEventListener("focusout", ev => {
    if (!arvore.hidden && !combo.contains(ev.relatedTarget)) fechar(false);
  });
}
