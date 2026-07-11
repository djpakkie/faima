import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatNAD, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Banknote, Loader2, Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/loans")({
  head: () => ({ meta: [{ title: "Loans — Faima Cash Solutions" }] }),
  component: LoansPage,
});

type Loan = {
  id: string;
  loan_number: string;
  customer_id: string;
  principal: number;
  outstanding_balance: number;
  total_repayable: number;
  disbursed_at: string;
  maturity_date: string;
  status: string;
  customers?: { full_name: string; customer_number: string } | null;
  loan_products?: { name: string } | null;
};

function LoansPage() {
  const [rows, setRows] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("loans")
        .select("id, loan_number, customer_id, principal, outstanding_balance, total_repayable, disbursed_at, maturity_date, status, customers(full_name, customer_number), loan_products(name)")
        .order("disbursed_at", { ascending: false })
        .limit(300);
      if (error) toast.error(error.message);
      setRows((data ?? []) as unknown as Loan[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (!needle) return true;
      return (
        r.loan_number.toLowerCase().includes(needle) ||
        r.customers?.full_name.toLowerCase().includes(needle) ||
        r.customers?.customer_number.toLowerCase().includes(needle)
      );
    });
  }, [rows, q, status]);

  const totals = useMemo(() => ({
    disbursed: rows.reduce((s, r) => s + Number(r.principal), 0),
    outstanding: rows.filter((r) => r.status === "active").reduce((s, r) => s + Number(r.outstanding_balance), 0),
    active: rows.filter((r) => r.status === "active").length,
  }), [rows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold tracking-tight flex items-center gap-2"><Banknote className="h-6 w-6 text-primary" /> Loans</h1>
        <p className="text-sm text-muted-foreground">All disbursed loans and their outstanding balances.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active loans" value={String(totals.active)} />
        <StatCard label="Total disbursed" value={formatNAD(totals.disbursed)} />
        <StatCard label="Outstanding" value={formatNAD(totals.outstanding)} />
      </div>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search by loan #, customer…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="written_off">Written off</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loan #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Principal</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead>Disbursed</TableHead>
                    <TableHead>Maturity</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.loan_number}</TableCell>
                      <TableCell className="font-medium">{r.customers?.full_name}<div className="text-xs text-muted-foreground font-mono">{r.customers?.customer_number}</div></TableCell>
                      <TableCell>{r.loan_products?.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNAD(Number(r.principal))}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{formatNAD(Number(r.outstanding_balance))}</TableCell>
                      <TableCell className="text-xs">{formatDate(r.disbursed_at)}</TableCell>
                      <TableCell className="text-xs">{formatDate(r.maturity_date)}</TableCell>
                      <TableCell><Badge variant={r.status === "active" ? "default" : "outline"}>{r.status.replace(/_/g, " ")}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">No loans yet.</TableCell></TableRow>
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card><CardContent className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-bold tabular-nums mt-1">{value}</div>
    </CardContent></Card>
  );
}
