import { ArrowDown, ArrowUp, Landmark } from "lucide-react";
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

    return { expense, income, investment };
  }, [entries]);

  return (
    <>
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
    </>
  );
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(cents / 100);
}
