const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    kiosk: true, // 🛡️ Forces true fullscreen, disables OS toolbars, and blocks exit commands
    fullscreen: true,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: false // 🛡️ Disables inspect element
    }
  });

  win.loadURL('http://localhost:5173');

  // 🛡️ BLOCK HARD OS SHORTCUTS AT THE SYSTEM LEVEL
  win.on('focus', () => {
    globalShortcut.register('CommandOrControl+R', () => { /* Ignore Refresh */ });
    globalShortcut.register('CommandOrControl+Shift+R', () => { /* Ignore Hard Refresh */ });
    globalShortcut.register('F5', () => { /* Ignore F5 */ });
    globalShortcut.register('Alt+F4', () => { /* Ignore Quit */ });
  });

  win.on('blur', () => {
    globalShortcut.unregisterAll();
  });
}


  // In development, load the local Vite server
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
  } else {
    // In production, load the compiled HTML file
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});