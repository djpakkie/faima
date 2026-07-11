import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { COMPANY } from "@/lib/company";
import { formatNAD, formatDate, formatDateTime } from "@/lib/format";
import { Printer, X } from "lucide-react";

export const Route = createFileRoute("/print/receipts/$receiptId")({
  head: () => ({ meta: [{ title: "Receipt — Faima Cash Solutions" }] }),
  component: PrintReceipt,
});

type Receipt = {
  receipt_number: string;
  paid_on: string;
  amount: number;
  penalty: number;
  method: string;
  reference: string | null;
  notes: string | null;
  created_at: string;
  loans: {
    loan_number: string;
    outstanding_balance: number;
    principal: number;
    customers: { full_name: string; customer_number: string; phone: string | null } | null;
    loan_products: { name: string } | null;
  } | null;
};

function PrintReceipt() {
  const { receiptId } = Route.useParams();
  const [r, setR] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoPrinted, setAutoPrinted] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from("repayments")
        .select(
          "receipt_number, paid_on, amount, penalty, method, reference, notes, created_at, loans(loan_number, outstanding_balance, principal, customers(full_name, customer_number, phone), loan_products(name))",
        )
        .eq("id", receiptId)
        .single();
      if (error) setError(error.message);
      setR((data ?? null) as unknown as Receipt);
    })();
  }, [receiptId]);

  useEffect(() => {
    if (r && !autoPrinted) {
      setAutoPrinted(true);
      const t = setTimeout(() => window.print(), 250);
      return () => clearTimeout(t);
    }
  }, [r, autoPrinted]);

  if (error) return <div className="print-sheet"><p>Failed to load: {error}</p></div>;
  if (!r) return <div className="print-sheet"><p>Loading…</p></div>;

  const total = Number(r.amount) + Number(r.penalty);

  return (
    <>
      <div className="print-toolbar no-print">
        <button className="secondary" onClick={() => window.close()}>
          <X className="inline h-3.5 w-3.5 mr-1" /> Close
        </button>
        <button onClick={() => window.print()}>
          <Printer className="inline h-3.5 w-3.5 mr-1" /> Print
        </button>
      </div>

      <div className="print-sheet">
        <BrandHeader title="PAYMENT RECEIPT" subtitle={`${r.receipt_number} · ${formatDate(r.paid_on)}`} />

        <dl className="print-kv">
          <dt>Customer</dt>
          <dd>
            {r.loans?.customers?.full_name ?? "—"}{" "}
            <span style={{ color: "#64748b" }}>({r.loans?.customers?.customer_number ?? "—"})</span>
          </dd>
          <dt>Loan number</dt>
          <dd>{r.loans?.loan_number ?? "—"}</dd>
          <dt>Product</dt>
          <dd>{r.loans?.loan_products?.name ?? "—"}</dd>
          <dt>Payment method</dt>
          <dd>{r.method.toUpperCase()}</dd>
          <dt>Reference</dt>
          <dd>{r.reference?.trim() || "—"}</dd>
        </dl>

        <div className="print-section-title">Amounts</div>
        <table className="print-table">
          <tbody>
            <tr>
              <td>Principal / interest payment</td>
              <td className="num">{formatNAD(Number(r.amount))}</td>
            </tr>
            <tr>
              <td>Penalty</td>
              <td className="num">{formatNAD(Number(r.penalty))}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td>Total received</td>
              <td className="num">{formatNAD(total)}</td>
            </tr>
          </tfoot>
        </table>

        {r.notes?.trim() && (
          <>
            <div className="print-section-title">Notes</div>
            <div className="print-callout" style={{ whiteSpace: "pre-wrap" }}>{r.notes}</div>
          </>
        )}

        <div className="print-callout" style={{ marginTop: 16 }}>
          Received with thanks. This receipt is computer-generated and forms proof of payment
          against loan <b>{r.loans?.loan_number ?? "—"}</b>. Retain for your records.
        </div>

        <div className="print-signature">
          <div>
            <div className="line">Cashier / Officer signature</div>
          </div>
          <div>
            <div className="line">Customer signature</div>
          </div>
        </div>

        <div className="print-footer">
          {COMPANY.name} · Reg. {COMPANY.registrationNumber} · {COMPANY.bank.name} ·{" "}
          {COMPANY.bank.branchName} · Branch {COMPANY.bank.branchCode}
          <br />
          Generated {formatDateTime(new Date())}
        </div>
      </div>
    </>
  );
}

function BrandHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <img src="/brand/faima-mark-256.png" alt="" width={48} height={48} style={{ borderRadius: 6 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{COMPANY.name}</div>
            <div style={{ fontSize: 10, color: "#475569" }}>{COMPANY.tagline}</div>
            <div style={{ fontSize: 9.5, color: "#64748b" }}>Reg. {COMPANY.registrationNumber}</div>
            <div style={{ fontSize: 9.5, color: "#64748b" }}>
              {COMPANY.bank.name} · {COMPANY.bank.branchName} · {COMPANY.bank.branchCode}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="print-h1">{title}</div>
          <div className="print-sub">{subtitle}</div>
        </div>
      </div>
      <hr className="print-hr" />
    </>
  );
}
