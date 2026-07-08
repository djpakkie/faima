import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — MicroFin NA" }] }),
  component: () => <ComingSoon title="Notifications" description="Internal alerts for approvals, payments and documents." />,
});
