import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/arrears")({
  head: () => ({ meta: [{ title: "Arrears — MicroFin NA" }] }),
  component: () => <ComingSoon title="Arrears" description="Overdue customers, collection notes and arrangements." />,
});
