const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld(
    'electronAPI', {
        startTimer: (minutes) => ipcRenderer.send('start-timer', minutes),
        onTimerStarted: (callback) => ipcRenderer.on('timer-started', callback),
        onTimerStopped: (callback) => ipcRenderer.on('timer-stopped', callback),
        onTimerUpdated: (callback) => ipcRenderer.on('timer-updated', callback),
        onTimerFinished: (callback) => ipcRenderer.on('timer-finished', callback),
    }
);