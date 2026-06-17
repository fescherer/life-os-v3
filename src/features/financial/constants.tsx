import { ArrowDown, ArrowUp, Landmark } from "lucide-react";
import { FinancialEntryType } from "./types";

export const entryTypes: Array<{ icon: typeof ArrowUp; label: string; value: FinancialEntryType }> = [
  { icon: ArrowUp, label: "Income", value: "income" },
  { icon: ArrowDown, label: "Expense", value: "expense" },
  { icon: Landmark, label: "Investments", value: "investment" },
];
