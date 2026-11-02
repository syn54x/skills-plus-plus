// The Verify pin (ADR 0009): the sha256 of an approved Verify block, kept in the trailer of the issue's trusted
// progress comment. Hardening saves it; the ready gate (`spp lint ticket`) and the worker gate (`spp verify`) check
// it, so the two can never disagree on its key, its hash or which comment holds it.
import { createHash } from "node:crypto";
import { MARKER, renderProgress } from "./commands/progress.ts";
import { find, parseIssue, readTrailer, writeMarker } from "./markers.ts";
import type { Failure } from "./ticket.ts";

/** The progress trailer field that holds the pin. */
export const PIN_KEY = "verifyPin";

const hash = (block: string) => createHash("sha256").update(block).digest("hex");

/** Pins `block` on the issue's progress comment, keeping every other field; returns the comment's URL. */
export function savePin(issue: string, block: string): Promise<string> {
  return writeMarker(issue, MARKER, renderProgress, { [PIN_KEY]: hash(block) });
}

/**
 * Why `block` (the issue's Verify block as fetched, or null when it has none) may not run, or null when it may:
 * `pin-present` when no trusted progress comment pins a block, `pin-match` when the pin is for another block.
 */
export async function checkPin(issue: string, block: string | null): Promise<Failure | null> {
  const pin = readTrailer((await find(parseIssue(issue), MARKER))?.body ?? "")?.[PIN_KEY];
  const reharden = `re-harden it (harden ends with spp lint ticket ${issue} --pin <body-file>)`;
  if (typeof pin !== "string") return block === null ? null : { rule: "pin-present", detail: `the Verify block of ${issue} is not pinned; ${reharden}` };
  if (block === null || hash(block) !== pin) return { rule: "pin-match", detail: `the Verify block of ${issue} changed since it was hardened; ${reharden}` };
  return null;
}
