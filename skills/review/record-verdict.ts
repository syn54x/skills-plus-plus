#!/usr/bin/env node
// Records review's two verdicts as the pull request's `<!-- spp-verdict -->` Marker comment, through spp's writeVerdict.
// Usage: node record-verdict.ts <pr> <sub-issue> <head sha> <spec pass|fail> <quality pass|fail>
// Exits 3, writing nothing, when the pull request's head is no longer <head sha>: a verdict counts only on the head it read.
// shortcut: imports spp from the plugin checkout it ships in; a skill installed without the plugin cannot run it.
import { runGh } from "../../spp/src/gh.ts";
import { type Verdict, writeVerdict } from "../../spp/src/verdict.ts";

const USAGE = "usage: node record-verdict.ts <pr> <sub-issue> <head sha> <spec pass|fail> <quality pass|fail>\n";
const [pr, ticket, head, spec, quality] = process.argv.slice(2);
const verdict = (v: string | undefined): v is Verdict["spec"] => v === "pass" || v === "fail";

if (process.argv.length !== 7 || !ticket || !/^[0-9a-f]{7,40}$/i.test(head) || !verdict(spec) || !verdict(quality)) {
  process.stderr.write(USAGE);
  process.exit(2);
}

const current = (await runGh(["pr", "view", pr, "--json", "headRefOid", "--jq", ".headRefOid"])).trim();
if (!current.startsWith(head.toLowerCase())) {
  process.stderr.write(`head moved: the pull request is at ${current}, not ${head}; review the new head\n`);
  process.exit(3);
}
console.log(await writeVerdict(pr, { ticket, head, spec, quality }));
