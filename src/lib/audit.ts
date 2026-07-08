import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "login"
  | "logout"
  | "user.create"
  | "user.update"
  | "role.assign"
  | "role.revoke"
  | "customer.create"
  | "customer.update"
  | "loan.apply"
  | "loan.approve"
  | "loan.decline"
  | "loan.disburse"
  | "repayment.record"
  | "document.upload"
  | "report.export";

export async function logAudit(action: AuditAction, opts?: { entity?: string; entity_id?: string; meta?: Record<string, unknown> }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("audit_log").insert({
    user_id: user.id,
    action,
    entity: opts?.entity ?? null,
    entity_id: opts?.entity_id ?? null,
    meta: opts?.meta ?? {},
  });
}
