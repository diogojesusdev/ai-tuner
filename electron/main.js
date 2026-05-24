/**
 * PitWall - Electron Main Process
 * Handles: transparent window, Gemini API, WebSocket client, IPC
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const WebSocket = require('ws');
const { GoogleGenAI } = require('@google/genai');

let mainWindow = null;
let wsConnection = null;
let genaiClient = null;
let chatSession = null;

// State
let apiKey = '';
let modelName = 'gemini-2.5-flash';
let pendingChanges = [];
let currentVehicleId = null;

const SYSTEM_PROMPT = `You are an elite, highly knowledgeable pit-lane race car engineer. Your goal is to optimize car setups based on live telemetry data and subjective driver feedback. You assist with all driving activities (drifting, grip racing, offroad, drag).

You do not know the exact slider values of the garage. You must offer **relative adjustments** (e.g., "Add 2 clicks of rear rebound damping", "Soften front springs by 0.1 Bar", "Increase rear toe-out by 0.1 degrees").

You MUST reply strictly adhering to the following JSON schema:
{
  "reply": "Your conversational explanation here",
  "pending_changes": [
    { "id": "unique-change-id", "action": "Description of the specific adjustment" }
  ]
}

Rules:
- "reply" contains your natural language explanation of WHY you suggest these changes.
- "pending_changes" is an array of specific, actionable tuning adjustments the driver should make.
- Each change must have a unique "id" (use kebab-case like "rear-spring-soften") and a clear "action" string.
- If you have no changes to suggest (just conversation), use an empty array for "pending_changes".
- Always consider the telemetry data AND driver feedback together.
- Reference specific telemetry values when explaining your reasoning.`;

function createWindow() {
  const isDev = !app.isPackaged;

  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    skipTaskbar: false,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Click-through: ignore mouse events unless hovering interactive elements
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // Uncomment for dev tools:
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
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
      mainWindow.webContents.send('telemetry-update', msg.data);
      currentVehicleId = msg.data.vehicle_id;
      break;

    case 'VOICE_TRANSCRIPT':
      mainWindow.webContents.send('voice-transcript', msg.data);
      // Automatically send to Gemini
      processUserMessage(msg.data.text);
      break;

    case 'TELEMETRY_SUMMARY':
      // Used internally for LLM context
      break;

    case 'CAR_MEMORY':
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

ipcMain.handle('set-click-through', async (event, { ignore }) => {
  if (mainWindow) {
    mainWindow.setIgnoreMouseEvents(ignore, { forward: true });
  }
});

ipcMain.handle('get-pending-changes', async () => {
  return { changes: pendingChanges };
});

// ============ App Lifecycle ============

app.whenReady().then(() => {
  createWindow();
  connectWebSocket();
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
