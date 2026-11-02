// spp merge <pr> [--json]: merges a gate-pass slice pull request into its Epic's integration branch, only when its
// blockers' pull requests are merged and its checks pass, then records it on the wave comment. A conflict is never
// resolved here: it exits 3 with "rebase needed" and the worker rebases.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { derive } from "../derive.ts";
import { GhError, runGh } from "../gh.ts";
import { readRouting } from "../routing.ts";
import { CLOSING_KEYWORD, SNAPSHOT_QUERY, parseSnapshot } from "../snapshot.ts";
import { culprits, readChecks } from "./checks.ts";

const USAGE = "usage: spp merge <pr number | pr URL> [--json]\n";
const ISSUE_URL = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:issues|pull)\/(\d+)$/;

type Result = { merged: boolean; reason?: string; interfacesChanged?: string };
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


async function decide(pr: string): Promise<{ result: Result; code: number; base?: string }> {
  const refuse = (reason: string, code = 1) => ({ result: { merged: false, reason }, code });
  const view = JSON.parse(await runGh(["pr", "view", pr, "--json", "number,url,state,body,baseRefName,mergeable"])) as PrView;
  const [, owner, name] = ISSUE_URL.exec(view.url) ?? [];
  const ref = (url: string) => {
    const [, o, r, n] = ISSUE_URL.exec(url) ?? [, "", "", url];
    return o === owner && r === name ? `#${n}` : `${o}/${r}#${n}`;
  };
  if (view.state !== "OPEN") return refuse(`${ref(view.url)} is ${view.state}`);
  const ticketUrl = closedIssue(view.body, `${owner}/${name}`);
  if (!ticketUrl) return refuse(`${ref(view.url)} closes no issue`);

  const { parent } = JSON.parse(await runGh(["issue", "view", ticketUrl, "--json", "parent"])) as { parent: { url: string } | null };
  const epic = parent && ISSUE_URL.exec(parent.url);
  if (!epic) return refuse(`${ref(ticketUrl)} has no epic`);
  const snapshot = await runGh(["api", "graphql", "-f", `query=${SNAPSHOT_QUERY}`, "-f", `owner=${epic[1]}`, "-f", `repo=${epic[2]}`, "-F", `number=${epic[3]}`]);
  const state = derive(parseSnapshot(JSON.parse(snapshot)));
  const byUrl = new Map(state.tickets.map((t) => [t.url, t]));
  const ticket = byUrl.get(ticketUrl);
  if (!ticket) return refuse(`${ref(ticketUrl)} is not a sub-issue of ${ref(parent.url)}`);

  if (ticket.state !== "gate-pass" || ticket.pr?.url !== view.url) return refuse(`gate not passed: ${ref(ticketUrl)} is ${ticket.state}`);
  for (const b of ticket.blockedBy) {
    const pr = byUrl.get(b)?.pr;
    if (pr?.state !== "MERGED") return refuse(`blocked by ${ref(pr?.url ?? b)}`);
  }
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

  // The wave comment stores a ticket in the Epic's repo as its number and any other as owner/repo#N.
  const [, to, tr, tn] = ISSUE_URL.exec(ticketUrl)!;
  const waveTicket = to === epic[1] && tr === epic[2] ? tn : `${to}/${tr}#${tn}`;
  const spp = fileURLToPath(new URL("../../../bin/spp", import.meta.url));
  const wave = spawnSync(process.execPath, [spp, "wave", parent.url, "pr", "--ticket", waveTicket, "--pr", view.url], { encoding: "utf8" });
  const changed = interfacesChanged(view.body);
  const result: Result = { merged: true, ...(changed && { interfacesChanged: changed }) };
  if (wave.status !== 0) {
    process.stderr.write(`spp merge: merged ${ref(view.url)}, but recording it on the wave comment failed:\n${wave.stderr}`);
    return { result, code: 1 };
  }
  return { result, code: 0, base: view.baseRefName };
}

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
