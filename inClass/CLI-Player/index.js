import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCliRenderer, BoxRenderable, TextRenderable } from '@opentui/core';
import * as player from './songs/cliPlayer.js';

// Define ES Module equivalents of __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set folder path (defaults to "songs")
const dirName = process.argv[2] || path.join(__dirname, 'songs');

if (!fs.existsSync(dirName)) {
    console.error(`Error: Directory "${dirName}" does not exist.`);
    process.exit(1);
}

// Load audio files
const audioFiles = player.loadSongs(dirName);

if (audioFiles.length === 0) {
    console.log(`No audio files found in: ${dirName}`);
    process.exit(0);
}

// Main TUI Variables
let focus = 'playlist'; // 'playlist' or 'mixer'
let selectedIndex = 0;
let selectedMixerIndex = 0; // 0 for Volume, 1 for Speed

// Helper: Format seconds to MM:SS
function formatTime(secs) {
    if (!secs || isNaN(secs)) return "00:00";
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// Helper: Build a visual slider bar (pure text-safe characters)
function drawSlider(percentage, isActive) {
    const width = 12;
    const pos = Math.max(0, Math.min(width - 1, Math.round(percentage * (width - 1))));
    const knob = isActive ? "♦" : "╪"; // Diamond knob when slider is focused
    return "─".repeat(pos) + knob + "─".repeat(width - 1 - pos);
}

// Helper: Symmetrical audio spectrum visualizer
const bars = [" ", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
function getVisualizer() {
    const size = 17;
    const center = Math.floor(size / 2);
    const centerHeight = Math.floor(Math.random() * (bars.length - 2)) + 2;
    
    const wave = [];
    for (let i = 0; i < size; i++) {
        const dist = Math.abs(i - center);
        const maxHeight = Math.max(0, centerHeight - dist);
        const height = Math.max(0, Math.min(bars.length - 1, Math.floor(Math.random() * 2) + maxHeight));
        wave.push(bars[height]);
    }
    return wave.join("");
}

// Content Builders
function getPlaylistContent() {
    let content = "";
    const state = player.getState();
    audioFiles.forEach((file, i) => {
        const isSelected = (i === selectedIndex);
        const isPlaying = (state.currentSong === file);
        const inQueue = state.queue.includes(file);
        
        let prefix = "  ";
        if (isSelected && focus === 'playlist') {
            prefix = "> ";
        } else if (isPlaying) {
            prefix = "🔊";
        } else if (inQueue) {
            prefix = "⏳";
        }
        
        let line = `${prefix} ${i + 1}. ${file}`;
        if (line.length > 25) line = line.substring(0, 22) + "...";
        content += `${line}\n`;
    });
    return content;
}

function getStatusContent() {
    const state = player.getState();
    let content = "";
    if (state.currentSong) {
        let title = state.currentSong.substring(0, state.currentSong.lastIndexOf('.')).toUpperCase();
        if (title.length > 22) title = title.substring(0, 19) + "...";
        content += ` Current: ${title}\n`;
        
        const badge = state.isPaused ? "PAUSED [⏸]" : (state.isPlaying ? "PLAYING [🔊]" : "STOPPED [⏹]");
        content += ` State:   ${badge}`;
    } else {
        content += " Select song & press Enter";
    }
    return content;
}

function getProgressContent() {
    const state = player.getState();
    if (!state.currentSong) return "";
    
    const elapsed = formatTime(state.elapsedSeconds);
    const duration = formatTime(state.totalDuration);
    
    const barSize = 10;
    const ratio = state.totalDuration ? (state.elapsedSeconds / state.totalDuration) : 0;
    const filled = Math.max(0, Math.min(barSize, Math.round(ratio * barSize)));
    const bar = "█".repeat(filled) + "░".repeat(barSize - filled);
    
    return ` Progress: [${bar}] ${elapsed}/${duration}`;
}

function getVisualizerContent() {
    const state = player.getState();
    if (state.isPlaying && !state.isPaused) {
        return ` Waveform: ${getVisualizer()}`;
    }
    return "";
}

function getQueueContent() {
    const state = player.getState();
    if (state.queue.length > 0) {
        return ` Queue:    ${state.queue.length} remaining`;
    }
    return "";
}

function getMixerContent() {
    const state = player.getState();
    const isMixerActive = (focus === 'mixer');
    
    let volPrefix = isMixerActive && selectedMixerIndex === 0 ? "> Volume" : "  Volume";
    let speedPrefix = isMixerActive && selectedMixerIndex === 1 ? "> Speed" : "  Speed";
    
    const volPercent = Math.round(state.volume * 100);
    const volSlider = drawSlider(state.volume / 1.5, isMixerActive && selectedMixerIndex === 0);
    const speedSlider = drawSlider((state.rate - 0.5) / 1.5, isMixerActive && selectedMixerIndex === 1);
    
    return ` ${volPrefix.padEnd(12)} : ${volSlider} ${volPercent}% (0-150%)\n` +
           ` ${speedPrefix.padEnd(12)} : ${speedSlider} ${state.rate.toFixed(1)}x (0.5-2.0x)`;
}

// Next Song Handler
function handleSongEnd() {
    const nextSong = player.shiftQueue();
    if (nextSong) {
        player.playSong(path.join(dirName, nextSong), handleSongEnd);
    } else {
        const state = player.getState();
        const currentIdx = audioFiles.indexOf(state.currentSong);
        if (currentIdx > -1 && currentIdx < audioFiles.length - 1) {
            player.playSong(path.join(dirName, audioFiles[currentIdx + 1]), handleSongEnd);
        } else {
            player.stopSong();
        }
    }
}

// Initialize OpenTUI CLI Renderer
const renderer = await createCliRenderer({ exitOnCtrlC: true });

// Main container (100% size)
const mainContainer = new BoxRenderable(renderer, {
    width: "100%",
    height: "100%",
    flexDirection: "column",
    padding: 1,
    gap: 1
});

// App Title bar
const titleText = new TextRenderable(renderer, {
    fg: "#00FFCC", // Teal
    content: " 🎵  CLI MUSIC PLAYER (OpenTUI Dashboard)"
});
mainContainer.add(titleText);

// Middle row (Sidebar + Player Info)
const middleBox = new BoxRenderable(renderer, {
    width: "100%",
    flexDirection: "row",
    flexGrow: 1,
    gap: 2
});

// Sidebar Container (Borders and Title)
const playlistBox = new BoxRenderable(renderer, {
    width: "40%",
    height: "100%",
    border: true,
    borderStyle: "rounded",
    title: " Playlist ",
    titleColor: "#00FFCC", // Focused by default
    borderColor: "#00FFCC"
});
const playlistText = new TextRenderable(renderer, {
    fg: "#FFFFFF",
    content: getPlaylistContent()
});
playlistBox.add(playlistText);
middleBox.add(playlistBox);

// Now Playing Info Container (Borders and Title)
const infoBox = new BoxRenderable(renderer, {
    width: "60%",
    height: "100%",
    border: true,
    borderStyle: "rounded",
    title: " Now Playing ",
    titleColor: "#FFFFFF",
    borderColor: "#555555",
    flexDirection: "column",
    padding: 1,
    gap: 1
});

const statusText = new TextRenderable(renderer, {
    fg: "#FF00FF", // Magenta
    content: getStatusContent()
});
const progressText = new TextRenderable(renderer, {
    fg: "#00FF00", // Green
    content: getProgressContent()
});
const visualizerText = new TextRenderable(renderer, {
    fg: "#FFFF00", // Yellow
    content: getVisualizerContent()
});
const queueText = new TextRenderable(renderer, {
    fg: "#FF8800", // Orange
    content: getQueueContent()
});

infoBox.add(statusText);
infoBox.add(progressText);
infoBox.add(visualizerText);
infoBox.add(queueText);
middleBox.add(infoBox);

mainContainer.add(middleBox);

// Mixer panel Box (Borders and Title)
const mixerBox = new BoxRenderable(renderer, {
    width: "100%",
    height: 6,
    border: true,
    borderStyle: "rounded",
    title: " Mixer & Equalizer ",
    titleColor: "#FFFFFF",
    borderColor: "#555555",
    flexDirection: "column",
    padding: 1
});

const mixerText = new TextRenderable(renderer, {
    fg: "#E0E0E0",
    content: getMixerContent()
});
mixerBox.add(mixerText);
mainContainer.add(mixerBox);

// Help footer line
const footerText = new TextRenderable(renderer, {
    fg: "#808080",
    content: " Space: Play/Pause | r: Reset | c: Queue | n: Next | Tab: Toggle Focus | q: Exit"
});
mainContainer.add(footerText);

renderer.root.add(mainContainer);

// Start TUI drawing refresh loop (10 FPS)
const refreshInterval = setInterval(() => {
    playlistText.content = getPlaylistContent();
    statusText.content = getStatusContent();
    progressText.content = getProgressContent();
    visualizerText.content = getVisualizerContent();
    queueText.content = getQueueContent();
    mixerText.content = getMixerContent();
}, 100);

// Graceful exit
function exitApp() {
    clearInterval(refreshInterval);
    player.stopSong();
    renderer.destroy();
    process.exit(0);
}

// OpenTUI Global keyboard inputs handler
renderer.keyInput.on("keypress", (key) => {
    const state = player.getState();

    // 1. Quitting
    if (key.name === 'q' || key.name === 'escape') {
        exitApp();
    }

    // 2. Global Actions
    if (key.name === 'space') {
        if (state.isPlaying) {
            if (state.isPaused) player.resumeSong();
            else player.pauseSong();
        } else if (state.currentSong) {
            player.playSong(path.join(dirName, state.currentSong), handleSongEnd);
        } else {
            player.playSong(path.join(dirName, audioFiles[selectedIndex]), handleSongEnd);
        }
        return;
    }

    if (key.name === 'r') {
        if (state.currentSong) {
            player.playSong(path.join(dirName, state.currentSong), handleSongEnd);
        }
        return;
    }

    if (key.name === 'tab') {
        focus = (focus === 'playlist' ? 'mixer' : 'playlist');
        
        // Dynamically update border highlights depending on which pane is active
        if (focus === 'playlist') {
            playlistBox.borderColor = "#00FFCC";
            playlistBox.titleColor = "#00FFCC";
            mixerBox.borderColor = "#555555";
            mixerBox.titleColor = "#FFFFFF";
        } else {
            playlistBox.borderColor = "#555555";
            playlistBox.titleColor = "#FFFFFF";
            mixerBox.borderColor = "#00FFCC";
            mixerBox.titleColor = "#00FFCC";
        }
        return;
    }

    if (key.name === 'n') {
        handleSongEnd();
        return;
    }

    // 3. Panel-Specific Navigation
    if (focus === 'playlist') {
        if (key.name === 'up') {
            selectedIndex = (selectedIndex - 1 + audioFiles.length) % audioFiles.length;
        } else if (key.name === 'down') {
            selectedIndex = (selectedIndex + 1) % audioFiles.length;
        } else if (key.name === 'return') {
            player.playSong(path.join(dirName, audioFiles[selectedIndex]), handleSongEnd);
        } else if (key.name === 'c') {
            player.addToQueue(audioFiles[selectedIndex]);
        }
    } else if (focus === 'mixer') {
        if (key.name === 'up') {
            selectedMixerIndex = 0;
        } else if (key.name === 'down') {
            selectedMixerIndex = 1;
        } else if (key.name === 'left' || key.name === 'right') {
            const step = (key.name === 'right') ? 1 : -1;
            if (selectedMixerIndex === 0) {
                player.setVolume(state.volume + step * 0.05);
            } else {
                player.setRate(state.rate + step * 0.1);
            }
        }
    }
});

// Run the renderer loop
renderer.start();
