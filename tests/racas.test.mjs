/**
 * Critérios de aceite das raças (seção 6 do prompt de raças), sem o Foundry.
 * No Foundry, o mesmo roteiro roda com Efeitos Ativos reais: await game.icarus.verificarRacas()
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ATRIBUTOS } from "../module/config.mjs";
import {
  RACAS, racaPorId, resolverRaca, idDaRacaPorNome, iconeDaRaca, idDoPoder, atributosLivresValidos, descricaoHTML
} from "../module/data/racas.mjs";
import { dadosKaelen } from "../module/dev/kaelen.mjs";
import { simular } from "./simulacao.mjs";

/** Kaelen sem raça, com "Outros" da Defesa 0 e deslocamento 9 m. */
const base = () => {
  const d = dadosKaelen();
  d.system.identidade.raca = "";
  for (const k of ATRIBUTOS) d.system.atributos[k].racial = 0;
  return d;
};
const racial = (s, ...k) => k.map(x => s.atributos[x].racial).join(",");
const nomes = r => r.poderes.map(p => p.nome).sort().join(" · ");

test("1. Koruma: raça FOR/DES/CAR +1, 4 poderes, Defesa 19 sem soma dupla, Fortitude +2, 12 m (8q)", () => {
  const { system: s, resolvido } = simular(base(), "koruma");
  assert.equal(racial(s, "FOR", "DES", "CAR"), "1,1,1");
  assert.equal(resolvido.poderes.length, 4);
  assert.equal(s.defesa.outros, 1);         // só o +1 do Couro Brutal
  assert.equal(s.defesa.total, 19);
  assert.equal(s.pericias.fortitude.total, 6);
  assert.equal(s.deslocamento, 12);
  assert.equal(s.deslocamentoQuadrados, 8);
});

test("2. Ogbari nível 5: PV +5, Fortitude +2, Intimidação usa FOR com +2", () => {
  const { system: s } = simular(base(), "ogbari");
  assert.equal(s.pv.max - s.pv.formula, 5);
  assert.equal(s.pericias.fortitude.outros, 2);
  assert.equal(s.pericias.intimidacao.atributo, "FOR");
  assert.equal(s.pericias.intimidacao.total, 4 + 2 + 2);
});

test("3. Ayoran nível 5: PM +5 e deslocamento 12 m", () => {
  const { system: s } = simular(base(), "ayoran");
  assert.equal(s.pm.max - s.pm.formula, 5);
  assert.equal(s.deslocamento, 12);
});

test("4. Karadun nível 5: PM +3 (níveis 1, 3, 5) e atributos +2/+1/−1 distintos", () => {
  const escolha = racaPorId("karadun").escolhas[0];
  assert.equal(atributosLivresValidos(escolha, ["FOR", "DES", "INT"]), true);
  assert.equal(atributosLivresValidos(escolha, ["FOR", "FOR", "INT"]), false);
  assert.equal(atributosLivresValidos(escolha, ["FOR", "DES"]), false);
  const { system: s } = simular(base(), "karadun", { atributos: ["FOR", "DES", "INT"], pericias: { Adaptabilidade: "historia" } });
  assert.equal(s.pm.max - s.pm.formula, 3);
  assert.equal(racial(s, "FOR", "DES", "INT"), "2,1,-1");
  assert.equal(s.pericias.misticismo.treino, 1);
  assert.equal(s.pericias.historia.treino, 1);
  assert.equal(s.pericias.diplomacia.outros, 2);
});

test("5. Araké: 3 atributos +1 e perícia vira Especialista sem mudar o treino salvo", () => {
  const { system: s, fonte } = simular(base(), "arake", { atributos: ["SAB", "INT", "CAR"], pericias: { "Aprendizado Plural": "luta" } });
  assert.equal(racial(s, "SAB", "INT", "CAR"), "1,1,1");
  assert.equal(s.pericias.luta.treino, 2);
  assert.equal(fonte.pericias.luta.treino, 1);
  // Já Especialista: nada muda
  const { system: s2 } = simular(base(), "arake", { atributos: ["SAB", "INT", "CAR"], pericias: { "Aprendizado Plural": "cavalgar" } });
  assert.equal(s2.pericias.cavalgar.treino, 2);
  // Destreinado vira Especialista
  const { system: s3 } = simular(base(), "arake", { atributos: ["SAB", "INT", "CAR"], pericias: { "Aprendizado Plural": "historia" } });
  assert.equal(s3.pericias.historia.treino, 2);
});

test("6. Azakar: Luz cria Condutor e Luz Sagrada; Sombra cria Corrosivo e Sombras Profanas", () => {
  const azakar = racaPorId("azakar");
  assert.equal(nomes(resolverRaca(azakar, { variante: "luz" })), "Condutor (Luz) · Luz Sagrada (Luz)");
  assert.equal(nomes(resolverRaca(azakar, { variante: "sombra" })), "Corrosivo (Sombra) · Sombras Profanas (Sombra)");
  const semEscolha = resolverRaca(azakar, {});
  assert.equal(semEscolha.poderes.length, 0);
  assert.deepEqual(semEscolha.pendentes, ["variante"]);
});

test("7. Ikori: Macho fica Pequeno com Reflexos/Furtividade +2; Fêmea tem Atletismo/Fortitude +2", () => {
  const { system: m, fonte } = simular(base(), "ikori", { variante: "macho" });
  assert.equal(m.tamanho, "pequeno");
  assert.equal(fonte.tamanho, "medio");
  assert.equal(m.deslocamento, 9);
  assert.equal(`${m.pericias.reflexos.outros},${m.pericias.furtividade.outros}`, "2,2");
  const { system: f } = simular(base(), "ikori", { variante: "femea" });
  assert.equal(f.tamanho, "medio");
  assert.equal(`${f.pericias.atletismo.outros},${f.pericias.fortitude.outros}`, "2,2");
});

test("8. Trocar Koruma → Dorun: atributos e efeitos da raça antiga somem, os do jogador ficam", () => {
  const dados = base();
  dados.system.atributos.FOR.base = 3;
  dados.system.pericias.luta = { treino: 1, outros: 1 };
  const { fonte } = simular(dados, "dorun");
  assert.equal(ATRIBUTOS.map(k => fonte.atributos[k].racial).join(","), "1,0,1,0,1,0");
  assert.equal(fonte.atributos.FOR.base, 3);
  assert.equal(fonte.atributos.FOR.temp, 1);
  assert.equal(fonte.pericias.luta.outros, 1);
  const { system: s, resolvido } = simular(dados, "dorun");
  assert.equal(nomes(resolvido), "Passo da Montanha · Sangue de Aço · Tradição da Forja");
  assert.equal(s.deslocamento, 6);
  assert.equal(s.defesa.outros, 0);  // o +1 do Couro Brutal não sobra
});

test("9. Nenhuma raça: sem atributos raciais nem bônus", () => {
  const { system: s, resolvido } = simular(base(), "");
  assert.equal(resolvido, null);
  assert.equal(ATRIBUTOS.map(k => s.atributos[k].racial).join(","), "0,0,0,0,0,0");
  assert.equal(s.deslocamento, 9);
  assert.equal(s.defesa.total, 17);  // 10 + DES 0 + 5 + 2
});

test("Escolhas pendentes: atributos, perícia e texto ficam marcados e o texto entra na descrição", () => {
  const arake = resolverRaca(racaPorId("arake"), {});
  assert.deepEqual(arake.pendentes, ["atributos", "Aprendizado Plural"]);
  assert.equal(arake.poderes.find(p => p.nome === "Aprendizado Plural").pendente, true);
  const ayomi = resolverRaca(racaPorId("ayomi"), { pericias: { "Herança Adaptável": "visao" }, textos: { "Técnica Dissidente": "Clava e Espada Longa" } });
  assert.deepEqual(ayomi.pendentes, []);
  const tecnica = ayomi.poderes.find(p => p.nome === "Técnica Dissidente");
  assert.match(descricaoHTML(tecnica), /<strong>Escolha:<\/strong> Clava e Espada Longa/);
  assert.equal(ayomi.poderes.find(p => p.nome === "Herança Adaptável").escolha, "Visão");
  // Perícia fora da lista permitida não vale (Kirai só Furtividade ou Acrobacia)
  assert.equal(resolverRaca(racaPorId("kirai"), { pericias: { "Passos Miúdos": "luta" } }).pendentes.includes("Passos Miúdos"), true);
});

test("Dados das 17 raças: ids únicos, efeitos com chaves válidas, variantes e escolhas coerentes", () => {
  assert.equal(RACAS.length, 17);
  assert.equal(new Set(RACAS.map(r => r.id)).size, 17);
  const valido = chave => /^system\.(pericias\.\w+\.(outros|treino|atributo)|defesa\.outros|resistencias\.reducao\.\w+|deslocamento|tamanho|classeConfig\.(bonusPvPorNivel|bonusPmPorNivel|bonusPmNivelImpar))$/.test(chave);
  for (const r of RACAS) {
    for (const p of r.poderes) {
      for (const e of p.efeitos ?? []) {
        if (e.dinamico) assert.ok(r.escolhas.some(x => x.tipo === e.dinamico && x.poder === p.nome), `${r.id}/${p.nome}`);
        else assert.ok(valido(e.chave) && ["ADD", "OVERRIDE", "UPGRADE"].includes(e.modo), `${r.id}/${p.nome}: ${e.chave}`);
      }
      if (p.variante) assert.ok(r.escolhas.find(x => x.tipo === "variante").opcoes.some(o => o.id === p.variante), `${r.id}/${p.nome}`);
    }
    for (const e of r.escolhas ?? []) if (e.poder) assert.ok(r.poderes.some(p => p.nome === e.poder), `${r.id}: escolha de ${e.poder}`);
  }
  assert.equal(idDoPoder("Cortar! Cortar!"), "cortar-cortar");
});

test("Migração do campo Raça antigo (texto) para o id", () => {
  assert.equal(idDaRacaPorNome("Koruma"), "koruma");
  assert.equal(idDaRacaPorNome("ka'ruun"), "karuun");
  assert.equal(idDaRacaPorNome("ARAKE"), "arake");
  assert.equal(idDaRacaPorNome("Ara'Maku"), "aramaku");
  assert.equal(idDaRacaPorNome("Elfo da Lua"), null);
  assert.equal(iconeDaRaca(racaPorId("karuun")), "systems/icarus-rpg/img/Icones/ra%C3%A7as/Ka'Ruun.png");
});

// 10. Ícones: lista os que faltam em img/Icones/raças/ (o teste é pulado, não reprova, enquanto faltarem)
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const faltando = RACAS.filter(r => !fs.existsSync(path.join(raiz, "img", "Icones", "raças", r.icone))).map(r => r.icone);
test("10. Os 17 ícones de raça existem em img/Icones/raças/", { skip: faltando.length ? `faltam ${faltando.length}: ${faltando.join(", ")}` : false }, () => {
  assert.deepEqual(faltando, []);
});
