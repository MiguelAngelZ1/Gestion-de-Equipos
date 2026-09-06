use std::io::{Read, Write};
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::Duration;
use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

struct BackendChild(Mutex<Option<Child>>);

fn try_graceful_shutdown() -> bool {
    if let Ok(mut stream) = std::net::TcpStream::connect("127.0.0.1:3001") {
        let _ = stream.set_write_timeout(Some(Duration::from_secs(2)));
        let _ = stream.set_read_timeout(Some(Duration::from_secs(2)));
        let req = "POST /internal/shutdown HTTP/1.1\r\nHost: localhost:3001\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
        if stream.write_all(req.as_bytes()).is_ok() {
            let mut buf = [0u8; 512];
            let _ = stream.read(&mut buf);
            let resp = String::from_utf8_lossy(&buf);
            return resp.contains("200") || resp.contains("shutting down");
        }
    }
    false
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(BackendChild(Mutex::new(None)))
        .setup(|app| {
            let backend_running = std::net::TcpStream::connect("127.0.0.1:3001").is_ok();
            if backend_running {
                println!("[TAURI] Backend ya esta corriendo en 3001, no se inicia sidecar");
            } else {
                let backend_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../backend");
                println!("[TAURI] Iniciando backend sidecar desde: {}", backend_path.display());
                match Command::new("cmd")
                    .args(["/C", "pnpm", "start"])
                    .current_dir(&backend_path)
                    .spawn()
                {
                    Ok(child) => {
                        println!("[TAURI] Backend sidecar iniciado PID: {}", child.id());
                        if let Some(state) = app.try_state::<BackendChild>() {
                            *state.0.lock().unwrap() = Some(child);
                        }
                    }
                    Err(e) => {
                        eprintln!("[TAURI] Error iniciando backend sidecar: {}", e);
                    }
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                if let Some(state) = window.app_handle().try_state::<BackendChild>() {
                    let mut guard = state.0.lock().unwrap();
                    if let Some(mut child) = guard.take() {
                        println!("[TAURI] Cierre ordenado backend PID: {}", child.id());
                        let graceful = try_graceful_shutdown();
                        if graceful {
                            println!("[TAURI] Shutdown ordenado solicitado, esperando 4s...");
                            std::thread::sleep(Duration::from_secs(4));
                            match child.try_wait() {
                                Ok(Some(status)) => println!("[TAURI] Backend salio ordenado: {}", status),
                                Ok(None) => {
                                    println!("[TAURI] Backend no salio a tiempo, forzando kill");
                                    let _ = child.kill();
                                }
                                Err(e) => {
                                    eprintln!("[TAURI] try_wait error: {}", e);
                                    let _ = child.kill();
                                }
                            }
                        } else {
                            println!("[TAURI] Graceful fallo, kill directo PID: {}", child.id());
                            let _ = child.kill();
                        }
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
