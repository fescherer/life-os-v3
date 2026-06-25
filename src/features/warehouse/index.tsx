import { invoke } from "@tauri-apps/api/core";
import {
  BadgePlus,
  Pencil,
  PlusCircle,
  Save,
  Search,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

type SelectOption = {
  value: string;
  label: string;
  color: string;
};

type WarehouseItem = {
  id: string;
  created_at: string;
  updated_at: string;
  description: string;
  box_id: string;
  box_label: string;
  box_color: string;
};

type WarehouseFeatureProps = {
  isDataDialogOpen: boolean;
  isEntryDialogOpen: boolean;
  onCloseDataDialog: () => void;
  onCloseEntryDialog: () => void;
};

type WarehouseGroup = {
  box: {
    color: string;
    label: string;
    value: string;
  };
  items: WarehouseItem[];
};

function WarehouseFeature({
  isDataDialogOpen,
  isEntryDialogOpen,
  onCloseDataDialog,
  onCloseEntryDialog,
}: WarehouseFeatureProps) {
  const [boxes, setBoxes] = useState<SelectOption[]>([]);
  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [editingItem, setEditingItem] = useState<WarehouseItem | null>(null);
  const [boxFilter, setBoxFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  async function loadWarehouseData() {
    const [boxOptions, warehouseItems] = await Promise.all([
      invoke<SelectOption[]>("list_warehouse_box_options"),
      invoke<WarehouseItem[]>("list_warehouse_items"),
    ]);

    setBoxes(boxOptions);
    setItems(warehouseItems);
  }

  useEffect(() => {
    queueMicrotask(() => {
      loadWarehouseData().catch(error => setStatus(String(error)));
    });
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesBox = boxFilter === "all" || item.box_id === boxFilter;
      const matchesSearch = !normalizedSearch
        || [item.description, item.box_label].some(value =>
          value.toLowerCase().includes(normalizedSearch),
        );

      return matchesBox && matchesSearch;
    });
  }, [boxFilter, items, search]);
  const groupedItems = useMemo(
    () => buildWarehouseGroups(filteredItems, boxes),
    [boxes, filteredItems],
  );

  async function handleSaved() {
    await loadWarehouseData();
    onCloseEntryDialog();
    setEditingItem(null);
  }

  async function handleBoxesChanged() {
    await loadWarehouseData();
  }

  async function removeItem(id: string) {
    try {
      await invoke("remove_warehouse_item", { id });
      setStatus("");
      await loadWarehouseData();
    }
    catch (error) {
      setStatus(String(error));
    }
  }

  return (
    <>
      <section className="rounded-md border border-border bg-sidebar p-3">
        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-[1fr_14rem]">
            <label className="flex h-8 items-center gap-2 rounded-md border border-border bg-card px-2 text-muted-foreground">
              <Search aria-hidden="true" className="size-4 shrink-0" />
              <input
                className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
                onChange={event => setSearch(event.currentTarget.value)}
                placeholder="Search warehouse..."
                value={search}
              />
            </label>

            <Select onValueChange={setBoxFilter} value={boxFilter}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All boxes</SelectItem>
                {boxes.map(box => (
                  <SelectItem key={box.value} value={box.value}>
                    {box.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-5">
            {groupedItems.map(group => (
              <WarehouseBoxGroup
                group={group}
                key={group.box.value}
                onEdit={item => setEditingItem(item)}
                onRemove={item => removeItem(item.id)}
              />
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="flex min-h-64 items-center justify-center rounded-md border border-dashed border-border bg-card text-xs text-muted-foreground">
              No warehouse items found.
            </div>
          )}
        </div>
      </section>

      {status && <p className="mt-3 text-xs text-destructive">{status}</p>}

      {isEntryDialogOpen && (
        <WarehouseItemDialog
          boxes={boxes}
          onClose={onCloseEntryDialog}
          onSaved={handleSaved}
        />
      )}

      {editingItem && (
        <WarehouseItemDialog
          boxes={boxes}
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={handleSaved}
        />
      )}

      {isDataDialogOpen && (
        <WarehouseDataDialog
          boxes={boxes}
          onChanged={handleBoxesChanged}
          onClose={onCloseDataDialog}
        />
      )}
    </>
  );
}

function WarehouseBoxGroup({
  group,
  onEdit,
  onRemove,
}: {
  group: WarehouseGroup;
  onEdit: (item: WarehouseItem) => void;
  onRemove: (item: WarehouseItem) => void;
}) {
  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-4 border-b border-border pb-2">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="size-3 shrink-0 rounded-full"
            style={{ backgroundColor: group.box.color }}
          />
          <h2 className="truncate text-base text-foreground">{group.box.label}</h2>
        </div>
        <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
          {group.items.length}
          {" items"}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {group.items.map(item => (
          <WarehouseItemCard
            item={item}
            key={item.id}
            onEdit={() => onEdit(item)}
            onRemove={() => onRemove(item)}
          />
        ))}
      </div>
    </section>
  );
}

function WarehouseItemCard({
  item,
  onEdit,
  onRemove,
}: {
  item: WarehouseItem;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <article className="grid min-h-24 gap-3 rounded-md border border-border bg-card p-3">
      <p className="line-clamp-3 text-sm leading-5 text-foreground">{item.description}</p>

      <div className="mt-auto flex items-center justify-end gap-2">
        <button
          aria-label="Edit warehouse item"
          className="flex size-9 items-center justify-center rounded-md border border-border transition hover:bg-accent"
          onClick={onEdit}
          type="button"
        >
          <Pencil aria-hidden="true" className="size-4" />
        </button>
        <button
          aria-label="Remove warehouse item"
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

function WarehouseItemDialog({
  boxes,
  item,
  onClose,
  onSaved,
}: {
  boxes: SelectOption[];
  item?: WarehouseItem;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const isEditing = Boolean(item);
  const [description, setDescription] = useState(item?.description ?? "");
  const [boxId, setBoxId] = useState(() => item?.box_id ?? boxes[0]?.value ?? "");
  const [error, setError] = useState("");
  const selectedBox = boxId || boxes[0]?.value || "";

  async function saveItem() {
    try {
      if (item) {
        await invoke("update_warehouse_item", {
          item: {
            box_id: selectedBox,
            description,
            id: item.id,
          },
        });
      }
      else {
        await invoke("add_warehouse_item", {
          item: {
            box_id: selectedBox,
            description,
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
    <Modal onClose={onClose} title={isEditing ? "Edit warehouse item" : "New warehouse item"}>
      <div className="grid gap-7">
        <div className="grid gap-5">
          <Field label="Item">
            <input
              className="h-8 rounded-md border border-border bg-card px-3 text-xs outline-none"
              onChange={event => setDescription(event.currentTarget.value)}
              placeholder="Describe the item"
              value={description}
            />
          </Field>

          <Field label="Box">
            <Select onValueChange={setBoxId} value={selectedBox}>
              <SelectTrigger>
                <SelectValue placeholder="Select box" />
              </SelectTrigger>
              <SelectContent>
                {boxes.map(box => (
                  <SelectItem key={box.value} value={box.value}>
                    {box.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            disabled={!selectedBox}
            onClick={saveItem}
            type="button"
          >
            {isEditing
              ? <Save aria-hidden="true" className="size-5" />
              : <BadgePlus aria-hidden="true" className="size-5" />}
            {isEditing ? "Save item" : "Add item"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function WarehouseDataDialog({
  boxes,
  onChanged,
  onClose,
}: {
  boxes: SelectOption[];
  onChanged: () => void | Promise<void>;
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose} title="Manage boxes">
      <OptionManager
        addCommand="add_warehouse_box_option"
        emptyLabel="No boxes registered."
        onChanged={onChanged}
        options={boxes}
        removeCommand="remove_warehouse_box_option"
        updateCommand="update_warehouse_box_option"
      />
      <button
        className="mt-8 text-sm text-muted-foreground transition hover:text-foreground"
        onClick={onClose}
        type="button"
      >
        Cancel
      </button>
    </Modal>
  );
}

function OptionManager({
  addCommand,
  emptyLabel,
  onChanged,
  options,
  removeCommand,
  updateCommand,
}: {
  addCommand: string;
  emptyLabel: string;
  onChanged: () => void | Promise<void>;
  options: SelectOption[];
  removeCommand: string;
  updateCommand: string;
}) {
  const [draftOptions, setDraftOptions] = useState<Record<string, SelectOption>>({});
  const [newColor, setNewColor] = useState("#4f4749");
  const [newLabel, setNewLabel] = useState("");
  const [error, setError] = useState("");

  async function addOption() {
    try {
      await invoke<SelectOption[]>(addCommand, {
        boxOption: { color: newColor, label: newLabel },
      });
      setNewLabel("");
      setError("");
      await onChanged();
    }
    catch (addError) {
      setError(String(addError));
    }
  }

  async function updateOption(option: SelectOption) {
    try {
      await invoke<SelectOption[]>(updateCommand, {
        boxOption: option,
      });
      setDraftOptions((current) => {
        const next = { ...current };
        delete next[option.value];
        return next;
      });
      setError("");
      await onChanged();
    }
    catch (updateError) {
      setError(String(updateError));
    }
  }

  async function removeOption(value: string) {
    try {
      await invoke<SelectOption[]>(removeCommand, { value });
      setError("");
      await onChanged();
    }
    catch (removeError) {
      setError(String(removeError));
    }
  }

  return (
    <div className="grid max-w-xl gap-0">
      <div className="grid">
        {options.map((option) => {
          const draft = draftOptions[option.value] ?? option;

          return (
            <div className="grid gap-2 border-b border-border py-3 md:grid-cols-[1fr_4rem_2.75rem_2.75rem]" key={option.value}>
              <input
                className="h-9 rounded-md border border-border bg-sidebar px-3 text-xs outline-none"
                onChange={(event) => {
                  const labelValue = event.currentTarget.value;

                  setDraftOptions(current => ({
                    ...current,
                    [option.value]: { ...draft, label: labelValue },
                  }));
                }}
                value={draft.label}
              />
              <input
                className="h-9 w-full rounded-md border border-border bg-sidebar p-1"
                onChange={(event) => {
                  const colorValue = event.currentTarget.value;

                  setDraftOptions(current => ({
                    ...current,
                    [option.value]: { ...draft, color: colorValue },
                  }));
                }}
                type="color"
                value={draft.color}
              />
              <button
                className="flex h-9 items-center justify-center rounded-md border border-border"
                onClick={() => updateOption(draft)}
                type="button"
              >
                <Save aria-hidden="true" className="size-4" />
              </button>
              <button
                className="flex h-9 items-center justify-center rounded-md border border-border text-destructive"
                onClick={() => removeOption(option.value)}
                type="button"
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </button>
            </div>
          );
        })}
        {options.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">{emptyLabel}</p>
        )}
      </div>

      <div className="grid gap-2 border-b border-border py-3 md:grid-cols-[1fr_4rem_auto]">
        <input
          className="h-9 rounded-md border border-border bg-sidebar px-3 text-xs outline-none"
          onChange={event => setNewLabel(event.currentTarget.value)}
          placeholder="New box"
          value={newLabel}
        />
        <input
          className="h-9 w-full rounded-md border border-border bg-sidebar p-1"
          onChange={event => setNewColor(event.currentTarget.value)}
          type="color"
          value={newColor}
        />
        <button
          className="flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-xs text-primary-foreground"
          onClick={addOption}
          type="button"
        >
          <PlusCircle aria-hidden="true" className="size-4" />
          Add
        </button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
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

function buildWarehouseGroups(items: WarehouseItem[], boxes: SelectOption[]): WarehouseGroup[] {
  const groups = new Map<string, WarehouseGroup>();

  for (const box of boxes) {
    groups.set(box.value, {
      box,
      items: [],
    });
  }

  for (const item of items) {
    const group = groups.get(item.box_id);

    if (group) {
      group.items.push(item);
      continue;
    }

    groups.set(item.box_id, {
      box: {
        color: item.box_color,
        label: item.box_label,
        value: item.box_id,
      },
      items: [item],
    });
  }

  return Array.from(groups.values()).filter(group => group.items.length > 0);
}

export default WarehouseFeature;
