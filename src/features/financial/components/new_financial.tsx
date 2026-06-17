import { useState } from "react";
import { BankOption, FinancialEntryType } from "../types";
import { invoke } from "@tauri-apps/api/core";
import { LifeOSModal } from "../../../components/life-os-ui/modal";
import { BadgePlus } from "lucide-react";
import { DatePicker } from "../../../components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { entryTypes } from "../constants";

export function EntryDialog({
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
    <LifeOSModal onClose={onClose} title="Novo lançamento">
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
            <DatePicker onChange={setDate} value={date} />
          </label>
          <label className="grid gap-3 text-sm text-muted-foreground">
            Banco
            <Select onValueChange={setBank} value={bank}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um banco" />
              </SelectTrigger>
              <SelectContent>
                {banks.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
    </LifeOSModal>
  );
}

function parseCurrencyToCents(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const number = Number(normalized.replace(/[^\d.]/g, ""));

  if (Number.isNaN(number)) {
    return 0;
  }

  return Math.round(number * 100);
}
