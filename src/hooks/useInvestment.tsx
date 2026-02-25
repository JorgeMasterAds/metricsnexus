import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "nexus_investments";

const listeners = new Set<() => void>();
let globalInvestments: Record<string, string> = (() => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
})();

function notify() {
  listeners.forEach((fn) => fn());
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(globalInvestments));
  } catch {}
}

/** Format a raw numeric string (cents) to BRL display: 1.234,56 */
export function formatBRL(rawCents: string): string {
  if (!rawCents) return "";
  const num = parseInt(rawCents, 10);
  if (isNaN(num)) return "";
  const intPart = Math.floor(num / 100);
  const decPart = String(num % 100).padStart(2, "0");
  const formatted = intPart.toLocaleString("pt-BR");
  return `${formatted},${decPart}`;
}

/** Strip non-digits from display value to get raw cents string */
function toRawCents(display: string): string {
  return display.replace(/\D/g, "");
}

export function useInvestment(periodKey: string) {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const cb = () => forceUpdate((n) => n + 1);
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, []);

  // stored as raw cents string e.g. "150000" = R$ 1.500,00
  const rawCents = globalInvestments[periodKey] || "";

  const setFromDisplay = useCallback((displayValue: string) => {
    const cents = toRawCents(displayValue);
    globalInvestments[periodKey] = cents;
    notify();
  }, [periodKey]);

  const setRawCents = useCallback((cents: string) => {
    globalInvestments[periodKey] = cents;
    notify();
  }, [periodKey]);

  const displayValue = rawCents ? `R$ ${formatBRL(rawCents)}` : "";
  const numericValue = rawCents ? parseInt(rawCents, 10) / 100 : 0;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    setRawCents(digits);
  }, [setRawCents]);

  return {
    investmentInput: displayValue,
    investmentValue: numericValue,
    handleInvestmentChange: handleChange,
    setInvestmentInput: setFromDisplay,
  };
}
