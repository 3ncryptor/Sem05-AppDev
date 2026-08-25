import path from 'path';
import { BoxRenderable, TextRenderable } from '@opentui/core';

// =============================================================================
// 1. VISUAL & FORMATTING HELPERS
// =============================================================================

// Formats a number of seconds into "MM:SS" (e.g. 65 -> "01:05")
export function formatTime(totalSeconds) {
    if (!totalSeconds || isNaN(totalSeconds) || totalSeconds < 0) return "00:00";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    return `${mm}:${ss}`;
}

// Draws a visual slider bar: "────────♦────────"
export function drawSlider(percentage, isFocused) {
    const totalSlots = 16;
    const knobPosition = Math.max(0, Math.min(totalSlots - 1, Math.round(percentage * (totalSlots - 1))));
    const knob = isFocused ? "♦" : "╪";
    const leftSide = "─".repeat(knobPosition);
    const rightSide = "─".repeat(totalSlots - 1 - knobPosition);
    return leftSide + knob + rightSide;
}

// =============================================================================
// 2. HIGH-FIDELITY MULTI-MODE VISUALIZER ENGINE
// =============================================================================

export const VISUALIZER_MODES = [
    { id: 'cassette', name: 'Retro Hi-Fi Cassette Deck' },
    { id: 'spectrum', name: 'Cyberpunk Stereo Spectrum' },
    { id: 'oscilloscope', name: 'Laser Oscilloscope Wave' },
    { id: 'nebula', name: 'Cosmic Nebula Particle Matrix' }
];

let activeVisualizerIndex = 0;

export function getActiveVisualizerName() {
    return VISUALIZER_MODES[activeVisualizerIndex].name;
}

export function cycleVisualizerMode() {
    activeVisualizerIndex = (activeVisualizerIndex + 1) % VISUALIZER_MODES.length;
    return VISUALIZER_MODES[activeVisualizerIndex].name;
}

// --- MODE 1: RETRO HI-FI CASSETTE TAPE DECK (DEFAULT) ---
const SPOOL_FRAMES = ["◓", "◷", "◑", "◶", "◒", "◵", "◐", "◴"];
let cassetteFrame = 0;

function renderCassette(playerState, isPlaying) {
    const isPaused = playerState && playerState.isPaused;
    const rate = (playerState && playerState.rate) ? playerState.rate : 1.0;
    const elapsed = playerState ? formatTime(playerState.elapsedSeconds) : "00:00";
    const duration = playerState ? formatTime(playerState.totalDuration) : "00:00";

    if (isPlaying) {
        cassetteFrame = (cassetteFrame + 1) % SPOOL_FRAMES.length;
    }

    const leftSpool = isPlaying ? SPOOL_FRAMES[cassetteFrame] : (isPaused ? "⏸" : "⏹");
    const rightSpool = isPlaying ? SPOOL_FRAMES[(cassetteFrame + 4) % SPOOL_FRAMES.length] : (isPaused ? "⏸" : "⏹");

    // Dynamic magnetic tape progress inside the center cassette window
    const progressRatio = (playerState && playerState.totalDuration) ? Math.max(0, Math.min(1, playerState.elapsedSeconds / playerState.totalDuration)) : 0;
    const tapeSlots = 7;
    const leftTape = Math.max(0, Math.round((1 - progressRatio) * (tapeSlots - 1)));
    const tapeWindow = "█".repeat(leftTape) + "│" + "░".repeat(Math.max(0, tapeSlots - 1 - leftTape));

    const tapeHead = isPlaying ? "▼ HEAD ENGAGED ▼" : (isPaused ? "△ HEAD PAUSED △ " : "○ HEAD RESTING ○");
    const stateBadge = isPlaying ? `[▶ ${rate.toFixed(1)}x]` : (isPaused ? "[⏸ PAUSE]" : "[⏹ STOP ]");

    return [
        ` ╔══════════════════════════════════════════╗`,
        ` ║ [A] DOLBY B-NR  TYPE-II CHROMA-90 [${duration}]║`,
        ` ║  ╭─────╮    ┌─────────┐    ╭─────╮       ║`,
        ` ║  │ ( ${leftSpool} ) ├────┤ ${tapeWindow} ├────┤ ( ${rightSpool} ) │ ${stateBadge}║`,
        ` ║  ╰─────╯    └─────────┘    ╰─────╯       ║`,
        ` ║  [TAPE ${elapsed}]  [${tapeHead}] ║`,
        ` ╚══════════════════════════════════════════╝`
    ].join("\n");
}

// --- MODE 2: CYBERPUNK STEREO SPECTRUM STATE & RENDERER ---
const NUM_SPECTRUM_BARS = 20;
const MAX_SPECTRUM_HEIGHT = 5;
const spectrumHeights = new Array(NUM_SPECTRUM_BARS).fill(0);
const spectrumPeaks = new Array(NUM_SPECTRUM_BARS).fill(0);
const blockSymbols = [" ", " ", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
let leftVU = 0;
let rightVU = 0;

function renderSpectrum(playerState, isPlaying) {
    const lines = [];

    if (!isPlaying) {
        // Idle standby baseline
        for (let row = MAX_SPECTRUM_HEIGHT - 1; row >= 0; row--) {
            if (row === 0) {
                lines.push("  " + "─ ".repeat(NUM_SPECTRUM_BARS).trimEnd());
            } else {
                lines.push("  " + "  ".repeat(NUM_SPECTRUM_BARS).trimEnd());
            }
        }
        lines.push("  L:[░░░░░░] -∞dB  [ 20-BAND Hi-Fi SPECTRUM ]  R:[░░░░░░] -∞dB");
        return lines.join("\n");
    }

    // Dynamic frequency synthesis across 20 sub-bands
    for (let i = 0; i < NUM_SPECTRUM_BARS; i++) {
        const center = NUM_SPECTRUM_BARS / 2;
        const dist = Math.abs(i - center) / center;
        const curve = 1.0 - dist * 0.35;
        const target = (Math.random() * (MAX_SPECTRUM_HEIGHT - 0.2) + 0.2) * curve;

        spectrumHeights[i] = spectrumHeights[i] * 0.32 + target * 0.68;

        if (spectrumHeights[i] >= spectrumPeaks[i]) {
            spectrumPeaks[i] = spectrumHeights[i];
        } else {
            spectrumPeaks[i] = Math.max(0, spectrumPeaks[i] - 0.25);
        }
    }

    // Render frequency rows top to bottom
    for (let row = MAX_SPECTRUM_HEIGHT - 1; row >= 0; row--) {
        let rowText = "  ";
        for (let i = 0; i < NUM_SPECTRUM_BARS; i++) {
            const h = spectrumHeights[i];
            const peak = spectrumPeaks[i];

            if (row > h) {
                if (Math.floor(peak) === row) {
                    rowText += (i % 2 === 0 ? "▲ " : "⬝ ");
                } else {
                    rowText += "  ";
                }
            } else if (row === Math.floor(h)) {
                const fractional = h - Math.floor(h);
                const blockIdx = Math.min(blockSymbols.length - 1, Math.floor(fractional * blockSymbols.length));
                rowText += blockSymbols[blockIdx] + " ";
            } else {
                rowText += "█ ";
            }
        }
        lines.push(rowText.trimEnd());
    }

    // Dynamic Stereo VU meters
    const targetL = Math.min(1.0, (spectrumHeights[2] + spectrumHeights[4] + spectrumHeights[6]) / (MAX_SPECTRUM_HEIGHT * 3) + Math.random() * 0.15);
    const targetR = Math.min(1.0, (spectrumHeights[13] + spectrumHeights[15] + spectrumHeights[17]) / (MAX_SPECTRUM_HEIGHT * 3) + Math.random() * 0.15);
    leftVU = leftVU * 0.4 + targetL * 0.6;
    rightVU = rightVU * 0.4 + targetR * 0.6;

    const vuWidth = 6;
    const lFill = Math.round(leftVU * vuWidth);
    const rFill = Math.round(rightVU * vuWidth);
    const lBar = "█".repeat(lFill) + "░".repeat(Math.max(0, vuWidth - lFill));
    const rBar = "█".repeat(rFill) + "░".repeat(Math.max(0, vuWidth - rFill));
    const lDb = `-${Math.round((1 - leftVU) * 18)}dB`;
    const rDb = `-${Math.round((1 - rightVU) * 18)}dB`;

    lines.push(`  L:[${lBar}] ${lDb.padStart(5, ' ')}  [BASS • MID • TREBLE]  R:[${rBar}] ${rDb.padStart(5, ' ')}`);
    return lines.join("\n");
}

// --- MODE 3: LASER OSCILLOSCOPE WAVEFORM RENDERER ---
let oscPhase = 0;

function renderOscilloscope(playerState, isPlaying) {
    const width = 42;
    const height = 5;
    const rows = Array.from({ length: height }, () => new Array(width).fill(" "));
    const rate = playerState ? playerState.rate : 1.0;

    if (isPlaying) {
        oscPhase += rate * 0.25;
    }

    const midRow = 2;

    for (let x = 0; x < width; x++) {
        let yNorm = 0;
        if (isPlaying) {
            const envelope = Math.sin((x / (width - 1)) * Math.PI);
            const wave1 = Math.sin((x * 0.25) - oscPhase);
            const wave2 = Math.sin((x * 0.5) + (oscPhase * 1.3)) * 0.5;
            yNorm = (wave1 + wave2) * envelope * 0.9;
        }

        const plotY = Math.max(0, Math.min(height - 1, Math.round(midRow - yNorm * 1.8)));

        let beamChar = "─";
        if (isPlaying) {
            if (plotY === midRow) beamChar = "━";
            else if (plotY < midRow) beamChar = "∿";
            else beamChar = "~";
        }

        rows[plotY][x] = beamChar;

        if (!isPlaying && rows[midRow][x] === " ") {
            rows[midRow][x] = "·";
        }
    }

    const lines = rows.map(r => "  " + r.join(""));
    const status = isPlaying ? `[DUAL TRACE SINE VOLTAGE // RATE: ${rate.toFixed(1)}x]` : `[STANDBY // 0.0V DC ZERO BASELINE]`;
    lines.push(`  ${status.padEnd(42, ' ')}`);
    return lines.join("\n");
}

// --- MODE 4: COSMIC NEBULA PARTICLE MATRIX RENDERER ---
let nebulaTicks = 0;
const stars = [
    { x: 4, y: 1, char: '✦' }, { x: 10, y: 3, char: '⋆' }, { x: 16, y: 0, char: '·' },
    { x: 22, y: 4, char: '✧' }, { x: 28, y: 2, char: '⋆' }, { x: 34, y: 1, char: '✦' },
    { x: 38, y: 3, char: '·' }, { x: 12, y: 2, char: '░' }, { x: 26, y: 3, char: '▒' }
];

function renderNebula(playerState, isPlaying) {
    const width = 42;
    const height = 5;
    const grid = Array.from({ length: height }, () => new Array(width).fill(" "));

    if (isPlaying) {
        nebulaTicks++;
    }

    for (const star of stars) {
        if (star.x < width && star.y < height) {
            grid[star.y][star.x] = star.char;
        }
    }

    if (isPlaying) {
        const centerX = Math.floor(width / 2);
        const centerY = Math.floor(height / 2);
        const radius = (nebulaTicks % 10);

        grid[centerY][centerX] = "●";

        for (let a = 0; a < 12; a++) {
            const angle = (a / 12) * 2 * Math.PI;
            const px = Math.round(centerX + Math.cos(angle) * radius * 1.8);
            const py = Math.round(centerY + Math.sin(angle) * (radius * 0.4));

            if (px >= 0 && px < width && py >= 0 && py < height) {
                const spark = (radius > 6) ? "·" : ((radius > 3) ? "⋆" : "✦");
                grid[py][px] = spark;
            }
        }
    }

    const lines = grid.map(r => "  " + r.join(""));
    const status = isPlaying ? `[COSMIC NEBULA: ACOUSTIC PULSE DETECTED]` : `[COSMIC NEBULA: DEEP SPACE IDLE]`;
    return lines.join("\n");
}

// Main Visualizer Router
export function drawVisualizer(playerState) {
    const isPlaying = playerState && playerState.isPlaying && !playerState.isPaused;
    const currentMode = VISUALIZER_MODES[activeVisualizerIndex].id;

    let visualContent = "";
    if (currentMode === 'cassette') {
        visualContent = renderCassette(playerState, isPlaying);
    } else if (currentMode === 'spectrum') {
        visualContent = renderSpectrum(playerState, isPlaying);
    } else if (currentMode === 'oscilloscope') {
        visualContent = renderOscilloscope(playerState, isPlaying);
    } else if (currentMode === 'nebula') {
        visualContent = renderNebula(playerState, isPlaying);
    }

    const modeName = VISUALIZER_MODES[activeVisualizerIndex].name;
    const headerRibbon = ` [VISUALIZER: ${modeName.toUpperCase()}]  (Press 'v' to change)`;
    return `${headerRibbon}\n\n${visualContent}`;
}

// =============================================================================
// 3. TEXT CONTENT BUILDERS
// =============================================================================

export function buildHeaderText(totalTracks) {
    const time = new Date().toLocaleTimeString();
    const count = `${totalTracks} TRACK${totalTracks === 1 ? '' : 'S'}`;
    const runtime = typeof process.versions.bun !== 'undefined' ? "BUN" : "NODE";
    return ` CLI MUSIC PLAYER // TUI CORE          [${runtime}]  [${count}]  [${time}]`;
}

const PLAYLIST_PAGE_SIZE = 8;

export function buildPlaylistText(audioFiles, selectedIndex, activePane, playerState) {
    let output = "";
    const totalSongs = audioFiles.length;

    let startIndex = 0;
    if (selectedIndex >= PLAYLIST_PAGE_SIZE) {
        startIndex = Math.min(selectedIndex - Math.floor(PLAYLIST_PAGE_SIZE / 2), totalSongs - PLAYLIST_PAGE_SIZE);
    }
    startIndex = Math.max(0, startIndex);
    const endIndex = Math.min(totalSongs, startIndex + PLAYLIST_PAGE_SIZE);

    for (let i = startIndex; i < endIndex; i++) {
        const fileName = audioFiles[i];
        const isSelected = (i === selectedIndex);
        const isCurrentlyPlaying = (playerState.currentSong === fileName);
        const queuePosition = playerState.queue.indexOf(fileName);
        const isInQueue = (queuePosition !== -1);

        let cursor = "  ";
        if (isSelected && activePane === 'playlist') {
            cursor = "▶ ";
        } else if (isCurrentlyPlaying) {
            cursor = "● ";
        }

        const extension = path.extname(fileName).toUpperCase().replace('.', '') || 'AUD';
        const formatTag = `[${extension}]`;

        const baseName = path.basename(fileName, path.extname(fileName));
        const shortName = baseName.length > 14 ? baseName.substring(0, 12) + ".." : baseName;

        let statusTag = "";
        if (isCurrentlyPlaying) {
            statusTag = playerState.isPaused ? " [PAUSED]" : " [PLAYING]";
        } else if (isInQueue) {
            statusTag = ` [#${queuePosition + 1}]`;
        }

        const trackNumber = String(i + 1).padStart(2, '0');
        output += `${cursor}${trackNumber}. ${formatTag} ${shortName}${statusTag}\n`;
    }

    if (totalSongs > PLAYLIST_PAGE_SIZE) {
        output += `\n  [Showing ${startIndex + 1}-${endIndex} of ${totalSongs}]`;
    }

    return output;
}

export function buildStatusText(playerState) {
    if (playerState.currentSong) {
        const rawName = path.basename(playerState.currentSong, path.extname(playerState.currentSong)).toUpperCase();
        const cleanTitle = rawName.length > 24 ? rawName.substring(0, 21) + "..." : rawName;
        const ext = path.extname(playerState.currentSong).toUpperCase().replace('.', '') || 'AUDIO';

        const stateLabel = playerState.isPaused ? "PAUSED [⏸]" : (playerState.isPlaying ? "PLAYING [🔊]" : "STOPPED [⏹]");
        return ` Track   : ${cleanTitle}\n` +
               ` Format  : [${ext}] Stream Native (AVAudioPlayer)\n` +
               ` Status  : ${stateLabel}`;
    }

    return ` Track   : None selected\n` +
           ` Status  : STANDBY (Select a track and press Enter)`;
}

export function buildProgressText(playerState) {
    if (!playerState.currentSong) return "";

    const barWidth = 20;
    const elapsed = formatTime(playerState.elapsedSeconds);
    const duration = formatTime(playerState.totalDuration);
    const remaining = formatTime(Math.max(0, playerState.totalDuration - playerState.elapsedSeconds));

    const progressRatio = playerState.totalDuration ? Math.max(0, Math.min(1, playerState.elapsedSeconds / playerState.totalDuration)) : 0;
    const percent = Math.round(progressRatio * 100);

    const filledCount = Math.floor(progressRatio * barWidth);
    const emptyCount = Math.max(0, barWidth - filledCount);
    const progressBar = "█".repeat(filledCount) + "░".repeat(emptyCount);

    return ` Progress: [${progressBar}] ${percent}%\n Time    : ${elapsed} / ${duration} (-${remaining})`;
}

export function buildQueueText(playerState) {
    if (playerState.queue.length > 0) {
        const nextTrack = playerState.queue[0];
        const nextTitle = path.basename(nextTrack, path.extname(nextTrack));
        const cleanNext = nextTitle.length > 18 ? nextTitle.substring(0, 15) + "..." : nextTitle;
        return ` Queue   : ${playerState.queue.length} track(s) queued | Next: ${cleanNext}`;
    }
    return ` Queue   : Empty (Press 'c' to enqueue highlighted track)`;
}

export function buildMixerText(playerState, activePane, selectedMixerSlider) {
    const isMixerActive = (activePane === 'mixer');

    const volLabel = isMixerActive && selectedMixerSlider === 0 ? "▶ Master Vol" : "  Master Vol";
    const speedLabel = isMixerActive && selectedMixerSlider === 1 ? "▶ Play Speed" : "  Play Speed";

    const volPercent = Math.round(playerState.volume * 100);
    const volSlider = drawSlider(playerState.volume, isMixerActive && selectedMixerSlider === 0);
    const speedSlider = drawSlider((playerState.rate - 0.5) / 1.5, isMixerActive && selectedMixerSlider === 1);

    return ` ${volLabel.padEnd(14)} : ${volSlider} ${String(volPercent).padStart(3, ' ')}% (0-100% Real-Time Gain)\n` +
           ` ${speedLabel.padEnd(14)} : ${speedSlider} ${playerState.rate.toFixed(1)}x (0.5-2.0x Dynamic Speed)`;
}

export function buildFooterText(activePane, toastMessage) {
    const focusLabel = activePane === 'playlist' ? "[FOCUS: PLAYLIST]" : "[FOCUS: MIXER & EQ]";
    const toast = toastMessage ? ` | ${toastMessage}` : "";
    return ` ${focusLabel}  [Space] Play  [Tab] Pane  [v] Visualizer  [c] Queue  [r] Reset  [n] Next  [q] Quit${toast}`;
}

// =============================================================================
// 4. DASHBOARD CREATION & RENDER ENGINE
// =============================================================================

export function createDashboard(renderer) {
    // Parent Container
    const mainContainer = new BoxRenderable(renderer, {
        width: "100%",
        height: "100%",
        flexDirection: "column",
        padding: 1,
        gap: 1
    });

    // Top Header
    const headerWidget = new TextRenderable(renderer, {
        fg: "#00E5FF", // Cyan
        content: ""
    });
    mainContainer.add(headerWidget);

    // Middle Row
    const middleRow = new BoxRenderable(renderer, {
        width: "100%",
        flexDirection: "row",
        flexGrow: 1,
        gap: 2
    });

    // Left: Playlist Box
    const playlistBox = new BoxRenderable(renderer, {
        width: "40%",
        height: "100%",
        border: true,
        borderStyle: "rounded",
        title: " Track Explorer ",
        titleColor: "#00E5FF",
        borderColor: "#00E5FF",
        padding: 1
    });
    const playlistWidget = new TextRenderable(renderer, {
        fg: "#FFFFFF",
        content: ""
    });
    playlistBox.add(playlistWidget);
    middleRow.add(playlistBox);

    // Right: Dashboard Box
    const dashboardBox = new BoxRenderable(renderer, {
        width: "60%",
        height: "100%",
        border: true,
        borderStyle: "rounded",
        title: " Playback Dashboard ",
        titleColor: "#FFFFFF",
        borderColor: "#444444",
        flexDirection: "column",
        padding: 1,
        gap: 1
    });

    const statusWidget = new TextRenderable(renderer, {
        fg: "#FF4081", // Rose / Pink
        content: ""
    });
    const progressWidget = new TextRenderable(renderer, {
        fg: "#76FF03", // Lime Green
        content: ""
    });
    const visualizerWidget = new TextRenderable(renderer, {
        fg: "#FFD600", // Yellow
        content: ""
    });
    const queueWidget = new TextRenderable(renderer, {
        fg: "#FF9100", // Amber Orange
        content: ""
    });

    dashboardBox.add(statusWidget);
    dashboardBox.add(progressWidget);
    dashboardBox.add(visualizerWidget);
    dashboardBox.add(queueWidget);
    middleRow.add(dashboardBox);

    mainContainer.add(middleRow);

    // Bottom: Mixer Box
    const mixerBox = new BoxRenderable(renderer, {
        width: "100%",
        height: 6,
        border: true,
        borderStyle: "rounded",
        title: " Parametric Mixer & Controls ",
        titleColor: "#FFFFFF",
        borderColor: "#444444",
        flexDirection: "column",
        padding: 1
    });
    const mixerWidget = new TextRenderable(renderer, {
        fg: "#E0E0E0",
        content: ""
    });
    mixerBox.add(mixerWidget);
    mainContainer.add(mixerBox);

    // Footer
    const footerWidget = new TextRenderable(renderer, {
        fg: "#A0A0A0",
        content: ""
    });
    mainContainer.add(footerWidget);

    renderer.root.add(mainContainer);

    // Updates border highlight colors when active pane changes
    function setFocus(activePane) {
        if (activePane === 'playlist') {
            playlistBox.borderColor = "#00E5FF";
            playlistBox.titleColor = "#00E5FF";
            mixerBox.borderColor = "#444444";
            mixerBox.titleColor = "#FFFFFF";
        } else {
            playlistBox.borderColor = "#444444";
            playlistBox.titleColor = "#FFFFFF";
            mixerBox.borderColor = "#00E5FF";
            mixerBox.titleColor = "#00E5FF";
        }
    }

    // Refreshes text content inside all UI widgets
    function render({ audioFiles, selectedTrackIndex, selectedMixerSlider, activePane, toastMessage, playerState }) {
        headerWidget.content = buildHeaderText(audioFiles.length);
        playlistWidget.content = buildPlaylistText(audioFiles, selectedTrackIndex, activePane, playerState);
        statusWidget.content = buildStatusText(playerState);
        progressWidget.content = buildProgressText(playerState);
        visualizerWidget.content = drawVisualizer(playerState);
        queueWidget.content = buildQueueText(playerState);
        mixerWidget.content = buildMixerText(playerState, activePane, selectedMixerSlider);
        footerWidget.content = buildFooterText(activePane, toastMessage);
    }

    return {
        setFocus,
        render
    };
}
