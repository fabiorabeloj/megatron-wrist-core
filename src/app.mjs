import { applyOrbState } from "./orb.mjs";
import { DemoMegatronPort, VoiceSession } from "./session.mjs";

const orb = document.querySelector("#orb");
const transcriptEl = document.querySelector("#transcript");
const replyEl = document.querySelector("#reply");
const micToggle = document.querySelector("#mic-toggle");
const listenBtn = document.querySelector("#listen");
const hintEl = document.querySelector("#hint");
const commandInput = document.querySelector("#command");
const submitBtn = document.querySelector("#send-command");
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition = null;
let busy = false;
const session = new VoiceSession({
  port: new DemoMegatronPort(),
  preferDryRun: () => document.querySelector("#dry-run").checked,
  idFactory: () => crypto.randomUUID(),
});

session.setMic(false);
session.onChange((snap) => {
  applyOrbState(orb, snap.state);
  replyEl.textContent = snap.message;
});
applyOrbState(orb, session.state);
replyEl.textContent = session.lastMessage;

function updateControls() {
  submitBtn.disabled = busy;
  listenBtn.disabled = busy || !micToggle.checked || !SpeechRecognition;
}

async function consume(text, fromVoice = false) {
  if (busy) return;
  busy = true;
  updateControls();
  transcriptEl.textContent = text || "—";
  try {
    if (fromVoice) await session.handleTranscript(text);
    else await session.handleText(text);
  } finally {
    busy = false;
    updateControls();
  }
}

document.querySelector("#command-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (recognition) return;
  const text = commandInput.value.trim();
  if (text) await consume(text);
});

micToggle.addEventListener("change", () => {
  session.setMic(micToggle.checked);
  if (!micToggle.checked && recognition) recognition.abort();
  hintEl.textContent = micToggle.checked
    ? "Clique em Ouvir e diga um comando. O reconhecimento pode usar a rede do navegador."
    : "Microfone desligado. Experimente por texto.";
  updateControls();
});

listenBtn.addEventListener("click", () => {
  if (recognition || busy || !micToggle.checked || !SpeechRecognition) return;
  const rec = new SpeechRecognition();
  recognition = rec;
  rec.lang = "pt-BR";
  rec.interimResults = false;
  rec.continuous = false;
  rec.onresult = (event) => {
    if (!micToggle.checked) return;
    consume(event.results[0][0].transcript, true);
  };
  rec.onerror = () => {
    session.endListen();
    replyEl.textContent = "Não foi possível reconhecer a voz. Experimente por texto.";
  };
  rec.onend = () => {
    session.endListen();
    recognition = null;
    submitBtn.disabled = busy;
    updateControls();
  };
  try {
    rec.start();
    session.beginListen();
    submitBtn.disabled = true;
  } catch {
    recognition = null;
    replyEl.textContent = "Não foi possível iniciar o microfone. Experimente por texto.";
    updateControls();
  }
});

window.addEventListener("pagehide", () => {
  if (recognition) recognition.abort();
});
if (!SpeechRecognition) {
  micToggle.disabled = true;
  hintEl.textContent = "Reconhecimento de voz indisponível neste navegador. Use os comandos por texto.";
}
updateControls();
