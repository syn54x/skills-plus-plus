// A quote's date column is DD/MM/YYYY.
export function quoteExpiry(row: { date: string }): Date {
  return new Date(row.date);
}
