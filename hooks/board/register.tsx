// The epic board: a view-only pane opened by /epic-board, plus a status line entry. It runs the spp core (the
// snapshot query, parseSnapshot and derive) on gh's answer, reads notes from `spp note --list` and workers from
// `claude agents --json` and $.agent.list(). The pipeline runs the same without it; `spp status` is the fallback view.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { derive, type EpicState, type TicketState } from '../../spp/src/derive.ts'
import { parseSnapshot, readTrailer, SNAPSHOT_QUERY } from '../../spp/src/snapshot.ts'
import type { Board, BoardTicket, BoardWorker } from '../../types/index.d.ts'

const PANE = 'epic-board'
const TITLE = 'Epic board'
const EMPTY: Board = { epic: null, title: null, merged: 0, tickets: [], workers: [], error: null }
// Change the tag when Board changes shape: it declines what an earlier version stored, which outlives a reload.
const board = atom({ plugin: 'spp', key: 'board' } as const, EMPTY, { shape: 'board-1' })

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

// The query variables for an Epic given as a number (the session's repo, through gh's placeholders) or an issue URL.
function variables(epic: string): string[] | null {
  if (/^\d+$/.test(epic)) return ['-F', 'owner={owner}', '-F', 'repo={repo}', '-F', `number=${epic}`]
  const m = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)\/?$/.exec(epic)
  return m ? ['-f', `owner=${m[1]}`, '-f', `repo=${m[2]}`, '-F', `number=${m[3]}`] : null
}

// Runs a host command; resolves its stdout, or throws one line naming the command and its stderr.
async function run($: EngineInterface, name: string, argv: string[]): Promise<string> {
  const r = await $.process.run(argv, { timeoutMs: 60_000 })
  if (r.exitCode !== 0) throw new Error(`${name}: ${firstLine(r.stderr) || `exited ${r.exitCode}`}`)
  return r.stdout
}

// The Wave each ticket was dispatched in, by ticket URL, from the wave comment's trailer. A Wave names a ticket as a
// bare number (the Epic's repo), owner/repo#N or the issue URL.
function wavesOf(raw: unknown, state: EpicState): Map<string, number> {
  type Raw = { data?: { repository?: { issue?: { comments?: { nodes: { body: string }[] } } } } }
  const body = (raw as Raw).data?.repository?.issue?.comments?.nodes.find(c => c.body.startsWith('<!-- sdd-wave -->'))?.body
  const waves = ((body && readTrailer(body)?.waves) || []) as { n: number; tickets: (string | number)[] }[]
  const out = new Map<string, number>()
  for (const t of state.tickets) {
    const names = [t.url, `${t.repo}#${t.number}`, ...(t.repo === state.epic.repo ? [String(t.number)] : [])]
    const w = waves.findLast(w => w.tickets.some(x => names.includes(String(x))))
    if (w) out.set(t.url, w.n)
  }
  return out
}

// The latest note of each ticket, by ticket URL.
async function notesOf($: EngineInterface, epic: string): Promise<Map<string, { text: string; at: string }>> {
  const out = await run($, 'spp note', [`${$.plugin.root}/bin/spp`, 'note', '--list', epic, '--json'])
  const notes = JSON.parse(out) as { ticket: string; text: string; at: string }[]
  return new Map(notes.map(n => [n.ticket, { text: n.text, at: n.at }]))
}

async function workersOf($: EngineInterface): Promise<BoardWorker[]> {
  const sessions = JSON.parse(await run($, 'claude agents', ['claude', 'agents', '--json'])) as { name?: string; kind?: string }[]
  const agents = await $.agent.list()
  return [
    ...sessions.flatMap(s => (s.name ? [{ name: s.name, kind: s.kind === 'background' ? 'background' : 'interactive' } as const] : [])),
    ...agents.map(a => ({ name: a.description, kind: 'subagent' as const, agentId: a.id })),
  ]
}

// One refresh: the snapshot through gh, then notes and workers. A failing gh call leaves no ticket rows; a failing
// spp or claude call keeps them and shows its error.
async function load($: EngineInterface, epic: string): Promise<Board> {
  const vars = variables(epic)
  if (!vars) return { ...EMPTY, epic, error: `not an issue number or URL: ${epic}` }
  let raw: unknown
  let state: EpicState
  try {
    const r = await $.process.run(['gh', 'api', 'graphql', '-f', `query=${SNAPSHOT_QUERY}`, ...vars], { timeoutMs: 60_000 })
    try {
      raw = JSON.parse(r.stdout) // gh exits 1 on a missing issue but still prints the response
    } catch {
      throw new Error(firstLine(r.stderr) || `exited ${r.exitCode}`)
    }
    state = derive(parseSnapshot(raw))
  } catch (e) {
    return { ...EMPTY, epic, error: `gh: ${firstLine((e as Error).message)}` }
  }
  const errors: string[] = []
  const notes = await notesOf($, epic).catch((e: Error) => (errors.push(e.message), new Map()))
  const workers = await workersOf($).catch((e: Error) => (errors.push(e.message), []))
  const waves = wavesOf(raw, state)
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
  return { epic, title: `#${state.epic.number} ${state.epic.title}`, merged: state.counts.merged, tickets, workers, error: errors[0] ?? null }
}

const ago = (at: string, now: number) => {
  const s = Math.max(0, Math.round((now - Date.parse(at)) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

// The status line: the Epic's progress, merged of total, and the newest note.
function statusOf(b: Board): string | undefined {
  if (!b.title) return b.epic ? `epic board: ${b.error ?? 'loading'}` : undefined
  const newest = b.tickets.filter(t => t.note).sort((x, y) => Date.parse(y.note!.at) - Date.parse(x.note!.at))[0]
  const progress = `${b.title.split(' ')[0]} ${b.merged}/${b.tickets.length} merged`
  return newest ? `${progress} | #${newest.number} ${newest.note!.text}` : progress
}

async function refresh($: EngineInterface) {
  const { epic } = await read($, board)
  if (!epic) return
  const next = await load($, epic)
  await update($, board, () => next)
  await $.ui.status(statusOf(next))
}

// The Epic of the current branch's plan, when it can tell: a worker branch sdd/<N>-* names a Sub-issue, whose
// parent is the Epic.
async function currentEpic($: EngineInterface): Promise<string | null> {
  try {
    const branch = (await run($, 'git', ['git', 'branch', '--show-current'])).trim()
    const ticket = /^sdd\/(\d+)/.exec(branch)?.[1]
    if (!ticket) return null
    const parent = (await run($, 'gh', ['gh', 'issue', 'view', ticket, '--json', 'parent', '--jq', '.parent.url // ""'])).trim()
    return parent || null
  } catch {
    return null
  }
}

// Refreshes every 30 seconds once an Epic is chosen. Timers end with the module, so a reload starts it again.
let timer: { cancel: () => void } | null = null
function startTimer($: EngineInterface) {
  timer ??= $.clock.every(30_000, () => void refresh($))
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
    const epic = e.args.trim() || (await currentEpic($))
    if (!epic) return { text: 'Which Epic? Run /epic-board <epic number or issue URL>.' }
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
      const w = t.worker ? b.workers.find(w => (w.kind === 'subagent' ? w.name.includes(t.worker!) : w.name === t.worker)) : undefined
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
        <Text bold>{`${b.title}: ${b.merged}/${b.tickets.length} merged`}</Text>
        {error}
        {waves.map(wave => (
          <Box flexDirection="column">
            <Text bold>{wave === null ? 'Not in a Wave' : `Wave ${wave}`}</Text>
            {b.tickets.filter(t => t.wave === wave).map(row)}
          </Box>
        ))}
      </Box>
    )
  })
}
