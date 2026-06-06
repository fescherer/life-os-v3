import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import NoteForm from "./components/NoteForm";
import NoteList from "./components/NoteList";
import type { Note } from "./types";

function NotesFeature() {
  const [body, setBody] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);

  async function loadNotes() {
    setNotes(await invoke<Note[]>("list_notes"));
  }

  async function addNote() {
    const trimmedBody = body.trim();

    if (!trimmedBody) {
      return;
    }

    await invoke("add_note", { body: trimmedBody });
    setBody("");
    await loadNotes();
  }

  useEffect(() => {
    invoke<Note[]>("list_notes").then(setNotes).catch(console.error);
  }, []);

  return (
    <section className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold leading-tight">Notes</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Quick SQLite-backed notes for the app foundation.
        </p>
      </div>

      <NoteForm body={body} onBodyChange={setBody} onSubmit={addNote} />
      <NoteList notes={notes} />
    </section>
  );
}

export default NotesFeature;
