import type { Note } from "../types";

type NoteListProps = {
  notes: Note[];
};

function NoteList({ notes }: NoteListProps) {
  if (notes.length === 0) {
    return (
      <p className="m-0 rounded-lg border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
        No notes yet.
      </p>
    );
  }

  return (
    <ul className="grid list-none gap-2 p-0">
      {notes.map(note => (
        <li
          className="rounded-lg border border-border bg-card p-3 text-left text-card-foreground shadow-sm"
          key={note.id}
        >
          {note.body}
        </li>
      ))}
    </ul>
  );
}

export default NoteList;
