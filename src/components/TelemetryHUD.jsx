import React from 'react';
import { Gauge, Thermometer } from 'lucide-react';

/**
 * TelemetryHUD - Passive overlay showing real-time vehicle telemetry.
 * Displays suspension compression bars and tire temperature indicators.
 */

function getTempClass(temp) {
  if (temp <= 0) return 'temp-cold';
  if (temp < 70) return 'temp-cold';
  if (temp < 95) return 'temp-optimal';
  if (temp < 110) return 'temp-hot';
  return 'temp-critical';
}

function getTempColor(temp) {
  if (temp <= 0) return '#4da6ff';
  if (temp < 70) return '#4da6ff';
  if (temp < 95) return '#00ff88';
  if (temp < 110) return '#ff6b35';
  return '#ff2d55';
}

function SuspensionBar({ value, label, position }) {
  const height = Math.min(Math.max(value * 100, 0), 100);
  const color = value > 0.85 ? '#ff2d55' : value > 0.6 ? '#ff6b35' : '#00ff88';

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] text-gray-500 uppercase">{label}</span>
      <div className="w-3 h-16 bg-gray-800/50 rounded-sm relative overflow-hidden">
        <div
          className="susp-bar absolute bottom-0 w-full rounded-sm"
          style={{ height: `${height}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] text-gray-400">
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  );
}

function TireTemp({ temp, label }) {
  const color = getTempColor(temp);
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] text-gray-500 uppercase">{label}</span>
      <div
        className="w-8 h-8 rounded border flex items-center justify-center text-xs font-medium"
        style={{ borderColor: color, color: color }}
      >
        {temp > 0 ? Math.round(temp) : '--'}
      </div>
    </div>
  );
}

function TelemetryHUD({ telemetry }) {
  if (!telemetry) {
    return (
      <div className="glass-panel px-4 py-3 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <Gauge size={14} />
          <span>Waiting for telemetry...</span>
        </div>
      </div>
    );
  }

  const {
    speed_kmh,
    engine_rpm,
    current_gear,
    max_rpm,
    suspension_travel,
    tire_temps_celsius,
    throttle,
    brake,
  } = telemetry;

  const rpmPercent = max_rpm > 0 ? (engine_rpm / max_rpm) * 100 : 0;

  return (
    <div className="glass-panel px-4 py-3 space-y-3">
      {/* Speed & RPM */}
      <div className="flex items-end gap-4">
        <div>
          <span className="text-2xl font-bold text-white">
            {Math.round(speed_kmh)}
          </span>
          <span className="text-xs text-gray-500 ml-1">km/h</span>
        </div>
        <div className="text-right">
          <span className="text-sm text-gray-300">
            {Math.round(engine_rpm)}
          </span>
          <span className="text-[10px] text-gray-500 ml-1">rpm</span>
        </div>
        <div className="text-lg font-bold text-pit-accent">
          G{current_gear}
        </div>
      </div>

      {/* RPM Bar */}
      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-75"
          style={{
            width: `${rpmPercent}%`,
            backgroundColor: rpmPercent > 90 ? '#ff2d55' : '#00ff88',
          }}
        />
      </div>

      {/* Throttle / Brake */}
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <div className="text-[10px] text-gray-500 mb-0.5">THR</div>
          <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full"
              style={{ width: `${(throttle || 0) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex-1">
          <div className="text-[10px] text-gray-500 mb-0.5">BRK</div>
          <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full"
              style={{ width: `${(brake || 0) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Suspension Travel */}
      <div>
        <div className="text-[10px] text-gray-500 uppercase mb-1 flex items-center gap-1">
          <Gauge size={10} /> Suspension
        </div>
        <div className="flex justify-between gap-2">
          <SuspensionBar
            value={suspension_travel?.front_left || 0}
            label="FL"
          />
          <SuspensionBar
            value={suspension_travel?.front_right || 0}
            label="FR"
          />
          <SuspensionBar
            value={suspension_travel?.rear_left || 0}
            label="RL"
          />
          <SuspensionBar
            value={suspension_travel?.rear_right || 0}
            label="RR"
          />
        </div>
      </div>

      {/* Tire Temperatures */}
      <div>
        <div className="text-[10px] text-gray-500 uppercase mb-1 flex items-center gap-1">
          <Thermometer size={10} /> Tire Temps (°C)
        </div>
        <div className="flex justify-between gap-2">
          <TireTemp temp={tire_temps_celsius?.front_left || 0} label="FL" />
          <TireTemp temp={tire_temps_celsius?.front_right || 0} label="FR" />
          <TireTemp temp={tire_temps_celsius?.rear_left || 0} label="RL" />
          <TireTemp temp={tire_temps_celsius?.rear_right || 0} label="RR" />
        </div>
      </div>
    </div>
  );
}

export default TelemetryHUD;
