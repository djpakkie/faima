// Loan math utilities: amortization schedules and affordability logic.

export type Frequency = "monthly" | "weekly" | "biweekly";
export type InterestMethod = "reducing_balance" | "flat";

export interface ScheduleInput {
  principal: number;
  annualRatePercent: number;
  termMonths: number;
  frequency: Frequency;
  method: InterestMethod;
  startDate: Date;
}

export interface ScheduleRow {
  seq: number;
  dueDate: Date;
  principal: number;
  interest: number;
  instalment: number;
  balance: number;
}

export interface ScheduleResult {
  rows: ScheduleRow[];
  instalment: number;
  totalInterest: number;
  totalRepayable: number;
  periodsPerYear: number;
  numPeriods: number;
  maturityDate: Date;
}

export function periodsPerYear(freq: Frequency): number {
  return freq === "monthly" ? 12 : freq === "biweekly" ? 26 : 52;
}

export function numberOfPeriods(termMonths: number, freq: Frequency): number {
  if (freq === "monthly") return termMonths;
  if (freq === "biweekly") return Math.round((termMonths / 12) * 26);
  return Math.round((termMonths / 12) * 52);
}

function addPeriod(d: Date, freq: Frequency, n: number): Date {
  const nd = new Date(d);
  if (freq === "monthly") nd.setMonth(nd.getMonth() + n);
  else if (freq === "biweekly") nd.setDate(nd.getDate() + 14 * n);
  else nd.setDate(nd.getDate() + 7 * n);
  return nd;
}

const r2 = (x: number) => Math.round(x * 100) / 100;

export function buildSchedule(input: ScheduleInput): ScheduleResult {
  const { principal, annualRatePercent, frequency, method, startDate } = input;
  const ppy = periodsPerYear(frequency);
  const n = numberOfPeriods(input.termMonths, frequency);
  const rPeriod = annualRatePercent / 100 / ppy;

  const rows: ScheduleRow[] = [];
  let balance = principal;
  let instalment = 0;
  let totalInterest = 0;

  if (method === "reducing_balance") {
    // Standard amortization formula
    instalment =
      rPeriod === 0 ? principal / n : (principal * rPeriod) / (1 - Math.pow(1 + rPeriod, -n));
    instalment = r2(instalment);
    for (let i = 1; i <= n; i++) {
      const interest = r2(balance * rPeriod);
      let principalPart = r2(instalment - interest);
      if (i === n) principalPart = r2(balance); // absorb rounding
      const pay = r2(principalPart + interest);
      balance = r2(balance - principalPart);
      totalInterest = r2(totalInterest + interest);
      rows.push({
        seq: i,
        dueDate: addPeriod(startDate, frequency, i),
        principal: principalPart,
        interest,
        instalment: pay,
        balance: Math.max(0, balance),
      });
    }
  } else {
    // Flat: interest = P * annualRate * years; split evenly across periods
    const years = n / ppy;
    const totalI = r2(principal * (annualRatePercent / 100) * years);
    const principalPerPeriod = r2(principal / n);
    const interestPerPeriod = r2(totalI / n);
    instalment = r2(principalPerPeriod + interestPerPeriod);
    for (let i = 1; i <= n; i++) {
      let principalPart = principalPerPeriod;
      let interest = interestPerPeriod;
      if (i === n) {
        principalPart = r2(balance);
        interest = r2(totalI - interestPerPeriod * (n - 1));
      }
      balance = r2(balance - principalPart);
      totalInterest = r2(totalInterest + interest);
      rows.push({
        seq: i,
        dueDate: addPeriod(startDate, frequency, i),
        principal: principalPart,
        interest,
        instalment: r2(principalPart + interest),
        balance: Math.max(0, balance),
      });
    }
  }

  const totalRepayable = r2(principal + totalInterest);
  const maturityDate = rows[rows.length - 1]?.dueDate ?? startDate;
  return { rows, instalment, totalInterest, totalRepayable, periodsPerYear: ppy, numPeriods: n, maturityDate };
}

// -------- Affordability --------

export interface AffordabilityInput {
  monthlyIncome: number;
  monthlyExpenses: number;
  existingDebt: number;
  proposedMonthlyInstalment: number;
  maxDtiPercent?: number; // default 40%
}

export interface AffordabilityResult {
  netDisposable: number;
  totalDebtService: number;
  dtiPercent: number;
  maxAffordableInstalment: number;
  verdict: "approved" | "marginal" | "declined";
  reason: string;
}

export function assessAffordability(i: AffordabilityInput): AffordabilityResult {
  const maxDti = i.maxDtiPercent ?? 40;
  const netDisposable = r2(i.monthlyIncome - i.monthlyExpenses);
  const totalDebtService = r2(i.existingDebt + i.proposedMonthlyInstalment);
  const dtiPercent = i.monthlyIncome > 0 ? r2((totalDebtService / i.monthlyIncome) * 100) : 100;
  const maxAffordableInstalment = r2(Math.max(0, (i.monthlyIncome * maxDti) / 100 - i.existingDebt));

  let verdict: AffordabilityResult["verdict"] = "approved";
  let reason = `DTI ${dtiPercent}% within ${maxDti}% policy limit.`;
  if (i.proposedMonthlyInstalment > netDisposable) {
    verdict = "declined";
    reason = "Proposed instalment exceeds monthly disposable income.";
  } else if (dtiPercent > maxDti) {
    verdict = "declined";
    reason = `DTI ${dtiPercent}% exceeds ${maxDti}% policy limit.`;
  } else if (dtiPercent > maxDti - 5) {
    verdict = "marginal";
    reason = `DTI ${dtiPercent}% close to ${maxDti}% policy limit — review carefully.`;
  }

  return { netDisposable, totalDebtService, dtiPercent, maxAffordableInstalment, verdict, reason };
}
