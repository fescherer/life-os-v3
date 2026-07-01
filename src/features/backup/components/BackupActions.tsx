import { useState } from "react";
import { LifeOSModal } from "../../../components/life-os-ui/modal";

type BackupActionsProps = {
  features: Array<{ id: string; label: string }>;
  onExport: () => void;
  onRestore: () => void;
  onToggleFeature: (featureId: string) => void;
  selectedFeatures: string[];
};

function BackupActions({ features, onExport, onRestore, onToggleFeature, selectedFeatures }: BackupActionsProps) {
  const [activeAction, setActiveAction] = useState<"export" | "import" | null>(null);
  const hasSelectedFeatures = selectedFeatures.length > 0;

  function confirmAction() {
    if (activeAction === "export") {
      onExport();
    }
    else if (activeAction === "import") {
      onRestore();
    }

    setActiveAction(null);
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-lg border border-primary bg-primary px-4 py-2 font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 active:bg-primary/80"
          onClick={() => setActiveAction("export")}
          type="button"
        >
          Export Data
        </button>
        <button
          className="rounded-lg border border-border bg-secondary px-4 py-2 font-medium text-secondary-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground active:bg-muted"
          onClick={() => setActiveAction("import")}
          type="button"
        >
          Import Data
        </button>
      </div>

      {activeAction && (
        <LifeOSModal
          onClose={() => setActiveAction(null)}
          title={activeAction === "export" ? "Export data" : "Import data"}
        >
          <p className="text-sm text-muted-foreground">
            {`Select the features you want to ${activeAction}.`}
          </p>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {features.map(feature => (
              <label className="flex items-center gap-2 text-sm" key={feature.id}>
                <input
                  checked={selectedFeatures.includes(feature.id)}
                  className="size-4 accent-primary"
                  onChange={() => onToggleFeature(feature.id)}
                  type="checkbox"
                />
                {feature.label}
              </label>
            ))}
          </div>

          <button
            className="rounded-lg border border-primary bg-primary px-4 py-2 font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 active:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!hasSelectedFeatures}
            onClick={confirmAction}
            type="button"
          >
            {activeAction === "export" ? "Export Data" : "Import Data"}
          </button>
        </LifeOSModal>
      )}
    </>
  );
}

export default BackupActions;
