// What `spp feedback file` posts, built in pure code: the grouped Skill feedback issue's title and body, after the
// FEEDBACK.md template with only the fields spp knows outside /close-epic, and the person's tally comment on it.
// spp/src/commands/feedback.ts finds the issue, checks both texts and writes them.
import { createHash, createHmac } from "node:crypto";
import type { FeedbackCandidate } from "./signals.ts";
import { encodeTrailer } from "./snapshot.ts";

/** Where Skill feedback is filed. */
export const FEEDBACK_REPO = "syn54x/skills-plus-plus";

/** The first line of a person's tally comment on a grouped issue. */
export const TALLY_MARKER = "<!-- spp-feedback-tally -->";

/** The values `--change` takes, as FEEDBACK.md's Proposed change field names them. */
export const CHANGES = ["add a check", "tighten the step", "add an example", "drop the step", "unclear"];

/**
 * The key a tally comment carries for the repo it was filed from: the first 12 hex characters of the HMAC-SHA-256 of
 * the lowercased `owner/repo` under the person's `secret` (`tallySecret` in submission.ts). One person keeps one tally
 * per repo on a grouped issue, and since the secret never leaves their machine, nobody can confirm a guessed repo name.
 */
export const repoKey = (repo: string, secret: string): string => createHmac("sha256", secret).update(repo.toLowerCase()).digest("hex").slice(0, 12);

const total = (counts: Record<string, number>) => Object.values(counts).reduce((a, b) => a + b, 0);
const skillStep = (c: FeedbackCandidate) => (c.step ? `${c.skill} ${c.step}` : c.skill);

// Plugin versions in numeric order, part by part, so 2.10.0 sorts after 2.4.0.
function byVersion(a: string, b: string): number {
  const [x, y] = [a, b].map((v) => v.split(".").map(Number));
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  return a < b ? -1 : a > b ? 1 : 0;
}

/** `<skill> <step>: <category> (<signals>/<runs> runs)`, or `(<signals> Signals)` when no run is recorded. */
export function issueTitle(c: FeedbackCandidate, runs: Record<string, number>): string {
  const n = total(runs);
  return `${skillStep(c)}: ${c.category} (${n ? `${c.count}/${n} runs` : `${c.count} Signals`})`;
}

/** The grouped issue's body, written once by whoever files first; its trailer holds the fingerprint it groups. */
export function issueBody(c: FeedbackCandidate, runs: Record<string, number>, change: string, auto: boolean): string {
  return [
    "<!-- spp-feedback/2 -->",
    `**Skill:** ${c.step ? `${c.skill} step ${c.step}` : c.skill}`,
    `**Category:** ${c.category}`,
    `**Observed:** ${c.count} Signals of this category were charged to this step over ${total(runs)} recorded runs.`,
    `**Proposed change:** ${change}`,
    "**Eval case:** the fix lands with an eval case that reproduces this defect, red before the fix and green after it.",
    `**Fingerprint:** ${c.fingerprint}`,
    ...(auto ? ["**Filed by:** spp, unattended (Submission mode Auto)"] : []),
    encodeTrailer({ fingerprint: c.fingerprint, skill: c.skill, step: c.step, category: c.category }),
  ].join("\n") + "\n";
}

/**
 * A person's tally comment, as markers.ts `ownMarkerBody` and `writeOwnMarker` take it: `render` is the text under
 * {@link TALLY_MARKER} (Signals and runs per plugin version, then under Full Detail, `repo` given, the repo and each
 * Signal's evidence, the note, and whether spp filed it unattended), and `data` is its trailer: the same counts and
 * the `repoKey` of the repo it was filed from ({@link repoKey}). The writer adds the maker, as on Marker comments.
 */
export function tallyComment(
  c: FeedbackCandidate,
  runs: Record<string, number>,
  opts: { repoKey: string; repo?: string; note?: string; auto: boolean },
): { render: string; data: Record<string, unknown> } {
  const versions: Record<string, { signals: number; runs: number }> = {};
  for (const v of [...new Set([...Object.keys(c.versions), ...Object.keys(runs)])].sort(byVersion)) versions[v] = { signals: c.versions[v] ?? 0, runs: runs[v] ?? 0 };
  const sections = [
    ["| Plugin version | Signals | Runs |", "| --- | --- | --- |", ...Object.entries(versions).map(([v, n]) => `| ${v} | ${n.signals} | ${n.runs} |`)].join("\n"),
    ...(opts.repo ? [`**Repo:** ${opts.repo}`, ["**Evidence:**", "", ...c.evidence.map((e) => `- ${e.replace(/\s+/g, " ").trim()}`)].join("\n")] : []),
    ...(opts.note ? [`**Note:** ${opts.note}`] : []),
    ...(opts.auto ? ["Filed by spp, unattended (Submission mode Auto)."] : []),
  ];
  return { render: sections.join("\n\n"), data: { fingerprint: c.fingerprint, versions, auto: opts.auto, repoKey: opts.repoKey } };
}

/** The hash `--confirm` must name: the first 12 hex characters of the SHA-256 of the preview text. */
export const previewHash = (preview: string): string => createHash("sha256").update(preview).digest("hex").slice(0, 12);
