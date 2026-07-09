import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatNAD, formatDate } from "@/lib/format";
import { buildSchedule, type Frequency, type InterestMethod } from "@/lib/loan-math";
import { generateSchedulePdf } from "@/lib/loan-pdf";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calculator, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/calculator")({
  head: () => ({ meta: [{ title: "Loan calculator — MicroFin NA" }] }),
  component: CalculatorPage,
});

type Product = {
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

function CalculatorPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState<string>("");
  const [principal, setPrincipal] = useState("10000");
  const [rate, setRate] = useState("15");
  const [term, setTerm] = useState("12");
  const [freq, setFreq] = useState<Frequency>("monthly");
  const [method, setMethod] = useState<InterestMethod>("reducing_balance");
  const [start, setStart] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("loan_products").select("*").eq("active", true).order("name");
      setProducts((data ?? []) as Product[]);
    })();
  }, []);

  const onProduct = (id: string) => {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setRate(String(p.interest_rate_percent));
    setMethod(p.interest_method);
    setFreq(p.repayment_frequency);
    setTerm(String(p.min_term_months));
  };

  const schedule = useMemo(() => {
    const P = Number(principal), R = Number(rate), T = Number(term);
    if (!P || !T || P <= 0 || T <= 0) return null;
    return buildSchedule({
      principal: P,
      annualRatePercent: R,
      termMonths: T,
      frequency: freq,
      method,
      startDate: new Date(start),
    });
  }, [principal, rate, term, freq, method, start]);

  const product = products.find((p) => p.id === productId);

  const exportPdf = () => {
    if (!schedule) return;
    const doc = generateSchedulePdf(
      {
        title: "Loan Calculator Estimate",
        subtitle: "Indicative amortization schedule",
        productName: product?.name,
        principal: Number(principal),
        annualRatePercent: Number(rate),
        termMonths: Number(term),
        frequency: freq,
        method,
        startDate: new Date(start),
      },
      schedule,
    );
    doc.save(`loan-estimate-${Date.now()}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Calculator className="h-6 w-6 text-primary" /> Loan calculator
        </h1>
        <p className="text-sm text-muted-foreground">
          Estimate instalments and generate an indicative amortization schedule.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Inputs</CardTitle>
            <CardDescription>Select a product to prefill terms, or enter values manually.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Product</Label>
              <Select value={productId} onValueChange={onProduct}>
                <SelectTrigger><SelectValue placeholder="— Custom —" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Principal (N$)</Label>
              <Input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Rate % p.a.</Label>
                <Input type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Term (months)</Label>
                <Input type="number" value={term} onChange={(e) => setTerm(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Method</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as InterestMethod)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reducing_balance">Reducing balance</SelectItem>
                    <SelectItem value="flat">Flat rate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Frequency</Label>
                <Select value={freq} onValueChange={(v) => setFreq(v as Frequency)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Start date</Label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <Button className="w-full" onClick={exportPdf} disabled={!schedule}>
              <Download className="h-4 w-4 mr-1" /> Export PDF
            </Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric label="Instalment" value={schedule ? formatNAD(schedule.instalment) : "—"} sub={freq} />
            <Metric label="Total interest" value={schedule ? formatNAD(schedule.totalInterest) : "—"} />
            <Metric label="Total repayable" value={schedule ? formatNAD(schedule.totalRepayable) : "—"} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Amortization schedule</CardTitle>
              <CardDescription>
                {schedule ? `${schedule.numPeriods} instalments · matures ${formatDate(schedule.maturityDate)}` : "Enter valid inputs to preview the schedule."}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[540px] overflow-auto">
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
                    {schedule?.rows.map((r) => (
                      <TableRow key={r.seq}>
                        <TableCell className="text-right tabular-nums">{r.seq}</TableCell>
                        <TableCell>{formatDate(r.dueDate)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatNAD(r.principal)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatNAD(r.interest)}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{formatNAD(r.instalment)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatNAD(r.balance)}</TableCell>
                      </TableRow>
                    ))}
                    {!schedule && (
                      <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No schedule yet.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-bold tabular-nums mt-1">{value}</div>
        {sub && <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}
