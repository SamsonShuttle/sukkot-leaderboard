use tauri::Manager;

#[tauri::command]
fn delete_database(app: tauri::AppHandle, database_id: String) -> Result<(), String> {
    if !database_id.chars().all(|character| character.is_ascii_alphanumeric() || character == '-') {
        return Err("Invalid database identifier".into());
    }
    let filename = if database_id == "default" {
        "sukkot-leaderboard.db".to_string()
    } else {
        format!("sukkot-leaderboard-{}.db", database_id)
    };
    let path = app.path().app_config_dir().map_err(|error| error.to_string())?.join(filename);
    if path.exists() {
        std::fs::remove_file(&path).map_err(|error| error.to_string())?;
    }
    for suffix in ["-wal", "-shm"] {
        let sidecar = path.with_file_name(format!("{}{}", path.file_name().and_then(|name| name.to_str()).unwrap_or_default(), suffix));
        if sidecar.exists() {
            std::fs::remove_file(sidecar).map_err(|error| error.to_string())?;
        }
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![delete_database])
        .run(tauri::generate_context!())
        .expect("error while running the Sukkot Leaderboard application");
}
