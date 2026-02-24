import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { ProjectProvider, useProject } from "@/hooks/useProject";
import CreateProjectScreen from "@/components/CreateProjectScreen";

import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import SmartLinks from "./pages/SmartLinks";
import WebhookLogs from "./pages/WebhookLogs";
import Settings from "./pages/Settings";
import UtmReport from "./pages/UtmReport";
import Support from "./pages/Support";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
});

function RequireProject({ children }: { children: React.ReactNode }) {
  const { projects, isLoading, activeProject } = useProject();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (projects.length === 0 || !activeProject) {
    return <CreateProjectScreen />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const Protected = ({ children }: { children: React.ReactNode }) =>
    session ? (
      <ProjectProvider>
        <RequireProject>{children}</RequireProject>
      </ProjectProvider>
    ) : (
      <Navigate to="/auth" replace />
    );

  return (
    <Routes>
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/auth" element={session ? <Navigate to="/dashboard" replace /> : <Auth />} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/smart-links" element={<Protected><SmartLinks /></Protected>} />
      <Route path="/utm-report" element={<Protected><UtmReport /></Protected>} />
      <Route path="/webhook-logs" element={<Protected><WebhookLogs /></Protected>} />
      <Route path="/settings" element={<Protected><Settings /></Protected>} />
      <Route path="/support" element={<Protected><Support /></Protected>} />
      <Route path="/" element={<Navigate to={session ? "/dashboard" : "/auth"} replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
