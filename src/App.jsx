import React, { useState, useEffect, useCallback } from 'react';
import TelemetryHUD from './components/TelemetryHUD';
import ChatWindow from './components/ChatWindow';
import SettingsPanel from './components/SettingsPanel';
import { Settings } from 'lucide-react';

function App() {
  const [telemetry, setTelemetry] = useState(null);
  const [messages, setMessages] = useState([]);
  const [pendingChanges, setPendingChanges] = useState([]);
  const [backendConnected, setBackendConnected] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showChat, setShowChat] = useState(true);

  // Auto-open settings if no API key is configured
  useEffect(() => {
    const savedKey = localStorage.getItem('pitwall_api_key');
    if (!savedKey) {
      setShowSettings(true);
    } else if (window.pitwall) {
      // Re-initialize Gemini with saved key on app start
      const savedModel = localStorage.getItem('pitwall_model') || 'gemini-2.5-flash';
      window.pitwall.setApiKey(savedKey, savedModel);
    }
  }, []);

  useEffect(() => {
    if (!window.pitwall) return;

    window.pitwall.onTelemetryUpdate((data) => {
      setTelemetry(data);
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

    return () => {
      if (window.pitwall) {
        window.pitwall.removeAllListeners('telemetry-update');
        window.pitwall.removeAllListeners('voice-transcript');
        window.pitwall.removeAllListeners('ai-response');
        window.pitwall.removeAllListeners('backend-status');
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

  // Document-level detection: when Electron forwards mouse events over
  // non-transparent pixels, the document receives mouseenter/mouseleave.
  // This toggles click-through so clicks land on panels vs pass to the game.
  useEffect(() => {
    const onEnter = () => {
      if (window.pitwall) window.pitwall.setClickThrough(false);
    };
    const onLeave = () => {
      if (window.pitwall) window.pitwall.setClickThrough(true);
    };
    document.documentElement.addEventListener('mouseenter', onEnter);
    document.documentElement.addEventListener('mouseleave', onLeave);
    return () => {
      document.documentElement.removeEventListener('mouseenter', onEnter);
      document.documentElement.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <div className="w-screen h-screen relative">
      {/* Telemetry HUD - Bottom Left */}
      <div className="absolute bottom-4 left-4">
        <TelemetryHUD telemetry={telemetry} />
      </div>

      {/* Chat Window - Right Side */}
      {showChat && (
        <div className="absolute top-4 right-4 bottom-4 w-96">
          <ChatWindow
            messages={messages}
            pendingChanges={pendingChanges}
            onConfirmChanges={handleConfirmChanges}
            onSendMessage={handleSendMessage}
          />
        </div>
      )}

      {/* Settings Button - Top Left */}
      <div className="absolute top-4 left-4">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="glass-panel p-2 hover:border-pit-accent transition-colors"
        >
          <Settings size={18} className="text-pit-accent" />
        </button>

        {/* Connection Status Indicator */}
        <div className="mt-2 flex items-center gap-2 glass-panel px-3 py-1.5 text-xs">
          <div
            className={`w-2 h-2 rounded-full ${
              backendConnected ? 'bg-pit-accent' : 'bg-pit-danger'
            }`}
          />
          <span className="text-gray-400">
            {backendConnected ? 'Backend Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-16 left-4 w-80">
          <SettingsPanel onClose={() => setShowSettings(false)} />
        </div>
      )}
    </div>
  );
}

export default App;
