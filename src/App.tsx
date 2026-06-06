import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

type Note = {
  id: number;
  body: string;
};

function App() {
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
    <main className="container">
      <h1>SQLite Notes</h1>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          addNote();
        }}
      >
        <input
          value={body}
          onChange={e => setBody(e.currentTarget.value)}
          placeholder="Write a note..."
        />
        <button type="submit">Save</button>
      </form>
      <ul className="notes">
        {notes.map(note => (
          <li key={note.id}>{note.body}</li>
        ))}
      </ul>
    </main>
  );
}

export default App;
