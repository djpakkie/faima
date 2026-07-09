import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatNAD } from "@/lib/format";
import { assessAffordability } from "@/lib/loan-math";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Scale, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/affordability")({
  head: () => ({ meta: [{ title: "Affordability calculator — Faima Cash Solutions" }] }),
  component: AffordabilityPage,
});

type CustomerLite = { id: string; full_name: string; customer_number: string; monthly_income: number | null };

function AffordabilityPage() {
  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [income, setIncome] = useState("15000");
  const [expenses, setExpenses] = useState("6000");
  const [debt, setDebt] = useState("0");
  const [instalment, setInstalment] = useState("2500");
  const [maxDti, setMaxDti] = useState("40");

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("customers")
        .select("id, full_name, customer_number, monthly_income")
        .order("full_name")
        .limit(500);
      setCustomers((data ?? []) as CustomerLite[]);
    })();
  }, []);

  const onCustomer = (id: string) => {
    setCustomerId(id);
    const c = customers.find((x) => x.id === id);
    if (c?.monthly_income != null) setIncome(String(c.monthly_income));
  };

  const result = useMemo(
    () =>
      assessAffordability({
        monthlyIncome: Number(income) || 0,
        monthlyExpenses: Number(expenses) || 0,
        existingDebt: Number(debt) || 0,
        proposedMonthlyInstalment: Number(instalment) || 0,
        maxDtiPercent: Number(maxDti) || 40,
      }),
    [income, expenses, debt, instalment, maxDti],
  );

  const verdictBadge = {
    approved: <Badge className="bg-green-600 hover:bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Approved</Badge>,
    marginal: <Badge className="bg-amber-500 hover:bg-amber-500"><AlertTriangle className="h-3 w-3 mr-1" /> Marginal</Badge>,
    declined: <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Declined</Badge>,
  }[result.verdict];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold tracking-tight flex items-center gap-2">
          <Scale className="h-6 w-6 text-primary" /> Affordability calculator
        </h1>
        <p className="text-sm text-muted-foreground">Assess debt-to-income and disposable income for a proposed loan.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Inputs</CardTitle>
            <CardDescription>Optionally load a customer to prefill income.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Customer (optional)</Label>
              <Select value={customerId} onValueChange={onCustomer}>
                <SelectTrigger><SelectValue placeholder="— None —" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name} · {c.customer_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Monthly income (N$)"><Input type="number" value={income} onChange={(e) => setIncome(e.target.value)} /></Field>
              <Field label="Monthly expenses (N$)"><Input type="number" value={expenses} onChange={(e) => setExpenses(e.target.value)} /></Field>
              <Field label="Existing debt service (N$/mo)"><Input type="number" value={debt} onChange={(e) => setDebt(e.target.value)} /></Field>
              <Field label="Proposed instalment (N$/mo)"><Input type="number" value={instalment} onChange={(e) => setInstalment(e.target.value)} /></Field>
              <Field label="Max DTI policy %"><Input type="number" step="1" value={maxDti} onChange={(e) => setMaxDti(e.target.value)} /></Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Verdict</CardTitle>
              <CardDescription>{result.reason}</CardDescription>
            </div>
            {verdictBadge}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Kv label="Net disposable" value={formatNAD(result.netDisposable)} />
              <Kv label="Total debt service" value={formatNAD(result.totalDebtService)} />
              <Kv label="Debt-to-income" value={`${result.dtiPercent.toFixed(1)}%`} />
              <Kv label="Max affordable instalment" value={formatNAD(result.maxAffordableInstalment)} />
            </div>
            <div className="rounded-md border p-3 text-xs text-muted-foreground">
              DTI = (existing debt + proposed instalment) ÷ gross monthly income. Policy limit is configurable per assessment.
              This verdict is advisory — final approval remains at the loan officer / administrator's discretion.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-bold tabular-nums mt-1">{value}</div>
    </div>
  );
}
