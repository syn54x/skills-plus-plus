// The Submission mode: whether a person's Skill feedback is filed unattended (Auto) or shown to them first (Review).
// It belongs to the person, for each repo (ADR 0012), so it lives in spp's config directory, outside every checkout.
import { randomBytes } from "node:crypto";
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

// The per-repo entries of `submissionMode`; {} when it is absent or not an object (the old one-value string reads as none).
function entries(config: Record<string, unknown>): Record<string, unknown> {
  const m = config.submissionMode;
  return m && typeof m === "object" && !Array.isArray(m) ? (m as Record<string, unknown>) : {};
}

/** The person's Submission mode for `repo` (`owner/repo`): Review unless the file holds exactly `"Auto"` for it. */
export function readSubmissionMode(repo: string, env: NodeJS.ProcessEnv = process.env): SubmissionMode {
  return entries(readConfig(fileOf(env)))[repo] === "Auto" ? "Auto" : "Review";
}

/**
 * The person's tally secret: the key `repoKey` hashes a repo name under, so a tally key names no repo and cannot be
 * confirmed by hashing a guessed one. Read from the config file, or made (32 random bytes, hex) and written there on
 * first use, keeping every other key.
 */
export function tallySecret(env: NodeJS.ProcessEnv = process.env): string {
  const file = fileOf(env);
  const config = readConfig(file);
  if (typeof config.tallySecret === "string" && /^[0-9a-f]{64}$/.test(config.tallySecret)) return config.tallySecret;
  const secret = randomBytes(32).toString("hex");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify({ ...config, tallySecret: secret }, null, 2) + "\n", { mode: 0o600 });
  return secret;
}

/** Sets the person's Submission mode for `repo`, keeping every other repo's entry and every other key, and creating the directory. */
export function writeSubmissionMode(repo: string, mode: SubmissionMode, env: NodeJS.ProcessEnv = process.env): void {
  const file = fileOf(env);
  const config = readConfig(file);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify({ ...config, submissionMode: { ...entries(config), [repo]: mode } }, null, 2) + "\n");
}
