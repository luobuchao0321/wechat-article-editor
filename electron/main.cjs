const { app, BrowserWindow, Menu, shell } = require('electron');
const { fork } = require('child_process');
const http = require('http');
const path = require('path');

const PORT = process.env.CONTENTCRAFT_PORT || '3001';
const HOST = '127.0.0.1';
const APP_URL = `http://${HOST}:${PORT}`;

let mainWindow;
let nextServer;

function waitForServer(url, attempts = 80) {
  return new Promise((resolve, reject) => {
    const tryOpen = (remaining) => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });

      req.on('error', () => {
        if (remaining <= 0) {
          reject(new Error(`ContentCraft desktop server did not start at ${url}`));
          return;
        }
        setTimeout(() => tryOpen(remaining - 1), 250);
      });

      req.setTimeout(1000, () => {
        req.destroy();
      });
    };

    tryOpen(attempts);
  });
}

function resolveStandaloneServer() {
  const candidates = [
    path.join(process.resourcesPath, 'app.asar.unpacked', '.next', 'standalone'),
    path.join(app.getAppPath(), '.next', 'standalone'),
  ];

  for (const dir of candidates) {
    const serverEntry = path.join(dir, 'server.js');
    try {
      require('fs').accessSync(serverEntry);
      return { dir, serverEntry };
    } catch {
      // Continue to the next packaged path candidate.
    }
  }

  throw new Error('Cannot find packaged Next.js standalone server.');
}

function startProductionServer() {
  if (!app.isPackaged) return Promise.resolve();

  const { dir, serverEntry } = resolveStandaloneServer();
  nextServer = fork(serverEntry, [], {
    cwd: dir,
    env: {
      ...process.env,
      PORT,
      HOSTNAME: HOST,
      NODE_ENV: 'production',
      CONTENTCRAFT_DESKTOP: '1',
      ELECTRON_RUN_AS_NODE: '1',
    },
    stdio: 'pipe',
  });

  nextServer.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`ContentCraft desktop server exited with code ${code}`);
    }
  });

  return waitForServer(APP_URL);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1180,
    minHeight: 760,
    title: 'ContentCraft 内容匠',
    backgroundColor: '#f8fafc',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.loadURL(APP_URL);
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  await startProductionServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (nextServer) {
    nextServer.kill();
    nextServer = null;
  }
});
