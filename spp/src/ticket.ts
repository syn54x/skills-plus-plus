// The ticket-body parser and its mechanical lints: what a Sub-issue body says and whether it meets the Ticket contract,
// and whether a pull request body carries the review gate's sections.
// Pure: no network, filesystem or environment, so the brief, the safety check and the harden skill's gate share it.

export type FileKind = "Create" | "Modify" | "Test";

export type TicketBody = {
  sections: Record<string, string>; // heading text -> trimmed content; level-2 headings only
  filesOwned: { kind: FileKind; paths: string[] }[];
  consumes: string[];
  produces: string[];
  scenarios: string[];
  verify: string | null; // the first fenced block of the Verify section, or null
};

/** One ticket-lint rule a body breaks. */
export type Failure = {
  /**
   * `section-present`, `verify-fenced`, `files-owned-shape`, `scenario-shape`, `one-size`, `no-placeholder`,
   * `pin-present` or `pin-match` (the last two only from `spp lint ticket`, which reads the pin and the `--pin` file);
   * from `spp lint pr`: `link`, `section-present` (`## Ticket` or `## Laws`), `ticket-na`, `verify-sha`,
   * `verify-corrected` or `interfaces`.
   */
  rule: string;
  /** What is wrong, in a sentence. */
  detail: string;
};

const FENCE = /^\s*(`{3,}|~{3,})/;

function splitSections(body: string): Record<string, string> {
  const sections: Record<string, string[]> = {};
  let current: string[] | null = null;
  let fence: string | null = null;
  for (const line of body.replace(/\r/g, "").split("\n")) {
    const f = FENCE.exec(line)?.[1];
    if (f) {
      if (!fence) fence = f;
      else if (f[0] === fence[0] && f.length >= fence.length) fence = null;
    }
    const heading = fence || f ? null : /^##\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) current = sections[heading[1]] = [];
    else current?.push(line);
  }
  return Object.fromEntries(Object.entries(sections).map(([k, v]) => [k, v.join("\n").trim()]));
}

// A section's logical items: each unindented bullet starts one, any other line continues the item before it.
function items(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet || !out.length) out.push((bullet ? bullet[1] : line).trim());
    else out[out.length - 1] += " " + line.trim();
  }
  return out;
}

function section(sections: Record<string, string>, name: string): string {
  const key = Object.keys(sections).find((k) => k.toLowerCase() === name.toLowerCase());
  return key === undefined ? "" : sections[key];
}

function labelled(list: string[], label: string): string[] {
  const re = new RegExp(`^${label}\\s*:\\s*(.*)$`, "i");
  return list.flatMap((l) => re.exec(l)?.[1] ?? []);
}

export function parseTicket(body: string): TicketBody {
  const sections = splitSections(body);
  const interfaces = items(section(sections, "Interfaces"));
  const filesOwned = items(section(sections, "Files owned")).flatMap((line) => {
    const m = /^(Create|Modify|Test)\s*:\s*(.*)$/.exec(line);
    if (!m) return [];
    const ticks = [...m[2].matchAll(/`([^`]+)`/g)].map((t) => t[1]);
    const paths = ticks.length ? ticks : m[2].split(",").map((p) => p.trim()).filter(Boolean);
    return [{ kind: m[1] as FileKind, paths }];
  });
  const fenced = /^[ \t]*(`{3,}|~{3,})[^\n]*\n([\s\S]*?)\n[ \t]*\1/m.exec(section(sections, "Verify"));
  return {
    sections,
    filesOwned,
    consumes: labelled(interfaces, "Consumes"),
    produces: labelled(interfaces, "Produces"),
    scenarios: items(section(sections, "Test scenarios")),
    verify: fenced ? fenced[2].trim() : null,
  };
}

const REQUIRED = ["What to build", "Acceptance criteria", "Files owned", "Interfaces", "Test scenarios", "Verify"];
const SCENARIO = /^(Happy path|Edge case|Error path|Integration)\b/;
const NO_TESTS = /^Test expectation: none, because\s+\S/;
const PLACEHOLDERS: [string, RegExp][] = [
  ["TBD", /\bTBD\b/],
  ["TODO", /\bTODO\b/],
  ["a lone ?", /(^|\s)\?(\s|$)/],
  ["similar to ticket", /similar to (ticket\b|#\d)/i],
  ["add appropriate", /add appropriate/i],
];

// The mechanical half of hardening. `labels` are the issue's label names.
export function lintTicket(body: string, labels: string[]): Failure[] {
  const t = parseTicket(body);
  const failures: Failure[] = [];
  const fail = (rule: string, detail: string) => failures.push({ rule, detail });

  const missing = REQUIRED.filter((name) => !section(t.sections, name));
  for (const name of missing) fail("section-present", `missing ${name}`);

  if (!missing.includes("Verify") && t.verify === null) fail("verify-fenced", "Verify holds no fenced block");

  for (const line of items(section(t.sections, "Files owned"))) {
    if (!/^(Create|Modify|Test)\s*:/.test(line)) fail("files-owned-shape", `line must start with Create, Modify or Test: ${line}`);
  }

  const scenarios = t.scenarios;
  if (!(scenarios.length === 1 && NO_TESTS.test(scenarios[0]))) {
    for (const s of scenarios) {
      if (!SCENARIO.test(s) || !s.includes("→")) fail("scenario-shape", `needs Happy path, Edge case, Error path or Integration, and "→": ${s}`);
    }
  }

  const sizes = labels.filter((l) => l.startsWith("size:"));
  if (sizes.length !== 1) fail("one-size", sizes.length ? `found ${sizes.join(", ")}` : "found no size:* label");

  for (const name of REQUIRED) {
    // Fenced blocks and code spans may quote a placeholder word; only prose counts.
    const prose = section(t.sections, name).replace(/^[ \t]*(`{3,}|~{3,})[\s\S]*?^[ \t]*\1/gm, "").replace(/`[^`\n]*`/g, "");
    for (const [label, re] of PLACEHOLDERS) if (re.test(prose)) fail("no-placeholder", `${name} contains ${label}`);
  }
  return failures;
}

// What a reader of the pull request sees: fenced blocks and HTML comments gone, since a body may quote the template.
function visible(body: string): string {
  let fence: string | null = null;
  const kept: string[] = [];
  for (const line of body.replace(/\r/g, "").split("\n")) {
    const f = FENCE.exec(line)?.[1];
    if (!f) {
      if (!fence) kept.push(line);
    } else if (!fence) fence = f;
    else if (f[0] === fence[0] && f.length >= fence.length) fence = null;
  }
  return kept.join("\n").replace(/<!--[\s\S]*?-->/g, "");
}

const noCode = (line: string) => line.replace(/`[^`\n]*`/g, "");
const CLOSES = /^(closes|fixes|resolves)\s+#\d+\b/i;
const REFS = /^\s*Refs\s+(#\d+|[\w.-]+\/[\w.-]+#\d+|https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/issues\/\d+)/i;
const CORRECTED = "the value is `no`, or `yes:` followed by what was wrong in the issue's block";

// The form of a pull request body's gate sections, never whether a claim is true. `head` is the full head SHA.
export function lintPr(body: string, head: string): Failure[] {
  const text = visible(body);
  const lines = text.split("\n");
  const sections = splitSections(text);
  const failures: Failure[] = [];
  const fail = (rule: string, detail: string) => failures.push({ rule, detail });

  const first = lines.find((l) => l.trim()) ?? "";
  if (!CLOSES.test(first.trim()) && !lines.some((l) => REFS.test(l))) {
    fail("link", "the first line is not `Closes #<N>` and no line reads `Refs #<N>`, so the gate reviews quality only and never passes");
  }

  for (const name of ["Ticket", "Laws"]) if (!section(sections, name)) fail("section-present", `## ${name} is missing or empty`);

  for (const line of section(sections, "Ticket").split("\n")) {
    if (/\bn\/a\b/i.test(noCode(line))) fail("ticket-na", `a Ticket line reads n/a: ${line.trim()}`);
  }

  const sha = head.toLowerCase();
  const verified = lines.some((l) => /verif(y|ied)/i.test(l) && (l.match(/\b[0-9a-f]{7,40}\b/gi) ?? []).some((t) => sha.startsWith(t.toLowerCase())));
  if (!verified) fail("verify-sha", `no line mentioning Verify names the head ${sha.slice(0, 7)}`);

  const corrected = lines.flatMap((l) => /Verify block corrected:\**\s*(.*)$/i.exec(noCode(l))?.[1].trim() ?? []);
  if (corrected.length !== 1) fail("verify-corrected", `found ${corrected.length} \`Verify block corrected:\` lines, need exactly one; ${CORRECTED}`);
  else if (!/^(no(?!\w)|yes:\s*\S)/i.test(corrected[0])) fail("verify-corrected", `\`Verify block corrected:\` reads "${corrected[0]}"; ${CORRECTED}`);

  if (!lines.some((l) => /Interfaces changed:/i.test(noCode(l)))) fail("interfaces", "no `Interfaces changed:` line");
  return failures;
}

// An issue number or a GitHub issue URL, the two forms `gh issue view` takes.
export const isIssueRef = (s: string) => /^\d+$/.test(s) || /^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+\/?$/.test(s);
