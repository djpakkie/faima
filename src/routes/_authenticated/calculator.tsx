import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/calculator")({
  head: () => ({ meta: [{ title: "Loan calculator — MicroFin NA" }] }),
  component: () => <ComingSoon title="Loan calculator" description="Amortization schedules with export to PDF." />,
});
