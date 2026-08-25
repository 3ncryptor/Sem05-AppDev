import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Define ES Module equivalents of __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple Player State variables
let currentProcess = null;
let isPlaying = false;
let isPaused = false;
let elapsedSeconds = 0;
let totalDuration = 0;
let intervalId = null;

// Mixer settings
let volume = 0.8; // 0.0 to 1.5
let rate = 1.0;   // 0.5 to 2.0

// Song and queue lists
let queue = [];
let audioFiles = [];
let currentSong = "";

// Function to scan files in a folder
function loadSongs(dirName) {
    try {
        const files = fs.readdirSync(dirName);
        audioFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.mp3', '.wav', '.m4a', '.aiff', '.mp4'].includes(ext);
        });
    } catch (err) {
        audioFiles = [];
    }
    return audioFiles;
}

// Function to get song duration via afinfo command
function getDuration(songPath, callback) {
    exec(`afinfo "${songPath}"`, (err, stdout) => {
        if (err) return callback(0);
        const match = stdout.match(/estimated duration:\s*([\d.]+)\s*sec/);
        if (match) {
            callback(Math.round(parseFloat(match[1])));
        } else {
            callback(0);
        }
    });
}

// Play song function
function playSong(songPath, onEndCallback) {
    stopSong(); // Stop if already playing

    currentSong = path.basename(songPath);
    isPlaying = true;
    isPaused = false;
    elapsedSeconds = 0;

    getDuration(songPath, (duration) => {
        totalDuration = duration;

        // Spawn macOS afplay command
        const args = ['-v', volume.toString(), '-r', rate.toString(), songPath];
        currentProcess = spawn('afplay', args);

        // Update timer every second
        intervalId = setInterval(() => {
            if (!isPaused && isPlaying) {
                elapsedSeconds += rate;
                if (elapsedSeconds >= totalDuration) {
                    elapsedSeconds = totalDuration;
                }
            }
        }, 1000);

        currentProcess.on('close', () => {
            clearInterval(intervalId);
            currentProcess = null;

            // Song ended naturally, call next song handler
            if (isPlaying && !isPaused) {
                isPlaying = false;
                onEndCallback();
            }
        });
    });
}

// Toggle Pause and Resume using macOS signals
function pauseSong() {
    if (currentProcess && isPlaying && !isPaused) {
        currentProcess.kill('SIGSTOP');
        isPaused = true;
    }
}

function resumeSong() {
    if (currentProcess && isPlaying && isPaused) {
        currentProcess.kill('SIGCONT');
        isPaused = false;
    }
}

// Stop playback and reset timers
function stopSong() {
    isPlaying = false;
    isPaused = false;
    elapsedSeconds = 0;
    clearInterval(intervalId);

    if (currentProcess) {
        currentProcess.kill('SIGKILL');
        currentProcess = null;
    }
}

function getState() {
    return {
        isPlaying,
        isPaused,
        elapsedSeconds,
        totalDuration,
        currentSong,
        audioFiles,
        queue,
        volume,
        rate
    };
}

function setVolume(vol) {
    volume = Math.max(0, Math.min(1.5, vol));
}

function setRate(speed) {
    rate = Math.max(0.5, Math.min(2.0, speed));
}

function addToQueue(song) {
    if (!queue.includes(song)) {
        queue.push(song);
    }
}

function shiftQueue() {
    return queue.shift();
}

export {
    loadSongs,
    playSong,
    pauseSong,
    resumeSong,
    stopSong,
    getState,
    setVolume,
    setRate,
    addToQueue,
    shiftQueue
};
