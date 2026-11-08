import { parseAmount } from "./money.ts";

// An imported row with no fee leaves the column empty, which means a fee of 0.
export function refundDue(row: { paid: string; fee?: string }): number {
  return parseAmount(row.paid) - parseAmount(row.fee ?? "");
}
