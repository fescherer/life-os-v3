import { invoke } from "@tauri-apps/api/core";
import { ArrowRightLeft, Save } from "lucide-react";
import { useState } from "react";

import { LifeOSDatePicker } from "../../../components/life-os-ui/date-picker";
import { LifeOSFieldMoney } from "../../../components/life-os-ui/field-money";
import { LifeOSModal } from "../../../components/life-os-ui/modal";
import { LifeOSSelect } from "../../../components/life-os-ui/select";
import { BankOption } from "../types";

export function TransferDialog({
  banks,
  onClose,
  onSaved,
  transfer,
}: {
  banks: BankOption[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  transfer?: {
    date: string;
    from_bank: string;
    id: string;
    to_bank: string;
    value: number;
  };
}) {
  const isEditing = Boolean(transfer);
  const [date, setDate] = useState(() => transfer?.date ?? new Date().toISOString().slice(0, 10));
  const [fromBank, setFromBank] = useState(() => transfer?.from_bank ?? banks[0]?.value ?? "");
  const [toBank, setToBank] = useState(() => transfer?.to_bank ?? banks[1]?.value ?? "");
  const [value, setValue] = useState(transfer?.value ?? 0);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function submitTransfer() {
    if (!fromBank || !toBank) {
      setError("Cadastre pelo menos dois bancos antes de criar uma transferência.");
      return;
    }

    if (fromBank === toBank) {
      setError("Selecione bancos diferentes para a transferência.");
      return;
    }

    if (value <= 0) {
      setError("Informe um valor maior que zero.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      if (transfer) {
        await invoke("update_financial_transfer", {
          transfer: { date, from_bank: fromBank, id: transfer.id, to_bank: toBank, value },
        });
      }
      else {
        await invoke("add_financial_transfer", {
          transfer: { date, from_bank: fromBank, to_bank: toBank, value },
        });
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
    <LifeOSModal onClose={onClose} title={isEditing ? "Editar transferência" : "Nova transferência"}>
      <div className="mx-auto grid max-w-xl gap-7">
        <label className="grid gap-3 text-sm text-muted-foreground">
          Data
          <LifeOSDatePicker onChange={setDate} value={date} />
        </label>

        <div className="grid gap-6 md:grid-cols-2">
          <label className="grid gap-3 text-sm text-muted-foreground">
            Banco de origem
            <LifeOSSelect
              onValueChange={setFromBank}
              options={banks}
              placeholder="Selecione um banco"
              value={fromBank}
            />
          </label>
          <label className="grid gap-3 text-sm text-muted-foreground">
            Banco de destino
            <LifeOSSelect
              onValueChange={setToBank}
              options={banks}
              placeholder="Selecione um banco"
              value={toBank}
            />
          </label>
        </div>

        <label className="grid gap-3 text-sm text-muted-foreground">
          Valor
          <LifeOSFieldMoney onValueChange={setValue} value={value} />
        </label>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex items-center justify-between gap-4">
          <button className="text-sm text-muted-foreground" onClick={onClose} type="button">
            Cancelar
          </button>
          <button
            className="flex h-10 min-w-56 items-center justify-center gap-3 rounded-md bg-primary px-4 text-sm text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            disabled={isSaving}
            onClick={submitTransfer}
            type="button"
          >
            {isEditing
              ? <Save aria-hidden="true" className="size-5" />
              : <ArrowRightLeft aria-hidden="true" className="size-5" />}
            {isEditing ? "Salvar transferência" : "Adicionar transferência"}
          </button>
        </div>
      </div>
    </LifeOSModal>
  );
}
