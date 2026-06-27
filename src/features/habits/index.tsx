import { invoke } from "@tauri-apps/api/core";
import {
  BadgePlus,
  CheckCircle2,
  ClipboardCheck,
  Pencil,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

type Habit = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  active: boolean;
};

type HabitProgress = {
  id: string;
  created_at: string;
  updated_at: string;
  week_start: string;
  completed_habit_ids: string[];
};

type HabitWeekSnapshot = {
  id: string;
  name: string;
  completed: boolean;
};

type HabitWeek = {
  id: string;
  created_at: string;
  updated_at: string;
  week_start: string;
  week_end: string;
  reflection: string;
  completed_count: number;
  total_count: number;
  habits: HabitWeekSnapshot[];
};

type WeekRange = {
  end: string;
  label: string;
  start: string;
};

type HabitsFeatureProps = {
  isEntryDialogOpen: boolean;
  onCloseEntryDialog: () => void;
};

function HabitsFeature({ isEntryDialogOpen, onCloseEntryDialog }: HabitsFeatureProps) {
  const week = currentWeekRange();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [progress, setProgress] = useState<HabitProgress | null>(null);
  const [weeks, setWeeks] = useState<HabitWeek[]>([]);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [isFinishDialogOpen, setIsFinishDialogOpen] = useState(false);
  const [status, setStatus] = useState("");

  async function loadHabitData() {
    const [habitItems, habitProgress, habitWeeks] = await Promise.all([
      invoke<Habit[]>("list_habits"),
      invoke<HabitProgress>("get_habit_progress", { weekStart: week.start }),
      invoke<HabitWeek[]>("list_habit_weeks"),
    ]);

    setHabits(habitItems);
    setProgress(habitProgress);
    setWeeks(habitWeeks);
  }

  useEffect(() => {
    queueMicrotask(() => {
      loadHabitData().catch(error => setStatus(String(error)));
    });
  }, [week.start]);

  const activeHabits = useMemo(() => habits.filter(habit => habit.active), [habits]);
  const completedCount = useMemo(
    () => activeHabits.filter(habit => progress?.completed_habit_ids.includes(habit.id)).length,
    [activeHabits, progress],
  );

  async function handleSaved() {
    await loadHabitData();
    onCloseEntryDialog();
    setEditingHabit(null);
  }

  async function toggleHabit(habit: Habit, completed: boolean) {
    try {
      await invoke("update_habit_completion", {
        update: {
          completed,
          habit_id: habit.id,
          week_start: week.start,
        },
      });
      setStatus("");
      await loadHabitData();
    }
    catch (error) {
      setStatus(String(error));
    }
  }

  async function removeHabit(id: string) {
    try {
      await invoke("remove_habit", { id });
      setStatus("");
      await loadHabitData();
    }
    catch (error) {
      setStatus(String(error));
    }
  }

  async function setHabitActive(habit: Habit, active: boolean) {
    try {
      await invoke("update_habit", {
        habit: {
          active,
          id: habit.id,
          name: habit.name,
        },
      });
      setStatus("");
      await loadHabitData();
    }
    catch (error) {
      setStatus(String(error));
    }
  }

  return (
    <>
      <div className="grid gap-4">
        <HabitWeekChecklist
          completedCount={completedCount}
          habits={activeHabits}
          onToggle={toggleHabit}
          progress={progress}
          title="This week"
          week={week}
        >
          <button
            className="flex h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-3 text-xs text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            disabled={activeHabits.length === 0}
            onClick={() => setIsFinishDialogOpen(true)}
            type="button"
          >
            <ClipboardCheck aria-hidden="true" className="size-4" />
            Finish week
          </button>
        </HabitWeekChecklist>

        <section className="rounded-md border border-border bg-sidebar p-3">
          <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
            <div className="flex items-center gap-3">
              <Sparkles aria-hidden="true" className="size-5 text-foreground" />
              <h2 className="text-base text-foreground">Configured habits</h2>
            </div>
            <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
              {habits.length}
              {" habits"}
            </span>
          </div>

          <div className="mt-3 grid gap-2">
            {habits.map(habit => (
              <HabitRow
                habit={habit}
                key={habit.id}
                onEdit={() => setEditingHabit(habit)}
                onRemove={() => removeHabit(habit.id)}
                onToggleActive={() => setHabitActive(habit, !habit.active)}
              />
            ))}

            {habits.length === 0 && (
              <p className="py-8 text-center text-xs text-muted-foreground">
                No habits configured yet.
              </p>
            )}
          </div>
        </section>

        <HabitHistory weeks={weeks} />
      </div>

      {status && <p className="mt-3 text-xs text-destructive">{status}</p>}

      {isEntryDialogOpen && (
        <HabitFormDialog
          onClose={onCloseEntryDialog}
          onSaved={handleSaved}
        />
      )}

      {editingHabit && (
        <HabitFormDialog
          habit={editingHabit}
          onClose={() => setEditingHabit(null)}
          onSaved={handleSaved}
        />
      )}

      {isFinishDialogOpen && (
        <FinishWeekDialog
          completedCount={completedCount}
          habits={activeHabits}
          onClose={() => setIsFinishDialogOpen(false)}
          onSaved={async () => {
            await loadHabitData();
            setIsFinishDialogOpen(false);
          }}
          progress={progress}
          week={week}
        />
      )}
    </>
  );
}

export function HabitWeekPanel() {
  const week = currentWeekRange();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [progress, setProgress] = useState<HabitProgress | null>(null);
  const [status, setStatus] = useState("");

  async function loadHabitData() {
    const [habitItems, habitProgress] = await Promise.all([
      invoke<Habit[]>("list_habits"),
      invoke<HabitProgress>("get_habit_progress", { weekStart: week.start }),
    ]);

    setHabits(habitItems.filter(habit => habit.active));
    setProgress(habitProgress);
  }

  useEffect(() => {
    queueMicrotask(() => {
      loadHabitData().catch(error => setStatus(String(error)));
    });
  }, [week.start]);

  const completedCount = useMemo(
    () => habits.filter(habit => progress?.completed_habit_ids.includes(habit.id)).length,
    [habits, progress],
  );

  async function toggleHabit(habit: Habit, completed: boolean) {
    try {
      await invoke("update_habit_completion", {
        update: {
          completed,
          habit_id: habit.id,
          week_start: week.start,
        },
      });
      setStatus("");
      await loadHabitData();
    }
    catch (error) {
      setStatus(String(error));
    }
  }

  return (
    <>
      <HabitWeekChecklist
        completedCount={completedCount}
        habits={habits}
        onToggle={toggleHabit}
        progress={progress}
        title="Weekly habits"
        week={week}
      />
      {status && <p className="mt-3 text-xs text-destructive">{status}</p>}
    </>
  );
}

function HabitWeekChecklist({
  children,
  completedCount,
  habits,
  onToggle,
  progress,
  title,
  week,
}: {
  children?: ReactNode;
  completedCount: number;
  habits: Habit[];
  onToggle: (habit: Habit, completed: boolean) => void | Promise<void>;
  progress: HabitProgress | null;
  title: string;
  week: WeekRange;
}) {
  const percent = habits.length ? Math.round((completedCount / habits.length) * 100) : 0;

  return (
    <section className="rounded-md border border-border bg-sidebar p-3">
      <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <CheckCircle2 aria-hidden="true" className="size-5 text-foreground" />
            <h2 className="text-base text-foreground">{title}</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{week.label}</p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
            {completedCount}
            /
            {habits.length}
            {" done"}
          </span>
          {children}
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_8rem]">
        <div className="grid gap-2">
          {habits.map(habit => (
            <label
              className="flex min-h-10 items-center gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
              key={habit.id}
            >
              <input
                checked={progress?.completed_habit_ids.includes(habit.id) ?? false}
                className="size-4 accent-primary"
                onChange={event => onToggle(habit, event.currentTarget.checked)}
                type="checkbox"
              />
              <span className="min-w-0 flex-1 truncate">{habit.name}</span>
            </label>
          ))}

          {habits.length === 0 && (
            <p className="py-8 text-center text-xs text-muted-foreground">
              Add habits to build this week&apos;s checklist.
            </p>
          )}
        </div>

        <div className="flex min-h-24 flex-col items-center justify-center rounded-md border border-border bg-card px-3 py-4">
          <p className="text-2xl text-foreground">
            {percent}
            %
          </p>
          <p className="mt-1 text-center text-xs text-muted-foreground">completion</p>
        </div>
      </div>
    </section>
  );
}

function HabitRow({
  habit,
  onEdit,
  onRemove,
  onToggleActive,
}: {
  habit: Habit;
  onEdit: () => void;
  onRemove: () => void;
  onToggleActive: () => void;
}) {
  return (
    <article className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm text-foreground">{habit.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {habit.active ? "Active in weekly checklist" : "Paused"}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          className="h-9 rounded-md border border-border px-3 text-xs transition hover:bg-accent"
          onClick={onToggleActive}
          type="button"
        >
          {habit.active ? "Pause" : "Activate"}
        </button>
        <button
          aria-label="Edit habit"
          className="flex size-9 items-center justify-center rounded-md border border-border transition hover:bg-accent"
          onClick={onEdit}
          type="button"
        >
          <Pencil aria-hidden="true" className="size-4" />
        </button>
        <button
          aria-label="Remove habit"
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

function HabitHistory({ weeks }: { weeks: HabitWeek[] }) {
  return (
    <section className="rounded-md border border-border bg-sidebar p-3">
      <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
        <h2 className="text-base text-foreground">Finished weeks</h2>
        <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
          {weeks.length}
          {" weeks"}
        </span>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {weeks.map(week => (
          <article className="grid gap-3 rounded-md border border-border bg-card p-3" key={week.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm text-foreground">
                  {formatDisplayDate(week.week_start)}
                  {" - "}
                  {formatDisplayDate(week.week_end)}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {completionPercent(week.completed_count, week.total_count)}
                  % completed
                </p>
              </div>
              <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                {week.completed_count}
                /
                {week.total_count}
              </span>
            </div>

            <div className="grid gap-1">
              {week.habits.map(habit => (
                <p
                  className={habit.completed ? "text-xs text-foreground" : "text-xs text-muted-foreground"}
                  key={habit.id}
                >
                  {habit.completed ? "Done: " : "Missed: "}
                  {habit.name}
                </p>
              ))}
            </div>

            {week.reflection && (
              <p className="line-clamp-4 border-t border-border pt-3 text-xs leading-5 text-muted-foreground">
                {week.reflection}
              </p>
            )}
          </article>
        ))}
      </div>

      {weeks.length === 0 && (
        <p className="py-8 text-center text-xs text-muted-foreground">
          Finished weeks will appear here.
        </p>
      )}
    </section>
  );
}

function HabitFormDialog({
  habit,
  onClose,
  onSaved,
}: {
  habit?: Habit;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const isEditing = Boolean(habit);
  const [name, setName] = useState(habit?.name ?? "");
  const [error, setError] = useState("");

  async function saveHabit() {
    try {
      if (habit) {
        await invoke("update_habit", {
          habit: {
            active: habit.active,
            id: habit.id,
            name,
          },
        });
      }
      else {
        await invoke("add_habit", { habit: { name } });
      }
      setError("");
      await onSaved();
    }
    catch (saveError) {
      setError(String(saveError));
    }
  }

  return (
    <Modal onClose={onClose} title={isEditing ? "Edit habit" : "New habit"}>
      <div className="grid gap-7">
        <Field label="Habit name">
          <input
            className="h-8 rounded-md border border-border bg-card px-3 text-xs outline-none"
            onChange={event => setName(event.currentTarget.value)}
            placeholder="Read before bed"
            value={name}
          />
        </Field>

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
            onClick={saveHabit}
            type="button"
          >
            {isEditing
              ? <Save aria-hidden="true" className="size-5" />
              : <BadgePlus aria-hidden="true" className="size-5" />}
            {isEditing ? "Save habit" : "Add habit"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function FinishWeekDialog({
  completedCount,
  habits,
  onClose,
  onSaved,
  progress,
  week,
}: {
  completedCount: number;
  habits: Habit[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  progress: HabitProgress | null;
  week: WeekRange;
}) {
  const [reflection, setReflection] = useState("");
  const [error, setError] = useState("");
  const percent = habits.length ? Math.round((completedCount / habits.length) * 100) : 0;

  async function finishWeek() {
    try {
      await invoke("finish_habit_week", {
        week: {
          reflection,
          week_end: week.end,
          week_start: week.start,
        },
      });
      setError("");
      await onSaved();
    }
    catch (finishError) {
      setError(String(finishError));
    }
  }

  return (
    <Modal onClose={onClose} title="Finish week">
      <div className="grid gap-6">
        <div className="rounded-md border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">{week.label}</p>
          <p className="mt-2 text-xl text-foreground">
            {completedCount}
            /
            {habits.length}
            {" habits - "}
            {percent}
            %
          </p>
          <div className="mt-3 grid gap-1">
            {habits.map(habit => (
              <p
                className={progress?.completed_habit_ids.includes(habit.id) ? "text-xs text-foreground" : "text-xs text-muted-foreground"}
                key={habit.id}
              >
                {progress?.completed_habit_ids.includes(habit.id) ? "Done: " : "Missed: "}
                {habit.name}
              </p>
            ))}
          </div>
        </div>

        <Field label="How did the week go?">
          <textarea
            className="min-h-32 resize-none rounded-md border border-border bg-card px-3 py-2 text-xs leading-5 outline-none"
            onChange={event => setReflection(event.currentTarget.value)}
            placeholder="Write a short weekly reflection"
            value={reflection}
          />
        </Field>

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
            onClick={finishWeek}
            type="button"
          >
            <ClipboardCheck aria-hidden="true" className="size-5" />
            Save week
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

function currentWeekRange(): WeekRange {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const day = start.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;

  start.setDate(start.getDate() - daysFromMonday);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    end: dateInputValue(end),
    label: `${formatDisplayDate(dateInputValue(start))} - ${formatDisplayDate(dateInputValue(end))}`,
    start: dateInputValue(start),
  };
}

function dateInputValue(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDisplayDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function completionPercent(completed: number, total: number) {
  return total ? Math.round((completed / total) * 100) : 0;
}

export default HabitsFeature;
