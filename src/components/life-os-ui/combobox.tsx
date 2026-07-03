import { useCallback, useState } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "../ui/combobox";

type LifeOSComboboxProps = {
  items: string[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

export function LifeOSCombobox({
  items,
  onValueChange,
  placeholder,
  value,
}: LifeOSComboboxProps) {
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const setComboboxElement = useCallback((element: HTMLDivElement | null) => {
    setPortalContainer(element?.closest<HTMLElement>("[data-slot=dialog-content]") ?? null);
  }, []);

  return (
    <div ref={setComboboxElement}>
      <Combobox
        inputValue={value}
        items={items}
        onInputValueChange={onValueChange}
      >
        <ComboboxInput
          className="h-9 w-full rounded-md border border-border bg-sidebar dark:bg-sidebar"
          placeholder={placeholder}
          showClear
        />
        <ComboboxContent
          className="rounded-md border border-border shadow-lg ring-0 data-empty:hidden"
          portalContainer={portalContainer}
        >
          <ComboboxList>
            {item => (
              <ComboboxItem className="min-h-8 px-2 pr-8 py-2 text-xs" key={item} value={item}>
                {item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
