import { OrbState, classifyUtterance } from "./policy.mjs";

/**
 * Máquina de sessão de voz. Sem I/O de rede aqui — só orquestra intents.
 */
export class VoiceSession {
  constructor({
    port,
    speak = async () => {},
    now = () => Date.now(),
    idFactory = () => `wrist-${Math.random().toString(16).slice(2)}`,
    preferDryRun = () => true,
  } = {}) {
    if (!port || typeof port.exchange !== "function") {
      throw new TypeError("VoiceSession exige port.exchange(intent).");
    }
    this.port = port;
    this.speak = speak;
    this.now = now;
    this.idFactory = idFactory;
    this.preferDryRun = preferDryRun;
    this.state = OrbState.SLEEPING;
    this.micEnabled = true;
    this.lastMessage = "MEGATRON Wrist Core em espera.";
    this.listeners = new Set();
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  _emit() {
    const snapshot = Object.freeze({
      state: this.state,
      micEnabled: this.micEnabled,
      message: this.lastMessage,
    });
    for (const fn of this.listeners) fn(snapshot);
  }

  setMic(enabled) {
    this.micEnabled = enabled !== false;
    this.state = this.micEnabled ? OrbState.SLEEPING : OrbState.MIC_OFF;
    this.lastMessage = this.micEnabled
      ? "Microfone habilitado. Clique em Ouvir um comando."
      : "Microfone cortado.";
    this._emit();
  }

  beginListen() {
    if (!this.micEnabled) {
      this.state = OrbState.MIC_OFF;
      this.lastMessage = "Microfone cortado.";
      this._emit();
      return false;
    }
    this.state = OrbState.LISTENING;
    this.lastMessage = "Ouvindo…";
    this._emit();
    return true;
  }

  endListen() {
    if (this.state !== OrbState.LISTENING) return false;
    this.state = this.micEnabled ? OrbState.SLEEPING : OrbState.MIC_OFF;
    this.lastMessage = "Escuta encerrada. Experimente por texto ou clique em Ouvir.";
    this._emit();
    return true;
  }

  async handleTranscript(rawText) {
    if (!this.micEnabled) {
      this.state = OrbState.MIC_OFF;
      this.lastMessage = "Microfone cortado.";
      this._emit();
      return { state: this.state, message: this.lastMessage };
    }

    return this.handleText(rawText);
  }

  async handleText(rawText) {
    const decision = classifyUtterance(rawText);
    if (decision.intent === "empty") {
      this.state = OrbState.SLEEPING;
      this.lastMessage = "Não ouvi nada.";
      this._emit();
      return { state: this.state, message: this.lastMessage };
    }

    if (decision.ok !== true) {
      this.state = OrbState.SPEAKING;
      this.lastMessage = decision.speak;
      this._emit();
      await this.speak(decision.speak);
      this.state = OrbState.SLEEPING;
      this._emit();
      return { state: this.state, message: this.lastMessage, decision };
    }

    if (decision.intent === "awake" || decision.intent === "help" || decision.intent === "cancel") {
      this.state = OrbState.SPEAKING;
      this.lastMessage = decision.speak;
      this._emit();
      await this.speak(decision.speak);
      this.state =
        decision.intent === "awake" ? OrbState.LISTENING : OrbState.SLEEPING;
      this._emit();
      return { state: this.state, message: this.lastMessage, decision };
    }

    this.state = OrbState.THINKING;
    this.lastMessage = "Pensando…";
    this._emit();

    try {
      let raw;
      if (decision.intent === "status") {
        raw = await this.port.exchange({ kind: "status" });
      } else if (decision.intent === "queue") {
        raw = await this.port.exchange({ kind: "queue" });
      } else if (decision.intent === "enqueue") {
        const dryRun = this.preferDryRun() !== false;
        raw = await this.port.exchange({
          kind: "enqueue",
          text: decision.text,
          dryRun,
          requestId: String(this.idFactory()),
        });
      } else {
        throw new Error("Intent sem handler.");
      }

      if (
        !raw ||
        raw.ok !== true ||
        raw.external_actions !== false ||
        typeof raw.message !== "string"
      ) {
        throw new Error("Contrato do gateway inválido.");
      }

      const message = raw.message.slice(0, 160);
      const awaiting =
        decision.intent === "enqueue" &&
        raw.dry_run !== true &&
        raw.queued === true &&
        raw.status === "waiting_approval";

      this.state = OrbState.SPEAKING;
      this.lastMessage = message;
      this._emit();
      await this.speak(message);
      this.state = awaiting ? OrbState.AWAITING_APPROVAL : OrbState.SLEEPING;
      if (awaiting) {
        this.lastMessage = `${message} · pendência simulada`;
      }
      this._emit();
      return { state: this.state, message: this.lastMessage, decision, raw };
    } catch (_error) {
      this.state = OrbState.OFFLINE;
      this.lastMessage = "MEGATRON indisponível. Nenhuma ação foi executada.";
      this._emit();
      await this.speak(this.lastMessage);
      this.state = OrbState.SLEEPING;
      this._emit();
      return { state: this.state, message: this.lastMessage, decision };
    }
  }
}

/** Port de demonstração — zero rede. */
export class DemoMegatronPort {
  constructor({ queueCount = 3 } = {}) {
    this.queueCount = queueCount;
    this.enqueued = 0;
  }

  async exchange(intent) {
    if (intent.kind === "status") {
      return {
        ok: true,
        live: true,
        external_actions: false,
        message: "MEGATRON online · demo local · ações externas off",
      };
    }
    if (intent.kind === "queue") {
      return {
        ok: true,
        live: true,
        external_actions: false,
        message: `Fila demo: ${this.queueCount + this.enqueued} aguardando aprovação`,
      };
    }
    if (intent.kind === "enqueue") {
      if (intent.dryRun) {
        return {
          ok: true,
          live: true,
          external_actions: false,
          requires_human_approval: true,
          dry_run: true,
          queued: false,
          message: "DRY-RUN: nada foi criado",
        };
      }
      this.enqueued += 1;
      return {
        ok: true,
        live: true,
        external_actions: false,
        requires_human_approval: true,
        dry_run: false,
        queued: true,
        status: "waiting_approval",
        message: "Pendência registrada · waiting_approval",
      };
    }
    throw new Error("Intent desconhecida no demo.");
  }
}
