import { invoke } from "@tauri-apps/api/core";
import {
  BadgePlus,
  Bell,
  CheckCircle2,
  Pencil,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { DatePicker } from "../../components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

export type ReminderFrequency = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

export type Reminder = {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  frequency: ReminderFrequency;
  start_date: string;
  last_done_date: string | null;
};

type ReminderWithSchedule = Reminder & {
  due: boolean;
  nextDueDate: Date;
};

type RemindersFeatureProps = {
  isEntryDialogOpen: boolean;
  onCloseEntryDialog: () => void;
};

const frequencyOptions: Array<{ label: string; value: ReminderFrequency }> = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Quarterly", value: "quarterly" },
  { label: "Yearly", value: "yearly" },
];

function RemindersFeature({
  isEntryDialogOpen,
  onCloseEntryDialog,
}: RemindersFeatureProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  async function loadReminders() {
    setReminders(await invoke<Reminder[]>("list_reminders"));
  }

  useEffect(() => {
    queueMicrotask(() => {
      loadReminders().catch(error => setStatus(String(error)));
    });
  }, []);

  const scheduledReminders = useMemo(
    () => reminders.map(withSchedule).sort(sortScheduledReminders),
    [reminders],
  );
  const filteredReminders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return scheduledReminders;
    }

    return scheduledReminders.filter(reminder =>
      [
        reminder.title,
        frequencyLabel(reminder.frequency),
        formatReminderStartDate(reminder),
        formatDisplayDate(reminder.nextDueDate),
      ].some(value => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [scheduledReminders, search]);

  async function handleSaved() {
    await loadReminders();
    onCloseEntryDialog();
    setEditingReminder(null);
  }

  async function completeReminder(id: string) {
    try {
      await invoke("complete_reminder", { id });
      setStatus("");
      await loadReminders();
    }
    catch (error) {
      setStatus(String(error));
    }
  }

  async function removeReminder(id: string) {
    try {
      await invoke("remove_reminder", { id });
      setStatus("");
      await loadReminders();
    }
    catch (error) {
      setStatus(String(error));
    }
  }

  return (
    <>
      <section className="rounded-md border border-border bg-sidebar p-3">
        <div className="grid gap-4">
          <label className="flex h-8 items-center gap-2 rounded-md border border-border bg-card px-2 text-muted-foreground">
            <Search aria-hidden="true" className="size-4 shrink-0" />
            <input
              className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
              onChange={event => setSearch(event.currentTarget.value)}
              placeholder="Search reminders..."
              value={search}
            />
          </label>

          <div className="grid gap-3">
            {filteredReminders.map(reminder => (
              <ReminderRow
                key={reminder.id}
                onComplete={() => completeReminder(reminder.id)}
                onEdit={() => setEditingReminder(reminder)}
                onRemove={() => removeReminder(reminder.id)}
                reminder={reminder}
              />
            ))}
          </div>

          {filteredReminders.length === 0 && (
            <div className="flex min-h-64 items-center justify-center rounded-md border border-dashed border-border bg-card text-xs text-muted-foreground">
              No reminders found.
            </div>
          )}
        </div>
      </section>

      {status && <p className="mt-3 text-xs text-destructive">{status}</p>}

      {isEntryDialogOpen && (
        <ReminderFormDialog
          onClose={onCloseEntryDialog}
          onSaved={handleSaved}
        />
      )}

      {editingReminder && (
        <ReminderFormDialog
          onClose={() => setEditingReminder(null)}
          onSaved={handleSaved}
          reminder={editingReminder}
        />
      )}
    </>
  );
}

export function ReminderAlerts() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [status, setStatus] = useState("");

  async function loadReminders() {
    setReminders(await invoke<Reminder[]>("list_reminders"));
  }

  useEffect(() => {
    queueMicrotask(() => {
      loadReminders().catch(error => setStatus(String(error)));
    });
  }, []);

  const dueReminders = useMemo(
    () => reminders.map(withSchedule).filter(reminder => reminder.due).sort(sortScheduledReminders),
    [reminders],
  );

  async function completeReminder(id: string) {
    try {
      await invoke("complete_reminder", { id });
      setStatus("");
      await loadReminders();
    }
    catch (error) {
      setStatus(String(error));
    }
  }

  return (
    <section className="rounded-md border border-border bg-sidebar p-3">
      <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
        <div className="flex items-center gap-3">
          <Bell aria-hidden="true" className="size-5 text-foreground" />
          <h2 className="text-base text-foreground">Reminder alerts</h2>
        </div>
        <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
          {dueReminders.length}
          {" due"}
        </span>
      </div>

      <div className="mt-3 grid gap-2">
        {dueReminders.map(reminder => (
          <div
            className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2"
            key={reminder.id}
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-foreground">{reminder.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {frequencyLabel(reminder.frequency)}
                {" reminder is due"}
              </p>
            </div>
            <button
              className="flex h-8 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-3 text-xs text-primary-foreground transition hover:bg-primary/90"
              onClick={() => completeReminder(reminder.id)}
              type="button"
            >
              <CheckCircle2 aria-hidden="true" className="size-4" />
              Done
            </button>
          </div>
        ))}

        {dueReminders.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No reminders due right now.
          </p>
        )}
      </div>

      {status && <p className="mt-3 text-xs text-destructive">{status}</p>}
    </section>
  );
}

function ReminderRow({
  onComplete,
  onEdit,
  onRemove,
  reminder,
}: {
  onComplete: () => void;
  onEdit: () => void;
  onRemove: () => void;
  reminder: ReminderWithSchedule;
}) {
  return (
    <article
      className={[
        "grid gap-3 rounded-md border border-border bg-card p-3 md:grid-cols-[1fr_auto]",
        reminder.due ? "border-destructive" : "",
      ].join(" ")}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate text-sm text-foreground">{reminder.title}</h2>
          <span className="rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">
            {frequencyLabel(reminder.frequency)}
          </span>
          {reminder.due && (
            <span className="rounded-full bg-destructive px-2 py-1 text-[11px] text-destructive-foreground">
              Due now
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Starts:
          {" "}
          {formatReminderStartDate(reminder)}
          {" - Next due: "}
          {formatDisplayDate(reminder.nextDueDate)}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-xs text-primary-foreground transition hover:bg-primary/90"
          onClick={onComplete}
          type="button"
        >
          <CheckCircle2 aria-hidden="true" className="size-4" />
          Done
        </button>
        <button
          aria-label="Edit reminder"
          className="flex size-9 items-center justify-center rounded-md border border-border transition hover:bg-accent"
          onClick={onEdit}
          type="button"
        >
          <Pencil aria-hidden="true" className="size-4" />
        </button>
        <button
          aria-label="Remove reminder"
          className="flex size-9 items-center justify-center rounded-md border border-border text-destructive transition hover:bg-accent"
          onClick={onRemove}
          type="button"
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </button>
      </div>
    </article>
  );
}

function ReminderFormDialog({
  onClose,
  onSaved,
  reminder,
}: {
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  reminder?: Reminder;
}) {
  const isEditing = Boolean(reminder);
  const [title, setTitle] = useState(reminder?.title ?? "");
  const [frequency, setFrequency] = useState<ReminderFrequency>(reminder?.frequency ?? "weekly");
  const [startDate, setStartDate] = useState(reminder?.start_date || todayInputValue());
  const [error, setError] = useState("");

  async function saveReminder() {
    try {
      if (reminder) {
        await invoke("update_reminder", {
          reminder: {
            frequency,
            id: reminder.id,
            last_done_date: reminder.last_done_date,
            start_date: startDate,
            title,
          },
        });
      }
      else {
        await invoke("add_reminder", {
          reminder: {
            frequency,
            start_date: startDate,
            title,
          },
        });
      }
      setError("");
      await onSaved();
    }
    catch (saveError) {
      setError(String(saveError));
    }
  }

  return (
    <Modal onClose={onClose} title={isEditing ? "Edit reminder" : "New reminder"}>
      <div className="grid gap-7">
        <div className="grid gap-5">
          <Field label="Title">
            <input
              className="h-8 rounded-md border border-border bg-card px-3 text-xs outline-none"
              onChange={event => setTitle(event.currentTarget.value)}
              placeholder="Water plants"
              value={title}
            />
          </Field>

          <Field label="Frequency">
            <Select onValueChange={value => setFrequency(value as ReminderFrequency)} value={frequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {frequencyOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Start date">
            <DatePicker onChange={setStartDate} value={startDate} />
          </Field>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex items-center justify-between gap-4">
          <button
            className="text-sm text-muted-foreground transition hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="flex h-9 min-w-44 items-center justify-center gap-3 rounded-md bg-primary px-4 text-sm text-primary-foreground transition hover:bg-primary/90"
            onClick={saveReminder}
            type="button"
          >
            {isEditing
              ? <Save aria-hidden="true" className="size-5" />
              : <BadgePlus aria-hidden="true" className="size-5" />}
            {isEditing ? "Save reminder" : "Add reminder"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="grid gap-2 text-sm text-muted-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Modal({
  children,
  onClose,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-4">
            <span>{title}</span>
            <button
              aria-label="Close"
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:text-foreground"
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function withSchedule(reminder: Reminder): ReminderWithSchedule {
  const anchorDate = parseReminderDate(reminder.last_done_date)
    ?? parseReminderDate(reminder.start_date)
    ?? parseReminderDate(reminder.created_at)
    ?? new Date();
  const nextDueDate = addFrequency(anchorDate, reminder.frequency);

  return {
    ...reminder,
    due: nextDueDate.getTime() <= Date.now(),
    nextDueDate,
  };
}

function addFrequency(date: Date, frequency: ReminderFrequency) {
  const next = new Date(date);

  if (frequency === "daily") {
    next.setDate(next.getDate() + 1);
  }
  else if (frequency === "weekly") {
    next.setDate(next.getDate() + 7);
  }
  else if (frequency === "monthly") {
    next.setMonth(next.getMonth() + 1);
  }
  else if (frequency === "quarterly") {
    next.setMonth(next.getMonth() + 3);
  }
  else {
    next.setFullYear(next.getFullYear() + 1);
  }

  return next;
}

function parseReminderDate(value: string | null) {
  if (!value) {
    return null;
  }

  if (/^\d+$/.test(value)) {
    return new Date(Number(value) * 1000);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);

    return new Date(year, month - 1, day);
  }

  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? null : date;
}

function sortScheduledReminders(first: ReminderWithSchedule, second: ReminderWithSchedule) {
  if (first.due !== second.due) {
    return first.due ? -1 : 1;
  }

  return first.nextDueDate.getTime() - second.nextDueDate.getTime();
}

function frequencyLabel(frequency: ReminderFrequency) {
  return frequencyOptions.find(option => option.value === frequency)?.label ?? frequency;
}

function formatDisplayDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatReminderStartDate(reminder: Reminder) {
  const date = parseReminderDate(reminder.start_date) ?? parseReminderDate(reminder.created_at) ?? new Date();

  return formatDisplayDate(date);
}

function todayInputValue() {
  const today = new Date();

  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
}

export default RemindersFeature;
