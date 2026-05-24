/**
 * PitWall - Electron Preload Script
 * Exposes safe IPC bridge between main process and React renderer.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pitwall', {
  // Settings
  setApiKey: (key, model) => ipcRenderer.invoke('set-api-key', { key, model }),
  setPttKey: (key) => ipcRenderer.invoke('set-ptt-key', { key }),
  
  // Chat
  sendMessage: (text) => ipcRenderer.invoke('send-message', { text }),
  confirmChanges: (confirmedIds) => ipcRenderer.invoke('confirm-changes', { confirmedIds }),
  getPendingChanges: () => ipcRenderer.invoke('get-pending-changes'),
  
  // Window control
  setClickThrough: (ignore) => ipcRenderer.invoke('set-click-through', { ignore }),
  
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
  onInteractMode: (callback) => {
    ipcRenderer.on('interact-mode', (event, data) => callback(data));
  },
  onTelemetryStatus: (callback) => {
    ipcRenderer.on('telemetry-status', (event, data) => callback(data));
  },

  // Cleanup listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
});
