// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld("athena", {
    registerListenerForTimerTickFromMain: (callback) => {
        // callback is setTimer
        const fn = (event, message) => {
            callback(message);
        }

        ipcRenderer.on('timer', fn);

        return () => {
            ipcRenderer.removeListener('timer', fn);
        }
    },
    startTimerOnMain: () => {
        return ipcRenderer.invoke('start-timer');
    },

    stopTimerOnMain: () => {
        return ipcRenderer.invoke('stop-timer');
    },

    // New Preload Functions

    // Functions related to capturing camera snaps of user
    registerListenerForCameraSnapFromMain: (callback) => {
        ipcRenderer.on('camera-shot', callback);

        return () => {
            ipcRenderer.removeListener('camera-shot', callback);
        }
    },

    storeCameraSnapImageOnDisk: (data) => {
        return ipcRenderer.invoke('store-camera-snap-image-on-disk', data);
    },

    // Camera Snapshot storage folder APIs
    getCameraFolder: () => {
        return ipcRenderer.invoke('get-camera-folder');
    },

    selectCameraFolder: () => {
        return ipcRenderer.invoke('select-camera-folder');
    },

    // File selection API
    selectFile: () => {
        return ipcRenderer.invoke('select-file');
    },

    // Functions related to showing Contest Rules in a new Dialog
    showRules: () => {
        ipcRenderer.send("show-rules");
    },

    // Rich dialog with checkbox and multiple action buttons
    showRulesDialog: () => {
        return ipcRenderer.invoke('show-rules-dialog');
    }
})

