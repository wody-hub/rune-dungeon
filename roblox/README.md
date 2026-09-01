# Rune Dungeon Roblox sample

> **Paused and archived (2026-09-01).** This prototype is preserved on
> `archive/roblox-local-combat-sample` and is no longer the active Rune Dungeon
> direction. Do not delete the worktree or treat the WIP combat probe as
> production-ready. See [the pause decision](../docs/decisions/0001-pause-roblox-prototype.md)
> for completed work, known unfinished work, and resume instructions.

This directory contains the reproducible Roblox place scaffold for the local combat sample. It uses [Rojo](https://rojo.space/) to build a place file that can be opened in Roblox Studio.

## Prerequisites

Use Roblox Studio **0.735.0.7351131 or newer**. Before pressing Play, open **File > Avatar Settings** and select the R15 avatar type. Player characters must use the R15 rig; the server enforces this at runtime, destroys non-R15 characters, and stops those sessions with a clear R15-required message.

## Install

Install the official Rojo CLI with Homebrew:

```bash
brew install rojo
rojo --version
```

Rojo 7.5.1 or newer is supported. The Studio plugin is not required for this workflow.

## Build

From the repository root, run:

```bash
rojo build roblox/default.project.json -o roblox/build/RuneDungeonSample.rbxlx
```

The generated `RuneDungeonSample.rbxlx` is ignored by Git.

## Open and play

Open `roblox/build/RuneDungeonSample.rbxlx` with Roblox Studio (installed at `/Applications/RobloxStudio.app` on macOS). Press **Play** in Studio to run the local server and client scripts. The server creates `ReplicatedStorage/RuneDungeon/Remotes/ActionRequested` at startup, and the client waits for it before becoming ready.

## Controls

The scaffold currently has no gameplay input bound. The upcoming combat sample will use standard Roblox movement (W/A/S/D) and mouse/keyboard action controls; rebuild and reopen the place after syncing those changes.
