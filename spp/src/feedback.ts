// The outbound check on a skill-feedback body: the secrets scan (rule 0) and the six rules in
// skills/close-epic/FEEDBACK.md. Pure (text and the facts about the repo in, hits out), so the rules are tested without
// gh or git; spp/src/commands/feedback.ts gathers the facts.
//
// The check errs toward blocking: a hit on an innocent line costs a rebuilt body, a miss costs a leak. Rule 0 blocks in
// every mode; rules 1 to 6 block under Anonymous and only warn under Full Detail.
//
// Rule 0's patterns come from gitleaks v8.30.1, config/gitleaks.toml (MIT License, Copyright (c) 2019 Zachary Rice), each
// under its gitleaks id, translated to JavaScript (an inline (?i) becomes the i flag, and a trailing delimiter group
// becomes a lookahead so redaction keeps the delimiter). Only the regexes are taken: the per-rule entropy thresholds and
// allowlists are dropped, which errs toward blocking and is why AWS's documented example key blocks here.
import type { SelfImprovementMode } from "./routing.ts";

export type FeedbackContext = {
  profile: SelfImprovementMode;
  ownRepo: string; // owner/repo of the person's checkout; under Full Detail its URLs, owner/repo and bare repo name pass
  names: string[]; // owner/repo strings from the Epic and its Sub-issues; the own repo counts without being listed
  titles: string[]; // Sub-issue and pull request titles
  paths: string[]; // what `git ls-files` lists
};

export type Hit = { rule: number; name: string; line: number; text: string; level: "block" | "warn" };

export const RULE_NAMES = ["URLs", "Names", "Paths", "Code", "Titles", "Error text"];

// shortcut: entropy-only rules such as generic-api-key are left out, since their regexes alone would block plain prose.
const SECRETS: [string, RegExp][] = [
  ["github-pat", /ghp_[0-9a-zA-Z]{36}/g],
  ["github-fine-grained-pat", /github_pat_\w{82}/g],
  ["github-oauth", /gho_[0-9a-zA-Z]{36}/g],
  ["github-app-token", /(?:ghu|ghs)_[0-9a-zA-Z]{36}/g],
  ["github-refresh-token", /ghr_[0-9a-zA-Z]{36}/g],
  ["gitlab-pat", /glpat-[\w-]{20}/g],
  ["aws-access-token", /\b((?:A3T[A-Z0-9]|AKIA|ASIA|ABIA|ACCA)[A-Z2-7]{16})\b/g],
  ["gcp-api-key", /\b(AIza[\w-]{35})(?=[\x60'"\s;]|\\[nr]|$)/g],
  // The check reads one line at a time, so the header line alone matches, where gitleaks wants the whole block.
  ["private-key", /-----BEGIN[ A-Z0-9_-]{0,100}PRIVATE KEY(?: BLOCK)?-----/gi],
  ["slack-bot-token", /xoxb-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*/g],
  ["slack-user-token", /xox[pe](?:-[0-9]{10,13}){3}-[a-zA-Z0-9-]{28,34}/g],
  ["anthropic-api-key", /\b(sk-ant-api03-[a-zA-Z0-9_\-]{93}AA)(?=[\x60'"\s;]|\\[nr]|$)/g],
  ["anthropic-admin-api-key", /\b(sk-ant-admin01-[a-zA-Z0-9_\-]{93}AA)(?=[\x60'"\s;]|\\[nr]|$)/g],
  [
    "openai-api-key",
    /\b(sk-(?:proj|svcacct|admin)-(?:[A-Za-z0-9_-]{74}|[A-Za-z0-9_-]{58})T3BlbkFJ(?:[A-Za-z0-9_-]{74}|[A-Za-z0-9_-]{58})\b|sk-[a-zA-Z0-9]{20}T3BlbkFJ[a-zA-Z0-9]{20})(?=[\x60'"\s;]|\\[nr]|$)/g,
  ],
  ["npm-access-token", /\b(npm_[a-z0-9]{36})(?=[\x60'"\s;]|\\[nr]|$)/gi],
  ["stripe-access-token", /\b((?:sk|rk)_(?:test|live|prod)_[a-zA-Z0-9]{10,99})(?=[\x60'"\s;]|\\[nr]|$)/g],
  ["jwt", /\b(ey[a-zA-Z0-9]{17,}\.ey[a-zA-Z0-9\/\\_-]{17,}\.(?:[a-zA-Z0-9\/\\_-]{10,}={0,2})?)(?=[\x60'"\s;]|\\[nr]|$)/g],
];

/** One printed line of the check: `rule <rule> <name>, line <n>: <text>`, with `warning: ` in front of a warning. */
export function formatHit(hit: Hit): string {
  return `${hit.level === "warn" ? "warning: " : ""}rule ${hit.rule} ${hit.name}, line ${hit.line}: ${hit.text}`;
}

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

  const level = attributed ? "warn" : "block";
  const hits: Hit[] = [];
  body.replace(/\r/g, "").split("\n").forEach((raw, i) => {
    // Each secret on the line is redacted in every hit's text, so the check never prints what it found.
    const text = SECRETS.reduce((t, [, re]) => t.replace(re, "[REDACTED]"), raw).trim();
    for (const [id, re] of SECRETS) if (raw.search(re) >= 0) hits.push({ rule: 0, name: `Secrets (${id})`, line: i + 1, text, level: "block" });
    const add = (rule: number) => hits.push({ rule, name: RULE_NAMES[rule - 1], line: i + 1, text, level });
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
