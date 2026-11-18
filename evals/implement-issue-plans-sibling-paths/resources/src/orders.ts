// An order's date column is DD/MM/YYYY.
export function orderDue(row: { date: string }): Date {
  return new Date(row.date);
}
