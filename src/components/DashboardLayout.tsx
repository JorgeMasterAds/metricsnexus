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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import ProjectSelector from "@/components/ProjectSelector";

const mainNavItems = [
  { icon: BarChart3, label: "Dashboard", path: "/dashboard" },
  { icon: GitBranch, label: "Smart Links", path: "/smart-links" },
  { icon: FileBarChart, label: "Relatório UTM", path: "/utm-report" },
  { icon: Plug, label: "Integrações", path: "/integrations" },
  { icon: Webhook, label: "Webhook Logs", path: "/webhook-logs" },
];

const settingsSubItems = [
  { icon: Settings, label: "Dados Pessoais", path: "/settings?tab=personal" },
  { icon: Building2, label: "Minha Organização", path: "/settings?tab=organization" },
  { icon: CreditCard, label: "Assinatura", path: "/settings?tab=subscription" },
  { icon: Users, label: "Equipe", path: "/settings?tab=team" },
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
  const [settingsOpen, setSettingsOpen] = useState(location.pathname === "/settings");

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const isSettingsActive = location.pathname === "/settings";

  const SidebarContent = () => (
    <>
      <Link to="/dashboard" className="flex items-center gap-2 px-3 mb-4">
        <Activity className="h-5 w-5 text-primary" />
        <span className="font-bold tracking-tight">
          Nexus <span className="gradient-text">Metrics</span>
        </span>
      </Link>

      <div className="px-3 mb-6">
        <ProjectSelector />
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

        {/* Configurações with submenu */}
        <div>
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className={cn(
              "flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm transition-colors",
              isSettingsActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            )}
          >
            <span className="flex items-center gap-3">
              <Settings className={cn("h-4 w-4", isSettingsActive && "text-primary")} />
              Configurações
            </span>
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", settingsOpen && "rotate-180")} />
          </button>
          {settingsOpen && (
            <div className="ml-4 mt-1 space-y-0.5 border-l border-sidebar-border pl-3">
              {settingsSubItems.map((item) => {
                const tabParam = new URL(item.path, "http://x").searchParams.get("tab");
                const currentTab = new URLSearchParams(location.search).get("tab") || "personal";
                const active = isSettingsActive && currentTab === tabParam;
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

      <div className="border-t border-sidebar-border pt-4 mt-4">
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
      <aside className="hidden lg:flex flex-col w-60 border-r border-border/50 bg-sidebar p-4 sticky top-0 h-screen overflow-y-auto">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex flex-col w-60 h-full border-r border-border/50 bg-sidebar p-4 overflow-y-auto">
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

        <div className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
