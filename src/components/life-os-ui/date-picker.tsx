import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";
import { DatePicker } from "../ui/date-picker";

type LifeOSDatePickerProps = ComponentProps<typeof DatePicker>;

export function LifeOSDatePicker({ className, ...props }: LifeOSDatePickerProps) {
  return (
    <DatePicker
      className={cn(
        "[&:hover:not(:focus-within)]:border-primary/70 [&:hover:not(:focus-within)]:bg-muted",
        className,
      )}
      {...props}
    />
  );
}
