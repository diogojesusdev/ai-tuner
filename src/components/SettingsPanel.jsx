import React, { useState, useEffect } from 'react';
import { ArrowLeft, Key, Cpu, Mic, Keyboard, Download, RefreshCw } from 'lucide-react';

/**
 * SettingsPanel - Full-page settings view.
 * Configures: Gemini API key, model, PTT key, and all keyboard shortcuts.
 */

const AVAILABLE_MODELS = [
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite' },
];

const PTT_KEY_OPTIONS = [
  { id: 'caps_lock', name: 'CapsLock' },
  { id: 'scroll_lock', name: 'ScrollLock' },
  { id: 'f5', name: 'F5' },
  { id: 'f6', name: 'F6' },
  { id: 'f7', name: 'F7' },
  { id: 'f8', name: 'F8' },
  { id: 'f9', name: 'F9' },
  { id: 'f10', name: 'F10' },
  { id: 'f11', name: 'F11' },
  { id: 'f12', name: 'F12' },
];

const SHORTCUT_OPTIONS = [
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
  'CommandOrControl+Shift+H',
  'CommandOrControl+Shift+Q',
  'CommandOrControl+Shift+P',
  'CommandOrControl+Shift+M',
  'CommandOrControl+Shift+O',
  'Alt+H', 'Alt+Q', 'Alt+P',
];

function SettingsPanel({ onClose }) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-3.1-flash-lite');
  const [pttKey, setPttKey] = useState('caps_lock');
  const [inputDevice, setInputDevice] = useState('');
  const [inputDevices, setInputDevices] = useState([]);
  const [toggleOverlay, setToggleOverlay] = useState('F10');
  const [telemetryWindow, setTelemetryWindow] = useState(5);
  const [status, setStatus] = useState('');
  const [appVersion, setAppVersion] = useState('');
  const [updateStatus, setUpdateStatus] = useState(''); // '', 'checking', 'available', 'downloading', 'ready', 'uptodate'
  const [updateVersion, setUpdateVersion] = useState('');

  // Load saved settings from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('pitwall_api_key') || '';
    const savedModel = localStorage.getItem('pitwall_model') || 'gemini-3.1-flash-lite';
    const savedPtt = localStorage.getItem('pitwall_ptt_key') || 'caps_lock';
    const savedToggle = localStorage.getItem('pitwall_shortcut_toggle') || 'F10';
    const savedWindow = localStorage.getItem('pitwall_telemetry_window') || '5';
    const savedDevice = localStorage.getItem('pitwall_input_device') || '';
    setApiKey(savedKey);
    setModel(savedModel);
    setPttKey(savedPtt);
    setToggleOverlay(savedToggle);
    setTelemetryWindow(parseInt(savedWindow, 10));
    // Only use saved device if it's a valid numeric index
    const validDevice = savedDevice && /^\d+$/.test(savedDevice) ? savedDevice : '';
    setInputDevice(validDevice);
    if (savedDevice && !validDevice) {
      // Clear invalid (hash-based) saved device
      localStorage.setItem('pitwall_input_device', '');
    }

    // Load available input devices from Python backend (uses sounddevice indices)
    async function loadDevices() {
      try {
        if (window.pitwall?.getInputDevices) {
          const devices = await window.pitwall.getInputDevices();
          if (devices && Array.isArray(devices) && devices.length > 0) {
            setInputDevices(devices);
            return;
          }
        }
        // Fallback: use browser API but map to index numbers
        await navigator.mediaDevices.getUserMedia({ audio: true }).then(s => s.getTracks().forEach(t => t.stop()));
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices
          .filter(d => d.kind === 'audioinput' && d.deviceId !== 'default' && d.deviceId !== 'communications')
          .map((d, i) => ({
            index: i,
            name: d.label || `Microphone ${i + 1}`,
            default: i === 0,
          }));
        setInputDevices(audioInputs);
      } catch (e) {
        console.warn('Could not enumerate audio devices:', e);
      }
    }
    loadDevices();

    // Load app version
    if (window.pitwall?.getAppVersion) {
      window.pitwall.getAppVersion().then(v => setAppVersion(v));
    }
  }, []);

  const handleCheckUpdate = async () => {
    if (!window.pitwall?.checkForUpdates) return;
    setUpdateStatus('checking');
    const result = await window.pitwall.checkForUpdates();
    if (result.available) {
      setUpdateStatus('available');
      setUpdateVersion(result.version);
    } else {
      setUpdateStatus('uptodate');
      setTimeout(() => setUpdateStatus(''), 3000);
    }
  };

  const handleDownloadUpdate = async () => {
    if (!window.pitwall?.downloadUpdate) return;
    setUpdateStatus('downloading');
    await window.pitwall.downloadUpdate();
    setUpdateStatus('ready');
  };

  const handleInstallUpdate = () => {
    if (window.pitwall?.installUpdate) {
      window.pitwall.installUpdate();
    }
  };

  // Auto-save on any setting change
  useEffect(() => {
    // Skip initial mount (settings are loading from localStorage)
    const timeout = setTimeout(async () => {
      // Save to localStorage
      localStorage.setItem('pitwall_api_key', apiKey);
      localStorage.setItem('pitwall_model', model);
      localStorage.setItem('pitwall_ptt_key', pttKey);
      localStorage.setItem('pitwall_shortcut_toggle', toggleOverlay);
      localStorage.setItem('pitwall_telemetry_window', String(telemetryWindow));
      localStorage.setItem('pitwall_input_device', inputDevice);

      // Send to Electron main process
      if (window.pitwall && apiKey.trim()) {
        const result = await window.pitwall.setApiKey(apiKey, model);
        await window.pitwall.setPttKey(pttKey);
        await window.pitwall.setShortcuts({ toggleOverlay });
        await window.pitwall.setTelemetryWindow(telemetryWindow);
        if (inputDevice && inputDevice !== '') {
          await window.pitwall.setInputDevice(parseInt(inputDevice, 10));
        }
        if (result.success) {
          setStatus('✓ Saved');
        } else {
          setStatus('✗ Failed to connect to Gemini. Check your key.');
        }
      }
      setTimeout(() => setStatus(''), 2000);
    }, 500); // debounce 500ms

    return () => clearTimeout(timeout);
  }, [apiKey, model, pttKey, toggleOverlay, telemetryWindow, inputDevice]);

  const formatShortcutLabel = (s) => {
    return s.replace('CommandOrControl+', 'Ctrl+').replace('Alt+', 'Alt+');
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 border-b border-gray-800/50 flex items-center gap-2">
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-pit-accent transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <span className="text-sm font-medium text-gray-200">Settings</span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* AI Configuration */}
        <section>
          <h3 className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Cpu size={10} />
            AI Configuration
          </h3>
          <div className="space-y-3">
            <div>
              <label className="flex items-center gap-1.5 text-[10px] text-gray-400 mb-1">
                <Key size={10} />
                Gemini API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIza..."
                className="w-full bg-gray-800/50 border border-gray-700/30 rounded-md px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-pit-accent/50"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 mb-1 block">Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700/30 rounded-md px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-pit-accent/50"
              >
                {AVAILABLE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Voice */}
        <section>
          <h3 className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Mic size={10} />
            Voice
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-gray-400 mb-1 block">Microphone</label>
              <select
                value={inputDevice}
                onChange={(e) => setInputDevice(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700/30 rounded-md px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-pit-accent/50"
              >
                <option value="">System Default</option>
                {inputDevices.map((d) => (
                  <option key={d.index} value={d.index}>
                    {d.name}{d.default ? ' (Default)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 mb-1 block">Push-to-Talk Key (hold to speak)</label>
              <select
                value={pttKey}
                onChange={(e) => setPttKey(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700/30 rounded-md px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-pit-accent/50"
              >
                {PTT_KEY_OPTIONS.map((k) => (
                  <option key={k.id} value={k.id}>{k.name}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Telemetry Analysis */}
        <section>
          <h3 className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Cpu size={10} />
            Telemetry Analysis
          </h3>
          <div>
            <label className="text-[10px] text-gray-400 mb-1 block">
              Data collection window (minutes)
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={telemetryWindow}
              onChange={(e) => setTelemetryWindow(Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 5)))}
              className="w-full bg-gray-800/50 border border-gray-700/30 rounded-md px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-pit-accent/50"
            />
            <p className="text-[9px] text-gray-600 mt-1">
              How long to collect telemetry before the engineer starts analyzing.
            </p>
          </div>
        </section>

        {/* Keyboard Shortcuts */}
        <section>
          <h3 className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Keyboard size={10} />
            Keyboard Shortcuts
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-gray-400 mb-1 block">Hide / Show Overlay</label>
              <select
                value={toggleOverlay}
                onChange={(e) => setToggleOverlay(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700/30 rounded-md px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-pit-accent/50"
              >
                {SHORTCUT_OPTIONS.map((s) => (
                  <option key={s} value={s}>{formatShortcutLabel(s)}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Status */}
        {status && (
          <div
            className={`text-[10px] text-center ${
              status.includes('✓') ? 'text-pit-accent' : 
              status.includes('✗') ? 'text-pit-danger' : 'text-gray-400'
            }`}
          >
            {status}
          </div>
        )}

        {/* Info */}
        <div className="pt-3 border-t border-gray-800/50">
          <p className="text-[10px] text-gray-600 leading-relaxed">
            Get your API key from{' '}
            <span className="text-pit-info">aistudio.google.com</span>.
            Keys are stored locally and never sent to third parties.
          </p>
        </div>

        {/* Version & Updates */}
        <section className="pt-3 border-t border-gray-800/50">
          <h3 className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Download size={10} />
            Version & Updates
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400">Current Version</span>
              <span className="text-[10px] text-gray-200 font-medium">
                {appVersion || 'dev'}
              </span>
            </div>
            <div>
              {updateStatus === '' && (
                <button
                  onClick={handleCheckUpdate}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded bg-gray-800/50 text-gray-300 border border-gray-700/30 hover:bg-gray-700/50 transition-colors text-[10px]"
                >
                  <RefreshCw size={10} />
                  Check for Updates
                </button>
              )}
              {updateStatus === 'checking' && (
                <span className="text-[10px] text-gray-400">Checking...</span>
              )}
              {updateStatus === 'uptodate' && (
                <span className="text-[10px] text-pit-accent">✓ You're up to date</span>
              )}
              {updateStatus === 'available' && (
                <div className="space-y-1.5">
                  <span className="text-[10px] text-pit-info">
                    v{updateVersion} available!
                  </span>
                  <button
                    onClick={handleDownloadUpdate}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded bg-pit-accent/20 text-pit-accent border border-pit-accent/30 hover:bg-pit-accent/30 transition-colors text-[10px]"
                  >
                    <Download size={10} />
                    Download Update
                  </button>
                </div>
              )}
              {updateStatus === 'downloading' && (
                <span className="text-[10px] text-pit-warn">Downloading...</span>
              )}
              {updateStatus === 'ready' && (
                <button
                  onClick={handleInstallUpdate}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded bg-pit-accent/20 text-pit-accent border border-pit-accent/30 hover:bg-pit-accent/30 transition-colors text-[10px]"
                >
                  <Download size={10} />
                  Restart & Install
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default SettingsPanel;
