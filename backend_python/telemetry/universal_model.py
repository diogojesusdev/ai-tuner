"""
Universal Telemetry Model - Normalized schema for cross-game telemetry data.
All game-specific adapters convert their native formats into this structure.
"""

from dataclasses import dataclass, field, asdict
from typing import Optional
import json
import time


@dataclass
class WheelData:
    """Per-wheel telemetry values (FL, FR, RL, RR)."""
    front_left: float = 0.0
    front_right: float = 0.0
    rear_left: float = 0.0
    rear_right: float = 0.0


@dataclass
class UniversalTelemetry:
    """
    Normalized telemetry schema consumed by the UI and LLM context.
    All adapters must produce instances of this class.
    """
    vehicle_id: int = 0
    speed_kmh: float = 0.0
    engine_rpm: float = 0.0
    current_gear: int = 0
    max_rpm: float = 8000.0
    throttle: float = 0.0
    brake: float = 0.0
    steering_angle: float = 0.0

    suspension_travel: WheelData = field(default_factory=WheelData)
    tire_temps_celsius: WheelData = field(default_factory=WheelData)
    slip_ratio: WheelData = field(default_factory=WheelData)
    slip_angle: WheelData = field(default_factory=WheelData)

    # Positional data
    position_x: float = 0.0
    position_y: float = 0.0
    position_z: float = 0.0
    yaw: float = 0.0
    pitch: float = 0.0
    roll: float = 0.0

    # Acceleration
    accel_x: float = 0.0
    accel_y: float = 0.0
    accel_z: float = 0.0

    timestamp: float = field(default_factory=time.time)

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        d = asdict(self)
        return d

    def to_json(self) -> str:
        """Serialize to JSON string."""
        return json.dumps(self.to_dict())

    def to_ws_message(self) -> str:
        """Format as WebSocket message with type envelope."""
        return json.dumps({
            "type": "TELEMETRY_UPDATE",
            "data": self.to_dict()
        })

    def summarize_30s(self, history: list["UniversalTelemetry"]) -> dict:
        """
        Generate a 30-second summary for LLM context from a list of recent frames.
        """
        if not history:
            return {}

        rear_suspensions = [
            max(f.suspension_travel.rear_left, f.suspension_travel.rear_right)
            for f in history
        ]
        front_temps = [
            (f.tire_temps_celsius.front_left + f.tire_temps_celsius.front_right) / 2
            for f in history
        ]
        rear_temps = [
            (f.tire_temps_celsius.rear_left + f.tire_temps_celsius.rear_right) / 2
            for f in history
        ]
        rear_slips = [
            max(f.slip_ratio.rear_left, f.slip_ratio.rear_right)
            for f in history
        ]

        avg_front_temp = sum(front_temps) / len(front_temps)
        avg_rear_temp = sum(rear_temps) / len(rear_temps)

        return {
            "max_rear_suspension_compression": round(max(rear_suspensions), 3),
            "avg_rear_tire_temp_delta": f"+{round(avg_rear_temp - avg_front_temp, 1)}C over front",
            "peak_rear_slip_ratio": round(max(rear_slips), 3),
            "avg_speed_kmh": round(sum(f.speed_kmh for f in history) / len(history), 1),
            "max_rpm": round(max(f.engine_rpm for f in history), 0),
        }
