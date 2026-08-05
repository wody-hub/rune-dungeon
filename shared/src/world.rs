use serde::{Deserialize, Serialize};

pub const PLAYER_MOVE_SPEED: f32 = 6.0;

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub struct Vec2 {
    pub x: f32,
    pub z: f32,
}

pub fn step_toward(position: Vec2, target: Vec2, dt_seconds: f32) -> Vec2 {
    let dx = target.x - position.x;
    let dz = target.z - position.z;
    let distance = dx.hypot(dz);
    let step = PLAYER_MOVE_SPEED * dt_seconds.max(0.0);
    if distance == 0.0 || distance <= step {
        return target;
    }
    Vec2 {
        x: position.x + dx / distance * step,
        z: position.z + dz / distance * step,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn step_toward_handles_normal_arrival_and_zero_distance() {
        assert_eq!(
            step_toward(Vec2 { x: 0.0, z: 0.0 }, Vec2 { x: 10.0, z: 0.0 }, 0.2,),
            Vec2 { x: 1.2, z: 0.0 },
        );
        assert_eq!(
            step_toward(Vec2 { x: 5.9, z: 0.0 }, Vec2 { x: 6.0, z: 0.0 }, 0.2,),
            Vec2 { x: 6.0, z: 0.0 },
        );
        assert_eq!(
            step_toward(Vec2 { x: 2.0, z: -3.0 }, Vec2 { x: 2.0, z: -3.0 }, 0.2,),
            Vec2 { x: 2.0, z: -3.0 },
        );
        assert_eq!(
            step_toward(Vec2 { x: 2.0, z: -3.0 }, Vec2 { x: 9.0, z: 4.0 }, -0.2,),
            Vec2 { x: 2.0, z: -3.0 },
        );
    }
}
