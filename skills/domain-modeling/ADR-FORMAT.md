# ADR format

How to write an ADR once a decision has three yes answers in `SKILL.md`.

## File

One decision per file in the repo's ADR directory. Take the highest number already there, add one, pad it to four digits, and add a short lowercase slug: `0012-price-rides-at-booking.md`. Where the directory already uses another pattern, follow it.

## Body

A title that states the decision, and one paragraph:

```markdown
# Rides are priced at booking, not at drop-off

A rider sees and accepts the fare before the car is dispatched, and the fare is fixed from then on. Pricing at drop-off matched the distance actually driven, but riders disputed fares they had not seen, and refunds cost more than the occasional detour.
```

The paragraph names the pressure, the choice and the losing option with the reason it lost. Most ADRs need nothing else.

Add more only when it carries something the paragraph cannot:

- a **Status** line (`proposed`, `accepted`, `superseded by 0019`) in a repo that revisits its decisions; a superseded ADR stays and points at its successor;
- **Options considered**, when a losing option is likely to be proposed again;
- **Consequences**, when an effect elsewhere would surprise someone.

## Calibrating

| Decision | ADR? | Why |
| --- | --- | --- |
| Rides are priced at booking | Yes | Costly to undo, odd without the dispute history, and drop-off pricing was a real option |
| Driver payouts run weekly because of the bank's batch window | Yes | The constraint lives outside the code, so the code alone looks arbitrary |
| Dates are formatted with the standard library | No | Cheap to change |
| Passwords are hashed | No | No credible alternative |
| The admin screens use the same component library as the app | No | Nobody would wonder why |
