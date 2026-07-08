import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/affordability")({
  head: () => ({ meta: [{ title: "Affordability calculator — MicroFin NA" }] }),
  component: () => <ComingSoon title="Affordability calculator" description="Debt-to-income and maximum instalment analysis." />,
});
