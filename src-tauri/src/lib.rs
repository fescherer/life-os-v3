use rusqlite::{params, Connection};
use serde::Serialize;
use std::{
    fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager};

const DB_FILE_NAME: &str = "life-os.sqlite";
const IMAGES_DIR_NAME: &str = "images";

#[derive(Serialize)]
struct Note {
    id: i64,
    body: String,
}

fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let data_dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
    fs::create_dir_all(&data_dir).map_err(|error| error.to_string())?;

    Ok(data_dir)
}

fn db_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join(DB_FILE_NAME))
}

fn images_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let images_dir = app_data_dir(app)?.join(IMAGES_DIR_NAME);
    fs::create_dir_all(&images_dir).map_err(|error| error.to_string())?;

    Ok(images_dir)
}

fn connect(app: &AppHandle) -> Result<Connection, String> {
    let connection = Connection::open(db_path(app)?).map_err(|error| error.to_string())?;

    images_dir(app)?;

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

fn copy_dir(from: &Path, to: &Path) -> Result<(), String> {
    fs::create_dir_all(to).map_err(|error| error.to_string())?;

    for entry in fs::read_dir(from).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let source_path = entry.path();
        let target_path = to.join(entry.file_name());

        if source_path.is_dir() {
            copy_dir(&source_path, &target_path)?;
        } else {
            fs::copy(&source_path, &target_path).map_err(|error| error.to_string())?;
        }
    }

    Ok(())
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

#[tauri::command]
fn export_backup(app: AppHandle) -> Result<String, String> {
    connect(&app)?;

    let selected_dir = rfd::FileDialog::new()
        .set_title("Choose where to save your Life OS backup")
        .pick_folder()
        .ok_or_else(|| "Export canceled".to_string())?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_secs();
    let backup_dir = selected_dir.join(format!("life-os-backup-{timestamp}"));

    fs::create_dir(&backup_dir).map_err(|error| error.to_string())?;
    fs::copy(db_path(&app)?, backup_dir.join(DB_FILE_NAME)).map_err(|error| error.to_string())?;
    copy_dir(&images_dir(&app)?, &backup_dir.join(IMAGES_DIR_NAME))?;

    Ok(backup_dir.display().to_string())
}

#[tauri::command]
fn restore_backup(app: AppHandle) -> Result<String, String> {
    let backup_dir = rfd::FileDialog::new()
        .set_title("Choose a Life OS backup folder")
        .pick_folder()
        .ok_or_else(|| "Restore canceled".to_string())?;

    let backup_db = backup_dir.join(DB_FILE_NAME);
    let backup_images = backup_dir.join(IMAGES_DIR_NAME);

    if !backup_db.is_file() {
        return Err(format!("Backup folder must contain {DB_FILE_NAME}"));
    }

    let current_db = db_path(&app)?;
    let current_images = images_dir(&app)?;

    fs::copy(backup_db, current_db).map_err(|error| error.to_string())?;

    if current_images.exists() {
        fs::remove_dir_all(&current_images).map_err(|error| error.to_string())?;
    }

    if backup_images.is_dir() {
        copy_dir(&backup_images, &current_images)?;
    } else {
        fs::create_dir_all(&current_images).map_err(|error| error.to_string())?;
    }

    connect(&app)?;

    Ok(backup_dir.display().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            add_note,
            list_notes,
            export_backup,
            restore_backup
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
