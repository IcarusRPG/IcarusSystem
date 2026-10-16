/**
 * Cálculos derivados do personagem (PersonagemData.prepareDerivedData).
 * Sem dependência do Foundry: recebe o objeto "system" (já com os Efeitos Ativos aplicados)
 * e a lista de itens, e preenche os campos derivados. Os testes usam esta mesma função.
 */
import { ATRIBUTOS, PERICIAS, TIPOS_EQUIPAVEIS, CARGA_BASE, CARGA_POR_FOR, TAMANHO_PACOTE, PERICIAS_PENALIZADAS } from "./config.mjs";
import { totalEmCentavos } from "./moeda.mjs";
import {
  numero, limitar, nivelValido, ehParagon, totalAtributo, bonusTreino, totalPericia,
  maximoPelaClasse, maximoFinal, bonusDeNivel, calcularDefesa, emQuadrados
} from "./regras.mjs";

export function derivarPersonagem(s, itens = []) {
  s.nivel = nivelValido(s.nivel);
  s.paragon = ehParagon(s.nivel);

  // Atributos: Total = Base + Raça + Temp
  for (const k of ATRIBUTOS) {
    const a = s.atributos[k];
    a.total = totalAtributo(a);
  }
  const total = k => (ATRIBUTOS.includes(k) ? s.atributos[k].total : null);

  // PV e PM: fórmula da classe + bônus por nível (poderes) + bônus fixo
  const cc = s.classeConfig;
  const porNivel = bonusDeNivel({
    nivel: s.nivel, bonusPvPorNivel: cc.bonusPvPorNivel, bonusPmPorNivel: cc.bonusPmPorNivel, bonusPmNivelImpar: cc.bonusPmNivelImpar
  });
  s.pv.formula = maximoPelaClasse({ inicial: cc.pvInicial, porNivel: cc.pvPorNivel, atributoTotal: total(cc.pvAtributo), nivel: s.nivel });
  s.pm.formula = maximoPelaClasse({ inicial: cc.pmInicial, porNivel: cc.pmPorNivel, atributoTotal: total(cc.pmAtributo), nivel: s.nivel });
  s.pv.bonusNivel = porNivel.pv;
  s.pm.bonusNivel = porNivel.pm;
  s.pv.max = maximoFinal({ manual: cc.manual, maximoManual: s.pv.max, maximoFormula: s.pv.formula, bonus: cc.bonusPv, bonusNivel: porNivel.pv });
  s.pm.max = maximoFinal({ manual: cc.manual, maximoManual: s.pm.max, maximoFormula: s.pm.formula, bonus: cc.bonusPm, bonusNivel: porNivel.pm });
  s.pv.value = limitar(numero(s.pv.value), 0, s.pv.max);
  s.pm.value = limitar(numero(s.pm.value), 0, s.pm.max);

  // Defesa: Armadura e Escudo vêm dos itens equipados.
  // Penalidade de armadura: soma das penalidades da armadura e do escudo equipados, aplicada como
  // modificador negativo nas perícias de PERICIAS_PENALIZADAS (Acrobacia, Furtividade, Prestidigitação).
  let armadura = 0, escudo = 0;
  const penalidades = [];
  for (const item of itens) {
    if (item.type !== "equipamento") continue;
    const e = item.system;
    if (!e.equipado || !TIPOS_EQUIPAVEIS.includes(e.tipo)) continue;
    if (e.tipo === "armadura") armadura += numero(e.bonusDefesa);
    else escudo += numero(e.bonusDefesa);
    if (numero(e.penalidade) > 0) penalidades.push({ nome: item.name ?? "", valor: numero(e.penalidade) });
  }
  s.defesa.penalidade = penalidades.reduce((soma, p) => soma + p.valor, 0);
  s.defesa.origensPenalidade = penalidades;
  s.defesa.armadura = armadura;
  s.defesa.escudo = escudo;
  s.defesa.total = calcularDefesa({ des: s.atributos.DES.total, armadura, escudo, outros: s.defesa.outros });

  // Perícias: Atributo + Treino + Outros
  for (const p of PERICIAS) {
    const d = s.pericias[p.chave];
    if (!ATRIBUTOS.includes(d.atributo)) d.atributo = p.atributo;
    d.treino = limitar(Math.trunc(numero(d.treino)), 0, 2);
    d.bonusTreino = bonusTreino(d.treino);
    d.penalidadeArmadura = PERICIAS_PENALIZADAS.includes(p.chave) ? s.defesa.penalidade : 0;
    d.total = totalPericia(s.atributos[d.atributo].total, d.treino, d.outros) - d.penalidadeArmadura;
  }

  s.deslocamentoQuadrados = emQuadrados(s.deslocamento);

  // Carga em espaços: armas (espaços × quantidade), munições (1 por pacote de 20) e equipamentos.
  // Sobrecarga ainda não tem efeito definido: só avisa.
  s.carga = {
    capacidade: Math.max(0, CARGA_BASE + CARGA_POR_FOR * s.atributos.FOR.total),
    usado: itens.reduce((soma, item) => soma + espacosDoItem(item), 0)
  };
  s.carga.excedida = s.carga.usado > s.carga.capacidade;

  if (s.moedas) s.moedas.total = totalEmCentavos(s.moedas);
  return s;
}

/** Espaços que um item ocupa na carga. */
export function espacosDoItem(item) {
  const e = item.system ?? {};
  if (item.type === "arma") return numero(e.espacos) * numero(e.quantidade);
  if (item.type === "municao") return Math.ceil(Math.max(0, numero(e.quantidade)) / TAMANHO_PACOTE);
  if (item.type === "equipamento") return numero(e.espacos);
  return 0;
}
