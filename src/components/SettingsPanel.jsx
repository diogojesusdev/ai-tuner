import React, { useState, useEffect } from 'react';
import { ArrowLeft, Key, Cpu, Save, Mic, Keyboard } from 'lucide-react';

/**
 * SettingsPanel - Full-page settings view.
 * Configures: Gemini API key, model, PTT key, and all keyboard shortcuts.
 */

const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Fast)' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Advanced)' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Legacy)' },
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
  const [model, setModel] = useState('gemini-2.5-flash');
  const [pttKey, setPttKey] = useState('caps_lock');
  const [toggleOverlay, setToggleOverlay] = useState('F10');
  const [quitShortcut, setQuitShortcut] = useState('CommandOrControl+Shift+Q');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  // Load saved settings from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('pitwall_api_key') || '';
    const savedModel = localStorage.getItem('pitwall_model') || 'gemini-2.5-flash';
    const savedPtt = localStorage.getItem('pitwall_ptt_key') || 'caps_lock';
    const savedToggle = localStorage.getItem('pitwall_shortcut_toggle') || 'F10';
    const savedQuit = localStorage.getItem('pitwall_shortcut_quit') || 'CommandOrControl+Shift+Q';
    setApiKey(savedKey);
    setModel(savedModel);
    setPttKey(savedPtt);
    setToggleOverlay(savedToggle);
    setQuitShortcut(savedQuit);
  }, []);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setStatus('Please enter an API key');
      return;
    }

    setSaving(true);
    setStatus('Saving...');

    // Save to localStorage
    localStorage.setItem('pitwall_api_key', apiKey);
    localStorage.setItem('pitwall_model', model);
    localStorage.setItem('pitwall_ptt_key', pttKey);
    localStorage.setItem('pitwall_shortcut_toggle', toggleOverlay);
    localStorage.setItem('pitwall_shortcut_quit', quitShortcut);

    // Send to Electron main process
    if (window.pitwall) {
      const result = await window.pitwall.setApiKey(apiKey, model);
      await window.pitwall.setPttKey(pttKey);
      await window.pitwall.setShortcuts({
        toggleOverlay,
        quit: quitShortcut,
      });
      if (result.success) {
        setStatus('✓ Settings saved');
      } else {
        setStatus('✗ Failed to connect to Gemini. Check your key.');
      }
    } else {
      setStatus('✓ Settings saved (dev mode)');
    }

    setSaving(false);
  };

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
          <div>
            <label className="text-[10px] text-gray-400 mb-1 block">Push-to-Talk Key</label>
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
            <div>
              <label className="text-[10px] text-gray-400 mb-1 block">Quit Application</label>
              <select
                value={quitShortcut}
                onChange={(e) => setQuitShortcut(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700/30 rounded-md px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-pit-accent/50"
              >
                {SHORTCUT_OPTIONS.map((s) => (
                  <option key={s} value={s}>{formatShortcutLabel(s)}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md bg-pit-accent/20 text-pit-accent border border-pit-accent/30 hover:bg-pit-accent/30 disabled:opacity-50 transition-colors text-xs font-medium"
        >
          <Save size={12} />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>

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
          <p className="text-[10px] text-gray-600 leading-relaxed mt-1">
            PTT key requires a backend restart to take effect.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SettingsPanel;
