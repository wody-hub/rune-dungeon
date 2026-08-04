import {
  getMonsterDefinition,
  type WorldState,
} from '../game/sim/world';
import type { PlayerMode } from '../game/sim/fsm/player-fsm';
import type { EumStack } from '../game/types/data';
import {
  M3_IDS,
  getM3Stage,
  type M3Stage,
} from '../game/sim/m3-progression';
import { m4ObjectiveText } from '../game/sim/m4-scenario';

export interface TargetHudSnapshot {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
}

export interface M3HudSnapshot {
  stage: M3Stage;
  statusMessage: string;
  gold: number;
  hwaInitial: number;
  hwaMedial: number;
  stone: number;
  jahyeongOwned: boolean;
  letterOwned: boolean;
  currentGyeolId: string | null;
  transformed: boolean;
  acquisitionSequence: number;
  inscriptionSequence: number;
  equipSequence: number;
  transformationSequence: number;
}

export interface M4BossHudSnapshot {
  phase: 'armored' | 'exposed' | 'groggy';
  remainingMs: number;
}

export interface M4HudSnapshot {
  area: string;
  objective: string;
  gateUnlocked: boolean;
  boss: M4BossHudSnapshot | null;
}

export interface HudSnapshot {
  playerMode: PlayerMode;
  autoAttackEnabled: boolean;
  playerHp: number;
  playerMaxHp: number;
  gold: number;
  eum: EumStack[];
  target: TargetHudSnapshot | null;
  m4: M4HudSnapshot | null;
  m3: M3HudSnapshot;
}

export function playerHpFillRatio(playerHp: number, playerMaxHp: number): number {
  if (playerMaxHp <= 0) return 0;
  return Math.min(1, Math.max(0, playerHp / playerMaxHp));
}

export function isDebugHudEnabled(dev: boolean, search: string): boolean {
  return dev && new URLSearchParams(search).has('debugHud');
}

function createM4HudSnapshot(world: WorldState): M4HudSnapshot | null {
  if (!world.m4) return null;
  const boss = world.m4.area === 'pencil_knight_boss_room' && world.m4.boss.phase !== 'cleared'
    ? {
        phase: world.m4.boss.phase,
        remainingMs: world.m4.boss.remainingMs,
      }
    : null;

  return {
    area: world.m4.area === 'blackheart_mine' ? '흑심 채굴장' : '기사단장 보스방',
    objective: m4ObjectiveText(world.m4),
    gateUnlocked: world.m4.gateUnlocked,
    boss,
  };
}

export function createHudSnapshot(world: WorldState): HudSnapshot {
  const selectedId = world.player.combatTargetId;
  const selected = selectedId ? world.monsters.get(selectedId) : undefined;
  const target = selected?.alive
    ? {
        id: selected.entityId,
        name: getMonsterDefinition(world, selected).name,
        hp: selected.hp,
        maxHp: getMonsterDefinition(world, selected).maxHp,
      }
    : null;

  return {
    playerMode: world.player.mode,
    autoAttackEnabled: world.player.autoAttackEnabled,
    playerHp: world.player.hp,
    playerMaxHp: world.player.maxHp,
    gold: world.inventory.gold,
    eum: world.inventory.eum
      .map((stack) => ({ ...stack }))
      .sort((left, right) => left.symbol.localeCompare(right.symbol, 'ko')),
    target,
    m4: createM4HudSnapshot(world),
    m3: {
      stage: getM3Stage(world.m3, world.inventory),
      statusMessage: world.m3.statusMessage,
      gold: world.inventory.gold,
      hwaInitial:
        world.inventory.eum.find(({ symbol }) => symbol === M3_IDS.hwaInitial)
          ?.quantity ?? 0,
      hwaMedial:
        world.inventory.eum.find(({ symbol }) => symbol === M3_IDS.hwaMedial)
          ?.quantity ?? 0,
      stone: world.inventory.items.filter((id) => id === M3_IDS.stone).length,
      jahyeongOwned: world.inventory.items.includes(M3_IDS.jahyeong),
      letterOwned: world.inventory.items.includes(M3_IDS.letter),
      currentGyeolId: world.m3.currentGyeolId,
      transformed: world.m3.transformed,
      acquisitionSequence: world.m3.acquisitionSequence,
      inscriptionSequence: world.m3.inscriptionSequence,
      equipSequence: world.m3.equipSequence,
      transformationSequence: world.m3.transformationSequence,
    },
  };
}

function m4SnapshotsEqual(
  left: M4HudSnapshot | null,
  right: M4HudSnapshot | null,
): boolean {
  return (
    left?.area === right?.area &&
    left?.objective === right?.objective &&
    left?.gateUnlocked === right?.gateUnlocked &&
    left?.boss?.phase === right?.boss?.phase &&
    left?.boss?.remainingMs === right?.boss?.remainingMs
  );
}

function m3SnapshotsEqual(left: M3HudSnapshot, right: M3HudSnapshot): boolean {
  return (
    left.stage === right.stage &&
    left.statusMessage === right.statusMessage &&
    left.gold === right.gold &&
    left.hwaInitial === right.hwaInitial &&
    left.hwaMedial === right.hwaMedial &&
    left.stone === right.stone &&
    left.jahyeongOwned === right.jahyeongOwned &&
    left.letterOwned === right.letterOwned &&
    left.currentGyeolId === right.currentGyeolId &&
    left.transformed === right.transformed &&
    left.acquisitionSequence === right.acquisitionSequence &&
    left.inscriptionSequence === right.inscriptionSequence &&
    left.equipSequence === right.equipSequence &&
    left.transformationSequence === right.transformationSequence
  );
}

export function hudSnapshotsEqual(
  left: HudSnapshot,
  right: HudSnapshot,
): boolean {
  if (
    left.playerMode !== right.playerMode ||
    left.autoAttackEnabled !== right.autoAttackEnabled ||
    left.playerHp !== right.playerHp ||
    left.playerMaxHp !== right.playerMaxHp ||
    left.gold !== right.gold
  ) {
    return false;
  }
  if (
    left.target?.id !== right.target?.id ||
    left.target?.name !== right.target?.name ||
    left.target?.hp !== right.target?.hp ||
    left.target?.maxHp !== right.target?.maxHp
  ) {
    return false;
  }
  if (left.eum.length !== right.eum.length) return false;
  if (!left.eum.every(
    (stack, index) =>
      stack.symbol === right.eum[index].symbol &&
      stack.quantity === right.eum[index].quantity,
  )) {
    return false;
  }
  return m4SnapshotsEqual(left.m4, right.m4) && m3SnapshotsEqual(left.m3, right.m3);
}
