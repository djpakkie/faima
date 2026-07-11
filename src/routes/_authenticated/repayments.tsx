import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { logAudit } from "@/lib/audit";
import { generateReceiptPdf } from "@/lib/receipt-pdf";
import { formatNAD, formatDate, formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { CreditCard, Download, Loader2, Plus, Search, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/repayments")({
  head: () => ({ meta: [{ title: "Repayments — Faima Cash Solutions" }] }),
  component: RepaymentsPage,
});

type Repayment = {
  id: string;
  receipt_number: string;
  loan_id: string;
  amount: number;
  penalty: number;
  method: string;
  reference: string | null;
  notes: string | null;
  paid_on: string;
  created_at: string;
  loans?: {
    loan_number: string;
    customer_id: string;
    customers?: { full_name: string; customer_number: string } | null;
  } | null;
};

type LoanOption = {
  id: string;
  loan_number: string;
  outstanding_balance: number;
  status: string;
  customers: { full_name: string; customer_number: string } | null;
};

type ScheduleRow = {
  id: string;
  seq: number;
  due_date: string;
  instalment: number;
  paid_amount: number;
  status: string;
};

const METHODS = [
  { value: "cash", label: "Cash" },
  { value: "eft", label: "EFT" },
  { value: "mobile", label: "Mobile money" },
  { value: "cheque", label: "Cheque" },
];

function RepaymentsPage() {
  const { user, hasAnyRole } = useAuth();
  const canRecord = hasAnyRole(["administrator", "finance_officer"]);

  const [rows, setRows] = useState<Repayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [method, setMethod] = useState<string>("all");
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("repayments")
      .select(
        "id, receipt_number, loan_id, amount, penalty, method, reference, notes, paid_on, created_at, loans(loan_number, customer_id, customers(full_name, customer_number))",
      )
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) toast.error(error.message);
    setRows((data ?? []) as unknown as Repayment[]);
    setLoading(false);
  };
  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (method !== "all" && r.method !== method) return false;
      if (!needle) return true;
      return (
        r.receipt_number.toLowerCase().includes(needle) ||
        r.loans?.loan_number.toLowerCase().includes(needle) ||
        r.loans?.customers?.full_name.toLowerCase().includes(needle) ||
        (r.reference ?? "").toLowerCase().includes(needle)
      );
    });
  }, [rows, q, method]);

  const totals = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const monthPrefix = today.slice(0, 7);
    return {
      today: rows
        .filter((r) => r.paid_on === today)
        .reduce((s, r) => s + Number(r.amount) + Number(r.penalty), 0),
      month: rows
        .filter((r) => r.paid_on.startsWith(monthPrefix))
        .reduce((s, r) => s + Number(r.amount) + Number(r.penalty), 0),
      count: rows.length,
    };
  }, [rows]);

  const downloadReceipt = async (r: Repayment) => {
    const doc = await generateReceiptPdf({
      receiptNumber: r.receipt_number,
      paidOn: r.paid_on,
      loanNumber: r.loans?.loan_number ?? "—",
      customerName: r.loans?.customers?.full_name ?? "—",
      customerNumber: r.loans?.customers?.customer_number ?? "—",
      amount: Number(r.amount),
      penalty: Number(r.penalty),
      method: r.method,
      reference: r.reference,
      notes: r.notes,
      outstandingBefore: 0,
      outstandingAfter: 0,
      recordedByEmail: user?.email ?? null,
    });
    doc.save(`${r.receipt_number}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" /> Repayments
          </h1>
          <p className="text-sm text-muted-foreground">Record payments and issue receipts.</p>
        </div>
        {canRecord && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Record payment
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Collected today" value={formatNAD(totals.today)} />
        <StatCard label="Collected this month" value={formatNAD(totals.month)} />
        <StatCard label="Total receipts" value={String(totals.count)} />
      </div>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search receipt #, loan #, customer, reference…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All methods</SelectItem>
                {METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
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
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Loan #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Penalty</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Paid on</TableHead>
                    <TableHead className="text-right">Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.receipt_number}</TableCell>
                      <TableCell className="font-mono text-xs">{r.loans?.loan_number}</TableCell>
                      <TableCell className="font-medium">
                        {r.loans?.customers?.full_name}
                        <div className="text-xs text-muted-foreground font-mono">
                          {r.loans?.customers?.customer_number}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatNAD(Number(r.amount))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {Number(r.penalty) > 0 ? formatNAD(Number(r.penalty)) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.method.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{formatDate(r.paid_on)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(`/print/receipts/${r.id}`, "_blank", "noopener")}
                            title="Print-friendly view"
                          >
                            <Printer className="h-3.5 w-3.5 mr-1" /> Print
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => downloadReceipt(r)}>
                            <Download className="h-3.5 w-3.5 mr-1" /> PDF
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-sm text-muted-foreground py-8"
                      >
                        No repayments recorded yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <RecordPaymentDialog open={open} onOpenChange={setOpen} onRecorded={load} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-bold tabular-nums mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function RecordPaymentDialog({
  open,
  onOpenChange,
  onRecorded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onRecorded: () => void;
}) {
  const { user } = useAuth();
  const [loans, setLoans] = useState<LoanOption[]>([]);
  const [loanPickerOpen, setLoanPickerOpen] = useState(false);
  const [loanId, setLoanId] = useState<string>("");
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [amount, setAmount] = useState("");
  const [penalty, setPenalty] = useState("0");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [paidOn, setPaidOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const { data, error } = await supabase
        .from("loans")
        .select(
          "id, loan_number, outstanding_balance, status, customers(full_name, customer_number)",
        )
        .eq("status", "active")
        .order("loan_number", { ascending: false })
        .limit(500);
      if (error) {
        toast.error(error.message);
        return;
      }
      setLoans((data ?? []) as unknown as LoanOption[]);
    })();
  }, [open]);

  useEffect(() => {
    if (!loanId) {
      setSchedule([]);
      return;
    }
    void (async () => {
      const { data, error } = await supabase
        .from("repayment_schedule")
        .select("id, seq, due_date, instalment, paid_amount, status")
        .eq("loan_id", loanId)
        .neq("status", "paid")
        .order("seq", { ascending: true });
      if (error) {
        toast.error(error.message);
        return;
      }
      setSchedule((data ?? []) as unknown as ScheduleRow[]);
    })();
  }, [loanId]);

  const selectedLoan = loans.find((l) => l.id === loanId) ?? null;
  const nextDue = schedule[0] ?? null;

  const reset = () => {
    setLoanId("");
    setSchedule([]);
    setAmount("");
    setPenalty("0");
    setMethod("cash");
    setReference("");
    setNotes("");
    setPaidOn(new Date().toISOString().slice(0, 10));
  };

  const submit = async () => {
    const amt = Number(amount);
    const pen = Number(penalty) || 0;
    if (!selectedLoan) {
      toast.error("Select a loan");
      return;
    }
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    setBusy(true);

    // Allocate the payment across the outstanding schedule rows, oldest first.
    let remaining = amt;
    const updates: Array<{
      id: string;
      paid_amount: number;
      status: string;
      paid_at: string | null;
    }> = [];
    for (const row of schedule) {
      if (remaining <= 0) break;
      const due = Number(row.instalment) - Number(row.paid_amount);
      if (due <= 0) continue;
      const applied = Math.min(due, remaining);
      const newPaid = Number(row.paid_amount) + applied;
      const isFull = newPaid >= Number(row.instalment) - 0.005;
      updates.push({
        id: row.id,
        paid_amount: newPaid,
        status: isFull ? "paid" : "partial",
        paid_at: isFull ? new Date().toISOString() : null,
      });
      remaining -= applied;
    }

    for (const u of updates) {
      const { error } = await supabase
        .from("repayment_schedule")
        .update({ paid_amount: u.paid_amount, status: u.status, paid_at: u.paid_at })
        .eq("id", u.id);
      if (error) {
        setBusy(false);
        toast.error(error.message);
        return;
      }
    }

    const newOutstanding = Math.max(0, Number(selectedLoan.outstanding_balance) - amt);
    const loanPatch: Record<string, unknown> = { outstanding_balance: newOutstanding };
    if (newOutstanding <= 0) {
      loanPatch.status = "closed";
      loanPatch.closed_at = new Date().toISOString();
    }
    const { error: loanErr } = await supabase
      .from("loans")
      .update(loanPatch as never)
      .eq("id", selectedLoan.id);
    if (loanErr) {
      setBusy(false);
      toast.error(loanErr.message);
      return;
    }

    const { data: receipt, error: recErr } = await supabase
      .from("repayments")
      .insert({
        loan_id: selectedLoan.id,
        amount: amt,
        penalty: pen,
        method,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
        paid_on: paidOn,
        recorded_by: user?.id ?? null,
      })
      .select("id, receipt_number")
      .single();
    if (recErr || !receipt) {
      setBusy(false);
      toast.error(recErr?.message ?? "Failed to record payment");
      return;
    }

    await logAudit("repayment.record", {
      entity: "loan",
      entity_id: selectedLoan.id,
      meta: { receipt_number: receipt.receipt_number, amount: amt, penalty: pen },
    });

    const doc = await generateReceiptPdf({
      receiptNumber: receipt.receipt_number,
      paidOn,
      loanNumber: selectedLoan.loan_number,
      customerName: selectedLoan.customers?.full_name ?? "—",
      customerNumber: selectedLoan.customers?.customer_number ?? "—",
      amount: amt,
      penalty: pen,
      method,
      reference,
      notes,
      outstandingBefore: Number(selectedLoan.outstanding_balance),
      outstandingAfter: newOutstanding,
      recordedByEmail: user?.email ?? null,
    });
    doc.save(`${receipt.receipt_number}.pdf`);

    setBusy(false);
    toast.success(`Payment recorded. Receipt ${receipt.receipt_number} generated.`);
    onRecorded();
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Loan</Label>
            <Popover open={loanPickerOpen} onOpenChange={setLoanPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal"
                >
                  {selectedLoan
                    ? `${selectedLoan.loan_number} — ${selectedLoan.customers?.full_name}`
                    : "Select a loan…"}
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[420px] p-0">
                <Command>
                  <CommandInput placeholder="Search loan # or customer…" />
                  <CommandList>
                    <CommandEmpty>No active loans found.</CommandEmpty>
                    <CommandGroup>
                      {loans.map((l) => (
                        <CommandItem
                          key={l.id}
                          value={`${l.loan_number} ${l.customers?.full_name ?? ""} ${l.customers?.customer_number ?? ""}`}
                          onSelect={() => {
                            setLoanId(l.id);
                            setLoanPickerOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              loanId === l.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <div className="flex-1">
                            <div className="text-sm">
                              {l.loan_number} — {l.customers?.full_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Outstanding: {formatNAD(Number(l.outstanding_balance))}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {selectedLoan && (
            <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Outstanding balance</span>
                <span className="font-medium tabular-nums">
                  {formatNAD(Number(selectedLoan.outstanding_balance))}
                </span>
              </div>
              {nextDue ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Next due (#{nextDue.seq}, {formatDate(nextDue.due_date)})
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatNAD(Number(nextDue.instalment) - Number(nextDue.paid_amount))}
                  </span>
                </div>
              ) : (
                <div className="text-muted-foreground">No outstanding instalments.</div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount received (N$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Penalty (N$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={penalty}
                onChange={(e) => setPenalty(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date paid</Label>
              <Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Reference (optional)</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Transaction / cheque #"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !loanId}>
            {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
            Record & generate receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
