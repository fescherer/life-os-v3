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

#[derive(Deserialize)]
struct AssetInput {
    ticker: String,
    asset_type: String,
    full_name: String,
    color: String,
}

#[derive(Deserialize)]
struct UpdateAssetInput {
    id: String,
    ticker: String,
    asset_type: String,
    full_name: String,
    color: String,
}

#[derive(Deserialize, Serialize)]
struct AssetData {
    ticker: String,
    #[serde(rename = "type")]
    asset_type: String,
    full_name: String,
    #[serde(default = "default_asset_color")]
    color: String,
}

#[derive(Serialize)]
struct Asset {
    id: String,
    created_at: String,
    updated_at: String,
    #[serde(flatten)]
    data: AssetData,
    type_label: String,
    type_color: String,
}

#[derive(Deserialize)]
struct AssetRegisterInput {
    register_type: String,
    date: String,
    bank: String,
    quantity: f64,
    price: i64,
    asset: String,
}

#[derive(Deserialize, Serialize)]
struct AssetRegisterData {
    #[serde(rename = "type")]
    register_type: String,
    date: String,
    bank: String,
    quantity: f64,
    price: i64,
    asset: String,
}

#[derive(Serialize)]
struct AssetRegister {
    id: String,
    created_at: String,
    updated_at: String,
    #[serde(flatten)]
    data: AssetRegisterData,
    bank_label: String,
    bank_color: String,
    asset_ticker: String,
    asset_full_name: String,
    asset_color: String,
    asset_type: String,
    asset_type_label: String,
    asset_type_color: String,
}

#[derive(Deserialize)]
struct CoinInput {
    value: String,
    period: String,
    family: String,
    numista_id: String,
    description: String,
    image_source_path: Option<String>,
    in_collection: bool,
}

#[derive(Deserialize)]
struct UpdateCoinInput {
    id: String,
    value: String,
    period: String,
    family: String,
    numista_id: String,
    description: String,
    image_source_path: Option<String>,
    in_collection: bool,
}

#[derive(Deserialize)]
struct UpdateCoinCollectionInput {
    id: String,
    in_collection: bool,
}

#[derive(Deserialize, Serialize)]
struct CoinData {
    value: String,
    period: String,
    family: String,
    numista_id: String,
    description: String,
    #[serde(default)]
    image_path: String,
    #[serde(default)]
    in_collection: bool,
}

#[derive(Serialize)]
struct Coin {
    id: String,
    created_at: String,
    updated_at: String,
    #[serde(flatten)]
    data: CoinData,
    family_label: String,
    family_color: String,
    image_src: String,
}

#[derive(Deserialize)]
struct ReminderInput {
    title: String,
    frequency: String,
    start_date: String,
}

#[derive(Deserialize)]
struct UpdateReminderInput {
    id: String,
    title: String,
    frequency: String,
    start_date: String,
    last_done_date: Option<String>,
}

#[derive(Deserialize, Serialize)]
struct ReminderData {
    title: String,
    frequency: String,
    #[serde(default)]
    start_date: String,
    #[serde(default)]
    last_done_date: Option<String>,
}

#[derive(Serialize)]
struct Reminder {
    id: String,
    created_at: String,
    updated_at: String,
    #[serde(flatten)]
    data: ReminderData,
}

#[derive(Deserialize)]
struct WarehouseItemInput {
    description: String,
    box_id: String,
}

#[derive(Deserialize)]
struct UpdateWarehouseItemInput {
    id: String,
    description: String,
    box_id: String,
}

#[derive(Deserialize, Serialize)]
struct WarehouseItemData {
    description: String,
    box_id: String,
}

#[derive(Serialize)]
struct WarehouseItem {
    id: String,
    created_at: String,
    updated_at: String,
    #[serde(flatten)]
    data: WarehouseItemData,
    box_label: String,
    box_color: String,
}

fn default_asset_color() -> String {
    "#4f4749".to_string()
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

    let default_asset_banks = json!([
        { "value": "asset-bank-nubank", "label": "Nubank", "color": "#820ad1" },
        { "value": "asset-bank-inter", "label": "Inter", "color": "#ff7a00" }
    ])
    .to_string();

    connection
        .execute(
            "INSERT OR IGNORE INTO selects (id, options) VALUES ('asset_banks', ?1)",
            params![default_asset_banks],
        )
        .map_err(|error| error.to_string())?;

    let default_asset_types = json!([
        { "value": "fii", "label": "FII - Fundo Imobiliário", "color": "#6aa06a" },
        { "value": "stock", "label": "STOCK - Ação", "color": "#4f4749" },
        { "value": "etf", "label": "ETF", "color": "#4f80c0" }
    ])
    .to_string();

    connection
        .execute(
            "INSERT OR IGNORE INTO selects (id, options) VALUES ('asset_types', ?1)",
            params![default_asset_types],
        )
        .map_err(|error| error.to_string())?;

    let default_coin_families = json!([
        { "value": "reis-1799-1942", "label": "Réis(1799-1942)", "color": "#d6cbbc" },
        { "value": "cruzeiro-1942-1967", "label": "Cruzeiro(1942-1967)", "color": "#b7c7bd" },
        { "value": "real-1994-now", "label": "Real(1994-)", "color": "#c8bdd0" }
    ])
    .to_string();

    connection
        .execute(
            "INSERT OR IGNORE INTO selects (id, options) VALUES ('coin_families', ?1)",
            params![default_coin_families],
        )
        .map_err(|error| error.to_string())?;

    let default_warehouse_boxes = json!([
        { "value": "warehouse-box-main", "label": "Main Box", "color": "#4f4749" }
    ])
    .to_string();

    connection
        .execute(
            "INSERT OR IGNORE INTO selects (id, options) VALUES ('warehouse_boxes', ?1)",
            params![default_warehouse_boxes],
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

fn current_timestamp_seconds() -> Result<String, String> {
    Ok(SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_secs()
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

fn copy_coin_image(app: &AppHandle, coin_id: &str, source_path: &str) -> Result<String, String> {
    let source = PathBuf::from(source_path);

    if !source.is_file() {
        return Err("Selected image does not exist".to_string());
    }

    let extension = source
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_lowercase())
        .unwrap_or_else(|| "png".to_string());
    let allowed_extensions = ["png", "jpg", "jpeg", "webp", "gif"];

    if !allowed_extensions.contains(&extension.as_str()) {
        return Err("Image must be PNG, JPG, WEBP, or GIF".to_string());
    }

    let relative_path = format!("coin-collection/{coin_id}.{extension}");
    let destination = images_dir(app)?.join(&relative_path);
    fs::create_dir_all(
        destination
            .parent()
            .ok_or_else(|| "Invalid image destination".to_string())?,
    )
    .map_err(|error| error.to_string())?;
    fs::copy(source, destination).map_err(|error| error.to_string())?;

    Ok(relative_path)
}

fn coin_image_data_url(image_path: &Path) -> Result<String, String> {
    if !image_path.is_file() {
        return Ok(String::new());
    }

    let extension = image_path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_lowercase())
        .unwrap_or_default();
    let mime_type = match extension.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "gif" => "image/gif",
        _ => "image/png",
    };
    let bytes = fs::read(image_path).map_err(|error| error.to_string())?;

    Ok(format!(
        "data:{mime_type};base64,{}",
        encode_base64(&bytes)
    ))
}

fn encode_base64(bytes: &[u8]) -> String {
    const TABLE: &[u8; 64] =
        b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut encoded = String::with_capacity(bytes.len().div_ceil(3) * 4);
    let mut index = 0;

    while index < bytes.len() {
        let first = bytes[index];
        let second = bytes.get(index + 1).copied();
        let third = bytes.get(index + 2).copied();

        encoded.push(TABLE[(first >> 2) as usize] as char);
        encoded
            .push(TABLE[(((first & 0b0000_0011) << 4) | (second.unwrap_or(0) >> 4)) as usize] as char);

        if let Some(second) = second {
            encoded.push(
                TABLE[(((second & 0b0000_1111) << 2) | (third.unwrap_or(0) >> 6)) as usize]
                    as char,
            );
        } else {
            encoded.push('=');
        }

        if let Some(third) = third {
            encoded.push(TABLE[(third & 0b0011_1111) as usize] as char);
        } else {
            encoded.push('=');
        }

        index += 3;
    }

    encoded
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

#[tauri::command]
fn list_asset_bank_options(app: AppHandle) -> Result<Vec<SelectOption>, String> {
    let connection = connect(&app)?;

    load_select_options(&connection, "asset_banks")
}

#[tauri::command]
fn add_asset_bank_option(app: AppHandle, bank: BankOptionInput) -> Result<Vec<SelectOption>, String> {
    let connection = connect(&app)?;
    let mut options = load_select_options(&connection, "asset_banks")?;
    let label = bank.label.trim();

    if label.is_empty() {
        return Err("Bank label is required".to_string());
    }

    options.push(SelectOption {
        value: format!("asset-bank-{}", current_timestamp_id()?),
        label: label.to_string(),
        color: normalize_color(&bank.color),
    });

    save_select_options(&connection, "asset_banks", &options)?;

    Ok(options)
}

#[tauri::command]
fn update_asset_bank_option(
    app: AppHandle,
    bank: UpdateBankOptionInput,
) -> Result<Vec<SelectOption>, String> {
    let connection = connect(&app)?;
    let mut options = load_select_options(&connection, "asset_banks")?;
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
    save_select_options(&connection, "asset_banks", &options)?;

    Ok(options)
}

#[tauri::command]
fn remove_asset_bank_option(app: AppHandle, value: String) -> Result<Vec<SelectOption>, String> {
    let connection = connect(&app)?;
    let mut options = load_select_options(&connection, "asset_banks")?;

    if is_feature_data_value_used(&connection, "assets_register", "bank", &value)? {
        return Err("This bank is used by asset launches".to_string());
    }

    options.retain(|option| option.value != value);
    save_select_options(&connection, "asset_banks", &options)?;

    Ok(options)
}

#[tauri::command]
fn list_asset_type_options(app: AppHandle) -> Result<Vec<SelectOption>, String> {
    let connection = connect(&app)?;

    load_select_options(&connection, "asset_types")
}

#[tauri::command]
fn add_asset_type_option(app: AppHandle, asset_type: BankOptionInput) -> Result<Vec<SelectOption>, String> {
    let connection = connect(&app)?;
    let mut options = load_select_options(&connection, "asset_types")?;
    let label = asset_type.label.trim();

    if label.is_empty() {
        return Err("Type label is required".to_string());
    }

    options.push(SelectOption {
        value: format!("asset-type-{}", current_timestamp_id()?),
        label: label.to_string(),
        color: normalize_color(&asset_type.color),
    });

    save_select_options(&connection, "asset_types", &options)?;

    Ok(options)
}

#[tauri::command]
fn update_asset_type_option(
    app: AppHandle,
    asset_type: UpdateBankOptionInput,
) -> Result<Vec<SelectOption>, String> {
    let connection = connect(&app)?;
    let mut options = load_select_options(&connection, "asset_types")?;
    let label = asset_type.label.trim();

    if label.is_empty() {
        return Err("Type label is required".to_string());
    }

    let option = options
        .iter_mut()
        .find(|option| option.value == asset_type.value)
        .ok_or_else(|| "Type does not exist".to_string())?;

    option.label = label.to_string();
    option.color = normalize_color(&asset_type.color);
    save_select_options(&connection, "asset_types", &options)?;

    Ok(options)
}

#[tauri::command]
fn remove_asset_type_option(app: AppHandle, value: String) -> Result<Vec<SelectOption>, String> {
    let connection = connect(&app)?;
    let mut options = load_select_options(&connection, "asset_types")?;

    if is_feature_data_value_used(&connection, "asset", "type", &value)? {
        return Err("This type is used by assets".to_string());
    }

    options.retain(|option| option.value != value);
    save_select_options(&connection, "asset_types", &options)?;

    Ok(options)
}

#[tauri::command]
fn list_assets(app: AppHandle) -> Result<Vec<Asset>, String> {
    let connection = connect(&app)?;

    load_assets(&connection)
}

#[tauri::command]
fn add_asset(app: AppHandle, asset: AssetInput) -> Result<(), String> {
    let connection = connect(&app)?;
    let asset_types = load_select_options(&connection, "asset_types")?;
    let ticker = normalize_ticker(&asset.ticker)?;
    let full_name = asset.full_name.trim();
    let color = normalize_color(&asset.color);

    if full_name.is_empty() {
        return Err("Asset full name is required".to_string());
    }

    if !asset_types
        .iter()
        .any(|option| option.value == asset.asset_type)
    {
        return Err("Selected asset type does not exist".to_string());
    }

    if asset_ticker_exists(&connection, &ticker, None)? {
        return Err("Asset ticker already exists".to_string());
    }

    let data = json!({
        "ticker": ticker,
        "type": asset.asset_type,
        "full_name": full_name,
        "color": color
    })
    .to_string();

    connection
        .execute(
            "INSERT INTO features (id, feature, data) VALUES (?1, 'asset', ?2)",
            params![format!("asset-{}", current_timestamp_id()?), data],
        )
        .map_err(|error| error.to_string())?;

    Ok(())
}

#[tauri::command]
fn update_asset(app: AppHandle, asset: UpdateAssetInput) -> Result<(), String> {
    let connection = connect(&app)?;
    let asset_types = load_select_options(&connection, "asset_types")?;
    let ticker = normalize_ticker(&asset.ticker)?;
    let full_name = asset.full_name.trim();
    let color = normalize_color(&asset.color);

    if full_name.is_empty() {
        return Err("Asset full name is required".to_string());
    }

    if !asset_types
        .iter()
        .any(|option| option.value == asset.asset_type)
    {
        return Err("Selected asset type does not exist".to_string());
    }

    if asset_ticker_exists(&connection, &ticker, Some(&asset.id))? {
        return Err("Asset ticker already exists".to_string());
    }

    let data = json!({
        "ticker": ticker,
        "type": asset.asset_type,
        "full_name": full_name,
        "color": color
    })
    .to_string();

    let updated = connection
        .execute(
            "UPDATE features
            SET data = ?1, updated_at = CURRENT_TIMESTAMP
            WHERE feature = 'asset' AND id = ?2",
            params![data, asset.id],
        )
        .map_err(|error| error.to_string())?;

    if updated == 0 {
        return Err("Asset does not exist".to_string());
    }

    Ok(())
}

#[tauri::command]
fn remove_asset(app: AppHandle, id: String) -> Result<(), String> {
    let connection = connect(&app)?;

    if is_feature_data_value_used(&connection, "assets_register", "asset", &id)? {
        return Err("This asset is used by launches".to_string());
    }

    connection
        .execute(
            "DELETE FROM features WHERE feature = 'asset' AND id = ?1",
            params![id],
        )
        .map_err(|error| error.to_string())?;

    Ok(())
}

#[tauri::command]
fn list_asset_registers(app: AppHandle) -> Result<Vec<AssetRegister>, String> {
    let connection = connect(&app)?;
    let assets = load_assets(&connection)?;
    let bank_options = load_select_options(&connection, "asset_banks")?;
    let type_options = load_select_options(&connection, "asset_types")?;
    let mut statement = connection
        .prepare(
            "SELECT id, data, created_at, updated_at
            FROM features
            WHERE feature = 'assets_register'
            ORDER BY json_extract(data, '$.date') DESC, created_at DESC",
        )
        .map_err(|error| error.to_string())?;

    let registers = statement
        .query_map([], |row| {
            let data_json: String = row.get(1)?;
            let data = serde_json::from_str::<AssetRegisterData>(&data_json).map_err(|error| {
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
            let asset = assets.iter().find(|asset| asset.id == data.asset);
            let asset_type = asset.and_then(|asset| {
                type_options
                    .iter()
                    .find(|option| option.value == asset.data.asset_type)
            });

            Ok(AssetRegister {
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
                asset_ticker: asset
                    .map(|asset| asset.data.ticker.clone())
                    .unwrap_or_else(|| data.asset.clone()),
                asset_full_name: asset
                    .map(|asset| asset.data.full_name.clone())
                    .unwrap_or_default(),
                asset_color: asset
                    .map(|asset| asset.data.color.clone())
                    .unwrap_or_else(default_asset_color),
                asset_type: asset
                    .map(|asset| asset.data.asset_type.clone())
                    .unwrap_or_default(),
                asset_type_label: asset_type
                    .map(|option| option.label.clone())
                    .unwrap_or_default(),
                asset_type_color: asset_type
                    .map(|option| option.color.clone())
                    .unwrap_or_else(|| "#4f4749".to_string()),
                data,
            })
        })
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;

    Ok(registers)
}

#[tauri::command]
fn add_asset_register(app: AppHandle, register: AssetRegisterInput) -> Result<(), String> {
    validate_asset_register_type(&register.register_type)?;

    if register.quantity <= 0.0 {
        return Err("Quantity must be greater than zero".to_string());
    }

    if register.price <= 0 {
        return Err("Price must be greater than zero".to_string());
    }

    let connection = connect(&app)?;
    let banks = load_select_options(&connection, "asset_banks")?;
    let assets = load_assets(&connection)?;

    if !banks.iter().any(|option| option.value == register.bank) {
        return Err("Selected bank does not exist".to_string());
    }

    if !assets.iter().any(|asset| asset.id == register.asset) {
        return Err("Selected asset does not exist".to_string());
    }

    let data = json!({
        "type": register.register_type,
        "date": register.date,
        "bank": register.bank,
        "quantity": register.quantity,
        "price": register.price,
        "asset": register.asset
    })
    .to_string();

    connection
        .execute(
            "INSERT INTO features (id, feature, data) VALUES (?1, 'assets_register', ?2)",
            params![format!("assets-register-{}", current_timestamp_id()?), data],
        )
        .map_err(|error| error.to_string())?;

    Ok(())
}

#[tauri::command]
fn list_coin_family_options(app: AppHandle) -> Result<Vec<SelectOption>, String> {
    let connection = connect(&app)?;

    load_select_options(&connection, "coin_families")
}

#[tauri::command]
fn add_coin_family_option(
    app: AppHandle,
    family: BankOptionInput,
) -> Result<Vec<SelectOption>, String> {
    let connection = connect(&app)?;
    let mut options = load_select_options(&connection, "coin_families")?;
    let label = family.label.trim();

    if label.is_empty() {
        return Err("Family label is required".to_string());
    }

    options.push(SelectOption {
        value: format!("coin-family-{}", current_timestamp_id()?),
        label: label.to_string(),
        color: normalize_color(&family.color),
    });

    save_select_options(&connection, "coin_families", &options)?;

    Ok(options)
}

#[tauri::command]
fn update_coin_family_option(
    app: AppHandle,
    family: UpdateBankOptionInput,
) -> Result<Vec<SelectOption>, String> {
    let connection = connect(&app)?;
    let mut options = load_select_options(&connection, "coin_families")?;
    let label = family.label.trim();

    if label.is_empty() {
        return Err("Family label is required".to_string());
    }

    let option = options
        .iter_mut()
        .find(|option| option.value == family.value)
        .ok_or_else(|| "Family does not exist".to_string())?;

    option.label = label.to_string();
    option.color = normalize_color(&family.color);
    save_select_options(&connection, "coin_families", &options)?;

    Ok(options)
}

#[tauri::command]
fn remove_coin_family_option(app: AppHandle, value: String) -> Result<Vec<SelectOption>, String> {
    let connection = connect(&app)?;
    let mut options = load_select_options(&connection, "coin_families")?;

    if is_feature_data_value_used(&connection, "coin", "family", &value)? {
        return Err("This family is used by coins".to_string());
    }

    options.retain(|option| option.value != value);
    save_select_options(&connection, "coin_families", &options)?;

    Ok(options)
}

#[tauri::command]
fn select_coin_image() -> Result<String, String> {
    let selected_file = rfd::FileDialog::new()
        .set_title("Choose a coin image")
        .add_filter("Image", &["png", "jpg", "jpeg", "webp", "gif"])
        .pick_file()
        .ok_or_else(|| "Image selection canceled".to_string())?;

    Ok(selected_file.display().to_string())
}

#[tauri::command]
fn list_coins(app: AppHandle) -> Result<Vec<Coin>, String> {
    let connection = connect(&app)?;

    load_coins(&app, &connection)
}

#[tauri::command]
fn add_coin(app: AppHandle, coin: CoinInput) -> Result<(), String> {
    let connection = connect(&app)?;
    let families = load_select_options(&connection, "coin_families")?;
    let value = coin.value.trim();
    let period = coin.period.trim();
    let numista_id = coin.numista_id.trim();
    let description = coin.description.trim();

    if value.is_empty() {
        return Err("Coin value is required".to_string());
    }

    if period.is_empty() {
        return Err("Coin period is required".to_string());
    }

    if !families.iter().any(|option| option.value == coin.family) {
        return Err("Selected coin family does not exist".to_string());
    }

    let id = format!("coin-{}", current_timestamp_id()?);
    let image_path = match coin.image_source_path {
        Some(path) if !path.trim().is_empty() => copy_coin_image(&app, &id, path.trim())?,
        _ => String::new(),
    };
    let data = json!({
        "value": value,
        "period": period,
        "family": coin.family,
        "numista_id": numista_id,
        "description": description,
        "image_path": image_path,
        "in_collection": coin.in_collection
    })
    .to_string();

    connection
        .execute(
            "INSERT INTO features (id, feature, data) VALUES (?1, 'coin', ?2)",
            params![id, data],
        )
        .map_err(|error| error.to_string())?;

    Ok(())
}

#[tauri::command]
fn update_coin(app: AppHandle, coin: UpdateCoinInput) -> Result<(), String> {
    let connection = connect(&app)?;
    let families = load_select_options(&connection, "coin_families")?;
    let value = coin.value.trim();
    let period = coin.period.trim();
    let numista_id = coin.numista_id.trim();
    let description = coin.description.trim();

    if value.is_empty() {
        return Err("Coin value is required".to_string());
    }

    if period.is_empty() {
        return Err("Coin period is required".to_string());
    }

    if !families.iter().any(|option| option.value == coin.family) {
        return Err("Selected coin family does not exist".to_string());
    }

    let data_json = connection
        .query_row(
            "SELECT data FROM features WHERE feature = 'coin' AND id = ?1",
            params![coin.id],
            |row| row.get::<_, String>(0),
        )
        .map_err(|_| "Coin does not exist".to_string())?;
    let current_data =
        serde_json::from_str::<CoinData>(&data_json).map_err(|error| error.to_string())?;
    let image_path = match coin.image_source_path {
        Some(path) if !path.trim().is_empty() => copy_coin_image(&app, &coin.id, path.trim())?,
        _ => current_data.image_path,
    };
    let data = json!({
        "value": value,
        "period": period,
        "family": coin.family,
        "numista_id": numista_id,
        "description": description,
        "image_path": image_path,
        "in_collection": coin.in_collection
    })
    .to_string();

    connection
        .execute(
            "UPDATE features
            SET data = ?1, updated_at = CURRENT_TIMESTAMP
            WHERE feature = 'coin' AND id = ?2",
            params![data, coin.id],
        )
        .map_err(|error| error.to_string())?;

    Ok(())
}

#[tauri::command]
fn update_coin_collection(
    app: AppHandle,
    update: UpdateCoinCollectionInput,
) -> Result<(), String> {
    let connection = connect(&app)?;
    let data_json = connection
        .query_row(
            "SELECT data FROM features WHERE feature = 'coin' AND id = ?1",
            params![update.id],
            |row| row.get::<_, String>(0),
        )
        .map_err(|_| "Coin does not exist".to_string())?;
    let mut data = serde_json::from_str::<CoinData>(&data_json).map_err(|error| error.to_string())?;

    data.in_collection = update.in_collection;

    let updated_data = serde_json::to_string(&data).map_err(|error| error.to_string())?;
    connection
        .execute(
            "UPDATE features
            SET data = ?1, updated_at = CURRENT_TIMESTAMP
            WHERE feature = 'coin' AND id = ?2",
            params![updated_data, update.id],
        )
        .map_err(|error| error.to_string())?;

    Ok(())
}

#[tauri::command]
fn list_reminders(app: AppHandle) -> Result<Vec<Reminder>, String> {
    let connection = connect(&app)?;

    load_reminders(&connection)
}

#[tauri::command]
fn add_reminder(app: AppHandle, reminder: ReminderInput) -> Result<(), String> {
    let connection = connect(&app)?;
    let title = reminder.title.trim();
    let start_date = reminder.start_date.trim();
    validate_reminder_frequency(&reminder.frequency)?;
    validate_date_value(start_date)?;

    if title.is_empty() {
        return Err("Reminder title is required".to_string());
    }

    let data = json!({
        "title": title,
        "frequency": reminder.frequency,
        "start_date": start_date,
        "last_done_date": null
    })
    .to_string();

    connection
        .execute(
            "INSERT INTO features (id, feature, data) VALUES (?1, 'reminder', ?2)",
            params![format!("reminder-{}", current_timestamp_id()?), data],
        )
        .map_err(|error| error.to_string())?;

    Ok(())
}

#[tauri::command]
fn update_reminder(app: AppHandle, reminder: UpdateReminderInput) -> Result<(), String> {
    let connection = connect(&app)?;
    let title = reminder.title.trim();
    let start_date = reminder.start_date.trim();
    validate_reminder_frequency(&reminder.frequency)?;
    validate_date_value(start_date)?;

    if title.is_empty() {
        return Err("Reminder title is required".to_string());
    }

    let data = json!({
        "title": title,
        "frequency": reminder.frequency,
        "start_date": start_date,
        "last_done_date": reminder.last_done_date
    })
    .to_string();
    let updated = connection
        .execute(
            "UPDATE features
            SET data = ?1, updated_at = CURRENT_TIMESTAMP
            WHERE feature = 'reminder' AND id = ?2",
            params![data, reminder.id],
        )
        .map_err(|error| error.to_string())?;

    if updated == 0 {
        return Err("Reminder does not exist".to_string());
    }

    Ok(())
}

#[tauri::command]
fn complete_reminder(app: AppHandle, id: String) -> Result<(), String> {
    let connection = connect(&app)?;
    let data_json = connection
        .query_row(
            "SELECT data FROM features WHERE feature = 'reminder' AND id = ?1",
            params![id],
            |row| row.get::<_, String>(0),
        )
        .map_err(|_| "Reminder does not exist".to_string())?;
    let mut data =
        serde_json::from_str::<ReminderData>(&data_json).map_err(|error| error.to_string())?;
    data.last_done_date = Some(current_timestamp_seconds()?);
    let updated_data = serde_json::to_string(&data).map_err(|error| error.to_string())?;

    connection
        .execute(
            "UPDATE features
            SET data = ?1, updated_at = CURRENT_TIMESTAMP
            WHERE feature = 'reminder' AND id = ?2",
            params![updated_data, id],
        )
        .map_err(|error| error.to_string())?;

    Ok(())
}

#[tauri::command]
fn remove_reminder(app: AppHandle, id: String) -> Result<(), String> {
    let connection = connect(&app)?;

    connection
        .execute(
            "DELETE FROM features WHERE feature = 'reminder' AND id = ?1",
            params![id],
        )
        .map_err(|error| error.to_string())?;

    Ok(())
}

#[tauri::command]
fn list_warehouse_box_options(app: AppHandle) -> Result<Vec<SelectOption>, String> {
    let connection = connect(&app)?;

    load_select_options(&connection, "warehouse_boxes")
}

#[tauri::command]
fn add_warehouse_box_option(
    app: AppHandle,
    box_option: BankOptionInput,
) -> Result<Vec<SelectOption>, String> {
    let connection = connect(&app)?;
    let mut options = load_select_options(&connection, "warehouse_boxes")?;
    let label = box_option.label.trim();

    if label.is_empty() {
        return Err("Box label is required".to_string());
    }

    options.push(SelectOption {
        value: format!("warehouse-box-{}", current_timestamp_id()?),
        label: label.to_string(),
        color: normalize_color(&box_option.color),
    });

    save_select_options(&connection, "warehouse_boxes", &options)?;

    Ok(options)
}

#[tauri::command]
fn update_warehouse_box_option(
    app: AppHandle,
    box_option: UpdateBankOptionInput,
) -> Result<Vec<SelectOption>, String> {
    let connection = connect(&app)?;
    let mut options = load_select_options(&connection, "warehouse_boxes")?;
    let label = box_option.label.trim();

    if label.is_empty() {
        return Err("Box label is required".to_string());
    }

    let option = options
        .iter_mut()
        .find(|option| option.value == box_option.value)
        .ok_or_else(|| "Box does not exist".to_string())?;

    option.label = label.to_string();
    option.color = normalize_color(&box_option.color);
    save_select_options(&connection, "warehouse_boxes", &options)?;

    Ok(options)
}

#[tauri::command]
fn remove_warehouse_box_option(app: AppHandle, value: String) -> Result<Vec<SelectOption>, String> {
    let connection = connect(&app)?;
    let mut options = load_select_options(&connection, "warehouse_boxes")?;

    if is_feature_data_value_used(&connection, "warehouse_item", "box_id", &value)? {
        return Err("This box is used by warehouse items".to_string());
    }

    options.retain(|option| option.value != value);
    save_select_options(&connection, "warehouse_boxes", &options)?;

    Ok(options)
}

#[tauri::command]
fn list_warehouse_items(app: AppHandle) -> Result<Vec<WarehouseItem>, String> {
    let connection = connect(&app)?;

    load_warehouse_items(&connection)
}

#[tauri::command]
fn add_warehouse_item(app: AppHandle, item: WarehouseItemInput) -> Result<(), String> {
    let connection = connect(&app)?;
    let boxes = load_select_options(&connection, "warehouse_boxes")?;
    let description = item.description.trim();

    if description.is_empty() {
        return Err("Item description is required".to_string());
    }

    if !boxes.iter().any(|option| option.value == item.box_id) {
        return Err("Selected box does not exist".to_string());
    }

    let data = json!({
        "description": description,
        "box_id": item.box_id
    })
    .to_string();

    connection
        .execute(
            "INSERT INTO features (id, feature, data) VALUES (?1, 'warehouse_item', ?2)",
            params![format!("warehouse-item-{}", current_timestamp_id()?), data],
        )
        .map_err(|error| error.to_string())?;

    Ok(())
}

#[tauri::command]
fn update_warehouse_item(app: AppHandle, item: UpdateWarehouseItemInput) -> Result<(), String> {
    let connection = connect(&app)?;
    let boxes = load_select_options(&connection, "warehouse_boxes")?;
    let description = item.description.trim();

    if description.is_empty() {
        return Err("Item description is required".to_string());
    }

    if !boxes.iter().any(|option| option.value == item.box_id) {
        return Err("Selected box does not exist".to_string());
    }

    let data = json!({
        "description": description,
        "box_id": item.box_id
    })
    .to_string();
    let updated = connection
        .execute(
            "UPDATE features
            SET data = ?1, updated_at = CURRENT_TIMESTAMP
            WHERE feature = 'warehouse_item' AND id = ?2",
            params![data, item.id],
        )
        .map_err(|error| error.to_string())?;

    if updated == 0 {
        return Err("Warehouse item does not exist".to_string());
    }

    Ok(())
}

#[tauri::command]
fn remove_warehouse_item(app: AppHandle, id: String) -> Result<(), String> {
    let connection = connect(&app)?;

    connection
        .execute(
            "DELETE FROM features WHERE feature = 'warehouse_item' AND id = ?1",
            params![id],
        )
        .map_err(|error| error.to_string())?;

    Ok(())
}

fn validate_entry_type(entry_type: &str) -> Result<(), String> {
    match entry_type {
        "income" | "expense" | "investment" => Ok(()),
        _ => Err("Invalid financial entry type".to_string()),
    }
}

fn validate_reminder_frequency(frequency: &str) -> Result<(), String> {
    match frequency {
        "daily" | "weekly" | "monthly" | "quarterly" | "yearly" => Ok(()),
        _ => Err("Invalid reminder frequency".to_string()),
    }
}

fn validate_date_value(date: &str) -> Result<(), String> {
    let parts = date.split('-').collect::<Vec<_>>();

    if parts.len() == 3
        && parts[0].len() == 4
        && parts[1].len() == 2
        && parts[2].len() == 2
        && parts.iter().all(|part| part.chars().all(|character| character.is_ascii_digit()))
    {
        Ok(())
    } else {
        Err("Date must use YYYY-MM-DD format".to_string())
    }
}

fn load_bank_options(connection: &Connection) -> Result<Vec<SelectOption>, String> {
    load_select_options(connection, "banks")
}

fn save_bank_options(connection: &Connection, options: &[SelectOption]) -> Result<(), String> {
    save_select_options(connection, "banks", options)
}

fn load_select_options(connection: &Connection, id: &str) -> Result<Vec<SelectOption>, String> {
    let options_json = connection
        .query_row(
            "SELECT options FROM selects WHERE id = ?1",
            params![id],
            |row| row.get::<_, String>(0),
        )
        .map_err(|error| error.to_string())?;

    serde_json::from_str(&options_json).map_err(|error| error.to_string())
}

fn save_select_options(
    connection: &Connection,
    id: &str,
    options: &[SelectOption],
) -> Result<(), String> {
    let options_json = serde_json::to_string(options).map_err(|error| error.to_string())?;

    connection
        .execute(
            "UPDATE selects
            SET options = ?1, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?2",
            params![options_json, id],
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

fn is_feature_data_value_used(
    connection: &Connection,
    feature: &str,
    key: &str,
    value: &str,
) -> Result<bool, String> {
    let used = connection
        .query_row(
            &format!(
                "SELECT EXISTS (
                    SELECT 1 FROM features
                    WHERE feature = ?1
                    AND json_extract(data, '$.{key}') = ?2
                )"
            ),
            params![feature, value],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|error| error.to_string())?;

    Ok(used == 1)
}

fn load_assets(connection: &Connection) -> Result<Vec<Asset>, String> {
    let type_options = load_select_options(connection, "asset_types")?;
    let mut statement = connection
        .prepare(
            "SELECT id, data, created_at, updated_at
            FROM features
            WHERE feature = 'asset'
            ORDER BY json_extract(data, '$.ticker') ASC",
        )
        .map_err(|error| error.to_string())?;

    let assets = statement
        .query_map([], |row| {
            let data_json: String = row.get(1)?;
            let data = serde_json::from_str::<AssetData>(&data_json).map_err(|error| {
                rusqlite::Error::FromSqlConversionFailure(
                    1,
                    rusqlite::types::Type::Text,
                    Box::new(error),
                )
            })?;
            let asset_type = type_options
                .iter()
                .find(|option| option.value == data.asset_type)
                .cloned();

            Ok(Asset {
                id: row.get(0)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
                type_label: asset_type
                    .as_ref()
                    .map(|option| option.label.clone())
                    .unwrap_or_else(|| data.asset_type.clone()),
                type_color: asset_type
                    .as_ref()
                    .map(|option| option.color.clone())
                    .unwrap_or_else(|| "#4f4749".to_string()),
                data,
            })
        })
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;

    Ok(assets)
}

fn load_coins(app: &AppHandle, connection: &Connection) -> Result<Vec<Coin>, String> {
    let families = load_select_options(connection, "coin_families")?;
    let image_root = images_dir(app)?;
    let mut statement = connection
        .prepare(
            "SELECT id, data, created_at, updated_at
            FROM features
            WHERE feature = 'coin'
            ORDER BY json_extract(data, '$.period') ASC, json_extract(data, '$.value') ASC",
        )
        .map_err(|error| error.to_string())?;

    let coins = statement
        .query_map([], |row| {
            let data_json: String = row.get(1)?;
            let data = serde_json::from_str::<CoinData>(&data_json).map_err(|error| {
                rusqlite::Error::FromSqlConversionFailure(
                    1,
                    rusqlite::types::Type::Text,
                    Box::new(error),
                )
            })?;
            let family = families
                .iter()
                .find(|option| option.value == data.family)
                .cloned();
            let image_src = if data.image_path.is_empty() {
                String::new()
            } else {
                coin_image_data_url(&image_root.join(&data.image_path)).unwrap_or_default()
            };

            Ok(Coin {
                id: row.get(0)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
                family_label: family
                    .as_ref()
                    .map(|option| option.label.clone())
                    .unwrap_or_else(|| data.family.clone()),
                family_color: family
                    .as_ref()
                    .map(|option| option.color.clone())
                    .unwrap_or_else(|| "#4f4749".to_string()),
                image_src,
                data,
            })
        })
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;

    Ok(coins)
}

fn load_reminders(connection: &Connection) -> Result<Vec<Reminder>, String> {
    let mut statement = connection
        .prepare(
            "SELECT id, data, created_at, updated_at
            FROM features
            WHERE feature = 'reminder'
            ORDER BY updated_at DESC",
        )
        .map_err(|error| error.to_string())?;

    let reminders = statement
        .query_map([], |row| {
            let data_json: String = row.get(1)?;
            let data = serde_json::from_str::<ReminderData>(&data_json).map_err(|error| {
                rusqlite::Error::FromSqlConversionFailure(
                    1,
                    rusqlite::types::Type::Text,
                    Box::new(error),
                )
            })?;

            Ok(Reminder {
                id: row.get(0)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
                data,
            })
        })
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;

    Ok(reminders)
}

fn load_warehouse_items(connection: &Connection) -> Result<Vec<WarehouseItem>, String> {
    let boxes = load_select_options(connection, "warehouse_boxes")?;
    let mut statement = connection
        .prepare(
            "SELECT id, data, created_at, updated_at
            FROM features
            WHERE feature = 'warehouse_item'
            ORDER BY updated_at DESC",
        )
        .map_err(|error| error.to_string())?;

    let items = statement
        .query_map([], |row| {
            let data_json: String = row.get(1)?;
            let data = serde_json::from_str::<WarehouseItemData>(&data_json).map_err(|error| {
                rusqlite::Error::FromSqlConversionFailure(
                    1,
                    rusqlite::types::Type::Text,
                    Box::new(error),
                )
            })?;
            let box_option = boxes
                .iter()
                .find(|option| option.value == data.box_id)
                .cloned();

            Ok(WarehouseItem {
                id: row.get(0)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
                box_label: box_option
                    .as_ref()
                    .map(|option| option.label.clone())
                    .unwrap_or_else(|| data.box_id.clone()),
                box_color: box_option
                    .as_ref()
                    .map(|option| option.color.clone())
                    .unwrap_or_else(|| "#4f4749".to_string()),
                data,
            })
        })
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;

    Ok(items)
}

fn asset_ticker_exists(
    connection: &Connection,
    ticker: &str,
    except_id: Option<&str>,
) -> Result<bool, String> {
    let used = connection
        .query_row(
            "SELECT EXISTS (
                SELECT 1 FROM features
                WHERE feature = 'asset'
                AND upper(json_extract(data, '$.ticker')) = ?1
                AND (?2 IS NULL OR id != ?2)
            )",
            params![ticker, except_id],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|error| error.to_string())?;

    Ok(used == 1)
}

fn normalize_ticker(ticker: &str) -> Result<String, String> {
    let ticker = ticker.trim().to_uppercase();

    if ticker.is_empty() {
        return Err("Ticker is required".to_string());
    }

    Ok(ticker)
}

fn validate_asset_register_type(register_type: &str) -> Result<(), String> {
    match register_type {
        "dividend" | "buy" | "sell" => Ok(()),
        _ => Err("Invalid asset launch type".to_string()),
    }
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
            list_asset_bank_options,
            add_asset_bank_option,
            update_asset_bank_option,
            remove_asset_bank_option,
            list_asset_type_options,
            add_asset_type_option,
            update_asset_type_option,
            remove_asset_type_option,
            list_coin_family_options,
            add_coin_family_option,
            update_coin_family_option,
            remove_coin_family_option,
            select_coin_image,
            list_coins,
            add_coin,
            update_coin,
            update_coin_collection,
            list_reminders,
            add_reminder,
            update_reminder,
            complete_reminder,
            remove_reminder,
            list_warehouse_box_options,
            add_warehouse_box_option,
            update_warehouse_box_option,
            remove_warehouse_box_option,
            list_warehouse_items,
            add_warehouse_item,
            update_warehouse_item,
            remove_warehouse_item,
            list_assets,
            add_asset,
            update_asset,
            remove_asset,
            list_asset_registers,
            add_asset_register,
            export_backup,
            restore_backup
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
