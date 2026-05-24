# PitWall - AI Race Engineer Overlay

A transparent, voice-activated in-game overlay for racing games that acts as an AI pit-lane race engineer. Monitors live UDP telemetry, processes voice commands locally, and uses Gemini AI to provide relative tuning adjustments.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Electron (Transparent Overlay Window)                   │
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │ TelemetryHUD  │  │ ChatWindow   │  │ SettingsPanel│  │
│  │ (React)       │  │ (React)      │  │ (React)     │  │
│  └───────────────┘  └──────────────┘  └─────────────┘  │
│           │                │                 │           │
│           └────── Gemini SDK (@google/genai) ┘           │
└────────────────────────┬────────────────────────────────┘
                         │ WebSocket (ws://127.0.0.1:8765)
┌────────────────────────┴────────────────────────────────┐
│  Python Backend (asyncio)                                │
│  ┌──────────────┐  ┌───────────┐  ┌─────────────────┐  │
│  │ Forza Adapter │  │ STT Engine│  │ TTS Engine      │  │
│  │ (UDP Parser)  │  │ (Whisper) │  │ (pyttsx3)       │  │
│  └──────────────┘  └───────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
         ▲
         │ UDP (port 5300)
    ┌────┴────┐
    │  Game   │
    │ (Forza) │
    └─────────┘
```

## Quick Start

### 1. Install Node.js Dependencies
```bash
npm install
```

### 2. Install Python Dependencies
```bash
cd backend_python
pip install -r requirements.txt
```

### 3. Configure Forza Data Out
In Forza Horizon, enable Data Out in Settings → HUD & Gameplay:
- IP Address: `127.0.0.1`
- Port: `5300`

### 4. Run the Application

**Terminal 1 - Python Backend:**
```bash
cd backend_python
python main.py
```

**Terminal 2 - Electron Overlay:**
```bash
npm run dev
```

## Usage

1. **Settings**: Click the gear icon to enter your Gemini API key
2. **Voice**: Hold CapsLock (push-to-talk) to speak to the engineer
3. **Chat**: Type messages directly in the chat window
4. **Confirm**: Check off applied tuning changes from the pending list

## Configuration

Edit `backend_python/config.json`:
- `telemetry.udp_port`: Game telemetry port (default: 5300)
- `voice.stt_model`: Whisper model size (tiny/base/small/medium)
- `hotkeys.push_to_talk`: PTT key binding

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | React + TailwindCSS + Lucide Icons |
| Window Host | Electron (transparent, frameless, always-on-top) |
| Backend | Python 3.11+ with asyncio |
| STT | faster-whisper (local) |
| TTS | pyttsx3 (local) |
| IPC | WebSockets on localhost:8765 |
| AI | Google Gemini via @google/genai SDK |
