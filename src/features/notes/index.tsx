import { invoke } from "@tauri-apps/api/core";
import { NotebookPen } from "lucide-react";
import { useEffect, useState } from "react";
import { LifeOSModal } from "../../components/life-os-ui/modal";
import { readFile, readImage } from "./attachments";
import NoteForm from "./components/NoteForm";
import NoteList from "./components/NoteList";
import type { Note, NoteFile } from "./types";

type NotesFeatureProps = {
  droppedFiles: File[];
  isEntryDialogOpen: boolean;
  onCloseEntryDialog: () => void;
  onDroppedFilesHandled: () => void;
  onOpenEntryDialog: () => void;
};

function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [status, setStatus] = useState("");

  async function loadNotes() {
    setNotes(await invoke<Note[]>("list_notes"));
  }

  useEffect(() => {
    queueMicrotask(() => loadNotes().catch(error => setStatus(String(error))));
  }, []);

  return { loadNotes, notes, setStatus, status };
}

function NotesFeature({ droppedFiles, isEntryDialogOpen, onCloseEntryDialog, onDroppedFilesHandled, onOpenEntryDialog }: NotesFeatureProps) {
  const { loadNotes, notes, setStatus, status } = useNotes();
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<NoteFile[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  useEffect(() => {
    if (droppedFiles.length === 0) return;

    const droppedImages = droppedFiles.filter(file => file.type.startsWith("image/"));
    const otherFiles = droppedFiles.filter(file => !file.type.startsWith("image/"));

    Promise.all([
      Promise.all(droppedImages.map(readImage)),
      Promise.all(otherFiles.map(readFile)),
    ]).then(([newImages, newFiles]) => {
      setImages(currentImages => [...currentImages, ...newImages]);
      setFiles(currentFiles => [...currentFiles, ...newFiles]);
      onOpenEntryDialog();
    }).catch(error => setStatus(String(error)));

    onDroppedFilesHandled();
  }, [droppedFiles, onDroppedFilesHandled, onOpenEntryDialog, setStatus]);

  async function saveNote() {
    try {
      if (editingNote) {
        await invoke("update_note", { body, files, id: editingNote.id, images });
      }
      else {
        await invoke("add_note", { body, files, images });
      }
      setBody("");
      setFiles([]);
      setImages([]);
      setEditingNote(null);
      onCloseEntryDialog();
      setStatus("");
      await loadNotes();
    }
    catch (error) {
      setStatus(String(error));
    }
  }

  async function removeNote(id: number) {
    try {
      await invoke("remove_note", { id });
      setStatus("");
      await loadNotes();
    }
    catch (error) {
      setStatus(String(error));
    }
  }

  async function copyNote(note: Note) {
    try {
      await navigator.clipboard.writeText(note.body);
      setStatus("Note copied.");
    }
    catch (error) {
      setStatus(String(error));
    }
  }

  function closeForm() {
    setBody("");
    setFiles([]);
    setImages([]);
    setEditingNote(null);
    onCloseEntryDialog();
  }

  return (
    <>
      <section className="rounded-md border border-border bg-sidebar p-3">
        <NoteList
          notes={notes}
          onCopy={copyNote}
          onEdit={(note) => {
            setBody(note.body);
            setFiles(note.files);
            setImages(note.images);
            setEditingNote(note);
          }}
          onRemove={removeNote}
        />
      </section>
      {status && <p className="mt-3 text-xs text-muted-foreground">{status}</p>}
      {(isEntryDialogOpen || editingNote) && (
        <LifeOSModal onClose={closeForm} title={editingNote ? "Edit note" : "New note"}>
          <NoteForm
            body={body}
            files={files}
            images={images}
            isEditing={Boolean(editingNote)}
            onBodyChange={setBody}
            onCancel={closeForm}
            onFilesChange={setFiles}
            onImagesChange={setImages}
            onSubmit={saveNote}
          />
        </LifeOSModal>
      )}
    </>
  );
}

export function NotesPanel() {
  const { loadNotes, notes, setStatus, status } = useNotes();
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<NoteFile[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  async function removeNote(id: number) {
    try {
      await invoke("remove_note", { id });
      await loadNotes();
    }
    catch (error) {
      setStatus(String(error));
    }
  }

  async function copyNote(note: Note) {
    try {
      await navigator.clipboard.writeText(note.body);
      setStatus("Note copied.");
    }
    catch (error) {
      setStatus(String(error));
    }
  }

  async function saveNote() {
    if (!editingNote) return;

    try {
      await invoke("update_note", { body, files, id: editingNote.id, images });
      setEditingNote(null);
      setStatus("");
      await loadNotes();
    }
    catch (error) {
      setStatus(String(error));
    }
  }

  return (
    <>
      <section className="rounded-md border border-border bg-sidebar p-3">
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <NotebookPen aria-hidden="true" className="size-5 text-foreground" />
          <h2 className="text-base text-foreground">Notes</h2>
        </div>
        <div className="mt-3">
          <NoteList
            notes={notes}
            onCopy={copyNote}
            onEdit={(note) => {
              setBody(note.body);
              setFiles(note.files);
              setImages(note.images);
              setEditingNote(note);
            }}
            onRemove={removeNote}
          />
        </div>
        {status && <p className="mt-3 text-xs text-destructive">{status}</p>}
      </section>
      {editingNote && (
        <LifeOSModal onClose={() => setEditingNote(null)} title="Edit note">
          <NoteForm
            body={body}
            files={files}
            images={images}
            isEditing
            onBodyChange={setBody}
            onCancel={() => setEditingNote(null)}
            onFilesChange={setFiles}
            onImagesChange={setImages}
            onSubmit={saveNote}
          />
        </LifeOSModal>
      )}
    </>
  );
}

export default NotesFeature;
