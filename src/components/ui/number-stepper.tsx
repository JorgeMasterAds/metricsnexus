import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  suffix?: string;
}

export function NumberStepper({ value, onChange, min = 0, max = 100, step = 1, className, suffix }: NumberStepperProps) {
  const increment = () => onChange(Math.min(max, value + step));
  const decrement = () => onChange(Math.max(min, value - step));

  return (
    <div className={cn("inline-flex items-center gap-0.5 rounded-md border border-border/50 bg-secondary/60 h-7", className)}>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value) || 0;
          onChange(Math.max(min, Math.min(max, v)));
        }}
        className="w-8 h-full text-center text-xs font-mono bg-transparent border-none outline-none text-foreground"
      />
      {suffix && <span className="text-[10px] text-muted-foreground pr-0.5">{suffix}</span>}
      <div className="flex flex-col border-l border-border/30">
        <button
          type="button"
          onClick={increment}
          className="flex items-center justify-center w-4 h-3.5 hover:bg-accent/60 transition-colors text-muted-foreground hover:text-foreground rounded-tr-sm"
        >
          <ChevronUp className="h-2.5 w-2.5" />
        </button>
        <button
          type="button"
          onClick={decrement}
          className="flex items-center justify-center w-4 h-3.5 hover:bg-accent/60 transition-colors text-muted-foreground hover:text-foreground rounded-br-sm"
        >
          <ChevronDown className="h-2.5 w-2.5" />
        </button>
      </div>
    </div>
  );
}
