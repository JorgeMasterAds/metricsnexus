import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "nexus_investments";

// Load from localStorage on init
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
