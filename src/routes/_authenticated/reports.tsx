import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatNAD } from "@/lib/format";
import { generateReportPdf } from "@/lib/report-pdf";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  Banknote,
  CreditCard,
  Download,
  FileText,
  Loader2,
  Users,
  AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — Faima Cash Solutions" }] }),
  component: ReportsPage,
});

type ReportKey =
  | "portfolio"
  | "repayments"
  | "arrears"
  | "customers"
  | "applications"
  | "products";

const REPORTS: Array<{
  key: ReportKey;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  needsDateRange?: boolean;
}> = [
  {
    key: "portfolio",
    title: "Loan portfolio",
    description: "All disbursed loans with principal, outstanding balance, status and maturity.",
    icon: Banknote,
  },
  {
    key: "repayments",
    title: "Repayments collected",
    description: "Receipts issued in a date range, by method, with amounts and penalties.",
    icon: CreditCard,
    needsDateRange: true,
  },
  {
    key: "arrears",
    title: "Arrears aging",
    description: "All overdue instalments with days past due, outstanding amount and customer.",
    icon: AlertTriangle,
  },
  {
    key: "customers",
    title: "Customer register",
    description: "Full customer list with contact, employer, income and status.",
    icon: Users,
  },
  {
    key: "applications",
    title: "Loan applications",
    description: "All applications with status, amount, term and applied date.",
    icon: FileText,
    needsDateRange: true,
  },
  {
    key: "products",
    title: "Loan products",
    description: "Configured products with rates, terms, fees and active status.",
    icon: BarChart3,
  },
];

function ReportsPage() {
  const [busy, setBusy] = useState<ReportKey | null>(null);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const runReport = async (key: ReportKey) => {
    setBusy(key);
    try {
      const doc = await buildReport(key, { from, to, statusFilter });
      const stamp = new Date().toISOString().slice(0, 10);
      doc.save(`faima-${key}-${stamp}.pdf`);
      await logAudit("report.export", { entity: "report", meta: { key, from, to } });
      toast.success("Report generated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" /> Reports
        </h1>
        <p className="text-sm text-muted-foreground">
          Download branded PDF reports for portfolio, collections, arrears and compliance.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>Applied to reports that support a date range.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="from">From</Label>
              <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="to">To</Label>
              <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status (applications / portfolio)</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="written_off">Written off</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="disbursed">Disbursed</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          const isBusy = busy === r.key;
          return (
            <Card key={r.key} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-primary/10 p-2 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-base">{r.title}</CardTitle>
                </div>
                <CardDescription className="pt-1.5">{r.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-0">
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={isBusy || busy !== null}
                  onClick={() => runReport(r.key)}
                >
                  {isBusy ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-1.5" />
                  )}
                  {isBusy ? "Generating…" : "Download PDF"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Report builders — each returns a jsPDF ready for `.save()`.
// ============================================================================

type ReportOpts = { from: string; to: string; statusFilter: string };

async function buildReport(key: ReportKey, opts: ReportOpts) {
  switch (key) {
    case "portfolio":
      return buildPortfolio(opts);
    case "repayments":
      return buildRepayments(opts);
    case "arrears":
      return buildArrears();
    case "customers":
      return buildCustomers();
    case "applications":
      return buildApplications(opts);
    case "products":
      return buildProducts();
  }
}

async function buildPortfolio({ statusFilter }: ReportOpts) {
  let q = supabase
    .from("loans")
    .select(
      "loan_number, principal, outstanding_balance, disbursed_at, maturity_date, status, customers(full_name, customer_number), loan_products(name)",
    )
    .order("disbursed_at", { ascending: false });
  if (statusFilter !== "all") q = q.eq("status", statusFilter);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as unknown as Array<{
    loan_number: string;
    principal: number;
    outstanding_balance: number;
    disbursed_at: string;
    maturity_date: string;
    status: string;
    customers: { full_name: string; customer_number: string } | null;
    loan_products: { name: string } | null;
  }>;

  const totalPrincipal = rows.reduce((s, r) => s + Number(r.principal), 0);
  const totalOutstanding = rows
    .filter((r) => r.status === "active")
    .reduce((s, r) => s + Number(r.outstanding_balance), 0);

  return generateReportPdf({
    title: "Loan Portfolio Report",
    subtitle: `As of ${formatDate(new Date())}`,
    orientation: "landscape",
    filters: [["Status", statusFilter === "all" ? "All" : statusFilter]],
    summary: [
      ["Total loans", String(rows.length)],
      ["Active loans", String(rows.filter((r) => r.status === "active").length)],
      ["Total disbursed", formatNAD(totalPrincipal)],
      ["Outstanding (active)", formatNAD(totalOutstanding)],
    ],
    columns: [
      { header: "Loan #", width: 90 },
      { header: "Customer" },
      { header: "Product" },
      { header: "Principal", align: "right", width: 80 },
      { header: "Outstanding", align: "right", width: 80 },
      { header: "Disbursed", width: 70 },
      { header: "Maturity", width: 70 },
      { header: "Status", width: 60 },
    ],
    rows: rows.map((r) => [
      r.loan_number,
      `${r.customers?.full_name ?? "—"}\n${r.customers?.customer_number ?? ""}`,
      r.loan_products?.name ?? "—",
      formatNAD(Number(r.principal)),
      formatNAD(Number(r.outstanding_balance)),
      formatDate(r.disbursed_at),
      formatDate(r.maturity_date),
      r.status.replace(/_/g, " "),
    ]),
    totals: ["", "", "Totals", formatNAD(totalPrincipal), formatNAD(totalOutstanding), "", "", ""],
  });
}

async function buildRepayments({ from, to }: ReportOpts) {
  const { data, error } = await supabase
    .from("repayments")
    .select(
      "receipt_number, amount, penalty, method, reference, paid_on, loans(loan_number, customers(full_name, customer_number))",
    )
    .gte("paid_on", from)
    .lte("paid_on", to)
    .order("paid_on", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as unknown as Array<{
    receipt_number: string;
    amount: number;
    penalty: number;
    method: string;
    reference: string | null;
    paid_on: string;
    loans: {
      loan_number: string;
      customers: { full_name: string; customer_number: string } | null;
    } | null;
  }>;

  const totalAmt = rows.reduce((s, r) => s + Number(r.amount), 0);
  const totalPen = rows.reduce((s, r) => s + Number(r.penalty), 0);

  return generateReportPdf({
    title: "Repayments Collected",
    subtitle: `${formatDate(from)} — ${formatDate(to)}`,
    filters: [["From", formatDate(from)], ["To", formatDate(to)]],
    summary: [
      ["Receipts", String(rows.length)],
      ["Total collected", formatNAD(totalAmt)],
      ["Penalties collected", formatNAD(totalPen)],
      ["Grand total", formatNAD(totalAmt + totalPen)],
    ],
    columns: [
      { header: "Receipt #", width: 90 },
      { header: "Paid on", width: 70 },
      { header: "Loan #", width: 90 },
      { header: "Customer" },
      { header: "Method", width: 60 },
      { header: "Amount", align: "right", width: 70 },
      { header: "Penalty", align: "right", width: 60 },
    ],
    rows: rows.map((r) => [
      r.receipt_number,
      formatDate(r.paid_on),
      r.loans?.loan_number ?? "—",
      `${r.loans?.customers?.full_name ?? "—"}\n${r.loans?.customers?.customer_number ?? ""}`,
      r.method.toUpperCase(),
      formatNAD(Number(r.amount)),
      Number(r.penalty) > 0 ? formatNAD(Number(r.penalty)) : "—",
    ]),
    totals: ["", "", "", "", "Totals", formatNAD(totalAmt), formatNAD(totalPen)],
  });
}

async function buildArrears() {
  const { data, error } = await supabase
    .from("repayment_schedule")
    .select(
      "seq, due_date, instalment, paid_amount, status, loans(loan_number, customers(full_name, customer_number, phone))",
    )
    .in("status", ["due", "partial", "overdue"])
    .lt("due_date", new Date().toISOString().slice(0, 10))
    .order("due_date", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as unknown as Array<{
    seq: number;
    due_date: string;
    instalment: number;
    paid_amount: number;
    status: string;
    loans: {
      loan_number: string;
      customers: { full_name: string; customer_number: string; phone: string } | null;
    } | null;
  }>;

  const today = new Date();
  const enriched = rows.map((r) => {
    const outstanding = Math.max(0, Number(r.instalment) - Number(r.paid_amount));
    const daysPastDue = Math.max(
      0,
      Math.floor((today.getTime() - new Date(r.due_date).getTime()) / (1000 * 60 * 60 * 24)),
    );
    return { ...r, outstanding, daysPastDue };
  });
  const totalOutstanding = enriched.reduce((s, r) => s + r.outstanding, 0);

  return generateReportPdf({
    title: "Arrears Aging Report",
    subtitle: `As of ${formatDate(new Date())}`,
    summary: [
      ["Overdue instalments", String(enriched.length)],
      ["Total outstanding", formatNAD(totalOutstanding)],
      [
        "Loans affected",
        String(new Set(enriched.map((r) => r.loans?.loan_number ?? "")).size),
      ],
    ],
    columns: [
      { header: "Loan #", width: 80 },
      { header: "Customer" },
      { header: "Phone", width: 90 },
      { header: "Inst. #", align: "right", width: 40 },
      { header: "Due date", width: 70 },
      { header: "Days late", align: "right", width: 55 },
      { header: "Outstanding", align: "right", width: 80 },
    ],
    rows: enriched.map((r) => [
      r.loans?.loan_number ?? "—",
      `${r.loans?.customers?.full_name ?? "—"}\n${r.loans?.customers?.customer_number ?? ""}`,
      r.loans?.customers?.phone ?? "—",
      String(r.seq),
      formatDate(r.due_date),
      String(r.daysPastDue),
      formatNAD(r.outstanding),
    ]),
    totals: ["", "", "", "", "", "Total", formatNAD(totalOutstanding)],
  });
}

async function buildCustomers() {
  const { data, error } = await supabase
    .from("customers")
    .select(
      "customer_number, full_name, id_number, phone, email, employer, monthly_income, status, created_at",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as Array<{
    customer_number: string;
    full_name: string;
    id_number: string;
    phone: string;
    email: string | null;
    employer: string | null;
    monthly_income: number | null;
    status: string;
    created_at: string;
  }>;

  return generateReportPdf({
    title: "Customer Register",
    orientation: "landscape",
    subtitle: `As of ${formatDate(new Date())}`,
    summary: [
      ["Total customers", String(rows.length)],
      ["Active", String(rows.filter((r) => r.status === "active").length)],
      ["Blacklisted", String(rows.filter((r) => r.status === "blacklisted").length)],
    ],
    columns: [
      { header: "Customer #", width: 80 },
      { header: "Full name" },
      { header: "ID number", width: 90 },
      { header: "Phone", width: 85 },
      { header: "Employer" },
      { header: "Income", align: "right", width: 75 },
      { header: "Status", width: 65 },
      { header: "Added", width: 70 },
    ],
    rows: rows.map((c) => [
      c.customer_number,
      c.full_name,
      c.id_number,
      c.phone,
      c.employer ?? "—",
      c.monthly_income != null ? formatNAD(Number(c.monthly_income)) : "—",
      c.status,
      formatDate(c.created_at),
    ]),
  });
}

async function buildApplications({ from, to, statusFilter }: ReportOpts) {
  let q = supabase
    .from("loan_applications")
    .select(
      "application_number, amount, term_months, interest_rate_percent, status, applied_at, customers(full_name, customer_number), loan_products(name)",
    )
    .gte("applied_at", `${from}T00:00:00`)
    .lte("applied_at", `${to}T23:59:59`)
    .order("applied_at", { ascending: false });
  if (statusFilter !== "all") q = q.eq("status", statusFilter);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as unknown as Array<{
    application_number: string;
    amount: number;
    term_months: number;
    interest_rate_percent: number;
    status: string;
    applied_at: string;
    customers: { full_name: string; customer_number: string } | null;
    loan_products: { name: string } | null;
  }>;

  const totalAmount = rows.reduce((s, r) => s + Number(r.amount), 0);

  return generateReportPdf({
    title: "Loan Applications Report",
    subtitle: `${formatDate(from)} — ${formatDate(to)}`,
    orientation: "landscape",
    filters: [
      ["From", formatDate(from)],
      ["To", formatDate(to)],
      ["Status", statusFilter === "all" ? "All" : statusFilter],
    ],
    summary: [
      ["Applications", String(rows.length)],
      ["Total requested", formatNAD(totalAmount)],
    ],
    columns: [
      { header: "App #", width: 90 },
      { header: "Applied", width: 80 },
      { header: "Customer" },
      { header: "Product" },
      { header: "Amount", align: "right", width: 80 },
      { header: "Term (m)", align: "right", width: 55 },
      { header: "Rate %", align: "right", width: 50 },
      { header: "Status", width: 75 },
    ],
    rows: rows.map((r) => [
      r.application_number,
      formatDate(r.applied_at),
      `${r.customers?.full_name ?? "—"}\n${r.customers?.customer_number ?? ""}`,
      r.loan_products?.name ?? "—",
      formatNAD(Number(r.amount)),
      String(r.term_months),
      Number(r.interest_rate_percent).toFixed(2),
      r.status.replace(/_/g, " "),
    ]),
    totals: ["", "", "", "Total", formatNAD(totalAmount), "", "", ""],
  });
}

async function buildProducts() {
  const { data, error } = await supabase
    .from("loan_products")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;

  return generateReportPdf({
    title: "Loan Products",
    subtitle: `As of ${formatDate(new Date())}`,
    orientation: "landscape",
    summary: [["Total products", String(rows.length)]],
    columns: [
      { header: "Name" },
      { header: "Interest method", width: 100 },
      { header: "Rate % p.a.", align: "right", width: 70 },
      { header: "Min amount", align: "right", width: 80 },
      { header: "Max amount", align: "right", width: 80 },
      { header: "Term (m)", align: "right", width: 60 },
      { header: "Frequency", width: 75 },
      { header: "Active", width: 55 },
    ],
    rows: rows.map((p) => [
      String(p.name ?? "—"),
      String(p.interest_method ?? "—").replace(/_/g, " "),
      Number(p.interest_rate_percent ?? 0).toFixed(2),
      formatNAD(Number(p.min_amount ?? 0)),
      formatNAD(Number(p.max_amount ?? 0)),
      String(p.max_term_months ?? "—"),
      String(p.repayment_frequency ?? "—"),
      p.is_active ? "Yes" : "No",
    ]),
  });
}
