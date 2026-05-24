"""
Local Speech-to-Text engine using faster-whisper.
Handles audio recording from microphone and transcription.
"""

import asyncio
import numpy as np
import threading
import queue
from typing import Optional, Callable


class STTEngine:
    """
    Local speech-to-text using faster-whisper.
    Records audio on push-to-talk and returns transcription.
    """

    def __init__(self, model_size: str = "base", device: str = "auto"):
        """
        Initialize the STT engine.
        
        Args:
            model_size: Whisper model size ('tiny', 'base', 'small', 'medium')
            device: Compute device ('auto', 'cpu', 'cuda')
        """
        self.model_size = model_size
        self.device = device
        self.model = None
        self.is_recording = False
        self._audio_queue: queue.Queue = queue.Queue()
        self._sample_rate = 16000
        self._channels = 1
        self._input_device = None  # None = system default

    def set_device(self, device_index):
        """Set the audio input device by index. None = system default."""
        self._input_device = device_index
        print(f"[STT] Input device set to: {device_index}")

    def initialize(self):
        """Load the whisper model. Call once at startup."""
        try:
            from faster_whisper import WhisperModel
            compute_type = "int8" if self.device == "cpu" else "float16"
            if self.device == "auto":
                compute_type = "int8"
                self.device = "cpu"
            self.model = WhisperModel(
                self.model_size,
                device=self.device,
                compute_type=compute_type
            )
            print(f"[STT] Model loaded: {self.model_size} on {self.device}")
        except ImportError:
            print("[STT] WARNING: faster-whisper not installed. STT disabled.")
            print("[STT] Install with: pip install faster-whisper")

    def start_recording(self):
        """Begin capturing audio from default microphone."""
        if self.is_recording:
            return
        self.is_recording = True
        self._audio_frames = []
        self._record_thread = threading.Thread(target=self._record_loop, daemon=True)
        self._record_thread.start()
        print("[STT] Recording started...")

    def _record_loop(self):
        """Internal recording thread using sounddevice."""
        try:
            import sounddevice as sd
            
            def callback(indata, frames, time_info, status):
                if self.is_recording:
                    self._audio_frames.append(indata.copy())

            with sd.InputStream(
                device=self._input_device,
                samplerate=self._sample_rate,
                channels=self._channels,
                dtype='float32',
                callback=callback,
                blocksize=1024
            ):
                while self.is_recording:
                    import time
                    time.sleep(0.05)
        except ImportError:
            print("[STT] WARNING: sounddevice not installed.")
            print("[STT] Install with: pip install sounddevice")
        except Exception as e:
            print(f"[STT] Recording error: {e}")

    def stop_recording(self) -> Optional[str]:
        """
        Stop recording and transcribe the captured audio.
        
        Returns:
            Transcribed text string, or None if transcription fails.
        """
        if not self.is_recording:
            return None
        
        self.is_recording = False
        self._record_thread.join(timeout=2.0)
        print("[STT] Recording stopped. Transcribing...")

        if not self._audio_frames:
            print("[STT] No audio captured.")
            return None

        if self.model is None:
            print("[STT] Model not loaded. Cannot transcribe.")
            return None

        # Concatenate audio frames
        audio_data = np.concatenate(self._audio_frames, axis=0).flatten()
        
        # Transcribe
        try:
            segments, info = self.model.transcribe(
                audio_data,
                beam_size=5,
                language="en",
                vad_filter=True,
            )
            text = " ".join(segment.text.strip() for segment in segments)
            print(f"[STT] Transcribed: {text}")
            return text if text else None
        except Exception as e:
            print(f"[STT] Transcription error: {e}")
            return None

    async def transcribe_async(self) -> Optional[str]:
        """Async wrapper around stop_recording for use in asyncio loops."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.stop_recording)
