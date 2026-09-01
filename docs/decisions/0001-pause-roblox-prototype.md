# ADR-0001: Pause and archive the Roblox prototype

## Status

Accepted

## Date

2026-09-01

## Context

Rune Dungeon tested two character-production directions after the original 3D art workflow proved too difficult to iterate: an MPFB/Blender sample and then a Roblox-native R15 prototype. The Roblox prototype established that the team could generate a local Place with Rojo, enforce server-owned combat state, build a dark arena, present an R15 character with a greatsword, and run three ink slimes.

The prototype did not solve the underlying product-design problem cheaply enough. Roblox-native presentation still required substantial character, tooling, Studio, and runtime-debugging work before the result matched the desired game identity. Continuing would spend more time on platform-specific implementation before the visual direction was settled. The next design investigation will instead study the pixel-art/isometric approach used by *Soul Knight Prequel*.

## Decision

Pause Roblox development and preserve it as a separate historical prototype.

- Keep the complete source and commit history on `archive/roblox-local-combat-sample`.
- Keep the existing `feature/roblox-local-combat-sample` remote branch at its WIP checkpoint. Do not delete or rewrite it.
- Keep the isolated worktree at `.worktrees/roblox-local-combat-sample`; it may be reused if the Roblox direction is reconsidered.
- Do not merge the Roblox prototype into the active product branch and do not publish its generated Place to Roblox.
- Treat `roblox/build/RuneDungeonSample.rbxlx` as a reproducible generated artifact. It remains ignored by Git.

## Preserved State

The archive contains these completed and verified slices:

- Rojo 7.7.0 project scaffold and server-enforced R15 sessions.
- Shared combat and slime rules with a Studio test runner.
- Deterministic dark arena, R15 presentation, hair cap, greatsword, and dormant fire effects.
- Three server-owned ink slimes with chase, attack, leash return, death, and respawn.
- A WIP server-authoritative combat service with attack validation and transformation work.

Key commits:

| Commit | State |
| --- | --- |
| `2abf6fe` | Rojo scaffold and enforced R15 session guard complete |
| `2cb4293` | Shared rules and Studio `PASS 2` complete |
| `09fa285` | Arena and R15 presentation, Studio `PASS 3` complete |
| `46290a0` | Server-owned slime lifecycle, Studio `PASS 3` complete |
| `aa796f6` | Task 5 WIP checkpoint, including a temporary Studio probe |

`aa796f6` is intentionally not a release-ready combat commit. It contains `Task5Probe.server.luau` and `CombatService._runStudioProbeAction`, which were added only to finish deterministic transformation and respawn verification.

## Alternatives Considered

### Continue Roblox development now

- Pros: reuses the working arena, slime, and server-authority foundation.
- Cons: commits more effort to Roblox presentation before the game's visual identity is settled.
- Rejected for now: the immediate question is art direction, not additional platform engineering.

### Merge the prototype into the active product branch

- Pros: one visible project history.
- Cons: mixes a paused platform experiment with the active direction and makes later cleanup ambiguous.
- Rejected: the Roblox source is an experiment with its own lifecycle.

### Delete the prototype

- Pros: smallest repository surface.
- Cons: loses verified code, debugging knowledge, and an option that may be useful later.
- Rejected: preservation costs little and avoids repeating the same work.

## Consequences

- Active Rune Dungeon design work can proceed without Roblox-specific constraints.
- The Roblox implementation remains reproducible and reviewable but receives no maintenance while paused.
- Any future Roblox restart must explicitly finish or remove the Task 5 probe before treating the branch as production-ready.
- The research target changes from Roblox-native 3D presentation to the design principles behind *Soul Knight Prequel*: compact pixel characters, isometric combat readability, dense equipment feedback, and low-cost content variation.

## Resume Procedure

1. Open `.worktrees/roblox-local-combat-sample` and switch to `archive/roblox-local-combat-sample`.
2. Build with `rojo build roblox/default.project.json -o roblox/build/RuneDungeonSample.rbxlx`.
3. Open the generated Place in Roblox Studio and run the temporary Task 5 probe.
4. Remove `roblox/src/server/Task5Probe.server.luau` and `CombatService._runStudioProbeAction`.
5. Rebuild and require a fresh `[RuneDungeonTests] PASS 4` with no new Output errors.
6. Continue with the fixed camera, input, HUD, feedback, and final integration tasks only after a new explicit decision to resume Roblox.
