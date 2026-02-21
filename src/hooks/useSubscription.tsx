// Subscription context and plan limits
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export const PLAN_LIMITS: Record<string, number> = {
  bronze: 5,
  prata: 15,
  ouro: 25,
};

export const PLAN_PRICES: Record<string, { priceId: string; name: string; price: string; features: string[] }> = {
  bronze: {
    priceId: "price_1T3LwJK20hW7KSjmGBQjhXkF",
    name: "Bronze",
    price: "R$ 49",
    features: ["5 Smart Links", "Webhook", "Relatórios básicos"],
  },
  prata: {
    priceId: "price_1T3LwhK20hW7KSjm9c9yDASb",
    name: "Prata",
    price: "R$ 99",
    features: ["15 Smart Links", "Webhook", "Relatório UTM completo", "Filtro avançado"],
  },
  ouro: {
    priceId: "price_1T3LwvK20hW7KSjm4UqC33sp",
    name: "Ouro",
    price: "R$ 199",
    features: ["25 Smart Links", "Todos os recursos", "Prioridade futura"],
  },
};

export const FIXED_GOALS = [1_000_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000];

export function getFixedGoal(currentRevenue: number): number {
  for (const goal of FIXED_GOALS) {
    if (goal > currentRevenue) return goal;
  }
  return FIXED_GOALS[FIXED_GOALS.length - 1];
}

interface SubscriptionState {
  subscribed: boolean;
  planType: string | null;
  subscriptionEnd: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionState>({
  subscribed: false,
  planType: null,
  subscriptionEnd: null,
  loading: true,
  refresh: async () => {},
});

export function useSubscription() {
  return useContext(SubscriptionContext);
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [subscribed, setSubscribed] = useState(false);
  const [planType, setPlanType] = useState<string | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSubscribed(false);
        setPlanType(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) {
        console.error("Check subscription error:", error);
        setSubscribed(false);
        setPlanType(null);
      } else {
        setSubscribed(data?.subscribed || false);
        setPlanType(data?.plan_type || null);
        setSubscriptionEnd(data?.subscription_end || null);
      }
    } catch (e) {
      console.error("Subscription check failed:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [refresh]);

  // Refresh on auth state change
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  return (
    <SubscriptionContext.Provider value={{ subscribed, planType, subscriptionEnd, loading, refresh }}>
      {children}
    </SubscriptionContext.Provider>
  );
}
