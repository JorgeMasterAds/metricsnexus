import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "nexus_investment_global";

const listeners = new Set<() => void>();

// Single global investment value — persists across date filters and pages
let globalValue: string = (() => {
  try {
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
})();

function notify() {
  listeners.forEach((fn) => fn());
  try {
    localStorage.setItem(STORAGE_KEY, globalValue);
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

export function useInvestment(_periodKey?: string) {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const cb = () => forceUpdate((n) => n + 1);
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, []);

  const displayValue = globalValue ? `R$ ${formatBRL(globalValue)}` : "";
  const numericValue = globalValue ? parseInt(globalValue, 10) / 100 : 0;

  const handleChange = useCallback((e: { target: { value: string } }) => {
    const digits = e.target.value.replace(/\D/g, "");
    globalValue = digits;
    notify();
  }, []);

  return {
    investmentInput: displayValue,
    investmentValue: numericValue,
    handleInvestmentChange: handleChange,
    setInvestmentInput: handleChange,
  };
}
