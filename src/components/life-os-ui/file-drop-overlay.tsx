import { Upload } from "lucide-react";
import { useState, type DragEvent, type ReactNode } from "react";

type FileDropOverlayProps = {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onDrop: (files: File[]) => void;
};

export function FileDropOverlay({ children, disabled, label, onDrop }: FileDropOverlayProps) {
  const [isDragging, setIsDragging] = useState(false);

  function hasFiles(event: DragEvent) {
    return event.dataTransfer.types.includes("Files");
  }

  return (
    <div
      className="contents"
      onDragEnter={(event) => {
        if (disabled || !hasFiles(event)) return;
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsDragging(false);
      }}
      onDragOver={(event) => {
        if (!disabled && hasFiles(event)) event.preventDefault();
      }}
      onDrop={(event) => {
        setIsDragging(false);
        if (disabled || event.defaultPrevented || !event.dataTransfer.files.length) return;
        event.preventDefault();
        onDrop(Array.from(event.dataTransfer.files));
      }}
    >
      {children}
      {isDragging && (
        <div className="pointer-events-none fixed inset-0 z-100 flex items-center justify-center border-2 border-dashed border-primary bg-background/90">
          <div className="flex items-center gap-3 text-sm font-medium text-foreground">
            <Upload aria-hidden="true" className="size-5 text-primary" />
            {label}
          </div>
        </div>
      )}
    </div>
  );
}
