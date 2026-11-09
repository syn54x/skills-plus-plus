// The epic board's state contract: what the board mod keeps in $.state under the plugin's name. The mod fills it
// from the EpicState that spp's derive computes; the contract stays self-contained, so it restates only what the
// pane draws.

// A live worker the board can act on: a subagent of this session from $.agent.list(), named by its Agent call's
// description. Every worker is a subagent, so opened in the Build session the board lists them all.
export type BoardWorker = { name: string; kind: 'subagent'; agentId: string }

// One Sub-issue's row.
export type BoardTicket = {
  number: number
  url: string
  title: string
  state: string // a TicketState, as derive names it
  pr: string | null // the pull request's URL
  worker: string | null // the progress comment's Worker line
  note: { text: string; at: string } | null // the latest note, from the local notes log `spp note` writes
  wave: number | null // the Wave it was dispatched in, from the Epic's wave comment
}

// One Fix pull request's row: a trusted pull request into the integration branch that closes no Sub-issue.
export type BoardFix = {
  number: number
  url: string // the pull request's URL
  state: 'OPEN' | 'MERGED'
  ticket: number | null // the Sub-issue its `Refs` line names; null when unattributed
}

export type Board = {
  epic: string | null // the Epic as given to /epic-board: an issue number or URL; null until one is chosen
  title: string | null // `#<number> <title>`, null until the first good refresh
  merged: number
  tickets: BoardTicket[] // none until the first good refresh, or after the gh call failed
  fixes: BoardFix[] // none until the first good refresh, or when the Epic has no Fix pull requests
  workers: BoardWorker[]
  error: string | null // one line: the last failing gh or spp call, agent list read, or the pull-request read
}

declare module 'claude-code' {
  interface PluginState {
    spp: { board: Shaped<Board> }
  }
}
