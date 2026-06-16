import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import * as React from "react";
import { Calendar } from "./calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import { cn } from "../../lib/utils";

type DatePickerProps = {
  id?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

function DatePicker({
  id,
  onChange,
  placeholder = "Selecionar data",
  value,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const selectedDate = parseDateValue(value);
  const displayValue = isEditing ? inputValue : selectedDate ? formatDateLabel(selectedDate) : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "flex h-9 w-full items-center rounded-md border border-border bg-sidebar text-xs text-foreground transition focus-within:ring-2 focus-within:ring-ring",
          !selectedDate && "text-muted-foreground",
        )}
      >
        <input
          className={cn(
            "h-full min-w-0 flex-1 rounded-l-md bg-transparent px-3 text-xs text-foreground outline-none placeholder:text-muted-foreground",
            !selectedDate && "text-muted-foreground",
          )}
          id={id}
          inputMode="numeric"
          onBlur={() => {
            const nextDate = parseTypedDate(inputValue);

            if (nextDate) {
              onChange(formatDateValue(nextDate));
            }

            setInputValue("");
            setIsEditing(false);
          }}
          onFocus={() => {
            setInputValue(selectedDate ? formatDateLabel(selectedDate) : "");
            setIsEditing(true);
          }}
          onChange={(event) => {
            const nextValue = event.currentTarget.value;
            const nextDate = parseTypedDate(nextValue);

            setInputValue(nextValue);

            if (nextDate) {
              onChange(formatDateValue(nextDate));
              return;
            }
          }}
          placeholder={placeholder}
          type="text"
          value={displayValue}
        />
        <PopoverTrigger asChild>
          <button
            aria-label="Abrir calendario"
            className="flex size-9 shrink-0 items-center justify-center rounded-r-md text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            type="button"
          >
            <CalendarIcon aria-hidden="true" className="size-4" />
          </button>
        </PopoverTrigger>
      </div>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          onSelect={(date) => {
            if (!date) {
              return;
            }

            onChange(formatDateValue(date));
            setInputValue("");
            setIsEditing(false);
            setOpen(false);
          }}
          selected={selectedDate}
        />
      </PopoverContent>
    </Popover>
  );
}

function parseDateValue(value: string) {
  if (!value) {
    return undefined;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return undefined;
  }

  return new Date(year, month - 1, day);
}

function parseTypedDate(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return undefined;
  }

  const isoMatch = trimmedValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const brMatch = trimmedValue.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);

  if (isoMatch) {
    return createValidDate(
      Number(isoMatch[1]),
      Number(isoMatch[2]),
      Number(isoMatch[3]),
    );
  }

  if (brMatch) {
    return createValidDate(
      Number(brMatch[3]),
      Number(brMatch[2]),
      Number(brMatch[1]),
    );
  }

  return undefined;
}

function createValidDate(year: number, month: number, day: number) {
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return undefined;
  }

  return date;
}

function formatDateValue(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDateLabel(date: Date) {
  return format(date, "dd/MM/yyyy");
}

export { DatePicker };
