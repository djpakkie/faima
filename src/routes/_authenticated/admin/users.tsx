import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAuth, ROLE_LABELS, type AppRole } from "@/lib/auth-context";
import { logAudit } from "@/lib/audit";
import { formatDate } from "@/lib/format";
import { Loader2, ShieldOff, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: r } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "administrator")
      .maybeSingle();
    if (!r) throw redirect({ to: "/" });
  },
  head: () => ({ meta: [{ title: "Users & Roles — Faima Cash Solutions" }] }),
  component: UsersAdmin,
});

type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  active: boolean;
  created_at: string;
};

const ALL_ROLES: AppRole[] = ["administrator", "loan_officer", "finance_officer"];

function UsersAdmin() {
  const { user: me, refreshRoles } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [rolesByUser, setRolesByUser] = useState<Record<string, AppRole[]>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: p, error: pe }, { data: r, error: re }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, phone, active, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    if (pe) toast.error(pe.message);
    if (re) toast.error(re.message);
    setProfiles((p ?? []) as Profile[]);
    const map: Record<string, AppRole[]> = {};
    (r ?? []).forEach((row) => {
      map[row.user_id] = [...(map[row.user_id] ?? []), row.role as AppRole];
    });
    setRolesByUser(map);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleRole = async (userId: string, role: AppRole, next: boolean) => {
    setBusy(userId + role);
    if (next) {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) toast.error(error.message);
      else {
        await logAudit("role.assign", { entity: "user", entity_id: userId, meta: { role } });
        toast.success("Role granted.");
      }
    } else {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);
      if (error) toast.error(error.message);
      else {
        await logAudit("role.revoke", { entity: "user", entity_id: userId, meta: { role } });
        toast.success("Role revoked.");
      }
    }
    setBusy(null);
    if (userId === me?.id) await refreshRoles();
    await load();
  };

  const toggleActive = async (userId: string, active: boolean) => {
    setBusy(userId + "active");
    const { error } = await supabase.from("profiles").update({ active }).eq("id", userId);
    if (error) toast.error(error.message);
    else {
      await logAudit("user.update", { entity: "user", entity_id: userId, meta: { active } });
      toast.success(active ? "User enabled." : "User disabled.");
    }
    setBusy(null);
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold tracking-tight">Users &amp; Roles</h1>
        <p className="text-sm text-muted-foreground">
          Manage staff access. New accounts are created via the registration page and then assigned
          roles here.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Staff accounts</CardTitle>
          <CardDescription>Only administrators can view or change roles.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    {ALL_ROLES.map((r) => (
                      <TableHead key={r} className="text-center">
                        {ROLE_LABELS[r]}
                      </TableHead>
                    ))}
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((p) => {
                    const userRoles = rolesByUser[p.id] ?? [];
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          {p.full_name || "—"}
                          {me?.id === p.id && (
                            <Badge variant="secondary" className="ml-2">
                              You
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{p.phone || "—"}</TableCell>
                        <TableCell>
                          {p.active ? (
                            <Badge className="bg-success/15 text-success hover:bg-success/20 border-0">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="destructive">Disabled</Badge>
                          )}
                        </TableCell>
                        {ALL_ROLES.map((r) => (
                          <TableCell key={r} className="text-center">
                            <Checkbox
                              checked={userRoles.includes(r)}
                              disabled={
                                busy === p.id + r ||
                                (p.id === me?.id &&
                                  r === "administrator" &&
                                  userRoles.includes("administrator"))
                              }
                              onCheckedChange={(v) => toggleRole(p.id, r, Boolean(v))}
                              aria-label={`Toggle ${ROLE_LABELS[r]}`}
                            />
                          </TableCell>
                        ))}
                        <TableCell className="text-muted-foreground">
                          {formatDate(p.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busy === p.id + "active" || p.id === me?.id}
                            onClick={() => toggleActive(p.id, !p.active)}
                          >
                            {p.active ? (
                              <>
                                <ShieldOff className="h-4 w-4 mr-1" /> Disable
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="h-4 w-4 mr-1" /> Enable
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {profiles.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={3 + ALL_ROLES.length + 2}
                        className="text-center text-sm text-muted-foreground py-8"
                      >
                        No staff accounts yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="p-4 text-sm text-muted-foreground">
          Tip: the first account registered on this system was automatically granted the{" "}
          <strong>Administrator</strong> role. To add more staff, send them to the registration page
          and assign roles here.
        </CardContent>
      </Card>
    </div>
  );
}
