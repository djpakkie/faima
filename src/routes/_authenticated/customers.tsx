import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { logAudit } from "@/lib/audit";
import { formatDate, formatNAD } from "@/lib/format";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Search, ChevronLeft, ChevronRight, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({ meta: [{ title: "Customers — Faima Cash Solutions" }] }),
  component: CustomersPage,
});

type Customer = {
  id: string;
  customer_number: string;
  full_name: string;
  id_number: string;
  phone: string;
  email: string | null;
  employer: string | null;
  monthly_income: number | null;
  status: string;
  created_at: string;
};

const PAGE_SIZE = 15;

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: "bg-success/15 text-success border-0",
    inactive: "bg-muted text-muted-foreground border-0",
    blacklisted: "bg-destructive/15 text-destructive border-0",
  };
  return <Badge className={map[status] ?? "bg-muted text-muted-foreground border-0"}>{status}</Badge>;
}

function CustomersPage() {
  const { hasAnyRole } = useAuth();
  const canEdit = hasAnyRole(["administrator", "loan_officer"]);
  const [rows, setRows] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [openCreate, setOpenCreate] = useState(false);

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from("customers")
      .select("id, customer_number, full_name, id_number, phone, email, employer, monthly_income, status, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (q.trim()) {
      const t = `%${q.trim()}%`;
      query = query.or(`full_name.ilike.${t},customer_number.ilike.${t},id_number.ilike.${t},phone.ilike.${t}`);
    }

    const { data, error, count } = await query;
    if (error) toast.error(error.message);
    setRows((data ?? []) as Customer[]);
    setTotal(count ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, statusFilter, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Customers
          </h1>
          <p className="text-sm text-muted-foreground">
            {total} customer{total === 1 ? "" : "s"} on record.
          </p>
        </div>
        {canEdit && (
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Add customer</Button>
            </DialogTrigger>
            <CustomerFormDialog
              onClose={() => setOpenCreate(false)}
              onSaved={() => { setOpenCreate(false); setPage(0); void load(); }}
            />
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>All customers</CardTitle>
          <CardDescription>Search by name, customer number, ID number, or phone.</CardDescription>
          <div className="flex flex-wrap gap-2 pt-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers…"
                className="pl-9"
                value={q}
                onChange={(e) => { setPage(0); setQ(e.target.value); }}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setPage(0); setStatusFilter(v); }}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="blacklisted">Blacklisted</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
                    <TableHead>Customer #</TableHead>
                    <TableHead>Full name</TableHead>
                    <TableHead>ID number</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Employer</TableHead>
                    <TableHead className="text-right">Income</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer">
                      <TableCell className="font-mono text-xs">
                        <Link to="/customers/$customerId" params={{ customerId: c.id }} className="text-primary hover:underline">
                          {c.customer_number}
                        </Link>
                      </TableCell>
                      <TableCell className="font-medium">{c.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.id_number}</TableCell>
                      <TableCell>{c.phone}</TableCell>
                      <TableCell className="text-muted-foreground">{c.employer ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.monthly_income != null ? formatNAD(Number(c.monthly_income)) : "—"}</TableCell>
                      <TableCell>{statusBadge(c.status)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(c.created_at)}</TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                        No customers found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------- Create/Edit Dialog ----------------------

const customerSchema = z.object({
  full_name: z.string().trim().min(2, "Full name is required").max(120),
  id_number: z.string().trim().min(4, "ID number is required").max(40),
  date_of_birth: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  marital_status: z.string().optional().or(z.literal("")),
  phone: z.string().trim().min(6, "Phone is required").max(30),
  alt_phone: z.string().max(30).optional().or(z.literal("")),
  email: z.string().email("Invalid email").max(160).optional().or(z.literal("")),
  physical_address: z.string().max(300).optional().or(z.literal("")),
  postal_address: z.string().max(300).optional().or(z.literal("")),
  employer: z.string().max(160).optional().or(z.literal("")),
  employment_status: z.string().optional().or(z.literal("")),
  occupation: z.string().max(120).optional().or(z.literal("")),
  monthly_income: z.string().optional().or(z.literal("")),
  bank_name: z.string().max(120).optional().or(z.literal("")),
  bank_account_number: z.string().max(40).optional().or(z.literal("")),
  bank_branch_code: z.string().max(20).optional().or(z.literal("")),
  next_of_kin_name: z.string().max(120).optional().or(z.literal("")),
  next_of_kin_phone: z.string().max(30).optional().or(z.literal("")),
  next_of_kin_relationship: z.string().max(60).optional().or(z.literal("")),
  status: z.enum(["active", "inactive", "blacklisted"]).default("active"),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;

export function CustomerFormDialog({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Partial<CustomerFormValues> & { id?: string };
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<CustomerFormValues>(() => ({
    full_name: initial?.full_name ?? "",
    id_number: initial?.id_number ?? "",
    date_of_birth: initial?.date_of_birth ?? "",
    gender: initial?.gender ?? "",
    marital_status: initial?.marital_status ?? "",
    phone: initial?.phone ?? "",
    alt_phone: initial?.alt_phone ?? "",
    email: initial?.email ?? "",
    physical_address: initial?.physical_address ?? "",
    postal_address: initial?.postal_address ?? "",
    employer: initial?.employer ?? "",
    employment_status: initial?.employment_status ?? "",
    occupation: initial?.occupation ?? "",
    monthly_income: initial?.monthly_income ?? "",
    bank_name: initial?.bank_name ?? "",
    bank_account_number: initial?.bank_account_number ?? "",
    bank_branch_code: initial?.bank_branch_code ?? "",
    next_of_kin_name: initial?.next_of_kin_name ?? "",
    next_of_kin_phone: initial?.next_of_kin_phone ?? "",
    next_of_kin_relationship: initial?.next_of_kin_relationship ?? "",
    status: (initial?.status as CustomerFormValues["status"]) ?? "active",
    notes: initial?.notes ?? "",
  }));

  const set = <K extends keyof CustomerFormValues>(k: K, v: CustomerFormValues[K]) =>
    setValues((prev) => ({ ...prev, [k]: v }));

  const editing = Boolean(initial?.id);

  const handleSave = async () => {
    const parsed = customerSchema.safeParse(values);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSaving(true);
    const payload = {
      full_name: parsed.data.full_name,
      id_number: parsed.data.id_number,
      date_of_birth: parsed.data.date_of_birth || null,
      gender: parsed.data.gender || null,
      marital_status: parsed.data.marital_status || null,
      phone: parsed.data.phone,
      alt_phone: parsed.data.alt_phone || null,
      email: parsed.data.email || null,
      physical_address: parsed.data.physical_address || null,
      postal_address: parsed.data.postal_address || null,
      employer: parsed.data.employer || null,
      employment_status: parsed.data.employment_status || null,
      occupation: parsed.data.occupation || null,
      monthly_income: parsed.data.monthly_income ? Number(parsed.data.monthly_income) : null,
      bank_name: parsed.data.bank_name || null,
      bank_account_number: parsed.data.bank_account_number || null,
      bank_branch_code: parsed.data.bank_branch_code || null,
      next_of_kin_name: parsed.data.next_of_kin_name || null,
      next_of_kin_phone: parsed.data.next_of_kin_phone || null,
      next_of_kin_relationship: parsed.data.next_of_kin_relationship || null,
      status: parsed.data.status,
      notes: parsed.data.notes || null,
    };

    if (editing && initial?.id) {
      const { error } = await supabase.from("customers").update(payload).eq("id", initial.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      await logAudit("customer.update", { entity: "customer", entity_id: initial.id });
      toast.success("Customer updated.");
    } else {
      const { data, error } = await supabase
        .from("customers")
        .insert({ ...payload, created_by: user?.id ?? null })
        .select("id, customer_number")
        .single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      await logAudit("customer.create", { entity: "customer", entity_id: data.id, meta: { customer_number: data.customer_number } });
      toast.success(`Customer ${data.customer_number} created.`);
    }
    setSaving(false);
    onSaved();
  };

  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{editing ? "Edit customer" : "Add customer"}</DialogTitle>
        <DialogDescription>
          {editing ? "Update customer details." : "Register a new customer. A customer number is assigned automatically."}
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="Personal">
          <Field label="Full name *"><Input value={values.full_name} onChange={(e) => set("full_name", e.target.value)} /></Field>
          <Field label="ID / Passport number *"><Input value={values.id_number} onChange={(e) => set("id_number", e.target.value)} /></Field>
          <Field label="Date of birth"><Input type="date" value={values.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} /></Field>
          <Field label="Gender">
            <Select value={values.gender || "unset"} onValueChange={(v) => set("gender", v === "unset" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unset">—</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Marital status">
            <Select value={values.marital_status || "unset"} onValueChange={(v) => set("marital_status", v === "unset" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unset">—</SelectItem>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="married">Married</SelectItem>
                <SelectItem value="divorced">Divorced</SelectItem>
                <SelectItem value="widowed">Widowed</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </Section>

        <Section title="Contact">
          <Field label="Phone *"><Input value={values.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Alternate phone"><Input value={values.alt_phone} onChange={(e) => set("alt_phone", e.target.value)} /></Field>
          <Field label="Email"><Input type="email" value={values.email} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="Physical address"><Textarea rows={2} value={values.physical_address} onChange={(e) => set("physical_address", e.target.value)} /></Field>
          <Field label="Postal address"><Textarea rows={2} value={values.postal_address} onChange={(e) => set("postal_address", e.target.value)} /></Field>
        </Section>

        <Section title="Employment">
          <Field label="Employer"><Input value={values.employer} onChange={(e) => set("employer", e.target.value)} /></Field>
          <Field label="Employment status">
            <Select value={values.employment_status || "unset"} onValueChange={(v) => set("employment_status", v === "unset" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unset">—</SelectItem>
                <SelectItem value="employed">Employed</SelectItem>
                <SelectItem value="self_employed">Self-employed</SelectItem>
                <SelectItem value="pensioner">Pensioner</SelectItem>
                <SelectItem value="unemployed">Unemployed</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Occupation"><Input value={values.occupation} onChange={(e) => set("occupation", e.target.value)} /></Field>
          <Field label="Monthly income (N$)"><Input type="number" step="0.01" value={values.monthly_income} onChange={(e) => set("monthly_income", e.target.value)} /></Field>
        </Section>

        <Section title="Banking">
          <Field label="Bank"><Input value={values.bank_name} onChange={(e) => set("bank_name", e.target.value)} /></Field>
          <Field label="Account number"><Input value={values.bank_account_number} onChange={(e) => set("bank_account_number", e.target.value)} /></Field>
          <Field label="Branch code"><Input value={values.bank_branch_code} onChange={(e) => set("bank_branch_code", e.target.value)} /></Field>
        </Section>

        <Section title="Next of kin">
          <Field label="Name"><Input value={values.next_of_kin_name} onChange={(e) => set("next_of_kin_name", e.target.value)} /></Field>
          <Field label="Phone"><Input value={values.next_of_kin_phone} onChange={(e) => set("next_of_kin_phone", e.target.value)} /></Field>
          <Field label="Relationship"><Input value={values.next_of_kin_relationship} onChange={(e) => set("next_of_kin_relationship", e.target.value)} /></Field>
        </Section>

        <Section title="Status & notes">
          <Field label="Status">
            <Select value={values.status} onValueChange={(v) => set("status", v as CustomerFormValues["status"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="blacklisted">Blacklisted</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Notes"><Textarea rows={3} value={values.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
        </Section>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          {editing ? "Save changes" : "Create customer"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

