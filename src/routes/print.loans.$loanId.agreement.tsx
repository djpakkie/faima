import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { COMPANY } from "@/lib/company";
import { formatNAD, formatDate, formatDateTime } from "@/lib/format";
import { Printer, X } from "lucide-react";

export const Route = createFileRoute("/print/loans/$loanId/agreement")({
  head: () => ({ meta: [{ title: "Loan Agreement — Faima Cash Solutions" }] }),
  component: PrintAgreement,
});

type Loan = {
  id: string;
  loan_number: string;
  principal: number;
  interest_rate_percent: number;
  interest_method: string;
  term_months: number;
  repayment_frequency: string;
  processing_fee: number;
  insurance_fee: number;
  total_interest: number;
  total_repayable: number;
  outstanding_balance: number;
  disbursed_at: string;
  first_due_date: string;
  maturity_date: string;
  status: string;
  customers: {
    full_name: string;
    customer_number: string;
    id_number: string;
    phone: string | null;
    email: string | null;
    physical_address: string | null;
    postal_address: string | null;
    employer: string | null;
    monthly_income: number | null;
  } | null;
  loan_products: { name: string } | null;
};

type ScheduleRow = {
  seq: number;
  due_date: string;
  principal: number;
  interest: number;
  instalment: number;
  balance_after: number;
};

function PrintAgreement() {
  const { loanId } = Route.useParams();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [autoPrinted, setAutoPrinted] = useState(false);

  useEffect(() => {
    void (async () => {
      const [{ data: l, error: le }, { data: s, error: se }] = await Promise.all([
        supabase
          .from("loans")
          .select(
            "id, loan_number, principal, interest_rate_percent, interest_method, term_months, repayment_frequency, processing_fee, insurance_fee, total_interest, total_repayable, outstanding_balance, disbursed_at, first_due_date, maturity_date, status, customers(full_name, customer_number, id_number, phone, email, physical_address, postal_address, employer, monthly_income), loan_products(name)",
          )
          .eq("id", loanId)
          .single(),
        supabase
          .from("repayment_schedule")
          .select("seq, due_date, principal, interest, instalment, balance_after")
          .eq("loan_id", loanId)
          .order("seq", { ascending: true }),
      ]);
      if (le) setError(le.message);
      if (se) setError(se.message);
      setLoan((l ?? null) as unknown as Loan);
      setRows((s ?? []) as ScheduleRow[]);
    })();
  }, [loanId]);

  useEffect(() => {
    if (loan && rows.length && !autoPrinted) {
      setAutoPrinted(true);
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [loan, rows, autoPrinted]);

  const totals = useMemo(() => {
    return rows.reduce(
      (a, r) => ({
        principal: a.principal + Number(r.principal),
        interest: a.interest + Number(r.interest),
        instalment: a.instalment + Number(r.instalment),
      }),
      { principal: 0, interest: 0, instalment: 0 },
    );
  }, [rows]);

  if (error && !loan) return <div className="print-sheet"><p>Failed to load: {error}</p></div>;
  if (!loan) return <div className="print-sheet"><p>Loading…</p></div>;

  const c = loan.customers;
  const address = [c?.physical_address, c?.postal_address].filter(Boolean).join(" · ") || "—";
  const freqLabel = loan.repayment_frequency.replace(/_/g, " ");
  const methodLabel = loan.interest_method === "reducing_balance" ? "reducing balance" : "flat";
  const instalment = rows[0] ? Number(rows[0].instalment) : loan.total_repayable / (rows.length || 1);

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

      {/* ---------- Page 1: Agreement ---------- */}
      <div className="print-sheet">
        <BrandHeader
          title="LOAN AGREEMENT"
          subtitle={`${loan.loan_number} · Disbursed ${formatDate(loan.disbursed_at)}`}
        />

        <p className="print-clause">
          This Loan Agreement (the "<b>Agreement</b>") is made and entered into on{" "}
          <b>{formatDate(loan.disbursed_at)}</b> between <b>{COMPANY.name}</b> (Reg.{" "}
          {COMPANY.registrationNumber}), a close corporation registered under the laws of Namibia
          (the "<b>Lender</b>"), and the Borrower identified below (the "<b>Borrower</b>").
        </p>

        <div className="print-section-title">1. Parties</div>
        <dl className="print-kv avoid-break">
          <dt>Borrower</dt>
          <dd>{c?.full_name ?? "—"}</dd>
          <dt>Customer number</dt>
          <dd>{c?.customer_number ?? "—"}</dd>
          <dt>ID number</dt>
          <dd>{c?.id_number ?? "—"}</dd>
          <dt>Phone</dt>
          <dd>{c?.phone ?? "—"}</dd>
          <dt>Email</dt>
          <dd>{c?.email ?? "—"}</dd>
          <dt>Address</dt>
          <dd>{address}</dd>
          <dt>Employer</dt>
          <dd>{c?.employer ?? "—"}</dd>
        </dl>

        <div className="print-section-title">2. Loan terms</div>
        <dl className="print-kv avoid-break">
          <dt>Product</dt>
          <dd>{loan.loan_products?.name ?? "—"}</dd>
          <dt>Principal amount</dt>
          <dd>{formatNAD(Number(loan.principal))}</dd>
          <dt>Interest rate</dt>
          <dd>
            {Number(loan.interest_rate_percent).toFixed(2)}% p.a. ({methodLabel})
          </dd>
          <dt>Term</dt>
          <dd>{loan.term_months} months</dd>
          <dt>Repayment frequency</dt>
          <dd style={{ textTransform: "capitalize" }}>{freqLabel}</dd>
          <dt>Instalment</dt>
          <dd>{formatNAD(instalment)}</dd>
          <dt>Processing fee</dt>
          <dd>{formatNAD(Number(loan.processing_fee))}</dd>
          <dt>Insurance fee</dt>
          <dd>{formatNAD(Number(loan.insurance_fee))}</dd>
          <dt>Total interest</dt>
          <dd>{formatNAD(Number(loan.total_interest))}</dd>
          <dt>Total repayable</dt>
          <dd>
            <b>{formatNAD(Number(loan.total_repayable))}</b>
          </dd>
          <dt>Disbursement date</dt>
          <dd>{formatDate(loan.disbursed_at)}</dd>
          <dt>First due date</dt>
          <dd>{formatDate(loan.first_due_date)}</dd>
          <dt>Maturity date</dt>
          <dd>{formatDate(loan.maturity_date)}</dd>
        </dl>

        <div className="print-section-title">3. Terms &amp; conditions</div>
        <p className="print-clause">
          <b>3.1 Repayment.</b> The Borrower shall repay the loan in{" "}
          <b>{rows.length}</b> {freqLabel} instalments of{" "}
          <b>{formatNAD(instalment)}</b> commencing on{" "}
          <b>{formatDate(loan.first_due_date)}</b> and ending on{" "}
          <b>{formatDate(loan.maturity_date)}</b>, in accordance with the Repayment Schedule
          annexed hereto.
        </p>
        <p className="print-clause">
          <b>3.2 Interest.</b> Interest accrues on the outstanding balance at{" "}
          {Number(loan.interest_rate_percent).toFixed(2)}% per annum on a {methodLabel} basis and
          is payable together with each instalment.
        </p>
        <p className="print-clause">
          <b>3.3 Payment method.</b> All repayments shall be made to the Lender's nominated
          account: <b>{COMPANY.bank.name}</b>, {COMPANY.bank.branchName} (branch{" "}
          {COMPANY.bank.branchCode}), quoting the loan number <b>{loan.loan_number}</b> as
          reference.
        </p>
        <p className="print-clause">
          <b>3.4 Late payment.</b> Any instalment not received on the due date will attract a
          penalty in accordance with the Lender's arrears policy and applicable Namibian law
          (Microlending Act 7 of 2018 and the Usury Act as amended). Persistent default may
          result in the loan being handed over for collection.
        </p>
        <p className="print-clause">
          <b>3.5 Early settlement.</b> The Borrower may settle the outstanding balance at any
          time without penalty. On early settlement, unearned interest on the reducing balance
          portion of the loan will be rebated.
        </p>
        <p className="print-clause">
          <b>3.6 Disclosure.</b> The Borrower confirms that the cost of credit, including
          interest, fees, and total repayable, has been fully disclosed and is understood.
        </p>
        <p className="print-clause">
          <b>3.7 Governing law.</b> This Agreement is governed by and construed in accordance
          with the laws of the Republic of Namibia. The parties submit to the jurisdiction of
          the Magistrate's Court having jurisdiction.
        </p>

        <div className="print-signature">
          <div>
            <div className="line">
              For and on behalf of {COMPANY.name}
              <br />
              Authorised signatory · Date
            </div>
          </div>
          <div>
            <div className="line">
              {c?.full_name ?? "Borrower"}
              <br />
              Borrower signature · Date
            </div>
          </div>
        </div>

        <div className="print-footer">
          {COMPANY.name} · Reg. {COMPANY.registrationNumber} · {COMPANY.bank.name} ·{" "}
          {COMPANY.bank.branchName} · Branch {COMPANY.bank.branchCode}
          <br />
          Generated {formatDateTime(new Date())}
        </div>
      </div>

      {/* ---------- Page 2+: Repayment schedule ---------- */}
      <div className="print-sheet page-break">
        <BrandHeader
          title="REPAYMENT SCHEDULE"
          subtitle={`Annexure A · ${loan.loan_number}`}
        />

        <div className="print-callout">
          <b>{c?.full_name ?? "—"}</b> · {c?.customer_number ?? ""} · Loan{" "}
          <b>{loan.loan_number}</b> · {formatNAD(Number(loan.principal))} over{" "}
          {loan.term_months} months at {Number(loan.interest_rate_percent).toFixed(2)}% p.a.
          ({methodLabel})
        </div>

        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: 32 }} className="num">#</th>
              <th>Due date</th>
              <th className="num">Principal</th>
              <th className="num">Interest</th>
              <th className="num">Instalment</th>
              <th className="num">Balance after</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.seq}>
                <td className="num">{r.seq}</td>
                <td>{formatDate(r.due_date)}</td>
                <td className="num">{formatNAD(Number(r.principal))}</td>
                <td className="num">{formatNAD(Number(r.interest))}</td>
                <td className="num">{formatNAD(Number(r.instalment))}</td>
                <td className="num">{formatNAD(Number(r.balance_after))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="num">—</td>
              <td>Totals</td>
              <td className="num">{formatNAD(totals.principal)}</td>
              <td className="num">{formatNAD(totals.interest)}</td>
              <td className="num">{formatNAD(totals.instalment)}</td>
              <td />
            </tr>
          </tfoot>
        </table>

        <div className="print-footer">
          {COMPANY.name} · Reg. {COMPANY.registrationNumber} · Generated{" "}
          {formatDateTime(new Date())}
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
          <img src="/brand/faima-mark-256.png" alt="" width={54} height={54} style={{ borderRadius: 6 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{COMPANY.name}</div>
            <div style={{ fontSize: 10.5, color: "#475569" }}>{COMPANY.tagline}</div>
            <div style={{ fontSize: 10, color: "#64748b" }}>Reg. {COMPANY.registrationNumber}</div>
            <div style={{ fontSize: 10, color: "#64748b" }}>
              {COMPANY.bank.name} · {COMPANY.bank.branchName} · Branch {COMPANY.bank.branchCode}
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
