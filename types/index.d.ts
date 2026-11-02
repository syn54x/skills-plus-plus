// The epic board's state contract: what the board mod keeps in $.state under the plugin's name. The mod fills it
// from the EpicState that spp's derive computes; the contract stays self-contained, so it restates only what the
// pane draws.

// A live worker the board can act on: a background or interactive session from `claude agents --json`, or a
// subagent of this session from $.agent.list(), named by its Agent call's description.
export type BoardWorker = { name: string; kind: 'background' | 'interactive' | 'subagent'; agentId?: string }

// One Sub-issue's row.
export type BoardTicket = {
  number: number
  url: string
  title: string
  state: string // a TicketState, as derive names it
  pr: string | null // the pull request's URL
  worker: string | null // the progress comment's Worker line
  note: { text: string; at: string } | null // the latest note, from `spp note --list`
  wave: number | null // the Wave it was dispatched in, from the Epic's wave comment
}

export type Board = {
  epic: string | null // the Epic as given to /epic-board: an issue number or URL; null until one is chosen
  title: string | null // `#<number> <title>`, null until the first good refresh
  merged: number
  tickets: BoardTicket[] // none until the first good refresh, or after the gh call failed
  workers: BoardWorker[]
  error: string | null // one line: the last failing gh, spp or claude call
}

declare module 'claude-code' {
  interface PluginState {
    spp: { board: Shaped<Board> }
  }
}
