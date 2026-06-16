use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::json;
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

#[derive(Deserialize)]
struct FinancialEntryInput {
    entry_type: String,
    date: String,
    bank: String,
    value: i64,
    description: String,
}

#[derive(Deserialize, Serialize)]
struct FinancialEntryData {
    #[serde(rename = "type")]
    entry_type: String,
    date: String,
    bank: String,
    value: i64,
    description: String,
}

#[derive(Serialize)]
struct FinancialEntry {
    id: String,
    created_at: String,
    updated_at: String,
    #[serde(flatten)]
    data: FinancialEntryData,
    bank_label: String,
    bank_color: String,
}

#[derive(Clone, Deserialize, Serialize)]
struct SelectOption {
    value: String,
    label: String,
    color: String,
}

#[derive(Deserialize)]
struct BankOptionInput {
    label: String,
    color: String,
}

#[derive(Deserialize)]
struct UpdateBankOptionInput {
    value: String,
    label: String,
    color: String,
}

fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
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
    migrate_database(&connection)?;

    Ok(connection)
}

fn migrate_database(connection: &Connection) -> Result<(), String> {
    connection
        .execute(
            "CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                body TEXT NOT NULL
            )",
            [],
        )
        .map_err(|error| error.to_string())?;

    migrate_financial_database(connection)?;

    Ok(())
}

fn migrate_financial_database(connection: &Connection) -> Result<(), String> {
    connection
        .execute("PRAGMA foreign_keys = ON", [])
        .map_err(|error| error.to_string())?;

    if table_exists(connection, "features")? && !table_has_column(connection, "features", "feature")?
    {
        archive_table(connection, "select_options")?;
        archive_table(connection, "data")?;
        archive_table(connection, "selects")?;
        archive_table(connection, "features")?;
    }

    if table_exists(connection, "selects")? && !table_has_column(connection, "selects", "options")? {
        archive_table(connection, "selects")?;
    }

    connection
        .execute_batch(
            "
            CREATE TABLE IF NOT EXISTS features (
                id TEXT PRIMARY KEY,
                feature TEXT NOT NULL,
                data TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_features_feature_created_at
                ON features (feature, created_at);

            CREATE TABLE IF NOT EXISTS selects (
                id TEXT PRIMARY KEY,
                options TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            ",
        )
        .map_err(|error| error.to_string())?;

    let default_banks = json!([
        { "value": "nubank", "label": "Nubank", "color": "#820ad1" },
        { "value": "inter", "label": "Inter", "color": "#ff7a00" },
        { "value": "sicredi", "label": "Sicredi", "color": "#2ca24d" }
    ])
    .to_string();

    connection
        .execute(
            "INSERT OR IGNORE INTO selects (id, options) VALUES ('banks', ?1)",
            params![default_banks],
        )
        .map_err(|error| error.to_string())?;

    Ok(())
}

fn table_exists(connection: &Connection, table_name: &str) -> Result<bool, String> {
    let exists = connection
        .query_row(
            "SELECT EXISTS (
                SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?1
            )",
            params![table_name],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|error| error.to_string())?;

    Ok(exists == 1)
}

fn table_has_column(
    connection: &Connection,
    table_name: &str,
    column_name: &str,
) -> Result<bool, String> {
    let mut statement = connection
        .prepare(&format!("PRAGMA table_info({table_name})"))
        .map_err(|error| error.to_string())?;

    let columns = statement
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;

    Ok(columns.iter().any(|column| column == column_name))
}

fn archive_table(connection: &Connection, table_name: &str) -> Result<(), String> {
    if !table_exists(connection, table_name)? {
        return Ok(());
    }

    let timestamp = current_timestamp_id()?;
    let archived_name = format!("{table_name}_legacy_{timestamp}");

    connection
        .execute(
            &format!("ALTER TABLE {table_name} RENAME TO {archived_name}"),
            [],
        )
        .map_err(|error| error.to_string())?;

    Ok(())
}

fn current_timestamp_id() -> Result<String, String> {
    Ok(SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_nanos()
        .to_string())
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
fn list_financial_entries(app: AppHandle) -> Result<Vec<FinancialEntry>, String> {
    let connection = connect(&app)?;
    let bank_options = load_bank_options(&connection)?;
    let mut statement = connection
        .prepare(
            "SELECT id, data, created_at, updated_at
            FROM features
            WHERE feature = 'financial'
            ORDER BY json_extract(data, '$.date') DESC, created_at DESC",
        )
        .map_err(|error| error.to_string())?;

    let entries = statement
        .query_map([], |row| {
            let data_json: String = row.get(1)?;
            let data = serde_json::from_str::<FinancialEntryData>(&data_json).map_err(|error| {
                rusqlite::Error::FromSqlConversionFailure(
                    1,
                    rusqlite::types::Type::Text,
                    Box::new(error),
                )
            })?;
            let bank = bank_options
                .iter()
                .find(|option| option.value == data.bank)
                .cloned();

            Ok(FinancialEntry {
                id: row.get(0)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
                bank_label: bank
                    .as_ref()
                    .map(|option| option.label.clone())
                    .unwrap_or_else(|| data.bank.clone()),
                bank_color: bank
                    .as_ref()
                    .map(|option| option.color.clone())
                    .unwrap_or_else(|| "#4f4749".to_string()),
                data,
            })
        })
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;

    Ok(entries)
}

#[tauri::command]
fn add_financial_entry(app: AppHandle, entry: FinancialEntryInput) -> Result<(), String> {
    validate_entry_type(&entry.entry_type)?;

    if entry.value <= 0 {
        return Err("Value must be greater than zero".to_string());
    }

    let connection = connect(&app)?;
    let bank_options = load_bank_options(&connection)?;

    if !bank_options
        .iter()
        .any(|option| option.value == entry.bank)
    {
        return Err("Selected bank does not exist".to_string());
    }

    let data = json!({
        "type": entry.entry_type,
        "date": entry.date,
        "bank": entry.bank,
        "value": entry.value,
        "description": entry.description
    })
    .to_string();

    connection
        .execute(
            "INSERT INTO features (id, feature, data) VALUES (?1, 'financial', ?2)",
            params![format!("financial-{}", current_timestamp_id()?), data],
        )
        .map_err(|error| error.to_string())?;

    Ok(())
}

#[tauri::command]
fn list_bank_options(app: AppHandle) -> Result<Vec<SelectOption>, String> {
    let connection = connect(&app)?;

    load_bank_options(&connection)
}

#[tauri::command]
fn add_bank_option(app: AppHandle, bank: BankOptionInput) -> Result<Vec<SelectOption>, String> {
    let connection = connect(&app)?;
    let mut options = load_bank_options(&connection)?;
    let label = bank.label.trim();

    if label.is_empty() {
        return Err("Bank label is required".to_string());
    }

    options.push(SelectOption {
        value: format!("bank-{}", current_timestamp_id()?),
        label: label.to_string(),
        color: normalize_color(&bank.color),
    });

    save_bank_options(&connection, &options)?;

    Ok(options)
}

#[tauri::command]
fn update_bank_option(
    app: AppHandle,
    bank: UpdateBankOptionInput,
) -> Result<Vec<SelectOption>, String> {
    let connection = connect(&app)?;
    let mut options = load_bank_options(&connection)?;
    let label = bank.label.trim();

    if label.is_empty() {
        return Err("Bank label is required".to_string());
    }

    let option = options
        .iter_mut()
        .find(|option| option.value == bank.value)
        .ok_or_else(|| "Bank does not exist".to_string())?;

    option.label = label.to_string();
    option.color = normalize_color(&bank.color);
    save_bank_options(&connection, &options)?;

    Ok(options)
}

#[tauri::command]
fn remove_bank_option(app: AppHandle, value: String) -> Result<Vec<SelectOption>, String> {
    let connection = connect(&app)?;
    let mut options = load_bank_options(&connection)?;

    if is_bank_used(&connection, &value)? {
        return Err("This bank is used by financial entries".to_string());
    }

    options.retain(|option| option.value != value);
    save_bank_options(&connection, &options)?;

    Ok(options)
}

fn validate_entry_type(entry_type: &str) -> Result<(), String> {
    match entry_type {
        "income" | "expense" | "investment" => Ok(()),
        _ => Err("Invalid financial entry type".to_string()),
    }
}

fn load_bank_options(connection: &Connection) -> Result<Vec<SelectOption>, String> {
    let options_json = connection
        .query_row(
            "SELECT options FROM selects WHERE id = 'banks'",
            [],
            |row| row.get::<_, String>(0),
        )
        .map_err(|error| error.to_string())?;

    serde_json::from_str(&options_json).map_err(|error| error.to_string())
}

fn save_bank_options(connection: &Connection, options: &[SelectOption]) -> Result<(), String> {
    let options_json = serde_json::to_string(options).map_err(|error| error.to_string())?;

    connection
        .execute(
            "UPDATE selects
            SET options = ?1, updated_at = CURRENT_TIMESTAMP
            WHERE id = 'banks'",
            params![options_json],
        )
        .map_err(|error| error.to_string())?;

    Ok(())
}

fn is_bank_used(connection: &Connection, value: &str) -> Result<bool, String> {
    let used = connection
        .query_row(
            "SELECT EXISTS (
                SELECT 1 FROM features
                WHERE feature = 'financial'
                AND json_extract(data, '$.bank') = ?1
            )",
            params![value],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|error| error.to_string())?;

    Ok(used == 1)
}

fn normalize_color(color: &str) -> String {
    let trimmed = color.trim();

    if trimmed.starts_with('#') && trimmed.len() == 7 {
        trimmed.to_string()
    } else {
        "#4f4749".to_string()
    }
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
            list_financial_entries,
            add_financial_entry,
            list_bank_options,
            add_bank_option,
            update_bank_option,
            remove_bank_option,
            export_backup,
            restore_backup
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
