# 🎵 CLI Music Player — Build Plan & Roadmap (Revised)

This document outlines the revised roadmap to build a highly polished, interactive, and visually stunning Terminal User Interface (TUI) for our CLI Music Player, tailored to your exact specifications.

---

## 🎨 Core Features Roadmap

### 1. Play / Pause / Reset Setup
* **Play & Pause**: Capture keypresses (e.g., `Space`) to toggle playback using POSIX signals sent to the spawned player process:
  * **Pause**: Send `SIGSTOP`.
  * **Resume**: Send `SIGCONT`.
* **Reset**: Stop current playback, reset the song to `00:00`, and start playing from the beginning (re-spawning the player process).

### 2. Queue & Playlist Management
* **Dynamic Queue**: Manage a list of upcoming songs.
* **Custom Playlists**: Create, save, and load custom playlists (stored in a local JSON configuration file).
* **Controls**: Options to:
  * Add/remove songs to/from the active queue.
  * Clear the queue.
  * Autoplay the next song in the queue upon completion.

### 3. Interactive Equalizer & Mixer (Mixing/Mastering Controls)
* **Goal**: Provide interactive sliders to adjust audio parameters and mix/master the playback.
* **Controls**:
  * **Volume Control**: Real-time adjustment of output volume.
  * **Speed/Tempo (Rate)**: Adjust playback speed (natively supported by macOS `afplay -r <rate>`).
  * **Equalizer Simulation / Integration**:
    * Render interactive frequency band sliders (e.g., Low/Bass, Mid, High/Treble) in the TUI.
    * If external tools like `sox` or `ffmpeg` are available, we can pass frequency filters (e.g., highpass, lowpass, bass boost) to them dynamically. Otherwise, we will offer high-fidelity interactive parameter controls.

### 4. ASCII Banner & Terminal Animations
* **ASCII Banners**: Generate stylized text banners for the currently playing song title and artist.
* **Playback Animations**: Render animations (such as bouncing equalizer spectrum waves, spinning records, or custom visual sequences) using a high-frame-rate rendering loop (`setInterval`) that updates the terminal screen while the song plays.

### 5. High-Precision Progress Bar
* **Live Tracker**: Render a clean progress bar (e.g., `[████████░░░░] 01:42 / 03:15`) indicating the elapsed time vs the total duration.
* **Duration Parsing**: Parse the song file using `afinfo` before playback begins to retrieve the exact duration in seconds.

---

## 🖥️ Phase 5: Elevating to OpenTUI
Once the underlying player, equalizer, and playlist engines are built, we will port the application to **OpenTUI** for a premium terminal interface.

* **Package**: Integrate `@opentui/core`.
* **Layout Grid**: Use a modular, responsive component-based dashboard layout.
* **Sections**:
  * **Sidebar**: Interactive folder explorer & playlists.
  * **Center Panel**: Animated visualizer, ASCII song banner, and progress bar.
  * **Equalizer/Mixer Panel**: Sliders to adjust volume, rate, and frequency filters.
  * **Queue Panel**: Visual list of upcoming tracks.
* **Efficiency**: Benefit from OpenTUI’s native frame-by-frame diff renderer (written in Zig) to prevent cursor flickering and support clean terminal resizing.
