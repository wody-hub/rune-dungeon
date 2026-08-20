# Roblox Local Combat Sample Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private local Roblox Studio Place where an R15 player fights three ink slimes, earns `음`, and toggles a fire transformation under server-authoritative rules.

**Architecture:** Keep the experiment isolated in `roblox/` and generate a local `.rbxlx` with Rojo. Roblox owns character movement; client modules own input, camera, HUD, and cosmetic animation; server modules exclusively own health, attack validation, enemy state, rewards, and transformation. Deterministic world construction avoids committing opaque Studio binary content.

**Tech Stack:** Roblox Studio `0.735.0.7351131` or newer, Luau, Roblox R15, Rojo `7.5.1` or newer, built-in Roblox services, Studio-only Luau test runner

## Global Constraints

- Keep the experiment inside `roblox/`; do not change or remove `client/`, `server/`, or `shared/` behavior.
- Build and run locally only. Do not publish, create a cloud Experience, use DataStore, spend Robux, or change account settings.
- Use Roblox-native R15 `WASD`, `Space`, and camera-relative movement.
- Bind attack to mouse button 1 and `F`; bind transformation to `Q`.
- Lock the camera to a non-rotatable, non-zoomable isometric view.
- The client may request only action names. It never submits damage, reward, HP, target, cooldown, or transformation eligibility.
- Server constants: player HP `100`; sword damage `50`, cooldown `0.9` seconds, range `9` studs, frontal angle `120` degrees.
- Slime constants: HP `100`, speed `8` studs/second, detection `35` studs, range `5` studs, leash `55` studs, damage `10`, interval `1.4` seconds, respawn `4` seconds.
- Reward `1` `음` per kill and require `3` `음` for transformation.
- Show transformation through HUD text, orange outline, particles, and sword glow; never rely on color alone.
- Follow `DESIGN.md`: ink-dark environment, restrained saturation, cyan interaction glow, and fire glow close to `#FFAD42`.
- Keep generated `roblox/build/*.rbxlx` files local and uncommitted.
- Every Studio Play run must emit `[RuneDungeonTests] PASS 4` and no new Output errors.

---

## Planned File Structure

```text
roblox/
├── README.md
├── default.project.json
├── build/
├── scripts/validate-client-contract.mjs
└── src/
    ├── shared/
    │   ├── Config.luau
    │   ├── CombatRules.luau
    │   └── SlimeRules.luau
    ├── server/
    │   ├── init.server.luau
    │   ├── WorldBuilder.luau
    │   ├── PlayerService.luau
    │   ├── SlimeService.luau
    │   ├── CombatService.luau
    │   └── tests/
    │       ├── init.server.luau
    │       ├── CombatRules.spec.luau
    │       ├── SlimeRules.spec.luau
    │       ├── WorldBuilder.spec.luau
    │       └── CombatService.spec.luau
    └── client/
        ├── init.client.luau
        ├── CameraController.luau
        ├── InputController.luau
        ├── HudController.luau
        └── CharacterEffects.luau
```

## Task 1: Reproducible Rojo Place Scaffold

**Files:**
- Create: `roblox/default.project.json`
- Create: `roblox/README.md`
- Create: `roblox/src/server/init.server.luau`
- Create: `roblox/src/client/init.client.luau`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `/Applications/RobloxStudio.app`
- Produces: `roblox/build/RuneDungeonSample.rbxlx`, `ReplicatedStorage/RuneDungeon/Remotes/ActionRequested`

- [ ] **Step 1: Verify Rojo is initially absent**

Run `rojo --version`. Expected before setup: exit `127`. If present, require version `7.5.1` or newer.

- [ ] **Step 2: Install and verify Rojo**

```bash
brew install rojo-rbx/tap/rojo
rojo --version
```

Expected: `Rojo 7.5.1` or newer. Do not install the Studio plugin because this plan uses `rojo build`.

- [ ] **Step 3: Prove the build fails before the project exists**

```bash
mkdir -p roblox/build
rojo build roblox/default.project.json -o roblox/build/RuneDungeonSample.rbxlx
```

Expected: FAIL because `default.project.json` does not exist.

- [ ] **Step 4: Create the minimal DataModel mapping**

`roblox/default.project.json`:

```json
{
  "name": "RuneDungeonSample",
  "tree": {
    "$className": "DataModel",
    "ReplicatedStorage": { "RuneDungeon": {} },
    "ServerScriptService": { "RuneDungeonServer": { "$path": "src/server" } },
    "StarterPlayer": {
      "$properties": {
        "CameraMaxZoomDistance": 32,
        "CameraMinZoomDistance": 32,
        "CharacterRigType": "R15"
      },
      "StarterPlayerScripts": { "RuneDungeonClient": { "$path": "src/client" } }
    },
    "Workspace": { "$properties": { "StreamingEnabled": false } }
  }
}
```

Create the server composition root with:

```lua
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local root = ReplicatedStorage:WaitForChild("RuneDungeon")
local remotes = Instance.new("Folder")
remotes.Name = "Remotes"
remotes.Parent = root
local actionRequested = Instance.new("RemoteEvent")
actionRequested.Name = "ActionRequested"
actionRequested.Parent = remotes
print("[RuneDungeon] server ready")
```

Create the client composition root with:

```lua
local ReplicatedStorage = game:GetService("ReplicatedStorage")
ReplicatedStorage:WaitForChild("RuneDungeon"):WaitForChild("Remotes"):WaitForChild("ActionRequested")
print("[RuneDungeon] client ready")
```

Append `roblox/build/` and `*.rbxlx.lock` to `.gitignore`. Document installation, build, open, Play, and controls in `roblox/README.md`.

- [ ] **Step 5: Build and verify the output is ignored**

```bash
rojo build roblox/default.project.json -o roblox/build/RuneDungeonSample.rbxlx
test -s roblox/build/RuneDungeonSample.rbxlx
git status --short
```

Expected: both commands exit `0`; the generated Place is absent from Git status.

- [ ] **Step 6: Commit**

```bash
git add .gitignore roblox
git commit -m "chore: scaffold Roblox combat sample"
```

## Task 2: Shared Rules and Studio Test Harness

**Files:**
- Modify: `roblox/default.project.json`
- Create: `roblox/src/shared/Config.luau`
- Create: `roblox/src/shared/CombatRules.luau`
- Create: `roblox/src/shared/SlimeRules.luau`
- Create: `roblox/src/server/tests/init.server.luau`
- Create: `roblox/src/server/tests/CombatRules.spec.luau`
- Create: `roblox/src/server/tests/SlimeRules.spec.luau`

**Interfaces:**
- Produces: `CombatRules.canAttack(number, number) -> boolean`, `CombatRules.isInAttackArc(CFrame, Vector3) -> boolean`, `CombatRules.canTransform(number) -> boolean`, `SlimeRules.nextState(context) -> string`

- [ ] **Step 1: Write the failing rule specs and runner**

`CombatRules.spec.luau` returns a function containing:

```lua
local CombatRules = require(game.ReplicatedStorage.RuneDungeon.Shared.CombatRules)
assert(CombatRules.canAttack(10, 9.1))
assert(not CombatRules.canAttack(10, 9.11))
assert(CombatRules.isInAttackArc(CFrame.new(), Vector3.new(0, 0, -9)))
assert(not CombatRules.isInAttackArc(CFrame.new(), Vector3.new(0, 0, -9.01)))
assert(not CombatRules.isInAttackArc(CFrame.new(), Vector3.new(0, 0, 4)))
assert(not CombatRules.canTransform(2))
assert(CombatRules.canTransform(3))
```

`SlimeRules.spec.luau` asserts `idle -> chasing` inside detection, `chasing -> attacking` inside attack range, no player -> `idle`, and any active state -> `returning` beyond the leash. The Studio-only runner requires all sibling names ending in `.spec`, raises on first failure, and prints `[RuneDungeonTests] PASS <count>`.

- [ ] **Step 2: Build, open, and see the missing-module failure**

```bash
rojo build roblox/default.project.json -o roblox/build/RuneDungeonSample.rbxlx
open roblox/build/RuneDungeonSample.rbxlx
```

Press Play and inspect Output. Expected: require failure because `CombatRules` or `SlimeRules` is absent.

- [ ] **Step 3: Implement immutable configuration**

Add `"Shared": { "$path": "src/shared" }` under `ReplicatedStorage/RuneDungeon` in `default.project.json`, then create `Config.luau` with this frozen contract:

```lua
return table.freeze({
    actions = table.freeze({ attack = "Attack", toggleTransform = "ToggleTransform" }),
    player = table.freeze({ maxHealth = 100, transformEum = 3 }),
    greatsword = table.freeze({ damage = 50, cooldownSeconds = 0.9, rangeStuds = 9, arcDegrees = 120 }),
    slime = table.freeze({
        maxHealth = 100, speedStudsPerSecond = 8, detectionStuds = 35,
        attackStuds = 5, leashStuds = 55, damage = 10,
        attackIntervalSeconds = 1.4, respawnSeconds = 4, eumReward = 1,
    }),
})
```

- [ ] **Step 4: Implement the minimal pure rules**

`CombatRules` rejects non-finite/negative numbers, calculates planar distance, and compares the forward dot product to `math.cos(math.rad(60))`. `SlimeRules.nextState` consumes `distanceToPlayer`, `distanceFromSpawn`, and `hasLivingPlayer`, returning only `idle`, `chasing`, `attacking`, or `returning`; detection and attack boundaries are inclusive and leash comparison is strict `>`.

- [ ] **Step 5: Rebuild and verify tests pass**

Expected Studio Output: `[RuneDungeonTests] PASS 2` and no assertion/runtime errors.

- [ ] **Step 6: Commit**

```bash
git add roblox/src/shared roblox/src/server/tests
git commit -m "test: define Roblox combat rules"
```

## Task 3: Deterministic Arena and R15 Presentation

**Files:**
- Create: `roblox/src/server/WorldBuilder.luau`
- Create: `roblox/src/server/PlayerService.luau`
- Create: `roblox/src/server/tests/WorldBuilder.spec.luau`
- Modify: `roblox/src/server/init.server.luau`

**Interfaces:**
- Produces: `WorldBuilder.build() -> Model`, `WorldBuilder.getSlimeSpawnCFrames() -> {CFrame}`, `PlayerService.start()`, Player Attributes `EumCount`, `IsTransformed`, `LastAttackSequence`

- [ ] **Step 1: Write a failing world smoke spec**

```lua
local WorldBuilder = require(script.Parent.Parent.WorldBuilder)
local world = WorldBuilder.build()
assert(world.Name == "RuneDungeonWorld")
assert(world:FindFirstChild("Arena") ~= nil)
assert(world:FindFirstChild("PlayerSpawn", true):IsA("SpawnLocation"))
assert(#WorldBuilder.getSlimeSpawnCFrames() == 3)
```

- [ ] **Step 2: Run Studio and verify the missing-module failure**

Expected: the runner fails to require `WorldBuilder` and emits no PASS line.

- [ ] **Step 3: Construct the arena and lighting**

`WorldBuilder.build()` must return an existing complete `Workspace/RuneDungeonWorld` unchanged or create it once with:

- anchored `120 x 2 x 120` floor at `Y = -1`, `Color3.fromRGB(13, 20, 24)`;
- cyan non-colliding neon trim around the inner combat area;
- twelve anchored perimeter wall segments;
- neutral `SpawnLocation` at `(0, 2, 26)`;
- three invisible anchored spawn markers at `(-18, 1, -12)`, `(0, 1, -24)`, `(18, 1, -12)`;
- Lighting `ClockTime = 1`, `Brightness = 1.5`, `Ambient = Color3.fromRGB(24, 35, 40)`, and one restrained Atmosphere.

Return the world Model and a new array of the three marker CFrames. Never delete unrelated Workspace children. This keeps the smoke spec safe regardless of whether the test runner or composition root starts first.

- [ ] **Step 4: Initialize R15 players and temporary Aram presentation**

`PlayerService.start()` sets Player `EumCount = 0`, `IsTransformed = false`, `LastAttackSequence = 0`, and applies `100` maximum/current Humanoid health on every character. Recolor R15 body parts to navy/skin roles, weld a black hair cap to `Head`, and weld a `Greatsword` model to `RightHand` with `Motor6D` `GreatswordMotor`.

The sword contains dark metal `Blade`, cloth grip, disabled orange `PointLight`, and disabled `ParticleEmitter`. The character contains disabled `FireTransformHighlight` and disabled torso `FireTransformParticles`. Keep these exact names for `CombatService` and `CharacterEffects`.

- [ ] **Step 5: Compose and verify the world**

Call `WorldBuilder.build()` before `PlayerService.start()`. Rebuild and Play. Expected: `[RuneDungeonTests] PASS 3`, one dark arena, one R15 character, and a visible sword.

- [ ] **Step 6: Commit**

```bash
git add roblox/src/server/WorldBuilder.luau roblox/src/server/PlayerService.luau roblox/src/server/tests/WorldBuilder.spec.luau roblox/src/server/init.server.luau
git commit -m "feat: add Roblox arena and R15 presentation"
```

## Task 4: Server-Owned Slime Lifecycle

**Files:**
- Modify: `roblox/src/shared/SlimeRules.luau`
- Modify: `roblox/src/server/tests/SlimeRules.spec.luau`
- Create: `roblox/src/server/SlimeService.luau`
- Modify: `roblox/src/server/init.server.luau`

**Interfaces:**
- Consumes: `WorldBuilder.getSlimeSpawnCFrames()`, `SlimeRules.nextState`
- Produces: `SlimeService.start({CFrame})`, `SlimeService.findAttackTarget(CFrame) -> Model?`, `SlimeService.damage(Model, number, Player) -> boolean`

- [ ] **Step 1: Add failing boundary cases**

Extend the SlimeRules spec:

```lua
assert(SlimeRules.nextState({ hasLivingPlayer = false, distanceToPlayer = math.huge, distanceFromSpawn = 0 }) == "idle")
assert(SlimeRules.nextState({ hasLivingPlayer = true, distanceToPlayer = 35, distanceFromSpawn = 0 }) == "chasing")
assert(SlimeRules.nextState({ hasLivingPlayer = true, distanceToPlayer = 5, distanceFromSpawn = 0 }) == "attacking")
assert(SlimeRules.nextState({ hasLivingPlayer = true, distanceToPlayer = 1, distanceFromSpawn = 55.01 }) == "returning")
```

- [ ] **Step 2: Run and verify at least one new assertion fails**

Expected: FAIL until detection/attack use `<=` and leash uses `>`.

- [ ] **Step 3: Correct the rules and implement SlimeService**

Each slime record owns `model`, `core`, `spawnCFrame`, `state`, `health`, `lastAttackAtSeconds`, `lastDamager`, and `respawnAtSeconds`. Create a round black-purple body, smaller cyan core, and `BillboardGui` HP bar. Publish Model Attributes `Health`, `MaxHealth`, and `State`.

On `RunService.Heartbeat`, choose the nearest living player, call `SlimeRules.nextState`, move the anchored core on the XZ plane by at most `8 * dt` studs, and deal exactly `10` damage only every `1.4` seconds. Returning targets the spawn CFrame.

`damage` rejects unknown/dead models and non-positive/non-finite amounts. It updates Attributes and returns `true` only on the first transition to dead. A dead model hides and disables attacks, then respawns at its own marker after `4` seconds with all state reset.

Wrap each record update in its own `xpcall` and rate-limit its warning so one broken slime cannot terminate the shared Heartbeat loop.

- [ ] **Step 4: Start three slimes and verify runtime states**

Call `SlimeService.start(WorldBuilder.getSlimeSpawnCFrames())`. In one Play run, cross the `35`-stud boundary, stop inside `5`, and move beyond the `55`-stud leash.

Expected: exactly three slimes; `idle -> chasing -> attacking`; player loses `10` no faster than every `1.4` seconds; `returning` ends at the original marker.

- [ ] **Step 5: Commit**

```bash
git add roblox/src/shared/SlimeRules.luau roblox/src/server/tests/SlimeRules.spec.luau roblox/src/server/SlimeService.luau roblox/src/server/init.server.luau
git commit -m "feat: add server-owned ink slimes"
```

## Task 5: Authoritative Attack, Reward, and Transformation

**Files:**
- Create: `roblox/src/server/CombatService.luau`
- Create: `roblox/src/server/tests/CombatService.spec.luau`
- Modify: `roblox/src/server/init.server.luau`
- Modify: `roblox/src/server/PlayerService.luau`

**Interfaces:**
- Consumes: `ActionRequested.OnServerEvent`, `CombatRules`, `SlimeService`, named character cosmetics
- Produces: `CombatService.validateActionName(any) -> string?`, `CombatService.start(RemoteEvent)`

- [ ] **Step 1: Write the failing action contract spec**

```lua
local CombatService = require(script.Parent.Parent.CombatService)
assert(CombatService.validateActionName("Attack") == "Attack")
assert(CombatService.validateActionName("ToggleTransform") == "ToggleTransform")
assert(CombatService.validateActionName("GiveEum") == nil)
assert(CombatService.validateActionName(50) == nil)
assert(CombatService.validateActionName({ damage = 999 }) == nil)
```

- [ ] **Step 2: Run Studio and verify CombatService is missing**

Expected: require failure and no PASS line.

- [ ] **Step 3: Implement server-only attack resolution**

Accept only the Player injected by `OnServerEvent` and one action string. For `Attack`, require a living Humanoid and root, enforce server time cooldown, get the nearest slime from `SlimeService.findAttackTarget`, re-check `CombatRules.isInAttackArc`, and call `SlimeService.damage` with `Config.greatsword.damage`. Never accept a target or number from the Remote.

On acceptance, store server time and increment Player `LastAttackSequence`. Rejected attacks do neither. When `damage` returns true for the first death, add exactly `Config.slime.eumReward` to that Player's `EumCount`.

Missing or dead characters, Humanoids, roots, and targets are rejected without state change. Remove the player's cooldown entry on `Players.PlayerRemoving`.

- [ ] **Step 4: Implement transformation and cosmetics**

For `ToggleTransform`, read only server-owned `EumCount`. Reject below `3`; otherwise toggle `IsTransformed` and atomically apply:

```lua
highlight.Enabled = isTransformed
torsoParticles.Enabled = isTransformed
swordParticles.Enabled = isTransformed
swordLight.Enabled = isTransformed
blade.Material = if isTransformed then Enum.Material.Neon else Enum.Material.Metal
blade.Color = if isTransformed then Color3.fromRGB(255, 173, 66) else Color3.fromRGB(42, 52, 58)
```

Keep `EumCount` and `IsTransformed` on Player across character respawn and reapply the appearance to the new character.

- [ ] **Step 5: Compose and verify authoritative behavior**

Start CombatService after player and slime services. Expected: `[RuneDungeonTests] PASS 4`; out-of-range and rear attacks do nothing; two valid attacks kill; one death awards one `음`; transformation is rejected at `2` and accepted at `3`.

- [ ] **Step 6: Commit**

```bash
git add roblox/src/server/CombatService.luau roblox/src/server/tests/CombatService.spec.luau roblox/src/server/PlayerService.luau roblox/src/server/init.server.luau
git commit -m "feat: add authoritative Roblox combat"
```

## Task 6: Fixed Camera, Native Input, HUD, and Feedback

**Files:**
- Create: `roblox/scripts/validate-client-contract.mjs`
- Create: `roblox/src/client/CameraController.luau`
- Create: `roblox/src/client/InputController.luau`
- Create: `roblox/src/client/HudController.luau`
- Create: `roblox/src/client/CharacterEffects.luau`
- Modify: `roblox/src/client/init.client.luau`

**Interfaces:**
- Consumes: `ActionRequested`, Player Attributes `EumCount`, `IsTransformed`, `LastAttackSequence`, R15 character
- Produces: `CameraController.start()`, `InputController.start(RemoteEvent)`, `HudController.start()`, `CharacterEffects.start()`

- [ ] **Step 1: Write a failing static client contract check**

The Node script reads the four controller files and exits non-zero unless their combined source contains these exact tokens:

```js
const required = [
  'MouseButton1',
  'KeyCode.F',
  'KeyCode.Q',
  'CameraType.Scriptable',
  'BindToRenderStep',
  'EumCount',
  'IsTransformed',
  'LastAttackSequence',
];
```

Run `node roblox/scripts/validate-client-contract.mjs`. Expected: FAIL listing the missing controller files.

- [ ] **Step 2: Implement the fixed camera**

Bind at `Enum.RenderPriority.Camera.Value + 1`, set `CameraType.Scriptable` every frame, and use:

```lua
local FOCUS_OFFSET = Vector3.new(0, 3, 0)
local CAMERA_OFFSET = Vector3.new(28, 32, 28)
local focus = root.Position + FOCUS_OFFSET
camera.CFrame = CFrame.lookAt(focus + CAMERA_OFFSET, focus)
camera.Focus = CFrame.new(focus)
```

Reconnect to each `CharacterAdded` root. Do not read or preserve user camera rotation or zoom.

- [ ] **Step 3: Implement input and attack feedback**

Use `ContextActionService:BindAction` for `F` and `Q`, and `UserInputService.InputBegan` for unprocessed `MouseButton1`. Send only `Config.actions.attack` or `Config.actions.toggleTransform`.

`CharacterEffects` listens to `LastAttackSequence`, finds `GreatswordMotor`, cancels an existing tween, and tweens `Motor6D.Transform` from identity to a forward slash and back within `0.28` seconds. It never chooses a target or applies damage.

- [ ] **Step 4: Implement the HUD**

Create `ScreenGui` `RuneDungeonHud` with:

- top-left HP bound to Humanoid `Health` and `MaxHealth`;
- top-right `음 <count> / 3` bound to `EumCount`;
- bottom-center `공격  좌클릭 / F    변신  Q`;
- bottom-center `평상 상태` or `화염 변신` bound to `IsTransformed`.

Use panel `Color3.fromRGB(24, 35, 40)`, text `Color3.fromRGB(221, 212, 189)`, cyan `Color3.fromRGB(104, 213, 208)`, fire `Color3.fromRGB(255, 173, 66)`, and `UICorner` radius `4`. No full-screen overlay is allowed.

Before Attributes replicate, display `음 0 / 3` and `평상 상태` without writing those defaults back to Player state. Disconnect old Humanoid listeners when `CharacterAdded` fires again.

- [ ] **Step 5: Compose and validate the client**

Start camera, HUD, effects, then input after waiting for the Remote. Run:

```bash
node roblox/scripts/validate-client-contract.mjs
rojo build roblox/default.project.json -o roblox/build/RuneDungeonSample.rbxlx
```

Expected: `client contract ok`, then successful Rojo build.

- [ ] **Step 6: Play-test input and visuals**

Expected: camera-relative `WASD`, `Space`, locked view, identical left-click/`F` slash, Attribute-driven HUD, rejected `Q` below three kills, and all four transform cues after three kills.

- [ ] **Step 7: Commit**

```bash
git add roblox/src/client roblox/scripts/validate-client-contract.mjs
git commit -m "feat: add Roblox camera controls and HUD"
```

## Task 7: End-to-End Studio Verification and Handoff

**Files:**
- Modify: `roblox/README.md`
- Modify: `progress.md`

**Interfaces:**
- Consumes: completed local Place
- Produces: reproducible launch instructions, visual review screenshots, recorded experiment state

- [ ] **Step 1: Run all non-interactive checks**

```bash
node roblox/scripts/validate-client-contract.mjs
rojo build roblox/default.project.json -o roblox/build/RuneDungeonSample.rbxlx
test -s roblox/build/RuneDungeonSample.rbxlx
git diff --check
```

Expected: all exit `0`; the generated Place does not appear in Git status.

- [ ] **Step 2: Open the exact build and inspect Studio Output**

```bash
open roblox/build/RuneDungeonSample.rbxlx
```

Use `View > Output`, clear prior messages, and press Play. Expected: `[RuneDungeonTests] PASS 4`, server/client ready lines, and no new warning or error.

- [ ] **Step 3: Complete one uninterrupted gameplay checklist**

1. R15 player spawns in the dark arena with navy styling, black hair cap, and sword.
2. Three black-purple slimes with cyan cores are visible.
3. `WASD`, `Space`, locked camera, left-click, `F`, and `Q` behave as specified.
4. Out-of-range attacks do nothing; two frontal in-range hits kill.
5. Slimes chase, attack for `10`, leash, and respawn after `4` seconds.
6. Each of three kills adds one `음`, with no duplicate reward.
7. At three `음`, `Q` toggles HUD text, outline, particles, and sword glow together.
8. Player respawn does not duplicate remotes/controllers and reapplies session state.

- [ ] **Step 4: Capture the visible result**

Capture one Studio screenshot during normal combat and one after transformation. Keep them local unless the user asks to commit them.

- [ ] **Step 5: Record the experiment state**

Update `progress.md` with the local Place path, controls, implemented scope, checks, and explicit gate: full Roblox migration remains unapproved until the user plays the sample. Reduce `roblox/README.md` launch instructions to two primary commands: build and open.

- [ ] **Step 6: Verify and commit documentation**

Repeat Step 1, then:

```bash
git add roblox/README.md progress.md
git commit -m "docs: record Roblox combat sample"
git status --short --branch
```

Expected: only intentional commits; branch ahead of upstream; generated `.rbxlx` ignored.

## Final Acceptance

Implementation is complete only when all seven tasks are committed, non-interactive checks pass, Studio Output contains `[RuneDungeonTests] PASS 4` without new errors, the gameplay checklist passes, and the user can open the local Place and press Play without publishing anything.
