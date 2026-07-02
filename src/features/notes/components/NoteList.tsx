import { Copy, Pencil, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { LifeOSModal } from "../../../components/life-os-ui/modal";
import { getImageDownloadName } from "../attachments";
import type { Note } from "../types";
import AttachmentDownload from "./AttachmentDownload";

type NoteListProps = {
  notes: Note[];
  onCopy: (note: Note) => void;
  onEdit: (note: Note) => void;
  onRemove: (id: number) => Promise<void>;
};

function NoteList({ notes, onCopy, onEdit, onRemove }: NoteListProps) {
  const [noteToRemove, setNoteToRemove] = useState<number | null>(null);

  if (notes.length === 0) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-md border border-dashed border-border bg-card text-xs text-muted-foreground">No notes found.</div>
    );
  }

  return (
    <>
      <div className="grid gap-3">
        {notes.map(note => (
          <article className="flex items-start justify-between gap-4 rounded-md border border-border bg-card p-3" key={note.id}>
            <div className="grid min-w-0 flex-1 gap-3">
              {note.body && <p className="whitespace-pre-wrap text-sm text-card-foreground">{note.body}</p>}
              {note.images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {note.images.map((image, index) => (
                    <div className="group relative" key={`${note.id}-${index}`}>
                      <img alt={`Note attachment ${index + 1}`} className="max-h-48 max-w-64 rounded-md border border-border object-contain" src={image} />
                      <AttachmentDownload className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-md bg-background/90 opacity-0 transition hover:bg-accent focus:opacity-100 group-hover:opacity-100" data={image} fileName={getImageDownloadName(image, index)} label={`Download image ${index + 1}`} />
                    </div>
                  ))}
                </div>
              )}
              {note.files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {note.files.map((file, index) => (
                    <AttachmentDownload className="relative flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs transition hover:bg-accent" data={file.data} fileName={file.name} key={`${note.id}-${file.name}-${index}`} label={`Download ${file.name}`}>
                      {file.name}
                    </AttachmentDownload>
                  ))}
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <NoteAction label="Copy note" onClick={() => onCopy(note)}><Copy className="size-4" /></NoteAction>
              <NoteAction label="Edit note" onClick={() => onEdit(note)}><Pencil className="size-4" /></NoteAction>
              <NoteAction destructive label="Remove note" onClick={() => setNoteToRemove(note.id)}><Trash2 className="size-4" /></NoteAction>
            </div>
          </article>
        ))}
      </div>
      {noteToRemove !== null && (
        <LifeOSModal onClose={() => setNoteToRemove(null)} title="Delete note">
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this note?</p>
          <div className="flex justify-end gap-2">
            <button className="h-9 rounded-md border border-border px-4 text-sm transition hover:bg-accent" onClick={() => setNoteToRemove(null)} type="button">Cancel</button>
            <button
              className="h-9 rounded-md bg-destructive px-4 text-sm text-destructive-foreground transition hover:bg-destructive/90"
              onClick={async () => {
                await onRemove(noteToRemove);
                setNoteToRemove(null);
              }}
              type="button"
            >
              Delete
            </button>
          </div>
        </LifeOSModal>
      )}
    </>
  );
}

function NoteAction({ children, destructive, label, onClick }: { children: ReactNode; destructive?: boolean; label: string; onClick: () => void }) {
  return <button aria-label={label} className={`flex size-9 items-center justify-center rounded-md border border-border transition hover:bg-accent${destructive ? " text-destructive" : ""}`} onClick={onClick} type="button">{children}</button>;
}

export default NoteList;
