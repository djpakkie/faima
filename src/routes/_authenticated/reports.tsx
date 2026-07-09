import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — Faima Cash Solutions" }] }),
  component: () => <ComingSoon title="Reports" description="Portfolio, collections and performance reports." />,
});
