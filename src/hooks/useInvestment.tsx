import { useState, useEffect, useCallback } from "react";

// Shared investment state keyed by period string
const listeners = new Set<() => void>();
let globalInvestments: Record<string, string> = {};

function notify() {
  listeners.forEach((fn) => fn());
}

export function useInvestment(periodKey: string) {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const cb = () => forceUpdate((n) => n + 1);
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, []);

  const value = globalInvestments[periodKey] || "";

  const setValue = useCallback((v: string) => {
    globalInvestments[periodKey] = v;
    notify();
  }, [periodKey]);

  const numericValue = parseFloat(value.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;

  return { investmentInput: value, setInvestmentInput: setValue, investmentValue: numericValue };
}
