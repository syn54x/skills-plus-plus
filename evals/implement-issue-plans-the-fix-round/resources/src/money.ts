// Parses an amount typed or imported as text, such as "$1,250.00".
export function parseAmount(text: string): number {
  return Number(text.replace(/[$,]/g, ""));
}
