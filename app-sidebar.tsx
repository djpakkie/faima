import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  FileText,
  Calculator,
  CreditCard,
  AlertTriangle,
  BarChart3,
  Package,
  ShieldCheck,
  UserCog,
  Bell,
  Search,
  Files,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth, type AppRole } from "@/lib/auth-context";
import { Logo, CoinMark } from "@/components/brand";

type Item = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: AppRole[];
};

const opsItems: Item[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Loan Applications", url: "/applications", icon: FileText },
  { title: "Loans", url: "/loans", icon: CreditCard },
  {
    title: "Repayments",
    url: "/repayments",
    icon: CreditCard,
    roles: ["administrator", "finance_officer", "loan_officer"],
  },
  {
    title: "Arrears",
    url: "/arrears",
    icon: AlertTriangle,
    roles: ["administrator", "finance_officer"],
  },
];

const toolItems: Item[] = [
  { title: "Loan Calculator", url: "/calculator", icon: Calculator },
  { title: "Affordability", url: "/affordability", icon: Calculator },
  { title: "Search", url: "/search", icon: Search },
];

const reportItems: Item[] = [
  {
    title: "Reports",
    url: "/reports",
    icon: BarChart3,
    roles: ["administrator", "finance_officer"],
  },
];

const adminItems: Item[] = [
  { title: "Loan Products", url: "/admin/products", icon: Package, roles: ["administrator"] },
  { title: "Users & Roles", url: "/admin/users", icon: UserCog, roles: ["administrator"] },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Audit Log", url: "/admin/audit", icon: ShieldCheck, roles: ["administrator"] },
  {
    title: "Document Templates",
    url: "/admin/document-templates",
    icon: Files,
    roles: ["administrator"],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const { hasAnyRole, roles } = useAuth();

  const isActive = (path: string) =>
    currentPath === path || (path !== "/" && currentPath.startsWith(path));
  const canSee = (item: Item) =>
    !item.roles || item.roles.length === 0 || hasAnyRole(item.roles) || roles.length === 0;

  const renderGroup = (label: string, items: Item[]) => {
    const visible = items.filter(canSee);
    if (visible.length === 0) return null;
    return (
      <SidebarGroup>
        {!collapsed && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
        <SidebarGroupContent>
          <SidebarMenu>
            {visible.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                  <Link to={item.url} className="flex items-center gap-3">
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.title}</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          {collapsed ? <CoinMark size={28} className="shrink-0" /> : <Logo size="md" />}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {renderGroup("Operations", opsItems)}
        {renderGroup("Tools", toolItems)}
        {renderGroup("Reporting", reportItems)}
        {renderGroup("Administration", adminItems)}
      </SidebarContent>
    </Sidebar>
  );
}
