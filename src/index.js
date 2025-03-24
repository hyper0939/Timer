const { app, BrowserWindow, ipcMain, Tray, Menu, Notification } = require('electron');
const path = require('node:path');

if (require('electron-squirrel-startup')) {
    app.quit();
}

let mainWindow;
let tray = null;
let timerInterval;
let remainingTime = 0;
let totalTime = 0;
let isTimerRunning = false;
let forceClose = false;

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 465,
        height: 195,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            enableRemoteModule: false
        },
        icon: path.join(__dirname, 'image/icon.png')
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));
    
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }
    
    mainWindow.on('close', (e) => {
        if (forceClose) return;
        
        e.preventDefault();
        mainWindow.hide();
        showMinimizeNotification();
    });

    mainWindow.on('minimize', (event) => {
        event.preventDefault();
        mainWindow.hide();
        showMinimizeNotification();
    });
};

function createTray() {
    tray = new Tray(path.join(__dirname, 'image/icon.png'));
    
    updateTrayMenu();
    
    tray.setToolTip('Timer App');
    
    tray.on('click', () => {
        if (mainWindow) {
            if (mainWindow.isVisible()) {
                mainWindow.focus();
            } else {
                mainWindow.show();
            }
        }
    });
}

function updateTrayMenu() {
    if (!tray) return;
    
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Open Timer',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                }
            }
        },
        {
            label: isTimerRunning ? `Running: ${formatTime(remainingTime)}` : 'Timer not active',
            enabled: false
        },
        { type: 'separator' },
        {
            label: isTimerRunning ? 'Stop Timer' : 'Timer not active',
            enabled: isTimerRunning,
            click: () => {
                if (isTimerRunning) {
                    clearInterval(timerInterval);
                    timerInterval = null;
                    isTimerRunning = false;
                    mainWindow.webContents.send("timer-stopped");
                    updateTrayMenu();
                }
            }
        },
        { type: 'separator' },
        {
            label: 'Exit',
            click: () => {
                forceClose = true;
                app.quit();
            }
        }
    ]);
    
    tray.setContextMenu(contextMenu);
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes < 10 ? '0' + minutes : minutes}:${secs < 10 ? '0' + secs : secs}`;
}

function showMinimizeNotification() {
    if (isTimerRunning && process.platform === 'win32') {
        new Notification({
            title: 'Timer App',
            body: 'Timer continues to run in the background'
        }).show();
    }
}

function showTimerFinishedNotification() {
    if (process.platform === 'win32') {
        const notification = new Notification({
            title: 'Timer Done!',
            body: 'Your timer has expired',
            icon: path.join(__dirname, 'image/icon.png')
        });
        
        notification.show();
        
        notification.on('click', () => {
            if (mainWindow) {
                mainWindow.show();
                mainWindow.focus();
            }
        });
    }
}

app.whenReady().then(() => {
    createWindow();
    createTray();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        } else if (mainWindow) {
            mainWindow.show();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform === 'darwin') {
        return;
    }
    
    if (forceClose) {
        app.quit();
    }
});

app.on('before-quit', () => {
    forceClose = true;
});

app.on('quit', () => {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
});

ipcMain.on("start-timer", (event, minutes) => {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        isTimerRunning = false;
        mainWindow.webContents.send("timer-stopped");
        updateTrayMenu();
        return;
    }

    if (typeof minutes !== 'number' || minutes <= 0 || minutes > 180) {
        return;
    }

    totalTime = minutes * 60;
    remainingTime = totalTime;
    isTimerRunning = true;

    mainWindow.webContents.send("timer-started", minutes);
    updateTrayMenu();
    
    timerInterval = setInterval(() => {
        if (remainingTime > 0) {
            remainingTime--;
            let progress = ((totalTime - remainingTime) / totalTime) * 100;
            mainWindow.webContents.send("timer-updated", { 
                remaining: remainingTime, 
                progress,
                minutes: Math.floor(remainingTime / 60),
                seconds: remainingTime % 60
            });
            
            if (remainingTime % 15 === 0) {
                updateTrayMenu();
            }
        } else {
            clearInterval(timerInterval);
            timerInterval = null;
            isTimerRunning = false;
            mainWindow.webContents.send("timer-finished");
            updateTrayMenu();
            
            showTimerFinishedNotification();
            
            if (process.platform === 'win32') {
                mainWindow.flashFrame(true);
                setTimeout(() => mainWindow.flashFrame(false), 3000);
            }
        }
    }, 1000);
});