import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

/**
 * TelemetryHUD - Compact speed/RPM display with connection status icon.
 */

function TelemetryHUD({ telemetry, telemetryActive, carName }) {
  const speed = telemetry ? Math.round(telemetry.speed_kmh) : '--';
  const rpm = telemetry ? Math.round(telemetry.engine_rpm) : '--';
  const gear = telemetry ? telemetry.current_gear : '-';
  const maxRpm = telemetry?.max_rpm || 1;
  const rpmPercent = telemetry ? (telemetry.engine_rpm / maxRpm) * 100 : 0;

  return (
    <div className="px-4 py-2 flex items-center gap-4 border-b border-gray-800/50">
      {/* Connection status icon */}
      <div title={telemetryActive ? 'Telemetry connected' : 'No telemetry data'}>
        {telemetryActive ? (
          <Wifi size={14} className="text-pit-accent" />
        ) : (
          <WifiOff size={14} className="text-pit-danger animate-pulse" />
        )}
      </div>

      {/* Car name (shown when identified) */}
      {carName && (
        <span className="text-[10px] text-gray-400 truncate max-w-[100px]" title={carName}>
          {carName}
        </span>
      )}

      {/* Speed */}
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold text-white tabular-nums">{speed}</span>
        <span className="text-[10px] text-gray-500">km/h</span>
      </div>

      {/* RPM bar + number */}
      <div className="flex-1 flex flex-col justify-center gap-0.5">
        <div className="flex items-baseline gap-1">
          <span className="text-sm text-gray-300 tabular-nums">{rpm}</span>
          <span className="text-[9px] text-gray-600">rpm</span>
        </div>
        <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-75"
            style={{
              width: `${Math.min(rpmPercent, 100)}%`,
              backgroundColor: rpmPercent > 90 ? '#ff2d55' : '#00ff88',
            }}
          />
        </div>
      </div>

      {/* Gear */}
      <div className="text-lg font-bold text-pit-accent tabular-nums">
        {gear !== -1 ? `G${gear}` : 'R'}
      </div>
    </div>
  );
}

export default TelemetryHUD;
