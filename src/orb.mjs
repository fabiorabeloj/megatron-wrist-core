import { OrbState } from "./policy.mjs";

const LABELS = {
  [OrbState.SLEEPING]: "DORMINDO",
  [OrbState.LISTENING]: "OUVINDO",
  [OrbState.THINKING]: "PENSANDO",
  [OrbState.SPEAKING]: "FALANDO",
  [OrbState.AWAITING_APPROVAL]: "AGUARDA VOCÊ",
  [OrbState.OFFLINE]: "OFFLINE",
  [OrbState.ERROR]: "ERRO",
  [OrbState.MIC_OFF]: "MIC OFF",
};

export function applyOrbState(root, state) {
  if (!root) return;
  const next = LABELS[state] ? state : OrbState.ERROR;
  root.dataset.state = next;
  const label = root.querySelector("[data-orb-label]");
  if (label) label.textContent = LABELS[next] || "ERRO";
}

export { LABELS };
