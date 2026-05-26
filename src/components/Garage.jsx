import React, { useState, useEffect, useCallback } from 'react';
import { Search, Download, Upload, Trash2, X, ArrowDownToLine, Wrench, Cog } from 'lucide-react';

const DISCIPLINE_ICONS = {
  drifting: '🚗💨',
  drift: '🚗💨',
  racing: '🏎️',
  grip: '🏎️',
  rally: '🌲',
  offroad: '🌲',
  drag: '🏁',
  street: '🌃',
  touge: '⛰️',
};

function getDisciplineIcon(discipline) {
  const disc = (discipline || '').toLowerCase();
  for (const [key, icon] of Object.entries(DISCIPLINE_ICONS)) {
    if (disc.includes(key)) return icon;
  }
  return '🔧';
}

function Garage({ vehicleId, onLoadCar }) {
  const [cars, setCars] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [status, setStatus] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const loadCars = useCallback(async () => {
    if (!window.pitwall) return;
    const tunes = await window.pitwall.listAllTunes();
    setCars(tunes || []);
  }, []);

  useEffect(() => {
    loadCars();
  }, [loadCars]);

  // Refresh when switching to this tab
  useEffect(() => {
    loadCars();
  }, [vehicleId]);

  const handleLoad = (vid) => {
    if (onLoadCar) onLoadCar(vid);
  };

  const handleExport = async (car) => {
    if (!window.pitwall) return;
    const result = await window.pitwall.exportTune(car.vehicle_id, car.car_name);
    if (result?.success) {
      setStatus('✓ Exported');
      setTimeout(() => setStatus(''), 2000);
    }
  };

  const handleImport = async () => {
    if (!window.pitwall) return;
    const result = await window.pitwall.importTune();
    if (result?.success) {
      setStatus('✓ Imported');
      loadCars();
      setTimeout(() => setStatus(''), 2000);
    } else if (result?.error) {
      setStatus(`✗ ${result.error}`);
      setTimeout(() => setStatus(''), 3000);
    }
  };

  const handleDelete = async (vid) => {
    if (confirmDeleteId !== vid) {
      setConfirmDeleteId(vid);
      setTimeout(() => setConfirmDeleteId(null), 4000);
      return;
    }
    // Delete by saving empty data
    if (window.pitwall) {
      await window.pitwall.saveTune(vid, { tune: {}, discipline: '', hp_tier: '', car_name: '' });
      setConfirmDeleteId(null);
      setStatus('✓ Deleted');
      loadCars();
      setTimeout(() => setStatus(''), 2000);
    }
  };

  const filtered = cars.filter((car) => {
    if (!filterText) return true;
    const q = filterText.toLowerCase();
    return (
      (car.car_name || '').toLowerCase().includes(q) ||
      (car.discipline || '').toLowerCase().includes(q) ||
      String(car.vehicle_id).includes(q)
    );
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header with search and import */}
      <div className="px-4 py-2 border-b border-gray-800/50 flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Search cars..."
            className="w-full bg-gray-800/50 border border-gray-700/30 rounded-lg pl-7 pr-7 py-1.5 text-[11px] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-pit-accent/50"
          />
          {filterText && (
            <button
              onClick={() => setFilterText('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
            >
              <X size={10} />
            </button>
          )}
        </div>
        <button
          onClick={handleImport}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-pit-info/10 text-pit-info border border-pit-info/30 hover:bg-pit-info/20 text-[10px] transition-colors whitespace-nowrap"
          title="Import tune from JSON file"
        >
          <Download size={10} />
          Import
        </button>
      </div>

      {/* Status bar */}
      {status && (
        <div className={`px-4 py-1 text-[10px] ${status.includes('✓') ? 'text-pit-accent' : status.includes('✗') ? 'text-pit-danger' : 'text-gray-400'}`}>
          {status}
        </div>
      )}

      {/* Car count */}
      <div className="px-4 py-1.5 text-[9px] text-gray-600">
        {filtered.length} car{filtered.length !== 1 ? 's' : ''}{filterText ? ` matching "${filterText}"` : ' saved'}
      </div>

      {/* Car list */}
      <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-1.5">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-8 gap-2">
            {filterText ? (
              <>
                <Search size={20} className="text-gray-700" />
                <div className="text-[11px] text-gray-600">No cars match "{filterText}"</div>
              </>
            ) : (
              <>
                <Wrench size={20} className="text-gray-700" />
                <div className="text-[11px] text-gray-600">No saved setups yet</div>
                <div className="text-[10px] text-gray-700 max-w-[200px]">
                  Drive a car in Forza or import a tune file to get started.
                </div>
              </>
            )}
          </div>
        )}

        {filtered.map((car) => {
          const isActive = String(car.vehicle_id) === String(vehicleId);
          const isImported = String(car.vehicle_id).startsWith('imp_');
          const hasTune = car.has_tune !== false;
          const hasParts = car.has_parts === true;

          return (
            <div
              key={car.vehicle_id}
              className={`rounded-lg border transition-colors ${
                isActive
                  ? 'bg-pit-accent/8 border-pit-accent/30'
                  : 'bg-gray-800/20 border-gray-700/20 hover:bg-gray-800/40'
              }`}
            >
              {/* Main row */}
              <div
                className="flex items-center gap-2.5 px-3 py-2 cursor-pointer"
                onClick={() => handleLoad(car.vehicle_id)}
              >
                {/* Discipline icon */}
                <span className="text-base flex-shrink-0" title={car.discipline || 'Unknown'}>
                  {getDisciplineIcon(car.discipline)}
                </span>

                {/* Car info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-200 truncate font-medium">
                      {car.car_name || `Vehicle ${car.vehicle_id}`}
                    </span>
                    {isImported && (
                      <ArrowDownToLine size={9} className="text-pit-info shrink-0" title="Imported" />
                    )}
                    {isActive && (
                      <span className="text-[7px] text-pit-accent uppercase font-bold bg-pit-accent/10 px-1 py-0.5 rounded shrink-0">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {car.discipline && (
                      <span className="text-[9px] text-gray-500 capitalize">{car.discipline}</span>
                    )}
                    {car.hp_tier && (
                      <span className="text-[9px] text-gray-600">{car.hp_tier} HP</span>
                    )}
                    <div className="flex items-center gap-1.5 ml-auto">
                      {hasTune && (
                        <span className="text-[8px] text-pit-accent/70 flex items-center gap-0.5" title="Has tune values">
                          <Wrench size={8} /> Tune
                        </span>
                      )}
                      {hasParts && (
                        <span className="text-[8px] text-pit-info/70 flex items-center gap-0.5" title="Has parts list">
                          <Cog size={8} /> Parts
                        </span>
                      )}
                      {!hasTune && !hasParts && (
                        <span className="text-[8px] text-pit-warn/60">Empty</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action row */}
              <div className="flex items-center gap-1 px-3 pb-1.5 -mt-0.5">
                <button
                  onClick={(e) => { e.stopPropagation(); handleLoad(car.vehicle_id); }}
                  className="text-[9px] px-2 py-0.5 rounded bg-pit-accent/10 text-pit-accent border border-pit-accent/25 hover:bg-pit-accent/20 transition-colors"
                >
                  Load
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleExport(car); }}
                  className="text-[9px] px-2 py-0.5 rounded bg-gray-700/30 text-gray-400 border border-gray-700/25 hover:text-gray-200 hover:bg-gray-700/50 transition-colors flex items-center gap-0.5"
                >
                  <Upload size={8} /> Export
                </button>
                <div className="ml-auto">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(car.vehicle_id); }}
                    className={`text-[9px] px-2 py-0.5 rounded transition-colors flex items-center gap-0.5 ${
                      confirmDeleteId === car.vehicle_id
                        ? 'bg-pit-danger/15 text-pit-danger border border-pit-danger/30 animate-pulse'
                        : 'text-gray-600 hover:text-pit-danger border border-transparent'
                    }`}
                    title={confirmDeleteId === car.vehicle_id ? 'Click again to confirm' : 'Delete this car setup'}
                  >
                    <Trash2 size={8} />
                    {confirmDeleteId === car.vehicle_id ? 'Confirm?' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Garage;
