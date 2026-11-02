// The outbound check on a skill-feedback body: the six rules in skills/close-epic/FEEDBACK.md. Pure (text and the facts
// about the repo in, hits out), so the rules are tested without gh or git; spp/src/commands/feedback.ts gathers the facts.
import type { UpstreamFeedback } from "./routing.ts";

export type FeedbackContext = {
  profile: UpstreamFeedback;
  ownRepo: string; // owner/repo of the person's checkout; under attributed its URLs, owner/repo and bare repo name pass
  names: string[]; // owner/repo strings from the Epic and its Sub-issues; the own repo counts without being listed
  titles: string[]; // Sub-issue and pull request titles
  paths: string[]; // what `git ls-files` lists
};

export type Hit = { rule: number; name: string; line: number; text: string };

export const RULE_NAMES = ["URLs", "Names", "Paths", "Code", "Titles", "Error text"];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const words = (s: string) => s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

// shortcut: `;` only at a line's end (prose carries mid-line semicolons, the template's own Observed line does), `{` and
// `=>` anywhere; a keyword counts only at a line's start. Upgrade when a real leak slips through.
const CODE = /;\s*$|\{|=>|^\s*(?:import|def|func)\s/;
const FENCE = /^\s*(?:```|~~~)/;
const ERROR_TEXT = /Traceback|Error|^\s+at\s+\S.*:\d+/;
// A commit message is a conventional-commit subject line; exit code is matched in any case.
const COMMIT_OR_EXIT = /exit code|^\s*(?:feat|fix|chore|docs|refactor|test|perf|build|ci|style|revert)(?:\([^)]*\))?!?: /i;

export function checkFeedback(body: string, ctx: FeedbackContext): Hit[] {
  const attributed = ctx.profile === "attributed";
  const own = ctx.ownRepo;
  const ownName = own.split("/").pop() ?? "";

  // Rules 1 and 2 read the line with the attributed exceptions taken out.
  const ownUrl = new RegExp(`https?://github\\.com/${escape(own)}/(?:issues|pull)/\\d+(?:#[\\w-]+)?(?![\\w/-]|\\.\\w)`, "gi");
  const ownString = new RegExp(`(?<![\\w-])${escape(own)}(?![\\w-])`, "gi");
  const ownBare = new RegExp(`(?<![\\w./-])${escape(ownName)}(?![\\w-])`, "gi");
  const scan = (line: string) => (attributed && own ? line.replace(ownUrl, "").replace(ownString, "").replace(ownBare, "") : line);

  const nameTokens = [...new Set([...ctx.names, own].filter(Boolean).flatMap((r) => [r, ...r.split("/")]))]
    .filter((t) => t.length >= 3)
    .map((t) => new RegExp(`(?<![\\w-])${escape(t)}(?![\\w-])`, "i"));

  const files = new Set(ctx.paths);
  const dirs = new Set(ctx.paths.flatMap((p) => p.split("/").slice(0, -1).map((_, i, a) => a.slice(0, i + 1).join("/"))));
  const isPath = (raw: string) => {
    const t = raw.replace(/:\d+(?::\d+)?$/, "").replace(/[.:!?]+$/, "").replace(/^\.\//, "");
    const bare = t.replace(/\/+$/, "");
    return files.has(bare) || ((t.includes("/") || bare !== t) && dirs.has(bare));
  };

  const windows = new Set(ctx.titles.flatMap((t) => {
    const w = words(t);
    return w.slice(0, Math.max(0, w.length - 3)).map((_, i) => w.slice(i, i + 4).join(" "));
  }));

  const hits: Hit[] = [];
  body.replace(/\r/g, "").split("\n").forEach((raw, i) => {
    const text = raw.trim();
    const add = (rule: number) => hits.push({ rule, name: RULE_NAMES[rule - 1], line: i + 1, text });
    const seen = scan(raw);
    if (/https?:\/\//i.test(seen)) add(1);
    if (nameTokens.some((re) => re.test(seen))) add(2);
    if (raw.split(/[\s`'"()[\]<>,;|*]+/).some((t) => t && isPath(t))) add(3);
    if (FENCE.test(raw) || CODE.test(raw)) add(4);
    const lineWords = ` ${words(raw).join(" ")} `;
    if ([...windows].some((w) => lineWords.includes(` ${w} `))) add(5);
    if (ERROR_TEXT.test(raw) || COMMIT_OR_EXIT.test(raw)) add(6);
  });
  return hits;
}
