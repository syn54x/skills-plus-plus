import { parseAmount } from "./money.ts";

export function invoiceTotal(form: { amount: string }): number {
  return parseAmount(form.amount);
}
