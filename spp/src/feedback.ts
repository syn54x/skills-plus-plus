// The outbound check on a skill-feedback body: the six rules in skills/close-epic/FEEDBACK.md. Pure (text and the facts
// about the repo in, hits out), so the rules are tested without gh or git; spp/src/commands/feedback.ts gathers the facts.
//
// The check errs toward blocking: a hit on an innocent line costs a rebuilt body, a miss costs a leak.
import type { SelfImprovementMode } from "./routing.ts";

export type FeedbackContext = {
  profile: SelfImprovementMode;
  ownRepo: string; // owner/repo of the person's checkout; under Full Detail its URLs, owner/repo and bare repo name pass
  names: string[]; // owner/repo strings from the Epic and its Sub-issues; the own repo counts without being listed
  titles: string[]; // Sub-issue and pull request titles
  paths: string[]; // what `git ls-files` lists
};

export type Hit = { rule: number; name: string; line: number; text: string };

export const RULE_NAMES = ["URLs", "Names", "Paths", "Code", "Titles", "Error text"];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const words = (s: string) => s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

const CODE = /;|\{|=>|^\s*(?:import|def|func)\s/;
const FENCE = /^\s*(?:```|~~~)/;
// Rule 1: any scheme://, a www. host, a domain.tld/ with a path, or a scheme-relative //host.tld.
const URL_LIKE = /[a-z][a-z0-9+.-]*:\/\/|(?<![\w.@-])www\./i;
const BARE_HOST = /(?<![\w.@-])(?:[a-z0-9-]+\.)+[a-z]{2,}\/|(?:^|\s)\/\/[a-z0-9-]+\./i;
// Rule 3: a home path leaks a username even when the rest of the path is untracked.
const HOME_PATH = /\/(?:home|Users)\/[^\s/]+|(?<!\w)~\//i;
// Rule 6. shortcut: no pattern recognises an arbitrary commit message, so only a conventional-commit subject line counts.
const ERROR_TEXT = new RegExp(
  [
    "error",
    "fatal:",
    "exception",
    "traceback",
    "panic",
    "exit code",
    "goroutine \\d+",
    '^\\s*File ".*", line \\d+', // Python frame
    "^\\s+at\\s+\\S.*:\\d+", // JavaScript or Java frame
    "[\\w./-]+:\\d+:\\d+", // path:line:col
    "[\\w-]+\\.\\w+:\\d+", // file.ext:line, which covers Go's .go:N +0x and Java's (Bar.java:10)
    "^\\s*(?:feat|fix|chore|docs|refactor|test|perf|build|ci|style|revert)(?:\\([^)]*\\))?!?: ",
  ].join("|"),
  "i",
);

// True when `needle` sits in `line` as a whole path: not glued to a word, dot or dash before it, nor a word or dash after it.
// A `/` before it is fine (absolute paths, diff prefixes), and so are `#L10`, `@main`, `:12` and `=` around it.
function containsPath(line: string, needle: string, slashAfter: boolean): boolean {
  for (let i = line.indexOf(needle); i >= 0; i = line.indexOf(needle, i + 1)) {
    const before = line[i - 1] ?? "";
    const after = line[i + needle.length] ?? "";
    if (/[\w.-]/.test(before) || /[\w-]/.test(after) || (slashAfter && after !== "/")) continue;
    return true;
  }
  return false;
}

export function checkFeedback(body: string, ctx: FeedbackContext): Hit[] {
  const attributed = ctx.profile === "Full Detail"; // the old attributed profile's exceptions
  const own = ctx.ownRepo;
  const ownName = own.split("/").pop() ?? "";

  // Rules 1 and 2 read the line with the attributed exceptions taken out: the own repo's issue and pull request URLs (with
  // or without a scheme), its owner/repo, and its bare repo name.
  const ownUrl = new RegExp(`(?<![\\w.@/-])(?:https?://)?(?:www\\.)?github\\.com/${escape(own)}/(?:issues|pull)/\\d+(?:#[\\w-]+)?(?![\\w/-]|\\.\\w)`, "gi");
  const ownString = new RegExp(`(?<![\\w-])${escape(own)}(?![\\w-])`, "gi");
  const ownBare = new RegExp(`(?<![\\w./-])${escape(ownName)}(?![\\w-])`, "gi");
  const scan = (line: string) => (attributed && own ? line.replace(ownUrl, "").replace(ownString, "").replace(ownBare, "") : line);
  // Rule 3 drops only the own issue and PR URLs and a standalone own owner/repo (ended by whitespace, closing punctuation or
  // a sentence's `.`), so a tracked `app/` or `issues/` cannot block them while `acme/app/models.py` or `acme/app#L1` still hit.
  const ownToken = new RegExp(`(?<![\\w./-])${escape(own)}(?=$|\\s|[)\\]},;>'"\`*!]|\\.(?:\\s|$))`, "gi");
  const scanPaths = (line: string) => (attributed && own ? line.replace(ownUrl, "").replace(ownToken, "") : line);

  // Every name, however short, as a whole word in any case: `hp` blocks "the hp team" and "hp-team", not "http".
  const nameTokens = [...new Set([...ctx.names, own].filter(Boolean).flatMap((r) => [r, ...r.split("/")]))].map(
    (t) => new RegExp(`(?<![A-Za-z0-9_])${escape(t)}(?![A-Za-z0-9_])`, "i"),
  );

  const dirs = [...new Set(ctx.paths.flatMap((p) => p.split("/").slice(0, -1).map((_, i, a) => a.slice(0, i + 1).join("/"))))];
  // A file's basename counts when it has an extension (`invoice.ts`, not `spp`), and a nested directory's last segment when
  // written with a slash before or after it (`billing/`, `/billing`); bare words like `spp` or `billing` stay prose.
  const baseNames = [...new Set(ctx.paths.map((p) => p.slice(p.lastIndexOf("/") + 1)).filter((b) => /\.[^.]+$/.test(b)))];
  const segments = [...new Set(dirs.filter((d) => d.includes("/")).map((d) => d.slice(d.lastIndexOf("/") + 1)))].map(
    (s) => new RegExp(`/${escape(s)}(?![\\w-])|(?<![\\w.-])${escape(s)}/`),
  );
  // A one-segment directory counts only when written with its slash, so the word `skills` is not a path.
  const namesPath = (raw: string) => {
    const line = raw.replace(/\\/g, "/");
    return (
      HOME_PATH.test(line) ||
      ctx.paths.some((p) => containsPath(line, p, false)) ||
      dirs.some((d) => containsPath(line, d, !d.includes("/"))) ||
      baseNames.some((b) => containsPath(line, b, false)) ||
      segments.some((re) => re.test(line))
    );
  };

  const windows = new Set(
    ctx.titles.flatMap((t) => {
      const w = words(t);
      return w.slice(0, Math.max(0, w.length - 3)).map((_, i) => w.slice(i, i + 4).join(" "));
    }),
  );

  const hits: Hit[] = [];
  body.replace(/\r/g, "").split("\n").forEach((raw, i) => {
    const text = raw.trim();
    const add = (rule: number) => hits.push({ rule, name: RULE_NAMES[rule - 1], line: i + 1, text });
    const seen = scan(raw);
    if (URL_LIKE.test(seen) || BARE_HOST.test(seen)) add(1);
    if (nameTokens.some((re) => re.test(seen))) add(2);
    if (namesPath(scanPaths(raw))) add(3);
    if (FENCE.test(raw) || CODE.test(raw)) add(4);
    const lineWords = ` ${words(raw).join(" ")} `;
    if ([...windows].some((w) => lineWords.includes(` ${w} `))) add(5);
    if (ERROR_TEXT.test(raw)) add(6);
  });
  return hits;
}
