import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { logAudit } from "@/lib/audit";
import { formatNAD } from "@/lib/format";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Pencil, Plus, Trash2, Package } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/products")({
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
  head: () => ({ meta: [{ title: "Loan products — Faima Cash Solutions" }] }),
  component: ProductsAdmin,
});

type Product = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  interest_rate_percent: number;
  interest_method: string;
  min_amount: number;
  max_amount: number;
  min_term_months: number;
  max_term_months: number;
  repayment_frequency: string;
  processing_fee_percent: number;
  insurance_fee_percent: number;
  late_fee_percent: number;
  active: boolean;
};

function ProductsAdmin() {
  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [openForm, setOpenForm] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("loan_products").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as Product[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const toggleActive = async (p: Product) => {
    const { error } = await supabase.from("loan_products").update({ active: !p.active }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    await logAudit("product.update", { entity: "loan_product", entity_id: p.id, meta: { active: !p.active } });
    toast.success(!p.active ? "Product activated." : "Product deactivated.");
    void load();
  };

  const remove = async (p: Product) => {
    const { error } = await supabase.from("loan_products").delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    await logAudit("product.delete", { entity: "loan_product", entity_id: p.id });
    toast.success("Product deleted.");
    void load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" /> Loan products
          </h1>
          <p className="text-sm text-muted-foreground">Configure loan products, interest rates, terms and fees.</p>
        </div>
        <Dialog open={openForm} onOpenChange={(v) => { setOpenForm(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4 mr-1" /> New product</Button>
          </DialogTrigger>
          <ProductForm initial={editing} onSaved={() => { setOpenForm(false); setEditing(null); void load(); }} onClose={() => { setOpenForm(false); setEditing(null); }} />
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All products</CardTitle>
          <CardDescription>Only administrators can create, edit or remove loan products.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Term (mo)</TableHead>
                    <TableHead>Freq.</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.code}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell><Badge variant="outline">{p.interest_method === "reducing_balance" ? "Reducing" : "Flat"}</Badge></TableCell>
                      <TableCell className="text-right tabular-nums">{Number(p.interest_rate_percent).toFixed(2)}%</TableCell>
                      <TableCell className="text-right tabular-nums text-xs">{formatNAD(Number(p.min_amount))} – {formatNAD(Number(p.max_amount))}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.min_term_months}–{p.max_term_months}</TableCell>
                      <TableCell className="capitalize">{p.repayment_frequency}</TableCell>
                      <TableCell><Switch checked={p.active} onCheckedChange={() => toggleActive(p)} /></TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(p); setOpenForm(true); }}><Pencil className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete product?</AlertDialogTitle>
                              <AlertDialogDescription>This removes “{p.name}”. Existing loans keep their references but new applications cannot use it.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove(p)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">No loan products yet. Create your first one to enable loan applications.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------- Product Form ----------------------

const productSchema = z.object({
  code: z.string().trim().min(2).max(20).regex(/^[A-Z0-9_-]+$/i, "Letters, numbers, - and _ only"),
  name: z.string().trim().min(2).max(120),
  description: z.string().max(500).optional().or(z.literal("")),
  interest_rate_percent: z.coerce.number().min(0).max(100),
  interest_method: z.enum(["reducing_balance", "flat"]),
  min_amount: z.coerce.number().min(0),
  max_amount: z.coerce.number().min(0),
  min_term_months: z.coerce.number().int().min(1),
  max_term_months: z.coerce.number().int().min(1),
  repayment_frequency: z.enum(["monthly", "weekly", "biweekly"]),
  processing_fee_percent: z.coerce.number().min(0).max(100),
  insurance_fee_percent: z.coerce.number().min(0).max(100),
  late_fee_percent: z.coerce.number().min(0).max(100),
  active: z.boolean(),
}).refine((v) => v.max_amount >= v.min_amount, { message: "Max amount must be ≥ min amount", path: ["max_amount"] })
  .refine((v) => v.max_term_months >= v.min_term_months, { message: "Max term must be ≥ min term", path: ["max_term_months"] });

function ProductForm({ initial, onSaved, onClose }: { initial: Product | null; onSaved: () => void; onClose: () => void }) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [v, setV] = useState({
    code: initial?.code ?? "",
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    interest_rate_percent: initial?.interest_rate_percent != null ? String(initial.interest_rate_percent) : "15",
    interest_method: (initial?.interest_method ?? "reducing_balance") as "reducing_balance" | "flat",
    min_amount: initial?.min_amount != null ? String(initial.min_amount) : "500",
    max_amount: initial?.max_amount != null ? String(initial.max_amount) : "50000",
    min_term_months: initial?.min_term_months != null ? String(initial.min_term_months) : "1",
    max_term_months: initial?.max_term_months != null ? String(initial.max_term_months) : "24",
    repayment_frequency: (initial?.repayment_frequency ?? "monthly") as "monthly" | "weekly" | "biweekly",
    processing_fee_percent: initial?.processing_fee_percent != null ? String(initial.processing_fee_percent) : "2",
    insurance_fee_percent: initial?.insurance_fee_percent != null ? String(initial.insurance_fee_percent) : "0",
    late_fee_percent: initial?.late_fee_percent != null ? String(initial.late_fee_percent) : "5",
    active: initial?.active ?? true,
  });
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((p) => ({ ...p, [k]: val }));

  const save = async () => {
    const parsed = productSchema.safeParse(v);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Invalid input"); return; }
    setSaving(true);
    const payload = { ...parsed.data, description: parsed.data.description || null };
    if (initial) {
      const { error } = await supabase.from("loan_products").update(payload).eq("id", initial.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      await logAudit("product.update", { entity: "loan_product", entity_id: initial.id });
      toast.success("Product updated.");
    } else {
      const { data, error } = await supabase.from("loan_products").insert({ ...payload, created_by: user?.id ?? null }).select("id").single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      await logAudit("product.create", { entity: "loan_product", entity_id: data.id, meta: { code: payload.code } });
      toast.success("Product created.");
    }
    setSaving(false);
    onSaved();
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{initial ? "Edit product" : "New loan product"}</DialogTitle>
        <DialogDescription>Configure a loan product used by applications and the loan calculator.</DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <F label="Code *"><Input value={v.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="e.g. PAYDAY" disabled={!!initial} /></F>
        <F label="Name *"><Input value={v.name} onChange={(e) => set("name", e.target.value)} /></F>
        <F label="Description" className="md:col-span-2"><Textarea rows={2} value={v.description} onChange={(e) => set("description", e.target.value)} /></F>

        <F label="Interest method">
          <Select value={v.interest_method} onValueChange={(x) => set("interest_method", x as typeof v.interest_method)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="reducing_balance">Reducing balance</SelectItem>
              <SelectItem value="flat">Flat rate</SelectItem>
            </SelectContent>
          </Select>
        </F>
        <F label="Interest rate % (annual)"><Input type="number" step="0.01" value={v.interest_rate_percent} onChange={(e) => set("interest_rate_percent", e.target.value)} /></F>

        <F label="Min amount (N$)"><Input type="number" step="0.01" value={v.min_amount} onChange={(e) => set("min_amount", e.target.value)} /></F>
        <F label="Max amount (N$)"><Input type="number" step="0.01" value={v.max_amount} onChange={(e) => set("max_amount", e.target.value)} /></F>

        <F label="Min term (months)"><Input type="number" value={v.min_term_months} onChange={(e) => set("min_term_months", e.target.value)} /></F>
        <F label="Max term (months)"><Input type="number" value={v.max_term_months} onChange={(e) => set("max_term_months", e.target.value)} /></F>

        <F label="Repayment frequency">
          <Select value={v.repayment_frequency} onValueChange={(x) => set("repayment_frequency", x as typeof v.repayment_frequency)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="biweekly">Bi-weekly</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </F>
        <F label="Processing fee %"><Input type="number" step="0.01" value={v.processing_fee_percent} onChange={(e) => set("processing_fee_percent", e.target.value)} /></F>
        <F label="Insurance fee %"><Input type="number" step="0.01" value={v.insurance_fee_percent} onChange={(e) => set("insurance_fee_percent", e.target.value)} /></F>
        <F label="Late fee %"><Input type="number" step="0.01" value={v.late_fee_percent} onChange={(e) => set("late_fee_percent", e.target.value)} /></F>

        <div className="flex items-center gap-3 md:col-span-2 pt-1">
          <Switch checked={v.active} onCheckedChange={(x) => set("active", x)} id="active" />
          <Label htmlFor="active">Active — available for new loan applications</Label>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          {initial ? "Save" : "Create product"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function F({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
