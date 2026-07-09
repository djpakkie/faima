import { Moon, Sun, LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useTheme } from "@/lib/theme";
import { useAuth, ROLE_LABELS } from "@/lib/auth-context";
import { useNavigate } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logAudit } from "@/lib/audit";
import { CoinMark } from "@/components/brand";
import { COMPANY } from "@/lib/company";

export function TopBar() {
  const { theme, toggle } = useTheme();
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();

  const initials = (user?.user_metadata?.full_name || user?.email || "?")
    .split(/[\s@.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase())
    .join("");

  const handleSignOut = async () => {
    await logAudit("logout");
    await signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card/80 backdrop-blur px-3 sm:px-4">
      <SidebarTrigger />
      <div className="flex items-center gap-2 sm:hidden">
        <CoinMark size={22} />
        <span className="font-display font-semibold text-sm text-foreground">
          {COMPANY.shortName}
        </span>
      </div>
      <div className="flex-1" />
      <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
              {initials || <UserIcon className="h-4 w-4" />}
            </div>
            <div className="hidden sm:flex flex-col items-start leading-tight">
              <span className="text-xs font-medium truncate max-w-[160px]">
                {user?.user_metadata?.full_name || user?.email}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {roles.map((r) => ROLE_LABELS[r]).join(", ") || "No role"}
              </span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="text-sm">{user?.user_metadata?.full_name || user?.email}</span>
              <span className="text-xs text-muted-foreground">{user?.email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleSignOut}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
