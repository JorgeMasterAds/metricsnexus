import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { useActiveProject } from "@/hooks/useActiveProject";

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

export function useInvestment(periodKey?: string) {
  const { activeAccountId } = useAccount();
  const { activeProjectId } = useActiveProject();
  const qc = useQueryClient();

  // Parse date range from periodKey "fromISO__toISO"
  const [dateFrom, dateTo] = (periodKey || "").split("__").map((s) => s?.slice(0, 10) || "");

  const queryKey = ["investment", activeAccountId, activeProjectId, dateFrom, dateTo];

  const { data: savedAmount } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!activeAccountId || !activeProjectId || !dateFrom || !dateTo) return 0;
      const { data } = await (supabase as any)
        .from("investments")
        .select("amount")
        .eq("account_id", activeAccountId)
        .eq("project_id", activeProjectId)
        .eq("date_from", dateFrom)
        .eq("date_to", dateTo)
        .maybeSingle();
      return data?.amount ? Math.round(Number(data.amount) * 100) : 0;
    },
    staleTime: 60000,
    enabled: !!activeAccountId && !!activeProjectId && !!dateFrom && !!dateTo,
  });

  const [localCents, setLocalCents] = useState<string>("");

  // Sync from DB
  useEffect(() => {
    if (savedAmount !== undefined) {
      setLocalCents(savedAmount > 0 ? String(savedAmount) : "");
    }
  }, [savedAmount]);

  const displayValue = localCents ? `R$ ${formatBRL(localCents)}` : "";
  const numericValue = localCents ? parseInt(localCents, 10) / 100 : 0;

  const saveToDb = useCallback(
    async (cents: number) => {
      if (!activeAccountId || !activeProjectId || !dateFrom || !dateTo) return;
      const amount = cents / 100;
      await (supabase as any)
        .from("investments")
        .upsert(
          {
            account_id: activeAccountId,
            project_id: activeProjectId,
            date_from: dateFrom,
            date_to: dateTo,
            amount,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "account_id,project_id,date_from,date_to" }
        );
      qc.invalidateQueries({ queryKey });
    },
    [activeAccountId, activeProjectId, dateFrom, dateTo, qc]
  );

  const handleChange = useCallback(
    (e: { target: { value: string } }) => {
      const digits = e.target.value.replace(/\D/g, "");
      setLocalCents(digits);
      // Debounced save
      const cents = parseInt(digits, 10) || 0;
      const timeout = setTimeout(() => saveToDb(cents), 1000);
      return () => clearTimeout(timeout);
    },
    [saveToDb]
  );

  return {
    investmentInput: displayValue,
    investmentValue: numericValue,
    handleInvestmentChange: handleChange,
    setInvestmentInput: handleChange,
  };
}
