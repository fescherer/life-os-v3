import { invoke } from "@tauri-apps/api/core";
import {
  ArrowDown,
  ArrowUp,
  BadgePlus,
  Landmark,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type FinancialEntryType = "income" | "expense" | "investment";

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

type BankOption = {
  value: string;
  label: string;
  color: string;
};

type FinancialFeatureProps = {
  isDataDialogOpen: boolean;
  isEntryDialogOpen: boolean;
  onCloseDataDialog: () => void;
  onCloseEntryDialog: () => void;
};

const entryTypes: Array<{ icon: typeof ArrowUp; label: string; value: FinancialEntryType }> = [
  { icon: ArrowUp, label: "Income", value: "income" },
  { icon: ArrowDown, label: "Expense", value: "expense" },
  { icon: Landmark, label: "Investments", value: "investment" },
];

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

    if (!normalizedSearch) {
      return entries;
    }

    return entries.filter(entry =>
      [
        entry.description,
        entry.bank_label,
        entry.type,
        formatDisplayDate(entry.date),
        formatCurrency(entry.value),
      ].some(value => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [entries, search]);

  const totals = useMemo(() => {
    const income = entries
      .filter(entry => entry.type === "income")
      .reduce((sum, entry) => sum + entry.value, 0);
    const expense = entries
      .filter(entry => entry.type === "expense")
      .reduce((sum, entry) => sum + entry.value, 0);
    const investment = entries
      .filter(entry => entry.type === "investment")
      .reduce((sum, entry) => sum + entry.value, 0);

    return { expense, income, investment };
  }, [entries]);

  async function handleEntryCreated() {
    await loadFinancialData();
    onCloseEntryDialog();
  }

  async function handleBanksChanged(nextBanks: BankOption[]) {
    setBanks(nextBanks);
    await loadFinancialData();
  }

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-5">
        <div className="grid gap-4 lg:col-span-2">
          <section className="rounded-md border border-border bg-sidebar p-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base text-foreground">Balanço do patrimônio</h2>
              <select className="h-8 rounded-md border border-border bg-sidebar px-3 text-xs text-foreground outline-none">
                <option>12 meses</option>
                <option>6 meses</option>
                <option>30 dias</option>
              </select>
            </div>
            <div className="mt-4 flex h-40 items-end gap-3 rounded-md border border-border px-2 pb-3">
              {Array.from({ length: 12 }, (_, index) => (
                <div
                  className="w-full rounded-sm bg-primary"
                  key={index}
                  style={{ height: `${28 + ((index * 19) % 88)}px` }}
                />
              ))}
            </div>
          </section>

          <SummaryCard
            amount={totals.income}
            icon={ArrowUp}
            iconClassName="text-green-300"
            label="Incomes"
          />
          <SummaryCard
            amount={totals.expense}
            icon={ArrowDown}
            iconClassName="text-red-300"
            isNegative
            label="Expenses"
          />
          <SummaryCard
            amount={totals.investment}
            icon={Landmark}
            iconClassName="text-blue-300"
            label="Investments"
          />
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
              <select className="h-8 rounded-md border border-border bg-sidebar px-3 text-xs text-foreground outline-none">
                <option>Últimos 30 dias</option>
                <option>Últimos 12 meses</option>
                <option>Todos</option>
              </select>
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
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map(entry => (
                    <tr key={entry.id}>
                      <td className="py-2">{formatDisplayDate(entry.date)}</td>
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
                    </tr>
                  ))}
                  {filteredEntries.length === 0 && (
                    <tr>
                      <td className="py-8 text-center text-muted-foreground" colSpan={5}>
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
          onClose={onCloseEntryDialog}
          onCreated={handleEntryCreated}
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

function SummaryCard({
  amount,
  icon: Icon,
  iconClassName,
  isNegative = false,
  label,
}: {
  amount: number;
  icon: typeof ArrowUp;
  iconClassName: string;
  isNegative?: boolean;
  label: string;
}) {
  return (
    <article className="flex min-h-28 items-center gap-5 rounded-md border border-border bg-sidebar p-3">
      <Icon aria-hidden="true" className={`size-8 shrink-0 ${iconClassName}`} strokeWidth={2} />
      <div className="min-w-0 flex-1">
        <h3 className="text-sm text-foreground">{label}</h3>
        <p className="mt-2 text-3xl leading-none">
          {isNegative ? "- " : ""}
          {formatCurrency(amount)}
        </p>
      </div>
      <div className="grid gap-3 text-center text-xs">
        <span className="rounded bg-muted px-5 py-2">+ 2%</span>
        <span className="rounded bg-muted px-5 py-2">+ 12%</span>
      </div>
    </article>
  );
}

function EntryDialog({
  banks,
  onClose,
  onCreated,
}: {
  banks: BankOption[];
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const [entryType, setEntryType] = useState<FinancialEntryType>("income");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [bank, setBank] = useState(() => banks[0]?.value ?? "");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function submitEntry() {
    const cents = parseCurrencyToCents(value);

    if (!bank) {
      setError("Cadastre um banco antes de criar lançamentos.");
      return;
    }

    if (cents <= 0) {
      setError("Informe um valor maior que zero.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await invoke("add_financial_entry", {
        entry: {
          bank,
          date,
          description,
          entry_type: entryType,
          value: cents,
        },
      });
      await onCreated();
    }
    catch (submitError) {
      setError(String(submitError));
    }
    finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} title="Novo lançamento">
      <div className="mx-auto grid max-w-xl gap-7">
        <div className="grid grid-cols-3 rounded-md bg-muted p-1">
          {entryTypes.map((entry) => {
            const TypeIcon = entry.icon;

            return (
              <button
                className={[
                  "flex h-8 items-center justify-center gap-2 rounded text-xs",
                  entryType === entry.value ? "bg-sidebar shadow-sm" : "text-foreground",
                ].join(" ")}
                key={entry.value}
                onClick={() => setEntryType(entry.value)}
                type="button"
              >
                <TypeIcon aria-hidden="true" className="size-4" />
                {entry.label}
              </button>
            );
          })}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <label className="grid gap-3 text-sm text-muted-foreground">
            Data
            <input
              className="h-9 rounded-md border border-border bg-sidebar px-3 text-xs text-foreground outline-none"
              onChange={event => setDate(event.currentTarget.value)}
              type="date"
              value={date}
            />
          </label>
          <label className="grid gap-3 text-sm text-muted-foreground">
            Banco
            <select
              className="h-9 rounded-md border border-border bg-sidebar px-3 text-xs text-foreground outline-none"
              onChange={event => setBank(event.currentTarget.value)}
              value={bank}
            >
              {banks.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="grid gap-3 text-sm text-muted-foreground">
          Valor
          <input
            className="h-9 rounded-md border border-border bg-sidebar px-3 text-xs text-foreground outline-none"
            inputMode="decimal"
            onChange={event => setValue(event.currentTarget.value)}
            placeholder="R$ 4000,00"
            value={value}
          />
        </label>

        <label className="grid gap-3 text-sm text-muted-foreground">
          Descrição
          <textarea
            className="min-h-16 resize-none rounded-md border border-border bg-sidebar px-3 py-2 text-xs text-foreground outline-none"
            onChange={event => setDescription(event.currentTarget.value)}
            placeholder="..."
            value={description}
          />
        </label>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex items-center justify-between gap-4">
          <button className="text-sm text-muted-foreground" onClick={onClose} type="button">
            Cancelar
          </button>
          <button
            className="flex h-10 min-w-56 items-center justify-center gap-3 rounded-md bg-primary px-4 text-sm text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            disabled={isSaving}
            onClick={submitEntry}
            type="button"
          >
            <BadgePlus aria-hidden="true" className="size-5" />
            Adicionar lançamento
          </button>
        </div>
      </div>
    </Modal>
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
  }).format(date);
}

function parseCurrencyToCents(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const number = Number(normalized.replace(/[^\d.]/g, ""));

  if (Number.isNaN(number)) {
    return 0;
  }

  return Math.round(number * 100);
}

export default FinancialFeature;
