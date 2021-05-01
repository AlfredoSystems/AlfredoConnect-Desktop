const { app, BrowserWindow, ipcMain, ipcRenderer, Menu } = require("electron");
const log = require("electron-log");
const {autoUpdater} = require("electron-updater");

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = "info";
log.info("App starting.");
let mainWindow;
let updateCancellationToken;

function createWindow() {
    app.allowRendererProcessReuse = false;
    mainWindow = new BrowserWindow({
        backgroundColor: "#333",
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        show: false
    });
    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
    mainWindow.maximize();
    mainWindow.loadFile("index.html");
    mainWindow.show();
    
    autoUpdater.autoDownload = false;
    autoUpdater.checkForUpdates().then(downloadPromise => {
      updateCancellationToken = downloadPromise.cancellationToken;
      ipcMain.on("abort-update", () => {downloadPromise.cancellationToken.cancel()})
    });
}

let downloadWindow;
let quitOnUpdate = false;

autoUpdater.on("update-available", (result) => {
    downloadWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            additionalArguments: [app.getVersion(), "v" + result.version]
        },
        resizable: false,
        backgroundColor: "#333",
        parent: mainWindow,
        modal: true,
        width: 600,
        height: 135,
    });
    downloadWindow.removeMenu();
    downloadWindow.loadFile("download.html");
    downloadWindow.show();
    // Because parent window flickers on close otherwise, electron/electron#10616
    downloadWindow.on("close", () => mainWindow.focus());
});

ipcMain.on("update-now", () => {
    autoUpdater.downloadUpdate(updateCancellationToken);
    quitOnUpdate = true;
});

autoUpdater.on("download-progress", progress => {
    if (quitOnUpdate && updateCancellationToken && !updateCancellationToken.cancelled) {
      downloadWindow.webContents.send("update-progress", progress)
    }
});

ipcMain.on("update-on-quit", () => {
    autoUpdater.downloadUpdate();
    quitOnUpdate = false;
    autoUpdater.autoInstallOnAppQuit = true;
});

ipcMain.on("dont-update", () => {
    autoUpdater.autoInstallOnAppQuit = false;
});

autoUpdater.on("update-downloaded", () => {
    if (quitOnUpdate) autoUpdater.quitAndInstall();
});

app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

const menuTemplate = [
  {
      label: "AlfredoConnect",
      submenu: [
          {
              label: "AlfredoConnect " + app.getVersion(),
              enabled: false
          },
          { type: "separator" },
          {
              label: "GitHub",
              click: async () => {
                  const { shell } = require("electron");
                  await shell.openExternal("https://github.com/AlfredoElectronics/AlfredoConnect-Desktop")
              }
          }
      ]
  },
  {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: function(item, focusedWindow) {
            if (focusedWindow)
              focusedWindow.reload();
          }
        },
        {
          label: 'Toggle Full Screen',
          accelerator: (function() {
            if (process.platform === 'darwin')
              return 'Ctrl+Command+F';
            else
              return 'F11';
          })(),
          click: function(item, focusedWindow) {
            if (focusedWindow)
              focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
          }
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: (function() {
            if (process.platform === 'darwin')
              return 'Alt+Command+I';
            else
              return 'Ctrl+Shift+I';
          })(),
          click: function(item, focusedWindow) {
            if (focusedWindow)
              focusedWindow.toggleDevTools();
          }
        },
      ]
    },
    {
      label: 'Window',
      role: 'window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'CmdOrCtrl+M',
          role: 'minimize'
        },
        {
          label: 'Close',
          accelerator: 'CmdOrCtrl+W',
          role: 'close'
        },
      ]
    }
]