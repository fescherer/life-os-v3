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
  const [backupStatus, setBackupStatus] = useState("");

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

  async function exportBackup() {
    try {
      const backupPath = await invoke<string>("export_backup");
      setBackupStatus(`Backup exported to ${backupPath}`);
    }
    catch (error) {
      setBackupStatus(String(error));
    }
  }

  async function restoreBackup() {
    try {
      const backupPath = await invoke<string>("restore_backup");
      setBackupStatus(`Backup restored from ${backupPath}`);
      await loadNotes();
    }
    catch (error) {
      setBackupStatus(String(error));
    }
  }

  useEffect(() => {
    invoke<Note[]>("list_notes").then(setNotes).catch(console.error);
  }, []);

  return (
    <main className="min-h-screen bg-zinc-100 px-6 py-[10vh] text-zinc-950 antialiased dark:bg-zinc-800 dark:text-zinc-100">
      <section className="mx-auto flex max-w-xl flex-col gap-6">
        <h1 className="text-3xl font-semibold leading-tight">SQLite Notes</h1>

        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 font-medium text-zinc-950 shadow-sm transition hover:border-blue-600 active:bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-950/60 dark:text-white dark:active:bg-zinc-950/40"
            onClick={exportBackup}
            type="button"
          >
            Export Backup
          </button>
          <button
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 font-medium text-zinc-950 shadow-sm transition hover:border-blue-600 active:bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-950/60 dark:text-white dark:active:bg-zinc-950/40"
            onClick={restoreBackup}
            type="button"
          >
            Restore Backup
          </button>
        </div>

        {backupStatus && (
          <p className="m-0 rounded-lg border border-zinc-300 bg-white p-3 text-sm text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200">
            {backupStatus}
          </p>
        )}

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addNote();
          }}
        >
          <input
            className="min-w-0 flex-1 rounded-lg border border-transparent bg-white px-5 py-3 font-medium text-zinc-950 shadow-sm outline-none transition focus:border-blue-600 dark:bg-zinc-950/60 dark:text-white"
            value={body}
            onChange={e => setBody(e.currentTarget.value)}
            placeholder="Write a note..."
          />
          <button
            className="rounded-lg border border-transparent bg-white px-5 py-3 font-medium text-zinc-950 shadow-sm transition hover:border-blue-600 active:border-blue-600 active:bg-zinc-200 dark:bg-zinc-950/60 dark:text-white dark:active:bg-zinc-950/40"
            type="submit"
          >
            Save
          </button>
        </form>

        <ul className="grid list-none gap-2 p-0">
          {notes.map(note => (
            <li
              className="rounded-lg border border-zinc-300 bg-white p-3 text-left dark:border-zinc-600 dark:bg-zinc-800"
              key={note.id}
            >
              {note.body}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export default App;
