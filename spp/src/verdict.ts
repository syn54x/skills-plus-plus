// The slice gate's verdict: one `<!-- spp-verdict -->` Marker comment on the pull request, rewritten in place.
// This module owns the trailer's shape both ways: `renderVerdict` for its writer (`spp verdict`) and `readVerdict` for
// every reader (the snapshot that derive gates on, `spp next`'s fix rounds, `spp merge`). Pure: no network, filesystem
// or environment, so derive and the epic board can import it.

export const VERDICT_MARKER = "<!-- spp-verdict -->";

/** The slice gate's verdict on one head of a pull request, as its `<!-- spp-verdict -->` comment's trailer holds it. */
export type Verdict = {
  /** The Sub-issue or One-off the pull request closes, as `spp verdict --ticket` gave it. */
  ticket: string;
  /** The head the verdict was given on: a full sha, or a prefix of at least 7 characters. */
  head: string;
  /** The spec verdict. */
  spec: "pass" | "fail";
  /** The quality verdict. */
  quality: "pass" | "fail";
};

const isResult = (v: unknown): v is Verdict["spec"] => v === "pass" || v === "fail";

/**
 * A verdict trailer as a Verdict, or null when `head`, `spec` or `quality` is missing or malformed, so a renamed field
 * reads as no verdict rather than a silent pass. `ticket` is informational and reads as "" when absent.
 */
export function readVerdict(data: Record<string, unknown> | null | undefined): Verdict | null {
  if (!data || typeof data.head !== "string" || !isResult(data.spec) || !isResult(data.quality)) return null;
  return { ticket: typeof data.ticket === "string" ? data.ticket : "", head: data.head, spec: data.spec, quality: data.quality };
}

// The comment's human lines; the trailer under them holds the Verdict itself.
export function renderVerdict(data: Record<string, unknown>): string {
  const v = data as Verdict;
  return [`**Spec:** ${v.spec}`, `**Quality:** ${v.quality}`, `**Head:** \`${v.head}\``, `**Ticket:** ${v.ticket}`].join("\n");
}
