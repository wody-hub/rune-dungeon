import type { MonsterItem } from '../types/data';
import { createBossState, type BossState } from './boss-state';
import type { Vec2 } from './movement';

export const M4_ENTITY_IDS = {
  elite: 'm4-typo-sprite',
  boss: 'm4-pencil-knight-commander',
} as const;

export const M4_SPAWNS: Record<
  'minePlayer' | 'elite' | 'bossPlayer' | 'boss',
  Vec2
> = {
  minePlayer: { x: 0, z: 0 },
  elite: { x: 3, z: 0 },
  bossPlayer: { x: 0, z: -4 },
  boss: { x: 0, z: 3 },
};

export type M4Area = 'blackheart_mine' | 'pencil_knight_boss_room';
export type M4Objective =
  | 'defeat_elite'
  | 'enter_boss_room'
  | 'defeat_boss'
  | 'complete';

export interface M4Progress {
  area: M4Area;
  gateUnlocked: boolean;
  objective: M4Objective;
  boss: BossState;
}

export function createM4Progress(boss: MonsterItem): M4Progress {
  if (!boss.bossStateModifiers) {
    throw new Error('M4 boss fixture needs bossStateModifiers');
  }
  return {
    area: 'blackheart_mine',
    gateUnlocked: false,
    objective: 'defeat_elite',
    boss: createBossState(boss.bossStateModifiers),
  };
}

export function unlockM4BossGate(progress: M4Progress): void {
  progress.gateUnlocked = true;
  if (progress.objective === 'defeat_elite') {
    progress.objective = 'enter_boss_room';
  }
}

export function enterM4BossRoom(progress: M4Progress): boolean {
  if (!progress.gateUnlocked || progress.area !== 'blackheart_mine') return false;
  progress.area = 'pencil_knight_boss_room';
  progress.objective = 'defeat_boss';
  return true;
}

export function completeM4Quest(progress: M4Progress): void {
  progress.objective = 'complete';
}

export function m4ObjectiveText(progress: M4Progress): string {
  if (progress.objective === 'defeat_elite') {
    return '길을 막는 오타 요정을 처치하세요.';
  }
  if (progress.objective === 'enter_boss_room') {
    return '봉인문이 열렸습니다. 최심부로 향하세요.';
  }
  if (progress.objective === 'defeat_boss') {
    return '기사단장의 단단한 심은 화 변신에 반응합니다.';
  }
  return '길드 의뢰 제1호를 완수했습니다.';
}
