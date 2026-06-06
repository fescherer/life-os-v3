type BackupActionsProps = {
  onExport: () => void;
  onRestore: () => void;
};

function BackupActions({ onExport, onRestore }: BackupActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        className="rounded-lg border border-primary bg-primary px-4 py-2 font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 active:bg-primary/80"
        onClick={onExport}
        type="button"
      >
        Export Backup
      </button>
      <button
        className="rounded-lg border border-border bg-secondary px-4 py-2 font-medium text-secondary-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground active:bg-muted"
        onClick={onRestore}
        type="button"
      >
        Restore Backup
      </button>
    </div>
  );
}

export default BackupActions;
