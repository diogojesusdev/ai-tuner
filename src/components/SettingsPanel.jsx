import React, { useState, useEffect } from 'react';
import { X, Key, Cpu, Save } from 'lucide-react';

/**
 * SettingsPanel - Configuration for Gemini API key and model selection.
 */

const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Fast)' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Advanced)' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Legacy)' },
];

function SettingsPanel({ onClose }) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-2.5-flash');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  // Load saved settings from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('pitwall_api_key') || '';
    const savedModel = localStorage.getItem('pitwall_model') || 'gemini-2.5-flash';
    setApiKey(savedKey);
    setModel(savedModel);
  }, []);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setStatus('Please enter an API key');
      return;
    }

    setSaving(true);
    setStatus('Connecting...');

    // Save to localStorage
    localStorage.setItem('pitwall_api_key', apiKey);
    localStorage.setItem('pitwall_model', model);

    // Send to Electron main process
    if (window.pitwall) {
      const result = await window.pitwall.setApiKey(apiKey, model);
      if (result.success) {
        setStatus('✓ Connected successfully');
      } else {
        setStatus('✗ Connection failed. Check your key.');
      }
    } else {
      setStatus('✓ Settings saved (dev mode)');
    }

    setSaving(false);
  };

  return (
    <div className="glass-panel p-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-200">Settings</span>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* API Key */}
      <div className="space-y-3">
        <div>
          <label className="flex items-center gap-1.5 text-[10px] text-gray-500 uppercase mb-1">
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

        {/* Model Selection */}
        <div>
          <label className="flex items-center gap-1.5 text-[10px] text-gray-500 uppercase mb-1">
            <Cpu size={10} />
            Model
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full bg-gray-800/50 border border-gray-700/30 rounded-md px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-pit-accent/50"
          >
            {AVAILABLE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-md bg-pit-accent/20 text-pit-accent border border-pit-accent/30 hover:bg-pit-accent/30 disabled:opacity-50 transition-colors text-xs font-medium"
        >
          <Save size={12} />
          {saving ? 'Saving...' : 'Save & Connect'}
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
      </div>

      {/* Info */}
      <div className="mt-4 pt-3 border-t border-gray-800/50">
        <p className="text-[10px] text-gray-600 leading-relaxed">
          Get your API key from{' '}
          <span className="text-pit-info">aistudio.google.com</span>.
          Keys are stored locally and never sent to third parties.
        </p>
      </div>
    </div>
  );
}

export default SettingsPanel;
