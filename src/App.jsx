import React, { useState, useEffect, useCallback } from 'react';
import TelemetryHUD from './components/TelemetryHUD';
import ChatWindow from './components/ChatWindow';
import SettingsPanel from './components/SettingsPanel';
import { Settings, GripVertical } from 'lucide-react';

function App() {
  const [telemetry, setTelemetry] = useState(null);
  const [messages, setMessages] = useState([]);
  const [pendingChanges, setPendingChanges] = useState([]);
  const [backendConnected, setBackendConnected] = useState(false);
  const [telemetryActive, setTelemetryActive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Auto-open settings if no API key is configured
  useEffect(() => {
    const savedKey = localStorage.getItem('pitwall_api_key');
    if (!savedKey) {
      setShowSettings(true);
    } else if (window.pitwall) {
      const savedModel = localStorage.getItem('pitwall_model') || 'gemini-2.5-flash';
      window.pitwall.setApiKey(savedKey, savedModel);
    }
  }, []);

  useEffect(() => {
    if (!window.pitwall) return;

    window.pitwall.onTelemetryUpdate((data) => {
      setTelemetry(data);
      if (!telemetryActive) setTelemetryActive(true);
    });

    window.pitwall.onVoiceTranscript((data) => {
      setMessages((prev) => [
        ...prev,
        { role: 'user', text: data.text, timestamp: data.timestamp },
      ]);
    });

    window.pitwall.onAiResponse((data) => {
      setMessages((prev) => [
        ...prev,
        { role: 'engineer', text: data.reply, timestamp: Date.now() / 1000 },
      ]);
      if (data.pending_changes && data.pending_changes.length > 0) {
        setPendingChanges((prev) => [...prev, ...data.pending_changes]);
      }
    });

    window.pitwall.onBackendStatus((data) => {
      setBackendConnected(data.connected);
    });

    window.pitwall.onTelemetryStatus((data) => {
      setTelemetryActive(data.receiving);
    });

    return () => {
      if (window.pitwall) {
        window.pitwall.removeAllListeners('telemetry-update');
        window.pitwall.removeAllListeners('voice-transcript');
        window.pitwall.removeAllListeners('ai-response');
        window.pitwall.removeAllListeners('backend-status');
        window.pitwall.removeAllListeners('telemetry-status');
      }
    };
  }, []);

  const handleConfirmChanges = useCallback(async (confirmedIds) => {
    if (!window.pitwall) return;
    const result = await window.pitwall.confirmChanges(confirmedIds);
    setPendingChanges(result.remaining || []);
  }, []);

  const handleSendMessage = useCallback(async (text) => {
    if (!window.pitwall) return;
    setMessages((prev) => [
      ...prev,
      { role: 'user', text, timestamp: Date.now() / 1000 },
    ]);
    await window.pitwall.sendMessage(text);
  }, []);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Title Bar (draggable to move window) */}
      <div className="flex items-center gap-2 px-3 py-1.5 glass-panel rounded-b-none border-b-0"
           style={{ WebkitAppRegion: 'drag' }}>
        <GripVertical size={12} className="text-gray-600" />
        <span className="text-[10px] font-medium text-gray-400 flex-1">PITWALL</span>
        {/* Status dots */}
        <div className="flex items-center gap-1.5" style={{ WebkitAppRegion: 'no-drag' }}>
          <div className={`w-2 h-2 rounded-full ${backendConnected ? 'bg-pit-accent' : 'bg-pit-danger'}`}
               title={backendConnected ? 'Backend connected' : 'Backend offline'} />
          <div className={`w-2 h-2 rounded-full ${telemetryActive ? 'bg-pit-accent' : 'bg-pit-warn'}`}
               title={telemetryActive ? 'Telemetry live' : 'No telemetry data'} />
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="hover:text-pit-accent text-gray-500 transition-colors"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          <Settings size={14} />
        </button>
      </div>

      {/* Settings Panel (slides in) */}
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Telemetry HUD */}
        <TelemetryHUD telemetry={telemetry} />

        {/* Chat Window (takes remaining space) */}
        <div className="flex-1 min-h-0">
          <ChatWindow
            messages={messages}
            pendingChanges={pendingChanges}
            onConfirmChanges={handleConfirmChanges}
            onSendMessage={handleSendMessage}
          />
        </div>
      </div>

      {/* Footer with shortcuts hint */}
      <div className="px-3 py-1 text-center text-[9px] text-gray-600 glass-panel rounded-t-none border-t-0">
        F10: Hide/Show • Ctrl+Shift+Q: Quit • CapsLock: Push-to-Talk
      </div>
    </div>
  );
}

export default App;
