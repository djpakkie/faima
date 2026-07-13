import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { logAudit } from "@/lib/audit";
import { formatNAD, formatDate } from "@/lib/format";
import { buildSchedule, type Frequency, type InterestMethod } from "@/lib/loan-math";
import { generateSchedulePdf } from "@/lib/loan-pdf";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, CheckCircle2, XCircle, Send, Download, Banknote, Loader2, ThumbsUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/applications/$applicationId")({
  head: () => ({ meta: [{ title: "Application — Faima Cash Solutions" }] }),
  component: ApplicationDetail,
});

type App = {
  id: string;
  application_number: string;
  customer_id: string;
  product_id: string;
  amount: number;
  term_months: number;
  repayment_frequency: Frequency;
  interest_rate_percent: number;
  interest_method: InterestMethod;
  purpose: string | null;
  status: string;
  officer_id: string | null;
  recommended_by: string | null;
  recommended_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  declined_reason: string | null;
  monthly_income: number | null;
  monthly_expenses: number | null;
  existing_debt: number | null;
  affordability_verdict: string | null;
  affordability_ratio: number | null;
  notes: string | null;
  created_at: string;
  customers?: { id: string; full_name: string; customer_number: string; phone: string | null; email: string | null } | null;
  loan_products?: { name: string; processing_fee_percent: number; insurance_fee_percent: number } | null;
};

function ApplicationDetail() {
  const { applicationId } = Route.useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [app, setApp] = useState<App | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [disburseDate, setDisburseDate] = useState(() => new Date().toISOString().slice(0, 10));

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("loan_applications")
      .select("*, customers(id, full_name, customer_number, phone, email), loan_products(name, processing_fee_percent, insurance_fee_percent)")
      .eq("id", applicationId)
      .single();
    if (error) toast.error(error.message);
    setApp((data ?? null) as unknown as App);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [applicationId]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  if (!app) return <div className="p-6 text-sm">Application not found.</div>;

  const schedule = buildSchedule({
    principal: Number(app.amount),
    annualRatePercent: Number(app.interest_rate_percent),
    termMonths: app.term_months,
    frequency: app.repayment_frequency,
    method: app.interest_method,
    startDate: new Date(),
  });

  const updateStatus = async (patch: Record<string, unknown>, action: string, meta?: Record<string, unknown>) => {
    setBusy(true);
    const { data, error } = await supabase.from("loan_applications").update(patch as never).eq("id", app.id).select("id");
    setBusy(false);
    if (error) { toast.error(error.message); return false; }
    if (!data || data.length === 0) {
      toast.error("No rows updated — your session may have expired or your role can't change this application. Please sign in again.");
      return false;
    }
    await logAudit(action as never, { entity: "loan_application", entity_id: app.id, meta });
    toast.success("Application updated.");
    void load();
    return true;
  };

  const submit = () => updateStatus({ status: "submitted" }, "loan.apply", { transition: "draft→submitted" });
  const recommend = () => updateStatus({ status: "recommended", recommended_by: user?.id ?? null, recommended_at: new Date().toISOString() }, "loan.apply", { transition: "→recommended" });
  const approve = () => updateStatus({ status: "approved", approved_by: user?.id ?? null, approved_at: new Date().toISOString() }, "loan.approve");
  const decline = async () => {
    if (!declineReason.trim()) { toast.error("Enter a reason"); return; }
    await updateStatus({ status: "declined", declined_reason: declineReason.trim(), approved_by: user?.id ?? null, approved_at: new Date().toISOString() }, "loan.decline", { reason: declineReason });
  };

  const disburse = async () => {
    if (!isAdmin) return;
    setBusy(true);
    const start = new Date(disburseDate);
    const sched = buildSchedule({
      principal: Number(app.amount),
      annualRatePercent: Number(app.interest_rate_percent),
      termMonths: app.term_months,
      frequency: app.repayment_frequency,
      method: app.interest_method,
      startDate: start,
    });
    const processingFee = Number(app.amount) * (Number(app.loan_products?.processing_fee_percent ?? 0) / 100);
    const insuranceFee = Number(app.amount) * (Number(app.loan_products?.insurance_fee_percent ?? 0) / 100);

    const { data: loan, error: loanErr } = await supabase.from("loans").insert({
      application_id: app.id,
      customer_id: app.customer_id,
      product_id: app.product_id,
      principal: app.amount,
      interest_rate_percent: app.interest_rate_percent,
      interest_method: app.interest_method,
      term_months: app.term_months,
      repayment_frequency: app.repayment_frequency,
      processing_fee: processingFee,
      insurance_fee: insuranceFee,
      total_interest: sched.totalInterest,
      total_repayable: sched.totalRepayable,
      outstanding_balance: sched.totalRepayable,
      disbursed_at: disburseDate,
      first_due_date: sched.rows[0].dueDate.toISOString().slice(0, 10),
      maturity_date: sched.maturityDate.toISOString().slice(0, 10),
      status: "active",
      disbursed_by: user?.id ?? null,
    }).select("id, loan_number").single();
    if (loanErr || !loan) { setBusy(false); toast.error(loanErr?.message ?? "Disbursement failed"); return; }

    const rows = sched.rows.map((r) => ({
      loan_id: loan.id, seq: r.seq,
      due_date: r.dueDate.toISOString().slice(0, 10),
      principal: r.principal, interest: r.interest,
      instalment: r.instalment, balance_after: r.balance, status: "pending",
    }));
    const { error: schedErr } = await supabase.from("repayment_schedule").insert(rows);
    if (schedErr) { setBusy(false); toast.error(schedErr.message); return; }

    await supabase.from("loan_applications").update({ status: "disbursed" }).eq("id", app.id);
    await logAudit("loan.disburse", { entity: "loan", entity_id: loan.id, meta: { loan_number: loan.loan_number, application_id: app.id } });
    setBusy(false);
    toast.success(`Loan ${loan.loan_number} disbursed.`);
    void navigate({ to: "/loans" });
  };

  const exportPdf = async () => {
    const doc = await generateSchedulePdf(
      {
        title: "Loan Offer / Schedule",
        subtitle: `Application ${app.application_number}`,
        customerName: app.customers?.full_name,
        applicationNumber: app.application_number,
        productName: app.loan_products?.name,
        principal: Number(app.amount),
        annualRatePercent: Number(app.interest_rate_percent),
        termMonths: app.term_months,
        frequency: app.repayment_frequency,
        method: app.interest_method,
        startDate: new Date(),
      },
      schedule,
    );
    doc.save(`${app.application_number}.pdf`);
  };

  const canRecommend = ["submitted", "under_review"].includes(app.status);
  const canApprove = isAdmin && ["submitted", "under_review", "recommended"].includes(app.status);
  const canDisburse = isAdmin && app.status === "approved";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/applications"><Button variant="ghost" size="sm" className="mb-2"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button></Link>
          <h1 className="text-2xl font-display font-semibold tracking-tight flex items-center gap-2">
            {app.application_number}
            <Badge variant="outline" className="uppercase">{app.status.replace(/_/g, " ")}</Badge>
          </h1>
          <p className="text-sm text-muted-foreground">
            {app.customers?.full_name} · <span className="font-mono">{app.customers?.customer_number}</span> · Created {formatDate(app.created_at)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportPdf}><Download className="h-4 w-4 mr-1" /> Export</Button>
          {app.status === "draft" && <Button onClick={submit} disabled={busy}><Send className="h-4 w-4 mr-1" /> Submit</Button>}
          {canRecommend && <Button variant="secondary" onClick={recommend} disabled={busy}><ThumbsUp className="h-4 w-4 mr-1" /> Recommend</Button>}
          {canApprove && <Button onClick={approve} disabled={busy}><CheckCircle2 className="h-4 w-4 mr-1" /> Approve</Button>}
          {(canApprove || canRecommend) && (
            <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="destructive"><XCircle className="h-4 w-4 mr-1" /> Decline</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Decline application?</AlertDialogTitle>
                  <AlertDialogDescription>Provide a reason — this will be recorded and visible to the customer file.</AlertDialogDescription>
                </AlertDialogHeader>
                <Textarea rows={3} value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} placeholder="Reason for declining…" />
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={decline}>Decline</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Loan terms</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Kv label="Product" value={app.loan_products?.name ?? "—"} />
            <Kv label="Amount" value={formatNAD(Number(app.amount))} />
            <Kv label="Term" value={`${app.term_months} months`} />
            <Kv label="Frequency" value={app.repayment_frequency} />
            <Kv label="Rate" value={`${Number(app.interest_rate_percent).toFixed(2)}% p.a. (${app.interest_method === "reducing_balance" ? "reducing" : "flat"})`} />
            <Kv label="Instalment" value={formatNAD(schedule.instalment)} />
            <Kv label="Total interest" value={formatNAD(schedule.totalInterest)} />
            <Kv label="Total repayable" value={formatNAD(schedule.totalRepayable)} />
            {app.purpose && <div><div className="text-xs text-muted-foreground pt-2">Purpose</div><div>{app.purpose}</div></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Affordability snapshot</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Kv label="Monthly income" value={formatNAD(Number(app.monthly_income ?? 0))} />
            <Kv label="Monthly expenses" value={formatNAD(Number(app.monthly_expenses ?? 0))} />
            <Kv label="Existing debt" value={formatNAD(Number(app.existing_debt ?? 0))} />
            <Kv label="Verdict" value={app.affordability_verdict ?? "—"} />
            <Kv label="DTI" value={app.affordability_ratio != null ? `${Number(app.affordability_ratio).toFixed(1)}%` : "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Workflow</CardTitle><CardDescription>Two-step approval when in review.</CardDescription></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Kv label="Recommended" value={app.recommended_at ? formatDate(app.recommended_at) : "—"} />
            <Kv label="Approved" value={app.approved_at ? formatDate(app.approved_at) : "—"} />
            {app.declined_reason && <div><div className="text-xs text-muted-foreground pt-2">Decline reason</div><div className="text-red-600">{app.declined_reason}</div></div>}

            {canDisburse && (
              <div className="pt-3 border-t space-y-2">
                <Label className="text-xs">Disbursement date</Label>
                <Input type="date" value={disburseDate} onChange={(e) => setDisburseDate(e.target.value)} />
                <Button onClick={disburse} disabled={busy} className="w-full">
                  {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Banknote className="h-4 w-4 mr-1" />} Disburse & generate schedule
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Preview schedule</CardTitle><CardDescription>{schedule.numPeriods} instalments · matures {formatDate(schedule.maturityDate)}</CardDescription></CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[420px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead className="text-right">Principal</TableHead>
                  <TableHead className="text-right">Interest</TableHead>
                  <TableHead className="text-right">Instalment</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.rows.map((r) => (
                  <TableRow key={r.seq}>
                    <TableCell className="text-right tabular-nums">{r.seq}</TableCell>
                    <TableCell>{formatDate(r.dueDate)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNAD(r.principal)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNAD(r.interest)}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatNAD(r.instalment)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNAD(r.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Kv({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4"><span className="text-muted-foreground text-xs">{label}</span><span className="font-medium tabular-nums">{value}</span></div>;
}
