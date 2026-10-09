import test from "node:test";
import assert from "node:assert/strict";
import { OrbState } from "../src/policy.mjs";
import { DemoMegatronPort, VoiceSession } from "../src/session.mjs";

function makeSession(overrides = {}) {
  const spoken = [];
  const session = new VoiceSession({
    port: new DemoMegatronPort(),
    speak: async (text) => {
      spoken.push(text);
    },
    preferDryRun: () => true,
    idFactory: () => "req-1",
    ...overrides,
  });
  return { session, spoken };
}

test("status demo muda estados e fala", async () => {
  const { session, spoken } = makeSession();
  const result = await session.handleTranscript("ok megatron status");
  assert.equal(result.decision.intent, "status");
  assert.match(spoken[0], /MEGATRON online/i);
  assert.equal(session.state, OrbState.SLEEPING);
});

test("forbidden nao chama enqueue", async () => {
  let calls = 0;
  const port = {
    async exchange() {
      calls += 1;
      return { ok: true, external_actions: false, message: "x", live: true };
    },
  };
  const { session } = makeSession({ port });
  await session.handleTranscript("aprovar card agora");
  assert.equal(calls, 0);
  assert.equal(session.state, OrbState.SLEEPING);
});

test("enqueue dry-run nao aguarda aprovacao", async () => {
  const { session } = makeSession({ preferDryRun: () => true });
  const result = await session.handleTranscript("anota revisar texto demo");
  assert.equal(result.raw.queued, false);
  assert.equal(session.state, OrbState.SLEEPING);
});

test("enqueue real vai para awaiting_approval", async () => {
  const { session } = makeSession({ preferDryRun: () => false });
  await session.handleTranscript("anota revisar texto demo");
  assert.equal(session.state, OrbState.AWAITING_APPROVAL);
});

test("mic off bloqueia escuta", () => {
  const { session } = makeSession();
  session.setMic(false);
  assert.equal(session.beginListen(), false);
  assert.equal(session.state, OrbState.MIC_OFF);
});
