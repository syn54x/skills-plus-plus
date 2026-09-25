// Dynamic-workflow escalation for `/build-epic <epic#> --workflow` (XL epics).
// Claude Code only: pass this script to the Workflow tool after the user has opted in
// ("ultracode" / "run a workflow"). Other harnesses: fall back to manual waves.
//
// Fill the three CAPITALISED slots from the epic's plan comment. The orchestrator still
// does preflight, the integration branch, the safety check and the wave plan by hand;
// this script does dispatch → review → fix round per layer, and returns a merge order.

export const meta = {
  name: 'build-epic',
  description: 'Implement an epic layer by layer in isolated worktrees, review each PR, return a merge order',
  phases: [
    { title: 'Implement', detail: 'one worker per ticket, worktree each' },
    { title: 'Review', detail: 'fresh reviewer per PR; one fix round' },
  ],
}

const EPIC = 42                                     // <-- epic number
const INTEGRATION_BRANCH = 'feat/invoices'          // <-- from the plan comment
const LAYERS = [                                    // <-- from the plan comment; blockers first
  [{ n: 101, size: 'S' }, { n: 102, size: 'S' }],
  [{ n: 103, size: 'M' }],
  [{ n: 104, size: 'M' }],
]

const REPORT = {
  type: 'object',
  properties: {
    ticket: { type: 'number' },
    pr: { type: 'number' },
    verifySha: { type: 'string' },
    status: { type: 'string', enum: ['DONE', 'DONE_WITH_CONCERNS', 'BLOCKED', 'NEEDS_CONTEXT'] },
    notes: { type: 'string' },
  },
  required: ['ticket', 'status'],
}

const VERDICT = {
  type: 'object',
  properties: {
    pr: { type: 'number' },
    spec: { type: 'string', enum: ['pass', 'fail'] },
    quality: { type: 'string', enum: ['pass', 'fail'] },
    findings: { type: 'string' },
  },
  required: ['pr', 'spec', 'quality'],
}

const implementPrompt = (t) =>
  `You are a worker on epic #${EPIC}. Integration branch: ${INTEGRATION_BRANCH}. ` +
  `Run \`gh issue view ${t.n}\` then call the Skill tool with "implement-issue" for issue ${t.n} and follow it exactly: claim, branch sdd/${t.n}-<slug> ` +
  `from ${INTEGRATION_BRANCH}, TDD, run the ticket's Verify block, open a PR into ${INTEGRATION_BRANCH} with "Closes #${t.n}", ` +
  `update the <!-- sdd-progress --> comment. Never merge. Return the report as structured output.`

const reviewPrompt = (r) =>
  `Review PR #${r.pr} against sub-issue #${r.ticket} by calling the Skill tool with "review-pr" for PR ${r.pr} and following it. ` +
  `Run the ticket's Verify block yourself. Return two verdicts (spec, quality) and findings as structured output. Do not edit code.`

const fixPrompt = (r, v) =>
  implementPrompt({ n: r.ticket }) +
  `\n\nThis is the single fix round for PR #${r.pr}. Review findings:\n${v.findings}\n` +
  `Address every item or explain in the PR why not, re-run Verify, update the progress comment.`

const mergeOrder = []
const needsHuman = []

for (let i = 0; i < LAYERS.length; i++) {
  const layer = LAYERS[i]
  log(`Layer ${i}: ${layer.map((t) => '#' + t.n).join(', ')}`)

  const results = await pipeline(
    layer,
    (t) => agent(implementPrompt(t), { label: `implement:#${t.n}`, phase: 'Implement', schema: REPORT, isolation: 'worktree' }),
    async (r, t) => {
      if (!r || r.status === 'BLOCKED' || r.status === 'NEEDS_CONTEXT' || !r.pr) return { ticket: t.n, outcome: 'blocked', r }
      let v = await agent(reviewPrompt(r), { label: `review:#${r.pr}`, phase: 'Review', schema: VERDICT })
      if (v && (v.spec === 'fail' || v.quality === 'fail')) {
        const r2 = await agent(fixPrompt(r, v), { label: `fix:#${t.n}`, phase: 'Implement', schema: REPORT, isolation: 'worktree' })
        v = r2 && r2.pr ? await agent(reviewPrompt(r2), { label: `re-review:#${r2.pr}`, phase: 'Review', schema: VERDICT }) : null
      }
      const pass = v && v.spec === 'pass' && v.quality === 'pass'
      return { ticket: t.n, pr: r.pr, outcome: pass ? 'merge' : 'human', verdict: v }
    },
  )

  for (const x of results.filter(Boolean)) {
    if (x.outcome === 'merge') mergeOrder.push(x)
    else needsHuman.push(x)
  }

  // A layer with a non-mergeable ticket blocks its dependants. Stop here rather than build on air;
  // the orchestrator merges what passed, labels the rest ready-for-human, and re-runs for the remaining layers.
  if (results.some((x) => !x || x.outcome !== 'merge')) {
    log(`Layer ${i} incomplete; stopping before layer ${i + 1}`)
    break
  }
}

// The orchestrator merges `mergeOrder` into INTEGRATION_BRANCH in this sequence (it is already topological),
// then handles `needsHuman` (label ready-for-human, unclaim) and re-runs `/build-epic` if layers remain.
return { epic: EPIC, mergeOrder, needsHuman }
