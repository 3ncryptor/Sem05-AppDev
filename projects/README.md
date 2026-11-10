# Course projects

Graded projects for Application Development, Semester 5, Newton School of Technology, Rishihood University. Part of [Sem05-AppDev](../README.md).

Updated 2026-11-10.

## Summary

No graded project has been assigned yet, so this folder is empty apart from this file. Everything built so far was class work and lives in [`../inClass`](../inClass): the CLI Music Player, Athena (`inClass/Proctor`) and huddle. (`inClass/ChatApp`). When a graded project arrives, it goes in its own folder here and follows the rules and the README template below. The template is the structure the existing project READMEs already use, so every project in the repository reads the same way.

## Registry

| Project | Folder | Assigned | Status | What it is |
|---|---|---|---|---|
| none yet | | | | |

Add one row when a project starts, and update its status (planned, in progress, submitted, graded) as it moves.

## Rules for a project folder

Each project lives in its own folder, named in lowercase with hyphens (for example `projects/expense-tracker/`), and can be run without anything outside that folder. That is how the three in-class projects work, and it is why one can be cloned, read and graded without the others.

Dependencies are declared in the project's own `package.json`, and the lockfile is committed so that an install on another machine gets the same versions. `node_modules/` and build output are never committed; the root `.gitignore` already covers them. Secrets never go into Git: settings live in a `.env` file, which is ignored, and the project ships a `.env.example` with safe placeholder values, as `inClass/ChatApp/backend/.env.example` does. If a project has a start script (`start.sh`, `setup.sh`), it must be safe to run twice.

Work happens on a branch and reaches `main` through a pull request, so `main` always holds something that runs.

## README template for a project

Copy this into `projects/<name>/README.md` and fill every section. The habits behind it: a reader should be able to stop after the summary and know what the project is; every claim about the code names the file it comes from; the quick start ends with a check the reader can run; and the caveats say plainly what does not work or was not tested.

````markdown
# <Project name>

<One sentence: what it is and who uses it.>

Compiled <YYYY-MM-DD>. Facts are cited to file paths in this folder.

## Summary

<Two short paragraphs. What it does, the stack with versions (from package.json),
and the one or two design decisions that matter most, each with the file that shows it.>

## Quick start

You need <operating system>, <runtime and version>, <tools>, <hardware>.

```bash
<the fewest commands that start it, run from this folder>
```

You are done when <a visible result, or a command and its expected output>.

## What is in the box

| Area | What works | Code |
|---|---|---|
| <feature area> | <what a user can do> | `<path>` |

Source: <the files the table was checked against>.

## Scripts

| Command | What it does |
|---|---|
| `<command>` | <what it does> |

## Layout

```
<name>/
  <folder>/     <one line each>
```

## Documentation and further reading

1. <doc>: <what it covers, in reading order>

## Caveats

<Specific limits: what was not tested, known bugs, security gaps, documents that are out of date.>
````

## Before you submit

Check each of these before tagging a submission. The quick start works from a fresh clone, run in a new folder. `git ls-files` shows no `.env`, no `node_modules` and no build output. The README's facts match the code: versions agree with `package.json`, and every command in it exists. Every link in the README opens on GitHub; use relative links such as `docs/API.md`, never absolute paths to your own disk, which only work on your machine. The registry row above is up to date.

## Caveats

The rules above are this repository's own conventions, taken from how the in-class projects were built. They are not the course's official grading rubric. If an assignment brief asks for a different structure or submission method, follow the brief and note the difference in the project's README.
