import { ReactNode, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  GitBranch,
  Settings,
  LogOut,
  Menu,
  FileBarChart,
  HelpCircle,
  Plug,
  ChevronDown,
  Users,
  LayoutGrid,
  List,
  Building2,
  CreditCard,
  FolderOpen,
  Layers,
  User,
  Shield,
  ScrollText,
  Webhook,
  Sparkles,
  Bot,
  Smartphone,
  Home,
  Gift,
  Key,
  RefreshCw,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import ProjectSelector from "@/components/ProjectSelector";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "@/hooks/useAccount";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import NotificationBell from "@/components/NotificationBell";
import AdminRolePreviewBar from "@/components/AdminRolePreviewBar";
import { useRolePreview } from "@/hooks/useRolePreview";
import { useProjectRole } from "@/hooks/useProjectRole";

const mainNavItems = [
  { icon: Home, label: "Dashboard", path: "/home" },
  { icon: BarChart3, label: "Relatório", path: "/dashboard" },
  { icon: FileBarChart, label: "Relatório UTM", path: "/utm-report" },
  { icon: GitBranch, label: "Smart Links", path: "/smart-links" },
];

const integrationSubItems = [
  { icon: Webhook, label: "Webhooks", path: "/integrations?tab=webhooks" },
  { icon: FileBarChart, label: "Formulários", path: "/integrations?tab=forms" },
  { icon: ScrollText, label: "Webhook Logs", path: "/integrations?tab=logs" },
];

const settingsSubItems = [
  { icon: Settings, label: "Dados Pessoais", path: "/settings?tab=personal" },
  { icon: FolderOpen, label: "Projetos", path: "/settings?tab=projects" },
  { icon: Users, label: "Equipe", path: "/settings?tab=team" },
  { icon: CreditCard, label: "Assinatura", path: "/settings?tab=subscription" },
  { icon: Gift, label: "Indicações", path: "/settings?tab=referrals" },
  { icon: Key, label: "APIs", path: "/settings?tab=apis" },
];

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function DashboardLayout({ children, title, subtitle, actions }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(location.pathname === "/settings");
  const [integrationsOpen, setIntegrationsOpen] = useState(location.pathname === "/integrations");
  const [crmOpen, setCrmOpen] = useState(location.pathname === "/crm");

  const { activeAccountId } = useAccount();
  const { previewRole, isPreviewActive } = useRolePreview();
  const { role: realRole } = useProjectRole();

  // Determine effective role for sidebar visibility (showPreviewBar computed after isSuperAdmin query below)

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

  const { data: isSuperAdmin } = useQuery({
    queryKey: ["sidebar-is-super-admin"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data } = await (supabase as any).from("super_admins").select("id").eq("user_id", user.id).maybeSingle();
      return !!data;
    },
  });

  const effectiveRole = isPreviewActive ? previewRole : realRole;
  const isViewerMode = effectiveRole === "viewer";
  const showPreviewBar = !!isSuperAdmin;

  const handleLogout = async () => {
    localStorage.removeItem("activeAccountId");
    localStorage.removeItem("activeProjectId");
    queryClient.clear();
    await supabase.auth.signOut();
  };

  const isSettingsActive = location.pathname === "/settings";
  const isIntegrationsActive = location.pathname === "/integrations";

  const SidebarContent = () => (
    <>
      <Link to="/dashboard" className="flex items-center justify-center gap-2.5 px-3 mb-4">
        <Activity className="h-5 w-5 text-primary" />
        <span className="font-bold tracking-tight">
          Nexus <span className="gradient-text">Metrics</span>
        </span>
      </Link>

      <div className="px-3 mb-4">
        <ProjectSelector />
      </div>

      <nav className="flex-1 space-y-1">
        {(isViewerMode
          ? mainNavItems.filter((i) => i.path === "/dashboard" || i.path === "/utm-report")
          : mainNavItems
        ).map((item) => {
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

        {!isViewerMode && (<>
        {/* Integrações with submenu */}
        <div>
          <div className="flex items-center">
            <button
              onClick={() => { navigate("/integrations?tab=webhooks"); setMobileOpen(false); }}
              className={cn(
                "flex items-center gap-3 flex-1 px-3 py-2.5 rounded-l-lg text-sm transition-colors",
                isIntegrationsActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <Plug className={cn("h-4 w-4", isIntegrationsActive && "text-primary")} />
              Integrações
            </button>
            <button
              onClick={() => setIntegrationsOpen(!integrationsOpen)}
              className={cn(
                "px-2 py-2.5 rounded-r-lg text-sm transition-colors",
                isIntegrationsActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", integrationsOpen && "rotate-180")} />
            </button>
          </div>
          {integrationsOpen && (
            <div className="ml-4 mt-1 space-y-0.5 border-l border-sidebar-border pl-3">
              {integrationSubItems.map((item) => {
                const tabParam = new URL(item.path, "http://x").searchParams.get("tab");
                const currentTab = new URLSearchParams(location.search).get("tab") || "webhooks";
                const active = isIntegrationsActive && currentTab === tabParam;
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

        {/* Disabled future items */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground/50 cursor-not-allowed">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
              Meta Ads
              <span className="ml-auto text-[9px] bg-muted/50 px-1.5 py-0.5 rounded">em breve</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">Em breve</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground/50 cursor-not-allowed">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
              Google Ads
              <span className="ml-auto text-[9px] bg-muted/50 px-1.5 py-0.5 rounded">em breve</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">Em breve</TooltipContent>
        </Tooltip>

        {/* Agente de IA - temporarily hidden */}

        {/* CRM with submenu */}
        <div>
          <div className="flex items-center">
            <button
              onClick={() => { navigate("/crm"); setMobileOpen(false); }}
              className={cn(
                "flex items-center gap-3 flex-1 px-3 py-2.5 rounded-l-lg text-sm transition-colors",
                location.pathname === "/crm"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <Users className={cn("h-4 w-4", location.pathname === "/crm" && "text-primary")} />
              CRM
            </button>
            <button
              onClick={() => setCrmOpen(!crmOpen)}
              className={cn(
                "px-2 py-2.5 rounded-r-lg text-sm transition-colors",
                location.pathname === "/crm"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", crmOpen && "rotate-180")} />
            </button>
          </div>
          {crmOpen && (
            <div className="ml-4 mt-1 space-y-0.5 border-l border-sidebar-border pl-3">
              <Link
                to="/crm"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors",
                  location.pathname === "/crm" && !new URLSearchParams(location.search).get("tab")
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Pipeline (Kanban)
              </Link>
              <Link
                to="/crm?tab=leads"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors",
                  location.pathname === "/crm" && new URLSearchParams(location.search).get("tab") === "leads"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <List className="h-3.5 w-3.5" />
                Lista de Leads
              </Link>
            </div>
          )}
        </div>

        {/* Pesquisas & Quiz */}
        <Link
          to="/surveys"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
            location.pathname === "/surveys"
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
          )}
        >
          <ClipboardList className={cn("h-4 w-4", location.pathname === "/surveys" && "text-primary")} />
          Pesquisas & Quiz
        </Link>

        {/* Recursos */}
        <Link
          to="/resources"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
            location.pathname === "/resources"
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
          )}
        >
          <Layers className={cn("h-4 w-4", location.pathname === "/resources" && "text-primary")} />
          Recursos
        </Link>

        {/* Dispositivos */}
        <Link
          to="/devices"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
            location.pathname === "/devices"
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
          )}
        >
          <Smartphone className={cn("h-4 w-4", location.pathname === "/devices" && "text-primary")} />
          Dispositivos
        </Link>

        {/* Configurações with submenu */}
        <div>
          <div className="flex items-center">
            <button
              onClick={() => { navigate("/settings?tab=personal"); setMobileOpen(false); }}
              className={cn(
                "flex items-center gap-3 flex-1 px-3 py-2.5 rounded-l-lg text-sm transition-colors",
                isSettingsActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <Settings className={cn("h-4 w-4", isSettingsActive && "text-primary")} />
              Configurações
            </button>
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className={cn(
                "px-2 py-2.5 rounded-r-lg text-sm transition-colors",
                isSettingsActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", settingsOpen && "rotate-180")} />
            </button>
          </div>
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

        {/* Novidades - link to page */}
        <Link
          to="/novidades"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
            location.pathname === "/novidades"
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
          )}
        >
          <Sparkles className={cn("h-4 w-4", location.pathname === "/novidades" && "text-primary")} />
          Novidades
        </Link>

        {/* Admin - only for super admins */}
        {isSuperAdmin && (
          <Link
            to="/admin"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
              location.pathname === "/admin"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            )}
          >
            <Shield className={cn("h-4 w-4", location.pathname === "/admin" && "text-primary")} />
            Administração
          </Link>
        )}

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
        </>)}
      </nav>

      <div className="border-t border-sidebar-border pt-4 mt-4 space-y-3">
        {userProfile && (
          <Link
            to="/settings?tab=personal"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2.5 px-3 rounded-lg hover:bg-sidebar-accent/50 transition-colors py-1.5"
          >
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
          </Link>
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
    <div className={cn("min-h-screen bg-background flex flex-col", showPreviewBar && "pt-10")}>
      {showPreviewBar && <AdminRolePreviewBar />}
      <div className="flex flex-1">
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
        <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="px-4 lg:px-8 py-4 lg:py-5">
            <div className="max-w-[1400px] mx-auto w-full">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0 shrink-0">
                  <button
                    onClick={() => setMobileOpen(true)}
                    className="lg:hidden p-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                   <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight truncate">{title}</h1>
                    {subtitle && <p className="text-sm text-muted-foreground hidden sm:block mt-1">{subtitle}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {actions && (
                    <div className="hidden lg:flex items-center gap-2">
                      {actions}
                    </div>
                  )}
                  <button
                    onClick={() => window.location.reload()}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                    title="Atualizar página"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <NotificationBell />
                </div>
              </div>
              {actions && (
                <div className="flex items-center gap-2 mt-3 overflow-x-auto scrollbar-thin lg:hidden">
                  {actions}
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-auto">
          <div className="max-w-[1400px] mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
      </div>
    </div>
  );
}
