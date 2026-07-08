import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/loans")({
  head: () => ({ meta: [{ title: "Loans — MicroFin NA" }] }),
  component: () => <ComingSoon title="Loans" description="View active and closed loans with repayment schedules." />,
});
