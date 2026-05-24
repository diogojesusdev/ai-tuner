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
        Generate a rich telemetry summary for LLM context.
        Provides per-corner data, balance indicators, input patterns, and G-forces.
        """
        if not history:
            return {}

        n = len(history)

        # --- Tire temperatures (per corner) ---
        temps_fl = [f.tire_temps_celsius.front_left for f in history]
        temps_fr = [f.tire_temps_celsius.front_right for f in history]
        temps_rl = [f.tire_temps_celsius.rear_left for f in history]
        temps_rr = [f.tire_temps_celsius.rear_right for f in history]

        # --- Suspension travel (per corner, 0-1 normalized) ---
        susp_fl = [f.suspension_travel.front_left for f in history]
        susp_fr = [f.suspension_travel.front_right for f in history]
        susp_rl = [f.suspension_travel.rear_left for f in history]
        susp_rr = [f.suspension_travel.rear_right for f in history]

        # --- Slip ratios (per corner) ---
        slip_fl = [f.slip_ratio.front_left for f in history]
        slip_fr = [f.slip_ratio.front_right for f in history]
        slip_rl = [f.slip_ratio.rear_left for f in history]
        slip_rr = [f.slip_ratio.rear_right for f in history]

        # --- Slip angles (per corner, indicates lateral grip loss) ---
        sangle_fl = [f.slip_angle.front_left for f in history]
        sangle_fr = [f.slip_angle.front_right for f in history]
        sangle_rl = [f.slip_angle.rear_left for f in history]
        sangle_rr = [f.slip_angle.rear_right for f in history]

        # --- Driver inputs ---
        throttle = [f.throttle for f in history]
        brake = [f.brake for f in history]
        steering = [f.steering_angle for f in history]

        # --- G-forces ---
        lateral_g = [f.accel_x for f in history]   # lateral (cornering)
        longitudinal_g = [f.accel_z for f in history]  # longitudinal (accel/brake)

        # --- Speed & RPM ---
        speeds = [f.speed_kmh for f in history]
        rpms = [f.engine_rpm for f in history]

        def avg(lst):
            return round(sum(lst) / len(lst), 2) if lst else 0

        def pct_above(lst, threshold):
            """Percentage of frames where value exceeds threshold."""
            if not lst:
                return 0
            return round(sum(1 for v in lst if abs(v) > threshold) / len(lst) * 100, 1)

        return {
            "duration_seconds": round(n / 10, 1),  # at 10Hz
            "speed": {
                "avg_kmh": avg(speeds),
                "max_kmh": round(max(speeds), 1),
                "min_kmh": round(min(speeds), 1),
            },
            "engine": {
                "avg_rpm": round(avg(rpms)),
                "max_rpm": round(max(rpms)),
                "time_above_90pct_redline": pct_above(
                    [r / (history[0].max_rpm or 1) for r in rpms], 0.9
                ),
            },
            "tire_temps_celsius": {
                "front_left": {"avg": avg(temps_fl), "max": round(max(temps_fl), 1)},
                "front_right": {"avg": avg(temps_fr), "max": round(max(temps_fr), 1)},
                "rear_left": {"avg": avg(temps_rl), "max": round(max(temps_rl), 1)},
                "rear_right": {"avg": avg(temps_rr), "max": round(max(temps_rr), 1)},
            },
            "suspension_travel": {
                "front_left": {"avg": avg(susp_fl), "max": round(max(susp_fl), 3)},
                "front_right": {"avg": avg(susp_fr), "max": round(max(susp_fr), 3)},
                "rear_left": {"avg": avg(susp_rl), "max": round(max(susp_rl), 3)},
                "rear_right": {"avg": avg(susp_rr), "max": round(max(susp_rr), 3)},
                "pct_bottoming_out_front": pct_above(
                    [(fl + fr) / 2 for fl, fr in zip(susp_fl, susp_fr)], 0.95
                ),
                "pct_bottoming_out_rear": pct_above(
                    [(rl + rr) / 2 for rl, rr in zip(susp_rl, susp_rr)], 0.95
                ),
            },
            "slip_ratio": {
                "front_left": {"avg": avg(slip_fl), "peak": round(max(slip_fl, key=abs), 3)},
                "front_right": {"avg": avg(slip_fr), "peak": round(max(slip_fr, key=abs), 3)},
                "rear_left": {"avg": avg(slip_rl), "peak": round(max(slip_rl, key=abs), 3)},
                "rear_right": {"avg": avg(slip_rr), "peak": round(max(slip_rr, key=abs), 3)},
            },
            "slip_angle_deg": {
                "front_avg": avg([(abs(fl) + abs(fr)) / 2 for fl, fr in zip(sangle_fl, sangle_fr)]),
                "rear_avg": avg([(abs(rl) + abs(rr)) / 2 for rl, rr in zip(sangle_rl, sangle_rr)]),
                "balance_indicator": "oversteer" if avg(
                    [abs(rl) + abs(rr) for rl, rr in zip(sangle_rl, sangle_rr)]
                ) > avg(
                    [abs(fl) + abs(fr) for fl, fr in zip(sangle_fl, sangle_fr)]
                ) else "understeer",
            },
            "driver_inputs": {
                "avg_throttle_pct": round(avg(throttle) * 100, 1),
                "avg_brake_pct": round(avg(brake) * 100, 1),
                "time_full_throttle_pct": pct_above(throttle, 0.95),
                "time_braking_pct": pct_above(brake, 0.05),
                "avg_steering_magnitude": avg([abs(s) for s in steering]),
            },
            "g_forces": {
                "peak_lateral_g": round(max(lateral_g, key=abs), 2),
                "avg_lateral_g": avg([abs(g) for g in lateral_g]),
                "peak_longitudinal_g": round(max(longitudinal_g, key=abs), 2),
                "avg_longitudinal_g": avg([abs(g) for g in longitudinal_g]),
            },
        }
