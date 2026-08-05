use std::{collections::BTreeMap, sync::Arc};

use futures_util::{stream::SplitSink, SinkExt, StreamExt};
use rune_dungeon_shared::{
    ClientMessage, GameIntent, ServerMessage, CLOSE_CODE_PROTOCOL_MISMATCH, PROTOCOL_VERSION,
};
use tokio::{
    net::TcpStream,
    sync::{mpsc, Mutex},
};
use tokio_tungstenite::{
    accept_async,
    tungstenite::{
        protocol::{frame::coding::CloseCode, CloseFrame},
        Message,
    },
    WebSocketStream,
};

use crate::world::WorldState;

type WebSocketWriter = SplitSink<WebSocketStream<TcpStream>, Message>;
type SessionError = Box<dyn std::error::Error + Send + Sync>;

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum SessionPhase {
    AwaitingClientInfo,
    AwaitingGuestJoin,
    Joined { player_id: u64 },
}

#[derive(Clone, Debug, PartialEq)]
pub enum SessionDecision {
    AwaitGuestJoin,
    JoinGuest {
        nickname: String,
    },
    ApplyIntent {
        player_id: u64,
        intent: GameIntent,
    },
    Refuse {
        error: ServerMessage,
        close_code: u16,
    },
}

fn protocol_refusal(message: &str) -> SessionDecision {
    SessionDecision::Refuse {
        error: ServerMessage::AuthError {
            message: message.to_owned(),
        },
        close_code: CLOSE_CODE_PROTOCOL_MISMATCH,
    }
}

pub fn decide_message(phase: &SessionPhase, message: &ClientMessage) -> SessionDecision {
    match (phase, message) {
        (
            SessionPhase::AwaitingClientInfo,
            ClientMessage::ClientInfo {
                protocol_version, ..
            },
        ) if *protocol_version == PROTOCOL_VERSION => SessionDecision::AwaitGuestJoin,
        (SessionPhase::AwaitingClientInfo, ClientMessage::ClientInfo { .. }) => {
            protocol_refusal("Protocol v1 required. Reload this client.")
        }
        (SessionPhase::AwaitingClientInfo, _) => {
            protocol_refusal("Send ClientInfo first. Reload this client.")
        }
        (SessionPhase::AwaitingGuestJoin, ClientMessage::JoinAsGuest { nickname }) => {
            SessionDecision::JoinGuest {
                nickname: nickname.clone(),
            }
        }
        (SessionPhase::AwaitingGuestJoin, _) => {
            protocol_refusal("Send JoinAsGuest next. Reload this client.")
        }
        (SessionPhase::Joined { player_id }, ClientMessage::Intent(intent)) => {
            SessionDecision::ApplyIntent {
                player_id: *player_id,
                intent: intent.clone(),
            }
        }
        (SessionPhase::Joined { .. }, _) => {
            protocol_refusal("Session is already joined. Reload this client.")
        }
    }
}

#[derive(Clone, Default)]
pub struct SessionRegistry {
    senders: Arc<Mutex<BTreeMap<u64, mpsc::Sender<ServerMessage>>>>,
}

impl SessionRegistry {
    pub async fn insert(&self, player_id: u64, sender: mpsc::Sender<ServerMessage>) {
        self.senders.lock().await.insert(player_id, sender);
    }

    pub async fn remove(&self, player_id: u64) {
        self.senders.lock().await.remove(&player_id);
    }

    pub async fn send_snapshot(&self, player_id: u64, message: ServerMessage) {
        let sender = self.senders.lock().await.get(&player_id).cloned();
        let Some(sender) = sender else {
            return;
        };
        match sender.try_send(message) {
            Ok(()) | Err(mpsc::error::TrySendError::Full(_)) => {}
            Err(mpsc::error::TrySendError::Closed(_)) => self.remove(player_id).await,
        }
    }
}

pub async fn run_session(
    stream: TcpStream,
    world: Arc<Mutex<WorldState>>,
    registry: SessionRegistry,
) -> Result<(), SessionError> {
    let socket = accept_async(stream).await?;
    let (mut writer, mut reader) = socket.split();
    let (outbound_tx, mut outbound_rx) = mpsc::channel::<ServerMessage>(1);
    let mut outbound_tx = Some(outbound_tx);
    let mut phase = SessionPhase::AwaitingClientInfo;
    let mut player_id = None;

    'session: loop {
        tokio::select! {
            inbound = reader.next() => {
                let message = match inbound {
                    Some(Ok(Message::Ping(_))) | Some(Ok(Message::Pong(_))) => continue,
                    Some(Ok(Message::Close(_))) | Some(Err(_)) | None => break 'session,
                    Some(Ok(Message::Text(text))) => {
                        match serde_json::from_str::<ClientMessage>(&text) {
                            Ok(message) => message,
                            Err(_) if !matches!(phase, SessionPhase::Joined { .. }) => {
                                let _ = refuse(
                                    &mut writer,
                                    ServerMessage::AuthError {
                                        message: "Send ClientInfo first. Reload this client.".to_owned(),
                                    },
                                    CLOSE_CODE_PROTOCOL_MISMATCH,
                                ).await;
                                break 'session;
                            }
                            Err(error) => {
                                eprintln!("ignoring malformed joined-session text frame: {error}");
                                continue;
                            }
                        }
                    }
                    Some(Ok(Message::Binary(_))) if !matches!(phase, SessionPhase::Joined { .. }) => {
                        let _ = refuse(
                            &mut writer,
                            ServerMessage::AuthError {
                                message: "Send ClientInfo first. Reload this client.".to_owned(),
                            },
                            CLOSE_CODE_PROTOCOL_MISMATCH,
                        ).await;
                        break 'session;
                    }
                    Some(Ok(Message::Binary(_))) => {
                        eprintln!("ignoring binary frame after join");
                        continue;
                    }
                    Some(Ok(_)) => continue,
                };

                match decide_message(&phase, &message) {
                    SessionDecision::AwaitGuestJoin => {
                        phase = SessionPhase::AwaitingGuestJoin;
                    }
                    SessionDecision::JoinGuest { nickname } => {
                        let player = world.lock().await.join_guest(nickname.clone());
                        let sender = outbound_tx
                            .as_ref()
                            .expect("session sender must exist before join");
                        sender
                            .try_send(ServerMessage::JoinAccepted {
                                player_id: player.id,
                                nickname,
                                position: player.position,
                            })
                            .expect("a fresh session mailbox has one free slot");
                        registry.insert(player.id, sender.clone()).await;
                        drop(outbound_tx.take());
                        player_id = Some(player.id);
                        phase = SessionPhase::Joined {
                            player_id: player.id,
                        };
                    }
                    SessionDecision::ApplyIntent { player_id, intent } => {
                        world.lock().await.apply_intent(player_id, &intent);
                    }
                    SessionDecision::Refuse { error, close_code } => {
                        let _ = refuse(&mut writer, error, close_code).await;
                        break 'session;
                    }
                }
            }
            outbound = outbound_rx.recv() => match outbound {
                Some(message) => {
                    let Ok(text) = serde_json::to_string(&message) else {
                        eprintln!("could not serialize server message");
                        break 'session;
                    };
                    if writer.send(Message::Text(text.into())).await.is_err() {
                        break 'session;
                    }
                }
                None => break 'session,
            },
        }
    }

    finalize_session(player_id, &world, &registry).await;
    Ok(())
}

async fn refuse(
    writer: &mut WebSocketWriter,
    error: ServerMessage,
    close_code: u16,
) -> Result<(), SessionError> {
    writer
        .send(Message::Text(serde_json::to_string(&error)?.into()))
        .await?;
    writer
        .send(Message::Close(Some(CloseFrame {
            code: CloseCode::Library(close_code),
            reason: "protocol mismatch".into(),
        })))
        .await?;
    Ok(())
}

async fn finalize_session(
    player_id: Option<u64>,
    world: &Arc<Mutex<WorldState>>,
    registry: &SessionRegistry,
) {
    if let Some(player_id) = player_id {
        registry.remove(player_id).await;
        world.lock().await.remove_player(player_id);
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use futures_util::{SinkExt, StreamExt};
    use rune_dungeon_shared::{
        ClientMessage, CombatMode, GameIntent, PlayerSnapshot, ServerMessage,
        TransformationSnapshot, Vec2, CLOSE_CODE_PROTOCOL_MISMATCH, PROTOCOL_VERSION,
    };
    use tokio::{
        net::{TcpListener, TcpStream},
        sync::{mpsc, Mutex},
        task::JoinHandle,
    };
    use tokio_tungstenite::{
        tungstenite::{protocol::frame::coding::CloseCode, Message},
        MaybeTlsStream, WebSocketStream,
    };

    use super::*;
    use crate::world::{WorldState, SERVER_TICK_SECONDS};

    type TestClient = WebSocketStream<MaybeTlsStream<TcpStream>>;
    type SessionResult = Result<(), Box<dyn std::error::Error + Send + Sync>>;

    #[test]
    fn session_phase_accepts_exactly_one_ordered_join() {
        let client_info = ClientMessage::ClientInfo {
            protocol_version: PROTOCOL_VERSION,
            client_kind: "web".to_owned(),
            client_version: "0.0.0".to_owned(),
        };
        let join = ClientMessage::JoinAsGuest {
            nickname: "모험가".to_owned(),
        };

        assert_eq!(
            decide_message(&SessionPhase::AwaitingClientInfo, &client_info),
            SessionDecision::AwaitGuestJoin,
        );
        assert_eq!(
            decide_message(&SessionPhase::AwaitingGuestJoin, &join),
            SessionDecision::JoinGuest {
                nickname: "모험가".to_owned()
            },
        );
        assert!(matches!(
            decide_message(&SessionPhase::Joined { player_id: 1 }, &join),
            SessionDecision::Refuse {
                close_code: CLOSE_CODE_PROTOCOL_MISMATCH,
                ..
            },
        ));
    }

    #[test]
    fn session_phase_refuses_wrong_version_and_every_out_of_order_message() {
        let wrong_version = ClientMessage::ClientInfo {
            protocol_version: PROTOCOL_VERSION + 1,
            client_kind: "web".to_owned(),
            client_version: "0.0.0".to_owned(),
        };
        let join = ClientMessage::JoinAsGuest {
            nickname: "모험가".to_owned(),
        };
        let intent = ClientMessage::Intent(GameIntent::MoveToGround {
            point: Vec2 { x: 6.0, z: 0.0 },
        });

        for (phase, message) in [
            (SessionPhase::AwaitingClientInfo, &wrong_version),
            (SessionPhase::AwaitingClientInfo, &join),
            (SessionPhase::AwaitingGuestJoin, &intent),
            (SessionPhase::Joined { player_id: 1 }, &wrong_version),
        ] {
            assert!(matches!(
                decide_message(&phase, message),
                SessionDecision::Refuse {
                    close_code: CLOSE_CODE_PROTOCOL_MISMATCH,
                    ..
                },
            ));
        }
    }

    #[tokio::test]
    async fn full_snapshot_mailbox_drops_a_new_snapshot_without_growing() {
        let (tx, mut rx) = mpsc::channel(1);
        let registry = SessionRegistry::default();
        let snapshot = |tick| ServerMessage::WorldSnapshot {
            tick,
            player: PlayerSnapshot {
                id: 1,
                position: Vec2 {
                    x: tick as f32,
                    z: 0.0,
                },
                target: None,
                transformation: normal_transformation(),
            },
        };
        registry.insert(1, tx).await;
        registry.send_snapshot(1, snapshot(1)).await;
        registry.send_snapshot(1, snapshot(2)).await;
        assert!(matches!(
            rx.recv().await,
            Some(ServerMessage::WorldSnapshot { tick: 1, .. })
        ));
    }

    #[tokio::test]
    async fn closed_snapshot_mailbox_is_unregistered() {
        let (tx, rx) = mpsc::channel(1);
        let registry = SessionRegistry::default();
        registry.insert(1, tx).await;
        drop(rx);
        registry
            .send_snapshot(
                1,
                ServerMessage::WorldSnapshot {
                    tick: 1,
                    player: PlayerSnapshot {
                        id: 1,
                        position: Vec2 { x: 0.0, z: 0.0 },
                        target: None,
                        transformation: normal_transformation(),
                    },
                },
            )
            .await;
        assert!(!registry.senders.lock().await.contains_key(&1));
    }

    #[tokio::test]
    async fn removing_the_last_joined_sender_closes_the_outbound_mailbox() {
        let (tx, mut rx) = mpsc::channel::<ServerMessage>(1);
        let registry = SessionRegistry::default();
        registry.insert(1, tx).await;
        registry.remove(1).await;
        assert!(rx.recv().await.is_none());
    }

    #[tokio::test]
    async fn finalizer_removes_the_same_player_once_from_world_and_registry() {
        let world = Arc::new(Mutex::new(WorldState::default()));
        let player = world.lock().await.join_guest("모험가".to_owned());
        let registry = SessionRegistry::default();
        let (tx, _rx) = mpsc::channel(1);
        registry.insert(player.id, tx).await;
        finalize_session(Some(player.id), &world, &registry).await;
        finalize_session(Some(player.id), &world, &registry).await;
        assert!(world.lock().await.player(player.id).is_none());
        assert!(!registry.senders.lock().await.contains_key(&player.id));
    }

    #[tokio::test]
    async fn loopback_refusal_sends_auth_error_before_4001_close() {
        let (url, _world, _registry, server) = start_one_session().await;
        let (mut client, _) = tokio_tungstenite::connect_async(url).await.unwrap();
        client
            .send(Message::Text(
                serde_json::to_string(&ClientMessage::ClientInfo {
                    protocol_version: PROTOCOL_VERSION + 1,
                    client_kind: "web".to_owned(),
                    client_version: "0.0.0".to_owned(),
                })
                .unwrap()
                .into(),
            ))
            .await
            .unwrap();
        assert!(
            matches!(client.next().await.unwrap().unwrap(), Message::Text(text)
            if matches!(serde_json::from_str(&text), Ok(ServerMessage::AuthError { .. })))
        );
        assert!(
            matches!(client.next().await.unwrap().unwrap(), Message::Close(Some(frame))
            if frame.code == CloseCode::Library(CLOSE_CODE_PROTOCOL_MISMATCH))
        );
        wait_for_session(server).await;
    }

    #[tokio::test]
    async fn loopback_join_receives_its_snapshot_and_disconnect_cleans_up() {
        let (url, world, registry, server) = start_one_session().await;
        let (mut client, _) = tokio_tungstenite::connect_async(url).await.unwrap();
        send_client_info_then_join(&mut client).await;
        let player_id = receive_join_accepted(&mut client).await;
        registry
            .send_snapshot(
                player_id,
                ServerMessage::WorldSnapshot {
                    tick: 1,
                    player: PlayerSnapshot {
                        id: player_id,
                        position: Vec2 { x: 1.2, z: 0.0 },
                        target: None,
                        transformation: normal_transformation(),
                    },
                },
            )
            .await;
        assert!(matches!(
            receive_server_message(&mut client).await,
            ServerMessage::WorldSnapshot {
                player: PlayerSnapshot { id, .. },
                ..
            } if id == player_id
        ));
        client.close(None).await.unwrap();
        wait_for_session(server).await;
        assert!(world.lock().await.player(player_id).is_none());
    }

    #[tokio::test]
    async fn malformed_or_binary_before_join_is_refused() {
        for frame in [
            Message::Text("{not json".into()),
            Message::Binary(vec![1].into()),
        ] {
            let (url, _world, _registry, server) = start_one_session().await;
            let (mut client, _) = tokio_tungstenite::connect_async(url).await.unwrap();
            client.send(frame).await.unwrap();
            assert!(matches!(
                receive_server_message(&mut client).await,
                ServerMessage::AuthError { .. }
            ));
            assert!(
                matches!(client.next().await.unwrap().unwrap(), Message::Close(Some(frame))
                if frame.code == CloseCode::Library(CLOSE_CODE_PROTOCOL_MISMATCH))
            );
            wait_for_session(server).await;
        }
    }

    #[tokio::test]
    async fn ping_before_client_info_does_not_break_join() {
        let (url, _world, _registry, server) = start_one_session().await;
        let (mut client, _) = tokio_tungstenite::connect_async(url).await.unwrap();
        client.send(Message::Ping(vec![1].into())).await.unwrap();
        send_client_info_then_join(&mut client).await;
        assert_eq!(receive_join_accepted(&mut client).await, 1);
        client.close(None).await.unwrap();
        wait_for_session(server).await;
    }

    #[tokio::test]
    async fn malformed_or_binary_after_join_is_ignored() {
        let (url, world, _registry, server) = start_one_session().await;
        let (mut client, _) = tokio_tungstenite::connect_async(url).await.unwrap();
        send_client_info_then_join(&mut client).await;
        let player_id = receive_join_accepted(&mut client).await;
        client
            .send(Message::Text("{not json".into()))
            .await
            .unwrap();
        client.send(Message::Binary(vec![1].into())).await.unwrap();
        client
            .send(Message::Text(
                serde_json::to_string(&ClientMessage::Intent(GameIntent::MoveToGround {
                    point: Vec2 { x: 3.0, z: -2.0 },
                }))
                .unwrap()
                .into(),
            ))
            .await
            .unwrap();

        tokio::time::timeout(std::time::Duration::from_secs(1), async {
            loop {
                if world.lock().await.player(player_id).unwrap().target
                    == Some(Vec2 { x: 3.0, z: -2.0 })
                {
                    break;
                }
                tokio::task::yield_now().await;
            }
        })
        .await
        .expect("valid move should be applied");
        client.close(None).await.unwrap();
        wait_for_session(server).await;
    }

    #[tokio::test]
    async fn loopback_toggle_is_confirmed_by_a_transformed_snapshot() {
        let (url, world, registry, server) = start_one_session().await;
        let (mut client, _) = tokio_tungstenite::connect_async(url).await.unwrap();
        send_client_info_then_join(&mut client).await;
        let player_id = receive_join_accepted(&mut client).await;
        client
            .send(Message::Text(r#"{"Intent":"ToggleTransformation"}"#.into()))
            .await
            .unwrap();

        tokio::time::timeout(std::time::Duration::from_secs(1), async {
            loop {
                let transformed =
                    world
                        .lock()
                        .await
                        .snapshot_for(player_id)
                        .is_some_and(|snapshot| {
                            snapshot.transformation.combat_mode == CombatMode::Transformed
                        });
                if transformed {
                    break;
                }
                tokio::task::yield_now().await;
            }
        })
        .await
        .expect("toggle should be applied");
        let message = world
            .lock()
            .await
            .tick(SERVER_TICK_SECONDS)
            .into_iter()
            .find_map(|(id, message)| (id == player_id).then_some(message))
            .unwrap();
        registry.send_snapshot(player_id, message).await;
        assert!(matches!(
            receive_server_message(&mut client).await,
            ServerMessage::WorldSnapshot {
                player: PlayerSnapshot {
                    transformation: TransformationSnapshot {
                        combat_mode: CombatMode::Transformed,
                        revision: 1,
                        ..
                    },
                    ..
                },
                ..
            }
        ));
        client.close(None).await.unwrap();
        wait_for_session(server).await;
    }

    async fn start_one_session() -> (
        String,
        Arc<Mutex<WorldState>>,
        SessionRegistry,
        JoinHandle<SessionResult>,
    ) {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let world = Arc::new(Mutex::new(WorldState::default()));
        let registry = SessionRegistry::default();
        let server_world = world.clone();
        let server_registry = registry.clone();
        let server = tokio::spawn(async move {
            let (stream, _) = listener.accept().await.unwrap();
            run_session(stream, server_world, server_registry).await
        });
        (format!("ws://{address}"), world, registry, server)
    }

    async fn send_client_info_then_join(client: &mut TestClient) {
        for message in [
            ClientMessage::ClientInfo {
                protocol_version: PROTOCOL_VERSION,
                client_kind: "web".to_owned(),
                client_version: "0.0.0".to_owned(),
            },
            ClientMessage::JoinAsGuest {
                nickname: "모험가".to_owned(),
            },
        ] {
            client
                .send(Message::Text(
                    serde_json::to_string(&message).unwrap().into(),
                ))
                .await
                .unwrap();
        }
    }

    async fn receive_join_accepted(client: &mut TestClient) -> u64 {
        match receive_server_message(client).await {
            ServerMessage::JoinAccepted { player_id, .. } => player_id,
            message => panic!("expected JoinAccepted, received {message:?}"),
        }
    }

    async fn receive_server_message(client: &mut TestClient) -> ServerMessage {
        loop {
            match client.next().await.unwrap().unwrap() {
                Message::Text(text) => return serde_json::from_str(&text).unwrap(),
                Message::Ping(_) | Message::Pong(_) => continue,
                frame => panic!("expected text server frame, received {frame:?}"),
            }
        }
    }

    async fn wait_for_session(server: JoinHandle<SessionResult>) {
        tokio::time::timeout(std::time::Duration::from_secs(1), server)
            .await
            .expect("session should close")
            .expect("session task should not panic")
            .expect("session should not return an error");
    }

    fn normal_transformation() -> TransformationSnapshot {
        TransformationSnapshot {
            in_id: "in_fire_001".to_owned(),
            combat_mode: CombatMode::Normal,
            revision: 0,
        }
    }
}
