use crate::world::Vec2;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum ClientMessage {
    ClientInfo {
        protocol_version: u32,
        client_kind: String,
        client_version: String,
    },
    JoinAsGuest {
        nickname: String,
    },
    Intent(GameIntent),
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum GameIntent {
    MoveToGround { point: Vec2 },
    ToggleTransformation,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum CombatMode {
    Normal,
    Transformed,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum ServerMessage {
    JoinAccepted {
        player_id: u64,
        nickname: String,
        position: Vec2,
    },
    AuthError {
        message: String,
    },
    WorldSnapshot {
        tick: u64,
        player: PlayerSnapshot,
    },
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct PlayerSnapshot {
    pub id: u64,
    pub position: Vec2,
    pub target: Option<Vec2>,
    pub transformation: TransformationSnapshot,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct TransformationSnapshot {
    pub in_id: String,
    pub combat_mode: CombatMode,
    pub revision: u64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::PROTOCOL_VERSION;

    #[test]
    fn protocol_fixture_round_trips_without_shape_drift() {
        let fixture: serde_json::Value =
            serde_json::from_str(include_str!("../fixtures/protocol-v2.json")).unwrap();
        for key in [
            "client_info",
            "join_as_guest",
            "move_to_ground",
            "toggle_transformation",
        ] {
            let message: ClientMessage = serde_json::from_value(fixture[key].clone()).unwrap();
            let encoded: serde_json::Value =
                serde_json::from_str(&serde_json::to_string(&message).unwrap()).unwrap();
            assert_eq!(encoded, fixture[key]);
        }
        for key in ["join_accepted", "snapshot_normal", "snapshot_transformed"] {
            let message: ServerMessage = serde_json::from_value(fixture[key].clone()).unwrap();
            let encoded: serde_json::Value =
                serde_json::from_str(&serde_json::to_string(&message).unwrap()).unwrap();
            assert_eq!(encoded, fixture[key]);
        }
    }

    #[test]
    fn protocol_v2_uses_parameterless_toggle_and_screaming_snake_case_modes() {
        assert_eq!(PROTOCOL_VERSION, 2);
        assert_eq!(
            serde_json::to_value(GameIntent::ToggleTransformation).unwrap(),
            serde_json::json!("ToggleTransformation"),
        );
        assert_eq!(
            serde_json::to_value(CombatMode::Transformed).unwrap(),
            serde_json::json!("TRANSFORMED"),
        );
    }
}
