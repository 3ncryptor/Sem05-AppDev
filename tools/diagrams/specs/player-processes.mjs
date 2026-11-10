/**
 * CLI Music Player: two processes joined by pipes. Sources (inClass/CLI-Player/):
 *   renderer, keypress, 100 ms render loop, SIGINT/SIGTERM   index.js (createCliRenderer, keyInput, refreshTimer, exitApplication)
 *   player state, 1 s elapsed timer, afinfo, spawn           songs/cliPlayer.js (getWorker, playSong, getDuration)
 *   commands and replies                                     audio_player.m (handleCommand, PlayerDelegate, main)
 *   PAUSE/RESUME with the engine, SIGSTOP/SIGCONT fallback   songs/cliPlayer.js (pauseSong, resumeSong)
 *   cleanup                                                   songs/cliPlayer.js (cleanupAllAudio)
 *   visualizers drawn from state, not audio                   ui.js (render* functions use time and random values)
 *   compiled by setup.sh, gitignored                          setup.sh lines 18-21, .gitignore
 */
export default {
  id: 'player-processes',
  out: 'inClass/CLI-Player/docs/diagrams/processes',
  width: 1200,
  height: 820,
  title: 'CLI Music Player processes and pipes',
  desc:
    'The terminal process (Bun or Node.js) reads keys through OpenTUI, keeps the player state and redraws every 100 ms. ' +
    'It sends one-line commands over stdin to a separate Objective-C process that plays audio with AVAudioPlayer and replies on stdout. ' +
    'If that binary is missing, macOS afplay is used instead and paused with signals.',
  heading: 'CLI Music Player: two processes, one line-based protocol',
  caption: 'The dashboard really redraws every 100 ms; that loop is slowed down here so it can be seen.',
  legend: [
    ['network', 'terminal and macOS tools'],
    ['client', 'terminal process'],
    ['native', 'audio process'],
    ['jobs', 'shutdown'],
  ],
  dashedMeaning: 'fallback when audio_player is missing',
  dotMeaning: 'key, command or reply in flight',
  groups: [
    { x: 28, y: 80, w: 612, h: 540, layer: 'client', label: 'Terminal process: Bun or Node.js', sub: 'npm start, bun run start:bun, or ./setup.sh' },
    { x: 700, y: 80, w: 472, h: 540, layer: 'native', label: 'Audio process: audio_player (Objective-C)', sub: 'built by setup.sh with clang; not in git' },
  ],
  nodes: [
    { x: 48, y: 130, w: 270, h: 78, layer: 'client', title: 'OpenTUI renderer', lines: ['@opentui/core 0.5', 'keyInput emits keypress'] },
    { x: 338, y: 130, w: 282, h: 78, layer: 'network', title: 'Keyboard and terminal', lines: ['keys in, drawn frames out', '(ANSI terminal)'] },
    { x: 48, y: 240, w: 572, h: 94, layer: 'client', title: 'index.js: key router and app state', lines: ['Space play/pause, r restart, n next, c queue, v visualizer', 'Tab switches pane, q or Esc quits', 'every 100 ms: dashboard.render(state)'] },
    { x: 48, y: 366, w: 270, h: 110, layer: 'client', title: 'ui.js: the dashboard', lines: ['playlist, mixer, queue,', 'progress, 4 visualizers', 'drawn from player state,', 'not from audio samples'] },
    { x: 338, y: 366, w: 282, h: 126, layer: 'client', title: 'songs/cliPlayer.js', lines: ['isPlaying, isPaused, queue,', 'volume 0-1, rate 0.5-2.0', 'elapsed: a 1 s timer', 'duration: afinfo', 'reuses one audio_player'] },
    { x: 48, y: 508, w: 270, h: 94, layer: 'jobs', title: 'Cleanup on exit', lines: ['q, Esc, SIGINT, SIGTERM:', 'STOP, QUIT, then SIGKILL;', 'killall afplay'] },
    { x: 338, y: 524, w: 282, h: 62, layer: 'network', title: 'afinfo (macOS)', lines: ['per song: length in seconds'] },

    { x: 720, y: 130, w: 432, h: 94, layer: 'native', title: 'stdin reader (background queue)', lines: ['fgets reads one line at a time and', 'hands each command to the main queue', '(dispatch_async)'] },
    { x: 720, y: 240, w: 432, h: 126, layer: 'native', title: 'handleCommand (main queue)', lines: ['PLAY <path>   RATE <r>   VOLUME <v>', 'PAUSE   RESUME   STOP   QUIT', 'one AVAudioPlayer, enableRate = YES', 'after PLAY: prints DURATION <s>', 'other replies are ignored by Node'] },
    { x: 720, y: 382, w: 432, h: 62, layer: 'native', title: 'AVAudioPlayer -> CoreAudio', lines: ['speed and volume change mid-track'] },
    { x: 720, y: 460, w: 432, h: 62, layer: 'native', title: 'PlayerDelegate', lines: ['track finished: prints ENDED'] },

    { x: 720, y: 644, w: 452, h: 94, layer: 'network', dashed: true, title: 'Fallback: afplay (macOS), one process per song', lines: ['afplay -v <volume> -r <rate> <file>', 'pause SIGSTOP, resume SIGCONT, stop SIGKILL', 'volume and speed apply from the next track'] },
  ],
  edges: [
    { id: 'pp-term', points: [[318, 169], [337, 169]], arrow: 'both' },
    { id: 'pp-key', points: [[183, 208], [183, 239]], label: 'keypress', labelAt: [183, 212] },
    { id: 'pp-render', points: [[120, 334], [120, 365]], label: 'render', labelAt: [120, 339] },
    { id: 'pp-draw', points: [[48, 421], [38, 421], [38, 150], [47, 150]] },
    { id: 'pp-call', points: [[479, 334], [479, 365]], label: 'playSong, pauseSong...', labelAt: [479, 339] },
    { id: 'pp-afinfo', points: [[479, 492], [479, 523]] },
    { id: 'pp-stdin', points: [[620, 400], [660, 400], [660, 177], [719, 177]], label: 'stdin', labelAt: [660, 280] },
    { id: 'pp-read-handle', points: [[936, 224], [936, 239]] },
    { id: 'pp-handle-av', points: [[936, 366], [936, 381]] },
    { id: 'pp-av-delegate', points: [[936, 444], [936, 459]] },
    { id: 'pp-stdout', points: [[719, 491], [680, 491], [680, 460], [621, 460]], label: 'stdout', labelAt: [680, 470] },
    { id: 'pp-fallback', points: [[600, 492], [600, 506], [660, 506], [660, 690], [719, 690]], dashed: true, label: 'no binary', labelAt: [660, 600] },
  ],
  notes: [],
  flows: [
    { edge: 'pp-term', period: 8, travel: 0.3, begin: 0, layer: 'network', reverse: true },
    { edge: 'pp-key', period: 8, travel: 0.35, begin: 0.3, layer: 'client' },
    { edge: 'pp-call', period: 8, travel: 0.35, begin: 0.65, layer: 'client' },
    { edge: 'pp-afinfo', period: 8, travel: 0.3, begin: 1.0, layer: 'client', r: 4.5 },
    { edge: 'pp-stdin', period: 8, travel: 1.0, begin: 1.0, layer: 'client' },
    { edge: 'pp-read-handle', period: 8, travel: 0.2, begin: 2.0, layer: 'native' },
    { edge: 'pp-handle-av', period: 8, travel: 0.2, begin: 2.2, layer: 'native' },
    { edge: 'pp-stdout', period: 8, travel: 0.7, begin: 2.3, layer: 'native', r: 4.5 },
    { edge: 'pp-av-delegate', period: 8, travel: 0.2, begin: 6.0, layer: 'native' },
    { edge: 'pp-stdout', period: 8, travel: 0.7, begin: 6.2, layer: 'native' },
    { edge: 'pp-render', period: 2, travel: 0.4, begin: 0.2, layer: 'client', r: 4 },
    { edge: 'pp-draw', period: 2, travel: 0.9, begin: 0.6, layer: 'client', r: 4 },
  ],
};
