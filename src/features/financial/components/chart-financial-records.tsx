import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { FinancialEntryType } from "../types";

type ChartRange = "years" | "12-months" | "6-months" | "30-days";

type FinancialChartEntry = {
  date: string;
  type: FinancialEntryType;
  value: number;
};

type FinancialChartPoint = {
  expense: number;
  income: number;
  label: string;
  sortKey: string;
};

const chartRangeOptions: Array<{ label: string; value: ChartRange }> = [
  { label: "Anos", value: "years" },
  { label: "12 meses", value: "12-months" },
  { label: "6 meses", value: "6-months" },
  { label: "30 dias", value: "30-days" },
];

export function ChartFinancialRecords({
  entries,
}: {
  entries: FinancialChartEntry[];
}) {
  const [range, setRange] = useState<ChartRange>("12-months");
  const chartData = useMemo(
    () => buildFinancialChartData(entries, range),
    [entries, range],
  );

  return (
    <section className="rounded-md border border-border bg-sidebar p-3">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 className="text-base text-foreground">Balanço do patrimônio</h2>
        <Select onValueChange={value => setRange(value as ChartRange)} value={range}>
          <SelectTrigger className="h-8 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {chartRangeOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="mt-4 h-52 rounded-md border border-border px-2 py-3 [&_.recharts-surface:focus]:outline-none">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={chartData} margin={{ bottom: 0, left: 0, right: 8, top: 8 }}>
            <CartesianGrid stroke="#eee6dd" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="label"
              interval={range === "30-days" ? 4 : 0}
              tick={{ fill: "#9b8f86", fontSize: 10 }}
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              tick={{ fill: "#9b8f86", fontSize: 10 }}
              tickFormatter={formatCompactCurrency}
              tickLine={false}
              width={48}
            />
            <Tooltip
              cursor={{ fill: "#eee6dd" }}
              formatter={(value, name) => [
                formatCurrency(Number(value) * 100),
                name === "income" ? "Income" : "Expenses",
              ]}
            />
            <Bar dataKey="income" fill="#86efac" name="Income" radius={[3, 3, 0, 0]} />
            <Bar dataKey="expense" fill="#fca5a5" name="Expenses" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function buildFinancialChartData(entries: FinancialChartEntry[], range: ChartRange) {
  if (range === "years") {
    return buildYearlyChartData(entries);
  }

  if (range === "30-days") {
    return buildDailyChartData(entries);
  }

  return buildMonthlyChartData(entries, range === "12-months" ? 12 : 6);
}

function buildYearlyChartData(entries: FinancialChartEntry[]) {
  const entryYears = entries.map(entry => parseEntryDate(entry.date).getFullYear());
  const currentYear = new Date().getFullYear();
  const firstYear = entryYears.length > 0 ? Math.min(...entryYears) : currentYear;
  const lastYear = Math.max(currentYear, ...entryYears);
  const points = new Map<string, FinancialChartPoint>();

  for (let year = firstYear; year <= lastYear; year += 1) {
    const sortKey = String(year);

    points.set(sortKey, {
      expense: 0,
      income: 0,
      label: sortKey,
      sortKey,
    });
  }

  for (const entry of entries) {
    addEntryToPoint(points, entry, String(parseEntryDate(entry.date).getFullYear()));
  }

  return sortChartPoints(points);
}

function buildMonthlyChartData(entries: FinancialChartEntry[], monthCount: number) {
  const today = new Date();
  const firstMonth = new Date(today.getFullYear(), today.getMonth() - monthCount + 1, 1);
  const points = new Map<string, FinancialChartPoint>();

  for (let index = 0; index < monthCount; index += 1) {
    const date = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1);
    const sortKey = formatMonthKey(date);

    points.set(sortKey, {
      expense: 0,
      income: 0,
      label: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date),
      sortKey,
    });
  }

  for (const entry of entries) {
    addEntryToPoint(points, entry, formatMonthKey(parseEntryDate(entry.date)));
  }

  return sortChartPoints(points);
}

function buildDailyChartData(entries: FinancialChartEntry[]) {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29);
  const points = new Map<string, FinancialChartPoint>();

  for (let index = 0; index < 30; index += 1) {
    const date = new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate() + index);
    const sortKey = formatDayKey(date);

    points.set(sortKey, {
      expense: 0,
      income: 0,
      label: new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }).format(date),
      sortKey,
    });
  }

  for (const entry of entries) {
    addEntryToPoint(points, entry, formatDayKey(parseEntryDate(entry.date)));
  }

  return sortChartPoints(points);
}

function addEntryToPoint(
  points: Map<string, FinancialChartPoint>,
  entry: FinancialChartEntry,
  sortKey: string,
) {
  if (entry.type !== "income" && entry.type !== "expense") {
    return;
  }

  const point = points.get(sortKey);

  if (point) {
    point[entry.type] += entry.value / 100;
  }
}

function sortChartPoints(points: Map<string, FinancialChartPoint>) {
  return Array.from(points.values()).sort((first, second) =>
    first.sortKey.localeCompare(second.sortKey),
  );
}

function parseEntryDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function formatMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatDayKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(cents / 100);
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    compactDisplay: "short",
    currency: "BRL",
    notation: "compact",
    style: "currency",
  }).format(value);
}
