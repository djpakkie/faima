import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/admin/products")({
  head: () => ({ meta: [{ title: "Loan products — MicroFin NA" }] }),
  component: () => <ComingSoon title="Loan products" description="Configure loan products, rates, terms and fees." />,
});
