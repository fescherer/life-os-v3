import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import BackupActions from "./components/BackupActions";

function BackupFeature() {
  const [backupStatus, setBackupStatus] = useState("");

  async function exportBackup() {
    try {
      const backupPath = await invoke<string>("export_backup");
      setBackupStatus(`Backup exported to ${backupPath}`);
    }
    catch (error) {
      setBackupStatus(String(error));
    }
  }

  async function restoreBackup() {
    try {
      const backupPath = await invoke<string>("restore_backup");
      setBackupStatus(`Backup restored from ${backupPath}`);
    }
    catch (error) {
      setBackupStatus(String(error));
    }
  }

  return (
    <section className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold leading-tight">Backup</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Export or restore the SQLite database and app images folder.
        </p>
      </div>

      <BackupActions onExport={exportBackup} onRestore={restoreBackup} />

      {backupStatus && (
        <p className="m-0 rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
          {backupStatus}
        </p>
      )}
    </section>
  );
}

export default BackupFeature;
