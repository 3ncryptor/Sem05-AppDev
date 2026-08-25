# CLI Music Player

An interactive Terminal User Interface (TUI) audio player built with Node.js and `@opentui/core`. It provides real-time playback control, track queuing, volume/speed mixing, and audio spectrum visualization by managing native macOS audio processes via POSIX signals.

---

## Architecture Overview

The application follows a modular 3-tier architecture separating the presentation layer, controller bridge, and hardware audio driver:

```mermaid
graph TD
    subgraph UI_Tier ["Presentation Layer (ui.js)"]
        Renderer[OpenTUI Renderer]
        Visualizers[44-Char Multi-Mode Visualizers]
        Widgets[Track Explorer & Parametric Mixer Widgets]
    end

    subgraph Controller_Tier ["Controller Layer (index.js & cliPlayer.js)"]
        KeyEvents[Keypress Router: Space, Tab, v, c, r, n, q]
        State[Player State Store & Queue Manager]
        ProcessController[IPC Subprocess Bridge]
    end

    subgraph Hardware_Tier ["Hardware Audio Driver (audio_player.m)"]
        AVPlayer[Apple AVFoundation AVAudioPlayer]
        CoreAudio[macOS CoreAudio Hardware Output]
    end

    KeyEvents -->|Input Events| State
    KeyEvents -->|Visualizer Toggle| Visualizers
    State -->|Render State Vector| Renderer
    ProcessController -->|IPC Stdin: PLAY, RATE, VOLUME, STOP| AVPlayer
    AVPlayer -->|PCM Stream| CoreAudio
    AVPlayer -->|Telemetry Stdout: DURATION, ENDED| ProcessController
```

* **UI Presentation Layer (`ui.js`)**: Encapsulates OpenTUI layout grids, border highlight states, widgets, and 4 precision 44-character visualizer renderers.
* **Controller Layer (`index.js` & `songs/cliPlayer.js`)**: Routes user keypress events, manages playlists and queues, and bridges commands to the audio worker over standard IO streams.
* **Hardware Audio Driver (`audio_player.m`)**: A native Objective-C daemon compiled via `clang` utilizing Apple's `AVFoundation` framework for dynamic, in-flight playback speed and volume adjustments with 0ms latency.

---

## Key Features

* **Multi-Mode Precision Audio Visualizers**: Toggleable on the fly with the `v` key, calibrated to 44 characters wide for zero line wrapping:
  * **Retro Hi-Fi Cassette Deck (Default)**: Features animated rotating tape spools (`◓ ◷ ◑ ◶ ◒ ◵ ◐ ◴`), dynamic magnetic tape transfer tracking (`░░█░░`), and active magnetic head state indicators.
  * **Cyberpunk Stereo Spectrum**: 20 high-density frequency sub-bands with gravity-decay peak caps (`▲`, `⬝`) and dual-channel VU meters.
  * **Laser Oscilloscope**: Multi-harmonic sinusoidal audio voltage waveform with envelope shaping.
  * **Cosmic Nebula Particle Matrix**: 2D acoustic transient matrix with radiant center pulsar and expanding shockwave rings.
* **Real-Time Dynamic Audio Mixing**:
  * **Master Volume**: Modulate song volume in real time from `0%` to `100%` without altering OS master volume.
  * **Dynamic Playback Speed**: Modulate tempo in real time from `0.5x` to `2.0x` with instant pitch/time-stretch engine response.
* **Queue & Playlist Management**: Windowed track pagination, enqueueing (`c` key), and automatic queue progression.
* **Clean OS Lifecycle Management**: Subscribes to `SIGINT`, `SIGTERM`, and `exit` hooks ensuring zero orphaned background audio processes.

---

## Keyboard Controls

Use `Tab` to switch active focus between the **Playlist** panel and the **Mixer & Equalizer** panel.

### Global Controls
| Key | Context | Action |
| :--- | :--- | :--- |
| `Space` | Global | Play / Pause / Resume current track |
| `v` | Global | Cycle visualizer mode (Spectrum, Oscilloscope, Nebula, Cassette) |
| `r` | Global | Reset track (restarts playback from `00:00`) |
| `n` | Global | Skip current song (plays next queued track) |
| `Tab` | Global | Toggle focus between Playlist and Mixer panels |
| `q` / `Esc` | Global | Stop playback and exit application cleanly |

### Panel-Specific Controls
| Active Panel | Key | Action |
| :--- | :--- | :--- |
| **Playlist** | `Up` / `Down` | Navigate through available tracks |
| **Playlist** | `Return` / `Enter` | Play selected track |
| **Playlist** | `c` | Add selected track to queue |
| **Mixer** | `Up` / `Down` | Toggle selection between Volume and Speed sliders |
| **Mixer** | `Left` / `Right` | Adjust selected slider value down / up |

---

## Project Structure

```
inClass/CLI-Player/
├── setup.sh              # Turnkey environment check, installation, and launch script
├── index.js              # Application entrypoint and keyboard input routing
├── ui.js                 # OpenTUI dashboard layout, widgets, and text builders
├── audio_player.m        # Native hardware audio driver (AVFoundation / CoreAudio)
├── package.json          # Project metadata, scripts, and dependencies
├── package-lock.json     # Dependency lockfile
├── BuildPlan.md          # Feature roadmap and implementation notes
├── README.md             # Project documentation
└── songs/
    ├── cliPlayer.js      # Audio controller and native IPC worker bridge
    ├── cliPlayer2.js     # Legacy synchronous playback reference
    └── *.mp3             # Bundled sample audio files
```

---

## Installation & Usage

### Prerequisites
* **Host OS:** macOS (Required for native `afplay` and `afinfo` commands).
* **JavaScript Runtime:** [Bun](https://bun.sh) (recommended for high-performance OpenTUI execution) or **Node.js** (v18.0.0+).

### Option A: Turnkey Launch (Recommended)
Run the automated initialization and launch script (auto-detects Bun or Node.js, installs missing dependencies, and starts the player):
```bash
cd inClass/CLI-Player
./setup.sh
```

You can also pass a custom audio directory directly:
```bash
./setup.sh /path/to/music/folder
```

### Option B: Execution via Bun
```bash
cd inClass/CLI-Player

# 1. Install dependencies
bun install

# 2. Launch player
bun start
# or directly:
bun run index.js
```

### Option C: Execution via Node.js / NPM
```bash
cd inClass/CLI-Player

# 1. Install dependencies
npm install

# 2. Launch player
npm start
```

