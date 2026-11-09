// The Submission mode: whether a person's Skill feedback is filed unattended (Auto) or shown to them first (Review).
// It belongs to the person, not the repo (ADR 0012), so it lives in spp's config directory, outside every checkout.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname } from "node:path";

/** Auto files Skill feedback unattended; Review shows each report and files it only on the person's yes. */
export type SubmissionMode = "Auto" | "Review";

/** `$XDG_CONFIG_HOME/spp/config.json`, else `$HOME/.config/spp/config.json`. */
export const submissionFile = (env: { XDG_CONFIG_HOME?: string; HOME: string }): string => `${env.XDG_CONFIG_HOME || `${env.HOME}/.config`}/spp/config.json`;

const fileOf = (env: NodeJS.ProcessEnv) => submissionFile({ XDG_CONFIG_HOME: env.XDG_CONFIG_HOME, HOME: env.HOME || homedir() });

// The config file's object; {} when it is missing, unreadable or not an object.
function readConfig(file: string): Record<string, unknown> {
  try {
    const v = JSON.parse(readFileSync(file, "utf8")) as unknown;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** The person's Submission mode: Review when the file is missing or unreadable or holds anything but `"Auto"`. */
export function readSubmissionMode(env: NodeJS.ProcessEnv = process.env): SubmissionMode {
  return readConfig(fileOf(env)).submissionMode === "Auto" ? "Auto" : "Review";
}

/** Writes the person's Submission mode, keeping every other key in the file and creating its directory. */
export function writeSubmissionMode(mode: SubmissionMode, env: NodeJS.ProcessEnv = process.env): void {
  const file = fileOf(env);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify({ ...readConfig(file), submissionMode: mode }, null, 2) + "\n");
}
