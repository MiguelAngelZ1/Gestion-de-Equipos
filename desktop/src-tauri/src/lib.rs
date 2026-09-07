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
                let resource_dir = app.path().resource_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
                let backend_resource_candidates = [resource_dir.join("bundle-backend"), resource_dir.join("backend")];
                let backend_resource = backend_resource_candidates.iter().find(|p| p.join("server.ts").exists() || p.join("server.js").exists()).cloned().unwrap_or(resource_dir.join("bundle-backend"));
                let backend_dev = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../backend");
                let is_bundled = backend_resource.join("server.ts").exists() || backend_resource.join("server.js").exists();
                if is_bundled {
                    println!("[TAURI] Modo PRODUCCION offline - backend en: {}", backend_resource.display());
                    let app_data = app.path().app_data_dir().unwrap_or_else(|_| resource_dir.clone());
                    let _ = std::fs::create_dir_all(&app_data);
                    let db_path = app_data.join("equipos.db");
                    if !db_path.exists() {
                        let bundled_db = backend_resource.join("equipos.db");
                        if bundled_db.exists() {
                            let _ = std::fs::copy(&bundled_db, &db_path);
                            println!("[TAURI] DB inicial copiada a {}", db_path.display());
                            for ext in ["-wal", "-shm"] {
                                let src = backend_resource.join(format!("equipos.db{}", ext));
                                if src.exists() {
                                    let _ = std::fs::copy(src, app_data.join(format!("equipos.db{}", ext)));
                                }
                            }
                        }
                    }
                    let static_path = resource_dir.join("frontend").join("dist");
                    let node_candidates = vec![
                        resource_dir.join("node-x86_64-pc-windows-msvc.exe"),
                        resource_dir.join("binaries").join("node-x86_64-pc-windows-msvc.exe"),
                        std::env::current_exe().ok().and_then(|p| p.parent().map(|d| d.join("node-x86_64-pc-windows-msvc.exe"))).unwrap_or_default(),
                        std::path::PathBuf::from("C:\\Program Files\\nodejs\\node.exe"),
                    ];
                    let node_path = node_candidates.into_iter().find(|p| p.exists());
                    if let Some(node) = node_path {
                        println!("[TAURI] Node encontrado: {}", node.display());
                        let tsx_cli = backend_resource.join("node_modules").join("tsx").join("dist").join("cli.mjs");
                        let server_ts = backend_resource.join("server.ts");
                        let server_js = backend_resource.join("server.js");
                        let mut cmd = Command::new(&node);
                        if tsx_cli.exists() && server_ts.exists() {
                            cmd.args([tsx_cli.to_string_lossy().to_string(), server_ts.to_string_lossy().to_string()]);
                        } else if server_js.exists() {
                            cmd.arg(server_js);
                        } else {
                            cmd.arg(server_ts);
                        }
                        cmd.current_dir(&backend_resource);
                        cmd.env("DB_PATH", &db_path);
                        cmd.env("STATIC_PATH", &static_path);
                        cmd.env("PORT", "3001");
                        cmd.env("NODE_ENV", "production");
                        match cmd.spawn() {
                            Ok(child) => {
                                println!("[TAURI] Backend sidecar PRODUCCION PID: {}", child.id());
                                if let Some(state) = app.try_state::<BackendChild>() {
                                    *state.0.lock().unwrap() = Some(child);
                                }
                            }
                            Err(e) => eprintln!("[TAURI] Error iniciando backend produccion: {}", e),
                        }
                    } else {
                        eprintln!("[TAURI] Node no encontrado para modo produccion");
                    }
                } else {
                    println!("[TAURI] Modo DEV - iniciando con pnpm desde: {}", backend_dev.display());
                    match Command::new("cmd").args(["/C", "pnpm", "start"]).current_dir(&backend_dev).spawn() {
                        Ok(child) => {
                            println!("[TAURI] Backend sidecar DEV PID: {}", child.id());
                            if let Some(state) = app.try_state::<BackendChild>() {
                                *state.0.lock().unwrap() = Some(child);
                            }
                        }
                        Err(e) => eprintln!("[TAURI] Error iniciando backend DEV: {}", e),
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
