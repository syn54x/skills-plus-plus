## Parent

#10

## What to build

A `greet` command that prints a greeting. Quotes like `TBD` in code are not placeholders.

## Acceptance criteria

- [ ] `spp greet` prints `hello`.
- [ ] It exits 0.

## Files owned

- Create: `src/greet.ts`, `src/greet2.ts`
- Modify: `bin/spp`
- Test: `test/greet.test.ts`

## Interfaces

- Consumes: `runGh` from #200.
- Produces: `greet(name: string): string`, used by #13.

## Test scenarios

- Happy path: `spp greet` → prints `hello`.
- Edge case: an empty name
  → prints `hello, world`.
- Error path: a missing argument → exits 2.
- Integration: the router runs it → exit 0.

## Verify

```bash
npm ci
node --test test/greet.test.ts
```

## Blocked by

- #200
