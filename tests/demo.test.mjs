import test from "node:test";
import assert from "node:assert/strict";
import { DemoMegatronPort, VoiceSession } from "../src/session.mjs";

test("typed commands work with microphone disabled, while voice stays blocked", async () => {
  let calls = 0;
  const demo = new DemoMegatronPort();
  const session = new VoiceSession({
    port: { exchange: async (intent) => { calls++; return demo.exchange(intent); } },
  });
  session.setMic(false);
  await session.handleTranscript("status");
  assert.equal(calls, 0);
  const result = await session.handleText("status");
  assert.equal(calls, 1);
  assert.equal(result.decision.intent, "status");
  assert.equal(result.raw.external_actions, false);
});

test("dry-run preserves the queue; a simulated note changes its count", async () => {
  const port = new DemoMegatronPort();
  await port.exchange({kind: "enqueue", text: "revisar documentação", dryRun: true});
  assert.match((await port.exchange({kind: "queue"})).message, /3 aguardando/);
  await port.exchange({kind: "enqueue", text: "revisar documentação", dryRun: false});
  assert.match((await port.exchange({kind: "queue"})).message, /4 aguardando/);
});

test("invalid gateway contracts never become successful session results", async () => {
  const session = new VoiceSession({
    port: {exchange: async () => ({ok: true, external_actions: true, message: "unsafe"})},
  });
  const result = await session.handleText("status");
  assert.equal(result.raw, undefined);
  assert.match(result.message, /indisponível/);
});

test("enqueue does not report approval unless every approval field matches", async () => {
  for (const invalid of [
    {dry_run: false, queued: true, status: "approved"},
    {dry_run: true, queued: true, status: "waiting_approval"},
  ]) {
    const session = new VoiceSession({
      preferDryRun: () => false,
      port: {exchange: async () => ({
        ok: true, external_actions: false, message: "draft", ...invalid,
      })},
    });
    const result = await session.handleText("anota revisar documentação");
    assert.notEqual(result.state, "awaiting_approval");
  }
});

test("explicit draft payloads containing status or queue stay drafts", async () => {
  const session = new VoiceSession({port: new DemoMegatronPort()});
  for (const text of ["anota revisar status do projeto", "anota conferir fila amanhã"]) {
    const result = await session.handleText(text);
    assert.equal(result.decision.intent, "enqueue");
    assert.equal(result.raw.dry_run, true);
    assert.equal(result.raw.queued, false);
  }
});

test("too-short and too-long drafts are rejected before the adapter is called", async () => {
  let calls = 0;
  const session = new VoiceSession({
    preferDryRun: () => false,
    port: {exchange: async () => { calls++; throw new Error("should not be called"); }},
  });
  for (const text of ["anota a", "anota " + "x".repeat(501)]) {
    const result = await session.handleText(text);
    assert.equal(result.decision.ok, false);
    assert.equal(result.raw, undefined);
  }
  assert.equal(calls, 0);
});


test("ending capture without a transcript clears the listening state", () => {
  const session = new VoiceSession({port: new DemoMegatronPort()});
  session.beginListen();
  assert.equal(session.state, "listening");
  assert.equal(session.endListen(), true);
  assert.equal(session.state, "sleeping");
});

test("ending capture preserves a completed simulated pending response", async () => {
  const session = new VoiceSession({
    port: new DemoMegatronPort(), preferDryRun: () => false,
  });
  await session.handleText("anota revisar documentação");
  const message = session.lastMessage;
  assert.equal(session.endListen(), false);
  assert.equal(session.state, "awaiting_approval");
  assert.equal(session.lastMessage, message);
});
