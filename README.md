# Semester 05: Application Development

Central repository for coursework, lab exercises, and graded project assignments for the Semester 05 Application Development curriculum.

---

## Repository Structure

```
Sem05-AppDev/
├── .gitignore                      # Global Git exclusion rules
├── README.md                       # Workspace overview and directory index
├── inClass/                        # Interactive laboratory implementations
│   └── CLI-Player/                 # Terminal-based music player (OpenTUI, Node.js)
└── projects/                       # Graded project submissions and assignments
    └── README.md                   # Project structure guidelines and standards
```

---

## Workspace Modules

### In-Class Exercises (`/inClass`)
Hands-on laboratory projects built during scheduled lectures.

| Project | Location | Tech Stack | Description |
| :--- | :--- | :--- | :--- |
| **CLI Music Player** | [`inClass/CLI-Player`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/CLI-Player) | Node.js (ESM), `@opentui/core`, POSIX Signals, `afplay` | Terminal music player featuring real-time spectrum visualization, process signal management (`SIGSTOP`/`SIGCONT`), queue management, and volume/tempo mixing controls. |

### Course Projects (`/projects`)
Dedicated workspace for graded course assignments and final project deliverables. Refer to [`projects/README.md`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/projects/README.md) for submission standards and directory templates.

---

## Environment & Prerequisites

* **Runtime:** Node.js (v18.0.0 LTS or higher recommended)
* **Host Operating System:** macOS (Required for modules utilizing native Darwin tools like `afplay` and `afinfo`)
* **Package Manager:** npm (v9.0.0+)
* **Terminal:** ANSI / xterm-256color or TrueColor compatible terminal emulator

---

## Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Sem05-AppDev
```

### 2. Run a Subproject
Navigate directly into the target project folder and execute its turnkey setup script or npm commands:
```bash
cd inClass/CLI-Player
./setup.sh
```
Or via standard NPM:
```bash
npm install
npm start
```
