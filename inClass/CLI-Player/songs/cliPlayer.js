import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// -----------------------------------------------------------------------------
// 1. SETUP & FILE PATHS
// -----------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to our compiled native audio player binary
const playerBinaryPath = path.join(__dirname, '..', 'audio_player');

// -----------------------------------------------------------------------------
// 2. PLAYER STATE VARIABLES
// -----------------------------------------------------------------------------
let workerProcess = null;      // The background native audio process
let isPlaying = false;          // True when a song is actively playing
let isPaused = false;           // True when playback is paused
let elapsedSeconds = 0;         // How many seconds of the song have played
let totalDuration = 0;          // Total duration of current song in seconds
let intervalId = null;          // 1-second interval timer ID
let currentSong = "";           // File name of current song (e.g. "song.mp3")
let volume = 0.8;               // Volume level from 0.0 to 1.0 (80% default)
let rate = 1.0;                 // Playback speed from 0.5x to 2.0x (1.0x default)
let onSongEndCallback = null;   // Function to call when a song finishes

let queue = [];                 // List of upcoming song filenames
let audioFiles = [];            // List of all loaded audio files

// -----------------------------------------------------------------------------
// 3. BACKGROUND AUDIO WORKER MANAGEMENT
// -----------------------------------------------------------------------------

// Starts or reuses the background native audio player process
function getWorker() {
    if (workerProcess && !workerProcess.killed) {
        return workerProcess;
    }

    if (fs.existsSync(playerBinaryPath)) {
        workerProcess = spawn(playerBinaryPath, [], { stdio: ['pipe', 'pipe', 'ignore'] });

        workerProcess.stdout.on('data', (data) => {
            const lines = data.toString().split('\n');
            for (const line of lines) {
                const message = line.trim();

                // Native player sends: "DURATION <seconds>"
                if (message.startsWith('DURATION')) {
                    const seconds = parseInt(message.split(' ')[1], 10);
                    if (!isNaN(seconds)) {
                        totalDuration = seconds;
                    }
                }
                // Native player sends: "ENDED" when track finishes playing
                else if (message === 'ENDED') {
                    isPlaying = false;
                    isPaused = false;
                    clearInterval(intervalId);

                    if (typeof onSongEndCallback === 'function') {
                        onSongEndCallback();
                    }
                }
            }
        });

        workerProcess.on('exit', () => {
            workerProcess = null;
        });
    }

    return workerProcess;
}

// -----------------------------------------------------------------------------
// 4. SONG LOADING & DURATION HELPERS
// -----------------------------------------------------------------------------

function loadSongs(folderPath) {
    try {
        const files = fs.readdirSync(folderPath);
        const supportedExtensions = ['.mp3', '.wav', '.m4a', '.aiff', '.mp4'];

        audioFiles = files.filter((file) => {
            const ext = path.extname(file).toLowerCase();
            return supportedExtensions.includes(ext);
        });
    } catch (error) {
        audioFiles = [];
    }
    return audioFiles;
}

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

// -----------------------------------------------------------------------------
// 5. PLAYBACK CONTROL FUNCTIONS
// -----------------------------------------------------------------------------

function playSong(songPath, onEndCallback) {
    stopSong();

    currentSong = path.basename(songPath);
    isPlaying = true;
    isPaused = false;
    elapsedSeconds = 0;
    totalDuration = 0;
    onSongEndCallback = onEndCallback;

    getDuration(songPath, (duration) => {
        if (duration > 0) {
            totalDuration = duration;
        }
    });

    const worker = getWorker();

    if (worker && worker.stdin) {
        worker.stdin.write(`PLAY ${songPath}\n`);
        worker.stdin.write(`RATE ${rate.toFixed(2)}\n`);
        worker.stdin.write(`VOLUME ${volume.toFixed(2)}\n`);
    } else {
        const args = ['-v', volume.toString(), '-r', rate.toString(), songPath];
        workerProcess = spawn('afplay', args, { stdio: 'ignore' });

        workerProcess.on('close', (code, signal) => {
            clearInterval(intervalId);
            if (isPlaying && !isPaused && signal !== 'SIGKILL') {
                isPlaying = false;
                if (typeof onEndCallback === 'function') onEndCallback();
            }
        });
    }

    intervalId = setInterval(() => {
        if (isPlaying && !isPaused) {
            elapsedSeconds += rate;
            if (totalDuration > 0 && elapsedSeconds >= totalDuration) {
                elapsedSeconds = totalDuration;
            }
        }
    }, 1000);
}

function pauseSong() {
    if (isPlaying && !isPaused) {
        isPaused = true;
        const worker = getWorker();
        if (worker && worker.stdin) {
            worker.stdin.write("PAUSE\n");
        } else if (workerProcess) {
            try { workerProcess.kill('SIGSTOP'); } catch (e) {}
        }
    }
}

function resumeSong() {
    if (isPlaying && isPaused) {
        isPaused = false;
        const worker = getWorker();
        if (worker && worker.stdin) {
            worker.stdin.write("RESUME\n");
        } else if (workerProcess) {
            try { workerProcess.kill('SIGCONT'); } catch (e) {}
        }
    }
}

function stopSong() {
    isPlaying = false;
    isPaused = false;
    elapsedSeconds = 0;

    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }

    const worker = getWorker();
    if (worker && worker.stdin) {
        worker.stdin.write("STOP\n");
    } else if (workerProcess) {
        try { workerProcess.kill('SIGKILL'); } catch (e) {}
        workerProcess = null;
    }
}

// -----------------------------------------------------------------------------
// 6. VOLUME, SPEED & QUEUE CONTROLS
// -----------------------------------------------------------------------------

function setVolume(newVolume) {
    volume = Math.max(0.0, Math.min(1.0, newVolume));
    const worker = getWorker();
    if (worker && worker.stdin) {
        worker.stdin.write(`VOLUME ${volume.toFixed(2)}\n`);
    }
}

function setRate(newRate) {
    rate = Math.max(0.5, Math.min(2.0, newRate));
    const worker = getWorker();
    if (worker && worker.stdin) {
        worker.stdin.write(`RATE ${rate.toFixed(2)}\n`);
    }
}

function addToQueue(songFileName) {
    if (!queue.includes(songFileName)) {
        queue.push(songFileName);
    }
}

function shiftQueue() {
    return queue.shift();
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

// -----------------------------------------------------------------------------
// 7. CLEANUP ON PROCESS EXIT
// -----------------------------------------------------------------------------
function cleanupAllAudio() {
    stopSong();

    if (workerProcess) {
        try {
            if (workerProcess.stdin) workerProcess.stdin.write("QUIT\n");
            workerProcess.kill('SIGKILL');
        } catch (e) {}
        workerProcess = null;
    }

    try {
        exec('killall afplay >/dev/null 2>&1');
    } catch (e) {}
}

process.on('exit', cleanupAllAudio);
process.on('SIGINT', () => { cleanupAllAudio(); process.exit(0); });
process.on('SIGTERM', () => { cleanupAllAudio(); process.exit(0); });
process.on('uncaughtException', (err) => {
    cleanupAllAudio();
    console.error(err);
    process.exit(1);
});

// -----------------------------------------------------------------------------
// 8. EXPORTS
// -----------------------------------------------------------------------------
export {
    loadSongs,
    playSong,
    pauseSong,
    resumeSong,
    stopSong,
    cleanupAllAudio,
    getState,
    setVolume,
    setRate,
    addToQueue,
    shiftQueue
};
