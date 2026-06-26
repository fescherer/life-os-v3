import { invoke } from "@tauri-apps/api/core";
import {
  BadgePlus,
  CheckCircle2,
  Pencil,
  PlusCircle,
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

type SelectOption = {
  value: string;
  label: string;
  color: string;
};

type PackagingItem = {
  id: string;
  created_at: string;
  updated_at: string;
  transport_company: string;
  start_date: string;
  purchase_company: string;
  description: string;
  has_arrived: boolean;
  transport_company_label: string;
  transport_company_color: string;
  purchase_company_label: string;
  purchase_company_color: string;
};

type DataSection = "transport" | "purchase";

type PackagingFeatureProps = {
  isDataDialogOpen: boolean;
  isEntryDialogOpen: boolean;
  onCloseDataDialog: () => void;
  onCloseEntryDialog: () => void;
};

function PackagingFeature({
  isDataDialogOpen,
  isEntryDialogOpen,
  onCloseDataDialog,
  onCloseEntryDialog,
}: PackagingFeatureProps) {
  const [transportCompanies, setTransportCompanies] = useState<SelectOption[]>([]);
  const [purchaseCompanies, setPurchaseCompanies] = useState<SelectOption[]>([]);
  const [items, setItems] = useState<PackagingItem[]>([]);
  const [editingItem, setEditingItem] = useState<PackagingItem | null>(null);
  const [arrivalFilter, setArrivalFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  async function loadPackagingData() {
    const [transportOptions, purchaseOptions, packagingItems] = await Promise.all([
      invoke<SelectOption[]>("list_packaging_transport_company_options"),
      invoke<SelectOption[]>("list_packaging_purchase_company_options"),
      invoke<PackagingItem[]>("list_packaging_items"),
    ]);

    setTransportCompanies(transportOptions);
    setPurchaseCompanies(purchaseOptions);
    setItems(packagingItems);
  }

  useEffect(() => {
    queueMicrotask(() => {
      loadPackagingData().catch(error => setStatus(String(error)));
    });
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesArrival = arrivalFilter === "all"
        || (arrivalFilter === "pending" && !item.has_arrived)
        || (arrivalFilter === "arrived" && item.has_arrived);
      const matchesSearch = !normalizedSearch
        || [
          item.description,
          item.transport_company_label,
          item.purchase_company_label,
          formatDisplayDate(item.start_date),
        ].some(value => value.toLowerCase().includes(normalizedSearch));

      return matchesArrival && matchesSearch;
    });
  }, [arrivalFilter, items, search]);

  async function handleSaved() {
    await loadPackagingData();
    onCloseEntryDialog();
    setEditingItem(null);
  }

  async function handleDataChanged() {
    await loadPackagingData();
  }

  async function removeItem(id: string) {
    try {
      await invoke("remove_packaging_item", { id });
      setStatus("");
      await loadPackagingData();
    }
    catch (error) {
      setStatus(String(error));
    }
  }

  async function toggleItemArrival(item: PackagingItem) {
    try {
      await invoke("update_packaging_item", {
        item: {
          description: item.description,
          has_arrived: !item.has_arrived,
          id: item.id,
          purchase_company: item.purchase_company,
          start_date: item.start_date,
          transport_company: item.transport_company,
        },
      });
      setStatus("");
      await loadPackagingData();
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
                placeholder="Search packaging..."
                value={search}
              />
            </label>

            <Select onValueChange={setArrivalFilter} value={arrivalFilter}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All packages</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="arrived">Arrived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map(item => (
              <PackagingItemCard
                item={item}
                key={item.id}
                onEdit={() => setEditingItem(item)}
                onRemove={() => removeItem(item.id)}
                onToggleArrival={() => toggleItemArrival(item)}
              />
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="flex min-h-64 items-center justify-center rounded-md border border-dashed border-border bg-card text-xs text-muted-foreground">
              No packages found.
            </div>
          )}
        </div>
      </section>

      {status && <p className="mt-3 text-xs text-destructive">{status}</p>}

      {isEntryDialogOpen && (
        <PackagingItemDialog
          onClose={onCloseEntryDialog}
          onSaved={handleSaved}
          purchaseCompanies={purchaseCompanies}
          transportCompanies={transportCompanies}
        />
      )}

      {editingItem && (
        <PackagingItemDialog
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={handleSaved}
          purchaseCompanies={purchaseCompanies}
          transportCompanies={transportCompanies}
        />
      )}

      {isDataDialogOpen && (
        <PackagingDataDialog
          onChanged={handleDataChanged}
          onClose={onCloseDataDialog}
          purchaseCompanies={purchaseCompanies}
          transportCompanies={transportCompanies}
        />
      )}
    </>
  );
}

function PackagingItemCard({
  item,
  onEdit,
  onRemove,
  onToggleArrival,
}: {
  item: PackagingItem;
  onEdit: () => void;
  onRemove: () => void;
  onToggleArrival: () => void;
}) {
  const ageLevel = packageAgeLevel(item);

  return (
    <article
      className={[
        "grid min-h-44 gap-3 rounded-md border p-3 transition",
        item.has_arrived
          ? "border-green-200 bg-green-50"
          : ageLevel === "high"
            ? "border-red-200 bg-red-50"
            : ageLevel === "medium"
              ? "border-yellow-200 bg-yellow-50"
              : "border-border bg-card",
      ].join(" ")}
    >
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <h2 className="line-clamp-2 text-sm leading-5 text-foreground">{item.description}</h2>
          {item.has_arrived && (
            <CheckCircle2 aria-label="Arrived" className="size-5 shrink-0 text-green-600" />
          )}
        </div>

        <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
          <p>
            Start:
            {" "}
            {formatDisplayDate(item.start_date)}
          </p>
          <p>
            Transport:
            {" "}
            {item.transport_company_label}
          </p>
          <p>
            Bought at:
            {" "}
            {item.purchase_company_label}
          </p>
          {!item.has_arrived && (
            <p>
              Waiting:
              {" "}
              {daysSince(item.start_date)}
              {" days"}
            </p>
          )}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-end gap-2">
        <button
          className={[
            "flex h-9 items-center justify-center gap-2 rounded-md border border-border px-3 text-xs transition hover:bg-accent",
            item.has_arrived ? "text-green-700" : "text-foreground",
          ].join(" ")}
          onClick={onToggleArrival}
          type="button"
        >
          <CheckCircle2 aria-hidden="true" className="size-4" />
          {item.has_arrived ? "Mark pending" : "Mark arrived"}
        </button>
        <button
          aria-label="Edit package"
          className="flex size-9 items-center justify-center rounded-md border border-border transition hover:bg-accent"
          onClick={onEdit}
          type="button"
        >
          <Pencil aria-hidden="true" className="size-4" />
        </button>
        <button
          aria-label="Remove package"
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

function PackagingItemDialog({
  item,
  onClose,
  onSaved,
  purchaseCompanies,
  transportCompanies,
}: {
  item?: PackagingItem;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  purchaseCompanies: SelectOption[];
  transportCompanies: SelectOption[];
}) {
  const isEditing = Boolean(item);
  const [transportCompany, setTransportCompany] = useState(() => item?.transport_company ?? transportCompanies[0]?.value ?? "");
  const [startDate, setStartDate] = useState(item?.start_date ?? todayInputValue());
  const [purchaseCompany, setPurchaseCompany] = useState(() => item?.purchase_company ?? purchaseCompanies[0]?.value ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [hasArrived, setHasArrived] = useState(item?.has_arrived ?? false);
  const [error, setError] = useState("");
  const selectedTransportCompany = transportCompany || transportCompanies[0]?.value || "";
  const selectedPurchaseCompany = purchaseCompany || purchaseCompanies[0]?.value || "";

  async function saveItem() {
    try {
      const payload = {
        description,
        has_arrived: hasArrived,
        purchase_company: selectedPurchaseCompany,
        start_date: startDate,
        transport_company: selectedTransportCompany,
      };

      if (item) {
        await invoke("update_packaging_item", {
          item: {
            ...payload,
            id: item.id,
          },
        });
      }
      else {
        await invoke("add_packaging_item", { item: payload });
      }
      setError("");
      await onSaved();
    }
    catch (saveError) {
      setError(String(saveError));
    }
  }

  return (
    <Modal onClose={onClose} title={isEditing ? "Edit package" : "New package"}>
      <div className="grid gap-7">
        <div className="grid gap-5">
          <Field label="Transport company">
            <Select onValueChange={setTransportCompany} value={selectedTransportCompany}>
              <SelectTrigger>
                <SelectValue placeholder="Select transport company" />
              </SelectTrigger>
              <SelectContent>
                {transportCompanies.map(company => (
                  <SelectItem key={company.value} value={company.value}>
                    {company.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Start date">
            <DatePicker onChange={setStartDate} value={startDate} />
          </Field>

          <Field label="Bought at">
            <Select onValueChange={setPurchaseCompany} value={selectedPurchaseCompany}>
              <SelectTrigger>
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                {purchaseCompanies.map(company => (
                  <SelectItem key={company.value} value={company.value}>
                    {company.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Description">
            <input
              className="h-8 rounded-md border border-border bg-card px-3 text-xs outline-none"
              onChange={event => setDescription(event.currentTarget.value)}
              placeholder="Package description"
              value={description}
            />
          </Field>

          <label className="flex items-center gap-3 text-xs text-muted-foreground">
            <input
              checked={hasArrived}
              className="size-4 accent-primary"
              onChange={event => setHasArrived(event.currentTarget.checked)}
              type="checkbox"
            />
            Package has arrived
          </label>
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
            disabled={!selectedTransportCompany || !selectedPurchaseCompany}
            onClick={saveItem}
            type="button"
          >
            {isEditing
              ? <Save aria-hidden="true" className="size-5" />
              : <BadgePlus aria-hidden="true" className="size-5" />}
            {isEditing ? "Save package" : "Add package"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function PackagingDataDialog({
  onChanged,
  onClose,
  purchaseCompanies,
  transportCompanies,
}: {
  onChanged: () => void | Promise<void>;
  onClose: () => void;
  purchaseCompanies: SelectOption[];
  transportCompanies: SelectOption[];
}) {
  const [activeSection, setActiveSection] = useState<DataSection>("transport");

  return (
    <Modal onClose={onClose} title="Manage packaging data">
      <div className="grid gap-5">
        <div className="grid grid-cols-2 gap-2 rounded-md bg-muted p-1">
          <button
            className={[
              "h-8 rounded-md px-3 text-xs transition",
              activeSection === "transport" ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
            onClick={() => setActiveSection("transport")}
            type="button"
          >
            Transport
          </button>
          <button
            className={[
              "h-8 rounded-md px-3 text-xs transition",
              activeSection === "purchase" ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
            onClick={() => setActiveSection("purchase")}
            type="button"
          >
            Bought at
          </button>
        </div>

        {activeSection === "transport" && (
          <OptionManager
            addCommand="add_packaging_transport_company_option"
            emptyLabel="No transport companies registered."
            invokeKey="company"
            onChanged={onChanged}
            options={transportCompanies}
            placeholder="New transport company"
            removeCommand="remove_packaging_transport_company_option"
            updateCommand="update_packaging_transport_company_option"
          />
        )}

        {activeSection === "purchase" && (
          <OptionManager
            addCommand="add_packaging_purchase_company_option"
            emptyLabel="No purchase companies registered."
            invokeKey="company"
            onChanged={onChanged}
            options={purchaseCompanies}
            placeholder="New purchase company"
            removeCommand="remove_packaging_purchase_company_option"
            updateCommand="update_packaging_purchase_company_option"
          />
        )}
      </div>

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
  invokeKey,
  onChanged,
  options,
  placeholder,
  removeCommand,
  updateCommand,
}: {
  addCommand: string;
  emptyLabel: string;
  invokeKey: string;
  onChanged: () => void | Promise<void>;
  options: SelectOption[];
  placeholder: string;
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
        [invokeKey]: { color: newColor, label: newLabel },
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
        [invokeKey]: option,
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
          placeholder={placeholder}
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

function packageAgeLevel(item: PackagingItem) {
  if (item.has_arrived) {
    return "none";
  }

  const days = daysSince(item.start_date);

  if (days > 28) {
    return "high";
  }

  if (days > 14) {
    return "medium";
  }

  return "none";
}

function daysSince(value: string) {
  const date = parseDateValue(value);

  if (!date) {
    return 0;
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return Math.max(0, Math.floor((todayStart.getTime() - date.getTime()) / 86_400_000));
}

function parseDateValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function formatDisplayDate(value: string) {
  const date = parseDateValue(value);

  if (!date) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function todayInputValue() {
  const today = new Date();

  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
}

export default PackagingFeature;
