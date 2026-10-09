import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyUtterance,
  isWakePhrase,
  stripWake,
} from "../src/policy.mjs";

test("reconhece wake phrases", () => {
  assert.equal(isWakePhrase("OK Megatron"), true);
  assert.equal(isWakePhrase("ei megatron status"), true);
  assert.equal(isWakePhrase("bom dia"), false);
});

test("stripWake remove prefixo", () => {
  assert.equal(stripWake("OK Megatron, status"), "status");
});

test("status e fila", () => {
  assert.equal(classifyUtterance("ok megatron status").intent, "status");
  assert.equal(classifyUtterance("fila").intent, "queue");
});

test("enqueue extrai texto", () => {
  const d = classifyUtterance("anota revisar proposta Facility");
  assert.equal(d.ok, true);
  assert.equal(d.intent, "enqueue");
  assert.equal(d.text, "revisar proposta facility");
});

test("proibe aprovar no meio da frase", () => {
  const d = classifyUtterance("pode aprovar isso agora");
  assert.equal(d.ok, false);
  assert.equal(d.intent, "forbidden");
  assert.equal(d.reason, "action_not_allowed");
});

test("proibe token e url", () => {
  assert.equal(classifyUtterance("mostra o token").intent, "forbidden");
  assert.equal(
    classifyUtterance("abre https://evil.example").intent,
    "forbidden",
  );
});

test("proibe enviar e deploy", () => {
  assert.equal(classifyUtterance("enviar mensagem").intent, "forbidden");
  assert.equal(classifyUtterance("faz o deploy").intent, "forbidden");
});
