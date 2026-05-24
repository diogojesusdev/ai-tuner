/**
 * AI Tuner - Electron Preload Script
 * Exposes safe IPC bridge between main process and React renderer.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pitwall', {
  // Settings
  setApiKey: (key, model) => ipcRenderer.invoke('set-api-key', { key, model }),
  setPttKey: (key) => ipcRenderer.invoke('set-ptt-key', { key }),
  setShortcuts: (newShortcuts) => ipcRenderer.invoke('set-shortcuts', { newShortcuts }),
  getShortcuts: () => ipcRenderer.invoke('get-shortcuts'),
  setTelemetryWindow: (minutes) => ipcRenderer.invoke('set-telemetry-window', { minutes }),
  getAgentState: () => ipcRenderer.invoke('get-agent-state'),
  
  // Chat
  sendMessage: (text, images) => ipcRenderer.invoke('send-message', { text, images }),
  confirmChanges: (confirmedIds) => ipcRenderer.invoke('confirm-changes', { confirmedIds }),
  getPendingChanges: () => ipcRenderer.invoke('get-pending-changes'),
  
  // Tune sheet
  getTune: (vehicleId) => ipcRenderer.invoke('get-tune', { vehicleId }),
  saveTune: (vehicleId, data) => ipcRenderer.invoke('save-tune', { vehicleId, data }),
  
  // Audio input devices
  getInputDevices: () => ipcRenderer.invoke('get-input-devices'),
  setInputDevice: (deviceIndex) => ipcRenderer.invoke('set-input-device', { deviceIndex }),
  
  // Auto-update
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (event, data) => callback(data));
  },
  onUpdateProgress: (callback) => {
    ipcRenderer.on('update-progress', (event, data) => callback(data));
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (event) => callback());
  },
  
  // Event listeners from main process
  onTelemetryUpdate: (callback) => {
    ipcRenderer.on('telemetry-update', (event, data) => callback(data));
  },
  onVoiceTranscript: (callback) => {
    ipcRenderer.on('voice-transcript', (event, data) => callback(data));
  },
  onAiResponse: (callback) => {
    ipcRenderer.on('ai-response', (event, data) => callback(data));
  },
  onBackendStatus: (callback) => {
    ipcRenderer.on('backend-status', (event, data) => callback(data));
  },
  onCarMemory: (callback) => {
    ipcRenderer.on('car-memory', (event, data) => callback(data));
  },
  onListeningState: (callback) => {
    ipcRenderer.on('listening-state', (event, data) => callback(data));
  },
  onTelemetryStatus: (callback) => {
    ipcRenderer.on('telemetry-status', (event, data) => callback(data));
  },
  onTuneUpdate: (callback) => {
    ipcRenderer.on('tune-update', (event, data) => callback(data));
  },
  onAgentState: (callback) => {
    ipcRenderer.on('agent-state', (event, data) => callback(data));
  },
  onAiThinking: (callback) => {
    ipcRenderer.on('ai-thinking', (event, data) => callback(data));
  },
  onVoiceError: (callback) => {
    ipcRenderer.on('voice-error', (event, data) => callback(data));
  },

  // Cleanup listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
});
