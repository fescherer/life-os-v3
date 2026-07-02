import { BadgePlus, File, Paperclip, Save, X } from "lucide-react";
import { useState } from "react";
import { readFile, readImage } from "../attachments";
import type { NoteFile } from "../types";

type NoteFormProps = {
  body: string;
  files: NoteFile[];
  images: string[];
  isEditing?: boolean;
  onBodyChange: (body: string) => void;
  onCancel: () => void;
  onFilesChange: (files: NoteFile[]) => void;
  onImagesChange: (images: string[]) => void;
  onSubmit: () => void;
};

function NoteForm({ body, files, images, isEditing, onBodyChange, onCancel, onFilesChange, onImagesChange, onSubmit }: NoteFormProps) {
  const [isDragging, setIsDragging] = useState(false);

  async function addImages(files: File[]) {
    const imageFiles = files.filter(file => file.type.startsWith("image/"));
    const newImages = await Promise.all(imageFiles.map(readImage));
    onImagesChange([...images, ...newImages]);
  }

  async function addFiles(selectedFiles: File[]) {
    const newFiles = await Promise.all(selectedFiles.map(readFile));
    onFilesChange([...files, ...newFiles]);
  }

  function addAttachments(selectedFiles: File[]) {
    addImages(selectedFiles.filter(file => file.type.startsWith("image/")));
    addFiles(selectedFiles.filter(file => !file.type.startsWith("image/")));
  }

  return (
    <form
      className="grid gap-7"
      onPaste={(event) => {
        const files = Array.from(event.clipboardData.files);

        if (files.length > 0) {
          event.preventDefault();
          addAttachments(files);
        }
      }}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="grid gap-2 text-sm text-muted-foreground">
        <span>Note</span>
        <textarea autoFocus className="min-h-36 resize-y rounded-md border border-border bg-card p-3 text-xs text-foreground outline-none focus:border-ring" onChange={event => onBodyChange(event.currentTarget.value)} placeholder="Write a note..." value={body} />
      </label>

      <div
        className={[
          "grid gap-3 rounded-md border border-dashed p-3 transition",
          isDragging ? "border-primary bg-accent" : "border-transparent",
        ].join(" ")}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setIsDragging(false);
          }
        }}
        onDragOver={event => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          addAttachments(Array.from(event.dataTransfer.files));
        }}
      >
        <label className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground">
          <Paperclip aria-hidden="true" className="size-4" />
          Attach files
          <input
            className="hidden"
            multiple
            onChange={(event) => {
              addAttachments(Array.from(event.currentTarget.files ?? []));
              event.currentTarget.value = "";
            }}
            type="file"
          />
        </label>

        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {images.map((image, index) => (
              <div className="group relative overflow-hidden rounded-md border border-border bg-card" key={`${image.slice(-20)}-${index}`}>
                <img alt={`Note attachment ${index + 1}`} className="h-28 w-full object-cover" src={image} />
                <button
                  aria-label={`Remove attachment ${index + 1}`}
                  className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-md bg-background/90 text-destructive opacity-0 transition group-hover:opacity-100"
                  onClick={() => onImagesChange(images.filter((_, imageIndex) => imageIndex !== index))}
                  type="button"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {files.length > 0 && (
          <div className="grid gap-2">
            {files.map((file, index) => (
              <div className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2 text-xs" key={`${file.name}-${index}`}>
                <File aria-hidden="true" className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                <button
                  aria-label={`Remove ${file.name}`}
                  className="text-destructive"
                  onClick={() => onFilesChange(files.filter((_, fileIndex) => fileIndex !== index))}
                  type="button"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-4">
        <button className="text-sm text-muted-foreground transition hover:text-foreground" onClick={onCancel} type="button">Cancel</button>
        <button className="flex h-9 min-w-36 items-center justify-center gap-3 rounded-md bg-primary px-4 text-sm text-primary-foreground transition hover:bg-primary/90" type="submit">
          {isEditing ? <Save aria-hidden="true" className="size-5" /> : <BadgePlus aria-hidden="true" className="size-5" />}
          {isEditing ? "Save note" : "Add note"}
        </button>
      </div>
    </form>
  );
}

export default NoteForm;
