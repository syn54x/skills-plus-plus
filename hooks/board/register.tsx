// The epic board: a view-only pane opened by /epic-board, plus a status line entry. It runs the spp core (the
// snapshot query, readSnapshot and derive) on gh's answer, reads notes from the local notes log `spp note` writes and
// workers from `claude agents --json` and $.agent.list(). The pipeline runs the same without it; `spp status` is the
// fallback view.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { derive, type EpicState, type TicketState } from '../../spp/src/derive.ts'
import { latestNotes, notesFile } from '../../spp/src/notes-log.ts'
import { epicsArgs, pullRequestsArgs, readEpics, readPullRequests, readSnapshot, type Snapshot, snapshotArgs, withPullRequests } from '../../spp/src/snapshot.ts'
import type { Board, BoardFix, BoardTicket, BoardWorker } from '../../types/index.d.ts'

const PANE = 'epic-board'
const TITLE = 'Epic board'
const EMPTY: Board = { epic: null, title: null, merged: 0, tickets: [], fixes: [], workers: [], error: null }
// Change the tag when Board changes shape: it declines what an earlier version stored, which outlives a reload.
const board = atom({ plugin: 'spp', key: 'board' } as const, EMPTY, { shape: 'board-2' })

// Each TicketState's chip: a distinct label and a color.
const CHIPS: Record<TicketState, { label: string; color: string }> = {
  blocked: { label: 'blocked', color: 'gray' },
  ready: { label: 'ready', color: 'cyan' },
  claimed: { label: 'claimed', color: 'blue' },
  'pr-open': { label: 'PR open', color: 'yellow' },
  'gate-pass': { label: 'gate pass', color: 'green' },
  'gate-fail': { label: 'gate fail', color: 'red' },
  merged: { label: 'merged', color: 'magenta' },
  'handed-back': { label: 'handed back', color: 'red' },
  'not-agent': { label: 'not for agents', color: 'gray' },
}

const firstLine = (s: string) => s.trim().split('\n')[0] ?? ''

// Runs a host command; resolves its stdout, or throws one line naming the command and its stderr.
async function run($: EngineInterface, name: string, argv: string[]): Promise<string> {
  const r = await $.process.run(argv, { timeoutMs: 60_000 })
  if (r.exitCode !== 0) throw new Error(`${name}: ${firstLine(r.stderr) || `exited ${r.exitCode}`}`)
  return r.stdout
}

// The Wave each ticket was dispatched in, by ticket URL, from the wave comment's trailer, which the snapshot reads
// from a trusted author only (ADR 0009). A Wave names a ticket as a bare number (the Epic's repo), owner/repo#N or the
// issue URL.
function wavesOf(wave: Snapshot['wave'], state: EpicState): Map<string, number> {
  const waves = (wave?.waves || []) as { n: number; tickets: (string | number)[] }[]
  const out = new Map<string, number>()
  for (const t of state.tickets) {
    const names = [t.url, `${t.repo}#${t.number}`, ...(t.repo === state.epic.repo ? [String(t.number)] : [])]
    const w = waves.findLast(w => w.tickets.some(x => names.includes(String(x))))
    if (w) out.set(t.url, w.n)
  }
  return out
}

// The latest note of each ticket, by ticket URL, read from each repo's local notes log; a repo with no log has none.
async function notesOf($: EngineInterface, state: EpicState): Promise<Map<string, { text: string; at: string }>> {
  const env = { XDG_STATE_HOME: await $.env.get('XDG_STATE_HOME'), HOME: (await $.env.get('HOME')) ?? '' }
  const out = new Map<string, { text: string; at: string }>()
  for (const repo of new Set(state.tickets.map(t => t.repo))) {
    const file = notesFile(env, repo)
    if (!(await $.fs.exists(file))) continue
    const latest = latestNotes((await $.fs.read(file)) as string)
    for (const t of state.tickets) {
      const n = t.repo === repo ? latest.get(t.number) : undefined
      if (n) out.set(t.url, { text: n.text, at: n.at })
    }
  }
  return out
}

async function workersOf($: EngineInterface): Promise<BoardWorker[]> {
  const sessions = JSON.parse(await run($, 'claude agents', ['claude', 'agents', '--json'])) as { name?: string; kind?: string }[]
  const agents = await $.agent.list()
  return [
    ...sessions.flatMap(s => (s.name ? [{ name: s.name, kind: s.kind === 'background' ? 'background' : 'interactive' } as const] : [])),
    ...agents.map(a => ({ name: a.description, kind: 'subagent' as const, agentId: a.id })),
  ]
}

// The snapshot with the pull requests into the integration branch, one request per repo spp names, as `spp status`
// reads them: a repo that fails loses its pull requests and nothing else, and its error names it.
async function withBranchPullRequests($: EngineInterface, snapshot: Snapshot, errors: string[]): Promise<Snapshot> {
  const all = pullRequestsArgs(snapshot)
  const settled = await Promise.allSettled(all.map(async args => readPullRequests(await $.process.run(['gh', ...args], { timeoutMs: 60_000 }))))
  const answers = settled.flatMap((r, i) => {
    if (r.status === 'fulfilled') return [r.value]
    const repo = all[i].filter(a => /^(owner|repo)=/.test(a)).map(a => a.slice(a.indexOf('=') + 1)).join('/')
    errors.push(`pull requests of ${repo}: ${firstLine(r.reason.message)}`)
    return []
  })
  return withPullRequests(snapshot, answers)
}

// One refresh: the snapshot through gh, then the pull requests, notes and workers. A failing gh call leaves no ticket
// rows; a failing pull-request read, notes read or claude call keeps them and shows its error.
async function load($: EngineInterface, epic: string): Promise<Board> {
  const args = snapshotArgs(epic)
  if (!args) return { ...EMPTY, epic, error: `not an issue number or URL: ${epic}` }
  const errors: string[] = []
  let snapshot: Snapshot
  let state: EpicState
  try {
    snapshot = readSnapshot(await $.process.run(['gh', ...args], { timeoutMs: 60_000 }))
    snapshot = await withBranchPullRequests($, snapshot, errors)
    state = derive(snapshot)
  } catch (e) {
    return { ...EMPTY, epic, error: `gh: ${firstLine((e as Error).message)}` }
  }
  const notes = await notesOf($, state).catch((e: Error) => (errors.push(`notes: ${firstLine(e.message)}`), new Map()))
  const workers = await workersOf($).catch((e: Error) => (errors.push(e.message), []))
  const waves = wavesOf(snapshot.wave, state)
  const tickets: BoardTicket[] = state.tickets.map(t => ({
    number: t.number,
    url: t.url,
    title: t.title,
    state: t.state,
    pr: t.pr?.url ?? null,
    worker: t.worker,
    note: notes.get(t.url) ?? null,
    wave: waves.get(t.url) ?? null,
  }))
  const fixes: BoardFix[] = state.fixes.map(f => ({
    number: f.number,
    url: f.url,
    state: f.state,
    ticket: state.tickets.find(t => t.url === f.ticket)?.number ?? null,
  }))
  return { epic, title: `#${state.epic.number} ${state.epic.title}`, merged: state.counts.merged, tickets, fixes, workers, error: errors[0] ?? null }
}

const ago = (at: string, now: number) => {
  const s = Math.max(0, Math.round((now - Date.parse(at)) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const openFixes = (b: Board) => b.fixes.filter(f => f.state === 'OPEN').length

// The progress words: merged of total, then the open fixes whenever the Epic has any fix, as `spp status` does.
const progressOf = (b: Board) => {
  const open = openFixes(b)
  return `${b.merged}/${b.tickets.length} merged${b.fixes.length ? ` · ${open} ${open === 1 ? 'fix' : 'fixes'} open` : ''}`
}

// The status line: the Epic's progress, merged of total, and the newest note.
function statusOf(b: Board): string | undefined {
  if (!b.title) return b.epic ? `epic board: ${b.error ?? 'loading'}` : undefined
  const newest = b.tickets.filter(t => t.note).sort((x, y) => Date.parse(y.note!.at) - Date.parse(x.note!.at))[0]
  const progress = `${b.title.split(' ')[0]} ${progressOf(b)}`
  return newest ? `${progress} | #${newest.number} ${newest.note!.text}` : progress
}

// One refresh at a time: a timer tick or turn that comes while one is in flight is skipped, since each snapshot costs
// GitHub's GraphQL budget. When the Epic changed while it loaded, the result is dropped and the new Epic is loaded.
// The in-flight refresh learns of a new Epic from `wanted`, not the atom: a handler's reads of the atom do not see
// another handler's write while it runs, so /epic-board sets both.
let refreshing = false
let wanted: string | null = null
async function refresh($: EngineInterface) {
  if (refreshing) return
  refreshing = true
  try {
    let epic = wanted ?? (await read($, board)).epic
    for (;;) {
      if (!epic) return
      const next = await load($, epic)
      if (wanted && wanted !== epic) {
        epic = wanted
        continue
      }
      await update($, board, () => next)
      await $.ui.status(statusOf(next))
      return
    }
  } finally {
    refreshing = false
  }
}

// workerTicket's two patterns in spp/src/attended.ts, which the board cannot import; spp's tests check they agree.
const WORKER_BRANCH = /^sdd\/(\d+)-|^sdd-(\d+)$/
const WORKER_FOLDER = /^sdd-(\d+)$/

// The Epic to show when none is named, by the first rule that answers: a worker checkout (an sdd/<N>- or sdd-<N>
// branch, or an sdd-<N> folder) names a Sub-issue, whose parent is the Epic; a branch feat/<slug> names the open Epic
// whose plan records it as its integration branch; otherwise the Epics in flight in this repo (a plan records a branch
// and a Sub-issue is not merged): one opens, several are listed, none says so. The reply is what to tell the person
// when no Epic opens.
async function pickEpic($: EngineInterface): Promise<{ epic: string } | { text: string }> {
  const branch = await run($, 'git', ['git', 'branch', '--show-current']).then(b => b.trim(), () => '')
  const named = WORKER_BRANCH.exec(branch)
  const top = named ? '' : await run($, 'git', ['git', 'rev-parse', '--show-toplevel']).then(t => t.trim(), () => '')
  const ticket = named?.[1] ?? named?.[2] ?? WORKER_FOLDER.exec(top.split('/').pop() ?? '')?.[1]
  if (ticket) {
    const parent = await run($, 'gh', ['gh', 'issue', 'view', ticket, '--json', 'parent', '--jq', '.parent.url // ""']).then(p => p.trim(), () => '')
    if (parent) return { epic: parent }
  }
  let epics
  try {
    epics = readEpics(await $.process.run(['gh', ...epicsArgs()], { timeoutMs: 60_000 }), true)
  } catch (e) {
    return { text: `gh: ${firstLine((e as Error).message)}` }
  }
  const named = branch.startsWith('feat/') ? epics.filter(e => e.branch === branch) : []
  const flying = named.length ? named : epics.filter(e => e.branch && e.completed < e.total)
  if (flying.length === 1) return { epic: String(flying[0].number) }
  if (!flying.length) return { text: 'No Epic is in flight in this repo. Run /epic-board <epic number or issue URL>.' }
  return { text: [...flying.map(e => `#${e.number} ${e.title}, ${e.completed}/${e.total}`), 'Run /epic-board <N>.'].join('\n') }
}

// Refreshes every two minutes once an Epic is chosen; turns and inbound messages refresh it in between. Timers end with
// the module, so a reload starts it again.
let timer: { cancel: () => void } | null = null
function startTimer($: EngineInterface) {
  timer ??= $.clock.every(120_000, () => void refresh($))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'epic-board',
      description: 'Show an Epic in flight: every Sub-issue by Wave with its state, latest note and worker',
      argumentHint: '[epic number or issue URL]',
    })
    if ((await read($, board)).epic) startTimer($)
    return next(e)
  })

  on('command.run', { command: 'epic-board' }, async ($, e) => {
    const picked = e.args.trim() ? { epic: e.args.trim() } : await pickEpic($)
    if (!('epic' in picked)) return picked
    const epic = picked.epic
    wanted = epic
    await update($, board, () => ({ ...EMPTY, epic }))
    await refresh($)
    startTimer($)
    await $.ui.open({ id: PANE, title: TITLE })
    return { text: `Epic board opened for ${epic}.` }
  })

  // After every turn and every inbound message. A timer runs the refresh, so the event never waits on gh.
  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    if (!e.agentId) $.clock.after(0, () => void refresh($))
    return r
  })
  on('session.receive', async ($, e, next) => {
    $.clock.after(0, () => void refresh($))
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const b = await read($, board)
    const now = await $.clock.now()
    const error = b.error && (
      <Box key="error">
        <Text color="red">{b.error}</Text>
      </Box>
    )
    if (!b.title) {
      return (
        <Box flexDirection="column">
          {error || <Text dimColor>{b.epic ? 'Loading...' : 'No Epic chosen. Run /epic-board <epic number or issue URL>.'}</Text>}
        </Box>
      )
    }

    const waves = [...new Set(b.tickets.map(t => t.wave))].sort((x, y) => (x ?? Infinity) - (y ?? Infinity))
    // shortcut: rows are keyed by issue number, so a multi-repo Epic with two equal numbers shares a key; key by URL then.
    const row = (t: BoardTicket) => {
      const chip = CHIPS[t.state as TicketState]
      // The worker's name as a whole token of a session's name or a subagent's description, punctuation aside, so
      // `t-12: implement` names t-12 and t-1 never matches t-12.
      const named = (w: BoardWorker) => w.name.split(/[^\w-]+/).includes(t.worker!)
      const w = t.worker ? b.workers.find(named) : undefined
      const pr = t.pr
      return (
        <Box flexDirection="column" marginBottom={1}>
          <Box flexDirection="row" gap={1}>
            <Box key={`chip-${t.number}`}>
              <Text color={chip.color} bold>
                {chip.label}
              </Text>
            </Box>
            <Text>{`#${t.number} ${t.title}`}</Text>
          </Box>
          {t.note && <Text dimColor>{`${t.note.text}, ${ago(t.note.at, now)}`}</Text>}
          <Box flexDirection="row" gap={1}>
            {t.worker && <Text dimColor>{t.worker}</Text>}
            <Button key={`issue-${t.number}`} label="issue" onPress={press => $.ui.copy({ text: t.url, surface: press.surface })} />
            {pr && <Button key={`pr-${t.number}`} label="PR" onPress={press => $.ui.copy({ text: pr, surface: press.surface })} />}
            {w?.kind === 'background' && (
              <Button key={`worker-${t.number}`} label="attach" onPress={() => $.prompt.fill({ text: `claude attach ${w.name}` })} />
            )}
            {w?.kind === 'subagent' && (
              <Button key={`worker-${t.number}`} label="transcript" onPress={() => $.ui.view({ agentId: w.agentId })} />
            )}
          </Box>
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        <Text bold>{`${b.title}: ${progressOf(b)}`}</Text>
        {error}
        {waves.map(wave => (
          <Box flexDirection="column">
            <Text bold>{wave === null ? 'Not in a Wave' : `Wave ${wave}`}</Text>
            {b.tickets.filter(t => t.wave === wave).map(row)}
          </Box>
        ))}
        {b.fixes.length > 0 && (
          <Box flexDirection="column">
            <Text bold>Fixes</Text>
            {b.fixes.map(f => (
              <Box flexDirection="row" gap={1}>
                <Box key={`fix-chip-${f.number}`}>
                  <Text color={f.state === 'OPEN' ? 'yellow' : 'magenta'} bold>
                    {f.state === 'OPEN' ? 'fix open' : 'fix merged'}
                  </Text>
                </Box>
                <Text>{`#${f.number} ${f.ticket ? `Refs #${f.ticket}` : 'unattributed'}`}</Text>
                <Button key={`fix-pr-${f.number}`} label="PR" onPress={press => $.ui.copy({ text: f.url, surface: press.surface })} />
              </Box>
            ))}
          </Box>
        )}
      </Box>
    )
  })
}
