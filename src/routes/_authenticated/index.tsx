import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Users,
  CreditCard,
  Wallet,
  TrendingDown,
  CalendarClock,
  AlertTriangle,
  Percent,
  Banknote,
} from "lucide-react";
import { formatNAD, formatNumber } from "@/lib/format";
import { BrandMasthead } from "@/components/brand";
import { supabase } from "@/integrations/supabase/client";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Dashboard — Faima Cash Solutions" }] }),
  component: Dashboard,
});

type Metrics = {
  activeCustomers: number;
  activeLoans: number;
  portfolio: number;
  outstanding: number;
  defaultRate: number;
  dueToday: number;
  overdueLoans: number;
  receivedToday: number;
  monthlyIncome: number;
  disbursements: { month: string; value: number }[];
  repayments: { month: string; scheduled: number; received: number }[];
  arrears: { month: string; rate: number }[];
};

const EMPTY: Metrics = {
  activeCustomers: 0,
  activeLoans: 0,
  portfolio: 0,
  outstanding: 0,
  defaultRate: 0,
  dueToday: 0,
  overdueLoans: 0,
  receivedToday: 0,
  monthlyIncome: 0,
  disbursements: [],
  repayments: [],
  arrears: [],
};

function monthKey(d: Date) {
  return d.toLocaleString("en", { month: "short" });
}

function last6Months(): { key: string; start: Date; end: Date }[] {
  const out: { key: string; start: Date; end: Date }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    out.push({ key: monthKey(start), start, end });
  }
  return out;
}

function Metric({
  label,
  value,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "primary" | "success" | "warning" | "destructive" | "info";
}) {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
    info: "bg-info/10 text-info",
  }[tone];

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold truncate">{value}</p>
          </div>
          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${toneClass}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const [m, setM] = useState<Metrics>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
      const buckets = last6Months();
      const rangeStart = buckets[0].start.toISOString();

      const [
        customersRes,
        loansRes,
        scheduleDueRes,
        overdueRes,
        receivedTodayRes,
        monthIncomeRes,
        disbRes,
        schedAllRes,
        repayAllRes,
      ] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("loans").select("principal, outstanding_balance, status"),
        supabase
          .from("repayment_schedule")
          .select("id", { count: "exact", head: true })
          .eq("due_date", todayStr)
          .neq("status", "paid"),
        supabase
          .from("repayment_schedule")
          .select("id", { count: "exact", head: true })
          .lt("due_date", todayStr)
          .neq("status", "paid"),
        supabase.from("repayments").select("amount").gte("paid_at", todayStr),
        supabase.from("repayments").select("amount").gte("paid_at", monthStart),
        supabase.from("loans").select("principal, disbursed_at").gte("disbursed_at", rangeStart),
        supabase
          .from("repayment_schedule")
          .select("due_date, total_due")
          .gte("due_date", buckets[0].start.toISOString().slice(0, 10)),
        supabase.from("repayments").select("paid_at, amount").gte("paid_at", rangeStart),
      ]);

      if (cancelled) return;

      const loans = (loansRes.data ?? []) as { principal: number; outstanding_balance: number; status: string }[];
      const activeLoans = loans.filter((l) => l.status === "active").length;
      const portfolio = loans.reduce((s, l) => s + Number(l.principal || 0), 0);
      const outstanding = loans.reduce((s, l) => s + Number(l.outstanding_balance || 0), 0);
      const defaultRate = activeLoans > 0 ? ((overdueRes.count ?? 0) / activeLoans) * 100 : 0;
      const receivedToday = (receivedTodayRes.data ?? []).reduce((s, r) => s + Number(r.amount || 0), 0);
      const monthlyIncome = (monthIncomeRes.data ?? []).reduce((s, r) => s + Number(r.amount || 0), 0);

      const disbursements = buckets.map((b) => ({
        key: b.key,
        value: (disbRes.data ?? [])
          .filter((r: { disbursed_at: string | null }) => {
            if (!r.disbursed_at) return false;
            const d = new Date(r.disbursed_at);
            return d >= b.start && d < b.end;
          })
          .reduce((s, r: { principal: number }) => s + Number(r.principal || 0), 0),
      })).map((r) => ({ month: r.key, value: r.value }));

      const repayments = buckets.map((b) => {
        const scheduled = (schedAllRes.data ?? [])
          .filter((r: { due_date: string }) => {
            const d = new Date(r.due_date);
            return d >= b.start && d < b.end;
          })
          .reduce((s, r: { total_due: number }) => s + Number(r.total_due || 0), 0);
        const received = (repayAllRes.data ?? [])
          .filter((r: { paid_at: string }) => {
            const d = new Date(r.paid_at);
            return d >= b.start && d < b.end;
          })
          .reduce((s, r: { amount: number }) => s + Number(r.amount || 0), 0);
        return { month: b.key, scheduled, received };
      });

      const arrears = repayments.map((r) => ({
        month: r.month,
        rate: r.scheduled > 0 ? Math.max(0, ((r.scheduled - r.received) / r.scheduled) * 100) : 0,
      }));

      setM({
        activeCustomers: customersRes.count ?? 0,
        activeLoans,
        portfolio,
        outstanding,
        defaultRate,
        dueToday: scheduleDueRes.count ?? 0,
        overdueLoans: overdueRes.count ?? 0,
        receivedToday,
        monthlyIncome,
        disbursements,
        repayments,
        arrears,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <BrandMasthead />

      <div>
        <h2 className="text-lg font-display font-semibold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground">Overview of your microfinance portfolio.</p>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Metric label="Active customers" value={formatNumber(m.activeCustomers)} icon={Users} tone="primary" />
        <Metric label="Active loans" value={formatNumber(m.activeLoans)} icon={CreditCard} tone="info" />
        <Metric label="Loan portfolio" value={formatNAD(m.portfolio, { compact: true })} icon={Wallet} tone="success" />
        <Metric label="Outstanding balance" value={formatNAD(m.outstanding, { compact: true })} icon={Banknote} tone="warning" />
        <Metric label="Default rate" value={`${m.defaultRate.toFixed(1)}%`} icon={Percent} tone="destructive" />
        <Metric label="Due today" value={formatNumber(m.dueToday)} icon={CalendarClock} tone="info" />
        <Metric label="Overdue loans" value={formatNumber(m.overdueLoans)} icon={AlertTriangle} tone="destructive" />
        <Metric label="Received today" value={formatNAD(m.receivedToday)} icon={Wallet} tone="success" />
        <Metric label="This month income" value={formatNAD(m.monthlyIncome, { compact: true })} icon={TrendingDown} tone="primary" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly loan disbursements</CardTitle>
            <CardDescription>Value of loans disbursed each month.</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={m.disbursements}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickFormatter={(v) => `N$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatNAD(v)} contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Area type="monotone" dataKey="value" stroke="var(--color-primary)" fill="url(#g1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Loan repayments</CardTitle>
            <CardDescription>Scheduled vs. actually received.</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={m.repayments}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickFormatter={(v) => `N$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatNAD(v)} contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="scheduled" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="received" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Arrears trend</CardTitle>
            <CardDescription>Shortfall of received vs. scheduled repayments.</CardDescription>
          </CardHeader>
          <CardContent className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={m.arrears}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="rate" stroke="var(--color-destructive)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
