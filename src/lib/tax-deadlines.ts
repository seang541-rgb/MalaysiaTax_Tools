/**
 * Malaysian tax filing deadlines (annual, recurring).
 *
 * Individuals:
 *   - Form BE (employment income, no business): paper 30 Apr, e-Filing 15 May
 *   - Form B  (with business income / sole prop): paper 30 Jun, e-Filing 15 Jul
 *
 * Company Form C is due 7 months after the financial year-end (no fixed
 * calendar date), so it is surfaced as guidance text rather than a countdown.
 */

export interface TaxDeadline {
  id: string; // translation key suffix under "deadlines.items"
  month: number; // 1-12
  day: number;
  efiling: boolean;
}

export const TAX_DEADLINES: TaxDeadline[] = [
  { id: "bePaper", month: 4, day: 30, efiling: false },
  { id: "beEfiling", month: 5, day: 15, efiling: true },
  { id: "bPaper", month: 6, day: 30, efiling: false },
  { id: "bEfiling", month: 7, day: 15, efiling: true },
];

export interface DeadlineOccurrence {
  id: string;
  efiling: boolean;
  date: Date; // next occurrence (this year if still ahead, else next year)
  daysRemaining: number;
  nextYear: boolean; // true when this year's date has already passed
}

/** Next occurrence of each deadline from `now`, sorted soonest first. */
export function nextOccurrences(now: Date = new Date()): DeadlineOccurrence[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return TAX_DEADLINES.map((d) => {
    let year = today.getFullYear();
    let date = new Date(year, d.month - 1, d.day);
    let nextYear = false;
    if (date.getTime() < today.getTime()) {
      year += 1;
      date = new Date(year, d.month - 1, d.day);
      nextYear = true;
    }
    const daysRemaining = Math.round(
      (date.getTime() - today.getTime()) / 86_400_000
    );
    return { id: d.id, efiling: d.efiling, date, daysRemaining, nextYear };
  }).sort((a, b) => a.daysRemaining - b.daysRemaining);
}
