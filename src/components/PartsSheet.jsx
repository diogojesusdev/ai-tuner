import React, { useState, useEffect } from 'react';
import { Download, Upload, RotateCcw } from 'lucide-react';

/**
 * PartsSheet - Tracks installed car parts/upgrades.
 * Stored alongside tune data in car_memory. Shared with the AI as context.
 */

const PARTS_CATEGORIES = [
  {
    id: 'drivetrain',
    label: 'Drivetrain',
    fields: [
      { key: 'drivetrain_layout', label: 'Layout', type: 'select', options: ['', 'RWD', 'AWD', 'FWD'] },
      { key: 'transmission', label: 'Transmission', type: 'select', options: ['', 'Stock', 'Sport', 'Race', 'Drift'] },
      { key: 'diff_type', label: 'Differential', type: 'select', options: ['', 'Stock', 'Sport', 'Race', 'Drift'] },
      { key: 'clutch', label: 'Clutch', type: 'select', options: ['', 'Stock', 'Sport', 'Race'] },
      { key: 'driveline', label: 'Driveline', type: 'select', options: ['', 'Stock', 'Sport', 'Race'] },
    ],
  },
  {
    id: 'engine',
    label: 'Engine',
    fields: [
      { key: 'aspiration', label: 'Aspiration', type: 'select', options: ['', 'NA', 'Turbo', 'Twin Turbo', 'Supercharger', 'Centrifugal SC'] },
      { key: 'engine_swap', label: 'Engine Swap', type: 'text', placeholder: 'Stock or swap name' },
      { key: 'intake', label: 'Intake', type: 'select', options: ['', 'Stock', 'Sport', 'Race'] },
      { key: 'exhaust', label: 'Exhaust', type: 'select', options: ['', 'Stock', 'Sport', 'Street', 'Race'] },
      { key: 'camshaft', label: 'Camshaft', type: 'select', options: ['', 'Stock', 'Sport', 'Race'] },
      { key: 'intercooler', label: 'Intercooler', type: 'select', options: ['', 'Stock', 'Sport', 'Race'] },
      { key: 'oil_cooling', label: 'Oil/Cooling', type: 'select', options: ['', 'Stock', 'Sport', 'Race'] },
      { key: 'flywheel', label: 'Flywheel', type: 'select', options: ['', 'Stock', 'Sport', 'Street', 'Race'] },
    ],
  },
  {
    id: 'platform',
    label: 'Platform & Handling',
    fields: [
      { key: 'springs_type', label: 'Springs', type: 'select', options: ['', 'Stock', 'Sport', 'Race', 'Rally', 'Drift'] },
      { key: 'arb_type', label: 'Anti-Roll Bars', type: 'select', options: ['', 'Stock', 'Sport', 'Race'] },
      { key: 'brakes_type', label: 'Brakes', type: 'select', options: ['', 'Stock', 'Sport', 'Race'] },
      { key: 'roll_cage', label: 'Roll Cage', type: 'select', options: ['', 'None', 'Sport', 'Race'] },
      { key: 'chassis_reinforcement', label: 'Chassis', type: 'select', options: ['', 'Stock', 'Sport', 'Race'] },
      { key: 'weight_reduction', label: 'Weight Reduction', type: 'select', options: ['', 'None', 'Sport', 'Race', 'Full'] },
    ],
  },
  {
    id: 'tires_wheels',
    label: 'Tires & Wheels',
    fields: [
      { key: 'tire_compound', label: 'Tire Compound', type: 'select', options: ['', 'Street', 'Sport', 'Semi-Slick', 'Slick', 'Drag', 'Rally', 'Offroad', 'Snow'] },
      { key: 'tire_width_front', label: 'Width Front', type: 'select', options: ['', 'Stock', 'Wide', 'Max'] },
      { key: 'tire_width_rear', label: 'Width Rear', type: 'select', options: ['', 'Stock', 'Wide', 'Max'] },
      { key: 'rim_size', label: 'Rim Size', type: 'text', placeholder: 'e.g. 18"' },
    ],
  },
  {
    id: 'aero',
    label: 'Aero',
    fields: [
      { key: 'front_aero', label: 'Front', type: 'select', options: ['', 'None', 'Stock', 'Sport Splitter', 'Race Splitter', 'Forza Aero'] },
      { key: 'rear_aero', label: 'Rear', type: 'select', options: ['', 'None', 'Stock', 'Sport Wing', 'Race Wing', 'Drift Wing', 'Forza Aero'] },
    ],
  },
];

function getEmptyParts() {
  const parts = {};
  PARTS_CATEGORIES.forEach((cat) => {
    cat.fields.forEach((f) => {
      parts[f.key] = '';
    });
  });
  return parts;
}

function PartsSheet({ vehicleId }) {
  const [parts, setParts] = useState(getEmptyParts());
  const [status, setStatus] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  // Load parts when vehicle changes
  useEffect(() => {
    loadParts();
  }, [vehicleId]);

  // Listen for parts updates from LLM
  useEffect(() => {
    if (!window.pitwall) return;
    window.pitwall.onPartsUpdate((data) => {
      if (data.parts) {
        setParts((prev) => ({ ...prev, ...data.parts }));
      }
      setStatus('Updated by engineer');
      setTimeout(() => setStatus(''), 2000);
    });
    return () => {
      if (window.pitwall) {
        window.pitwall.removeAllListeners('parts-update');
      }
    };
  }, []);

  // Auto-save on any parts change (debounced)
  useEffect(() => {
    if (!window.pitwall || !vehicleId) return;
    const timer = setTimeout(() => {
      window.pitwall.saveParts(vehicleId, parts);
    }, 800);
    return () => clearTimeout(timer);
  }, [parts, vehicleId]);

  const loadParts = async () => {
    if (!window.pitwall || !vehicleId) return;
    const data = await window.pitwall.getParts(vehicleId);
    if (data && typeof data === 'object') {
      setParts((prev) => ({ ...prev, ...data }));
    }
  };

  const handleFieldChange = (key, value) => {
    setParts((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 4000);
      return;
    }
    setConfirmReset(false);
    setParts(getEmptyParts());
    setStatus('Reset to blank');
    setTimeout(() => setStatus(''), 2000);
  };

  const handleExport = async () => {
    if (!window.pitwall) return;
    const result = await window.pitwall.exportParts(vehicleId);
    if (result?.success) {
      setStatus('✓ Exported');
      setTimeout(() => setStatus(''), 2000);
    }
  };

  const handleImport = async () => {
    if (!window.pitwall) return;
    const result = await window.pitwall.importParts();
    if (result?.success && result.parts) {
      setParts((prev) => ({ ...prev, ...result.parts }));
      setStatus('✓ Imported');
      setTimeout(() => setStatus(''), 2000);
    } else if (result?.error) {
      setStatus(`✗ ${result.error}`);
      setTimeout(() => setStatus(''), 3000);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-2 border-b border-gray-800/50 flex items-center gap-2">
        <span className="text-sm font-medium text-gray-200">Parts Sheet</span>
        {vehicleId && (
          <span className="text-[10px] text-gray-500">ID: {vehicleId}</span>
        )}
        <div className="ml-auto flex gap-1.5">
          <button
            onClick={handleImport}
            className="p-1 rounded text-gray-500 hover:text-pit-info transition-colors"
            title="Import parts from JSON"
          >
            <Download size={12} />
          </button>
          <button
            onClick={handleExport}
            className="p-1 rounded text-gray-500 hover:text-pit-info transition-colors"
            title="Export parts as JSON"
          >
            <Upload size={12} />
          </button>
          <button
            onClick={handleReset}
            className={`p-1 rounded transition-colors ${confirmReset ? 'text-pit-warn bg-pit-warn/10 ring-1 ring-pit-warn/40' : 'text-gray-500 hover:text-pit-warn'}`}
            title={confirmReset ? 'Click again to confirm reset' : 'Reset all values'}
          >
            <RotateCcw size={12} />
          </button>
          {confirmReset && (
            <span className="text-[9px] text-pit-warn animate-pulse">Confirm?</span>
          )}
        </div>
      </div>

      {/* Status */}
      {status && (
        <div className={`px-4 py-1 text-[10px] ${status.includes('✓') || status.includes('Updated') ? 'text-pit-accent' : status.includes('✗') ? 'text-pit-danger' : 'text-gray-400'}`}>
          {status}
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {PARTS_CATEGORIES.map((cat) => (
          <div key={cat.id}>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">
              {cat.label}
            </div>
            <div className="space-y-1.5">
              {cat.fields.map((field) => (
                <div key={field.key} className="flex items-center gap-1.5">
                  <label className="text-[10px] text-gray-400 w-24 shrink-0 truncate" title={field.label}>
                    {field.label}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      value={parts[field.key] || ''}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      className="flex-1 min-w-0 bg-gray-800/50 border border-gray-700/30 rounded px-1.5 py-0.5 text-[11px] text-gray-200 focus:outline-none focus:border-pit-accent/50"
                    >
                      {field.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt || '—'}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={parts[field.key] || ''}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      className="flex-1 min-w-0 bg-gray-800/50 border border-gray-700/30 rounded px-1.5 py-0.5 text-[11px] text-gray-200 focus:outline-none focus:border-pit-accent/50"
                      placeholder={field.placeholder || '—'}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PartsSheet;
