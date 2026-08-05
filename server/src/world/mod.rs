use std::collections::BTreeMap;

use rune_dungeon_shared::{
    step_toward, CombatMode, GameIntent, PlayerSnapshot, ServerMessage, TransformationSnapshot,
    Vec2,
};

pub const SERVER_TICK_SECONDS: f32 = 0.2;
const MVP_FIRE_IN_ID: &str = "in_fire_001";
const MVP_FIRE_GYEOL_ID: &str = "letter_gyeol_hwa_001";

#[derive(Clone, Debug, PartialEq)]
pub struct PlayerState {
    pub id: u64,
    pub nickname: String,
    pub position: Vec2,
    pub target: Option<Vec2>,
    in_id: String,
    current_gyeol_id: Option<String>,
    combat_mode: CombatMode,
    transformation_revision: u64,
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
            in_id: MVP_FIRE_IN_ID.to_owned(),
            current_gyeol_id: Some(MVP_FIRE_GYEOL_ID.to_owned()),
            combat_mode: CombatMode::Normal,
            transformation_revision: 0,
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

    #[cfg(test)]
    pub fn snapshot_for(&self, player_id: u64) -> Option<PlayerSnapshot> {
        self.players.get(&player_id).map(snapshot)
    }

    pub fn apply_intent(&mut self, player_id: u64, intent: &GameIntent) -> bool {
        let Some(player) = self.players.get_mut(&player_id) else {
            return false;
        };
        match intent {
            GameIntent::MoveToGround { point } => player.target = Some(*point),
            GameIntent::ToggleTransformation => {
                if player.in_id != MVP_FIRE_IN_ID
                    || player.current_gyeol_id.as_deref() != Some(MVP_FIRE_GYEOL_ID)
                {
                    return false;
                }
                player.combat_mode = match player.combat_mode {
                    CombatMode::Normal => CombatMode::Transformed,
                    CombatMode::Transformed => CombatMode::Normal,
                };
                player.transformation_revision += 1;
            }
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
        transformation: TransformationSnapshot {
            in_id: player.in_id.clone(),
            combat_mode: player.combat_mode,
            revision: player.transformation_revision,
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rune_dungeon_shared::{
        CombatMode, GameIntent, PlayerSnapshot, ServerMessage, TransformationSnapshot, Vec2,
    };

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
                        transformation: TransformationSnapshot {
                            in_id: "in_fire_001".to_owned(),
                            combat_mode: CombatMode::Normal,
                            revision: 0,
                        },
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

    #[test]
    fn transformation_starts_normal_and_each_valid_toggle_increments_revision() {
        let mut world = WorldState::default();
        let player = world.join_guest("모험가".to_owned());
        assert_eq!(player.transformation.combat_mode, CombatMode::Normal);
        assert_eq!(player.transformation.revision, 0);

        assert!(world.apply_intent(player.id, &GameIntent::ToggleTransformation));
        let first = world.snapshot_for(player.id).unwrap();
        assert_eq!(first.transformation.combat_mode, CombatMode::Transformed);
        assert_eq!(first.transformation.revision, 1);

        assert!(world.apply_intent(player.id, &GameIntent::ToggleTransformation));
        let second = world.snapshot_for(player.id).unwrap();
        assert_eq!(second.transformation.combat_mode, CombatMode::Normal);
        assert_eq!(second.transformation.revision, 2);
    }

    #[test]
    fn toggle_requires_server_owned_transform_prerequisites() {
        let mut world = WorldState::default();
        let player = world.join_guest("모험가".to_owned());
        world.players.get_mut(&player.id).unwrap().current_gyeol_id = None;

        assert!(!world.apply_intent(player.id, &GameIntent::ToggleTransformation));
        let snapshot = world.snapshot_for(player.id).unwrap();
        assert_eq!(snapshot.transformation.combat_mode, CombatMode::Normal);
        assert_eq!(snapshot.transformation.revision, 0);
    }
}
