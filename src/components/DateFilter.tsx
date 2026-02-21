import { useState } from "react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DateRange {
  from: Date;
  to: Date;
}

const PRESETS = [
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
  { label: "Este mês", key: "this-month" },
  { label: "Mês passado", key: "last-month" },
  { label: "Personalizado", key: "custom" },
] as const;

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export default function DateFilter({ value, onChange }: Props) {
  const [activePreset, setActivePreset] = useState<string>("7 dias");
  const [showCustom, setShowCustom] = useState(false);

  const handlePreset = (preset: typeof PRESETS[number]) => {
    setActivePreset(preset.label);
    if ("days" in preset) {
      setShowCustom(false);
      onChange({ from: subDays(new Date(), preset.days), to: new Date() });
    } else if (preset.key === "this-month") {
      setShowCustom(false);
      const now = new Date();
      onChange({ from: startOfMonth(now), to: now });
    } else if (preset.key === "last-month") {
      setShowCustom(false);
      const last = subMonths(new Date(), 1);
      onChange({ from: startOfMonth(last), to: endOfMonth(last) });
    } else {
      setShowCustom(true);
    }
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {PRESETS.map((p) => (
        <button
          key={p.label}
          onClick={() => handlePreset(p)}
          className={cn(
            "px-3 py-1.5 text-xs rounded-lg transition-colors",
            activePreset === p.label
              ? "gradient-bg text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-accent"
          )}
        >
          {p.label}
        </button>
      ))}
      {showCustom && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5" />
              {format(value.from, "dd/MM", { locale: ptBR })} - {format(value.to, "dd/MM", { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={{ from: value.from, to: value.to }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  onChange({ from: range.from, to: range.to });
                } else if (range?.from) {
                  onChange({ from: range.from, to: range.from });
                }
              }}
              numberOfMonths={2}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

export function getDefaultDateRange(): DateRange {
  return { from: subDays(new Date(), 7), to: new Date() };
}
