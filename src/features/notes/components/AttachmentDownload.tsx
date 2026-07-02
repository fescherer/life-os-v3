import { invoke } from "@tauri-apps/api/core";
import { Download } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

type AttachmentDownloadProps = {
  children?: ReactNode;
  className: string;
  data: string;
  fileName: string;
  label: string;
};

function AttachmentDownload({ children, className, data, fileName, label }: AttachmentDownloadProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function download() {
    try {
      setIsDownloading(true);
      const encodedData = data.slice(data.indexOf(",") + 1);
      const bytes = Array.from(atob(encodedData), character => character.charCodeAt(0));
      const savedPath = await invoke<string | null>("save_note_attachment", { data: bytes, fileName });

      if (savedPath) toast.success(`Saved to ${savedPath}`);
    }
    catch (error) {
      toast.error(String(error));
    }
    finally {
      setIsDownloading(false);
    }
  }

  return (
    <button aria-label={label} className={`${className} overflow-hidden`} disabled={isDownloading} onClick={download} type="button">
      <Download aria-hidden="true" className="size-4 shrink-0" />
      {children}
      {isDownloading && <span className="absolute inset-x-0 bottom-0 h-1 animate-pulse bg-primary" />}
    </button>
  );
}

export default AttachmentDownload;
