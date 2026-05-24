/**
 * PitWall - Electron Main Process
 * Handles: transparent window, Gemini API, WebSocket client, IPC
 */

const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const WebSocket = require('ws');
const { GoogleGenAI } = require('@google/genai');

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

// Configurable shortcuts (defaults)
let shortcuts = {
  toggleOverlay: 'F10',
  quit: 'CommandOrControl+Shift+Q',
};

const SYSTEM_PROMPT = `You are an elite, highly knowledgeable pit-lane race car engineer. Your goal is to optimize car setups based on live telemetry data and subjective driver feedback. You assist with all driving activities (drifting, grip racing, offroad, drag).

You do not know the exact slider values of the garage. You must offer **relative adjustments** (e.g., "Add 2 clicks of rear rebound damping", "Soften front springs by 0.1 Bar", "Increase rear toe-out by 0.1 degrees").

You MUST reply strictly adhering to the following JSON schema:
{
  "reply": "Your conversational explanation here",
  "pending_changes": [
    { "id": "unique-change-id", "action": "Description of the specific adjustment" }
  ],
  "tune_updates": {
    "key": "new_value"
  }
}

Rules:
- "reply" contains your natural language explanation of WHY you suggest these changes.
- "pending_changes" is an array of specific, actionable tuning adjustments the driver should make.
- Each change must have a unique "id" (use kebab-case like "rear-spring-soften") and a clear "action" string.
- If you have no changes to suggest (just conversation), use an empty array for "pending_changes".
- "tune_updates" is an optional object with tune field keys and their new absolute values AFTER the adjustment. Use these keys: tire_pressure_fl, tire_pressure_fr, tire_pressure_rl, tire_pressure_rr, camber_fl, camber_fr, camber_rl, camber_rr, toe_fl, toe_fr, toe_rl, toe_rr, spring_front, spring_rear, ride_height_front, ride_height_rear, bump_front, bump_rear, rebound_front, rebound_rear, arb_front, arb_rear, aero_front, aero_rear, brake_balance, brake_pressure, diff_accel, diff_decel, final_drive.
- Only include tune_updates if the driver confirms they applied a change and tells you the new value, OR if you can compute the new absolute value from context.
- If you don't know the absolute value, omit tune_updates entirely.
- Always consider the telemetry data AND driver feedback together.
- Reference specific telemetry values when explaining your reasoning.`;

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
    if (mainWindow) {
      mainWindow.webContents.send('backend-status', { connected: false });
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
      currentVehicleId = msg.data.vehicle_id;
      break;

    case 'VOICE_TRANSCRIPT':
      mainWindow.webContents.send('voice-transcript', msg.data);
      // Automatically send to Gemini
      processUserMessage(msg.data.text);
      break;

    case 'LISTENING_STATE':
      mainWindow.webContents.send('listening-state', msg.data);
      break;

    case 'TELEMETRY_SUMMARY':
      // Used internally for LLM context
      break;

    case 'CAR_MEMORY':
      if (pendingTuneResolve) {
        pendingTuneResolve(msg.data);
        pendingTuneResolve = null;
      }
      mainWindow.webContents.send('car-memory', msg.data);
      break;
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
  modelName = model || 'gemini-2.5-flash';
  
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

async function processUserMessage(userText) {
  if (!genaiClient || !apiKey) {
    if (mainWindow) {
      mainWindow.webContents.send('ai-response', {
        reply: 'Please configure your Gemini API key in Settings.',
        pending_changes: [],
      });
    }
    return;
  }

  // Request telemetry summary from backend
  let telemetrySummary = {};
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    sendToBackend('GET_TELEMETRY_SUMMARY', {});
    // Brief wait for summary (non-blocking approach would be better in production)
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Build context payload
  const contextPayload = {
    user_prompt: userText,
    telemetry_summary_30s: telemetrySummary,
    car_history: {
      vehicle_id: currentVehicleId,
    },
  };

  try {
    const response = await chatSession.sendMessage({
      message: JSON.stringify(contextPayload),
    });

    const text = response.text;
    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { reply: text, pending_changes: [] };
    }

    // Update pending changes state
    if (parsed.pending_changes && parsed.pending_changes.length > 0) {
      pendingChanges = parsed.pending_changes;
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

    // Send response to renderer
    if (mainWindow) {
      mainWindow.webContents.send('ai-response', parsed);
    }

    // Speak the reply via Python TTS
    if (parsed.reply) {
      sendToBackend('PLAY_AUDIO', { text: parsed.reply });
    }
  } catch (e) {
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

ipcMain.handle('send-message', async (event, { text }) => {
  await processUserMessage(text);
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

  // Quit
  try {
    globalShortcut.register(shortcuts.quit, () => {
      app.quit();
    });
  } catch (e) {
    console.error(`[Shortcut] Failed to register quit: ${shortcuts.quit}`, e.message);
  }
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
