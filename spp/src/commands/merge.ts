/**
 * `spp merge <pr> [--json]` merges a slice pull request into its Epic's integration branch, only when its gate passed
 * on the current head, its blockers' pull requests have merged, its base is the integration branch and its checks
 * pass. The gate's verdict counts only from a trusted author (the gh user, or an OWNER, MEMBER or COLLABORATOR), and
 * `spp merge` re-reads the verdict comment to check that before it merges (ADR 0009). It merges with the Routing
 * block's merge method (squash by default) pinned to the head the gate passed, then records the pull request on the
 * wave comment. A conflict is never resolved here: the worker rebases. It prints
 * `merged <pr> into <branch>` or `not merged: <reason>`; with `--json` it prints {@link MergeResult}.
 *
 * @module
 */
import { spawnSync } from "node:child_process";
import { derive, gateOf, refIn } from "../derive.ts";
import { GhError, runGh } from "../gh.ts";
import { find, parseIssue, readTrailer } from "../markers.ts";
import { readRouting } from "../routing.ts";
import { fetchSnapshot } from "../fetch-snapshot.ts";
import { CLOSING_KEYWORD } from "../snapshot.ts";
import { readVerdict, VERDICT_MARKER } from "../verdict.ts";
import { culprits, readChecks } from "./checks.ts";

/** The usage text `spp merge --help` prints. */
export const USAGE = "usage: spp merge <pr number | pr URL> [--json]\n";
const ISSUE_URL = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:issues|pull)\/(\d+)$/;

/** What `spp merge` did: its `--json` shape. */
export type MergeResult = {
  /** Whether the pull request merged. */
  merged: boolean;
  /** Why it did not merge, such as `rebase needed` or `checks failing: <runs>`. */
  reason?: string;
  /** The pull request body's `Interfaces changed:` lines that are not `none`, one per line, so the orchestrator sees an Interface deviation. */
  interfacesChanged?: string;
};
type PrView = { number: number; url: string; state: string; body: string; baseRefName: string; mergeable: string };

// The issue the body closes first, as a URL: #N in the pull request's own repo, owner/repo#N, or the issue URL.
function closedIssue(body: string, prRepo: string): string | null {
  const ref = String.raw`(?:https://github\.com/([\w.-]+/[\w.-]+)/issues/(\d+)|([\w.-]+/[\w.-]+)?#(\d+))(?![\w/])`;
  const m = new RegExp(CLOSING_KEYWORD + ref, "i").exec(body);
  return m ? `https://github.com/${m[1] ?? m[3] ?? prRepo}/issues/${m[2] ?? m[4]}` : null;
}

// Every `Interfaces changed:` value but `none`, one per line.
function interfacesChanged(body: string): string | undefined {
  const values = [...body.matchAll(/^Interfaces changed:(.*)$/gm)]
    .map((m) => m[1].replace(/<!--.*?-->/g, "").trim())
    .filter((v) => v && v.toLowerCase() !== "none");
  return values.length ? values.join("\n") : undefined;
}


async function decide(pr: string): Promise<{ result: MergeResult; code: number; base?: string }> {
  const refuse = (reason: string, code = 1) => ({ result: { merged: false, reason }, code });
  const view = JSON.parse(await runGh(["pr", "view", pr, "--json", "number,url,state,body,baseRefName,mergeable"])) as PrView;
  const [, owner, name] = ISSUE_URL.exec(view.url) ?? [];
  const ref = refIn(`${owner}/${name}`);
  if (view.state !== "OPEN") return refuse(`${ref(view.url)} is ${view.state}`);
  const ticketUrl = closedIssue(view.body, `${owner}/${name}`);
  if (!ticketUrl) return refuse(`${ref(view.url)} closes no issue`);

  const { parent } = JSON.parse(await runGh(["issue", "view", ticketUrl, "--json", "parent"])) as { parent: { url: string } | null };
  const epic = parent && ISSUE_URL.exec(parent.url);
  if (!epic) return refuse(`${ref(ticketUrl)} has no epic`);
  const state = derive((await fetchSnapshot(parent.url))!);
  const byUrl = new Map(state.tickets.map((t) => [t.url, t]));
  const ticket = byUrl.get(ticketUrl);
  if (!ticket) return refuse(`${ref(ticketUrl)} is not a sub-issue of ${ref(parent.url)}`);

  if (ticket.state !== "gate-pass" || ticket.pr?.url !== view.url) return refuse(`gate not passed: ${ref(ticketUrl)} is ${ticket.state}`);
  // The trust boundary (ADR 0009), checked again on the comment itself: only a verdict a trusted author wrote, passing
  // on the head about to merge, lets the merge through.
  const verdict = readVerdict(readTrailer((await find(parseIssue(view.url.replace("/pull/", "/issues/")), VERDICT_MARKER))?.body ?? ""));
  if (gateOf({ ...ticket.pr, verdict: verdict ?? undefined }) !== "gate-pass") return refuse(`no passing verdict from a trusted author on ${ref(view.url)}`);
  // blockedBy already leaves out a blocker that landed, so every one left still blocks.
  for (const b of ticket.blockedBy) return refuse(`blocked by ${ref(byUrl.get(b)?.pr?.url ?? b)}`);
  const branch = state.epic.branch;
  if (branch && view.baseRefName !== branch) return refuse(`base is ${view.baseRefName}, not the integration branch ${branch}`);
  // shortcut: none (no CI configured) does not block; a repo whose CI registers late could merge before it starts.
  const checks = await readChecks(view.url);
  if (checks.result === "fail") return refuse(`checks failing: ${culprits(checks).join(", ")}`);
  if (checks.result === "pending") return refuse(`checks pending: ${culprits(checks).join(", ")}`);
  if (view.mergeable === "CONFLICTING") return refuse("rebase needed", 3);

  // Exit 3 sends the worker to rebase, so it is kept for a real conflict; any other refusal (a branch policy, a
  // required approval) exits 1 with gh's own reason, which a rebase could never fix.
  try {
    await runGh(["pr", "merge", view.url, `--${readRouting(process.cwd())?.routing.merge ?? "squash"}`, "--match-head-commit", ticket.pr.headSha]);
  } catch (e) {
    if (!(e instanceof GhError)) throw e;
    if (/cannot be cleanly created|merge conflict/i.test(e.message)) return refuse("rebase needed", 3);
    return refuse(e.message);
  }

  // wave pr matches a ticket in any of its forms, whichever one the wave stored.
  const [, to, tr, tn] = ISSUE_URL.exec(ticketUrl)!;
  const waveTicket = to === epic[1] && tr === epic[2] ? tn : `${to}/${tr}#${tn}`;
  const spp = process.argv[1]; // the running bin/spp: its path from here differs between spp/src and the compiled dist/
  const wave = spawnSync(process.execPath, [spp, "wave", parent.url, "pr", "--ticket", waveTicket, "--pr", view.url], { encoding: "utf8" });
  const changed = interfacesChanged(view.body);
  const result: MergeResult = { merged: true, ...(changed && { interfacesChanged: changed }) };
  if (wave.status !== 0) {
    process.stderr.write(`spp merge: merged ${ref(view.url)}, but recording it on the wave comment failed:\n${wave.stderr}`);
    return { result, code: 1 };
  }
  return { result, code: 0, base: view.baseRefName };
}

/**
 * Merges one slice pull request when everything allows it.
 *
 * @param args - The pull request (a number or URL), and `--json` for the {@link MergeResult} shape.
 * @returns 0 when it merged; 3 on a merge conflict (`rebase needed`), so the worker rebases; 1 for any other
 *   refusal, for a merge whose wave comment could not be recorded, and on a `gh` error; 2 on a usage error, with the
 *   usage on stderr.
 * @example
 * ```bash
 * spp merge 264 --json
 * ```
 */
export async function run(args: string[]): Promise<number> {
  const rest = args.filter((a) => a !== "--json");
  if (rest.length !== 1) {
    process.stderr.write(USAGE);
    return 2;
  }
  const { result, code, base } = await decide(rest[0]);
  const text = result.merged
    ? [`merged ${rest[0]}${base ? ` into ${base}` : ""}`, ...(result.interfacesChanged ? [`Interfaces changed: ${result.interfacesChanged}`] : [])].join("\n")
    : `not merged: ${result.reason}`;
  process.stdout.write(args.includes("--json") ? JSON.stringify(result, null, 2) + "\n" : text + "\n");
  return code;
}
