# Prove a pruning issue

`test-audit` named the **Keeper** by reading and ran nothing. No test is removed unless its Keeper was seen failing on a deliberate break, so this proof runs before any worker is spent. The examples use the `notes` project: an issue asks to remove `test/add.test.ts::saves a quoted note` because `test/cli.test.ts::add keeps a quote in the text` is its Keeper, with the owning code `src/add.ts::addNote` and the break "`addNote` joins the text into its JSON by string, so a quote ends the string early".

1. **Read the five lines** under `## Pruning opportunity`: `Remove`, `Keeper`, `Owning code`, `Break` and `Strength`. `Remove` and `Keeper` are written `file::name`. When the test on the `Remove` line is already gone from the default branch, the first question answers it: already built. When a line is missing, or the Keeper or the owning code it names does not exist, the issue is too thin to try and is `needs-info`, as for a bug.
2. **Make a scratch copy** of the remote's default branch outside the person's checkout, from a fresh fetch so a stale local branch cannot stand in for it:

   ```bash
   git fetch origin main
   scratch="$(mktemp -d)"
   git worktree add --detach "$scratch" origin/main
   echo "$scratch"
   ```

   `main` stands for the repo's default branch. A shell variable does not survive from one command to the next, so keep the printed path and use it for every later command, or run steps 2 to 5 in one call. Every edit and every test run of this proof happens under `$scratch`. No file in the person's checkout is edited, staged or stashed.
3. **Run the Keeper alone, before any break**, with the project's own test runner. It has to pass. A Keeper that fails or cannot be run on the default branch proves nothing, so the outcome is `needs-info`.
4. **Make the break** the `Break` line states, in the owning code, in the scratch copy only. Run the Keeper alone again and keep the command and what it printed.
5. **Read the result.** Red counts only when the Keeper fails on its own assertion. A syntax error or an import error caused by the break is not a red: repair the break and run again. Green means the Keeper does not catch the break. Once you have the result, remove the scratch copy, with the path from step 2:

   ```bash
   git worktree remove --force "$scratch"
   ```
6. **With no shell**, ask the person to run the commands of steps 2 to 4, then remove the scratch copy, and paste what they print, opening with the waiting line. A Keeper is never called proven from reading alone.
7. **Green: `wontfix`, no record.** The finding was wrong, which is not a rejected idea, so nothing is written to `.out-of-scope/`. After the person's word (step 3 of `SKILL.md`), the comment holds the break made, the Keeper command, its green output, and a sentence saying the test on the `Remove` line stays. Close as not planned. `harden` does not run.

   ````markdown
   > *Posted by an AI during triage.*

   **Triage:** `wontfix`.
   **Proof:** with `addNote` joining the text by string in a scratch copy, `npm test -- test/cli.test.ts -t "add keeps a quote in the text"` still passes:

   ```
   ✔ add keeps a quote in the text
   ```

   The Keeper does not catch the break, so `test/add.test.ts::saves a quoted note` stays.
   ````

8. **Red: `ready-for-agent`.** Follow `### ready-for-agent` in `SKILL.md` with these differences. The harden call is the line `Call the Skill tool with "harden"`, passing the issue number, the `Remove` and `Keeper` lines, the break that was made, and the Keeper's red output, named as the proof that the break was run. There is no reproduction command, so the bug-only parts of its step 2 do not apply. Read the body again after harden and confirm the criterion carries the plain mark naming the Keeper and the Test scenarios section is the `Test expectation: none` line. The comment carries the proof where a bug's carries the reproduction:

   ````markdown
   > *Posted by an AI during triage.*

   **Triage:** `ready-for-agent`, `size:S`.
   **Established:** `test/cli.test.ts::add keeps a quote in the text` runs `notes add` end to end, so it owns the quote handling.
   **Proof:** with `addNote` joining the text by string in a scratch copy, `npm test -- test/cli.test.ts -t "add keeps a quote in the text"` fails:

   ```
   ✖ add keeps a quote in the text
     AssertionError: expected "it's late" but the saved note was "it"
   ```

   Build it with `/build 42`.
   ````
