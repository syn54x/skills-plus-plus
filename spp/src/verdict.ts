// The slice gate's verdict: one `<!-- spp-verdict -->` Marker comment on the pull request, rewritten in place.
// derive reads its trailer back: both verdicts pass on the current head is gate-pass, either fail is gate-fail.
import { writeMarker } from "./markers.ts";
import { VERDICT_MARKER } from "./snapshot.ts";

export { VERDICT_MARKER };

export type Verdict = { ticket: string; head: string; spec: "pass" | "fail"; quality: "pass" | "fail" };

function render(data: Record<string, unknown>): string {
  const v = data as Verdict;
  return [`**Spec:** ${v.spec}`, `**Quality:** ${v.quality}`, `**Head:** \`${v.head}\``, `**Ticket:** ${v.ticket}`].join("\n");
}

// `pr` is a pull request number in the current repo or its URL; a pull request's comments are its issue comments.
// Returns the comment's URL.
export function writeVerdict(pr: string, v: Verdict): Promise<string> {
  const issue = pr.replace(/^(https:\/\/github\.com\/[^/]+\/[^/]+)\/pull\/(\d+)\/?$/, "$1/issues/$2");
  return writeMarker(issue, VERDICT_MARKER, render, { ticket: v.ticket, head: v.head, spec: v.spec, quality: v.quality });
}
