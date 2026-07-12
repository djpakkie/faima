import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { logAudit } from "@/lib/audit";
import { formatNAD, formatDate } from "@/lib/format";
import {
  assessAffordability,
  buildSchedule,
  type Frequency,
  type InterestMethod,
} from "@/lib/loan-math";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Loader2, Plus, ExternalLink, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/applications")({
  head: () => ({ meta: [{ title: "Loan applications — Faima Cash Solutions" }] }),
  component: ApplicationsPage,
});

type Application = {
  id: string;
  application_number: string;
  customer_id: string;
  product_id: string;
  amount: number;
  term_months: number;
  repayment_frequency: Frequency;
  interest_rate_percent: number;
  interest_method: InterestMethod;
  status: string;
  affordability_verdict: string | null;
  created_at: string;
  customers?: { full_name: string; customer_number: string } | null;
  loan_products?: { name: string } | null;
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  under_review: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  recommended: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  approved: "bg-green-500/15 text-green-700 dark:text-green-300",
  declined: "bg-red-500/15 text-red-700 dark:text-red-300",
  disbursed: "bg-emerald-600 text-white",
  withdrawn: "bg-muted text-muted-foreground",
};

function ApplicationsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [openForm, setOpenForm] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("loan_applications")
      .select(
        "id, application_number, customer_id, product_id, amount, term_months, repayment_frequency, interest_rate_percent, interest_method, status, affordability_verdict, created_at, customers(full_name, customer_number), loan_products(name)",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    setRows((data ?? []) as unknown as Application[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (!needle) return true;
      return (
        r.application_number.toLowerCase().includes(needle) ||
        r.customers?.full_name.toLowerCase().includes(needle) ||
        r.customers?.customer_number.toLowerCase().includes(needle) ||
        r.loan_products?.name.toLowerCase().includes(needle)
      );
    });
  }, [rows, q, status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> Loan applications
          </h1>
          <p className="text-sm text-muted-foreground">
            Create, review, approve or decline applications.
          </p>
        </div>
        <Dialog open={openForm} onOpenChange={setOpenForm}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" /> New application
            </Button>
          </DialogTrigger>
          <NewApplicationForm
            onSaved={() => {
              setOpenForm(false);
              void load();
            }}
            onClose={() => setOpenForm(false)}
          />
        </Dialog>
      </div>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search by application #, customer, product…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.keys(STATUS_STYLES).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>App #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Term</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Affordability</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        navigate({
                          to: "/applications/$applicationId",
                          params: { applicationId: r.id },
                        })
                      }
                    >
                      <TableCell className="font-mono text-xs">{r.application_number}</TableCell>
                      <TableCell className="font-medium">
                        {r.customers?.full_name}
                        <div className="text-xs text-muted-foreground font-mono">
                          {r.customers?.customer_number}
                        </div>
                      </TableCell>
                      <TableCell>{r.loan_products?.name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNAD(Number(r.amount))}
                      </TableCell>
                      <TableCell className="text-right">{r.term_months} mo</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_STYLES[r.status] ?? ""}>
                          {r.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs capitalize">{r.affordability_verdict ?? "—"}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(r.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          to="/applications/$applicationId"
                          params={{ applicationId: r.id }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button size="sm" variant="outline">
                            Review <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center text-sm text-muted-foreground py-8"
                      >
                        No applications match.
                      </TableCell>
                    </TableRow>
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

// ---------------- New application form ----------------

type CustomerLite = {
  id: string;
  full_name: string;
  customer_number: string;
  monthly_income: number | null;
};
type ProductLite = {
  id: string;
  name: string;
  interest_rate_percent: number;
  interest_method: InterestMethod;
  min_amount: number;
  max_amount: number;
  min_term_months: number;
  max_term_months: number;
  repayment_frequency: Frequency;
};

const appSchema = z.object({
  customer_id: z.string().uuid(),
  product_id: z.string().uuid(),
  amount: z.coerce.number().positive(),
  term_months: z.coerce.number().int().positive(),
  purpose: z.string().max(500).optional().or(z.literal("")),
  monthly_income: z.coerce.number().nonnegative(),
  monthly_expenses: z.coerce.number().nonnegative(),
  existing_debt: z.coerce.number().nonnegative(),
});

function NewApplicationForm({ onSaved, onClose }: { onSaved: () => void; onClose: () => void }) {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [saving, setSaving] = useState(false);
  const [v, setV] = useState({
    customer_id: "",
    product_id: "",
    amount: "5000",
    term_months: "6",
    purpose: "",
    monthly_income: "0",
    monthly_expenses: "0",
    existing_debt: "0",
  });
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) =>
    setV((p) => ({ ...p, [k]: val }));

  useEffect(() => {
    void (async () => {
      const [c, p] = await Promise.all([
        supabase
          .from("customers")
          .select("id, full_name, customer_number, monthly_income")
          .order("full_name")
          .limit(500),
        supabase.from("loan_products").select("*").eq("active", true).order("name"),
      ]);
      setCustomers((c.data ?? []) as CustomerLite[]);
      setProducts((p.data ?? []) as ProductLite[]);
    })();
  }, []);

  const product = products.find((p) => p.id === v.product_id);
  const onCustomer = (id: string) => {
    set("customer_id", id);
    const c = customers.find((x) => x.id === id);
    if (c?.monthly_income != null) set("monthly_income", String(c.monthly_income));
  };
  const onProduct = (id: string) => {
    set("product_id", id);
    const p = products.find((x) => x.id === id);
    if (p) {
      set("amount", String(Math.max(Number(v.amount) || 0, p.min_amount)));
      set("term_months", String(p.min_term_months));
    }
  };

  const preview = useMemo(() => {
    if (!product) return null;
    const amt = Number(v.amount),
      term = Number(v.term_months);
    if (!amt || !term) return null;
    const sched = buildSchedule({
      principal: amt,
      annualRatePercent: product.interest_rate_percent,
      termMonths: term,
      frequency: product.repayment_frequency,
      method: product.interest_method,
      startDate: new Date(),
    });
    const monthlyInstalment = sched.instalment * (sched.periodsPerYear / 12);
    const aff = assessAffordability({
      monthlyIncome: Number(v.monthly_income) || 0,
      monthlyExpenses: Number(v.monthly_expenses) || 0,
      existingDebt: Number(v.existing_debt) || 0,
      proposedMonthlyInstalment: monthlyInstalment,
    });
    return { sched, aff, monthlyInstalment };
  }, [product, v.amount, v.term_months, v.monthly_income, v.monthly_expenses, v.existing_debt]);

  const submit = async (status: "draft" | "submitted") => {
    const parsed = appSchema.safeParse(v);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    if (!product) {
      toast.error("Select a product");
      return;
    }
    if (parsed.data.amount < product.min_amount || parsed.data.amount > product.max_amount) {
      toast.error(
        `Amount must be between ${formatNAD(product.min_amount)} and ${formatNAD(product.max_amount)}`,
      );
      return;
    }
    if (
      parsed.data.term_months < product.min_term_months ||
      parsed.data.term_months > product.max_term_months
    ) {
      toast.error(
        `Term must be between ${product.min_term_months} and ${product.max_term_months} months`,
      );
      return;
    }
    setSaving(true);
    const payload = {
      ...parsed.data,
      purpose: parsed.data.purpose || null,
      repayment_frequency: product.repayment_frequency,
      interest_rate_percent: product.interest_rate_percent,
      interest_method: product.interest_method,
      status,
      officer_id: user?.id ?? null,
      created_by: user?.id ?? null,
      affordability_verdict: preview?.aff.verdict ?? null,
      affordability_ratio: preview?.aff.dtiPercent ?? null,
    };
    const { data, error } = await supabase
      .from("loan_applications")
      .insert(payload)
      .select("id, application_number")
      .single();
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit("loan.apply", {
      entity: "loan_application",
      entity_id: data.id,
      meta: { number: data.application_number, status },
    });
    toast.success(
      `Application ${data.application_number} ${status === "submitted" ? "submitted" : "saved as draft"}.`,
    );
    onSaved();
  };

  return (
    <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>New loan application</DialogTitle>
        <DialogDescription>
          Fill in the loan details and affordability inputs. A preview will appear below.
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <F label="Customer *">
          <Select value={v.customer_id} onValueChange={onCustomer}>
            <SelectTrigger>
              <SelectValue placeholder="Select a customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.full_name} · {c.customer_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </F>
        <F label="Product *">
          <Select value={v.product_id} onValueChange={onProduct}>
            <SelectTrigger>
              <SelectValue placeholder="Select a product" />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </F>
        <F
          label={`Amount (N$)${product ? ` · ${formatNAD(product.min_amount)}–${formatNAD(product.max_amount)}` : ""}`}
        >
          <Input type="number" value={v.amount} onChange={(e) => set("amount", e.target.value)} />
        </F>
        <F
          label={`Term (months)${product ? ` · ${product.min_term_months}–${product.max_term_months}` : ""}`}
        >
          <Input
            type="number"
            value={v.term_months}
            onChange={(e) => set("term_months", e.target.value)}
          />
        </F>
        <F label="Purpose" className="md:col-span-2">
          <Textarea
            rows={2}
            value={v.purpose}
            onChange={(e) => set("purpose", e.target.value)}
            placeholder="e.g. School fees, business inventory"
          />
        </F>
        <F label="Monthly income (N$)">
          <Input
            type="number"
            value={v.monthly_income}
            onChange={(e) => set("monthly_income", e.target.value)}
          />
        </F>
        <F label="Monthly expenses (N$)">
          <Input
            type="number"
            value={v.monthly_expenses}
            onChange={(e) => set("monthly_expenses", e.target.value)}
          />
        </F>
        <F label="Existing debt (N$/mo)">
          <Input
            type="number"
            value={v.existing_debt}
            onChange={(e) => set("existing_debt", e.target.value)}
          />
        </F>
      </div>

      {preview && (
        <div className="rounded-md border p-3 bg-muted/30 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <Kv
            label={`Instalment (${product?.repayment_frequency})`}
            value={formatNAD(preview.sched.instalment)}
          />
          <Kv label="Monthly equivalent" value={formatNAD(preview.monthlyInstalment)} />
          <Kv label="Total interest" value={formatNAD(preview.sched.totalInterest)} />
          <Kv
            label={`DTI (verdict: ${preview.aff.verdict})`}
            value={`${preview.aff.dtiPercent.toFixed(1)}%`}
          />
        </div>
      )}

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={() => submit("draft")} disabled={saving}>
          Save draft
        </Button>
        <Button onClick={() => submit("submitted")} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Submit for review
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function F({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-bold tabular-nums">{value}</div>
    </div>
  );
}
