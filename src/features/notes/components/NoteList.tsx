import { Copy, Download, Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import type { Note } from "../types";

type NoteListProps = {
  notes: Note[];
  onCopy: (note: Note) => void;
  onEdit: (note: Note) => void;
  onRemove: (id: number) => void;
};

function NoteList({ notes, onCopy, onEdit, onRemove }: NoteListProps) {
  if (notes.length === 0) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-md border border-dashed border-border bg-card text-xs text-muted-foreground">No notes found.</div>
    );
  }

  return (
    <div className="grid gap-3">
      {notes.map(note => (
        <article className="flex items-start justify-between gap-4 rounded-md border border-border bg-card p-3" key={note.id}>
          <div className="grid min-w-0 flex-1 gap-3">
            {note.body && <p className="whitespace-pre-wrap text-sm text-card-foreground">{note.body}</p>}
            {note.images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {note.images.map((image, index) => (
                  <img alt={`Note attachment ${index + 1}`} className="max-h-48 max-w-64 rounded-md border border-border object-contain" key={`${note.id}-${index}`} src={image} />
                ))}
              </div>
            )}
            {note.files.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {note.files.map((file, index) => (
                  <a className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs transition hover:bg-accent" download={file.name} href={file.data} key={`${note.id}-${file.name}-${index}`}>
                    <Download aria-hidden="true" className="size-4" />
                    {file.name}
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <NoteAction label="Copy note" onClick={() => onCopy(note)}><Copy className="size-4" /></NoteAction>
            <NoteAction label="Edit note" onClick={() => onEdit(note)}><Pencil className="size-4" /></NoteAction>
            <NoteAction destructive label="Remove note" onClick={() => onRemove(note.id)}><Trash2 className="size-4" /></NoteAction>
          </div>
        </article>
      ))}
    </div>
  );
}

function NoteAction({ children, destructive, label, onClick }: { children: ReactNode; destructive?: boolean; label: string; onClick: () => void }) {
  return <button aria-label={label} className={`flex size-9 items-center justify-center rounded-md border border-border transition hover:bg-accent${destructive ? " text-destructive" : ""}`} onClick={onClick} type="button">{children}</button>;
}

export default NoteList;
