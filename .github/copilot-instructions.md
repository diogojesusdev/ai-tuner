# PitWall - Copilot Instructions

## Project Summary
PitWall is a transparent, voice-activated in-game overlay for racing games (Forza Horizon 6 first). It's a split-stack app: Python handles hardware I/O (UDP telemetry, audio, hotkeys) and Electron+React handles the UI overlay and Gemini AI calls.

## Architecture

### Communication Flow
```
Game (UDP:5300) → Python Backend → WebSocket (ws://127.0.0.1:8765) → Electron Main → React Renderer
                                 ← PLAY_AUDIO, GET_TELEMETRY_SUMMARY ←
```

### Key Design Decisions
- **Python does NOT call Gemini** — only Electron's main process talks to the AI via `@google/genai` SDK
- **WebSocket is the only bridge** between Python and Electron (no HTTP, no IPC pipes)
- **Click-through window** — Electron uses `setIgnoreMouseEvents(true, {forward: true})` by default; only interactive elements (chat, settings) capture mouse via `onMouseEnter`/`onMouseLeave` toggling
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
| `UPDATE_CAR_MEMORY` | Electron → Python | Persist a confirmed tuning change |

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
| `preload.js` | Context bridge exposing `window.pitwall` API to renderer |

### React (`src/`)
| File | Role |
|------|------|
| `App.jsx` | Layout orchestrator, WebSocket event listeners, click-through management |
| `components/TelemetryHUD.jsx` | Suspension bars, tire temp grid, RPM/speed display |
| `components/ChatWindow.jsx` | Message history + pending changes checkbox list |
| `components/SettingsPanel.jsx` | API key input, model dropdown, localStorage persistence |

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
- Python uses `asyncio` throughout — never block the event loop
- All telemetry values are metric (km/h, Celsius, meters)
- Suspension travel is normalized 0.0–1.0 (0=full extension, 1=bottomed out)
- Tire slip ratio: <0.1 = grip, >1.0 = heavy wheelspin/lockup
- The `car_memory.json` keys vehicles by their integer `vehicle_id` (Forza's CarOrdinal)
- UI uses TailwindCSS with custom colors prefixed `pit-` (pit-accent, pit-warn, pit-danger, pit-info)
- Glass panels use `backdrop-filter: blur(12px)` with semi-transparent backgrounds

## Common Pitfalls
- Forza struct indices are dense — double-check byte offsets when modifying the adapter
- Electron's `setIgnoreMouseEvents` must be toggled carefully or the UI becomes unclickable
- The Python WebSocket server must be running BEFORE Electron starts (Electron auto-reconnects every 3s)
- `faster-whisper` model download happens on first run — initial STT startup will be slow
- pyttsx3 on Windows uses SAPI5 — voice quality depends on installed Windows voices
