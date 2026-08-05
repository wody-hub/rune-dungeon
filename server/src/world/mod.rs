use std::collections::BTreeMap;

use rune_dungeon_shared::{step_toward, GameIntent, PlayerSnapshot, ServerMessage, Vec2};

pub const SERVER_TICK_SECONDS: f32 = 0.2;

#[derive(Clone, Debug, PartialEq)]
pub struct PlayerState {
    pub id: u64,
    pub nickname: String,
    pub position: Vec2,
    pub target: Option<Vec2>,
}

#[derive(Debug, Default)]
pub struct WorldState {
    next_player_id: u64,
    tick: u64,
    players: BTreeMap<u64, PlayerState>,
}

impl WorldState {
    pub fn join_guest(&mut self, nickname: String) -> PlayerSnapshot {
        self.next_player_id += 1;
        let player = PlayerState {
            id: self.next_player_id,
            nickname,
            position: Vec2 { x: 0.0, z: 0.0 },
            target: None,
        };
        let snapshot = snapshot(&player);
        self.players.insert(player.id, player);
        snapshot
    }

    #[cfg(test)]
    pub fn player(&self, player_id: u64) -> Option<&PlayerState> {
        self.players.get(&player_id)
    }

    pub fn remove_player(&mut self, player_id: u64) {
        self.players.remove(&player_id);
    }

    pub fn apply_intent(&mut self, player_id: u64, intent: &GameIntent) -> bool {
        let Some(player) = self.players.get_mut(&player_id) else {
            return false;
        };
        match intent {
            GameIntent::MoveToGround { point } => player.target = Some(*point),
        }
        true
    }

    pub fn tick(&mut self, dt_seconds: f32) -> Vec<(u64, ServerMessage)> {
        self.tick += 1;
        self.players
            .values_mut()
            .map(|player| {
                if let Some(target) = player.target {
                    player.position = step_toward(player.position, target, dt_seconds);
                    if player.position == target {
                        player.target = None;
                    }
                }
                (
                    player.id,
                    ServerMessage::WorldSnapshot {
                        tick: self.tick,
                        player: snapshot(player),
                    },
                )
            })
            .collect()
    }
}

fn snapshot(player: &PlayerState) -> PlayerSnapshot {
    PlayerSnapshot {
        id: player.id,
        position: player.position,
        target: player.target,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rune_dungeon_shared::{GameIntent, PlayerSnapshot, ServerMessage, Vec2};

    #[test]
    fn guest_ids_are_unique_and_start_at_the_origin() {
        let mut world = WorldState::default();
        let first = world.join_guest("모험가".to_owned());
        let second = world.join_guest("모험가".to_owned());
        assert_eq!(first.id, 1);
        assert_eq!(second.id, 2);
        assert_eq!(first.position, Vec2 { x: 0.0, z: 0.0 });
        assert_eq!(second.position, Vec2 { x: 0.0, z: 0.0 });
    }

    #[test]
    fn movement_intent_sets_a_target_then_tick_owns_the_position() {
        let mut world = WorldState::default();
        let player = world.join_guest("모험가".to_owned());
        assert!(world.apply_intent(
            player.id,
            &GameIntent::MoveToGround {
                point: Vec2 { x: 6.0, z: 0.0 },
            },
        ));
        assert_eq!(
            world.player(player.id).unwrap().position,
            Vec2 { x: 0.0, z: 0.0 }
        );

        let snapshots = world.tick(SERVER_TICK_SECONDS);
        assert_eq!(
            snapshots,
            vec![(
                player.id,
                ServerMessage::WorldSnapshot {
                    tick: 1,
                    player: PlayerSnapshot {
                        id: player.id,
                        position: Vec2 { x: 1.2, z: 0.0 },
                        target: Some(Vec2 { x: 6.0, z: 0.0 }),
                    },
                },
            )]
        );
    }

    #[test]
    fn arrival_clears_the_target_and_removed_players_stop_receiving_snapshots() {
        let mut world = WorldState::default();
        let player = world.join_guest("모험가".to_owned());
        world.apply_intent(
            player.id,
            &GameIntent::MoveToGround {
                point: Vec2 { x: 0.1, z: 0.0 },
            },
        );
        world.tick(SERVER_TICK_SECONDS);
        assert_eq!(world.player(player.id).unwrap().target, None);
        world.remove_player(player.id);
        assert!(world.tick(SERVER_TICK_SECONDS).is_empty());
    }
}
