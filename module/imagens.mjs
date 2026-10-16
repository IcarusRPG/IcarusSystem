/**
 * Imagens fixas da interface (atalhos do Mestre e telas dos testes).
 * Caminhos relativos a img/Icones/. Têm espaço e acento: sempre passar por imagemDoSistema().
 * O build (tools/build-packs.mjs) confere se cada arquivo existe; no Foundry, o Mestre recebe
 * um aviso no console se algum faltar, e a interface usa o dado azul no lugar.
 */
import { SISTEMA_ID, ICONE_PADRAO } from "./config.mjs";

export const IMAGENS_SISTEMA = {
  monitor: "system/Monitor.png",
  condicoes: "system/Condições.png",
  testeOposto: "system/Teste Oposto.png",
  testeResistencia: "system/Teste de Resistência.png",
  dadoVermelho: "default/Dado Vermelho 500x500.png",
  dadoAzul: "default/Dado Azul 500x500.png"
};

/** URL (já codificada) de uma imagem do sistema pela chave. */
export const imagemDoSistema = chave => encodeURI(`systems/${SISTEMA_ID}/img/Icones/${IMAGENS_SISTEMA[chave]}`);

/** Chaves cujos arquivos não responderam no servidor (preenchido por verificarImagensDoSistema). */
const ausentes = new Set();

/** URL da imagem, ou o dado azul se o arquivo não foi encontrado no servidor. */
export const imagemOuPadrao = chave => (ausentes.has(chave) ? ICONE_PADRAO : imagemDoSistema(chave));

/** Confere no servidor se as imagens existem; avisa no console as que faltarem. */
export async function verificarImagensDoSistema() {
  const resultados = await Promise.all(Object.keys(IMAGENS_SISTEMA).map(async chave => {
    const ok = await fetch(imagemDoSistema(chave), { method: "HEAD" }).then(r => r.ok).catch(() => false);
    if (!ok) ausentes.add(chave);
    return ok ? null : `img/Icones/${IMAGENS_SISTEMA[chave]}`;
  }));
  const faltando = resultados.filter(Boolean);
  if (faltando.length) console.warn(`Icarus RPG | Imagens da interface não encontradas (usando o dado azul): ${faltando.join(", ")}`);
  return faltando;
}
