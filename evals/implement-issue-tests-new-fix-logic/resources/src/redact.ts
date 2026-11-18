// Replaces every string held under a key named `token` or `password` with "***".
export function redact(value: unknown): unknown {
  const containers = [Array, Object];
  if (Array.isArray(value)) return value.map(redact);
  if (value !== null && typeof value === "object" && containers.includes(value.constructor as never)) {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = (key === "token" || key === "password") && typeof item === "string" ? "***" : redact(item);
    }
    return out;
  }
  return value;
}
