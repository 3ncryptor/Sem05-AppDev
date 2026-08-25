# CLI Music Player — Developer Journey & Architectural Evolution Guide

This document chronicles the step-by-step engineering journey of building a terminal music player from ground zero. It documents how the system evolved from a simple file scanner into an interactive, multi-threaded audio workstation, explaining the technical blockers encountered, the reasoning behind every architectural decision, and the progressive introduction of every feature.

---

## 1. The Evolutionary Roadmap

```
[Phase 1: Filesystem Discovery & Ingestion]
       │
       ▼
[Phase 2: Interactive Terminal Navigation (The Cursor)]
       │
       ▼
[Phase 3: Subprocess Audio Execution (Breaking the Sound Barrier)]
       │
       ▼
[Phase 4: The Zombie Process Bug & Lifecycle Signal Traps]
       │
       ▼
[Phase 5: Core Playback Features (Play, Pause, Resume, Restart)]
       │
       ▼
[Phase 6: Time Telemetry & Visual Progress Bar Math]
       │
       ▼
[Phase 7: The Dynamic Modulation Wall & Native AVFoundation Engine]
       │
       ▼
[Phase 8: Playlist Queueing, Skip & Recursive Auto-Advancement]
       │
       ▼
[Phase 9: Non-Blocking Toast Notification Subsystem]
       │
       ▼
[Phase 10: 3-Tier Architecture Decoupling & 44-Column Visualizers]
```

---

## Phase 1: Filesystem Discovery & Asset Ingestion

### The Initial Problem
JavaScript running in a terminal environment has no ambient awareness of the files on the machine. To build a music player, the application must first scan the host filesystem and create a reliable list of playable audio tracks.

### Why This Approach Was Chosen
1. **Synchronous Ingestion (`fs.readdirSync`)**: Loading the track manifest is a prerequisite for launching the UI. Using synchronous reading at startup ensures the application never enters an empty or undefined state before rendering the initial frame.
2. **MIME / Extension Filtering**: Folders often contain hidden system files (such as `.DS_Store` on macOS) or album artwork (`.jpg`, `.png`). Filtering by supported audio extensions (`.mp3`, `.wav`, `.m4a`, `.aiff`, `.mp4`) prevents the player from attempting to stream unsupported binary files to the audio driver.
3. **Safe Exception Handling**: Wrapping directory reads in a `try...catch` block prevents unhandled fatal crashes if the user supplies an invalid directory path.

### Implementation
```javascript
import fs from 'fs';
import path from 'path';

export function loadSongs(folderPath) {
    try {
        const files = fs.readdirSync(folderPath);
        const supportedExtensions = ['.mp3', '.wav', '.m4a', '.aiff', '.mp4'];

        return files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return supportedExtensions.includes(ext);
        });
    } catch (err) {
        return [];
    }
}
```

---

## Phase 2: Interactive Terminal Navigation (The Playlist Cursor)

### The Problem
Once the file manifest is loaded into memory, the user needs a way to visually browse the playlist and select which song to play using standard keyboard arrow keys.

### Why This Approach Was Chosen
1. **Index-Based Pointer (`selectedTrackIndex`)**: Keeping the cursor as an integer index decoupled from track names allows simple arithmetic operations for navigation.
2. **Modulo Wrapping Arithmetic**: Navigating past the bottom of the list wraps to the top, and navigating up from the top wraps to the bottom:
   * Down: `(index + 1) % files.length`
   * Up: `(index - 1 + files.length) % files.length` (Adding `files.length` prevents negative indices in JavaScript).
3. **Decoupled Selection vs. Active Playback**: The track currently highlighted by the user's cursor is intentionally kept separate from the track currently playing audio. This allows users to browse the playlist while listening to a different song uninterrupted.

### Implementation
```javascript
let selectedTrackIndex = 0;

function handleArrowNavigation(direction, totalTracks) {
    if (direction === 'up') {
        selectedTrackIndex = (selectedTrackIndex - 1 + totalTracks) % totalTracks;
    } else if (direction === 'down') {
        selectedTrackIndex = (selectedTrackIndex + 1) % totalTracks;
    }
}

function renderPlaylistView(audioFiles, selectedIndex) {
    let output = "";
    audioFiles.forEach((file, index) => {
        const isSelected = (index === selectedIndex);
        const marker = isSelected ? "▶ " : "  ";
        const trackNumber = String(index + 1).padStart(2, '0');
        output += `${marker}${trackNumber}. ${file}\n`;
    });
    return output;
}
```

---

## Phase 3: Spawning Audio Subprocesses (Breaking the Sound Barrier)

### The Problem
Terminal JavaScript has no built-in digital-to-analog converter (DAC) APIs or speaker driver interfaces. To emit audio, JavaScript must delegate audio stream decoding to the host operating system.

### Why This Approach Was Chosen
1. **Child Process Spawning (`child_process.spawn`)**: macOS includes a built-in command-line audio player named `afplay`. Node.js can execute this command asynchronously using `spawn('afplay', [songPath])`.
2. **Non-Blocking Execution**: Unlike `execSync`, which halts the entire Node event loop until the song finishes, `spawn` launches a background process and immediately returns control to JavaScript so the terminal interface remains responsive.

### Implementation
```javascript
import { spawn } from 'child_process';

let audioProcess = null;

function playBasic(songPath) {
    audioProcess = spawn('afplay', [songPath], { stdio: 'ignore' });
}
```

---

## Phase 4: The Zombie Process Bug & Lifecycle Signal Traps

### The Blocker Encountered
During testing of Phase 3, two critical architectural bugs surfaced:
1. **Concurrent Audio Collisions**: When a user selected Song A and immediately hit Enter on Song B, `afplay` for Song A kept running while a second `afplay` process started for Song B. Both tracks played simultaneously, causing overlapping sound.
2. **Zombie Background Processes**: When the user exited the terminal application (`Ctrl+C` or closing the terminal window), the parent Node.js process died, but the child `afplay` process was orphaned and continued playing music in the background.

### Why This Solution Was Chosen
1. **Pre-Execution Teardown**: Calling `stopSong()` at the very beginning of `playSong()` guarantees that existing audio streams are killed before a new one is initialized.
2. **Operating System Signal Trapping**: Node.js allows registering listeners on OS signals:
   * `SIGINT`: Triggered when the user presses `Ctrl+C`.
   * `SIGTERM`: Triggered when the process is terminated by the OS or task manager.
   * `exit`: Triggered on standard process termination.
   * `uncaughtException`: Triggered on unhandled runtime errors.
3. **Targeted Subprocess Killing**: Trapping these signals allows executing a cleanup routine that issues `.kill('SIGKILL')` to the child process and runs `killall afplay` as a safety measure.

### Implementation
```javascript
import { exec } from 'child_process';

function stopSong() {
    if (audioProcess) {
        try {
            audioProcess.kill('SIGKILL');
        } catch (e) {}
        audioProcess = null;
    }
}

function playSongSafe(songPath) {
    stopSong(); // Step 1: Terminate any previous audio stream
    audioProcess = spawn('afplay', [songPath], { stdio: 'ignore' });
}

function cleanupAllAudio() {
    stopSong();
    try {
        exec('killall afplay >/dev/null 2>&1');
    } catch (e) {}
}

// Register Global Lifecycle Traps
process.on('exit', cleanupAllAudio);
process.on('SIGINT', () => { cleanupAllAudio(); process.exit(0); });
process.on('SIGTERM', () => { cleanupAllAudio(); process.exit(0); });
process.on('uncaughtException', (err) => {
    cleanupAllAudio();
    process.exit(1);
});
```

---

## Phase 5: Core Playback Features (Play, Pause, Resume, Restart)

### The Problem
A functional music player must allow users to toggle between playing and paused states using a single global key (`Space`), and restart the current song from the beginning (`r` key).

### Why This Approach Was Chosen
1. **State Machine Tri-State Logic**: Playback exists in one of three states:
   * **Stopped** (`isPlaying: false, isPaused: false`)
   * **Active Playing** (`isPlaying: true, isPaused: false`)
   * **Paused** (`isPlaying: true, isPaused: true`)
2. **Context-Aware `Space` Key Routing**:
   * If music is playing $\rightarrow$ Pause the track.
   * If music is paused $\rightarrow$ Resume the track.
   * If music is stopped $\rightarrow$ Start playing the currently selected track from the playlist.
3. **Instant Track Reset (`r` key)**: When pressing `r`, the player restarts the active song immediately and resets `elapsedSeconds = 0`.

### Implementation
```javascript
// State variables
let isPlaying = false;
let isPaused = false;
let currentSong = "";

function pauseSong() {
    if (isPlaying && !isPaused) {
        isPaused = true;
        if (workerProcess && workerProcess.stdin) {
            workerProcess.stdin.write("PAUSE\n");
        }
    }
}

function resumeSong() {
    if (isPlaying && isPaused) {
        isPaused = false;
        if (workerProcess && workerProcess.stdin) {
            workerProcess.stdin.write("RESUME\n");
        }
    }
}

// Inside Keyboard Router (index.js)
if (key.name === 'space') {
    if (state.isPlaying) {
        state.isPaused ? player.resumeSong() : player.pauseSong();
    } else if (state.currentSong) {
        player.playSong(path.join(musicFolder, state.currentSong), handleSongFinished);
    } else {
        const selectedFile = audioFiles[selectedTrackIndex];
        player.playSong(path.join(musicFolder, selectedFile), handleSongFinished);
    }
}

if (key.name === 'r') {
    if (state.currentSong) {
        player.playSong(path.join(musicFolder, state.currentSong), handleSongFinished);
    }
}
```

---

## Phase 6: Time Telemetry & Visual Progress Bar Math

### The Problem
Users need to know how much time has passed, how long the song is, and see a visual progress bar indicating stream percentage.

### Why This Approach Was Chosen
1. **Metadata Header Querying (`afinfo`)**: Reading entire audio files into JavaScript buffers wastes memory. Running macOS's native `afinfo` tool queries file headers in milliseconds without loading audio data into RAM.
2. **Time Formatting Helper (`MM:SS`)**: Raw seconds are formatted into human-readable strings:
   $$\text{Minutes} = \lfloor \text{seconds} / 60 \rfloor, \quad \text{Seconds} = \text{seconds} \pmod{60}$$
3. **Progress Bar Mathematics**:
   Given a fixed visual width $W$ (e.g. 24 characters) and ratio $R = \frac{\text{elapsed}}{\text{total}}$:
   $$\text{Filled Blocks} = \min(W, \max(0, \lfloor R \times W \rfloor)), \quad \text{Unfilled Blocks} = W - \text{Filled Blocks}$$
   The string is assembled using unicode characters: `"█".repeat(filled) + "░".repeat(unfilled)`.

### Implementation
```javascript
export function formatTime(seconds) {
    if (!seconds || isNaN(seconds) || seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function renderProgressBar(elapsed, total, barWidth = 24) {
    const ratio = total > 0 ? Math.max(0, Math.min(1, elapsed / total)) : 0;
    const filledCount = Math.round(ratio * barWidth);
    const emptyCount = Math.max(0, barWidth - filledCount);
    const bar = "█".repeat(filledCount) + "░".repeat(emptyCount);
    const percent = Math.round(ratio * 100);
    return `[${bar}] ${String(percent).padStart(3, ' ')}% (${formatTime(elapsed)} / ${formatTime(total)})`;
}
```

---

## Phase 7: The Dynamic Modulation Wall & Native AVFoundation Engine

### The Blocker Encountered
When building the Parametric Audio Mixer to adjust Volume (0%–100%) and Playback Speed (0.5x–2.0x) in real time:
* `afplay` only accepts `-v <volume>` and `-r <rate>` as **initial launch flags**.
* Once running, `afplay` has no interactive communication channel. Modifying volume or speed required stopping the process and restarting the song from `00:00`.

### Why the Custom Objective-C Engine (`audio_player.m`) Was Built
To achieve real-time, in-flight modulation with 0ms latency without restarting audio:
1. **Apple `AVFoundation` & `AVAudioPlayer`**: Apple provides hardware-accelerated time-pitch algorithms via `AVAudioPlayer` with `enableRate = YES`.
2. **Persistent IPC Daemon Model**: Instead of spawning a new process per song, a single native binary runs continuously in the background.
3. **Standard IO Text Protocol**:
   * JavaScript writes plain text commands over `stdin`:
     * `PLAY /path/to/song.mp3\n`
     * `PAUSE\n` / `RESUME\n`
     * `RATE 1.50\n` (Instant dynamic time-stretch)
     * `VOLUME 0.60\n` (Instant gain adjustment)
     * `STOP\n` / `QUIT\n`
   * Native engine reports events back to JavaScript over `stdout`:
     * `DURATION 184\n` (Exact decoded track duration)
     * `ENDED\n` (Hardware track completion event)
4. **Rate-Scaled Clock Synchronization**: When playing at `1.5x` speed, `1.5` seconds of audio play per real second. The JavaScript clock ticker increments `elapsedSeconds += rate` rather than `+1`, keeping on-screen progress bars in exact sync with sound output.

### Implementation

#### Native Engine Core (`audio_player.m` snippet)
```objc
// Inside audio_player.m
g_player = [[AVAudioPlayer alloc] initWithContentsOfURL:url error:&err];
g_player.enableRate = YES;
[g_player prepareToPlay];
[g_player play];

// Live modulation without restarting:
g_player.rate = newRate;
g_player.volume = newVolume;
```

#### JavaScript Subprocess Bridge (`songs/cliPlayer.js` snippet)
```javascript
function getWorker(binaryPath) {
    if (workerProcess && !workerProcess.killed) return workerProcess;

    workerProcess = spawn(binaryPath, [], { stdio: ['pipe', 'pipe', 'ignore'] });

    workerProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
            const msg = line.trim();
            if (msg.startsWith('DURATION')) {
                totalDuration = parseInt(msg.split(' ')[1], 10) || totalDuration;
            } else if (msg === 'ENDED') {
                isPlaying = false;
                isPaused = false;
                clearInterval(intervalId);
                if (typeof onSongEndCallback === 'function') onSongEndCallback();
            }
        }
    });

    return workerProcess;
}

export function setRate(newRate) {
    rate = Math.max(0.5, Math.min(2.0, newRate));
    const worker = getWorker('./audio_player');
    if (worker) worker.stdin.write(`RATE ${rate.toFixed(2)}\n`);
}

export function setVolume(newVolume) {
    volume = Math.max(0.0, Math.min(1.0, newVolume));
    const worker = getWorker('./audio_player');
    if (worker) worker.stdin.write(`VOLUME ${volume.toFixed(2)}\n`);
}
```

---

## Phase 8: Playlist Queueing, Skip & Recursive Auto-Advancement

### The Problem
Users need to enqueue tracks on demand (`c` key), skip to the next track on demand (`n` key), and have the player naturally transition to the next queued item or playlist track when a song finishes.

### Why This Approach Was Chosen
1. **First-In-First-Out (FIFO) Queue Array**: Storing user-queued tracks in an array (`queue.push()`) allows processing them in exact insertion order using `queue.shift()`.
2. **Queue Priority Over Sequential Order**: When a song ends or the user presses `n`, the system first checks if `queue.length > 0`. If so, it pops the queued item; only when the queue is empty does it advance sequentially down the playlist.
3. **Hardware Completion Signal & Recursive Callback**: The native engine writes `ENDED` over stdout when audio reaches the end of the file. In `index.js`, we pass `handleSongFinished` as the completion delegate:
   ```
   playSong(path, handleSongFinished) ──▶ Song Ends ──▶ handleSongFinished() ──▶ playSong(nextPath, handleSongFinished)
   ```
   This recursive delegation guarantees an infinite, self-sustaining playback chain without polling loops.

### Implementation
```javascript
let queue = [];

export function addToQueue(song) {
    if (!queue.includes(song)) queue.push(song);
}

export function shiftQueue() {
    return queue.shift();
}

function handleSongFinished() {
    // 1. Check FIFO Queue Buffer
    const nextQueued = shiftQueue();
    if (nextQueued) {
        showToast(`Auto-playing queued: ${path.basename(nextQueued)}`);
        playSong(path.join(musicFolder, nextQueued), handleSongFinished);
        return;
    }

    // 2. Sequential Playlist Advance
    const state = getState();
    const currentIndex = audioFiles.indexOf(state.currentSong);
    if (currentIndex > -1 && currentIndex < audioFiles.length - 1) {
        const nextTrack = audioFiles[currentIndex + 1];
        showToast(`Advancing to: ${path.basename(nextTrack)}`);
        playSong(path.join(musicFolder, nextTrack), handleSongFinished);
    } else {
        showToast("Playlist finished.");
        stopSong();
    }
}

// Inside Keyboard Router
if (key.name === 'n') {
    showToast("Skipping to next track");
    handleSongFinished();
}
```

---

## Phase 9: Non-Blocking Toast Notification Subsystem

### The Problem
When the user queues a song, adjusts speed, or changes visualizers, they need instant visual feedback. However, traditional terminal popups disrupt the layout grid and block the event loop.

### Why This Approach Was Chosen
1. **Single Transient Notification String (`toastNotification`)**: A state variable holds the active message, rendered in the header status bar.
2. **Debounced Auto-Dismiss Timer**: When a new toast arrives, any existing timer is cancelled (`clearTimeout(toastTimer)`), and a fresh 3-second timer is started. This prevents timer pileups and automatically erases the notification after 3 seconds.

### Implementation
```javascript
let toastNotification = "Ready. Use Arrow keys and Enter to play.";
let toastTimer = null;

export function showToast(message) {
    toastNotification = message;
    if (toastTimer) clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toastNotification = "";
    }, 3000);
}
```

---

## Phase 10: 3-Tier Architecture Decoupling & 44-Column Visualizers

### The Problem
Combining TUI rendering, keyboard event routing, and audio state in a single file creates tight coupling, making the codebase difficult to maintain or debug. Furthermore, arbitrary ASCII art widths cause terminal line wrapping on smaller viewport widths.

### Why This Architecture Was Chosen
1. **Decoupled 3-Tier Hierarchy**:
   * **Presentation Layer (`ui.js`)**: Encapsulates OpenTUI layout grids, border styling, and visualizer engines.
   * **Controller Layer (`index.js`)**: Orchestrates keypress event routing, application lifecycle, and runs the 10 FPS (100ms) render loop.
   * **Audio Layer (`songs/cliPlayer.js`)**: Manages the native worker subprocess and audio state store.
2. **The 44-Character Geometry Rule**: In standard 80–100 column terminal windows, the right dashboard container has an inner text width of **44–46 characters**. Calibrating all visualizers to strictly $\le 44$ characters guarantees zero line-wrapping and clean vertical alignment.

### Clean Exit Protocol (`q` and `Escape`)
When the user presses `q` or `Escape`:
1. `clearInterval(refreshTimer)` halts the render loop.
2. `player.cleanupAllAudio()` terminates all child processes.
3. `renderer.destroy()` restores the standard terminal cursor and raw mode.
4. `process.exit(0)` exits cleanly with zero lingering processes.

---

## Summary: Complete Feature & Keybinding Matrix

| Feature | Keybinding | Mechanism & Design Rationale |
| :--- | :--- | :--- |
| **Play / Pause / Resume** | `Space` | Tri-state toggle (`STOPPED` $\rightarrow$ `PLAY` $\leftrightarrow$ `PAUSE`) |
| **Track Restart** | `r` | Restarts current stream immediately from `00:00` |
| **Skip Track** | `n` | Pops next FIFO queued track, or advances down sequential playlist |
| **Enqueue Track** | `c` | Appends highlighted track to queue buffer |
| **Cycle Visualizers** | `v` | Toggles between Cassette (Default), Spectrum, Oscilloscope, Nebula |
| **Switch Focus** | `Tab` | Shifts active key focus between Playlist and Parametric Mixer |
| **Volume Slider** | `Left` / `Right` | Live hardware gain modulation ($0.0$ to $1.0$) via `VOLUME` IPC |
| **Speed Slider** | `Left` / `Right` | Live pitch/tempo time-stretch ($0.5x$ to $2.0x$) via `RATE` IPC |
| **Clean Application Exit**| `q` / `Esc` | Complete teardown: kills child processes, destroys TUI, exits |
