import * as React from "react";
import { DayPicker } from "react-day-picker";
import { cn } from "../../lib/utils";

function Calendar({
  className,
  classNames,
  fixedWeeks = true,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      className={cn("p-3 text-sm", className)}
      classNames={{
        root: "w-fit",
        months: "flex flex-col gap-4",
        month: "space-y-3",
        month_caption: "flex h-8 items-center justify-center",
        caption_label: "text-sm font-medium text-foreground",
        nav: "absolute inset-x-3 top-3 flex items-center justify-between",
        button_previous: "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
        button_next: "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
        chevron: "size-4 fill-current",
        month_grid: "w-full border-collapse",
        weekdays: "grid grid-cols-7",
        weekday: "flex size-8 items-center justify-center text-[0.7rem] font-normal text-muted-foreground",
        weeks: "grid gap-1",
        week: "grid grid-cols-7 gap-1",
        day: "relative size-8 rounded-md text-center text-xs text-foreground data-[outside=true]:text-muted-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-40 data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground data-[today=true]:ring-1 data-[today=true]:ring-ring",
        day_button: "flex size-8 items-center justify-center rounded-md outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
        ...classNames,
      }}
      fixedWeeks={fixedWeeks}
      showOutsideDays={showOutsideDays}
      {...props}
    />
  );
}

export { Calendar };
