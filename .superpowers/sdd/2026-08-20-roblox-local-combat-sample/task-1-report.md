# Task 1 report

Status: DONE_WITH_CONCERNS

## Files changed

- `.gitignore`
- `roblox/default.project.json`
- `roblox/README.md`
- `roblox/src/server/init.server.luau`
- `roblox/src/client/init.client.luau`

## Commits

- `ab4cf2c9a7f33ffa37850e33e7116230ff1f1a07` — `chore: scaffold Roblox combat sample`

## Commands and exact outcomes

- `rojo --version` before setup: command not found; exit `127`.
- `brew install rojo-rbx/tap/rojo`: failed because the old tap repository returned `Repository not found`.
- `brew install rojo`: succeeded; `rojo --version` reported `Rojo 7.7.0`.
- Pre-scaffold `rojo build roblox/default.project.json -o roblox/build/RuneDungeonSample.rbxlx`: failed as expected because the project file did not exist; exit `1`.
- Final `rojo build roblox/default.project.json -o roblox/build/RuneDungeonSample.rbxlx`: succeeded.
- `test -s roblox/build/RuneDungeonSample.rbxlx`: succeeded; exit `0`.
- `git check-ignore -v roblox/build/RuneDungeonSample.rbxlx`: confirmed `roblox/build/` ignore rule.
- Final `git status --short` after the implementation commit: clean.

## Self-review

The project maps a DataModel, creates the `RuneDungeon` folder, maps server/client composition roots, and includes the required runtime scripts and README workflow. The generated place is non-empty and ignored.

## Concerns

Rojo 7.7.0 rejects `StarterPlayer.CharacterRigType` (and `AvatarType`) as unknown project properties, so that requested property is omitted to keep the reproducible build passing. `RuneDungeon` uses an explicit `Folder` class because Rojo requires class/path metadata for non-service instances.
