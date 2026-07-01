import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import BackupActions from "./components/BackupActions";

const backupFeatures = [
  { id: "notes", label: "Notes" },
  { id: "habits", label: "Habits" },
  { id: "financial", label: "Financial" },
  { id: "assets", label: "Assets" },
  { id: "coin-collection", label: "Coin Collection" },
  { id: "packaging", label: "Packaging" },
  { id: "reminders", label: "Reminders" },
  { id: "reviews", label: "Reviews" },
  { id: "warehouse", label: "Warehouse" },
];

function BackupFeature() {
  const [selectedFeatures, setSelectedFeatures] = useState(backupFeatures.map(({ id }) => id));

  function toggleFeature(featureId: string) {
    setSelectedFeatures(currentFeatures => currentFeatures.includes(featureId)
      ? currentFeatures.filter(id => id !== featureId)
      : [...currentFeatures, featureId]);
  }

  async function exportBackup() {
    try {
      const backupPath = await invoke<string>("export_backup", { features: selectedFeatures });
      toast.success(`Backup exported to ${backupPath}`);
    }
    catch (error) {
      toast.error(String(error));
    }
  }

  async function importBackup() {
    try {
      const backupPath = await invoke<string>("restore_backup", { features: selectedFeatures });
      toast.success(`Data imported from ${backupPath}. Reopen a page to refresh its data.`);
    }
    catch (error) {
      toast.error(String(error));
    }
  }

  return (
    <section className="flex max-w-3xl flex-col gap-4 rounded-lg border border-border bg-card p-5">

      <BackupActions
        features={backupFeatures}
        onExport={exportBackup}
        onRestore={importBackup}
        onToggleFeature={toggleFeature}
        selectedFeatures={selectedFeatures}
      />

    </section>
  );
}

export default BackupFeature;
