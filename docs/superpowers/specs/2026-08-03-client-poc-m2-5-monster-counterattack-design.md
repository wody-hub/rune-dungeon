# Client POC M2.5 Monster Counterattack Design

## Goal

Extend the client-only POC so an engaged ink slime attacks on its configured timing, reduces the player's runtime HP, and publishes that HP to the existing HUD. This slice proves the minimum counterattack loop without adding player defeat, recovery, avoidance, hit stun, animation, VFX, or damage text.

## Approved Scope

- Add runtime `hp` and `maxHp` to the player state, initialized from `player.json` (`196 / 196`).
- Give every alive ink slime an independent attack clock.
- While a slime remains `engaged`, its first logical hit occurs at `hitFrameMs=420` and later attacks repeat every `attackMotionMs=1400`.
- Apply the existing physical mitigation formula with monster `baseDamage=18` and player `defenseFromStr=12`. The fixture therefore deals `16` damage per hit.
- Clamp player HP at `0`.
- Reset a slime's attack clock whenever it is not `engaged`, dies, or respawns.
- Show player HP as text and a bar in the current HUD.

## Explicit Exclusions

- Player defeat, death, respawn, town return, or combat shutdown at `0` HP
- Dodge, partial dodge, hit stun, stagger, invulnerability, or interruption
- Monster attack animation, hit reaction, VFX, SFX, or floating damage text
- Boss attacks, area attacks, projectiles, or target selection rules
- Balance changes to fixture values

At `0` HP the POC keeps simulating combat and clamps further damage to `0`. A later player-defeat slice will define the terminal transition.

## Architecture

### Separation of responsibilities

`monster-ai.ts` remains responsible only for spatial behavior and the monster mode: `idle`, `chasing`, `engaged`, or `returning`. It does not read or mutate player combat resources.

`world.ts` owns counterattack orchestration after monster AI has updated every monster. It advances attack clocks for monsters that finished the AI step in `engaged`, resolves due hits, and mutates player HP. This keeps damage and cross-entity state changes at the same integration boundary that already owns player-to-monster attacks.

`damage.ts` continues to own the physical mitigation formula. Monster damage uses a fixed base damage as both the minimum and maximum damage, a zero attack bonus, a `1` multiplier, and the player's runtime defense. This reuses one damage contract without introducing a second formula.

### Runtime state

`PlayerState` gains:

```ts
hp: number;
maxHp: number;
```

`createPlayerState` receives initial HP values rather than importing content data into the FSM module.

`MonsterState` gains:

```ts
attackElapsedMs: number;
pendingHitMs: number | null;
```

The monster entity factory initializes both fields. Death and respawn lifecycle functions reset both fields so a new life never inherits an old attack.

## Tick and Timing Contract

The world tick order becomes:

1. Drain player input intents.
2. Advance monster respawns.
3. Advance player movement or attack.
4. Advance every monster's spatial AI.
5. Advance every monster's counterattack clock and resolve due hits.

When a monster enters `engaged`, the counterattack step starts a new motion with `attackElapsedMs=0` and `pendingHitMs=420`, then consumes the current tick's elapsed time. This matches the existing player attack clock convention.

After a logical hit, `pendingHitMs` becomes `null` while the remaining motion completes. At `attackElapsedMs=1400`, the clock starts the next motion and schedules another hit at `420ms`. Large `dt` values may cross more than one event, so the implementation processes events in a loop rather than dropping elapsed time.

If a monster is dead or its post-AI mode is not `engaged`, its attack clock immediately resets to `0 / null`. Returning, chasing, and idle monsters cannot preserve partial attack progress.

All engaged monsters advance independently in stable map iteration order. If multiple hits occur in one tick, each hit applies once and HP is clamped after each application. No special case stops attacks at `0` HP in this slice.

## Data Flow

```text
monster fixture
  baseDamage / attackMotionMs / hitFrameMs / attackRange
                 │
                 ▼
RuntimeCombatContent ── player defense + initial HP
                 │
                 ▼
tickMonsterAi → monster mode → tickMonsterCounterattacks
                                      │
                                      ▼
                              physical damage formula
                                      │
                                      ▼
                              PlayerState.hp mutation
                                      │
                                      ▼
                              HudSnapshot → Hud.svelte
```

The scene layer only renders the published HUD snapshot. It does not calculate timing or damage.

## HUD Contract

`HudSnapshot` gains `playerHp` and `playerMaxHp`. Equality checks include both values so a logical hit publishes immediately. The player panel displays `HP`, `current / max`, and a clamped percentage bar. The existing target HP panel remains unchanged.

No new screen, input, or reactive store is introduced.

## Error and Boundary Handling

- Initial HP is clamped into `[0, maxHp]` when the world is created.
- Physical damage keeps the existing minimum-damage rule and defense formula.
- Player HP is clamped with `Math.max(0, hp - damage)` after every hit.
- Non-positive `dt` remains a no-op at the world boundary.
- Dead monsters and all non-`engaged` modes reset attack timing instead of silently retaining it.
- Respawn always restores a clean attack clock; it does not affect player HP.

## Test Strategy

### Pure unit and integration tests

- Player state initializes at fixture HP and exposes `maxHp`.
- A newly engaged slime does not damage before `420ms`, hits exactly at the boundary, and deals `16` fixture damage.
- The next hit occurs at `1820ms` from the first motion start (`1400 + 420`).
- A large `dt` processes every crossed hit exactly once.
- Leaving `engaged` resets partial timing; re-engaging requires a fresh `420ms`.
- `returning`, `chasing`, `idle`, dead, and respawning monsters cannot damage the player.
- Two engaged monsters maintain independent clocks and both apply damage.
- HP clamps at `0` and never becomes negative.
- Monster death and respawn reset attack timing.
- HUD snapshot equality changes when player HP changes and exposes correct text/bar inputs.
- Existing player attacks, rewards, respawn, and pursuit tests remain green.

### Browser verification

- Entering a slime's attack range starts counterattacks without player input.
- Player HP remains unchanged before the hit frame and decreases at the configured timing.
- Repeated hits update HUD text and bar consistently with `window.__world`.
- Moving out of engagement range interrupts the attack clock; returning to range starts a fresh clock.
- Pursuit, return-to-spawn, player auto-attack, monster death, reward, and respawn still work.
- Browser console and page errors remain empty.

## Completion Criteria

- The approved minimum loop is observable in the browser: detect → chase → engage → timed monster hit → player HP reduction.
- All new timing, reset, multi-monster, clamp, and HUD tests pass.
- Existing automated tests and production build pass.
- `client/src/game/` remains free of Svelte, Three.js, Threlte, and browser-global dependencies.
- No excluded defeat, recovery, avoidance, feedback, or animation behavior is introduced.
