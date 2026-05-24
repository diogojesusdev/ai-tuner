/**
 * AI Tuner - Electron Main Process
 * Handles: transparent window, Gemini API, WebSocket client, IPC, auto-updates
 */

const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const WebSocket = require('ws');
const { GoogleGenAI } = require('@google/genai');
const { autoUpdater } = require('electron-updater');

// Auto-updater configuration
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

let mainWindow = null;
let wsConnection = null;
let backendProcess = null;
let overlayVisible = true;
let genaiClient = null;
let chatSession = null;
let telemetryReceived = false;

// State
let apiKey = '';
let modelName = 'gemini-3.1-flash-lite';
let pendingChanges = [];
let currentVehicleId = null;
let telemetryWindowMinutes = 5; // configurable via settings

// Agent State Machine
const AGENT_STATES = {
  IDLE: 'IDLE',                    // No car detected, waiting
  IDENTIFY_CAR: 'IDENTIFY_CAR',   // New car detected, need name + discipline
  COLLECTING_DATA: 'COLLECTING_DATA', // User driving, accumulating telemetry
  READY: 'READY',                  // Enough data, can analyze
  SUGGESTING: 'SUGGESTING',        // Proposed changes, waiting confirmation
  UPDATING_TUNE: 'UPDATING_TUNE',  // Confirmed changes, asking for absolute values
};

let agentState = AGENT_STATES.IDLE;
let carIdentified = false;
let dataCollectionStart = null;
let currentCarMemory = null;

// Configurable shortcuts (defaults)
let shortcuts = {
  toggleOverlay: 'F10',
};

const SYSTEM_PROMPT = `You are an elite pit-lane race car engineer operating in a structured workflow. You help optimize car setups using live telemetry and driver feedback. Disciplines: racing, drifting, rally, drag.

## Your Workflow States
You are given a "current_state" in every message. Follow the protocol for that state:

### IDENTIFY_CAR
The system detected a new car (vehicle_id provided). Ask the driver: what car is this? Keep it to ONE short sentence.
Once they confirm the car name, ask which discipline (racing, drifting, rally, drag) using user_input_request with type "discipline".
Once the driver confirms **drifting**, ask the HP tier using user_input_request with type "hp_tier". Do NOT ask about HP tier upfront or for non-drifting disciplines.
Store car_name, discipline, and hp_tier via tune_updates when confirmed.
IMPORTANT: Do NOT bundle multiple questions. Ask one thing at a time. Keep all replies in this state extremely short (1-2 sentences max).

### COLLECTING_DATA  
The driver is actively driving to build up telemetry history. Acknowledge this, tell them you're watching, and let them know when you have enough data. You can answer brief questions but don't suggest tune changes yet.

### READY
You have sufficient telemetry data. You can now:
- Proactively offer observations about the car's behavior based on the telemetry
- Wait for the driver to describe issues  
- Suggest relative adjustments when asked
Always reference the telemetry data to justify your suggestions (tire temps, slip ratios, suspension bottoming, G-forces, input patterns).

### SUGGESTING
You've proposed changes. Wait for the driver to confirm what they applied.

### UPDATING_TUNE
The driver confirmed they applied changes. Ask for the new absolute values so you can record them (e.g., "What's your rear tire pressure now?").

## Telemetry Interpretation Guide
You receive a rich telemetry summary. Key things to look for:
- **Tire temps**: Large L/R delta = alignment issue. Front/rear delta = balance issue. Over 100C = overheating.
- **Suspension travel**: max near 1.0 = bottoming out (springs too soft / ride height too low). pct_bottoming_out shows how often.
- **Slip ratio**: >0.2 = wheelspin (traction loss). Negative = lockup under braking.
- **Slip angle**: Higher rear than front = oversteer tendency. Higher front = understeer. balance_indicator tells you directly.
- **G-forces**: Peak lateral shows cornering intensity. Helps calibrate suggestions to driving style.
- **Driver inputs**: High avg_steering_magnitude = corrections (instability). time_full_throttle = how aggressive they are.

## Response Format
You MUST reply as JSON:
{
  "reply": "Your conversational message to the driver",
  "pending_changes": [
    { "id": "unique-id", "action": "Specific adjustment description" }
  ],
  "tune_updates": { "field_key": "new_absolute_value" },
  "next_state": "READY",
  "user_input_request": {
    "type": "car_identity | tune_values | confirmation | freeform",
    "fields": ["field_name_1", "field_name_2"]
  }
}

## Field Definitions
- "reply": Natural language response (always required)
- "pending_changes": Array of suggested adjustments (empty if none). Each has a unique "id" and "action" string. When you know the current value, ALWAYS include the resulting value in the action like: "Increase rear tire pressure by +0.3 Bar (2.4 → 2.7)". This saves the driver from doing mental math.
- "tune_updates": Object mapping tune keys to new absolute values. Only include when you KNOW the absolute value. Keys: tire_pressure_fl, tire_pressure_fr, tire_pressure_rl, tire_pressure_rr, camber_fl, camber_fr, camber_rl, camber_rr, toe_fl, toe_fr, toe_rl, toe_rr, spring_front, spring_rear, ride_height_front, ride_height_rear, bump_front, bump_rear, rebound_front, rebound_rear, arb_front, arb_rear, aero_front, aero_rear, brake_balance, brake_pressure, diff_accel, diff_decel, final_drive.
- "next_state": Suggest what state the agent should transition to. Options: IDENTIFY_CAR, COLLECTING_DATA, READY, SUGGESTING, UPDATING_TUNE.
- "user_input_request": When you need structured input from the user. "type" indicates what kind of data you need. Types: "discipline" (shows racing/drifting/rally/drag buttons), "hp_tier" (shows low/mid/high HP buttons), "car_identity" (ask for car name), "tune_values" (ask for tune fields), "go_test" (shows a "Go test!" button — use this when telling the driver to go back on track to test changes), "confirmation", "freeform". "fields" lists the specific tune keys if requesting tune values.

## Rules
- You do NOT know exact slider values. Suggest RELATIVE adjustments ("add 2 clicks", "soften by 0.1 Bar").
- When current tune values ARE available in the context (car_memory.tune), include resulting values in pending_changes: "Increase X by +0.3 (2.4 → 2.7)". This is critical for UX — the driver shouldn't have to do math.
- Only transition to SUGGESTING when you actually have pending_changes.
- Reference specific telemetry values when explaining reasoning (e.g., "Your rear slip angle is averaging 12° vs 6° front — classic oversteer").
- Be concise — the driver is focused on the game. Keep non-technical interactions (identity, discipline, confirmation) to 1-2 sentences max. No filler, no greetings, no "welcome" messages.
- When telling the driver to go test their changes on track, ALWAYS include user_input_request with type "go_test". This gives them a clear button to press when they're ready.
- If current tune values are empty/unknown, ask the user to provide their current settings before suggesting changes.`;

function createWindow() {
  const isDev = !app.isPackaged;

  mainWindow = new BrowserWindow({
    width: 500,
    height: 700,
    x: 50,
    y: 50,
    transparent: true,
    frame: false,
    hasShadow: false,
    alwaysOnTop: true,
    resizable: true,
    minimizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setAlwaysOnTop(true, 'floating');

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      console.log('[UI] Dev server not running, loading from dist/');
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ============ WebSocket Connection to Python Backend ============

function connectWebSocket() {
  const WS_URL = 'ws://127.0.0.1:8765';
  
  wsConnection = new WebSocket(WS_URL);

  wsConnection.on('open', () => {
    console.log('[WS] Connected to Python backend');
    if (mainWindow) {
      mainWindow.webContents.send('backend-status', { connected: true });
    }
  });

  wsConnection.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      handleBackendMessage(msg);
    } catch (e) {
      console.error('[WS] Parse error:', e.message);
    }
  });

  wsConnection.on('close', () => {
    console.log('[WS] Disconnected from backend. Reconnecting in 3s...');
    telemetryReceived = false; // Reset so UI gets notified on reconnect
    if (mainWindow) {
      mainWindow.webContents.send('backend-status', { connected: false });
      mainWindow.webContents.send('telemetry-status', { receiving: false });
    }
    setTimeout(connectWebSocket, 3000);
  });

  wsConnection.on('error', (err) => {
    // Suppress connection refused errors during reconnect
    if (err.code !== 'ECONNREFUSED') {
      console.error('[WS] Error:', err.message);
    }
  });
}

function handleBackendMessage(msg) {
  if (!mainWindow) return;

  switch (msg.type) {
    case 'TELEMETRY_UPDATE':
      if (!telemetryReceived) {
        telemetryReceived = true;
        console.log('[Telemetry] Receiving game data!');
        mainWindow.webContents.send('telemetry-status', { receiving: true });
      }
      mainWindow.webContents.send('telemetry-update', msg.data);
      
      // Detect car change → trigger state machine
      if (msg.data.vehicle_id && msg.data.vehicle_id !== currentVehicleId) {
        currentVehicleId = msg.data.vehicle_id;
        onCarChanged(currentVehicleId);
      }
      break;

    case 'VOICE_TRANSCRIPT':
      mainWindow.webContents.send('voice-transcript', msg.data);
      // Automatically send to Gemini
      processUserMessage(msg.data.text);
      break;

    case 'VOICE_ERROR':
      // STT failed or produced no output — notify UI so user gets feedback
      console.log('[STT] Error:', msg.data.error);
      mainWindow.webContents.send('voice-error', msg.data);
      break;

    case 'LISTENING_STATE':
      mainWindow.webContents.send('listening-state', msg.data);
      // If user starts speaking while AI is thinking, cancel the pending request
      if (msg.data.listening && isAiThinking) {
        aiRequestId++; // Invalidate any in-flight response
        isAiThinking = false;
        mainWindow.webContents.send('ai-thinking', { thinking: false });
        console.log('[Agent] AI request cancelled — user started speaking');
      }
      break;

    case 'TELEMETRY_SUMMARY':
      // Stored for next LLM call
      lastTelemetrySummary = msg.data;
      break;

    case 'CAR_MEMORY':
      if (pendingTuneResolve) {
        pendingTuneResolve(msg.data);
        pendingTuneResolve = null;
      }
      currentCarMemory = msg.data;
      mainWindow.webContents.send('car-memory', msg.data);
      break;
  }
}

let lastTelemetrySummary = {};
let aiRequestId = 0; // Incremented per request, used to discard stale responses
let isAiThinking = false;

// ============ Agent State Machine ============

function setAgentState(newState) {
  agentState = newState;
  console.log(`[Agent] State → ${newState}`);
  if (mainWindow) {
    mainWindow.webContents.send('agent-state', { state: newState });
  }
}

async function onCarChanged(vehicleId) {
  console.log(`[Agent] Car changed to ID: ${vehicleId}`);
  
  // Load car memory from backend
  currentCarMemory = null;
  sendToBackend('GET_CAR_MEMORY', { vehicle_id: vehicleId });
  await new Promise(resolve => setTimeout(resolve, 500));
  
  if (currentCarMemory && currentCarMemory.car_name) {
    // Car already identified — check if we have tune data
    carIdentified = true;
    dataCollectionStart = Date.now();
    setAgentState(AGENT_STATES.COLLECTING_DATA);
    
    // Notify UI
    if (mainWindow) {
      mainWindow.webContents.send('ai-response', {
        reply: `Recognized: ${currentCarMemory.car_name} (${currentCarMemory.discipline || 'unknown discipline'}). Drive for a bit so I can read your telemetry.`,
        pending_changes: [],
      });
    }
  } else {
    // Unknown car — need identification
    carIdentified = false;
    setAgentState(AGENT_STATES.IDENTIFY_CAR);
    
    if (genaiClient && apiKey) {
      // Ask LLM to prompt the user
      processAgentMessage();
    } else {
      if (mainWindow) {
        mainWindow.webContents.send('ai-response', {
          reply: `New car detected (ID: ${vehicleId}). What car is this?`,
          pending_changes: [],
        });
      }
    }
  }
}

function checkDataCollectionComplete() {
  if (agentState !== AGENT_STATES.COLLECTING_DATA) return false;
  if (!dataCollectionStart) return false;
  const elapsed = (Date.now() - dataCollectionStart) / 1000 / 60; // minutes
  return elapsed >= telemetryWindowMinutes;
}

async function processAgentMessage() {
  // Agent-initiated message (no user text) — used for state transitions
  if (!genaiClient || !apiKey) return;
  
  const contextPayload = buildContextPayload(null);
  
  try {
    const response = await chatSession.sendMessage({
      message: JSON.stringify(contextPayload),
    });
    handleAIResponse(response.text);
  } catch (e) {
    console.error('[Gemini] Agent message error:', e.message);
  }
}

function sendToBackend(type, data) {
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    wsConnection.send(JSON.stringify({ type, data }));
  }
}

// ============ Gemini AI Integration ============

function initializeGenAI(key, model) {
  apiKey = key;
  modelName = model || 'gemini-3.1-flash-lite';
  
  try {
    genaiClient = new GoogleGenAI({ apiKey });
    chatSession = genaiClient.chats.create({
      model: modelName,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
      },
    });
    console.log(`[Gemini] Initialized with model: ${modelName}`);
    return true;
  } catch (e) {
    console.error('[Gemini] Init error:', e.message);
    return false;
  }
}

function buildContextPayload(userText) {
  // Check if we should auto-transition from COLLECTING_DATA to READY
  if (checkDataCollectionComplete()) {
    setAgentState(AGENT_STATES.READY);
  }

  const payload = {
    current_state: agentState,
    vehicle_id: currentVehicleId,
    telemetry_window_minutes: telemetryWindowMinutes,
  };

  if (userText) {
    payload.user_prompt = userText;
  } else {
    payload.system_trigger = true;
  }

  // Include telemetry summary if available
  if (lastTelemetrySummary && Object.keys(lastTelemetrySummary).length > 0) {
    payload.telemetry_summary = lastTelemetrySummary;
  }

  // Include car memory if available
  if (currentCarMemory) {
    payload.car_memory = {
      car_name: currentCarMemory.car_name || null,
      discipline: currentCarMemory.discipline || null,
      hp_tier: currentCarMemory.hp_tier || null,
      tune: currentCarMemory.tune || {},
      past_modifications: (currentCarMemory.past_modifications || []).slice(-10),
    };
  }

  // Include data collection time remaining
  if (agentState === AGENT_STATES.COLLECTING_DATA && dataCollectionStart) {
    const elapsed = (Date.now() - dataCollectionStart) / 1000 / 60;
    payload.data_collection_minutes_elapsed = Math.round(elapsed * 10) / 10;
    payload.data_collection_minutes_target = telemetryWindowMinutes;
  }

  return payload;
}

function handleAIResponse(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { reply: text, pending_changes: [] };
  }

  // Handle state transition suggested by LLM
  if (parsed.next_state && AGENT_STATES[parsed.next_state]) {
    setAgentState(parsed.next_state);
  }

  // Update pending changes state
  if (parsed.pending_changes && parsed.pending_changes.length > 0) {
    pendingChanges = parsed.pending_changes;
    if (agentState !== AGENT_STATES.SUGGESTING) {
      setAgentState(AGENT_STATES.SUGGESTING);
    }
  }

  // If LLM provided tune updates, save and notify UI
  if (parsed.tune_updates && Object.keys(parsed.tune_updates).length > 0) {
    sendToBackend('UPDATE_CAR_MEMORY', {
      vehicle_id: currentVehicleId,
      updates: { tune: parsed.tune_updates },
    });
    if (mainWindow) {
      mainWindow.webContents.send('tune-update', { tune: parsed.tune_updates });
    }
  }

  // If LLM identified the car (user_input_request of type car_identity was fulfilled)
  if (parsed.tune_updates && (parsed.tune_updates.car_name || parsed.tune_updates.discipline || parsed.tune_updates.hp_tier)) {
    // Save car identity
    const updates = {};
    if (parsed.tune_updates.car_name) updates.car_name = parsed.tune_updates.car_name;
    if (parsed.tune_updates.discipline) updates.discipline = parsed.tune_updates.discipline;
    if (parsed.tune_updates.hp_tier) updates.hp_tier = parsed.tune_updates.hp_tier;
    sendToBackend('UPDATE_CAR_MEMORY', { vehicle_id: currentVehicleId, updates });
  }

  // Send response to renderer
  if (mainWindow) {
    mainWindow.webContents.send('ai-response', parsed);
  }

  // Speak the reply via Python TTS
  if (parsed.reply) {
    sendToBackend('PLAY_AUDIO', { text: parsed.reply });
  }
}

async function processUserMessage(userText, images) {
  if (!genaiClient || !apiKey) {
    if (mainWindow) {
      mainWindow.webContents.send('ai-response', {
        reply: 'Please configure your Gemini API key in Settings.',
        pending_changes: [],
      });
    }
    return;
  }

  // Mark as thinking and notify UI
  const thisRequestId = ++aiRequestId;
  isAiThinking = true;
  if (mainWindow) {
    mainWindow.webContents.send('ai-thinking', { thinking: true });
  }

  // Request fresh telemetry summary
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    sendToBackend('GET_TELEMETRY_SUMMARY', { window_minutes: telemetryWindowMinutes });
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Check if this request was cancelled while waiting for telemetry
  if (thisRequestId !== aiRequestId) return;

  const contextPayload = buildContextPayload(userText);

  // Build message parts: text context + optional images
  const messageParts = [{ text: JSON.stringify(contextPayload) }];
  if (images && images.length > 0) {
    for (const img of images) {
      messageParts.push({
        inlineData: {
          mimeType: img.mimeType || 'image/png',
          data: img.data,
        },
      });
    }
    console.log(`[Gemini] Sending ${images.length} image(s) with message`);
  }

  try {
    const response = await chatSession.sendMessage({
      message: messageParts,
    });

    // Discard response if a newer request was initiated (user interrupted)
    if (thisRequestId !== aiRequestId) {
      console.log('[Gemini] Response discarded — superseded by newer request');
      return;
    }

    isAiThinking = false;
    if (mainWindow) {
      mainWindow.webContents.send('ai-thinking', { thinking: false });
    }
    handleAIResponse(response.text);
  } catch (e) {
    if (thisRequestId !== aiRequestId) return; // Cancelled
    isAiThinking = false;
    if (mainWindow) {
      mainWindow.webContents.send('ai-thinking', { thinking: false });
    }
    console.error('[Gemini] Error:', e.message);
    if (mainWindow) {
      mainWindow.webContents.send('ai-response', {
        reply: `Error communicating with Gemini: ${e.message}`,
        pending_changes: [],
      });
    }
  }
}

// ============ IPC Handlers ============

ipcMain.handle('set-api-key', async (event, { key, model }) => {
  const success = initializeGenAI(key, model);
  return { success };
});

ipcMain.handle('send-message', async (event, { text, images }) => {
  await processUserMessage(text, images);
});

ipcMain.handle('start-collecting', async () => {
  dataCollectionStart = Date.now();
  setAgentState(AGENT_STATES.COLLECTING_DATA);
  return { success: true };
});

ipcMain.handle('confirm-changes', async (event, { confirmedIds }) => {
  // Update car memory with confirmed changes
  const confirmed = pendingChanges.filter(c => confirmedIds.includes(c.id));
  for (const change of confirmed) {
    sendToBackend('UPDATE_CAR_MEMORY', {
      vehicle_id: currentVehicleId,
      updates: { modification: change.action },
    });
  }
  pendingChanges = pendingChanges.filter(c => !confirmedIds.includes(c.id));
  
  // Transition to UPDATING_TUNE if all changes confirmed
  if (pendingChanges.length === 0) {
    setAgentState(AGENT_STATES.UPDATING_TUNE);
  }
  
  return { remaining: pendingChanges };
});

ipcMain.handle('set-ptt-key', async (event, { key }) => {
  sendToBackend('SET_PTT_KEY', { key });
  return { success: true };
});

ipcMain.handle('set-shortcuts', async (event, { newShortcuts }) => {
  // Unregister old shortcuts
  globalShortcut.unregisterAll();
  // Update state
  shortcuts = { ...shortcuts, ...newShortcuts };
  // Re-register with new bindings
  registerShortcuts();
  return { success: true };
});

ipcMain.handle('get-shortcuts', async () => {
  return { shortcuts };
});

ipcMain.handle('set-telemetry-window', async (event, { minutes }) => {
  telemetryWindowMinutes = minutes;
  return { success: true };
});

ipcMain.handle('get-agent-state', async () => {
  return { state: agentState };
});

ipcMain.handle('get-pending-changes', async () => {
  return { changes: pendingChanges };
});

let pendingTuneResolve = null;

ipcMain.handle('get-tune', async (event, { vehicleId }) => {
  if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
    return null;
  }
  return new Promise((resolve) => {
    pendingTuneResolve = resolve;
    sendToBackend('GET_CAR_MEMORY', { vehicle_id: vehicleId });
    setTimeout(() => {
      if (pendingTuneResolve === resolve) {
        pendingTuneResolve = null;
        resolve(null);
      }
    }, 2000);
  });
});

ipcMain.handle('save-tune', async (event, { vehicleId, data }) => {
  sendToBackend('UPDATE_CAR_MEMORY', {
    vehicle_id: vehicleId || currentVehicleId,
    updates: data,
  });
  return { success: true };
});

ipcMain.handle('get-input-devices', async () => {
  // Try getting devices from Python backend first
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    const backendDevices = await new Promise((resolve) => {
      const handler = (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'INPUT_DEVICES') {
            wsConnection.off('message', handler);
            resolve(msg.data);
          }
        } catch {}
      };
      wsConnection.on('message', handler);
      sendToBackend('GET_INPUT_DEVICES', {});
      setTimeout(() => {
        wsConnection.off('message', handler);
        resolve([]);
      }, 2000);
    });
    if (backendDevices.length > 0) return backendDevices;
  }
  // Fallback: enumerate from Electron renderer via system
  return '__use_browser_api__';
});

ipcMain.handle('set-input-device', async (event, { deviceIndex }) => {
  sendToBackend('SET_INPUT_DEVICE', { device_index: deviceIndex });
  // Also store for renderer-side use
  if (mainWindow) {
    mainWindow.webContents.send('input-device-changed', { deviceId: deviceIndex });
  }
  return { success: true };
});

// ============ Auto-Update ============

ipcMain.handle('get-app-version', async () => {
  return app.getVersion();
});

ipcMain.handle('check-for-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    if (result && result.updateInfo) {
      return { available: true, version: result.updateInfo.version };
    }
    return { available: false };
  } catch (e) {
    console.error('[Update] Check failed:', e.message);
    return { available: false, error: e.message };
  }
});

ipcMain.handle('download-update', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('install-update', async () => {
  autoUpdater.quitAndInstall();
});

// Auto-update events → renderer
autoUpdater.on('update-available', (info) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-available', { version: info.version });
  }
});

autoUpdater.on('download-progress', (progress) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-progress', { percent: progress.percent });
  }
});

autoUpdater.on('update-downloaded', () => {
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded');
  }
});

// ============ Shortcut Registration ============

function registerShortcuts() {
  // Toggle overlay visibility
  try {
    globalShortcut.register(shortcuts.toggleOverlay, () => {
      if (!mainWindow) return;
      overlayVisible = !overlayVisible;
      if (overlayVisible) {
        mainWindow.show();
        mainWindow.setAlwaysOnTop(true, 'floating');
      } else {
        mainWindow.minimize();
      }
    });
  } catch (e) {
    console.error(`[Shortcut] Failed to register toggle: ${shortcuts.toggleOverlay}`, e.message);
  }

  // Quit shortcut removed — close via UI X button
}

// ============ Python Backend Management ============

function startBackend() {
  const backendDir = path.join(__dirname, '..', 'backend_python');
  backendProcess = spawn('python', ['main.py'], {
    cwd: backendDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  backendProcess.stdout.on('data', (data) => {
    process.stdout.write(`[Backend] ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    process.stderr.write(`[Backend ERR] ${data}`);
  });

  backendProcess.on('exit', (code) => {
    console.log(`[Backend] Process exited with code ${code}`);
    backendProcess = null;
  });

  console.log('[Backend] Python backend started (PID:', backendProcess.pid, ')');
}

function stopBackend() {
  if (backendProcess && !backendProcess.killed) {
    console.log('[Backend] Stopping Python backend...');
    backendProcess.kill();
    backendProcess = null;
  }
}

// ============ App Lifecycle ============

app.whenReady().then(() => {
  startBackend();
  createWindow();
  // Give backend a moment to start before connecting
  setTimeout(connectWebSocket, 2000);
  registerShortcuts();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  stopBackend();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
