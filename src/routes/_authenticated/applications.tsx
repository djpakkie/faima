import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/applications")({
  head: () => ({ meta: [{ title: "Loan applications — MicroFin NA" }] }),
  component: () => <ComingSoon title="Loan applications" description="Create, review, approve or decline loan applications." />,
});
