import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Users,
  CreditCard,
  Wallet,
  TrendingDown,
  CalendarClock,
  AlertTriangle,
  ArrowUpRight,
  Percent,
  Banknote,
} from "lucide-react";
import { formatNAD, formatNumber } from "@/lib/format";
import { BrandMasthead } from "@/components/brand";
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

// Illustrative placeholder data until Phase 4 wires live metrics
const monthlyDisbursements = [
  { month: "Jan", value: 420_000 },
  { month: "Feb", value: 510_000 },
  { month: "Mar", value: 480_000 },
  { month: "Apr", value: 620_000 },
  { month: "May", value: 700_000 },
  { month: "Jun", value: 655_000 },
];

const repaymentsTrend = [
  { month: "Jan", scheduled: 380_000, received: 355_000 },
  { month: "Feb", scheduled: 410_000, received: 400_000 },
  { month: "Mar", scheduled: 440_000, received: 415_000 },
  { month: "Apr", scheduled: 470_000, received: 460_000 },
  { month: "May", scheduled: 510_000, received: 480_000 },
  { month: "Jun", scheduled: 540_000, received: 525_000 },
];

const arrearsTrend = [
  { month: "Jan", rate: 5.2 },
  { month: "Feb", rate: 4.9 },
  { month: "Mar", rate: 5.4 },
  { month: "Apr", rate: 4.7 },
  { month: "May", rate: 4.3 },
  { month: "Jun", rate: 4.0 },
];

function Metric({
  label,
  value,
  icon: Icon,
  tone = "primary",
  trend,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "primary" | "success" | "warning" | "destructive" | "info";
  trend?: string;
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
            {trend && (
              <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" />
                {trend}
              </p>
            )}
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
  return (
    <div className="space-y-6">
      <BrandMasthead />

      <div>
        <h2 className="text-lg font-display font-semibold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground">Overview of your microfinance portfolio.</p>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Metric
          label="Active customers"
          value={formatNumber(1247)}
          icon={Users}
          tone="primary"
          trend="+42 this month"
        />
        <Metric
          label="Active loans"
          value={formatNumber(863)}
          icon={CreditCard}
          tone="info"
          trend="+18 this month"
        />
        <Metric
          label="Loan portfolio"
          value={formatNAD(18_540_000, { compact: true })}
          icon={Wallet}
          tone="success"
        />
        <Metric
          label="Outstanding balance"
          value={formatNAD(12_310_000, { compact: true })}
          icon={Banknote}
          tone="warning"
        />
        <Metric
          label="Default rate"
          value="4.0%"
          icon={Percent}
          tone="destructive"
          trend="-0.3% vs last month"
        />
        <Metric label="Due today" value={formatNumber(23)} icon={CalendarClock} tone="info" />
        <Metric
          label="Overdue loans"
          value={formatNumber(41)}
          icon={AlertTriangle}
          tone="destructive"
        />
        <Metric label="Received today" value={formatNAD(48_650)} icon={Wallet} tone="success" />
        <Metric
          label="Monthly income"
          value={formatNAD(1_245_000, { compact: true })}
          icon={TrendingDown}
          tone="primary"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly loan disbursements</CardTitle>
            <CardDescription>Value of loans disbursed each month.</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyDisbursements}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                  tickFormatter={(v) => `N$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v: number) => formatNAD(v)}
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-primary)"
                  fill="url(#g1)"
                  strokeWidth={2}
                />
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
              <BarChart data={repaymentsTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                  tickFormatter={(v) => `N$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v: number) => formatNAD(v)}
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                  }}
                />
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
            <CardDescription>Portfolio default rate over time.</CardDescription>
          </CardHeader>
          <CardContent className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={arrearsTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  formatter={(v: number) => `${v}%`}
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="var(--color-destructive)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardContent className="p-4 text-sm text-muted-foreground">
          Live metrics will replace these illustrative charts once the customer, loan, and repayment
          modules are enabled in the following phases.
        </CardContent>
      </Card>
    </div>
  );
}
