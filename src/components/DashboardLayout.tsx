import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Activity,
  BarChart3,
  GitBranch,
  Settings,
  Shield,
  Heart,
  LogOut,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: BarChart3, label: "Dashboard", path: "/dashboard" },
  { icon: GitBranch, label: "Smart Links", path: "/smart-links" },
  { icon: Heart, label: "System Health", path: "/system-health" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function DashboardLayout({ children, title, subtitle, actions }: DashboardLayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-border/50 bg-sidebar p-4">
        <Link to="/" className="flex items-center gap-2 px-3 mb-8">
          <Activity className="h-5 w-5 text-primary" />
          <span className="font-bold tracking-tight">
            Nexus <span className="gradient-text">Metrics</span>
          </span>
        </Link>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
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
        </nav>

        <div className="border-t border-sidebar-border pt-4 mt-4">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 rounded-full gradient-bg flex items-center justify-center text-xs font-bold text-primary-foreground">
              N
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">Demo User</div>
              <div className="text-xs text-muted-foreground truncate">demo@nexus.io</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-14 border-b border-border/50 flex items-center justify-between px-6 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="lg:hidden">
              <Activity className="h-5 w-5 text-primary" />
            </Link>
            <div>
              <h1 className="text-sm font-semibold">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
