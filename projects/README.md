# Course Projects & Graded Assignments

This directory contains all graded project assignments and course deliverables for the Semester 05 Application Development course.

---

## Directory Organization

To ensure consistent project structure and reproducible builds, each assignment must be placed in its own isolated subfolder:

```
projects/
├── README.md                      # Projects directory index (this file)
├── [project-name-1]/              # Dedicated folder for project 1
│   ├── README.md                  # Project-specific setup and run instructions
│   ├── package.json               # Local project dependencies and scripts
│   ├── package-lock.json          # Dependency lockfile
│   └── src/                       # Application source code
└── [project-name-2]/              # Dedicated folder for project 2
```

---

## Submission Checklist

Before submitting or tagging any project assignment, verify the following:

1. **Dependency Management**:
   * All external libraries must be declared in the project's local `package.json`.
   * Lockfiles (`package-lock.json`) must be committed.
   * `node_modules/` must **not** be tracked or committed to Git (covered by the root `.gitignore`).

2. **Environment Variables & Secrets**:
   * Never commit API keys, authentication tokens, database connection strings, or credentials.
   * Use `.env` files for local configuration and provide a `.env.example` file if environment configuration is required.

3. **Project Documentation**:
   * Include a local `README.md` inside each project subfolder covering:
     * Project description and feature list.
     * Prerequisites and setup commands.
     * How to run, test, and configure the project.

---

## Projects Registry

| Project | Folder | Status | Description |
| :--- | :--- | :--- | :--- |
| *Project 1* | `/projects/project-1` | *Upcoming* | *Pending assignment details* |
| *Project 2* | `/projects/project-2` | *Upcoming* | *Pending assignment details* |
| *Final Project* | `/projects/final-project` | *Upcoming* | *Final capstone course project* |
