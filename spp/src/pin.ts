// The Verify pin (ADR 0009): the sha256 of an approved Verify block, kept in the trailer of the issue's trusted
// progress comment. Hardening saves it (through the progress comment's writer, with `pinFields`); the ready gate
// (`spp lint ticket`), `spp kind` and the worker gate (`spp verify`) check it, so they can never disagree on its key,
// its hash or which comment holds it. This module imports no command, so the progress comment renders the pin line
// from it without an import cycle.
import { createHash } from "node:crypto";
import { type Data, find, parseIssue, PROGRESS_MARKER, readTrailer } from "./markers.ts";
import type { Failure } from "./ticket.ts";

/** The progress trailer field that holds the pin. */
export const PIN_KEY = "verifyPin";

const hash = (block: string) => createHash("sha256").update(block).digest("hex");

/** The progress trailer fields that pin `block`. */
export const pinFields = (block: string): Data => ({ [PIN_KEY]: hash(block) });

/** The progress comment's pin line for its trailer data: one line when it holds a pin, none otherwise. */
export function pinLine(data: Data): string[] {
  const pin = data[PIN_KEY];
  return typeof pin === "string" && pin ? [`**Verify pin:** \`${pin.slice(0, 12)}\``] : [];
}

/**
 * Why `block` (the issue's Verify block as fetched, or null when it has none) may not run, or null when it may:
 * `pin-present` when no trusted progress comment pins a block, `pin-match` when the pin is for another block.
 */
export async function checkPin(issue: string, block: string | null): Promise<Failure | null> {
  const pin = readTrailer((await find(parseIssue(issue), PROGRESS_MARKER))?.body ?? "")?.[PIN_KEY];
  const reharden = `re-harden it (harden ends with spp lint ticket ${issue} --pin <body-file>)`;
  if (typeof pin !== "string") return block === null ? null : { rule: "pin-present", detail: `the Verify block of ${issue} is not pinned; ${reharden}` };
  if (block === null || hash(block) !== pin) return { rule: "pin-match", detail: `the Verify block of ${issue} changed since it was hardened; ${reharden}` };
  return null;
}
