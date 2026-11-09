// The Submission mode: whether a person's Skill feedback is filed unattended (Auto) or shown to them first (Review).
// It belongs to the person, for each repo (ADR 0012), so it lives in spp's config directory, outside every checkout.
import { randomBytes } from "node:crypto";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname } from "node:path";

/** Auto files Skill feedback unattended; Review shows each report and files it only on the person's yes. */
export type SubmissionMode = "Auto" | "Review";

/** `$XDG_CONFIG_HOME/spp/config.json`, else `$HOME/.config/spp/config.json`. */
export const submissionFile = (env: { XDG_CONFIG_HOME?: string; HOME: string }): string => `${env.XDG_CONFIG_HOME || `${env.HOME}/.config`}/spp/config.json`;

const fileOf = (env: NodeJS.ProcessEnv) => submissionFile({ XDG_CONFIG_HOME: env.XDG_CONFIG_HOME, HOME: env.HOME || homedir() });

// Writes the config file whole and leaves it readable by its owner alone, since it holds the tally secret: the mode
// a write gives applies only when it creates the file.
function writeConfig(file: string, config: Record<string, unknown>): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });
  chmodSync(file, 0o600);
}

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
 * first use, keeping every other key and leaving the file at mode 0600.
 */
export function tallySecret(env: NodeJS.ProcessEnv = process.env): string {
  const file = fileOf(env);
  const config = readConfig(file);
  if (typeof config.tallySecret === "string" && /^[0-9a-f]{64}$/.test(config.tallySecret)) return config.tallySecret;
  const secret = randomBytes(32).toString("hex");
  writeConfig(file, { ...config, tallySecret: secret });
  return secret;
}

/**
 * Sets the person's Submission mode for `repo`, keeping every other repo's entry and every other key, creating the
 * directory, and leaving the file at mode 0600.
 */
export function writeSubmissionMode(repo: string, mode: SubmissionMode, env: NodeJS.ProcessEnv = process.env): void {
  const file = fileOf(env);
  const config = readConfig(file);
  writeConfig(file, { ...config, submissionMode: { ...entries(config), [repo]: mode } });
}
