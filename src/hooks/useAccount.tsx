import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Account {
  id: string;
  name: string;
  slug: string | null;
  timezone: string;
  created_at: string;
  company_name: string | null;
  cnpj: string | null;
  phone: string | null;
  address: string | null;
  responsible_name: string | null;
  admin_email: string | null;
}

interface AccountContextType {
  accounts: Account[];
  activeAccount: Account | null;
  activeAccountId: string | undefined;
  setActiveAccountId: (id: string) => void;
  isLoading: boolean;
}

const AccountContext = createContext<AccountContextType>({
  accounts: [],
  activeAccount: null,
  activeAccountId: undefined,
  setActiveAccountId: () => {},
  isLoading: true,
});

export function AccountProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(() => {
    return localStorage.getItem("activeAccountId");
  });

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("accounts")
        .select("id, name, slug, timezone, created_at, company_name, cnpj, phone, address, responsible_name, admin_email")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as Account[];
    },
  });

  useEffect(() => {
    if (accounts.length > 0 && !accounts.find((a) => a.id === activeId)) {
      const id = accounts[0].id;
      setActiveId(id);
      localStorage.setItem("activeAccountId", id);
    }
  }, [accounts, activeId]);

  const activeAccount = accounts.find((a) => a.id === activeId) || accounts[0] || null;

  const handleSetActiveId = (id: string) => {
    setActiveId(id);
    localStorage.setItem("activeAccountId", id);
  };

  return (
    <AccountContext.Provider value={{
      accounts,
      activeAccount,
      activeAccountId: activeAccount?.id,
      setActiveAccountId: handleSetActiveId,
      isLoading,
    }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  return useContext(AccountContext);
}
