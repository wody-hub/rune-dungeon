import monstersData from '../data/monsters.json';
import playerData from '../data/player.json';
import weaponsData from '../data/weapons.json';
import {
  toPlayerData,
  type LegacyPlayerData,
  type MonsterItem,
  type PlayerData,
  type PlayerInventory,
  type WeaponItem,
} from '../types/data';
import { rollPhysicalDamage } from './combat/damage';
import { rollCombatRewards, type CombatRewards } from './combat/drops';
import { tickMonsterAttack } from './combat/monster-attack';
import { tickMonsterAi } from './ai/monster-ai';
import {
  createMonster,
  killMonster,
  resetMonsterAttack,
  tickMonsterRespawn,
  type MonsterState,
} from './entities/monster';
import {
  beginGroundMove,
  createPlayerState,
  enableAutoAttack,
  selectCombatTarget,
  stopCombat,
  toggleAutoAttack,
  type PlayerState,
} from './fsm/player-fsm';
import { stepToward, type Vec2 } from './movement';
import { mathRandom, type RandomSource } from './random';
import { createRuntimeCombatContent, type RuntimeCombatContent } from './runtime-content';
import {
  applyM3Action,
  createM3CompletedCheckpoint,
  createM3InventorySeed,
  createM3Progress,
  enableM3SupplyCache,
  isM3Action,
  M3_IDS,
  type M3Progress,
} from './m3-progression';
import {
  bossCombatPolicy,
  markBossCleared,
  startBossGroggy,
  tickBossState,
} from './boss-state';
import {
  completeM4Quest,
  createM4Progress,
  enterM4BossRoom,
  M4_ENTITY_IDS,
  M4_SPAWNS,
  type M4Progress,
} from './m4-scenario';
import {
  createRuntimeMonster,
  type RuntimeMonster,
} from './runtime-content';
import type { PlayerSnapshot } from '../../net/protocol';

export const PLAYER_SPEED = 6; // m/s, 화면 보고 조정

const DEFAULT_RESPAWN_MS = 5_000;
const SLIME_SPAWNS: Vec2[] = [
  { x: 3, z: 0 },
  { x: -3, z: 3 },
  { x: 0, z: -4 },
];

// 입력은 즉시 실행하지 않고 인텐트로 큐에 쌓아 프레임 틱에서 소비한다.
export type GameIntent =
  | { type: 'move_to_ground'; point: Vec2 }
  | { type: 'select_target'; monsterId: string }
  | { type: 'toggle_auto_attack' }
  | { type: 'enable_auto_attack' }
  | { type: 'enter_m4_boss_room' }
  | { type: 'collect_m3_supply_cache' }
  | { type: 'craft_m3_jahyeong_hwa' }
  | { type: 'inscribe_m3_letter_hwa' }
  | { type: 'equip_m3_letter_hwa' }
  | { type: 'toggle_m3_transformation' };

export interface WorldOptions {
  random?: RandomSource;
  respawnMs?: number;
  scenario?: WorldScenario;
  playerMovement?: PlayerMovement;
}

export type WorldScenario = 'skirmish' | 'm4';
export type PlayerMovement = 'local' | 'authoritative';

interface AuthoritativeRenderState {
  position: Vec2;
  start: Vec2;
  target: Vec2;
  elapsedSeconds: number;
}

export interface WorldState {
  playerMovement: PlayerMovement;
  authoritativeRender: AuthoritativeRenderState;
  content: RuntimeCombatContent;
  scenario: WorldScenario;
  monsterDefinitions: Map<string, RuntimeMonster>;
  respawnMs: number;
  player: PlayerState;
  monsters: Map<string, MonsterState>;
  inventory: PlayerInventory;
  m3: M3Progress;
  m4: M4Progress | null;
  pendingIntents: GameIntent[];
  random: RandomSource;
}

export function resolveCombatDefinitions(
  monsters: MonsterItem[],
  weapons: WeaponItem[],
  player: PlayerData,
): { monster: MonsterItem; weapon: WeaponItem } {
  const monster = monsters.find(({ id }) => id === 'monster_ink_slime_001');
  if (!monster) {
    throw new Error('Missing combat monster definition: monster_ink_slime_001');
  }
  const weapon = weapons.find(({ id }) => id === player.equipped.weaponId);
  if (!weapon) {
    throw new Error(`Missing equipped weapon definition: ${player.equipped.weaponId}`);
  }
  return { monster, weapon };
}

export function createWorld(options: WorldOptions = {}): WorldState {
  const player = toPlayerData(playerData as LegacyPlayerData);
  const { monster, weapon } = resolveCombatDefinitions(
    monstersData as unknown as MonsterItem[],
    weaponsData as unknown as WeaponItem[],
    player,
  );
  const content = createRuntimeCombatContent(monster, weapon, player);
  const scenario = options.scenario ?? 'skirmish';
  const monsterDefinitions = new Map<string, RuntimeMonster>([
    [content.monster.id, content.monster],
  ]);
  let inventory = createM3InventorySeed(player.inventory);
  let m3 = createM3Progress();
  let m4: M4Progress | null = null;
  let monsters = new Map<string, MonsterState>(
    SLIME_SPAWNS.map((spawn, index) => [
      `slime-${index + 1}`,
      createMonster(`slime-${index + 1}`, content.monster, spawn),
    ]),
  );
  const playerState = createPlayerState({
    hp: content.player.hp.current,
    maxHp: content.player.hp.max,
  });

  if (scenario === 'm4') {
    const elite = (monstersData as unknown as MonsterItem[]).find(
      ({ id }) => id === 'monster_typo_sprite_001',
    );
    if (!elite) throw new Error('Missing M4 elite definition: monster_typo_sprite_001');
    const boss = (monstersData as unknown as MonsterItem[]).find(
      ({ id }) => id === 'boss_pencil_knight_commander_001',
    );
    if (!boss) throw new Error('Missing M4 boss definition: boss_pencil_knight_commander_001');

    const runtimeElite = createRuntimeMonster(elite);
    const runtimeBoss = createRuntimeMonster(boss);
    monsterDefinitions.set(runtimeElite.id, runtimeElite);
    monsterDefinitions.set(runtimeBoss.id, runtimeBoss);
    ({ inventory, progress: m3 } = createM3CompletedCheckpoint(player.inventory));
    m4 = createM4Progress(runtimeBoss);
    monsters = new Map([
      [
        M4_ENTITY_IDS.elite,
        createMonster(M4_ENTITY_IDS.elite, runtimeElite, M4_SPAWNS.elite),
      ],
      [
        M4_ENTITY_IDS.boss,
        createMonster(M4_ENTITY_IDS.boss, runtimeBoss, M4_SPAWNS.boss),
      ],
    ]);
    playerState.pos = { ...M4_SPAWNS.minePlayer };
  }

  const authoritativePosition = { ...playerState.pos };

  return {
    playerMovement: options.playerMovement ?? 'local',
    authoritativeRender: {
      position: { ...authoritativePosition },
      start: { ...authoritativePosition },
      target: { ...authoritativePosition },
      elapsedSeconds: 0,
    },
    content,
    scenario,
    monsterDefinitions,
    respawnMs: options.respawnMs ?? DEFAULT_RESPAWN_MS,
    player: playerState,
    monsters,
    inventory,
    m3,
    m4,
    pendingIntents: [],
    random: options.random ?? mathRandom,
  };
}

export function getMonsterDefinition(
  w: WorldState,
  monster: MonsterState,
): RuntimeMonster {
  const definition = w.monsterDefinitions.get(monster.definitionId);
  if (!definition) {
    throw new Error(`Missing runtime monster definition: ${monster.definitionId}`);
  }
  return definition;
}

export function isMonsterActive(w: WorldState, monster: MonsterState): boolean {
  if (w.scenario !== 'm4') return true;
  if (w.m4?.area === 'blackheart_mine') {
    return monster.entityId === M4_ENTITY_IDS.elite;
  }
  return monster.entityId === M4_ENTITY_IDS.boss && w.m4?.objective !== 'complete';
}

export function enqueueIntent(w: WorldState, intent: GameIntent): void {
  w.pendingIntents.push(intent);
}

export function applyAuthoritativePlayerPosition(w: WorldState, position: Vec2): void {
  w.authoritativeRender.start = { ...w.authoritativeRender.position };
  w.authoritativeRender.target = { ...position };
  w.authoritativeRender.elapsedSeconds = 0;
  w.player.pos = { ...position };
  w.player.moveTarget = null;
  if (!w.player.autoAttackEnabled) w.player.mode = 'idle';
}

export function applyAuthoritativePlayerSnapshot(
  world: WorldState,
  snapshot: PlayerSnapshot,
): void {
  applyAuthoritativePlayerPosition(world, snapshot.position);
  if (snapshot.transformation.in_id !== M3_IDS.fireIn) return;

  const transformed = snapshot.transformation.combat_mode === 'TRANSFORMED';
  world.m3.transformed = transformed;
  world.m3.transformationSequence = snapshot.transformation.revision;
  world.m3.statusMessage = transformed
    ? '서버가 화 변신을 확정했습니다.'
    : '서버가 변신 해제를 확정했습니다.';
}

export function getRenderedPlayerPosition(w: WorldState): Vec2 {
  return w.playerMovement === 'authoritative'
    ? w.authoritativeRender.position
    : w.player.pos;
}

function selectedMonster(w: WorldState): MonsterState | undefined {
  if (!w.player.combatTargetId) return undefined;
  const monster = w.monsters.get(w.player.combatTargetId);
  return monster?.alive && isMonsterActive(w, monster) ? monster : undefined;
}

function drainIntents(w: WorldState): void {
  if (w.playerMovement === 'authoritative') {
    w.pendingIntents.length = 0;
    return;
  }
  for (const intent of w.pendingIntents) {
    if (intent.type === 'move_to_ground') {
      beginGroundMove(w.player, intent.point);
    } else if (intent.type === 'select_target') {
      const target = w.monsters.get(intent.monsterId);
      selectCombatTarget(
        w.player,
        target && isMonsterActive(w, target) ? target : undefined,
      );
    } else if (intent.type === 'toggle_auto_attack') {
      toggleAutoAttack(w.player, selectedMonster(w));
    } else if (intent.type === 'enable_auto_attack') {
      enableAutoAttack(w.player, selectedMonster(w));
    } else if (intent.type === 'enter_m4_boss_room') {
      if (w.m4 && enterM4BossRoom(w.m4)) {
        stopCombat(w.player);
        w.player.pos = { ...M4_SPAWNS.bossPlayer };
      }
    } else if (isM3Action(intent)) {
      applyM3Action(w.m3, w.inventory, w.content.player.equipped.inId, intent.type);
    }
  }
  w.pendingIntents.length = 0;
}

function tickAuthoritativeRenderPosition(w: WorldState, dt: number): void {
  const render = w.authoritativeRender;
  render.elapsedSeconds = Math.min(0.2, render.elapsedSeconds + dt);
  const t = render.elapsedSeconds / 0.2;
  render.position = {
    x: render.start.x + (render.target.x - render.start.x) * t,
    z: render.start.z + (render.target.z - render.start.z) * t,
  };
}

function tickGroundMovement(player: PlayerState, dt: number): void {
  if (!player.moveTarget) return;
  player.mode = 'moving';
  player.pos = stepToward(player.pos, player.moveTarget, PLAYER_SPEED, dt);
  if (player.pos.x !== player.moveTarget.x || player.pos.z !== player.moveTarget.z) return;
  player.moveTarget = null;
  player.mode = 'idle';
}

function approachTarget(player: PlayerState, target: MonsterState, dt: number): void {
  player.mode = 'moving';
  player.moveTarget = { ...target.pos };
  player.attackElapsedMs = 0;
  player.pendingHitMs = null;
  player.pos = stepToward(player.pos, target.pos, PLAYER_SPEED, dt);
}

function applyRewards(inventory: PlayerInventory, rewards: CombatRewards): void {
  inventory.gold += rewards.gold;
  for (const reward of rewards.eum) {
    const stack = inventory.eum.find(({ symbol }) => symbol === reward.symbol);
    if (stack) {
      stack.quantity += reward.quantity;
    } else {
      inventory.eum.push({ ...reward });
    }
  }
}

function processHit(w: WorldState, target: MonsterState): void {
  const { player, weapon } = w.content;
  const definition = getMonsterDefinition(w, target);
  const bossModifiers = definition.bossStateModifiers;
  if (
    w.m4 &&
    target.entityId === M4_ENTITY_IDS.boss &&
    bossModifiers &&
    w.m4.boss.phase === 'exposed' &&
    w.m3.transformed
  ) {
    startBossGroggy(w.m4.boss, bossModifiers);
  }
  const policy =
    bossModifiers && w.m4 && target.entityId === M4_ENTITY_IDS.boss
      ? bossCombatPolicy(w.m4.boss, bossModifiers, definition.baseDefense)
      : { defense: definition.baseDefense, incomingDamageMultiplier: 1 };
  const damage = rollPhysicalDamage(
    {
      minDamage: weapon.minDamage,
      maxDamage: weapon.maxDamage,
      attackBonus: player.combatProfile.attackBonusFromStr,
      damageMultiplier: weapon.damageMultiplier,
      defense: policy.defense,
    },
    w.random,
  );
  target.hp = Math.max(0, target.hp - damage * policy.incomingDamageMultiplier);
  if (target.hp > 0 || target.deathProcessed) return;

  if (w.m4 && target.entityId === M4_ENTITY_IDS.boss) {
    target.hp = 0;
    target.alive = false;
    target.mode = 'idle';
    target.respawnRemainingMs = null;
    resetMonsterAttack(target);
    markBossCleared(w.m4.boss);
    completeM4Quest(w.m4);
  } else {
    killMonster(target, w.respawnMs);
  }
  applyRewards(w.inventory, rollCombatRewards(definition.drops, w.random));
  if (w.scenario === 'skirmish') enableM3SupplyCache(w.m3);
  if (w.m4 && target.entityId === M4_ENTITY_IDS.elite) {
    w.m4.gateUnlocked = true;
    w.m4.objective = 'enter_boss_room';
  }
  target.deathProcessed = true;
  stopCombat(w.player);
}

function tickAttack(w: WorldState, target: MonsterState, elapsedMs: number): void {
  const player = w.player;
  const weapon = w.content.weapon;
  if (player.mode !== 'attacking') {
    player.mode = 'attacking';
    player.moveTarget = null;
    player.attackElapsedMs = 0;
    player.pendingHitMs = weapon.hitFrameMs;
  }

  let remainingMs = elapsedMs;
  while (remainingMs > 0) {
    const hasPendingHit = player.pendingHitMs !== null;
    const timeToEvent = hasPendingHit
      ? player.pendingHitMs!
      : weapon.attackMotionMs - player.attackElapsedMs;
    const advanceMs = Math.min(remainingMs, timeToEvent);
    player.attackElapsedMs += advanceMs;
    if (hasPendingHit) player.pendingHitMs = timeToEvent - advanceMs;
    remainingMs -= advanceMs;

    if (advanceMs < timeToEvent) return;
    if (hasPendingHit) {
      player.pendingHitMs = null;
      processHit(w, target);
      if (!target.alive) return;
    } else {
      player.attackElapsedMs = 0;
      player.pendingHitMs = weapon.hitFrameMs;
    }
  }
}

function tickPlayer(w: WorldState, dt: number, elapsedMs: number): void {
  const target = selectedMonster(w);
  if (!w.player.autoAttackEnabled) {
    tickGroundMovement(w.player, dt);
  } else if (!target) {
    stopCombat(w.player);
  } else {
    const distance = Math.hypot(
      target.pos.x - w.player.pos.x,
      target.pos.z - w.player.pos.z,
    );
    if (distance > w.content.weapon.range) {
      approachTarget(w.player, target, dt);
    } else {
      tickAttack(w, target, elapsedMs);
    }
  }
}

export function tick(w: WorldState, dt: number): void {
  if (dt <= 0) return;
  if (w.playerMovement === 'authoritative') {
    drainIntents(w);
    tickAuthoritativeRenderPosition(w, dt);
    return;
  }

  drainIntents(w);
  const elapsedMs = dt * 1_000;
  const boss = w.m4 ? w.monsters.get(M4_ENTITY_IDS.boss) : undefined;
  const bossDefinition = boss ? getMonsterDefinition(w, boss) : undefined;
  if (
    w.m4 &&
    boss &&
    boss.alive &&
    isMonsterActive(w, boss) &&
    bossDefinition?.bossStateModifiers
  ) {
    tickBossState(w.m4.boss, elapsedMs, bossDefinition.bossStateModifiers);
  }
  for (const monster of w.monsters.values()) {
    if (!isMonsterActive(w, monster)) continue;
    tickMonsterRespawn(monster, elapsedMs, getMonsterDefinition(w, monster).maxHp);
  }

  tickPlayer(w, dt, elapsedMs);
  for (const monster of w.monsters.values()) {
    if (!isMonsterActive(w, monster)) continue;
    const definition = getMonsterDefinition(w, monster);
    const policy =
      w.m4 && monster.entityId === M4_ENTITY_IDS.boss && definition.bossStateModifiers
        ? bossCombatPolicy(w.m4.boss, definition.bossStateModifiers, definition.baseDefense)
        : { canAct: true };
    if (!policy.canAct) {
      monster.mode = 'idle';
      resetMonsterAttack(monster);
      continue;
    }
    tickMonsterAi(monster, w.player.pos, definition, dt);
  }
  for (const monster of w.monsters.values()) {
    if (!isMonsterActive(w, monster)) continue;
    const definition = getMonsterDefinition(w, monster);
    const policy =
      w.m4 && monster.entityId === M4_ENTITY_IDS.boss && definition.bossStateModifiers
        ? bossCombatPolicy(w.m4.boss, definition.bossStateModifiers, definition.baseDefense)
        : { canAct: true };
    if (!policy.canAct) {
      resetMonsterAttack(monster);
      continue;
    }
    tickMonsterAttack(
      monster,
      w.player,
      {
        baseDamage: definition.baseDamage,
        attackMotionMs: definition.attackMotionMs,
        hitFrameMs: definition.hitFrameMs,
        playerDefense: w.content.player.combatProfile.defenseFromStr,
      },
      elapsedMs,
      w.random,
    );
  }
}
