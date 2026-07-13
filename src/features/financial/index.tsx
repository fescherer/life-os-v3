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
import { TransferDialog } from "./components/new_transfer";
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
  isTransferDialogOpen: boolean;
  onCloseDataDialog: () => void;
  onCloseEntryDialog: () => void;
  onCloseTransferDialog: () => void;
};

type FinancialTransferDraft = {
  date: string;
  from_bank: string;
  id: string;
  to_bank: string;
  value: number;
};

const entryRowStyles: Record<FinancialEntryType, string> = {
  expense: "[&>td]:bg-red-300/10 hover:[&>td]:bg-red-300/20",
  income: "[&>td]:bg-green-300/10 hover:[&>td]:bg-green-300/20",
  investment: "[&>td]:bg-blue-300/12 hover:[&>td]:bg-blue-300/22",
  transfer: "[&>td]:bg-purple-300/12 hover:[&>td]:bg-purple-300/22",
};

const entryTypeDotStyles: Record<FinancialEntryType, string> = {
  expense: "bg-red-500",
  income: "bg-green-500",
  investment: "bg-blue-500",
  transfer: "bg-purple-500",
};

const entryValueStyles: Record<FinancialEntryType, string> = {
  expense: "text-red-600",
  income: "text-green-600",
  investment: "text-blue-600",
  transfer: "text-purple-600",
};

function FinancialFeature({
  isDataDialogOpen,
  isEntryDialogOpen,
  isTransferDialogOpen,
  onCloseDataDialog,
  onCloseEntryDialog,
  onCloseTransferDialog,
}: FinancialFeatureProps) {
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<FinancialEntry | null>(null);
  const [editingTransfer, setEditingTransfer] = useState<FinancialTransferDraft | null>(null);
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

  async function handleTransferSaved() {
    await loadFinancialData();
    onCloseTransferDialog();
    setEditingTransfer(null);
  }

  async function handleBanksChanged(nextBanks: BankOption[]) {
    setBanks(nextBanks);
    await loadFinancialData();
  }

  async function removeEntry(entry: FinancialEntry) {
    try {
      if (entry.type === "transfer") {
        await invoke("remove_financial_transfer", { id: entry.id });
      }
      else {
        await invoke("remove_financial_entry", { id: entry.id });
      }
      await loadFinancialData();
      setStatus("");
    }
    catch (removeError) {
      setStatus(String(removeError));
    }
  }

  function editTransfer(entry: FinancialEntry) {
    const transfer = buildTransferDraft(entries, entry);

    if (!transfer) {
      setStatus("Transferência não encontrada.");
      return;
    }

    setEditingTransfer(transfer);
  }

  return (
    <>
      <section className="grid h-[calc(100vh-8.5rem)] min-h-0 gap-4 overflow-hidden lg:grid-cols-5">
        <div className="grid min-h-0 gap-4 overflow-y-auto pr-1 lg:col-span-2">
          <ChartFinancialRecords entries={entries} />
          <SummaryCards entries={entries} />
        </div>

        <div className="grid min-h-0 gap-4 lg:col-span-3 lg:grid-rows-[auto_minmax(0,1fr)]">
          <div className="flex gap-4 overflow-hidden">
            {banks.map((bank) => {
              const bankTotal = totalForBank(entries, bank.value);
              const monthPercent = periodPercentForBank(entries, bank.value, "month", bankTotal);
              const yearPercent = periodPercentForBank(entries, bank.value, "year", bankTotal);

              return (
                <article
                  className="min-w-48 rounded-md border border-border bg-sidebar p-3"
                  key={bank.value}
                >
                  <strong className="block text-xl leading-none" style={{ color: bank.color }}>
                    {bank.label}
                  </strong>
                  <p className="mt-2 text-sm">{formatCurrency(bankTotal)}</p>
                  <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-border/70 pt-2">
                    <BankPeriodStat label="Mês atual" prefix="M" value={monthPercent} />
                    <BankPeriodStat label="Últimos 12 meses" prefix="Y" value={yearPercent} />
                  </div>
                </article>
              );
            })}
          </div>

          <section className="flex min-h-0 flex-col rounded-md border border-border bg-sidebar p-3">
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

            <div className="mt-6 min-h-0 flex-1 overflow-auto border-t border-border pt-5">
              <table className="w-full min-w-xl text-left text-xs">
                <thead className="sticky top-0 z-10 bg-sidebar text-sm text-muted-foreground">
                  <tr>
                    <th className="w-8 pb-3"><span className="sr-only">Tipo</span></th>
                    <th className="pb-3">Data</th>
                    <th className="pb-3">Banco</th>
                    <th className="pb-3">Valor</th>
                    <th className="pb-3">Descrição</th>
                    <th className="pb-3"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => {
                    const entryValue = signedEntryValue(entry);

                    return (
                      <tr
                        className={`[&>td]:px-2 [&>td]:transition [&>td:first-child]:rounded-l-md [&>td:last-child]:rounded-r-md ${entryRowStyles[entry.type]}`}
                        key={entry.id}
                        title={entry.type}
                      >
                        <td className="py-2">
                          <span
                            aria-label={entry.type}
                            className={`block size-2.5 rounded-full ${entryTypeDotStyles[entry.type]}`}
                            title={entry.type}
                          />
                        </td>
                        <td className="py-2" title={entry.date}>{formatDisplayDate(entry.date)}</td>
                        <td className="py-2">
                          {entry.bank_label}
                        </td>
                        <td className={`py-2 tabular-nums ${entryValueStyles[entry.type]}`}>
                          <span className="inline-grid grid-cols-[0.75rem_auto] justify-start">
                            <span>{entryValue < 0 ? "-" : ""}</span>
                            <span>{formatCurrency(Math.abs(entryValue))}</span>
                          </span>
                        </td>
                        <td className="py-2">{entry.description}</td>
                        <td className="py-2 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              aria-label={entry.type === "transfer" ? "Editar transferência" : "Editar lançamento"}
                              className="inline-flex size-8 items-center justify-center rounded-md transition hover:bg-muted"
                              onClick={() => {
                                if (entry.type === "transfer") {
                                  editTransfer(entry);
                                  return;
                                }

                                setEditingEntry(entry);
                              }}
                              title={entry.type === "transfer" ? "Editar transferência" : "Editar lançamento"}
                              type="button"
                            >
                              <Pencil aria-hidden="true" className="size-4" />
                            </button>
                            <button
                              aria-label={entry.type === "transfer" ? "Remover transferência" : "Remover lançamento"}
                              className="inline-flex size-8 items-center justify-center rounded-md text-destructive transition hover:bg-muted"
                              onClick={() => removeEntry(entry)}
                              title={entry.type === "transfer" ? "Remover transferência" : "Remover lançamento"}
                              type="button"
                            >
                              <Trash2 aria-hidden="true" className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
            <p className="border-t border-border pt-3 text-xs text-muted-foreground">
              Mostrando
              {" "}
              {filteredEntries.length}
              {" "}
              {filteredEntries.length === 1 ? "lançamento" : "lançamentos"}
            </p>
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

      {isTransferDialogOpen && (
        <TransferDialog
          banks={banks}
          onClose={onCloseTransferDialog}
          onSaved={handleTransferSaved}
        />
      )}

      {editingTransfer && (
        <TransferDialog
          banks={banks}
          onClose={() => setEditingTransfer(null)}
          onSaved={handleTransferSaved}
          transfer={editingTransfer}
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

function BankPeriodStat({
  label,
  prefix,
  value,
}: {
  label: string;
  prefix: string;
  value: number;
}) {
  const formattedValue = `${prefix} ${formatSignedPercent(value)}`;

  return (
    <span
      aria-label={`${label}: ${formatSignedPercent(value)}`}
      className={`rounded border border-border/60 bg-muted/35 px-2 py-1 text-center text-xs leading-none tabular-nums ${percentColorClass(value)}`}
      title={label}
    >
      {formattedValue}
    </span>
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
    .reduce((sum, entry) => sum + signedEntryValue(entry), 0);
}

function periodPercentForBank(
  entries: FinancialEntry[],
  bank: string,
  period: "month" | "year",
  bankTotal: number,
) {
  if (bankTotal === 0) {
    return 0;
  }

  const today = new Date();
  const firstDate = period === "month"
    ? new Date(today.getFullYear(), today.getMonth(), 1)
    : new Date(today.getFullYear(), today.getMonth() - 11, 1);
  const periodTotal = entries
    .filter(entry => entry.bank === bank && isDateBetween(parseEntryDate(entry.date), firstDate, today))
    .reduce((sum, entry) => sum + signedEntryValue(entry), 0);

  return (periodTotal / Math.abs(bankTotal)) * 100;
}

function signedEntryValue(entry: FinancialEntry) {
  if (entry.type === "expense") {
    return -entry.value;
  }

  return entry.value;
}

function buildTransferDraft(entries: FinancialEntry[], entry: FinancialEntry): FinancialTransferDraft | null {
  const transferId = transferPairId(entry.id);

  if (!transferId) {
    return null;
  }

  const outgoingEntry = entries.find(item => item.id === `${transferId}-out`);
  const incomingEntry = entries.find(item => item.id === `${transferId}-in`);

  if (!outgoingEntry || !incomingEntry) {
    return null;
  }

  return {
    date: outgoingEntry.date,
    from_bank: outgoingEntry.bank,
    id: entry.id,
    to_bank: incomingEntry.bank,
    value: Math.abs(outgoingEntry.value),
  };
}

function transferPairId(id: string) {
  if (id.endsWith("-out")) {
    return id.slice(0, -4);
  }

  if (id.endsWith("-in")) {
    return id.slice(0, -3);
  }

  return null;
}

function isEntryInRange(value: string, range: Exclude<EntryRange, "all">) {
  const entryDate = parseEntryDate(value);
  const today = new Date();
  const firstDate = range === "30-days"
    ? new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29)
    : new Date(today.getFullYear(), today.getMonth() - 11, 1);

  return isDateBetween(entryDate, firstDate, today);
}

function isDateBetween(date: Date, firstDate: Date, lastDate: Date) {
  return date >= firstDate && date <= lastDate;
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

function formatSignedPercent(value: number) {
  const sign = value >= 0 ? "+ " : "- ";

  return `${sign}${formatPercent(Math.abs(value))}`;
}

function percentColorClass(value: number) {
  if (value > 0) {
    return "text-green-600";
  }

  if (value < 0) {
    return "text-red-500";
  }

  return "text-muted-foreground";
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "percent",
  }).format(value / 100);
}

export default FinancialFeature;
