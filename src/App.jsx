import React, { useState, useEffect, useCallback, useRef } from 'react';
import TelemetryHUD from './components/TelemetryHUD';
import ChatWindow from './components/ChatWindow';
import TuneSheet from './components/TuneSheet';
import SettingsPanel from './components/SettingsPanel';
import { Settings, GripVertical, MessageCircle, Wrench, X, Square, History, Plus, Trash2 } from 'lucide-react';

const STATE_LABELS = {
  IDLE: { text: 'Idle', color: 'text-gray-500' },
  IDENTIFY_CAR: { text: 'Identify Car', color: 'text-pit-info' },
  COLLECTING_DATA: { text: 'Collecting...', color: 'text-pit-warn' },
  READY: { text: 'Ready', color: 'text-pit-accent' },
  SUGGESTING: { text: 'Suggesting', color: 'text-purple-400' },
  UPDATING_TUNE: { text: 'Updating', color: 'text-pit-info' },
};

function formatTokens(n) {
  if (!n) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

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
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'tune' | 'sessions'
  const [vehicleId, setVehicleId] = useState(null);
  const [agentState, setAgentState] = useState('IDLE');
  const [carName, setCarName] = useState(null);
  const [quickActions, setQuickActions] = useState([]);

  // Session management
  const [sessions, setSessions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pitwall_sessions') || '[]');
    } catch { return []; }
  });
  const [activeSessionId, setActiveSessionId] = useState(() => {
    return localStorage.getItem('pitwall_active_session') || null;
  });
  const [sessionTokens, setSessionTokens] = useState({ input: 0, output: 0 });

  // Refs to avoid stale closures in telemetry listener
  const vehicleIdRef = useRef(vehicleId);
  const sessionsRef = useRef(sessions);
  const activeSessionIdRef = useRef(activeSessionId);
  useEffect(() => { vehicleIdRef.current = vehicleId; }, [vehicleId]);
  useEffect(() => { sessionsRef.current = sessions; }, [sessions]);
  useEffect(() => { activeSessionIdRef.current = activeSessionId; }, [activeSessionId]);

  // Persist sessions list to localStorage
  useEffect(() => {
    localStorage.setItem('pitwall_sessions', JSON.stringify(sessions));
  }, [sessions]);

  // Persist active session ID
  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem('pitwall_active_session', activeSessionId);
    }
  }, [activeSessionId]);

  // Auto-save messages and tokens into active session (debounced)
  useEffect(() => {
    if (!activeSessionId || messages.length === 0) return;
    const timeout = setTimeout(() => {
      setSessions((prev) => prev.map((s) =>
        s.id === activeSessionId
          ? { ...s, messages, carName: carName || s.carName, tokens: sessionTokens, updatedAt: Date.now() }
          : s
      ));
    }, 500);
    return () => clearTimeout(timeout);
  }, [messages, activeSessionId, carName, sessionTokens]);

  // Create or switch session when car changes
  const switchToSession = useCallback((sessionId) => {
    // Save current messages and tokens before switching
    if (activeSessionId && messages.length > 0) {
      setSessions((prev) => prev.map((s) =>
        s.id === activeSessionId
          ? { ...s, messages, carName: carName || s.carName, tokens: sessionTokens, updatedAt: Date.now() }
          : s
      ));
    }
    // Reset session token counter in backend
    if (window.pitwall?.resetSessionTokens) {
      window.pitwall.resetSessionTokens();
    }
    // Load target session
    setActiveSessionId(sessionId);
    const target = sessions.find((s) => s.id === sessionId);
    if (target) {
      setMessages(target.messages || []);
      setCarName(target.carName || null);
      setVehicleId(target.vehicleId || null);
      setPendingChanges([]);
      setQuickActions([]);
      setSessionTokens(target.tokens || { input: 0, output: 0 });
    }
  }, [activeSessionId, messages, carName, sessions, sessionTokens]);

  const createNewSession = useCallback((name, vehId) => {
    const id = `session_${Date.now()}`;
    const newSession = {
      id,
      carName: name || null,
      vehicleId: vehId || null,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    // Save current session first
    if (activeSessionId && messages.length > 0) {
      setSessions((prev) => prev.map((s) =>
        s.id === activeSessionId
          ? { ...s, messages, carName: carName || s.carName, updatedAt: Date.now() }
          : s
      ));
    }
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(id);
    setMessages([]);
    setPendingChanges([]);
    setQuickActions([]);
    setCarName(name || null);
    setVehicleId(vehId || null);
    return id;
  }, [activeSessionId, messages, carName]);

  const deleteSession = useCallback((sessionId) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
      setMessages([]);
      setCarName(null);
    }
  }, [activeSessionId]);

  const deleteAllSessions = useCallback(() => {
    setSessions([]);
    setActiveSessionId(null);
    setMessages([]);
    setCarName(null);
    localStorage.removeItem('pitwall_sessions');
    localStorage.removeItem('pitwall_active_session');
  }, []);

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

  // Load active session on startup
  useEffect(() => {
    if (activeSessionId) {
      const session = sessions.find((s) => s.id === activeSessionId);
      if (session) {
        setMessages(session.messages || []);
        setCarName(session.carName || null);
        setVehicleId(session.vehicleId || null);
      }
    }
  }, []); // Only on mount

  useEffect(() => {
    if (!window.pitwall) return;

    window.pitwall.onTelemetryUpdate((data) => {
      setTelemetry(data);
      if (!telemetryActive) setTelemetryActive(true);
      if (data.vehicle_id && data.vehicle_id !== vehicleIdRef.current) {
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

    window.pitwall.onCarDetected((data) => {
      // Silently update car context — no session creation, no LLM prompting
      if (data.car_name) {
        setCarName(data.car_name);
      }
      // Show a subtle system notification in current chat
      const label = data.car_name
        ? `${data.car_name}${data.discipline ? ` (${data.discipline})` : ''}`
        : `Vehicle #${data.vehicle_id}`;
      setMessages((prev) => [
        ...prev,
        { role: 'system', text: `🚗 Detected: ${label}`, timestamp: Date.now() / 1000 },
      ]);
    });

    window.pitwall.onTokenUsage((data) => {
      if (data?.session) {
        setSessionTokens(data.session);
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
        window.pitwall.removeAllListeners('car-detected');
        window.pitwall.removeAllListeners('token-usage');
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
    // Auto-create session if none active
    if (!activeSessionId) {
      createNewSession(carName, vehicleId);
    }
    setMessages((prev) => [
      ...prev,
      { role: 'user', text, images, timestamp: Date.now() / 1000 },
    ]);
    await window.pitwall.sendMessage(text, images);
  }, [activeSessionId, carName, vehicleId, createNewSession]);

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
              AI Engineer
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
            <button
              onClick={() => setActiveTab('sessions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] border-b-2 transition-colors ${
                activeTab === 'sessions'
                  ? 'border-pit-accent text-pit-accent'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <History size={12} />
              AI Sessions
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
            {activeTab === 'chat' && (
              <div className="h-full flex flex-col">
                {(sessionTokens.input > 0 || sessionTokens.output > 0) && (
                  <div className="px-4 py-1 border-b border-gray-800/50 flex items-center gap-2">
                    <span className="text-[9px] text-gray-500">Session tokens:</span>
                    <span className="text-[9px] text-pit-info tabular-nums">{formatTokens(sessionTokens.input)} in</span>
                    <span className="text-[9px] text-pit-accent tabular-nums">{formatTokens(sessionTokens.output)} out</span>
                  </div>
                )}
                <div className="flex-1 min-h-0">
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
                </div>
              </div>
            )}
            {activeTab === 'tune' && (
              <TuneSheet vehicleId={vehicleId} />
            )}
            {activeTab === 'sessions' && (
              <div className="h-full flex flex-col">
                <div className="px-4 py-2 border-b border-gray-800/50 flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-200">AI Engineer Sessions</span>
                  {sessions.length > 0 && (
                    <button
                      onClick={() => { if (confirm('Delete all chat sessions? Your car tunes will NOT be affected.')) deleteAllSessions(); }}
                      className="ml-auto flex items-center gap-1 px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 text-[10px] transition-colors"
                      title="Delete all sessions"
                    >
                      <Trash2 size={10} />
                      Clear All
                    </button>
                  )}
                  <button
                    onClick={() => { createNewSession(); setActiveTab('chat'); }}
                    className={`${sessions.length === 0 ? 'ml-auto' : ''} flex items-center gap-1 px-2 py-1 rounded bg-pit-accent/20 text-pit-accent border border-pit-accent/30 hover:bg-pit-accent/30 text-[10px] transition-colors`}
                  >
                    <Plus size={10} />
                    New
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5">
                  {sessions.length === 0 && (
                    <div className="text-center text-gray-600 text-xs mt-8">
                      No sessions yet. Start talking to your AI engineer!
                    </div>
                  )}
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors ${
                        session.id === activeSessionId
                          ? 'bg-pit-accent/10 border border-pit-accent/30'
                          : 'bg-gray-800/30 border border-gray-700/20 hover:bg-gray-800/60'
                      }`}
                      onClick={() => { switchToSession(session.id); setActiveTab('chat'); }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-200 truncate">
                          {session.carName || `Vehicle ${session.vehicleId || '—'}`}
                        </div>
                        <div className="text-[9px] text-gray-500">
                          {session.messages?.length || 0} messages · {new Date(session.updatedAt || session.createdAt).toLocaleDateString()}
                          {session.tokens && (session.tokens.input > 0 || session.tokens.output > 0) && (
                            <span className="ml-1.5 text-gray-600">· {formatTokens(session.tokens.input + session.tokens.output)} tok</span>
                          )}
                        </div>
                      </div>
                      {session.id === activeSessionId && (
                        <span className="text-[8px] text-pit-accent uppercase font-medium">Active</span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                        className="text-gray-600 hover:text-pit-danger transition-colors p-0.5"
                        title="Delete session"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
