import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CheckCircle2,
  Layers,
  Store,
  Plug,
  Package,
  Rocket,
  Settings,
  FileText,
  ChevronLeft,
  ChevronRight,
  Zap,
  User,
  ShoppingCart,
  Webhook,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: CheckCircle2, label: "Approvals", path: "/approvals" },
  { icon: ShoppingCart, label: "Orders", path: "/orders" },
  { icon: Layers, label: "Jobs", path: "/jobs" },
  { icon: Webhook, label: "Webhooks", path: "/webhooks" },
  { icon: Store, label: "Stores", path: "/stores" },
  { icon: Plug, label: "Plugins", path: "/plugins" },
  { icon: Package, label: "Products", path: "/products" },
  { icon: DollarSign, label: "Budgets", path: "/budgets" },
  { icon: Rocket, label: "Publishing", path: "/publishing" },
  { icon: Settings, label: "Settings", path: "/settings" },
  { icon: FileText, label: "Audit Logs", path: "/audit" },
  { icon: User, label: "Profile", path: "/profile" },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      <div className="lg:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm hidden" />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 hidden lg:flex lg:flex-col",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center glow-primary">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            {!collapsed && (
              <span className="font-semibold text-sidebar-foreground text-gradient">
                FlashFusion
              </span>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground hover:text-sidebar-primary"
            onClick={onToggle}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const NavLink = (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className={cn("w-5 h-5 shrink-0", isActive && "text-sidebar-primary")} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.path} delayDuration={0}>
                  <TooltipTrigger asChild>{NavLink}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return NavLink;
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          {!collapsed && (
            <div className="text-xs text-sidebar-foreground/50">
              v1.0.0 • Operations Hub
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
