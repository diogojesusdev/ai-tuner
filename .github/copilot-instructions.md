# AI Tuner - Copilot Instructions

## Project Summary
AI Tuner is a transparent, voice-activated in-game overlay for racing games (Forza Horizon 6 first). It's a split-stack app: Python handles hardware I/O (UDP telemetry, audio, hotkeys) and Electron+React handles the UI overlay and Gemini AI calls.

## Architecture

### Communication Flow
```
Game (UDP:5300) → Python Backend → WebSocket (ws://127.0.0.1:8765) → Electron Main → React Renderer
                                 ← PLAY_AUDIO, GET_TELEMETRY_SUMMARY ←
```

### Key Design Decisions
- **Python does NOT call Gemini** — only Electron's main process talks to the AI via `@google/genai` SDK
- **WebSocket is the only bridge** between Python and Electron (no HTTP, no IPC pipes)
- **Always-on-top interactive window** — Electron uses a compact 500×700 panel with `alwaysOnTop: true` at `floating` level. No click-through; always interactive. Game should be in borderless windowed mode.
- **Structured JSON output** — Gemini is forced to respond with `{ "reply": string, "pending_changes": array }` via `responseMimeType: 'application/json'`
- **Relative adjustments only** — the AI never knows absolute slider values; it suggests "+2 clicks", "soften by 0.1 Bar", etc.

### Message Types (WebSocket Protocol)
| Type | Direction | Purpose |
|------|-----------|---------|
| `TELEMETRY_UPDATE` | Python → Electron | 10Hz normalized telemetry frame |
| `VOICE_TRANSCRIPT` | Python → Electron | STT result from push-to-talk |
| `PLAY_AUDIO` | Electron → Python | Request TTS playback |
| `GET_TELEMETRY_SUMMARY` | Electron → Python | Request 30s stats for LLM context |
| `TELEMETRY_SUMMARY` | Python → Electron | Response with aggregated stats |
| `GET_CAR_MEMORY` | Electron → Python | Load car setup history |
| `CAR_MEMORY` | Python → Electron | Car memory data |
| `LISTENING_STATE` | Python → Electron | PTT press/release notification |
| `SET_PTT_KEY` | Electron → Python | Change push-to-talk binding |

## File Purposes

### Python (`backend_python/`)
| File | Role |
|------|------|
| `main.py` | Asyncio event loop: UDP listener, WebSocket server, hotkey monitor |
| `telemetry/universal_model.py` | `UniversalTelemetry` dataclass — the normalized schema ALL adapters produce |
| `telemetry/base_adapter.py` | Abstract base class for game adapters |
| `telemetry/forza_adapter.py` | Forza Data Out UDP parser (232-byte sled + 79-byte dash) |
| `voice/stt_engine.py` | Push-to-talk recording + faster-whisper transcription |
| `voice/tts_engine.py` | Threaded pyttsx3 speech queue |
| `config.json` | Runtime settings (port, hotkeys, model size) |
| `car_memory.json` | Persistent car setup history keyed by vehicle_id |

### Electron (`electron/`)
| File | Role |
|------|------|
| `main.js` | Window creation, WebSocket client, Gemini chat session, IPC handlers |
| `preload.js` | Context bridge exposing `window.AI Tuner` API to renderer |

### React (`src/`)
| File | Role |
|------|------|
| `App.jsx` | Layout orchestrator, view switching (settings vs main), event listeners |
| `components/TelemetryHUD.jsx` | Compact speed/RPM display with telemetry connection icon |
| `components/ChatWindow.jsx` | Message history + pending changes checkboxes + listening indicator |
| `components/SettingsPanel.jsx` | Full-page settings: API key, model, PTT key, all keyboard shortcuts |

## Development Commands
```bash
npm run dev          # Vite dev server + Electron (concurrent)
npm run vite         # Vite only (for UI development)
npx electron .       # Electron only (needs Vite running or built dist/)
npx vite build       # Production frontend build
run.bat              # Launch full app (backend + overlay)
build.bat            # Create Windows NSIS installer
```

## Adding a New Game Adapter
1. Create `backend_python/telemetry/newgame_adapter.py`
2. Inherit from `BaseTelemetryAdapter`
3. Implement `get_port()`, `get_game_name()`, `parse_packet(data: bytes) -> UniversalTelemetry`
4. Register it in `backend_python/telemetry/__init__.py`
5. Add a selection option in `config.json` under `telemetry.game`

## Important Conventions
- **You are a UX expert.** Always think about user experience when implementing features. Every UI element must have a clear purpose — if it doesn't communicate useful information or afford an action, remove it. Avoid cryptic indicators, unlabeled dots, or decoration that adds visual noise without meaning.
- Python uses `asyncio` throughout — never block the event loop
- All telemetry values are metric (km/h, Celsius, meters)
- Suspension travel is normalized 0.0–1.0 (0=full extension, 1=bottomed out)
- Tire slip ratio: <0.1 = grip, >1.0 = heavy wheelspin/lockup
- The `car_memory.json` keys vehicles by their integer `vehicle_id` (Forza's CarOrdinal)
- UI uses TailwindCSS with custom colors prefixed `pit-` (pit-accent, pit-warn, pit-danger, pit-info)
- Glass panels use `backdrop-filter: blur(12px)` with semi-transparent backgrounds
- The overlay is a compact always-on-top panel (not fullscreen). No click-through mode — always interactive.
- Settings view completely replaces the main content (telemetry + chat) — it is NOT a modal or overlay.

## UX Principles
- Every visible element must have an immediately obvious meaning — no unlabeled colored dots or cryptic icons
- Prefer contextual indicators over persistent status lights (e.g., show "Listening..." only while PTT is held)
- Minimize visual noise — the user is driving a car and glancing at this panel briefly
- If a feature requires explanation, it needs a better design, not a tooltip
- Keyboard shortcuts must all be user-configurable from the Settings panel

## Common Pitfalls
- Forza struct indices are dense — double-check byte offsets when modifying the adapter
- The Python WebSocket server must be running BEFORE Electron starts (Electron auto-reconnects every 3s)
- `faster-whisper` model download happens on first run — initial STT startup will be slow
- pyttsx3 on Windows uses SAPI5 — voice quality depends on installed Windows voices
- Electron globalShortcut can fail silently if another app already registered the same key
