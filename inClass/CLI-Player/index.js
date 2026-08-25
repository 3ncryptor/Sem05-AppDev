import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCliRenderer } from '@opentui/core';
import * as player from './songs/cliPlayer.js';
import * as ui from './ui.js';

// =============================================================================
// 1. SETUP & DIRECTORY SCANNING
// =============================================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default to the local "songs" folder or accept a path from CLI arguments
const musicFolder = process.argv[2] || path.join(__dirname, 'songs');

if (!fs.existsSync(musicFolder)) {
    console.error(`Error: Music folder "${musicFolder}" not found.`);
    process.exit(1);
}

// Load audio files
const audioFiles = player.loadSongs(musicFolder);

if (audioFiles.length === 0) {
    console.log(`No audio files found in: ${musicFolder}`);
    process.exit(0);
}

// =============================================================================
// 2. CONTROLLER STATE
// =============================================================================
let activePane = 'playlist';          // 'playlist' or 'mixer'
let selectedTrackIndex = 0;           // Highlighted track index
let selectedMixerSlider = 0;          // 0 (Volume), 1 (Speed)
let toastNotification = "Ready. Use Arrow keys and Enter to play.";
let toastTimer = null;

// Helper to show temporary notification toasts in the footer
function showToast(message) {
    toastNotification = message;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toastNotification = "";
    }, 3000);
}

// =============================================================================
// 3. PLAYBACK & QUEUE ADVANCEMENT
// =============================================================================
function handleSongFinished() {
    // 1. Check if there is an enqueued track
    const nextInQueue = player.shiftQueue();
    if (nextInQueue) {
        showToast(`Auto-playing queued: ${path.basename(nextInQueue)}`);
        player.playSong(path.join(musicFolder, nextInQueue), handleSongFinished);
        return;
    }

    // 2. Otherwise auto-advance to next track in list
    const state = player.getState();
    const currentIndex = audioFiles.indexOf(state.currentSong);
    if (currentIndex > -1 && currentIndex < audioFiles.length - 1) {
        const nextSong = audioFiles[currentIndex + 1];
        showToast(`Advancing to: ${path.basename(nextSong)}`);
        player.playSong(path.join(musicFolder, nextSong), handleSongFinished);
    } else {
        showToast("Playlist finished.");
        player.stopSong();
    }
}

// =============================================================================
// 4. INITIALIZE OPENTUI & DASHBOARD
// =============================================================================
const renderer = await createCliRenderer({ exitOnCtrlC: true });
const dashboard = ui.createDashboard(renderer);

// Clean application exit
function exitApplication() {
    clearInterval(refreshTimer);
    if (toastTimer) clearTimeout(toastTimer);
    player.cleanupAllAudio();
    try {
        renderer.destroy();
    } catch (e) {}
    process.exit(0);
}

process.on('SIGINT', exitApplication);
process.on('SIGTERM', exitApplication);

// =============================================================================
// 5. KEYBOARD INPUT ROUTING
// =============================================================================
renderer.keyInput.on("keypress", (key) => {
    const state = player.getState();

    // 1. Quit (q / Escape)
    if (key.name === 'q' || key.name === 'escape') {
        exitApplication();
    }

    // 2. Play / Pause toggle (Space)
    if (key.name === 'space') {
        if (state.isPlaying) {
            if (state.isPaused) {
                player.resumeSong();
                showToast("Playback Resumed");
            } else {
                player.pauseSong();
                showToast("Playback Paused");
            }
        } else if (state.currentSong) {
            player.playSong(path.join(musicFolder, state.currentSong), handleSongFinished);
            showToast(`Playing: ${path.basename(state.currentSong)}`);
        } else {
            const selectedFile = audioFiles[selectedTrackIndex];
            player.playSong(path.join(musicFolder, selectedFile), handleSongFinished);
            showToast(`Playing: ${path.basename(selectedFile)}`);
        }
        return;
    }

    // 3. Reset Track to 00:00 (r)
    if (key.name === 'r') {
        if (state.currentSong) {
            player.playSong(path.join(musicFolder, state.currentSong), handleSongFinished);
            showToast("Restarted track from 00:00");
        }
        return;
    }

    // 4. Switch Active Focus (Tab)
    if (key.name === 'tab') {
        activePane = (activePane === 'playlist' ? 'mixer' : 'playlist');
        dashboard.setFocus(activePane);
        return;
    }

    // 5. Skip Song (n)
    if (key.name === 'n') {
        showToast("Skipping to next track");
        handleSongFinished();
        return;
    }

    // 6. Switch Visualizer Mode (v)
    if (key.name === 'v') {
        const modeName = ui.cycleVisualizerMode();
        showToast(`Visualizer: ${modeName}`);
        return;
    }

    // 6. Navigation in Playlist Pane
    if (activePane === 'playlist') {
        if (key.name === 'up') {
            selectedTrackIndex = (selectedTrackIndex - 1 + audioFiles.length) % audioFiles.length;
        } else if (key.name === 'down') {
            selectedTrackIndex = (selectedTrackIndex + 1) % audioFiles.length;
        } else if (key.name === 'return') {
            const chosenSong = audioFiles[selectedTrackIndex];
            player.playSong(path.join(musicFolder, chosenSong), handleSongFinished);
            showToast(`Playing: ${path.basename(chosenSong)}`);
        } else if (key.name === 'c') {
            const songToQueue = audioFiles[selectedTrackIndex];
            player.addToQueue(songToQueue);
            const queuePos = state.queue.length + 1;
            showToast(`Queued: ${path.basename(songToQueue)} (Position #${queuePos})`);
        }
    }

    // 7. Navigation in Mixer Pane
    if (activePane === 'mixer') {
        if (key.name === 'up') {
            selectedMixerSlider = 0; // Volume
        } else if (key.name === 'down') {
            selectedMixerSlider = 1; // Speed
        } else if (key.name === 'left' || key.name === 'right') {
            const step = (key.name === 'right') ? 1 : -1;

            if (selectedMixerSlider === 0) {
                // Adjust Volume
                const nextVol = Math.max(0.0, Math.min(1.0, state.volume + step * 0.05));
                player.setVolume(nextVol);
                showToast(`Volume: ${Math.round(nextVol * 100)}%`);
            } else {
                // Adjust Speed
                const nextRate = Math.max(0.5, Math.min(2.0, state.rate + step * 0.1));
                player.setRate(nextRate);
                showToast(`Speed: ${nextRate.toFixed(1)}x`);
            }
        }
    }
});

// =============================================================================
// 6. START 10 FPS REFRESH LOOP
// =============================================================================
const refreshTimer = setInterval(() => {
    dashboard.render({
        audioFiles,
        selectedTrackIndex,
        selectedMixerSlider,
        activePane,
        toastMessage: toastNotification,
        playerState: player.getState()
    });
}, 100);

renderer.start();
