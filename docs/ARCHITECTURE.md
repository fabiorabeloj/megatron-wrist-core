# Architecture
## Data flow
```text
Typed command / optional browser transcript
    -> VoiceSession
    -> classifyUtterance
    -> DemoMegatronPort
    -> session snapshot
    -> text response + visual orb
```

- `policy.mjs`: normalization and a deliberately limited phrase classifier.
- `session.mjs`: session states and adapter response validation.
- `DemoMegatronPort`: synthetic status and in-memory pending-note count.
- `orb.mjs`: visual state labels.
- `app.mjs`: DOM events, serialized requests, optional speech input.
- `serve_local.py`: serves an explicit allowlist of assets on IPv4 loopback.

Text processing uses `handleText`, independently of microphone capture. `handleTranscript` still checks the microphone flag. Explicit note commands take priority over words such as status/fila inside their payload.

The application includes no network adapter. Optional speech recognition is implemented by the browser and can involve its vendor's remote service.

## Boundaries
This prototype is not an execution or authorization system. Rejecting a phrase in the UI does not authorize a real action elsewhere. A future integration requires authentication, server-side policy enforcement, durable approval records, and idempotency designed and tested separately.

The static server only serves the app's listed HTML, CSS and module files. Source documentation, hidden Git files and former `/api/watch/` routes are not served.

## Known limitations
Limited natural-language grammar, Portuguese-only commands, vendor-dependent speech support, in-memory data, and no formal state-machine verification. Unit and HTTP tests do not establish production readiness.
