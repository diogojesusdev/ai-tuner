import React, { useState, useEffect, useCallback } from 'react';
import TelemetryHUD from './components/TelemetryHUD';
import ChatWindow from './components/ChatWindow';
import TuneSheet from './components/TuneSheet';
import SettingsPanel from './components/SettingsPanel';
import { Settings, GripVertical, MessageCircle, Wrench, X, Square } from 'lucide-react';

const STATE_LABELS = {
  IDLE: { text: 'Idle', color: 'text-gray-500' },
  IDENTIFY_CAR: { text: 'Identify Car', color: 'text-pit-info' },
  COLLECTING_DATA: { text: 'Collecting...', color: 'text-pit-warn' },
  READY: { text: 'Ready', color: 'text-pit-accent' },
  SUGGESTING: { text: 'Suggesting', color: 'text-purple-400' },
  UPDATING_TUNE: { text: 'Updating', color: 'text-pit-info' },
};

function AgentStatePill({ state, onStopCollecting, maxMinutes }) {
  const info = STATE_LABELS[state] || STATE_LABELS.IDLE;

  if (state === 'COLLECTING_DATA') {
    return (
      <div className="flex items-center gap-1.5">
        <span className={`text-[9px] px-1.5 py-0.5 rounded border border-yellow-700/50 ${info.color}`}>
          {info.text} <span className="text-gray-500">max {maxMinutes}m</span>
        </span>
        <button
          onClick={onStopCollecting}
          className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded border border-pit-accent/40 bg-pit-accent/10 text-pit-accent hover:bg-pit-accent/20 transition-colors"
          title="Stop collecting and analyze now"
        >
          <Square size={8} className="fill-current" />
          Done
        </button>
      </div>
    );
  }

  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded border border-gray-700/50 ${info.color}`}>
      {info.text}
    </span>
  );
}

function App() {
  const [telemetry, setTelemetry] = useState(null);
  const [messages, setMessages] = useState([]);
  const [pendingChanges, setPendingChanges] = useState([]);
  const [backendConnected, setBackendConnected] = useState(false);
  const [telemetryActive, setTelemetryActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'tune'
  const [vehicleId, setVehicleId] = useState(null);
  const [agentState, setAgentState] = useState('IDLE');
  const [carName, setCarName] = useState(null);
  const [quickActions, setQuickActions] = useState([]);

  // Auto-open settings if no API key is configured
  useEffect(() => {
    const savedKey = localStorage.getItem('pitwall_api_key');
    if (!savedKey) {
      setShowSettings(true);
    } else if (window.pitwall) {
      const savedModel = localStorage.getItem('pitwall_model') || 'gemini-3.1-flash-lite';
      window.pitwall.setApiKey(savedKey, savedModel);
    }
  }, []);

  useEffect(() => {
    if (!window.pitwall) return;

    window.pitwall.onTelemetryUpdate((data) => {
      setTelemetry(data);
      if (!telemetryActive) setTelemetryActive(true);
      if (data.vehicle_id && data.vehicle_id !== vehicleId) {
        setVehicleId(data.vehicle_id);
      }
    });

    window.pitwall.onVoiceTranscript((data) => {
      setMessages((prev) => [
        ...prev,
        { role: 'user', text: data.text, timestamp: data.timestamp },
      ]);
      // Dismiss pending changes when user speaks a new message
      setPendingChanges([]);
    });

    window.pitwall.onAiResponse((data) => {
      setMessages((prev) => [
        ...prev,
        { role: 'engineer', text: data.reply, timestamp: Date.now() / 1000 },
      ]);
      if (data.pending_changes && data.pending_changes.length > 0) {
        setPendingChanges((prev) => [...prev, ...data.pending_changes]);
      }
      // Handle quick-action prompts from LLM
      if (data.user_input_request) {
        const req = data.user_input_request;
        if (req.type === 'hp_tier') {
          setQuickActions([
            { label: 'Low HP (250–400)', value: 'Low HP, 250-400 hp' },
            { label: 'Mid HP (400–700)', value: 'Mid HP, 400-700 hp' },
            { label: 'High HP (700+)', value: 'High HP, 700+ hp' },
          ]);
        } else if (req.type === 'discipline') {
          // Only show discipline quick-select when car name is already known
          if (carName) {
            setQuickActions([
              { label: 'Racing', value: 'Racing' },
              { label: 'Drifting', value: 'Drifting' },
              { label: 'Rally', value: 'Rally' },
              { label: 'Drag', value: 'Drag' },
            ]);
          }
        } else if (req.type === 'go_test') {
          setQuickActions([
            { label: '👍 Go test!', value: '__GO_TEST__' },
          ]);
        } else {
          setQuickActions([]);
        }
      } else {
        setQuickActions([]);
      }
    });

    window.pitwall.onBackendStatus((data) => {
      setBackendConnected(data.connected);
    });

    window.pitwall.onTelemetryStatus((data) => {
      setTelemetryActive(data.receiving);
    });

    window.pitwall.onListeningState((data) => {
      setIsListening(data.listening);
    });

    window.pitwall.onAiThinking((data) => {
      setIsThinking(data.thinking);
    });

    window.pitwall.onVoiceError((data) => {
      // Show voice errors as system messages in chat so user knows what happened
      setMessages((prev) => [
        ...prev,
        { role: 'system', text: `⚠️ ${data.error}`, timestamp: data.timestamp },
      ]);
    });

    window.pitwall.onAgentState((data) => {
      setAgentState(data.state);
    });

    window.pitwall.onCarMemory((data) => {
      if (data && data.car_name) {
        setCarName(data.car_name);
      }
    });

    return () => {
      if (window.pitwall) {
        window.pitwall.removeAllListeners('telemetry-update');
        window.pitwall.removeAllListeners('voice-transcript');
        window.pitwall.removeAllListeners('ai-response');
        window.pitwall.removeAllListeners('backend-status');
        window.pitwall.removeAllListeners('telemetry-status');
        window.pitwall.removeAllListeners('listening-state');
        window.pitwall.removeAllListeners('ai-thinking');
        window.pitwall.removeAllListeners('voice-error');
        window.pitwall.removeAllListeners('agent-state');
        window.pitwall.removeAllListeners('car-memory');
      }
    };
  }, []);

  const handleConfirmChanges = useCallback(async (confirmedIds) => {
    if (!window.pitwall) return;
    const result = await window.pitwall.confirmChanges(confirmedIds);
    setPendingChanges(result.remaining || []);
  }, []);

  const handleSendMessage = useCallback(async (text, images) => {
    if (!window.pitwall) return;
    setMessages((prev) => [
      ...prev,
      { role: 'user', text, images, timestamp: Date.now() / 1000 },
    ]);
    await window.pitwall.sendMessage(text, images);
  }, []);

  const handleQuickAction = useCallback(async (value) => {
    setQuickActions([]);
    if (!window.pitwall) return;

    // Special action: transition to collecting data
    if (value === '__GO_TEST__') {
      await window.pitwall.startCollecting();
      return;
    }

    setMessages((prev) => [
      ...prev,
      { role: 'user', text: value, timestamp: Date.now() / 1000 },
    ]);
    await window.pitwall.sendMessage(value);
  }, []);

  const handleStopCollecting = useCallback(async () => {
    if (!window.pitwall) return;
    await window.pitwall.stopCollecting();
  }, []);

  const handleDismissChanges = useCallback(() => {
    setPendingChanges([]);
  }, []);

  return (
    <div className="w-full h-full flex flex-col glass-panel">
      {/* Title Bar (draggable to move window) */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-800/50"
           style={{ WebkitAppRegion: 'drag' }}>
        <GripVertical size={12} className="text-gray-600" />
        <span className="text-[10px] font-medium text-gray-400 flex-1">AI TUNER</span>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`hover:text-pit-accent transition-colors ${showSettings ? 'text-pit-accent' : 'text-gray-500'}`}
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          <Settings size={14} />
        </button>
        <button
          onClick={() => window.close()}
          className="text-gray-500 hover:text-pit-danger transition-colors"
          style={{ WebkitAppRegion: 'no-drag' }}
          title="Close PitWall"
        >
          <X size={14} />
        </button>
      </div>

      {/* Content area: Settings OR Main view */}
      {showSettings ? (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Telemetry HUD (compact speed/RPM bar) */}
          <TelemetryHUD telemetry={telemetry} telemetryActive={telemetryActive} carName={carName} />

          {/* Tab navigation + agent state */}
          <div className="flex items-center border-b border-gray-800/50 px-2">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] border-b-2 transition-colors ${
                activeTab === 'chat'
                  ? 'border-pit-accent text-pit-accent'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <MessageCircle size={12} />
              Engineer
            </button>
            <button
              onClick={() => setActiveTab('tune')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] border-b-2 transition-colors ${
                activeTab === 'tune'
                  ? 'border-pit-accent text-pit-accent'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <Wrench size={12} />
              Tune
            </button>
            {/* Agent state pill */}
            <div className="ml-auto">
              <AgentStatePill
                state={agentState}
                onStopCollecting={handleStopCollecting}
                maxMinutes={parseInt(localStorage.getItem('pitwall_telemetry_window') || '5', 10)}
              />
            </div>
          </div>

          {/* Tab content */}
          <div className="flex-1 min-h-0">
            {activeTab === 'chat' ? (
              <ChatWindow
                messages={messages}
                pendingChanges={pendingChanges}
                onConfirmChanges={handleConfirmChanges}
                onDismissChanges={handleDismissChanges}
                onSendMessage={handleSendMessage}
                isListening={isListening}
                isThinking={isThinking}
                quickActions={quickActions}
                onQuickAction={handleQuickAction}
              />
            ) : (
              <TuneSheet vehicleId={vehicleId} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
