type NoteFormProps = {
  body: string;
  onBodyChange: (body: string) => void;
  onSubmit: () => void;
};

function NoteForm({ body, onBodyChange, onSubmit }: NoteFormProps) {
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <input
        className="min-w-0 flex-1 rounded-lg border border-input bg-card px-5 py-3 font-medium text-card-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
        value={body}
        onChange={e => onBodyChange(e.currentTarget.value)}
        placeholder="Write a note..."
      />
      <button
        className="rounded-lg border border-primary bg-primary px-5 py-3 font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 active:bg-primary/80"
        type="submit"
      >
        Save
      </button>
    </form>
  );
}

export default NoteForm;
