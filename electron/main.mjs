import { app, BrowserWindow, Notification, screen, powerMonitor, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { activeWindow } from 'active-win';
import fetch from 'node-fetch'; // To call Flask API

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow, overlayWindow;
let distractionSeconds = 0;
let productiveSeconds = 0;
let isLocked = false;
let hourStart = Date.now();

let isSystemSleeping = false;
let isSystemIdle = false;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL('http://localhost:3000');
}

function createOverlayWindow() {
  overlayWindow = new BrowserWindow({
    width: 600,
    height: 300,
    resizable: false,
    frame: false,
    alwaysOnTop: true,
    transparent: false,
    skipTaskbar: true,
    focusable: false,
    backgroundColor: '#000000',
    show: false,
  });

  overlayWindow.loadURL(
    'data:text/html;charset=utf-8,' +
    encodeURIComponent(`
      <html>
        <body style="margin:0;display:flex;align-items:center;justify-content:center;background:#000;color:white;font-family:sans-serif;font-size:20px;">
          <div>🚫 FocusGuard Alert:<br>You've hit 10+ minutes of distraction.<br>Please refocus.</div>
        </body>
      </html>`)
  );

  overlayWindow.once('ready-to-show', () => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    overlayWindow.setBounds({
      x: Math.floor((width - 1200) / 2),
      y: Math.floor((height - 850) / 2),
      width: 1200,
      height: 850,
    });
  });
}

// IPC handler to receive prediction requests from renderer
ipcMain.handle('predict-activity', async (_event, appName, windowTitle) => {
  const text = `${appName} ${windowTitle}`;
  try {
    const res = await fetch('http://localhost:5000/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    return data.prediction;
  } catch (err) {
    console.error('Prediction API error:', err);
    return 'productive'; // fallback safe default
  }
});

async function monitorActivity() {
  try {
    if (isSystemSleeping || isSystemIdle) return;

    const active = await activeWindow();
    const title = active?.title || '';
    const process = active?.owner?.name || '';
    const filePath = active?.owner?.path || '';

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('active-window-info', {
        title,
        process,
        path: filePath,
      });
      mainWindow.webContents.send('activity-tick');
    }

    if (!mainWindow || mainWindow.isDestroyed()) return;

    // Use IPC / preload API to get prediction from ML model
    const prediction = await mainWindow.webContents.executeJavaScript(
      `window.focusGuard.predictApp(${JSON.stringify(process)}, ${JSON.stringify(title)})`
    );

    const now = Date.now();

    if (now - hourStart > 60 * 60 * 1000) {
      distractionSeconds = 0;
      productiveSeconds = 0;
      isLocked = false;
      hourStart = now;
      if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.hide();
    }

    if (prediction === 'distracting') {
      distractionSeconds += 2;

      if (distractionSeconds > 600 && !isLocked) {
        isLocked = true;
        new Notification({
          title: 'FocusGuard',
          body: "You've been distracted for over 10 minutes. Refocus now!",
        }).show();

        if (overlayWindow && !overlayWindow.isDestroyed()) {
          overlayWindow.show();
        }
      }
    } else {
      productiveSeconds += 2;

      if (productiveSeconds > 3300) {
        new Notification({
          title: 'FocusGuard',
          body: '✅ Great job! You’ve focused for 55 minutes. Take a 5–10 min break.',
        }).show();
      }

      if (isLocked && overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.hide();
        isLocked = false;
      }
    }
  } catch (err) {
    console.error('monitorActivity error:', err.message);
  }
}

app.whenReady().then(() => {
  createMainWindow();
  createOverlayWindow();

  powerMonitor.on('suspend', () => {
    isSystemSleeping = true;
    console.log('System is suspending');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('system-sleep-change', { isSleeping: true });
    }
  });

  powerMonitor.on('resume', () => {
    isSystemSleeping = false;
    console.log('System resumed');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('system-sleep-change', { isSleeping: false });
    }
  });

  setInterval(() => {
    const idleSec = powerMonitor.getSystemIdleTime();
    if (idleSec >= 300) { // 5 minutes
      if (!isSystemIdle) {
        isSystemIdle = true;
        console.log('System is idle');
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('system-idle-change', { isIdle: true });
        }
      }
    } else {
      if (isSystemIdle) {
        isSystemIdle = false;
        console.log('System active again');
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('system-idle-change', { isIdle: false });
        }
      }
    }
  }, 5000);

  setInterval(monitorActivity, 2000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
