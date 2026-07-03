import { invoke } from "@tauri-apps/api/core";
import {
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { EntryDialog } from "./components/new_financial";
import { BankOption, FinancialEntryType } from "./types";
import { ChartFinancialRecords } from "./components/chart-financial-records";
import { SummaryCards } from "./components/summary-cards";

type EntryRange = "12-months" | "30-days" | "all";

type FinancialEntry = {
  id: string;
  created_at: string;
  updated_at: string;
  type: FinancialEntryType;
  date: string;
  bank: string;
  value: number;
  description: string;
  bank_label: string;
  bank_color: string;
};

type FinancialFeatureProps = {
  isDataDialogOpen: boolean;
  isEntryDialogOpen: boolean;
  onCloseDataDialog: () => void;
  onCloseEntryDialog: () => void;
};

const typeStyles: Record<FinancialEntryType, string> = {
  expense: "bg-red-300 text-primary-foreground",
  income: "bg-green-300 text-primary",
  investment: "bg-blue-300 text-primary",
};

function FinancialFeature({
  isDataDialogOpen,
  isEntryDialogOpen,
  onCloseDataDialog,
  onCloseEntryDialog,
}: FinancialFeatureProps) {
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<FinancialEntry | null>(null);
  const [entryRange, setEntryRange] = useState<EntryRange>("30-days");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  async function loadFinancialData() {
    const [bankOptions, financialEntries] = await Promise.all([
      invoke<BankOption[]>("list_bank_options"),
      invoke<FinancialEntry[]>("list_financial_entries"),
    ]);

    setBanks(bankOptions);
    setEntries(financialEntries);
  }

  useEffect(() => {
    queueMicrotask(() => {
      loadFinancialData().catch(error => setStatus(String(error)));
    });
  }, []);

  const filteredEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return entries.filter((entry) => {
      const matchesDate = entryRange === "all" || isEntryInRange(entry.date, entryRange);
      const matchesSearch = !normalizedSearch || [
        entry.description,
        entry.bank_label,
        entry.type,
        formatDisplayDate(entry.date),
        formatCurrency(entry.value),
      ].some(value => value.toLowerCase().includes(normalizedSearch));

      return matchesDate && matchesSearch;
    });
  }, [entries, entryRange, search]);

  const descriptions = useMemo(
    () => Array.from(new Set(entries.map(entry => entry.description.trim()).filter(Boolean))),
    [entries],
  );

  async function handleEntrySaved() {
    await loadFinancialData();
    onCloseEntryDialog();
    setEditingEntry(null);
  }

  async function handleBanksChanged(nextBanks: BankOption[]) {
    setBanks(nextBanks);
    await loadFinancialData();
  }

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-5">
        <div className="grid gap-4 lg:col-span-2">
          <ChartFinancialRecords entries={entries} />
          <SummaryCards entries={entries} />
        </div>

        <div className="grid content-start gap-4 lg:col-span-3">
          <div className="flex gap-4 overflow-hidden">
            {banks.map(bank => (
              <article
                className="min-w-44 rounded-md border border-border bg-sidebar p-2"
                key={bank.value}
              >
                <strong className="block text-xl leading-none" style={{ color: bank.color }}>
                  {bank.label}
                </strong>
                <p className="mt-2 text-sm">{formatCurrency(totalForBank(entries, bank.value))}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
                  <span className="rounded bg-muted px-3 py-2">+ 12%</span>
                  <span className="rounded bg-muted px-3 py-2">+ 2%</span>
                </div>
              </article>
            ))}
          </div>

          <section className="min-h-96 rounded-md border border-border bg-sidebar p-3">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base">Lançamentos</h2>
              <Select
                onValueChange={value => setEntryRange(value as EntryRange)}
                value={entryRange}
              >
                <SelectTrigger className="h-8 w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30-days">Ultimos 30 dias</SelectItem>
                  <SelectItem value="12-months">Ultimos 12 meses</SelectItem>
                  <SelectItem value="all">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <label className="mt-4 flex h-8 items-center gap-2 rounded-md border border-border px-2 text-muted-foreground">
              <Search aria-hidden="true" className="size-4" />
              <input
                className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                onChange={event => setSearch(event.currentTarget.value)}
                placeholder="Pesquisar ..."
                value={search}
              />
            </label>

            <div className="mt-6 overflow-x-auto border-t border-border pt-5">
              <table className="w-full min-w-xl text-left text-xs">
                <thead className="text-sm text-muted-foreground">
                  <tr>
                    <th className="pb-3">Data</th>
                    <th className="pb-3">Tipo</th>
                    <th className="pb-3">Banco</th>
                    <th className="pb-3">Valor</th>
                    <th className="pb-3">Descrição</th>
                    <th className="pb-3"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map(entry => (
                    <tr key={entry.id}>
                      <td className="py-2" title={entry.date}>{formatDisplayDate(entry.date)}</td>
                      <td className="py-2">
                        <span className={`rounded-full px-2 py-1 text-xs ${typeStyles[entry.type]}`}>
                          {entry.type}
                        </span>
                      </td>
                      <td className="py-2">
                        <span
                          className="rounded-full px-2 py-1 text-xs text-primary-foreground"
                          style={{ backgroundColor: entry.bank_color }}
                        >
                          {entry.bank_label}
                        </span>
                      </td>
                      <td className="py-2">
                        {entry.type === "expense" ? "- " : ""}
                        {formatCurrency(entry.value)}
                      </td>
                      <td className="py-2">{entry.description}</td>
                      <td className="py-2 text-right">
                        <button
                          aria-label="Editar lançamento"
                          className="inline-flex size-8 items-center justify-center rounded-md transition hover:bg-muted"
                          onClick={() => setEditingEntry(entry)}
                          title="Editar lançamento"
                          type="button"
                        >
                          <Pencil aria-hidden="true" className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredEntries.length === 0 && (
                    <tr>
                      <td className="py-8 text-center text-muted-foreground" colSpan={6}>
                        Nenhum lançamento encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>

      {status && <p className="mt-3 text-xs text-destructive">{status}</p>}

      {isEntryDialogOpen && (
        <EntryDialog
          banks={banks}
          descriptions={descriptions}
          onClose={onCloseEntryDialog}
          onSaved={handleEntrySaved}
        />
      )}

      {editingEntry && (
        <EntryDialog
          banks={banks}
          descriptions={descriptions}
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSaved={handleEntrySaved}
        />
      )}

      {isDataDialogOpen && (
        <BankDialog
          banks={banks}
          onBanksChanged={handleBanksChanged}
          onClose={onCloseDataDialog}
        />
      )}
    </>
  );
}

function BankDialog({
  banks,
  onBanksChanged,
  onClose,
}: {
  banks: BankOption[];
  onBanksChanged: (banks: BankOption[]) => void | Promise<void>;
  onClose: () => void;
}) {
  const [draftBanks, setDraftBanks] = useState(banks);
  const [newBankColor, setNewBankColor] = useState("#4f4749");
  const [newBankLabel, setNewBankLabel] = useState("");
  const [error, setError] = useState("");

  async function addBank() {
    try {
      const nextBanks = await invoke<BankOption[]>("add_bank_option", {
        bank: { color: newBankColor, label: newBankLabel },
      });
      setDraftBanks(nextBanks);
      setNewBankLabel("");
      await onBanksChanged(nextBanks);
    }
    catch (addError) {
      setError(String(addError));
    }
  }

  async function updateBank(bank: BankOption) {
    try {
      const nextBanks = await invoke<BankOption[]>("update_bank_option", { bank });
      setDraftBanks(nextBanks);
      await onBanksChanged(nextBanks);
    }
    catch (updateError) {
      setError(String(updateError));
    }
  }

  async function removeBank(value: string) {
    try {
      const nextBanks = await invoke<BankOption[]>("remove_bank_option", { value });
      setDraftBanks(nextBanks);
      await onBanksChanged(nextBanks);
    }
    catch (removeError) {
      setError(String(removeError));
    }
  }

  return (
    <Modal onClose={onClose} title="Gerenciar dados">
      <div className="grid gap-5">
        <div className="grid gap-3">
          {draftBanks.map(bank => (
            <div className="flex flex-col gap-2 rounded-md border border-border p-3 md:flex-row" key={bank.value}>
              <input
                className="h-9 rounded-md border border-border bg-sidebar px-3 text-xs outline-none"
                onChange={(event) => {
                  setDraftBanks(current =>
                    current.map(option =>
                      option.value === bank.value
                        ? { ...option, label: event.currentTarget.value }
                        : option,
                    ),
                  );
                }}
                value={bank.label}
              />
              <input
                className="h-9 w-16 rounded-md border border-border bg-sidebar p-1"
                onChange={(event) => {
                  setDraftBanks(current =>
                    current.map(option =>
                      option.value === bank.value
                        ? { ...option, color: event.currentTarget.value }
                        : option,
                    ),
                  );
                }}
                type="color"
                value={bank.color}
              />
              <div className="flex gap-2">
                <button
                  className="h-9 rounded-md border border-border px-3 text-xs"
                  onClick={() => updateBank(bank)}
                  type="button"
                >
                  Salvar
                </button>
                <button
                  className="flex h-9 items-center rounded-md border border-border px-3 text-destructive"
                  onClick={() => removeBank(bank.value)}
                  type="button"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 rounded-md border border-border p-3 md:flex-row">
          <input
            className="h-9 rounded-md border border-border bg-sidebar px-3 text-xs outline-none"
            onChange={event => setNewBankLabel(event.currentTarget.value)}
            placeholder="Novo banco"
            value={newBankLabel}
          />
          <input
            className="h-9 w-16 rounded-md border border-border bg-sidebar p-1"
            onChange={event => setNewBankColor(event.currentTarget.value)}
            type="color"
            value={newBankColor}
          />
          <button
            className="h-9 rounded-md bg-primary px-4 text-xs text-primary-foreground"
            onClick={addBank}
            type="button"
          >
            Adicionar
          </button>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </Modal>
  );
}

function Modal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-primary/25 p-6">
      <section className="w-full max-w-2xl rounded-md border border-border bg-sidebar p-5 shadow-lg">
        <header className="mb-5 flex items-center justify-between border-b border-border pb-4">
          <h2 className="text-base">{title}</h2>
          <button className="text-muted-foreground" onClick={onClose} type="button">
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function totalForBank(entries: FinancialEntry[], bank: string) {
  return entries
    .filter(entry => entry.bank === bank)
    .reduce((sum, entry) => {
      if (entry.type === "expense") {
        return sum - entry.value;
      }

      return sum + entry.value;
    }, 0);
}

function isEntryInRange(value: string, range: Exclude<EntryRange, "all">) {
  const entryDate = parseEntryDate(value);
  const today = new Date();
  const firstDate = range === "30-days"
    ? new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29)
    : new Date(today.getFullYear(), today.getMonth() - 11, 1);

  return entryDate >= firstDate && entryDate <= today;
}

function parseEntryDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(cents / 100);
}

function formatDisplayDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default FinancialFeature;
