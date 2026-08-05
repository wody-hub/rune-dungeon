pub mod protocol;
pub mod world;

pub const PROTOCOL_VERSION: u32 = 2;
pub const CLOSE_CODE_PROTOCOL_MISMATCH: u16 = 4001;

pub use protocol::{
    ClientMessage, CombatMode, GameIntent, PlayerSnapshot, ServerMessage, TransformationSnapshot,
};
pub use world::{step_toward, Vec2, PLAYER_MOVE_SPEED};
