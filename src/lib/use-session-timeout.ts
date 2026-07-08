import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

const IDLE_MINUTES = 15;
const WARN_SECONDS_BEFORE = 60;

/**
 * Automatically signs the user out after IDLE_MINUTES of no interaction.
 * Attach once at the app shell for authenticated routes.
 */
export function useSessionTimeout(enabled: boolean) {
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warnRef.current) clearTimeout(warnRef.current);
      warnRef.current = setTimeout(
        () => toast.warning(`You will be signed out in ${WARN_SECONDS_BEFORE}s due to inactivity.`),
        (IDLE_MINUTES * 60 - WARN_SECONDS_BEFORE) * 1000,
      );
      timerRef.current = setTimeout(async () => {
        await supabase.auth.signOut();
        toast.info("Signed out due to inactivity.");
        navigate({ to: "/auth" });
      }, IDLE_MINUTES * 60 * 1000);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warnRef.current) clearTimeout(warnRef.current);
    };
  }, [enabled, navigate]);
}
