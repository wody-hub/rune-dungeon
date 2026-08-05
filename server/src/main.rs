mod session;
mod world;

use std::{sync::Arc, time::Duration};

use session::{run_session, SessionRegistry};
use tokio::{
    net::TcpListener,
    sync::Mutex,
    time::{Instant, Interval},
};
use world::{WorldState, SERVER_TICK_SECONDS};

const DEFAULT_ADDR: &str = "127.0.0.1:8080";
const SERVER_TICK: Duration = Duration::from_millis(200);

fn server_interval() -> Interval {
    let mut interval = tokio::time::interval_at(Instant::now() + SERVER_TICK, SERVER_TICK);
    interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
    interval
}

fn parse_address(mut args: impl Iterator<Item = String>) -> Result<String, String> {
    match (args.next(), args.next(), args.next()) {
        (None, None, None) => Ok(DEFAULT_ADDR.to_owned()),
        (Some(flag), Some(address), None) if flag == "--addr" => Ok(address),
        (Some(flag), None, None) if flag == "--addr" => Err("--addr requires ADDRESS".to_owned()),
        _ => Err("usage: rune-dungeon-server [--addr ADDRESS]".to_owned()),
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let address = parse_address(std::env::args().skip(1))
        .map_err(|message| std::io::Error::new(std::io::ErrorKind::InvalidInput, message))?;
    let listener = TcpListener::bind(address).await?;
    println!(
        "rune-dungeon server listening on {}",
        listener.local_addr()?
    );
    let world = Arc::new(Mutex::new(WorldState::default()));
    let registry = SessionRegistry::default();

    tokio::spawn(run_tick_loop(world.clone(), registry.clone()));
    loop {
        let (stream, _) = listener.accept().await?;
        let session_world = world.clone();
        let session_registry = registry.clone();
        tokio::spawn(async move {
            if let Err(error) = run_session(stream, session_world, session_registry).await {
                eprintln!("session ended with an error: {error}");
            }
        });
    }
}

async fn run_tick_loop(world: Arc<Mutex<WorldState>>, registry: SessionRegistry) {
    let mut interval = server_interval();
    loop {
        interval.tick().await;
        let snapshots = world.lock().await.tick(SERVER_TICK_SECONDS);
        for (player_id, message) in snapshots {
            registry.send_snapshot(player_id, message).await;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn server_interval_skips_missed_ticks() {
        assert_eq!(
            server_interval().missed_tick_behavior(),
            tokio::time::MissedTickBehavior::Skip,
        );
    }

    #[test]
    fn address_parser_accepts_only_default_or_exact_override() {
        assert_eq!(
            parse_address(Vec::<String>::new().into_iter()).unwrap(),
            DEFAULT_ADDR
        );
        assert_eq!(
            parse_address(vec!["--addr".to_owned(), "127.0.0.1:0".to_owned()].into_iter()).unwrap(),
            "127.0.0.1:0"
        );
        assert!(parse_address(vec!["--addr".to_owned()].into_iter()).is_err());
        assert!(parse_address(vec!["--port".to_owned(), "8080".to_owned()].into_iter()).is_err());
        assert!(parse_address(
            vec![
                "--addr".to_owned(),
                "127.0.0.1:0".to_owned(),
                "extra".to_owned(),
            ]
            .into_iter()
        )
        .is_err());
    }
}
