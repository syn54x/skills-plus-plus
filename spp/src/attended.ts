// Whether this run is an Attended session (ADR 0012). The one place spp reads the harness's signal, per the
// portability law; skills/build/CLAUDE-CODE.md names the variables. Neither is documented by Anthropic, so anything
// unrecognised counts as not attended.

export const isAttended = (env: NodeJS.ProcessEnv): boolean => !env.CI && env.CLAUDE_CODE_SESSION_ATTENDED === "1";
