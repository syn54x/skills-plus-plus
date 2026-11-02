// spp verdict <pr> --ticket N --head SHA --spec pass|fail --quality pass|fail: records review's two verdicts as the
// pull request's `<!-- spp-verdict -->` Marker comment. Exits 3, writing nothing, when the pull request's head is no
// longer SHA, because a verdict counts only on the head it was given on.
import { runGh } from "../gh.ts";
import { flagPairs, guarded, print, UsageError } from "../markers.ts";
import { type Verdict, writeVerdict } from "../verdict.ts";

const USAGE = `usage: spp verdict <pr number | pr URL> --ticket N --head SHA --spec pass|fail --quality pass|fail
Writes the verdict comment while the pull request is still at SHA (7 to 40 hex characters); exits 3 when it moved.
`;

const isVerdict = (v: string | undefined): v is Verdict["spec"] => v === "pass" || v === "fail";

export function run(args: string[]): Promise<number> {
  return guarded(() => "verdict", USAGE, async () => {
    const [pr, ...rest] = args;
    if (pr === undefined || pr.startsWith("--")) throw new UsageError("");
    const f = Object.fromEntries(flagPairs(rest, ["--ticket", "--head", "--spec", "--quality"], "verdict: "));
    const { "--ticket": ticket, "--head": head, "--spec": spec, "--quality": quality } = f;
    if (!ticket) throw new UsageError("--ticket is required");
    if (!/^[0-9a-f]{7,40}$/i.test(head ?? "")) throw new UsageError("--head must be a commit sha of 7 to 40 hex characters");
    if (!isVerdict(spec) || !isVerdict(quality)) throw new UsageError("--spec and --quality must each be pass or fail");
    const current = (await runGh(["pr", "view", pr, "--json", "headRefOid", "--jq", ".headRefOid"])).trim();
    if (!current.toLowerCase().startsWith(head.toLowerCase())) {
      process.stderr.write(`spp verdict: head moved: the pull request is at ${current}, not ${head}; review the new head\n`);
      return 3;
    }
    print(await writeVerdict(pr, { ticket: ticket.replace(/^#/, ""), head, spec, quality }));
  });
}
