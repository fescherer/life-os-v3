import { invoke } from "@tauri-apps/api/core";
import { NotebookPen, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { LifeOSModal } from "../../components/life-os-ui/modal";
import { getImageDownloadName, readFile, readImage } from "./attachments";
import AttachmentDownload from "./components/AttachmentDownload";
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
  const [noteToRemove, setNoteToRemove] = useState<number | null>(null);

  async function removeNote(id: number) {
    try {
      await invoke("remove_note", { id });
      await loadNotes();
      setNoteToRemove(null);
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
        <div className="mt-3 grid gap-2">
          {notes.map(note => (
            <article className="grid gap-2 rounded-md border border-border bg-card px-3 py-2" key={note.id}>
              <div className="flex items-start justify-between gap-3">
                {note.body && <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm">{note.body}</p>}
                <button
                  aria-label="Remove note"
                  className="ml-auto flex size-8 shrink-0 items-center justify-center rounded-md text-destructive transition hover:bg-accent"
                  onClick={() => setNoteToRemove(note.id)}
                  type="button"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </div>
              {note.images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {note.images.map((image, index) => (
                    <div className="group relative" key={`${note.id}-${index}`}>
                      <img alt={`Note attachment ${index + 1}`} className="max-h-40 max-w-56 rounded-md border border-border object-contain" src={image} />
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
            </article>
          ))}
          {notes.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">No notes yet.</p>}
        </div>
        {status && <p className="mt-3 text-xs text-destructive">{status}</p>}
      </section>
      {noteToRemove !== null && (
        <LifeOSModal onClose={() => setNoteToRemove(null)} title="Delete note">
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this note?</p>
          <div className="flex justify-end gap-2">
            <button className="h-9 rounded-md border border-border px-4 text-sm transition hover:bg-accent" onClick={() => setNoteToRemove(null)} type="button">Cancel</button>
            <button className="h-9 rounded-md bg-destructive px-4 text-sm text-destructive-foreground transition hover:bg-destructive/90" onClick={() => removeNote(noteToRemove)} type="button">Delete</button>
          </div>
        </LifeOSModal>
      )}
    </>
  );
}

export default NotesFeature;
