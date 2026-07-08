import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/repayments")({
  head: () => ({ meta: [{ title: "Repayments — MicroFin NA" }] }),
  component: () => <ComingSoon title="Repayments" description="Record payments and issue receipts." />,
});
