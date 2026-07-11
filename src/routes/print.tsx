import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/print")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth" });
    }
  },
  component: PrintLayout,
});

function PrintLayout() {
  return (
    <div className="print-shell min-h-screen bg-neutral-100 text-neutral-900">
      <style>{`
        @page { size: A4; margin: 18mm 14mm; }
        .print-shell { font-family: Helvetica, Arial, sans-serif; }
        .print-sheet {
          width: 210mm;
          min-height: 297mm;
          margin: 12mm auto;
          padding: 14mm 14mm 18mm;
          background: white;
          box-shadow: 0 6px 30px rgba(0,0,0,0.08);
          box-sizing: border-box;
        }
        .print-toolbar { max-width: 210mm; margin: 12mm auto 0; display: flex; gap: 8px; justify-content: flex-end; }
        .print-toolbar button {
          background: #0f172a; color: white; border: 0; padding: 8px 14px;
          border-radius: 6px; font-size: 13px; cursor: pointer;
        }
        .print-toolbar button.secondary { background: white; color: #0f172a; border: 1px solid #cbd5e1; }
        .print-h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.01em; }
        .print-sub { font-size: 11px; color: #475569; }
        .print-hr { border: 0; border-top: 1px solid #0f172a; margin: 10px 0 16px; }
        .print-kv { display: grid; grid-template-columns: 140px 1fr; gap: 4px 12px; font-size: 11px; }
        .print-kv dt { color: #475569; }
        .print-kv dd { margin: 0; font-weight: 500; }
        .print-table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
        .print-table th { background: #0f172a; color: white; text-align: left; padding: 6px 8px; font-weight: 600; }
        .print-table td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
        .print-table tr:nth-child(even) td { background: #f8fafc; }
        .print-table .num { text-align: right; font-variant-numeric: tabular-nums; }
        .print-table tfoot td { font-weight: 700; border-top: 2px solid #0f172a; background: #f1f5f9; }
        .print-callout { background: #f1f5f9; border-left: 3px solid #0f172a; padding: 10px 12px; font-size: 11px; margin: 12px 0; }
        .print-section-title { font-size: 13px; font-weight: 700; margin: 14px 0 6px; text-transform: uppercase; letter-spacing: 0.04em; }
        .print-clause { font-size: 10.5px; line-height: 1.55; text-align: justify; margin: 4px 0; }
        .print-clause b { font-weight: 700; }
        .print-signature { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 30px; page-break-inside: avoid; }
        .print-signature .line { border-top: 1px solid #0f172a; margin-top: 40px; padding-top: 4px; font-size: 10px; }
        .print-footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 9.5px; color: #64748b; text-align: center; }
        .avoid-break { page-break-inside: avoid; }
        .page-break { page-break-before: always; }
        @media print {
          body { background: white !important; }
          .print-shell { background: white; }
          .print-sheet { box-shadow: none; margin: 0; padding: 0; width: auto; min-height: 0; }
          .print-toolbar, .no-print { display: none !important; }
        }
      `}</style>
      <Outlet />
    </div>
  );
}
