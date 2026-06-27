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

  async function importBackup() {
    try {
      const backupPath = await invoke<string>("restore_backup");
      setBackupStatus(`Data imported from ${backupPath}. Reopen a page to refresh its data.`);
    }
    catch (error) {
      setBackupStatus(String(error));
    }
  }

  return (
    <section className="flex max-w-3xl flex-col gap-4 rounded-lg border border-border bg-card p-5">
      <div>
        <h2 className="text-base font-semibold leading-tight">Your data</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Export every feature and image as a ZIP, or import a previous Life OS backup.
          The ZIP also includes a readable SQL file.
        </p>
      </div>

      <BackupActions onExport={exportBackup} onRestore={importBackup} />

      {backupStatus && (
        <p className="m-0 rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
          {backupStatus}
        </p>
      )}
    </section>
  );
}

export default BackupFeature;
