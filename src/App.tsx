import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { AccountProvider, useAccount } from "@/hooks/useAccount";
import { I18nProvider } from "@/lib/i18n";
import ChartLoader from "@/components/ChartLoader";

import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import CreateProjectScreen from "./components/CreateProjectScreen";
import { ProjectProvider, useProject } from "./hooks/useProject";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import SmartLinks from "./pages/SmartLinks";
import WebhookLogs from "./pages/WebhookLogs";
import Settings from "./pages/Settings";
import UtmReport from "./pages/UtmReport";
import Support from "./pages/Support";
import Integrations from "./pages/Integrations";
import Resources from "./pages/Resources";
import AdminSettings from "./pages/AdminSettings";
import NotFound from "./pages/NotFound";
import PublicSmartLinkRedirect from "./pages/PublicSmartLinkRedirect";
import Novidades from "./pages/Novidades";
import CRM from "./pages/CRM";
import AIAgents from "./pages/AIAgents";
import Devices from "./pages/Devices";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: 1 } },
});

function RequireAccount({ children }: { children: React.ReactNode }) {
  const { accounts, isLoading, activeAccount } = useAccount();

  if (isLoading) {
    return <ChartLoader text="Carregando conta..." />;
  }

  if (accounts.length === 0 || !activeAccount) {
    return <ChartLoader text="Preparando seu ambiente..." />;
  }

  return (
    <ProjectProvider>
      <RequireProject>{children}</RequireProject>
    </ProjectProvider>
  );
}

function RequireProject({ children }: { children: React.ReactNode }) {
  const { projects, isLoading } = useProject();

  if (isLoading) {
    return <ChartLoader text="Carregando projetos..." />;
  }

  if (projects.length === 0) {
    return <CreateProjectScreen />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const knownAppRoutes = new Set([
    "auth",
    "reset-password",
    "dashboard",
    "home",
    "smart-links",
    "utm-report",
    "webhook-logs",
    "integrations",
    "settings",
    "resources",
    "admin",
    "support",
    "novidades",
    "crm",
    "ai-agents",
    "devices",
  ]);

  const pathSegments = location.pathname.split("/").filter(Boolean);
  const isPublicSlugRoute = pathSegments.length === 1 && !knownAppRoutes.has(pathSegments[0]);

  useEffect(() => {
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
  }, []);

  if (isPublicSlugRoute) {
    return (
      <Routes>
        <Route path="/:slug" element={<PublicSmartLinkRedirect />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }

  if (loading) {
    return <ChartLoader text="Iniciando..." />;
  }

  const Protected = ({ children }: { children: React.ReactNode }) =>
    session ? (
      <AccountProvider>
        <RequireAccount>{children}</RequireAccount>
      </AccountProvider>
    ) : (
      <Navigate to="/auth" replace />
    );

  return (
    <Routes>
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/auth" element={session ? <Navigate to="/home" replace /> : <Auth />} />
      <Route path="/home" element={<Protected><Home /></Protected>} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/smart-links" element={<Protected><SmartLinks /></Protected>} />
      <Route path="/utm-report" element={<Protected><UtmReport /></Protected>} />
      <Route path="/webhook-logs" element={<Protected><WebhookLogs /></Protected>} />
      <Route path="/integrations" element={<Protected><Integrations /></Protected>} />
      <Route path="/settings" element={<Protected><Settings /></Protected>} />
      <Route path="/resources" element={<Protected><Resources /></Protected>} />
      <Route path="/admin" element={<Protected><AdminSettings /></Protected>} />
      <Route path="/support" element={<Protected><Support /></Protected>} />
      <Route path="/novidades" element={<Protected><Novidades /></Protected>} />
      <Route path="/crm" element={<Protected><CRM /></Protected>} />
      <Route path="/ai-agents" element={<Protected><AIAgents /></Protected>} />
      <Route path="/devices" element={<Protected><Devices /></Protected>} />
      <Route path="/" element={<Navigate to={session ? "/home" : "/auth"} replace />} />
      <Route path="/:slug" element={<PublicSmartLinkRedirect />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <I18nProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </I18nProvider>
);

export default App;
