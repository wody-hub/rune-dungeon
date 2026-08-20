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

## Review fix round 1

Changes:

- Added a server-side `enforceR15` guard that waits for every character's `Humanoid` and raises a clear error unless `Humanoid.RigType == Enum.HumanoidRigType.R15`.
- Documented the R15 runtime requirement and Roblox Studio `0.735.0.7351131` minimum prerequisite in `roblox/README.md`.

Covering test command:

```text
rg -n 'HumanoidRigType\.R15|WaitForChild\("Humanoid"\)|CharacterAdded|0\.735\.0\.7351131' roblox/src/server/init.server.luau roblox/README.md
rojo build roblox/default.project.json -o roblox/build/RuneDungeonSample.rbxlx
test -s roblox/build/RuneDungeonSample.rbxlx
git check-ignore -v roblox/build/RuneDungeonSample.rbxlx
git status --short
```

## Review fix round 2

Changes:

- Hardened the R15 guard: a non-R15 character is destroyed immediately and its player is kicked with an explicit R15-required message, preventing the session from continuing.
- Added actionable Studio setup: `File > Game Settings > Avatar > Avatar Type: R15`, with the minimum Studio version and runtime behavior.

Covering test command:

```text
rg -n 'HumanoidRigType\.R15|character:Destroy\(\)|player:Kick\(|Avatar Type: R15|File > Game Settings > Avatar|0\.735\.0\.7351131' roblox/src/server/init.server.luau roblox/README.md
rojo build roblox/default.project.json -o roblox/build/RuneDungeonSample.rbxlx
test -s roblox/build/RuneDungeonSample.rbxlx
git check-ignore -v roblox/build/RuneDungeonSample.rbxlx
git status --short
```

Exact output:

```text
roblox/README.md:7:Use Roblox Studio **0.735.0.7351131 or newer**. Before pressing Play, select **File > Game Settings > Avatar > Avatar Type: R15**. Player characters must use the R15 rig; the server enforces this at runtime, destroys non-R15 characters, and stops those sessions with a clear R15-required message.
roblox/src/server/init.server.luau:13: if humanoid.RigType ~= Enum.HumanoidRigType.R15 then
roblox/src/server/init.server.luau:14: character:Destroy()
roblox/src/server/init.server.luau:15: player:Kick(("[RuneDungeon] R15 rig required; received %s"):format(humanoid.RigType.Name))
Building project 'RuneDungeonSample'
Built project to RuneDungeonSample.rbxlx
.gitignore:6:roblox/build/ roblox/build/RuneDungeonSample.rbxlx
 M roblox/README.md
 M roblox/src/server/init.server.luau
```

Exact output:

```text
roblox/README.md:7:Use Roblox Studio **0.735.0.7351131 or newer**. Player characters must use the R15 rig; the server enforces this at runtime and reports a clear error if a character has another rig type.
roblox/src/server/init.server.luau:12:	local humanoid = character:WaitForChild("Humanoid")
roblox/src/server/init.server.luau:13:	if humanoid.RigType ~= Enum.HumanoidRigType.R15 then
roblox/src/server/init.server.luau:19:	player.CharacterAdded:Connect(enforceR15)
Building project 'RuneDungeonSample'
Built project to RuneDungeonSample.rbxlx
.gitignore:6:roblox/build/	roblox/build/RuneDungeonSample.rbxlx
 M roblox/README.md
 M roblox/src/server/init.server.luau
```
