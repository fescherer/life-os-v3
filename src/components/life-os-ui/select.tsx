import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

type SelectOption = {
  label: string;
  value: string;
};

type LifeOSSelectProps = {
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  value: string;
};

export function LifeOSSelect({
  onValueChange,
  options,
  placeholder,
  value,
}: LifeOSSelectProps) {
  return (
    <Select onValueChange={onValueChange} value={value}>
      <SelectTrigger className="[&:hover:not(:focus-within)]:border-primary/70">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(option => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
