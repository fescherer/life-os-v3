import { XIcon } from "lucide-react";

type FieldMoneyProps = {
  onValueChange: (value: number) => void;
  value: number;
};

export function LifeOSFieldMoney({ onValueChange, value }: FieldMoneyProps) {
  return (
    <div className="relative flex h-9 w-full items-center rounded-md border border-border bg-sidebar transition [&:hover:not(:focus-within)]:border-primary/70 [&:hover:not(:focus-within)]:bg-muted focus-within:ring-2 focus-within:ring-ring">
      <input
        className="h-full min-w-0 flex-1 bg-transparent px-3 pr-9 text-xs text-foreground outline-none"
        inputMode="numeric"
        onChange={event => onValueChange(Number(event.currentTarget.value.replace(/\D/g, "")))}
        placeholder="R$ 0,00"
        value={value ? formatMoney(value) : ""}
      />
      {value > 0 && (
        <button
          aria-label="Limpar valor"
          className="absolute right-1 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground"
          onClick={() => onValueChange(0)}
          title="Limpar valor"
          type="button"
        >
          <XIcon aria-hidden="true" className="size-4" />
        </button>
      )}
    </div>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(value / 100);
}
