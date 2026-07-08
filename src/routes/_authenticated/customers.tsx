import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({ meta: [{ title: "Customers — MicroFin NA" }] }),
  component: () => <ComingSoon title="Customers" description="Manage customer records, documents and history." />,
});
