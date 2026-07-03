import { useState } from "react";
import { BankOption, FinancialEntryType } from "../types";
import { invoke } from "@tauri-apps/api/core";
import { LifeOSModal } from "../../../components/life-os-ui/modal";
import { BadgePlus, Save } from "lucide-react";
import { LifeOSDatePicker } from "../../../components/life-os-ui/date-picker";
import { entryTypes } from "../constants";
import { LifeOSCombobox } from "../../../components/life-os-ui/combobox";
import { LifeOSFieldMoney } from "../../../components/life-os-ui/field-money";
import { LifeOSSelect } from "../../../components/life-os-ui/select";

export function EntryDialog({
  banks,
  descriptions,
  entry,
  onClose,
  onSaved,
}: {
  banks: BankOption[];
  descriptions: string[];
  entry?: {
    bank: string;
    date: string;
    description: string;
    id: string;
    type: FinancialEntryType;
    value: number;
  };
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const isEditing = Boolean(entry);
  const [entryType, setEntryType] = useState<FinancialEntryType>(entry?.type ?? "income");
  const [date, setDate] = useState(() => entry?.date ?? new Date().toISOString().slice(0, 10));
  const [bank, setBank] = useState(() => entry?.bank ?? banks[0]?.value ?? "");
  const [value, setValue] = useState(entry?.value ?? 0);
  const [description, setDescription] = useState(entry?.description ?? "");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function submitEntry() {
    if (!bank) {
      setError("Cadastre um banco antes de criar lançamentos.");
      return;
    }

    if (value <= 0) {
      setError("Informe um valor maior que zero.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const financialEntry = {
        bank,
        date,
        description,
        entry_type: entryType,
        value,
      };

      if (entry) {
        await invoke("update_financial_entry", {
          entry: { ...financialEntry, id: entry.id },
        });
      }
      else {
        await invoke("add_financial_entry", { entry: financialEntry });
      }
      await onSaved();
    }
    catch (submitError) {
      setError(String(submitError));
    }
    finally {
      setIsSaving(false);
    }
  }

  return (
    <LifeOSModal onClose={onClose} title={isEditing ? "Editar lançamento" : "Novo lançamento"}>
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
            <LifeOSDatePicker onChange={setDate} value={date} />
          </label>
          <label className="grid gap-3 text-sm text-muted-foreground">
            Banco
            <LifeOSSelect
              onValueChange={setBank}
              options={banks}
              placeholder="Selecione um banco"
              value={bank}
            />
          </label>
        </div>

        <label className="grid gap-3 text-sm text-muted-foreground">
          Valor
          <LifeOSFieldMoney onValueChange={setValue} value={value} />
        </label>

        <label className="grid gap-3 text-sm text-muted-foreground">
          Descrição
          <LifeOSCombobox
            items={descriptions}
            onValueChange={setDescription}
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
            {isEditing
              ? <Save aria-hidden="true" className="size-5" />
              : <BadgePlus aria-hidden="true" className="size-5" />}
            {isEditing ? "Salvar lançamento" : "Adicionar lançamento"}
          </button>
        </div>
      </div>
    </LifeOSModal>
  );
}
