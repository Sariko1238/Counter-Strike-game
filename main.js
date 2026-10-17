/**
 * Counter-Strike 1.6 Web Edition - Electron Main Process
 * Creates a standalone, hardware-accelerated desktop gaming window without browser borders.
 */

const { app, BrowserWindow, Menu, globalShortcut, session } = require('electron');
const path = require('path');

// Hardware acceleration & low-latency audio flags
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('high-dpi-support', '1');
app.commandLine.appendSwitch('force-device-scale-factor', '1');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    center: true,
    title: 'Counter-Strike 1.6 - 3D Web Edition',
    backgroundColor: '#070c12',
    show: false, // Prevent white flash before render
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false, // Maintain 60+ FPS in background
      sandbox: true
    }
  });

  // Remove default menu bar for pure clean gaming view
  Menu.setApplicationMenu(null);

  // Automatically approve pointer lock and audio autoplay
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'pointerLock' || permission === 'media') {
      return callback(true);
    }
    callback(false);
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Toggle Fullscreen with F11
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      event.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
