# 🏎️ AI Tuner

**Voice-activated AI race engineer overlay for Forza Horizon 6.**

Real-time telemetry analysis, intelligent tuning suggestions, and per-car setup memory — all through a compact always-on-top overlay.

[![Download](https://img.shields.io/github/v/release/diogojesusdev/ai-tuner?label=Download&style=for-the-badge&color=ff2d55)](https://github.com/diogojesusdev/ai-tuner/releases/latest)
[![Website](https://img.shields.io/badge/Website-AI%20Tuner-4da6ff?style=for-the-badge)](https://diogojesusdev.github.io/ai-tuner/)

---

## Features

- 🎙️ **Voice-Activated** — Hold push-to-talk, describe how the car feels. Local STT, zero latency.
- 📊 **Live Telemetry** — Per-corner tire temps, slip ratios, suspension, G-forces at 10Hz.
- 🧠 **Gemini AI Engineer** — Cross-references telemetry data with your feedback. Suggests relative adjustments.
- 💾 **Per-Car Memory** — Saves tune, discipline, HP tier, and history for every vehicle.
- 🏎️ **All Disciplines** — Racing, drifting (with HP tier), rally, drag.
- 🪟 **Always-On Overlay** — Compact, always-on-top, toggle with a hotkey.
- 🔄 **Auto-Update** — Checks GitHub Releases for new versions.

## Quick Start

### Requirements
- Windows 10/11
- Node.js 18+
- Python 3.11+
- Forza Horizon 6 with Data Out enabled (UDP port 5300)
- Free [Gemini API key](https://aistudio.google.com)

### Run from source

```bash
# Install dependencies
npm install
pip install -r backend_python/requirements.txt

# Enable Forza Data Out: Settings → HUD → IP: 127.0.0.1, Port: 5300

# Launch (builds frontend + starts Electron, backend spawns automatically)
run.bat
```

### Or download the installer

👉 [Latest Release](https://github.com/diogojesusdev/ai-tuner/releases/latest)

## Architecture

```
┌───────────────────────────────────────────────────────┐
│  Electron (Always-on-top Overlay Window)               │
│  ┌─────────────┐  ┌────────────┐  ┌───────────────┐  │
│  │ TelemetryHUD│  │ ChatWindow │  │ TuneSheet     │  │
│  │ (React)     │  │ (React)    │  │ (React)       │  │
│  └─────────────┘  └────────────┘  └───────────────┘  │
│           │              │                │            │
│           └──── Gemini SDK (@google/genai) ──── Agent  │
│                  State Machine                         │
└──────────────────────┬────────────────────────────────┘
                       │ WebSocket (ws://127.0.0.1:8765)
┌──────────────────────┴────────────────────────────────┐
│  Python Backend (asyncio)                              │
│  ┌──────────────┐  ┌───────────┐  ┌───────────────┐  │
│  │ Forza Adapter│  │ STT Engine│  │ TTS Engine    │  │
│  │ (UDP Parser) │  │ (Whisper) │  │ (pyttsx3)     │  │
│  └──────────────┘  └───────────┘  └───────────────┘  │
└───────────────────────────────────────────────────────┘
         ▲
         │ UDP (port 5300)
    ┌────┴────┐
    │ Forza   │
    │ Horizon │
    │ 6       │
    └─────────┘
```

## Agent State Machine

The AI engineer follows a structured workflow:

1. **IDLE** → Waiting for telemetry
2. **IDENTIFY_CAR** → New car detected, asks for name + discipline
3. **COLLECTING_DATA** → Building telemetry profile (configurable 1–10 min)
4. **READY** → Analyzing and accepting queries
5. **SUGGESTING** → Proposed changes pending confirmation
6. **UPDATING_TUNE** → Recording applied values

## Configuration

| Setting | Location | Default |
|---------|----------|---------|
| API Key | Settings panel | — |
| PTT Key | Settings panel | CapsLock |
| Toggle Overlay | Settings panel | F10 |
| Telemetry Window | Settings panel | 5 min |
| UDP Port | `backend_python/config.json` | 5300 |
| STT Model | `backend_python/config.json` | tiny |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TailwindCSS + Lucide Icons |
| Window | Electron (transparent, always-on-top) |
| Backend | Python 3.11+ asyncio |
| STT | faster-whisper (local) |
| TTS | pyttsx3 (local) |
| AI | Gemini 3.1 Flash Lite |
| IPC | WebSockets (localhost:8765) |
| Updates | electron-updater + GitHub Releases |

## License

MIT

