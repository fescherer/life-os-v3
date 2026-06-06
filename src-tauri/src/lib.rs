use rusqlite::{params, Connection};
use serde::Serialize;
use std::fs;
use tauri::{AppHandle, Manager};

#[derive(Serialize)]
struct Note {
    id: i64,
    body: String,
}

fn connect(app: &AppHandle) -> Result<Connection, String> {
    let data_dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
    fs::create_dir_all(&data_dir).map_err(|error| error.to_string())?;

    let connection =
        Connection::open(data_dir.join("life-os.sqlite")).map_err(|error| error.to_string())?;

    connection
        .execute(
            "CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                body TEXT NOT NULL
            )",
            [],
        )
        .map_err(|error| error.to_string())?;

    Ok(connection)
}

#[tauri::command]
fn add_note(app: AppHandle, body: String) -> Result<(), String> {
    let connection = connect(&app)?;

    connection
        .execute("INSERT INTO notes (body) VALUES (?1)", params![body])
        .map_err(|error| error.to_string())?;

    Ok(())
}

#[tauri::command]
fn list_notes(app: AppHandle) -> Result<Vec<Note>, String> {
    let connection = connect(&app)?;
    let mut statement = connection
        .prepare("SELECT id, body FROM notes ORDER BY id DESC")
        .map_err(|error| error.to_string())?;

    let notes = statement
        .query_map([], |row| {
            Ok(Note {
                id: row.get(0)?,
                body: row.get(1)?,
            })
        })
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;

    Ok(notes)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![add_note, list_notes])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
