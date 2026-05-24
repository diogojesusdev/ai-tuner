"""
Forza Horizon / Forza Motorsport Telemetry Adapter.
Parses the "Data Out" UDP packet format (FH4/FH5/FM7/FM8 compatible).

Forza Data Out format reference:
- Sled format: 232 bytes (basic physics)
- Dash format: 311 bytes (extended with car info)
- FH4+ extended: 324 bytes (includes extra fields)

All values are little-endian.
"""

import struct
import time
from .base_adapter import BaseTelemetryAdapter
from .universal_model import UniversalTelemetry, WheelData


# Forza Data Out struct format strings
# Sled packet (first 232 bytes)
SLED_FORMAT = '<'  # Little-endian
SLED_FORMAT += 'i'      # IsRaceOn (s32)
SLED_FORMAT += 'I'      # TimestampMS (u32)
SLED_FORMAT += 'fff'    # EngineMaxRpm, EngineIdleRpm, CurrentEngineRpm
SLED_FORMAT += 'fff'    # AccelerationX, AccelerationY, AccelerationZ
SLED_FORMAT += 'fff'    # VelocityX, VelocityY, VelocityZ
SLED_FORMAT += 'fff'    # AngularVelocityX, AngularVelocityY, AngularVelocityZ
SLED_FORMAT += 'fff'    # Yaw, Pitch, Roll
SLED_FORMAT += 'ffff'   # NormalizedSuspensionTravel FL, FR, RL, RR
SLED_FORMAT += 'ffff'   # TireSlipRatio FL, FR, RL, RR
SLED_FORMAT += 'ffff'   # WheelRotationSpeed FL, FR, RL, RR
SLED_FORMAT += 'ffff'   # WheelOnRumbleStrip FL, FR, RL, RR
SLED_FORMAT += 'ffff'   # WheelInPuddleDepth FL, FR, RL, RR
SLED_FORMAT += 'ffff'   # SurfaceRumble FL, FR, RL, RR
SLED_FORMAT += 'ffff'   # TireSlipAngle FL, FR, RL, RR
SLED_FORMAT += 'ffff'   # TireCombinedSlip FL, FR, RL, RR
SLED_FORMAT += 'ffff'   # SuspensionTravelMeters FL, FR, RL, RR
SLED_FORMAT += 'i'      # CarOrdinal (car ID)
SLED_FORMAT += 'i'      # CarClass (0-7)
SLED_FORMAT += 'i'      # CarPerformanceIndex (100-999)
SLED_FORMAT += 'i'      # DrivetrainType (0=FWD, 1=RWD, 2=AWD)
SLED_FORMAT += 'i'      # NumCylinders

SLED_SIZE = struct.calcsize(SLED_FORMAT)  # Should be 232 bytes

# Dash extension (bytes 232-311)
DASH_FORMAT = '<'
DASH_FORMAT += 'fff'    # PositionX, PositionY, PositionZ
DASH_FORMAT += 'f'      # Speed (m/s)
DASH_FORMAT += 'f'      # Power (watts)
DASH_FORMAT += 'f'      # Torque (Nm)
DASH_FORMAT += 'ffff'   # TireTempFL, TireTempFR, TireTempRL, TireTempRR
DASH_FORMAT += 'f'      # Boost
DASH_FORMAT += 'f'      # Fuel
DASH_FORMAT += 'f'      # DistanceTraveled
DASH_FORMAT += 'f'      # BestLap
DASH_FORMAT += 'f'      # LastLap
DASH_FORMAT += 'f'      # CurrentLap
DASH_FORMAT += 'f'      # CurrentRaceTime
DASH_FORMAT += 'H'      # LapNumber (u16)
DASH_FORMAT += 'B'      # RacePosition (u8)
DASH_FORMAT += 'B'      # Accel (u8, 0-255)
DASH_FORMAT += 'B'      # Brake (u8, 0-255)
DASH_FORMAT += 'B'      # Clutch (u8, 0-255)
DASH_FORMAT += 'B'      # Handbrake (u8, 0-255)
DASH_FORMAT += 'B'      # Gear (u8)
DASH_FORMAT += 'b'      # Steer (s8, -127 to 127)
DASH_FORMAT += 'B'      # NormalizedDrivingLine (u8)
DASH_FORMAT += 'B'      # NormalizedAIBrakeDifference (u8)

DASH_SIZE = struct.calcsize(DASH_FORMAT)


class ForzaAdapter(BaseTelemetryAdapter):
    """
    Telemetry adapter for Forza Horizon 5/6 and Forza Motorsport.
    Expects UDP Data Out packets on configurable port (default 5300).
    """

    def __init__(self, port: int = 5300):
        self._port = port

    def get_port(self) -> int:
        return self._port

    def get_game_name(self) -> str:
        return "Forza Horizon"

    def parse_packet(self, data: bytes) -> UniversalTelemetry:
        """Parse Forza Data Out UDP packet into universal telemetry."""
        if len(data) < SLED_SIZE:
            raise ValueError(
                f"Packet too small: {len(data)} bytes (need at least {SLED_SIZE})"
            )

        sled = struct.unpack_from(SLED_FORMAT, data, 0)

        # Unpack sled values by index
        is_race_on = sled[0]
        engine_max_rpm = sled[2]
        engine_idle_rpm = sled[3]
        current_rpm = sled[4]
        accel_x = sled[5]
        accel_y = sled[6]
        accel_z = sled[7]
        velocity_x = sled[8]
        velocity_y = sled[9]
        velocity_z = sled[10]
        yaw = sled[14]
        pitch = sled[15]
        roll = sled[16]

        # Normalized suspension travel (0.0 to 1.0)
        susp_fl = sled[17]
        susp_fr = sled[18]
        susp_rl = sled[19]
        susp_rr = sled[20]

        # Tire slip ratios
        slip_fl = sled[21]
        slip_fr = sled[22]
        slip_rl = sled[23]
        slip_rr = sled[24]

        # Tire slip angles (indices 41-44)
        slip_angle_fl = sled[41]
        slip_angle_fr = sled[42]
        slip_angle_rl = sled[43]
        slip_angle_rr = sled[44]

        # Car identifiers (index 53)
        car_ordinal = sled[53]

        # Calculate speed from velocity (m/s -> km/h)
        speed_ms = (velocity_x**2 + velocity_y**2 + velocity_z**2) ** 0.5
        speed_kmh = speed_ms * 3.6

        # Default tire temps and inputs
        tire_fl = tire_fr = tire_rl = tire_rr = 0.0
        throttle = brake = steering = 0.0
        gear = 0
        pos_x = pos_y = pos_z = 0.0
        power_watts = 0.0
        torque_nm = 0.0

        # Parse dash extension if available
        if len(data) >= SLED_SIZE + DASH_SIZE:
            dash = struct.unpack_from(DASH_FORMAT, data, SLED_SIZE)
            pos_x = dash[0]
            pos_y = dash[1]
            pos_z = dash[2]
            # dash[3] is speed in m/s (redundant)
            power_watts = dash[4]
            torque_nm = dash[5]
            tire_fl = dash[6]
            tire_fr = dash[7]
            tire_rl = dash[8]
            tire_rr = dash[9]
            throttle = dash[19] / 255.0
            brake = dash[20] / 255.0
            gear = dash[23]
            steering = dash[24] / 127.0  # Normalize to -1..1

        telemetry = UniversalTelemetry(
            vehicle_id=car_ordinal,
            speed_kmh=round(speed_kmh, 2),
            engine_rpm=round(current_rpm, 1),
            current_gear=gear,
            max_rpm=round(engine_max_rpm, 1),
            power_watts=round(power_watts, 1),
            torque_nm=round(torque_nm, 1),
            throttle=round(throttle, 3),
            brake=round(brake, 3),
            steering_angle=round(steering, 3),
            suspension_travel=WheelData(
                front_left=round(susp_fl, 4),
                front_right=round(susp_fr, 4),
                rear_left=round(susp_rl, 4),
                rear_right=round(susp_rr, 4),
            ),
            tire_temps_celsius=WheelData(
                front_left=round(tire_fl, 1),
                front_right=round(tire_fr, 1),
                rear_left=round(tire_rl, 1),
                rear_right=round(tire_rr, 1),
            ),
            slip_ratio=WheelData(
                front_left=round(slip_fl, 4),
                front_right=round(slip_fr, 4),
                rear_left=round(slip_rl, 4),
                rear_right=round(slip_rr, 4),
            ),
            slip_angle=WheelData(
                front_left=round(slip_angle_fl, 4),
                front_right=round(slip_angle_fr, 4),
                rear_left=round(slip_angle_rl, 4),
                rear_right=round(slip_angle_rr, 4),
            ),
            position_x=pos_x,
            position_y=pos_y,
            position_z=pos_z,
            yaw=yaw,
            pitch=pitch,
            roll=roll,
            accel_x=accel_x,
            accel_y=accel_y,
            accel_z=accel_z,
            timestamp=time.time(),
        )

        return telemetry
