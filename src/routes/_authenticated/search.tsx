import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({ meta: [{ title: "Global search — Faima Cash Solutions" }] }),
  component: () => <ComingSoon title="Global search" description="Search customers, loans, applications and receipts." />,
});
