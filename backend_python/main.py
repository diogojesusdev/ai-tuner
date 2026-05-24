"""
AI Tuner Backend - Core asyncio loop.
Manages UDP telemetry ingestion, WebSocket broadcasting, and voice I/O.
"""

import asyncio
import json
import time
import collections
from pathlib import Path
from typing import Set

import websockets
from websockets.server import WebSocketServerProtocol

from telemetry import ForzaAdapter, UniversalTelemetry
from voice import STTEngine, TTSEngine

# Load configuration
CONFIG_PATH = Path(__file__).parent / "config.json"
with open(CONFIG_PATH, "r") as f:
    CONFIG = json.load(f)

CAR_MEMORY_PATH = Path(__file__).parent / "car_memory.json"


class AITunerBackend:
    """Main backend orchestrator for AI Tuner."""

    def __init__(self):
        self.adapter = ForzaAdapter(port=CONFIG["telemetry"]["udp_port"])
        self.stt = STTEngine(
            model_size=CONFIG["voice"]["stt_model"],
            device=CONFIG["voice"]["stt_device"],
        )
        self.tts = TTSEngine(
            rate=CONFIG["voice"]["tts_rate"],
            voice_index=CONFIG["voice"]["tts_voice_index"],
        )

        self.ws_clients: Set[WebSocketServerProtocol] = set()
        self.latest_telemetry: UniversalTelemetry | None = None
        self.telemetry_history: collections.deque = collections.deque(maxlen=6000)  # ~10min at 10Hz
        self.broadcast_rate = CONFIG["telemetry"]["broadcast_rate_hz"]
        self._running = False
        self._ptt_held = False

    async def start(self):
        """Start all backend services."""
        print("[AITuner] Starting backend...")
        self._running = True

        # Initialize voice engines in background threads
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self.stt.initialize)
        await loop.run_in_executor(None, self.tts.initialize)

        # Start WebSocket server
        ws_host = CONFIG["websocket"]["host"]
        ws_port = CONFIG["websocket"]["port"]

        async with websockets.serve(
            self._ws_handler, ws_host, ws_port
        ) as ws_server:
            print(f"[AITuner] WebSocket server on ws://{ws_host}:{ws_port}")

            # Run telemetry and hotkey tasks concurrently
            await asyncio.gather(
                self._telemetry_loop(),
                self._broadcast_loop(),
                self._hotkey_loop(),
                self._ws_message_loop(),
            )

    async def _ws_handler(self, websocket: WebSocketServerProtocol):
        """Handle new WebSocket connections."""
        self.ws_clients.add(websocket)
        client_addr = websocket.remote_address
        print(f"[WS] Client connected: {client_addr}")
        try:
            async for message in websocket:
                await self._handle_ws_message(websocket, message)
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            self.ws_clients.discard(websocket)
            print(f"[WS] Client disconnected: {client_addr}")

    async def _handle_ws_message(
        self, websocket: WebSocketServerProtocol, raw: str
    ):
        """Process incoming WebSocket messages from Electron."""
        try:
            msg = json.loads(raw)
            msg_type = msg.get("type")

            if msg_type == "PLAY_AUDIO":
                # Electron requests TTS playback
                text = msg.get("data", {}).get("text", "")
                if text:
                    await self.tts.speak_async(text)

            elif msg_type == "GET_TELEMETRY_SUMMARY":
                # Electron requests telemetry summary for LLM context
                window_minutes = msg.get("data", {}).get("window_minutes", 5)
                summary = self._get_telemetry_summary(window_minutes)
                await websocket.send(json.dumps({
                    "type": "TELEMETRY_SUMMARY",
                    "data": summary
                }))

            elif msg_type == "GET_CAR_MEMORY":
                # Electron requests car memory for current vehicle
                vehicle_id = msg.get("data", {}).get("vehicle_id")
                memory = self._load_car_memory(vehicle_id)
                await websocket.send(json.dumps({
                    "type": "CAR_MEMORY",
                    "data": memory
                }))

            elif msg_type == "UPDATE_CAR_MEMORY":
                # Electron pushes updated car memory
                vehicle_id = msg.get("data", {}).get("vehicle_id")
                updates = msg.get("data", {}).get("updates", {})
                self._save_car_memory(vehicle_id, updates)

            elif msg_type == "LIST_ALL_CARS":
                # Return summary of all saved cars
                cars_summary = self._list_all_cars()
                await websocket.send(json.dumps({
                    "type": "ALL_CARS_LIST",
                    "data": cars_summary
                }))

            elif msg_type == "SET_PTT_KEY":
                # User changed PTT key from UI
                new_key = msg.get("data", {}).get("key", "caps_lock")
                self._update_ptt_key(new_key)

            elif msg_type == "GET_INPUT_DEVICES":
                # List available audio input devices
                devices = self._get_input_devices()
                await websocket.send(json.dumps({
                    "type": "INPUT_DEVICES",
                    "data": devices
                }))

            elif msg_type == "SET_INPUT_DEVICE":
                # Set the audio input device index
                device_index = msg.get("data", {}).get("device_index")
                self.stt.set_device(device_index)
                print(f"[STT] Input device set to index: {device_index}")

        except json.JSONDecodeError:
            print(f"[WS] Invalid JSON received: {raw[:100]}")
        except Exception as e:
            print(f"[WS] Message handling error: {e}")

    async def _ws_message_loop(self):
        """Placeholder for any periodic WS maintenance."""
        while self._running:
            await asyncio.sleep(1.0)

    async def _telemetry_loop(self):
        """Read UDP telemetry packets from the game using asyncio datagram protocol."""
        port = self.adapter.get_port()
        loop = asyncio.get_event_loop()

        class TelemetryProtocol(asyncio.DatagramProtocol):
            def __init__(self, backend):
                self.backend = backend

            def datagram_received(self, data, addr):
                try:
                    telemetry = self.backend.adapter.parse_packet(data)
                    self.backend.latest_telemetry = telemetry
                    self.backend.telemetry_history.append(telemetry)
                except Exception:
                    pass

        try:
            transport, protocol = await loop.create_datagram_endpoint(
                lambda: TelemetryProtocol(self),
                local_addr=("0.0.0.0", port),
            )
            print(f"[Telemetry] Listening on UDP port {port}")

            # Keep alive until stopped
            while self._running:
                await asyncio.sleep(0.5)

            transport.close()
        except OSError as e:
            print(f"[Telemetry] Failed to bind UDP port {port}: {e}")
            print("[Telemetry] Make sure no other instance is running.")
            while self._running:
                await asyncio.sleep(1.0)

    async def _broadcast_loop(self):
        """Broadcast telemetry to WebSocket clients at configured rate."""
        interval = 1.0 / self.broadcast_rate
        
        while self._running:
            if self.latest_telemetry and self.ws_clients:
                message = self.latest_telemetry.to_ws_message()
                dead_clients = set()
                for client in self.ws_clients.copy():
                    try:
                        await client.send(message)
                    except websockets.exceptions.ConnectionClosed:
                        dead_clients.add(client)
                self.ws_clients -= dead_clients
            await asyncio.sleep(interval)

    async def _hotkey_loop(self):
        """Monitor push-to-talk hotkey using pynput."""
        try:
            from pynput import keyboard
        except ImportError:
            print("[Hotkey] WARNING: pynput not installed. Hotkeys disabled.")
            print("[Hotkey] Install with: pip install pynput")
            while self._running:
                await asyncio.sleep(1.0)
            return

        # Map config key names to pynput keys
        self._key_map = {
            "caps_lock": keyboard.Key.caps_lock,
            "scroll_lock": keyboard.Key.scroll_lock,
            "f9": keyboard.Key.f9,
            "f10": keyboard.Key.f10,
            "f11": keyboard.Key.f11,
            "f12": keyboard.Key.f12,
        }

        ptt_key_name = CONFIG["hotkeys"]["push_to_talk"]
        self._active_ptt_key = self._key_map.get(ptt_key_name, keyboard.Key.caps_lock)
        loop = asyncio.get_event_loop()

        def on_press(key):
            if key == self._active_ptt_key and not self._ptt_held:
                self._ptt_held = True
                self.stt.start_recording()
                asyncio.run_coroutine_threadsafe(
                    self._broadcast_listening_state(True), loop
                )

        def on_release(key):
            if key == self._active_ptt_key and self._ptt_held:
                self._ptt_held = False
                asyncio.run_coroutine_threadsafe(
                    self._broadcast_listening_state(False), loop
                )
                asyncio.run_coroutine_threadsafe(
                    self._process_voice(), loop
                )

        listener = keyboard.Listener(
            on_press=on_press,
            on_release=on_release,
        )
        listener.start()
        print(f"[Hotkey] Push-to-talk bound to: {ptt_key_name}")

        while self._running:
            await asyncio.sleep(0.1)

        listener.stop()

    async def _process_voice(self):
        """Process recorded voice input and broadcast transcript."""
        result = await self.stt.transcribe_async()

        if result.success:
            # Broadcast voice transcript to Electron
            message = json.dumps({
                "type": "VOICE_TRANSCRIPT",
                "data": {"text": result.text, "timestamp": time.time()}
            })
            for client in self.ws_clients.copy():
                try:
                    await client.send(message)
                except websockets.exceptions.ConnectionClosed:
                    pass
        else:
            # Send error/status feedback to Electron so user knows what happened
            error_msg = result.error or "No speech detected"
            print(f"[STT] Failed: {error_msg}")
            message = json.dumps({
                "type": "VOICE_ERROR",
                "data": {
                    "error": error_msg,
                    "audio_duration": result.audio_duration,
                    "audio_level": result.audio_level,
                    "timestamp": time.time(),
                }
            })
            for client in self.ws_clients.copy():
                try:
                    await client.send(message)
                except websockets.exceptions.ConnectionClosed:
                    pass

    async def _broadcast_listening_state(self, is_listening: bool):
        """Notify connected clients about PTT listening state."""
        message = json.dumps({
            "type": "LISTENING_STATE",
            "data": {"listening": is_listening}
        })
        for client in self.ws_clients.copy():
            try:
                await client.send(message)
            except websockets.exceptions.ConnectionClosed:
                pass

    def _get_telemetry_summary(self, window_minutes: int = 5) -> dict:
        """Generate a telemetry summary for the last N minutes for LLM context."""
        if not self.telemetry_history:
            return {}
        
        # Get last N minutes of data (at 10Hz broadcast)
        frames_needed = window_minutes * 60 * 10
        recent = list(self.telemetry_history)[-frames_needed:]
        if self.latest_telemetry:
            return self.latest_telemetry.summarize_30s(recent)
        return {}

    def _load_car_memory(self, vehicle_id) -> dict:
        """Load car setup memory for a specific vehicle."""
        try:
            with open(CAR_MEMORY_PATH, "r") as f:
                data = json.load(f)
            return data.get("cars", {}).get(str(vehicle_id), {})
        except (FileNotFoundError, json.JSONDecodeError):
            return {}

    def _save_car_memory(self, vehicle_id, updates: dict):
        """Save updated car memory including tune values."""
        try:
            with open(CAR_MEMORY_PATH, "r") as f:
                data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            data = {"cars": {}}

        vid = str(vehicle_id)
        if vid not in data["cars"]:
            data["cars"][vid] = {
                "discipline": "unknown",
                "past_modifications": [],
                "tune": {},
            }

        car = data["cars"][vid]
        if "discipline" in updates:
            car["discipline"] = updates["discipline"]
        if "modification" in updates:
            car.setdefault("past_modifications", []).append(
                updates["modification"]
            )
        if "make_model" in updates or "car_name" in updates:
            car["car_name"] = updates.get("car_name", updates.get("make_model", ""))
        if "tune" in updates:
            car.setdefault("tune", {}).update(updates["tune"])

        data["cars"][vid] = car
        with open(CAR_MEMORY_PATH, "w") as f:
            json.dump(data, f, indent=2)

    def _list_all_cars(self) -> list:
        """Return a summary list of all saved cars."""
        try:
            with open(CAR_MEMORY_PATH, "r") as f:
                data = json.load(f)
            cars = []
            for vid, car in data.get("cars", {}).items():
                cars.append({
                    "vehicle_id": vid,
                    "car_name": car.get("car_name", ""),
                    "discipline": car.get("discipline", ""),
                    "hp_tier": car.get("hp_tier", ""),
                    "has_tune": bool(car.get("tune")),
                })
            return cars
        except (FileNotFoundError, json.JSONDecodeError):
            return []

    def _update_ptt_key(self, new_key: str):
        """Update PTT key binding at runtime (no restart needed)."""
        self._ptt_key_name = new_key
        # Hot-swap the active key reference
        if hasattr(self, '_key_map') and hasattr(self, '_active_ptt_key'):
            new_ptt = self._key_map.get(new_key)
            if new_ptt:
                self._active_ptt_key = new_ptt
                print(f"[Hotkey] PTT key hot-swapped to: {new_key}")
            else:
                print(f"[Hotkey] Unknown key '{new_key}', keeping current binding")
        # Persist to config.json
        try:
            with open(CONFIG_PATH, "r") as f:
                cfg = json.load(f)
            cfg["hotkeys"]["push_to_talk"] = new_key
            cfg["voice"]["push_to_talk_key"] = new_key
            with open(CONFIG_PATH, "w") as f:
                json.dump(cfg, f, indent=2)
        except Exception as e:
            print(f"[Hotkey] Failed to save PTT key: {e}")

    def _get_input_devices(self) -> list:
        """List available audio input devices."""
        try:
            import sounddevice as sd
            devices = sd.query_devices()
            input_devices = []
            for i, d in enumerate(devices):
                if d['max_input_channels'] > 0:
                    input_devices.append({
                        "index": i,
                        "name": d['name'],
                        "channels": d['max_input_channels'],
                        "default": i == sd.default.device[0],
                    })
            return input_devices
        except ImportError:
            print("[Audio] sounddevice not installed, cannot list devices.")
            return []
        except Exception as e:
            print(f"[Audio] Error listing devices: {e}")
            return []

    def stop(self):
        """Gracefully stop all services."""
        self._running = False
        self.tts.stop()
        print("[AITuner] Backend stopped.")


async def main():
    """Entry point."""
    backend = AITunerBackend()
    try:
        await backend.start()
    except KeyboardInterrupt:
        backend.stop()
    except Exception as e:
        print(f"[AITuner] Fatal error: {e}")
        backend.stop()
        raise


if __name__ == "__main__":
    print("=" * 50)
    print("  AI Tuner Backend - AI Race Engineer")
    print("=" * 50)
    asyncio.run(main())
