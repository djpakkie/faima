import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { logAudit } from "@/lib/audit";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Loader2, MessageSquarePlus, Phone, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/arrears")({
  head: () => ({ meta: [{ title: "Arrears — MicroFin NA" }] }),
  component: ArrearsPage,
});

type ScheduleRow = {
  id: string;
  loan_id: string;
  due_date: string;
  instalment: number;
  paid_amount: number;
  status: string;
  loans: {
    loan_number: string;
    customer_id: string;
    customers: { full_name: string; customer_number: string; phone: string } | null;
  } | null;
};

type ArrearsNote = {
  id: string;
  loan_id: string;
  note: string;
  follow_up_date: string | null;
  created_at: string;
};

type LoanArrears = {
  loanId: string;
  loanNumber: string;
  customerId: string;
  customerName: string;
  customerNumber: string;
  phone: string;
  overdueAmount: number;
  oldestDueDate: string;
  daysOverdue: number;
  instalmentsOverdue: number;
};

function ArrearsPage() {
  const { hasAnyRole } = useAuth();
  const canWrite = hasAnyRole(["administrator", "loan_officer", "finance_officer"]);

  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [notes, setNotes] = useState<ArrearsNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [bucket, setBucket] = useState<string>("all");
  const [noteFor, setNoteFor] = useState<LoanArrears | null>(null);

  const load = async () => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const [scheduleRes, notesRes] = await Promise.all([
      supabase
        .from("repayment_schedule")
        .select(
          "id, loan_id, due_date, instalment, paid_amount, status, loans(loan_number, customer_id, status, customers(full_name, customer_number, phone))",
        )
        .in("status", ["pending", "partial", "overdue"])
        .lt("due_date", today)
        .order("due_date", { ascending: true })
        .limit(2000),
      supabase
        .from("arrears_notes")
        .select("id, loan_id, note, follow_up_date, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
    ]);
    if (scheduleRes.error) toast.error(scheduleRes.error.message);
    if (notesRes.error) toast.error(notesRes.error.message);
    setRows(((scheduleRes.data ?? []) as unknown as ScheduleRow[]).filter((r) => r.loans));
    setNotes((notesRes.data ?? []) as unknown as ArrearsNote[]);
    setLoading(false);
  };
  useEffect(() => {
    void load();
  }, []);

  const grouped = useMemo<LoanArrears[]>(() => {
    const today = new Date();
    const byLoan = new Map<string, LoanArrears>();
    for (const r of rows) {
      const loan = r.loans;
      if (!loan?.customers) continue;
      const due = Number(r.instalment) - Number(r.paid_amount);
      if (due <= 0) continue;
      const existing = byLoan.get(r.loan_id);
      const days = Math.floor((today.getTime() - new Date(r.due_date).getTime()) / 86_400_000);
      if (existing) {
        existing.overdueAmount += due;
        existing.instalmentsOverdue += 1;
        if (new Date(r.due_date) < new Date(existing.oldestDueDate)) {
          existing.oldestDueDate = r.due_date;
          existing.daysOverdue = days;
        }
      } else {
        byLoan.set(r.loan_id, {
          loanId: r.loan_id,
          loanNumber: loan.loan_number,
          customerId: loan.customer_id,
          customerName: loan.customers.full_name,
          customerNumber: loan.customers.customer_number,
          phone: loan.customers.phone,
          overdueAmount: due,
          oldestDueDate: r.due_date,
          daysOverdue: days,
          instalmentsOverdue: 1,
        });
      }
    }
    return Array.from(byLoan.values()).sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return grouped.filter((g) => {
      if (bucket === "30" && !(g.daysOverdue >= 1 && g.daysOverdue <= 30)) return false;
      if (bucket === "60" && !(g.daysOverdue >= 31 && g.daysOverdue <= 60)) return false;
      if (bucket === "90" && !(g.daysOverdue >= 61 && g.daysOverdue <= 90)) return false;
      if (bucket === "90+" && !(g.daysOverdue > 90)) return false;
      if (!needle) return true;
      return (
        g.loanNumber.toLowerCase().includes(needle) ||
        g.customerName.toLowerCase().includes(needle) ||
        g.customerNumber.toLowerCase().includes(needle) ||
        g.phone.toLowerCase().includes(needle)
      );
    });
  }, [grouped, q, bucket]);

  const totals = useMemo(
    () => ({
      loans: grouped.length,
      amount: grouped.reduce((s, g) => s + g.overdueAmount, 0),
      severe: grouped.filter((g) => g.daysOverdue > 90).length,
    }),
    [grouped],
  );

  const notesFor = (loanId: string) => notes.filter((n) => n.loan_id === loanId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-primary" /> Arrears
        </h1>
        <p className="text-sm text-muted-foreground">
          Overdue customers, collection notes and arrangements.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Loans in arrears" value={String(totals.loans)} />
        <StatCard label="Total overdue" value={formatNAD(totals.amount)} />
        <StatCard label="90+ days overdue" value={String(totals.severe)} />
      </div>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search loan #, customer, phone…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Select value={bucket} onValueChange={setBucket}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All buckets</SelectItem>
                <SelectItem value="30">1–30 days</SelectItem>
                <SelectItem value="60">31–60 days</SelectItem>
                <SelectItem value="90">61–90 days</SelectItem>
                <SelectItem value="90+">90+ days</SelectItem>
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
                    <TableHead>Loan #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Overdue amount</TableHead>
                    <TableHead className="text-right">Instalments</TableHead>
                    <TableHead className="text-right">Days overdue</TableHead>
                    <TableHead>Last note</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((g) => {
                    const latest = notesFor(g.loanId)[0];
                    return (
                      <TableRow key={g.loanId}>
                        <TableCell className="font-mono text-xs">{g.loanNumber}</TableCell>
                        <TableCell className="font-medium">
                          <Link
                            to="/customers/$customerId"
                            params={{ customerId: g.customerId }}
                            className="hover:underline"
                          >
                            {g.customerName}
                          </Link>
                          <div className="text-xs text-muted-foreground font-mono">
                            {g.customerNumber}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {g.phone ? (
                            <a
                              href={`tel:${g.phone}`}
                              className="flex items-center gap-1 hover:underline"
                            >
                              <Phone className="h-3 w-3" />
                              {g.phone}
                            </a>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {formatNAD(g.overdueAmount)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {g.instalmentsOverdue}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              g.daysOverdue > 90
                                ? "destructive"
                                : g.daysOverdue > 30
                                  ? "default"
                                  : "outline"
                            }
                          >
                            {g.daysOverdue}d
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {latest ? `${latest.note} (${formatDate(latest.created_at)})` : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {canWrite && (
                            <Button size="sm" variant="ghost" onClick={() => setNoteFor(g)}>
                              <MessageSquarePlus className="h-3.5 w-3.5 mr-1" /> Note
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-sm text-muted-foreground py-8"
                      >
                        No loans currently in arrears. 🎉
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <NoteDialog
        loan={noteFor}
        history={noteFor ? notesFor(noteFor.loanId) : []}
        onClose={() => setNoteFor(null)}
        onSaved={load}
      />
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

function NoteDialog({
  loan,
  history,
  onClose,
  onSaved,
}: {
  loan: LoanArrears | null;
  history: ArrearsNote[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [note, setNote] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setNote("");
    setFollowUp("");
  }, [loan?.loanId]);

  const submit = async () => {
    if (!loan) return;
    if (!note.trim()) {
      toast.error("Enter a note");
      return;
    }
    setBusy(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("arrears_notes").insert({
      loan_id: loan.loanId,
      note: note.trim(),
      follow_up_date: followUp || null,
      created_by: user?.id ?? null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit("arrears.note", { entity: "loan", entity_id: loan.loanId });
    toast.success("Note added.");
    setNote("");
    setFollowUp("");
    onSaved();
  };

  return (
    <Dialog open={!!loan} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {loan?.loanNumber} — {loan?.customerName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-muted/40 p-3 text-xs flex justify-between">
            <span className="text-muted-foreground">Overdue amount</span>
            <span className="font-medium tabular-nums">
              {loan ? formatNAD(loan.overdueAmount) : "—"} · {loan?.daysOverdue}d overdue
            </span>
          </div>

          <div className="space-y-1.5">
            <Label>New note</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Called customer, promised payment on…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Follow-up date (optional)</Label>
            <Input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
          </div>

          {history.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">History</Label>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {history.map((h) => (
                  <div key={h.id} className="rounded-md border p-2 text-xs">
                    <div>{h.note}</div>
                    <div className="text-muted-foreground mt-1 flex justify-between">
                      <span>{formatDateTime(h.created_at)}</span>
                      {h.follow_up_date && <span>Follow up: {formatDate(h.follow_up_date)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
            Add note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
