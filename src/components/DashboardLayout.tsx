import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Activity,
  BarChart3,
  GitBranch,
  Settings,
  Webhook,
  LogOut,
  Menu,
  FileBarChart,
  HelpCircle,
  Plug,
  ChevronDown,
  Users,
  Building2,
  CreditCard,
  FolderOpen,
  Layers,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import ProjectSelector from "@/components/ProjectSelector";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "@/hooks/useAccount";

const mainNavItems = [
  { icon: BarChart3, label: "Dashboard", path: "/dashboard" },
  { icon: GitBranch, label: "Smart Links", path: "/smart-links" },
  { icon: FileBarChart, label: "Relatório UTM", path: "/utm-report" },
  { icon: Plug, label: "Integrações", path: "/integrations" },
];


const settingsSubItems = [
  { icon: Settings, label: "Dados Pessoais", path: "/settings?tab=personal" },
  { icon: Building2, label: "Minha Organização", path: "/settings?tab=organization" },
  { icon: CreditCard, label: "Assinatura", path: "/settings?tab=subscription" },
  { icon: Users, label: "Equipe", path: "/settings?tab=team" },
  { icon: Webhook, label: "Webhook Logs", path: "/webhook-logs" },
];

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function DashboardLayout({ children, title, subtitle, actions }: DashboardLayoutProps) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(location.pathname === "/settings" || location.pathname === "/webhook-logs");
  
  const { activeAccountId } = useAccount();

  // Fetch logged-in user profile
  const { data: userProfile } = useQuery({
    queryKey: ["sidebar-user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      return { email: user.email, ...profile };
    },
  });

  // Fetch active project for avatar in sidebar
  const { data: activeProject } = useQuery({
    queryKey: ["sidebar-active-project", activeAccountId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("projects")
        .select("id, name, avatar_url")
        .eq("account_id", activeAccountId)
        .eq("is_active", true)
        .order("created_at")
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!activeAccountId,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const isSettingsActive = location.pathname === "/settings";

  const SidebarContent = () => (
    <>
      <Link to="/dashboard" className="flex items-center gap-2.5 px-3 mb-4">
        <Activity className="h-5 w-5 text-primary" />
        <span className="font-bold tracking-tight">
          Nexus <span className="gradient-text">Metrics</span>
        </span>
      </Link>

      <div className="px-3 mb-4">
        <ProjectSelector avatarUrl={activeProject?.avatar_url} />
      </div>

      <nav className="flex-1 space-y-1">
        {mainNavItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className={cn("h-4 w-4", active && "text-primary")} />
              {item.label}
            </Link>
          );
        })}

        {/* Recursos - link direto para Domínios */}
        <Link
          to="/settings?tab=domains"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
            isSettingsActive && new URLSearchParams(location.search).get("tab") === "domains"
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
          )}
        >
          <Layers className={cn("h-4 w-4", isSettingsActive && new URLSearchParams(location.search).get("tab") === "domains" && "text-primary")} />
          Recursos
        </Link>

        {/* Configurações with submenu */}
        <div>
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className={cn(
              "flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm transition-colors",
              isSettingsActive || location.pathname === "/webhook-logs"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            )}
          >
            <span className="flex items-center gap-3">
              <Settings className={cn("h-4 w-4", (isSettingsActive || location.pathname === "/webhook-logs") && "text-primary")} />
              Configurações
            </span>
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", settingsOpen && "rotate-180")} />
          </button>
          {settingsOpen && (
            <div className="ml-4 mt-1 space-y-0.5 border-l border-sidebar-border pl-3">
              {settingsSubItems.map((item) => {
                const isWebhookLog = item.path === "/webhook-logs";
                const tabParam = new URL(item.path, "http://x").searchParams.get("tab");
                const currentTab = new URLSearchParams(location.search).get("tab") || "personal";
                const active = isWebhookLog
                  ? location.pathname === "/webhook-logs"
                  : isSettingsActive && currentTab === tabParam;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className={cn("h-3.5 w-3.5", active && "text-primary")} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <Link
          to="/support"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
            location.pathname === "/support"
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
          )}
        >
          <HelpCircle className={cn("h-4 w-4", location.pathname === "/support" && "text-primary")} />
          Suporte
        </Link>
      </nav>

      <div className="border-t border-sidebar-border pt-4 mt-4 space-y-3">
        {/* Logged-in user */}
        {userProfile && (
          <div className="flex items-center gap-2.5 px-3">
            <div className="h-8 w-8 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0">
              {userProfile.avatar_url ? (
                <img src={userProfile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <User className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{userProfile.full_name || "Usuário"}</p>
              <p className="text-[10px] text-muted-foreground truncate">{userProfile.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors w-full"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden lg:flex flex-col w-64 border-r border-border/50 bg-sidebar p-4 sticky top-0 h-screen overflow-y-auto">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex flex-col w-64 h-full border-r border-border/50 bg-sidebar p-4 overflow-y-auto">
            <SidebarContent />
          </aside>
        </div>
      )}

      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="h-14 border-b border-border/50 flex items-center justify-between px-4 lg:px-6 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 text-muted-foreground hover:text-foreground"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-sm font-semibold">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground hidden sm:block">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-auto">
          <div className="max-w-[1400px] mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
