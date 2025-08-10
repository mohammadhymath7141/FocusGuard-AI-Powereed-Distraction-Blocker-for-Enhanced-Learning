const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('focusGuard', {
  predictApp: async (appName, windowTitle) => {
    return await ipcRenderer.invoke('predict-activity', appName, windowTitle);
  },
});

// Also expose ipcRenderer methods for your existing event listeners
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel, data) => ipcRenderer.send(channel, data),
    on: (channel, func) => ipcRenderer.on(channel, (_event, ...args) => func(...args)),
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  },
});
