import { ArrowDown, ArrowRightLeft, ArrowUp, Landmark } from "lucide-react";
import { useMemo } from "react";
import { FinancialEntryType } from "../types";

type FinancialSummaryEntry = {
  type: FinancialEntryType;
  value: number;
};

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
    <article className="grid min-h-28 grid-cols-[2rem_minmax(0,1fr)] items-center gap-x-4 gap-y-3 rounded-md border border-border bg-sidebar p-4">
      <Icon aria-hidden="true" className={`size-8 shrink-0 ${iconClassName}`} strokeWidth={2} />
      <h3 className="text-sm text-foreground">{label}</h3>
      <p className="mt-2 inline-grid grid-cols-[1.25rem_auto] whitespace-nowrap text-2xl leading-none tabular-nums">
        <span>{isNegative ? "-" : ""}</span>
        <span>{formatCurrency(amount)}</span>
      </p>
      <div className="col-span-2 grid grid-cols-2 gap-3 text-center text-xs">
        <span className="rounded bg-muted px-3 py-2">+ 2%</span>
        <span className="rounded bg-muted px-3 py-2">+ 12%</span>
      </div>
    </article>
  );
}

export function SummaryCards({ entries }: { entries: FinancialSummaryEntry[] }) {
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
    const transfer = entries
      .filter(entry => entry.type === "transfer" && entry.value > 0)
      .reduce((sum, entry) => sum + entry.value, 0);

    return { expense, income, investment, transfer };
  }, [entries]);

  return (
    <div className="grid grid-cols-2 gap-4">
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
      <SummaryCard
        amount={totals.transfer}
        icon={ArrowRightLeft}
        iconClassName="text-purple-300"
        label="Transfers"
      />
    </div>
  );
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(cents / 100);
}
