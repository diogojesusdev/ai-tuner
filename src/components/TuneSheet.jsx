import React, { useState, useEffect, useCallback } from 'react';
import { Save, RotateCcw, Download, Upload, Search, ArrowDownToLine, X } from 'lucide-react';

/**
 * TuneSheet - Editable car tune values with a tune library panel.
 * Shows current setup and allows browsing/importing/exporting tunes.
 */

const TUNE_CATEGORIES = [
  {
    id: 'tires',
    label: 'Tires (Bar)',
    fields: [
      { key: 'tire_pressure_fl', label: 'FL' },
      { key: 'tire_pressure_fr', label: 'FR' },
      { key: 'tire_pressure_rl', label: 'RL' },
      { key: 'tire_pressure_rr', label: 'RR' },
    ],
  },
  {
    id: 'alignment',
    label: 'Alignment (°)',
    fields: [
      { key: 'camber_fl', label: 'Camber FL' },
      { key: 'camber_fr', label: 'Camber FR' },
      { key: 'camber_rl', label: 'Camber RL' },
      { key: 'camber_rr', label: 'Camber RR' },
      { key: 'toe_fl', label: 'Toe FL' },
      { key: 'toe_fr', label: 'Toe FR' },
      { key: 'toe_rl', label: 'Toe RL' },
      { key: 'toe_rr', label: 'Toe RR' },
    ],
  },
  {
    id: 'springs',
    label: 'Springs',
    fields: [
      { key: 'spring_front', label: 'Front (N/m)' },
      { key: 'spring_rear', label: 'Rear (N/m)' },
      { key: 'ride_height_front', label: 'Ride Height F (cm)' },
      { key: 'ride_height_rear', label: 'Ride Height R (cm)' },
    ],
  },
  {
    id: 'damping',
    label: 'Damping',
    fields: [
      { key: 'bump_front', label: 'Bump Front' },
      { key: 'bump_rear', label: 'Bump Rear' },
      { key: 'rebound_front', label: 'Rebound Front' },
      { key: 'rebound_rear', label: 'Rebound Rear' },
    ],
  },
  {
    id: 'antiroll',
    label: 'Anti-Roll Bars',
    fields: [
      { key: 'arb_front', label: 'Front' },
      { key: 'arb_rear', label: 'Rear' },
    ],
  },
  {
    id: 'aero',
    label: 'Aero (kgf)',
    fields: [
      { key: 'aero_front', label: 'Front Downforce' },
      { key: 'aero_rear', label: 'Rear Downforce' },
    ],
  },
  {
    id: 'brakes',
    label: 'Brakes',
    fields: [
      { key: 'brake_balance', label: 'Balance (%)' },
      { key: 'brake_pressure', label: 'Pressure (%)' },
    ],
  },
  {
    id: 'diff',
    label: 'Differential',
    fields: [
      { key: 'diff_accel', label: 'Accel (%)' },
      { key: 'diff_decel', label: 'Decel (%)' },
    ],
  },
  {
    id: 'gearing',
    label: 'Gearing',
    fields: [
      { key: 'final_drive', label: 'Final Drive' },
    ],
  },
];

function getEmptyTune() {
  const tune = {};
  TUNE_CATEGORIES.forEach((cat) => {
    cat.fields.forEach((f) => {
      tune[f.key] = '';
    });
  });
  return tune;
}

function TuneSheet({ vehicleId }) {
  const [tune, setTune] = useState(getEmptyTune());
  const [discipline, setDiscipline] = useState('');
  const [hpTier, setHpTier] = useState('');
  const [carName, setCarName] = useState('');
  const [status, setStatus] = useState('');

  // Library panel state
  const [showLibrary, setShowLibrary] = useState(false);
  const [allTunes, setAllTunes] = useState([]);
  const [filterText, setFilterText] = useState('');

  // Load tune when vehicle changes
  useEffect(() => {
    loadTune();
  }, [vehicleId]);

  // Listen for tune updates from LLM
  useEffect(() => {
    if (!window.pitwall) return;
    window.pitwall.onTuneUpdate((data) => {
      if (data.tune) {
        setTune((prev) => ({ ...prev, ...data.tune }));
      }
      if (data.discipline) setDiscipline(data.discipline);
      if (data.hp_tier) setHpTier(data.hp_tier);
      if (data.car_name) setCarName(data.car_name);
      setStatus('Updated by engineer');
      setTimeout(() => setStatus(''), 2000);
    });
    return () => {
      if (window.pitwall) {
        window.pitwall.removeAllListeners('tune-update');
      }
    };
  }, []);

  // Auto-save on any tune field / identity change (debounced)
  useEffect(() => {
    if (!window.pitwall || !vehicleId) return;
    const timer = setTimeout(() => {
      window.pitwall.saveTune(vehicleId, { tune, discipline, hp_tier: hpTier, car_name: carName });
    }, 800);
    return () => clearTimeout(timer);
  }, [tune, discipline, hpTier, carName, vehicleId]);

  const loadTune = async () => {
    if (!window.pitwall || !vehicleId) return;
    const data = await window.pitwall.getTune(vehicleId);
    if (data && data.tune) {
      setTune((prev) => ({ ...prev, ...data.tune }));
    }
    if (data?.discipline) setDiscipline(data.discipline);
    if (data?.hp_tier) setHpTier(data.hp_tier);
    if (data?.car_name) setCarName(data.car_name);
  };

  const handleFieldChange = (key, value) => {
    setTune((prev) => ({ ...prev, [key]: value }));
  };

  const [confirmReset, setConfirmReset] = useState(false);

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 4000);
      return;
    }
    setConfirmReset(false);
    setTune(getEmptyTune());
    setDiscipline('');
    setCarName('');
    setStatus('Reset to blank');
    setTimeout(() => setStatus(''), 2000);
  };

  // Library functions
  const loadLibrary = useCallback(async () => {
    if (!window.pitwall) return;
    const tunes = await window.pitwall.listAllTunes();
    setAllTunes(tunes || []);
  }, []);

  const toggleLibrary = () => {
    if (!showLibrary) {
      loadLibrary();
    }
    setShowLibrary(!showLibrary);
  };

  const handleLoadTune = async (vid) => {
    if (!window.pitwall) return;
    const data = await window.pitwall.getTune(vid);
    if (data && data.tune) {
      setTune((prev) => ({ ...prev, ...data.tune }));
    }
    if (data?.discipline) setDiscipline(data.discipline);
    if (data?.hp_tier) setHpTier(data.hp_tier);
    if (data?.car_name) setCarName(data.car_name);
    setStatus('Loaded from library');
    setTimeout(() => setStatus(''), 2000);
    setShowLibrary(false);
  };

  const handleExport = async () => {
    if (!window.pitwall) return;
    const result = await window.pitwall.exportTune(vehicleId, carName);
    if (result?.success) {
      setStatus('✓ Exported');
      setTimeout(() => setStatus(''), 2000);
    }
  };

  const handleImport = async () => {
    if (!window.pitwall) return;
    const result = await window.pitwall.importTune();
    if (result?.success) {
      // Load the imported tune into the editor
      const data = await window.pitwall.getTune(result.vehicleId);
      if (data?.tune) setTune((prev) => ({ ...prev, ...data.tune }));
      if (data?.discipline) setDiscipline(data.discipline);
      if (data?.hp_tier) setHpTier(data.hp_tier);
      setCarName(result.carName || data?.car_name || '');
      setStatus('✓ Imported');
      setTimeout(() => setStatus(''), 2000);
      // Refresh library if open
      if (showLibrary) loadLibrary();
    } else if (result?.error) {
      setStatus(`✗ ${result.error}`);
      setTimeout(() => setStatus(''), 3000);
    }
  };

  const filteredTunes = allTunes.filter((t) => {
    if (!filterText) return true;
    const q = filterText.toLowerCase();
    return (
      (t.car_name || '').toLowerCase().includes(q) ||
      (t.discipline || '').toLowerCase().includes(q) ||
      (t.vehicle_id || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-2 border-b border-gray-800/50 flex items-center gap-2">
        <span className="text-sm font-medium text-gray-200">Tune Sheet</span>
        {vehicleId && (
          <span className="text-[10px] text-gray-500">ID: {vehicleId}</span>
        )}
        <div className="ml-auto flex gap-1.5">
          <button
            onClick={handleImport}
            className="p-1 rounded text-gray-500 hover:text-pit-info transition-colors"
            title="Import tune from JSON"
          >
            <Upload size={12} />
          </button>
          <button
            onClick={handleExport}
            className="p-1 rounded text-gray-500 hover:text-pit-info transition-colors"
            title="Export current tune as JSON"
          >
            <Download size={12} />
          </button>
          <button
            onClick={toggleLibrary}
            className={`p-1 rounded transition-colors ${showLibrary ? 'text-pit-accent bg-pit-accent/10' : 'text-gray-500 hover:text-pit-accent'}`}
            title="Tune library"
          >
            <Search size={12} />
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
        <div className={`px-4 py-1 text-[10px] ${status.includes('✓') || status.includes('Updated') || status.includes('Loaded') ? 'text-pit-accent' : status.includes('✗') ? 'text-pit-danger' : 'text-gray-400'}`}>
          {status}
        </div>
      )}

      {/* Library panel (collapsible) */}
      {showLibrary && (
        <div className="border-b border-gray-800/50 bg-gray-900/40">
          <div className="px-4 py-2 flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter by car name..."
                className="w-full bg-gray-800/50 border border-gray-700/30 rounded pl-6 pr-2 py-1 text-[11px] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-pit-accent/50"
                autoFocus
              />
              {filterText && (
                <button
                  onClick={() => setFilterText('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
                >
                  <X size={9} />
                </button>
              )}
            </div>
            <button
              onClick={handleImport}
              className="flex items-center gap-1 px-2 py-1 rounded bg-pit-info/10 text-pit-info border border-pit-info/30 hover:bg-pit-info/20 text-[9px] transition-colors whitespace-nowrap"
            >
              <Upload size={9} />
              Import
            </button>
          </div>
          <div className="max-h-40 overflow-y-auto px-4 pb-2 space-y-1">
            {filteredTunes.length === 0 && (
              <div className="text-center text-gray-600 text-[10px] py-3">
                {filterText ? 'No tunes match your filter' : 'No saved tunes yet'}
              </div>
            )}
            {filteredTunes.map((t) => {
              const isImported = String(t.vehicle_id).startsWith('imp_');
              const isActive = String(t.vehicle_id) === String(vehicleId);
              return (
                <div
                  key={t.vehicle_id}
                  onClick={() => handleLoadTune(t.vehicle_id)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-pit-accent/10 border border-pit-accent/30'
                      : 'bg-gray-800/30 border border-gray-700/20 hover:bg-gray-800/60'
                  }`}
                >
                  {isImported && (
                    <ArrowDownToLine size={10} className="text-pit-info shrink-0" title="Imported tune" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-gray-200 truncate">
                      {t.car_name || `Vehicle ${t.vehicle_id}`}
                    </div>
                    <div className="text-[9px] text-gray-500 flex gap-2">
                      {t.discipline && <span className="capitalize">{t.discipline}</span>}
                      {t.hp_tier && <span>{t.hp_tier} HP</span>}
                      {!t.has_tune && <span className="text-pit-warn">Empty</span>}
                    </div>
                  </div>
                  {isActive && (
                    <span className="text-[8px] text-pit-accent uppercase font-medium shrink-0">Active</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Car identity */}
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-gray-400 mb-0.5 block">Car Name</label>
            <input
              type="text"
              value={carName}
              onChange={(e) => setCarName(e.target.value)}
              placeholder="e.g. 1989 Nissan Silvia K's"
              className="w-full bg-gray-800/50 border border-gray-700/30 rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-pit-accent/50"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 mb-0.5 block">Discipline</label>
            <select
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700/30 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-pit-accent/50"
            >
              <option value="">Select...</option>
             <option value="racing">Racing</option>
             <option value="drifting">Drifting</option>
             <option value="rally">Rally</option>
             <option value="drag">Drag</option>
           </select>
          </div>
          {discipline === 'drifting' && (
           <div>
             <label className="text-[10px] text-gray-400 mb-0.5 block">HP Tier</label>
             <select
               value={hpTier}
               onChange={(e) => setHpTier(e.target.value)}
               className="w-full bg-gray-800/50 border border-gray-700/30 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-pit-accent/50"
             >
               <option value="">Select...</option>
               <option value="low">Low HP (250–400)</option>
               <option value="mid">Mid HP (400–700)</option>
               <option value="high">High HP (700+)</option>
             </select>
           </div>
          )}
        </div>

        {/* Tune categories */}
        {TUNE_CATEGORIES.map((cat) => (
          <div key={cat.id}>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">
              {cat.label}
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {cat.fields.map((field) => (
                <div key={field.key} className="flex items-center gap-1.5">
                  <label className="text-[10px] text-gray-400 w-20 shrink-0 truncate" title={field.label}>
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={tune[field.key] || ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    className="flex-1 min-w-0 bg-gray-800/50 border border-gray-700/30 rounded px-1.5 py-0.5 text-[11px] text-gray-200 focus:outline-none focus:border-pit-accent/50 tabular-nums"
                    placeholder="—"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TuneSheet;
