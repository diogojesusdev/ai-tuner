"""
Local Text-to-Speech engine using pyttsx3.
Provides offline voice output for the race engineer persona.
"""

import asyncio
import threading
import queue
from typing import Optional


class TTSEngine:
    """
    Local text-to-speech using pyttsx3 (offline, zero-dependency TTS).
    Speaks responses from the AI race engineer.
    """

    def __init__(self, rate: int = 180, voice_index: int = 0):
        """
        Initialize TTS engine.
        
        Args:
            rate: Speech rate in words per minute.
            voice_index: Index of the system voice to use.
        """
        self.rate = rate
        self.voice_index = voice_index
        self.engine = None
        self._speech_queue: queue.Queue = queue.Queue()
        self._worker_thread: Optional[threading.Thread] = None
        self._running = False

    def initialize(self):
        """Initialize pyttsx3 engine. Call once at startup."""
        try:
            import pyttsx3
            self.engine = pyttsx3.init()
            self.engine.setProperty('rate', self.rate)
            
            voices = self.engine.getProperty('voices')
            if voices and self.voice_index < len(voices):
                self.engine.setProperty('voice', voices[self.voice_index].id)
                print(f"[TTS] Using voice: {voices[self.voice_index].name}")
            
            self._running = True
            self._worker_thread = threading.Thread(
                target=self._speech_worker, daemon=True
            )
            self._worker_thread.start()
            print(f"[TTS] Engine initialized (rate={self.rate})")
        except ImportError:
            print("[TTS] WARNING: pyttsx3 not installed. TTS disabled.")
            print("[TTS] Install with: pip install pyttsx3")
        except Exception as e:
            print(f"[TTS] Initialization error: {e}")

    def _speech_worker(self):
        """Background thread that processes the speech queue."""
        while self._running:
            try:
                text = self._speech_queue.get(timeout=0.5)
                if text is None:
                    break
                if self.engine:
                    self.engine.say(text)
                    self.engine.runAndWait()
            except queue.Empty:
                continue
            except Exception as e:
                print(f"[TTS] Speech error: {e}")

    def speak(self, text: str):
        """
        Queue text to be spoken.
        
        Args:
            text: The text string to synthesize and play.
        """
        if not text:
            return
        print(f"[TTS] Speaking: {text[:80]}...")
        self._speech_queue.put(text)

    async def speak_async(self, text: str):
        """Async wrapper - queues speech without blocking the event loop."""
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self.speak, text)

    def stop(self):
        """Stop the TTS engine and worker thread."""
        self._running = False
        self._speech_queue.put(None)
        if self._worker_thread:
            self._worker_thread.join(timeout=3.0)
        if self.engine:
            try:
                self.engine.stop()
            except Exception:
                pass
        print("[TTS] Engine stopped.")

    def list_voices(self) -> list[dict]:
        """List all available system voices."""
        if not self.engine:
            return []
        voices = self.engine.getProperty('voices')
        return [
            {"index": i, "name": v.name, "id": v.id}
            for i, v in enumerate(voices)
        ]
