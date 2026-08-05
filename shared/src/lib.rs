pub mod protocol;
pub mod world;

pub const PROTOCOL_VERSION: u32 = 1;
pub const CLOSE_CODE_PROTOCOL_MISMATCH: u16 = 4001;

pub use protocol::{ClientMessage, GameIntent, PlayerSnapshot, ServerMessage};
pub use world::{step_toward, Vec2, PLAYER_MOVE_SPEED};
