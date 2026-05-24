"""
Local Speech-to-Text engine using faster-whisper.
Handles audio recording from microphone and transcription.
"""

import asyncio
import numpy as np
import threading
import queue
import time as _time
from typing import Optional, Callable


class STTResult:
    """Result from STT processing with status info."""
    def __init__(self, text: Optional[str] = None, error: Optional[str] = None,
                 audio_duration: float = 0.0, audio_level: float = 0.0):
        self.text = text
        self.error = error
        self.audio_duration = audio_duration
        self.audio_level = audio_level

    @property
    def success(self) -> bool:
        return self.text is not None and len(self.text.strip()) > 0


class STTEngine:
    """
    Local speech-to-text using faster-whisper.
    Records audio on push-to-talk and returns transcription.
    """

    def __init__(self, model_size: str = "base", device: str = "auto"):
        self.model_size = model_size
        self.device = device
        self.model = None
        self.is_recording = False
        self._audio_queue: queue.Queue = queue.Queue()
        self._sample_rate = 16000
        self._channels = 1
        self._input_device = None  # None = system default
        self._actual_sample_rate = self._sample_rate  # May differ from _sample_rate if device doesn't support 16kHz
        self._record_error: Optional[str] = None
        self._init_error: Optional[str] = None

    def set_device(self, device_index):
        """Set the audio input device by index. None = system default."""
        # Validate: must be None or a valid integer index
        if device_index is None or device_index == '':
            self._input_device = None
            print("[STT] Input device set to: system default")
            return
        try:
            idx = int(device_index)
            self._input_device = idx
            print(f"[STT] Input device set to index: {idx}")
        except (ValueError, TypeError):
            # Invalid device ID (e.g., browser hash) — fall back to default
            self._input_device = None
            print(f"[STT] Invalid device '{device_index}', using system default")

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
            self._init_error = "faster-whisper not installed"
            print("[STT] WARNING: faster-whisper not installed. STT disabled.")
            print("[STT] Install with: pip install faster-whisper")
        except Exception as e:
            self._init_error = str(e)
            print(f"[STT] Model load error: {e}")

    def start_recording(self):
        """Begin capturing audio from microphone."""
        if self.is_recording:
            return
        self.is_recording = True
        self._audio_frames = []
        self._record_error = None
        self._record_start_time = _time.time()
        self._record_thread = threading.Thread(target=self._record_loop, daemon=True)
        self._record_thread.start()
        print("[STT] Recording started...")

    def _record_loop(self):
        """Internal recording thread using sounddevice."""
        try:
            import sounddevice as sd

            # Query the device's native sample rate (some don't support 16kHz directly)
            device_info = sd.query_devices(self._input_device, 'input')
            native_rate = int(device_info['default_samplerate'])
            # Use native rate if 16kHz isn't supported, then resample later
            use_rate = self._sample_rate if native_rate == self._sample_rate else native_rate

            def callback(indata, frames, time_info, status):
                if status:
                    print(f"[STT] Audio stream status: {status}")
                if self.is_recording:
                    self._audio_frames.append(indata.copy())

            self._actual_sample_rate = use_rate
            with sd.InputStream(
                device=self._input_device,
                samplerate=use_rate,
                channels=self._channels,
                dtype='float32',
                callback=callback,
                blocksize=1024
            ):
                while self.is_recording:
                    _time.sleep(0.05)
        except ImportError:
            self._record_error = "sounddevice not installed"
            print("[STT] WARNING: sounddevice not installed.")
            print("[STT] Install with: pip install sounddevice")
        except Exception as e:
            self._record_error = str(e)
            print(f"[STT] Recording error: {e}")

    def stop_recording(self) -> STTResult:
        """
        Stop recording and transcribe the captured audio.

        Returns:
            STTResult with text, error info, and audio metadata.
        """
        if not self.is_recording:
            return STTResult(error="Recording was not active")

        self.is_recording = False
        self._record_thread.join(timeout=3.0)

        record_duration = _time.time() - self._record_start_time
        print(f"[STT] Recording stopped ({record_duration:.1f}s). Transcribing...")

        # Check for recording-level errors
        if self._record_error:
            return STTResult(error=f"Recording failed: {self._record_error}",
                           audio_duration=record_duration)

        if not self._audio_frames:
            return STTResult(error="No audio captured — check microphone permissions",
                           audio_duration=record_duration)

        if self.model is None:
            err = self._init_error or "Model not loaded"
            return STTResult(error=f"STT unavailable: {err}",
                           audio_duration=record_duration)

        # Concatenate audio frames and compute level
        audio_data = np.concatenate(self._audio_frames, axis=0).flatten()

        # Resample to 16kHz if recorded at a different rate
        if self._actual_sample_rate != self._sample_rate:
            duration = len(audio_data) / self._actual_sample_rate
            num_samples = int(duration * self._sample_rate)
            indices = np.linspace(0, len(audio_data) - 1, num_samples)
            audio_data = np.interp(indices, np.arange(len(audio_data)), audio_data).astype(np.float32)
            print(f"[STT] Resampled from {self._actual_sample_rate}Hz to {self._sample_rate}Hz")

        audio_duration = len(audio_data) / self._sample_rate
        rms_level = float(np.sqrt(np.mean(audio_data ** 2)))
        peak_level = float(np.max(np.abs(audio_data)))

        print(f"[STT] Audio: {audio_duration:.1f}s, RMS={rms_level:.4f}, Peak={peak_level:.4f}")

        # Check if audio is essentially silence
        if peak_level < 0.005:
            return STTResult(
                error="Microphone captured silence — check input device selection",
                audio_duration=audio_duration, audio_level=rms_level
            )

        if audio_duration < 0.3:
            return STTResult(
                error="Recording too short — hold the key longer while speaking",
                audio_duration=audio_duration, audio_level=rms_level
            )

        # Transcribe
        try:
            segments, info = self.model.transcribe(
                audio_data,
                beam_size=5,
                language="en",
                vad_filter=True,
                vad_parameters=dict(
                    min_silence_duration_ms=500,
                    speech_pad_ms=300,
                    threshold=0.35,
                ),
            )
            text = " ".join(segment.text.strip() for segment in segments)
            print(f"[STT] Transcribed: '{text}'")

            if not text or not text.strip():
                return STTResult(
                    error="No speech detected — speak louder or closer to mic",
                    audio_duration=audio_duration, audio_level=rms_level
                )

            return STTResult(text=text.strip(), audio_duration=audio_duration,
                           audio_level=rms_level)
        except Exception as e:
            print(f"[STT] Transcription error: {e}")
            return STTResult(error=f"Transcription failed: {e}",
                           audio_duration=audio_duration, audio_level=rms_level)

    async def transcribe_async(self) -> STTResult:
        """Async wrapper around stop_recording for use in asyncio loops."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.stop_recording)
