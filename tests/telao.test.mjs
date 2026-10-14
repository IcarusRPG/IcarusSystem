/** Telão: reconhecer links e calcular a sincronia. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  idDoYoutube, inicioDoYoutube, fonteDoTexto, mesmaFonte, tempoAlvo, precisaAjustar, formatarTempo
} from "../module/telao/midia.mjs";

test("Links do YouTube em todos os formatos", () => {
  const id = "dQw4w9WgXcQ";
  for (const link of [
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtube.com/watch?v=${id}&list=PL123&index=2`,
    `https://youtu.be/${id}?si=abc`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/embed/${id}`,
    `https://m.youtube.com/watch?v=${id}`,
    `https://www.youtube.com/live/${id}`,
    `youtube.com/watch?v=${id}`,
    id
  ]) assert.equal(idDoYoutube(link), id, link);
  assert.equal(idDoYoutube("https://vimeo.com/123"), null);
  assert.equal(idDoYoutube("https://www.youtube.com/watch?v=curto"), null);
  assert.equal(idDoYoutube(""), null);
});

test("Início do vídeo indicado no link", () => {
  assert.equal(inicioDoYoutube("https://youtu.be/dQw4w9WgXcQ?t=90"), 90);
  assert.equal(inicioDoYoutube("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s"), 90);
  assert.equal(inicioDoYoutube("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1h2m3s"), 3723);
  assert.equal(inicioDoYoutube("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), 0);
});

test("Fonte: YouTube, arquivo de vídeo ou nada", () => {
  assert.deepEqual(fonteDoTexto("https://youtu.be/dQw4w9WgXcQ?t=5"), { tipo: "youtube", id: "dQw4w9WgXcQ", inicio: 5 });
  assert.deepEqual(fonteDoTexto("worlds/icarus/videos/Abertura%20da%20Campanha.mp4"), { tipo: "arquivo", url: "worlds/icarus/videos/Abertura%20da%20Campanha.mp4" });
  assert.deepEqual(fonteDoTexto("https://exemplo.com/cena.webm?x=1"), { tipo: "arquivo", url: "https://exemplo.com/cena.webm?x=1" });
  assert.equal(fonteDoTexto("https://exemplo.com/pagina.html"), null);
  assert.equal(fonteDoTexto("   "), null);
  assert.equal(mesmaFonte({ tipo: "youtube", id: "a" }, { tipo: "youtube", id: "a", inicio: 3 }), true);
  assert.equal(mesmaFonte({ tipo: "arquivo", url: "x.mp4" }, { tipo: "youtube", id: "x" }), false);
});

test("Sincronia: tocando avança com o relógio do servidor; pausado fica parado", () => {
  assert.equal(tempoAlvo({ tocando: true, tempo: 10, quando: 1_000_000 }, 1_004_500), 14.5);
  assert.equal(tempoAlvo({ tocando: false, tempo: 10, quando: 1_000_000 }, 1_004_500), 10);
  assert.equal(tempoAlvo({ tocando: true, tempo: 10, quando: 1_000_000 }, 999_000), 10);
  assert.equal(tempoAlvo(null, 5), 0);
  assert.equal(precisaAjustar(14, 14.5), false);
  assert.equal(precisaAjustar(12, 14.5), true);
});

test("Tempo formatado", () => {
  assert.equal(formatarTempo(65), "1:05");
  assert.equal(formatarTempo(3725), "1:02:05");
  assert.equal(formatarTempo(-3), "0:00");
});
