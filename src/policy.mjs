/**
 * Política fail-closed da voz do Wrist Core.
 * Nunca autoriza ação efetiva; enqueue só vira waiting_approval no gateway.
 */

const WAKE_PHRASES = [
  "ok megatron",
  "okay megatron",
  "oi megatron",
  "ei megatron",
  "hey megatron",
  "fala megatron",
];

const FORBIDDEN = [
  /\baprov(a|ar|e|ação|acao)\b/i,
  /\brejeit(a|ar|e)\b/i,
  /\bautoriz(a|ar|e)\b/i,
  /\bexecut(a|ar|e)\b/i,
  /\benvi(a|ar|e)\b/i,
  /\bpublic(a|ar|e)\b/i,
  /\bpag(a|ar|ue)\b/i,
  /\bcompr(a|ar|e)\b/i,
  /\bdeploy\b/i,
  /\bpush\b/i,
  /\bwhatsapp\b/i,
  /\boutbox\b/i,
  /\btoken\b/i,
  /\bsenha\b/i,
  /\bcpf\b/i,
  /https?:\/\//i,
  /\bghp_[a-z0-9]+\b/i,
  /\bsk-[a-z0-9]+\b/i,
];

const CANCEL = /^(cancela|cancelar|para|parar|esquece|chega|stop|quieto)\b/i;
const HELP = /^(ajuda|help|o que (voce|você) (faz|pode)|comandos)\b/i;
const STATUS =
  /\b(status|como (esta|está)|esta vivo|está vivo|online|saude|saúde)\b/i;
const QUEUE = /\b(fila|pendente|pendencias|pendências|o que tem|cards?)\b/i;
const ENQUEUE =
  /^(anota|anotar|registra|registrar|cria tarefa|criar tarefa|lembra|lembrar|captura|capturar)\b/i;

function normalize(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function stripWake(text) {
  let value = normalize(text);
  for (const phrase of WAKE_PHRASES) {
    if (value.startsWith(phrase)) {
      value = value.slice(phrase.length).replace(/^[,.\s]+/, "");
      break;
    }
  }
  return value;
}

export function isWakePhrase(text) {
  const value = normalize(text);
  return WAKE_PHRASES.some(
    (phrase) => value === phrase || value.startsWith(`${phrase} `),
  );
}

export function classifyUtterance(rawText) {
  const full = normalize(rawText);
  if (!full) {
    return { intent: "empty", ok: false, reason: "empty", text: "" };
  }

  for (const pattern of FORBIDDEN) {
    if (pattern.test(full)) {
      return {
        intent: "forbidden",
        ok: false,
        reason: "action_not_allowed",
        text: full,
        speak:
          "Negado. Esta demo não aprova, envia ou executa tarefas.",
      };
    }
  }

  const text = stripWake(full);
  if (!text) {
    return {
      intent: "awake",
      ok: true,
      reason: "listening",
      text: "",
      speak: "Estou ouvindo.",
    };
  }

  if (CANCEL.test(text)) {
    return {
      intent: "cancel",
      ok: true,
      reason: "cancelled",
      text,
      speak: "Ok, cancelei.",
    };
  }

  if (HELP.test(text)) {
    return {
      intent: "help",
      ok: true,
      reason: "help",
      text,
      speak:
        "Posso mostrar o status simulado, ler a fila demo ou anotar uma pendência na simulação.",
    };
  }

  if (ENQUEUE.test(text)) {
    const payload = text
      .replace(ENQUEUE, "")
      .replace(/^[:\-,\s]+/, "")
      .trim();
    if (payload.length < 4) {
      return {
        intent: "enqueue",
        ok: false,
        reason: "draft_too_short",
        text,
        speak: "Diga o que devo anotar, com pelo menos quatro letras.",
      };
    }
    if (payload.length > 500) {
      return {
        intent: "enqueue",
        ok: false,
        reason: "draft_too_long",
        text,
        speak: "Texto longo demais para o pulso. Encurte e tente de novo.",
      };
    }
    return {
      intent: "enqueue",
      ok: true,
      reason: "enqueue",
      text: payload,
      dryRunPreferred: true,
    };
  }

  if (STATUS.test(text)) {
    return { intent: "status", ok: true, reason: "status", text };
  }

  if (QUEUE.test(text)) {
    return { intent: "queue", ok: true, reason: "queue", text };
  }

  return {
    intent: "unknown",
    ok: false,
    reason: "unknown_intent",
    text,
    speak:
      "Não entendi. Peça status, fila, ou diga anota seguido do texto da pendência.",
  };
}

export const OrbState = Object.freeze({
  SLEEPING: "sleeping",
  LISTENING: "listening",
  THINKING: "thinking",
  SPEAKING: "speaking",
  AWAITING_APPROVAL: "awaiting_approval",
  OFFLINE: "offline",
  ERROR: "error",
  MIC_OFF: "mic_off",
});
