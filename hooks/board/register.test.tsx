import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

// The epic board through the plugin test runner: each test answers gh, spp and claude beneath the plugin with a
// recorded snapshot, runs /epic-board, then reads the drawn pane and presses its rows. State logic is spp's and is
// tested there; this asserts what is drawn and what the row actions call.

const REPO = 'syn54x/skills-plus-plus'
const URL = `https://github.com/${REPO}`
const NOW = Date.parse('2026-11-02T12:00:00Z')

const PANE = {
  plugin: 'spp',
  component: 'Pane',
  requestId: 'epic-board',
  props: {
    title: 'Epic board',
    isFocused: false,
    bodyColumns: 100,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 60 },
    view: {},
  },
} as const

// /epic-board 197, as the person types it at the prompt.
const OPEN = {
  command: 'epic-board',
  args: '197',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: true, columns: 120 },
} as const

const trailer = (marker: string, data: object) => `${marker}\n<!-- sdd-data: ${btoa(JSON.stringify(data))} -->`

type Spec = {
  n: number
  state?: 'OPEN' | 'CLOSED'
  labels?: string[]
  blockedBy?: number[]
  pr?: { n: number; state?: 'OPEN' | 'MERGED'; verdict?: 'pass' | 'fail' }
  worker?: string
}

// A comment by the repository owner, an author spp trusts (ADR 0009).
const owned = (body: string) => ({ body, author: { login: 'maint' }, authorAssociation: 'OWNER' })

// One Sub-issue as the snapshot query returns it.
function issue(s: Spec) {
  const head = `abc${s.n}def0123`
  const pr = s.pr && {
    number: s.pr.n,
    url: `${URL}/pull/${s.pr.n}`,
    state: s.pr.state ?? 'OPEN',
    headRefOid: head,
    repository: { nameWithOwner: REPO },
    comments: {
      nodes: s.pr.verdict
        ? [owned(trailer('<!-- spp-verdict -->', { head, spec: s.pr.verdict, quality: s.pr.verdict }))]
        : [],
    },
  }
  return {
    number: s.n,
    url: `${URL}/issues/${s.n}`,
    title: `Ticket ${s.n}`,
    state: s.state ?? 'OPEN',
    repository: { nameWithOwner: REPO },
    labels: { nodes: (s.labels ?? ['ready-for-agent']).map(name => ({ name })) },
    assignees: { nodes: [] },
    blockedBy: { nodes: (s.blockedBy ?? []).map(b => ({ url: `${URL}/issues/${b}`, state: 'OPEN' })) },
    comments: { nodes: s.worker ? [owned(trailer('<!-- sdd-progress -->', { worker: s.worker }))] : [] },
    closedByPullRequestsReferences: { nodes: pr ? [pr] : [] },
    timelineItems: { nodes: [] },
  }
}

// The Epic's snapshot. `waves` is the wave comment by the owner; `forged` is one by an outside author posted before it.
function snapshot(specs: Spec[], waves: { n: number; tickets: string[] }[] = [], forged?: { n: number; tickets: string[] }[]) {
  const outsider = (body: string) => ({ body, author: { login: 'mallory' }, authorAssociation: 'NONE' })
  return JSON.stringify({
    data: {
      viewer: { login: 'maint' },
      repository: {
        issue: {
          number: 197,
          url: `${URL}/issues/197`,
          title: 'Rebuild spp',
          repository: { nameWithOwner: REPO },
          comments: {
            nodes: [
              ...(forged ? [outsider(trailer('<!-- sdd-wave -->', { waves: forged, panel: [] }))] : []),
              ...(waves.length ? [owned(trailer('<!-- sdd-wave -->', { waves, panel: [] }))] : []),
            ],
          },
          subIssues: { nodes: specs.map(issue) },
        },
      },
    },
  })
}

type Host = {
  gh?: { exitCode: number; stdout: string; stderr?: string }
  ghDelayMs?: number // gh answers this long after it is asked, on the mocked clock
  notes?: { ticket: number; text: string; at: string }[] // the local notes log of the Epic's repo
  sessions?: { name: string; kind: string }[]
  agentsError?: string // claude agents exits 1 with this on stderr
  agents?: { id: string; description: string }[]
}

// Where spp note keeps the repo's log, under the HOME the mocked env gives.
const LOG = `/home/t/.local/state/spp/${REPO.replace('/', '__')}.jsonl`

// Stands for the engine beneath the plugin: the host commands, the notes log, the agent list and the display calls it
// records.
function host(on: On, h: Host) {
  const seen = { status: [] as (string | undefined)[], copied: [] as string[], filled: [] as string[], viewed: [] as string[], argv: [] as string[][] }
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/t' })
  const log = (h.notes ?? []).map(n => JSON.stringify({ repo: REPO, ticket: n.ticket, text: n.text, at: n.at, milestone: false })).join('\n')
  on('fs.exists', (_, e) => ({ value: e.path === LOG && !!h.notes }))
  on('fs.read', (_, e) => (e.path === LOG && h.notes ? { value: log + '\n' } : { deny: `ENOENT: ${e.path}` }))
  on('command.register', () => ({ value: { command: 'epic-board' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('process.run', async (_, e) => {
    seen.argv.push(e.argv)
    const [cmd, ...args] = e.argv
    const ok = (stdout: string) => ({ value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } })
    if (cmd === 'gh') {
      if (h.ghDelayMs) await clock.sleep(h.ghDelayMs)
      const gh = h.gh ?? { exitCode: 0, stdout: snapshot([]) }
      return { value: { stderr: '', isStdoutTruncated: false, isStderrTruncated: false, ...gh } }
    }
    if (cmd === 'claude' && args[0] === 'agents' && h.agentsError) {
      return { value: { exitCode: 1, stdout: '', stderr: h.agentsError, isStdoutTruncated: false, isStderrTruncated: false } }
    }
    if (cmd === 'claude' && args[0] === 'agents') return ok(JSON.stringify(h.sessions ?? []))
    return { value: { exitCode: 127, stdout: '', stderr: `unexpected ${e.argv.join(' ')}`, isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('agent.list', () => ({ value: (h.agents ?? []).map(a => ({ ...a, type: 'general-purpose', status: 'running' })) }))
  on('ui.status', (_, e) => {
    seen.status.push(e.text)
    return { value: undefined }
  })
  on('ui.copy', (_, e) => {
    seen.copied.push(e.text)
    return { value: { isCopied: true } }
  })
  on('prompt.fill', (_, e) => {
    seen.filled.push(e.text)
    return { isFilled: true, cursor: e.text.length }
  })
  on('ui.view', (_, e) => {
    seen.viewed.push(e.agentId ?? '')
    return { value: {} }
  })
  return { ...seen, clock }
}

const texts = async (ui: { findAll: (q: { type: string }) => Promise<{ text: string }[]> }) =>
  (await ui.findAll({ type: 'Text' })).map(t => t.text)

test('three tickets in two Waves draw two Wave groups, three rows and the note with its age', async ($, on) => {
  host(on, {
    gh: { exitCode: 0, stdout: snapshot([{ n: 201 }, { n: 202 }, { n: 203 }], [{ n: 1, tickets: ['201', '202'] }, { n: 2, tickets: ['203'] }]) },
    notes: [{ ticket: 202, text: 'first red test', at: '2026-11-02T11:55:00Z' }],
  })
  await $.command.run(OPEN)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    const all = await texts(ui)
    expect(all.filter(t => /^Wave \d$/.test(t))).toEqual(['Wave 1', 'Wave 2'])
    expect(all.filter(t => /^#20\d /.test(t))).toHaveLength(3)
    expect(all.indexOf('Wave 2')).toBeGreaterThan(all.findIndex(t => t.startsWith('#202 ')))
    expect(all).toContain('first red test, 5m ago')
    await ui.unmount()
  }
})

test('a ticket in each TicketState shows its own chip', async ($, on) => {
  host(on, {
    gh: {
      exitCode: 0,
      stdout: snapshot([
        { n: 1, blockedBy: [99] },
        { n: 2 },
        { n: 3, labels: ['ready-for-agent', 'claimed'] },
        { n: 4, pr: { n: 41 } },
        { n: 5, pr: { n: 51, verdict: 'pass' } },
        { n: 6, pr: { n: 61, verdict: 'fail' } },
        { n: 7, state: 'CLOSED', pr: { n: 71, state: 'MERGED' } },
        { n: 8, labels: ['needs-info'] },
        { n: 9, labels: [] },
      ]),
    },
  })
  await $.command.run(OPEN)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    const chips = (await ui.findAll({ type: 'Box' })).filter(b => b.key?.startsWith('chip-')).map(b => b.text)
    expect(chips).toEqual(['blocked', 'ready', 'claimed', 'PR open', 'gate pass', 'gate fail', 'merged', 'handed back', 'not for agents'])
    expect(new Set(chips).size).toBe(9)
    await ui.unmount()
  }
})

test('with no notes the rows show no note and no error', async ($, on) => {
  host(on, { gh: { exitCode: 0, stdout: snapshot([{ n: 201 }, { n: 202 }]) } })
  await $.command.run(OPEN)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const all = await texts(ui)
  expect(all.filter(t => /^#20\d /.test(t))).toHaveLength(2)
  expect(all.some(t => / ago$/.test(t))).toBe(false)
  expect(await ui.find({ key: 'error' })).toBeUndefined()
  await ui.unmount()
})

test('a failing gh call draws one error row with its message and no ticket rows', async ($, on) => {
  host(on, { gh: { exitCode: 1, stdout: '', stderr: 'HTTP 401: Bad credentials (https://api.github.com/graphql)\ntry gh auth login' } })
  await $.command.run(OPEN)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ key: 'error' }))?.text).toBe('gh: HTTP 401: Bad credentials (https://api.github.com/graphql)')
    expect((await texts(ui)).filter(t => /^#\d+ /.test(t))).toHaveLength(0)
    await ui.unmount()
  }
})

test('a failing claude call draws an error row and keeps the ticket rows', async ($, on) => {
  host(on, { gh: { exitCode: 0, stdout: snapshot([{ n: 201 }]) }, agentsError: 'agents: no daemon' })
  await $.command.run(OPEN)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ key: 'error' }))?.text).toBe('claude agents: agents: no daemon')
  expect((await texts(ui)).filter(t => /^#201 /.test(t))).toHaveLength(1)
  await ui.unmount()
})

test('copy on a row puts its pull request URL on the clipboard', async ($, on) => {
  const seen = host(on, { gh: { exitCode: 0, stdout: snapshot([{ n: 201 }, { n: 202, pr: { n: 300 } }]) } })
  await $.command.run(OPEN)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    await ui.press({ key: 'pr-202' })
    await ui.press({ key: 'issue-201' })
    await ui.unmount()
  }
  expect(seen.copied).toEqual([`${URL}/pull/300`, `${URL}/issues/201`, `${URL}/pull/300`, `${URL}/issues/201`])
})

test('attach on a background worker row puts claude attach in the prompt', async ($, on) => {
  const seen = host(on, {
    gh: { exitCode: 0, stdout: snapshot([{ n: 212, labels: ['claimed'], worker: 't-12' }]) },
    sessions: [{ name: 't-12', kind: 'background' }],
  })
  await $.command.run(OPEN)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    await ui.press({ key: 'worker-212' })
    await ui.unmount()
  }
  expect(seen.filled).toEqual(['claude attach t-12', 'claude attach t-12'])
})

test('a subagent worker row shows its transcript', async ($, on) => {
  const seen = host(on, {
    gh: { exitCode: 0, stdout: snapshot([{ n: 213, labels: ['claimed'], worker: 't-213' }]) },
    agents: [{ id: 'a9', description: 't-213 board' }],
  })
  await $.command.run(OPEN)

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 'worker-213' })
  await ui.unmount()
  expect(seen.viewed).toEqual(['a9'])
})

test('the status line after a refresh shows merged of total and the newest note', async ($, on) => {
  const merged = (n: number): Spec => ({ n, state: 'CLOSED', pr: { n: n + 100, state: 'MERGED' } })
  const seen = host(on, {
    gh: { exitCode: 0, stdout: snapshot([merged(1), merged(2), merged(3), { n: 4 }, { n: 5 }, { n: 6 }, { n: 7 }]) },
    notes: [
      { ticket: 4, text: 'claimed', at: '2026-11-02T11:00:00Z' },
      { ticket: 5, text: 'Verify passed abc1234', at: '2026-11-02T11:58:00Z' },
    ],
  })
  await $.command.run(OPEN)

  expect(seen.status.at(-1)).toBe('#197 3/7 merged | #5 Verify passed abc1234')
})

// F8 on #267: notes come from the local log, so a refresh makes one GraphQL call and runs no spp.
test('notes are read from the local notes log, with no spp call', async ($, on) => {
  const seen = host(on, {
    gh: { exitCode: 0, stdout: snapshot([{ n: 201 }]) },
    notes: [{ ticket: 201, text: 'tests green', at: '2026-11-02T11:59:00Z' }],
  })
  await $.command.run(OPEN)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await texts(ui)).toContain('tests green, 1m ago')
  await ui.unmount()
  expect(seen.argv.filter(a => a[0]?.endsWith('/bin/spp'))).toEqual([])
  expect(seen.argv.filter(a => a[0] === 'gh')).toHaveLength(1)
})

// F8 on #267: a refresh asked for while one is in flight is skipped, so the snapshot query never runs twice at once.
test('a second refresh while one is in flight makes no second gh call', async ($, on) => {
  const seen = host(on, { gh: { exitCode: 0, stdout: snapshot([{ n: 201 }]) }, ghDelayMs: 1000 })
  const first = $.command.run(OPEN)
  await seen.clock.settle()
  const second = $.command.run(OPEN)
  await seen.clock.settle()
  await seen.clock.advance(1000)
  await Promise.all([first, second])

  expect(seen.argv.filter(a => a[0] === 'gh')).toHaveLength(1)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await texts(ui)).filter(t => /^#201 /.test(t))).toHaveLength(1)
  await ui.unmount()
})

// A worker is matched by its whole name, so t-1 never takes t-12's row action.
test('with t-1 and t-12 both live, each row acts on its own worker', async ($, on) => {
  const seen = host(on, {
    gh: { exitCode: 0, stdout: snapshot([{ n: 1, labels: ['claimed'], worker: 't-1' }, { n: 12, labels: ['claimed'], worker: 't-12' }]) },
    agents: [
      { id: 'a12', description: 't-12 board' },
      { id: 'a1', description: 't-1 board' },
    ],
  })
  await $.command.run(OPEN)

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 'worker-1' })
  await ui.press({ key: 'worker-12' })
  await ui.unmount()
  expect(seen.viewed).toEqual(['a1', 'a12'])
})

test('with background sessions t-1 and t-12 both live, attach names the row worker', async ($, on) => {
  const seen = host(on, {
    gh: { exitCode: 0, stdout: snapshot([{ n: 1, labels: ['claimed'], worker: 't-1' }, { n: 12, labels: ['claimed'], worker: 't-12' }]) },
    sessions: [
      { name: 't-12', kind: 'background' },
      { name: 't-1', kind: 'background' },
    ],
  })
  await $.command.run(OPEN)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'worker-1' })
  await ui.unmount()
  expect(seen.filled).toEqual(['claude attach t-1'])
})

// The trust boundary (ADR 0009): a wave comment from an outside author is skipped, as spp skips it.
test('a forged wave comment from an outside author does not place the tickets', async ($, on) => {
  host(on, {
    gh: { exitCode: 0, stdout: snapshot([{ n: 201 }], [{ n: 1, tickets: ['201'] }], [{ n: 9, tickets: ['201'] }]) },
  })
  await $.command.run(OPEN)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const waves = (await texts(ui)).filter(t => /^Wave \d$/.test(t))
  expect(waves).toEqual(['Wave 1'])
  await ui.unmount()
})
