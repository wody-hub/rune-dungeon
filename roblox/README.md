# Rune Dungeon Roblox sample

This directory contains the reproducible Roblox place scaffold for the local combat sample. It uses [Rojo](https://rojo.space/) to build a place file that can be opened in Roblox Studio.

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
