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
import { tickMonsterAi } from './ai/monster-ai';
import {
  createMonster,
  killMonster,
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
  | { type: 'enable_auto_attack' };

export interface WorldOptions {
  random?: RandomSource;
  respawnMs?: number;
}

export interface WorldState {
  content: RuntimeCombatContent;
  respawnMs: number;
  player: PlayerState;
  monsters: Map<string, MonsterState>;
  inventory: PlayerInventory;
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
  const monsters = new Map(
    SLIME_SPAWNS.map((spawn, index) => [
      `slime-${index + 1}`,
      createMonster(`slime-${index + 1}`, content.monster, spawn),
    ]),
  );

  return {
    content,
    respawnMs: options.respawnMs ?? DEFAULT_RESPAWN_MS,
    player: createPlayerState(),
    monsters,
    inventory: {
      gold: player.inventory.gold,
      eum: player.inventory.eum.map((stack) => ({ ...stack })),
      items: [...player.inventory.items],
    },
    pendingIntents: [],
    random: options.random ?? mathRandom,
  };
}

export function enqueueIntent(w: WorldState, intent: GameIntent): void {
  w.pendingIntents.push(intent);
}

function selectedMonster(w: WorldState): MonsterState | undefined {
  if (!w.player.combatTargetId) return undefined;
  const monster = w.monsters.get(w.player.combatTargetId);
  return monster?.alive ? monster : undefined;
}

function drainIntents(w: WorldState): void {
  for (const intent of w.pendingIntents) {
    if (intent.type === 'move_to_ground') {
      beginGroundMove(w.player, intent.point);
    } else if (intent.type === 'select_target') {
      selectCombatTarget(w.player, w.monsters.get(intent.monsterId));
    } else if (intent.type === 'toggle_auto_attack') {
      toggleAutoAttack(w.player, selectedMonster(w));
    } else if (intent.type === 'enable_auto_attack') {
      enableAutoAttack(w.player, selectedMonster(w));
    }
  }
  w.pendingIntents.length = 0;
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
  const { monster, player, weapon } = w.content;
  const damage = rollPhysicalDamage(
    {
      minDamage: weapon.minDamage,
      maxDamage: weapon.maxDamage,
      attackBonus: player.combatProfile.attackBonusFromStr,
      damageMultiplier: weapon.damageMultiplier,
      defense: monster.baseDefense,
    },
    w.random,
  );
  target.hp = Math.max(0, target.hp - damage);
  if (target.hp > 0 || target.deathProcessed) return;

  killMonster(target, w.respawnMs);
  applyRewards(w.inventory, rollCombatRewards(monster.drops, w.random));
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

  drainIntents(w);
  const elapsedMs = dt * 1_000;
  for (const monster of w.monsters.values()) {
    tickMonsterRespawn(monster, elapsedMs, w.content.monster.maxHp);
  }

  tickPlayer(w, dt, elapsedMs);
  for (const monster of w.monsters.values()) {
    tickMonsterAi(monster, w.player.pos, w.content.monster, dt);
  }
}
