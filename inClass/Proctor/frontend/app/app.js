import { app, BrowserWindow, ipcMain, dialog, desktopCapturer } from "electron";
import path from "path";
import fs from "fs";

let electronWindow = null;
let startTimestamp = null;
let timerIntervalId = null;
let cameraShotIntervalId = null;
let screenShotIntervalId = null;

// Configurable folder to store camera snapshots
let cameraSnapFolder = path.join(import.meta.dirname, "user-camera-snap");
if (!fs.existsSync(cameraSnapFolder)) {
    fs.mkdirSync(cameraSnapFolder, { recursive: true });
}

let screenSnapFolder = path.join(import.meta.dirname, "user-screen-snapshot");
if (!fs.existsSync(screenSnapFolder)) {
    fs.mkdirSync(screenSnapFolder, { recursive: true });
}

function createWindow() {
    electronWindow = new BrowserWindow({
        height: 1000,
        width: 1000,
        webPreferences: {
            devTools: true,
            preload: path.join(import.meta.dirname, 'preload.js')
        }
    });

    electronWindow.loadURL('http://localhost:5173');
}

ipcMain.handle('start-timer', (_event) => {
    startTimestamp = Date.now();

    // Send Timer Tick every 1s
    timerIntervalId = setInterval(() => {
        if (electronWindow && !electronWindow.isDestroyed()) {
            electronWindow.webContents.send('timer', (Date.now() - startTimestamp) / 1000);
        }
    }, 1000);

    // Capture user's camera snap every 5s
    cameraShotIntervalId = setInterval(() => {
        if (electronWindow && !electronWindow.isDestroyed()) {
            electronWindow.webContents.send('camera-shot');
        }
    }, 5000);

    // Capture screen snapshot using desktopCapturer every 5s
    screenShotIntervalId = setInterval(async () => {
        try {
            const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } });
            if (sources[0]) {
                fs.writeFileSync(path.join(screenSnapFolder, `screen_${Date.now()}.png`), sources[0].thumbnail.toPNG());
            }
        } catch (err) {
            console.error('[Main] Screen capture failed:', err);
        }
    }, 5000);
});

// Stop the timer tick and periodic camera snapshot capture (used on exam submission)
ipcMain.handle('stop-timer', () => {
    if (timerIntervalId) {
        clearInterval(timerIntervalId);
        timerIntervalId = null;
    }
    if (cameraShotIntervalId) {
        clearInterval(cameraShotIntervalId);
        cameraShotIntervalId = null;
    }
    if (screenShotIntervalId) {
        clearInterval(screenShotIntervalId);
        screenShotIntervalId = null;
    }
    return { stopped: true };
});

// Store camera snap image into the configured folder
ipcMain.handle('store-camera-snap-image-on-disk', (_event, data) => {
    if (!fs.existsSync(cameraSnapFolder)) {
        fs.mkdirSync(cameraSnapFolder, { recursive: true });
    }
    const fileName = `snap_${Date.now()}.jpg`;
    const filePath = path.join(cameraSnapFolder, fileName);
    fs.writeFileSync(filePath, Buffer.from(data));
    console.log(`[Main] Saved camera snapshot to: ${filePath}`);
    return { success: true, filePath, fileName };
});

// 1. Get currently configured camera snapshot folder
ipcMain.handle('get-camera-folder', () => {
    return cameraSnapFolder;
});

// 2. Select folder where user wants to store camera shots
ipcMain.handle('select-camera-folder', async () => {
    const result = await dialog.showOpenDialog(electronWindow, {
        title: 'Select Folder for Camera Shots',
        defaultPath: cameraSnapFolder,
        properties: ['openDirectory', 'createDirectory']
    });

    if (!result.canceled && result.filePaths.length > 0) {
        cameraSnapFolder = result.filePaths[0];
        console.log(`[Main] Updated camera snapshot folder to: ${cameraSnapFolder}`);
        return { canceled: false, folderPath: cameraSnapFolder };
    }
    return { canceled: true, folderPath: cameraSnapFolder };
});

// 3. Select file using dialog box and get its path
ipcMain.handle('select-file', async () => {
    const result = await dialog.showOpenDialog(electronWindow, {
        title: 'Select File',
        properties: ['openFile'],
        filters: [
            { name: 'All Files', extensions: ['*'] },
            { name: 'Images', extensions: ['jpg', 'png', 'jpeg', 'webp'] },
            { name: 'Documents', extensions: ['pdf', 'txt', 'docx', 'json'] }
        ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
        console.log(`[Main] Selected file path: ${result.filePaths[0]}`);
        return { canceled: false, filePath: result.filePaths[0] };
    }
    return { canceled: true, filePath: null };
});

// Callback functions executed according to which button was clicked and checkbox state
function handleAcceptRules(checkboxChecked) {
    console.log(`[Main Fn] Executed handleAcceptRules. Checkbox (Don't show again): ${checkboxChecked}`);
    return {
        action: 'accepted',
        message: `Rules accepted successfully.${checkboxChecked ? ' Preference saved: Do not show again.' : ''}`
    };
}

function handleReviewGuidelines(checkboxChecked) {
    console.log(`[Main Fn] Executed handleReviewGuidelines. Checkbox: ${checkboxChecked}`);
    return {
        action: 'review',
        message: 'Guidelines marked for detailed candidate review.'
    };
}

function handleCancelExam(checkboxChecked) {
    console.log(`[Main Fn] Executed handleCancelExam. Checkbox: ${checkboxChecked}`);
    return {
        action: 'cancelled',
        message: 'Exam session cancelled by candidate.'
    };
}

// 1. Dialog API with checkbox and multiple buttons
ipcMain.handle('show-rules-dialog', async () => {
    const buttons = ["Accept & Proceed", "Review Guidelines", "Cancel Exam"];
    const result = await dialog.showMessageBox(electronWindow, {
        type: "info",
        title: "Athena Exam Protocol & Rules",
        message: "Proctoring Rules & Candidate Consent",
        detail:
            "1. Stay on the exam screen at all times.\n" +
            "2. Camera must remain enabled throughout the test.\n" +
            "3. Periodic webcam snapshots will be captured and saved to your selected folder.\n" +
            "4. No external assistance or second screens allowed.\n" +
            "5. Click 'Cancel Exam' if you do not agree to proctoring.",
        buttons: buttons,
        defaultId: 0,
        cancelId: 2,
        checkboxLabel: "I understand and agree (Do not show this dialog again)",
        checkboxChecked: false
    });

    // Perform specific callback functions according to button clicked & checkbox state
    let actionResult = null;
    if (result.response === 0) {
        actionResult = handleAcceptRules(result.checkboxChecked);
    } else if (result.response === 1) {
        actionResult = handleReviewGuidelines(result.checkboxChecked);
    } else if (result.response === 2) {
        actionResult = handleCancelExam(result.checkboxChecked);
    }

    return {
        response: result.response,
        buttonLabel: buttons[result.response] || "Unknown",
        checkboxChecked: result.checkboxChecked,
        actionResult
    };
});

// Backward compatible simple rule dialog
ipcMain.on("show-rules", () => {
    dialog.showMessageBox(electronWindow, {
        type: "info",
        title: "Athena Exam Rules",
        message: "Exam Rules",
        detail:
            "1. Stay on the exam screen.\n" +
            "2. Camera must remain enabled.\n" +
            "3. Do not leave the exam.\n" +
            "4. Do not use external assistance.\n" +
            "5. Click Exit Exam when finished."
    });
});

app.whenReady().then(createWindow);