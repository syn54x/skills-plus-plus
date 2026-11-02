# UI prototype

Several structurally different versions of one screen, shown on a single route and switched with a floating bar. The person flips between them, then keeps one or takes pieces from each. It suits questions about layout, hierarchy and which control leads.

For a question about behaviour or state, use [`LOGIC.md`](LOGIC.md).

## Host the variants in the real page

A variant judged alone always looks fine. Judged among the real header, navigation, data and density, it shows its faults. So host the variants where the screen would live:

| Case | Where the variants go |
| --- | --- |
| The page exists, or the screen would be a section, card or step inside an existing page | On that route, below its existing data loading. Only the rendered part changes per variant. |
| Nothing nearby could hold the screen (a new top-level surface) | A new route that follows the project's routing convention and has `prototype` in its path. |

Before choosing the second row, look for a page that could hold the screen; an empty route hides problems a full one would show.

## Plan, then draw

Default to three variants and stop at five, since more than that blurs together. Write the plan as one line in the file that hosts them:

> Four variants of the invoice list, on the existing `/invoices` route, picked with `?variant=`.

Variants must differ in structure: layout, information hierarchy, the primary control. Three card grids with different colours are one idea shown three times. When two drafts come out alike, redraw one with a stated ban on the shared structure ("no card grid").

Give each variant its own exported component, `VariantA`, `VariantB`, and so on, built with the project's own component library and styling. Share small parts (a header) and never the layout, since the layout is what varies. Variants read data and never write it; where one needs to change something, point it at a stub.

Done when each pair of variants differs in its layout or its primary control, and each renders the real data.

## Wire the switcher

Read `variant` from the URL's search params, default to `A`, and render the matching component. Put a single shared switcher component on the route:

- A bar fixed to the bottom centre with previous and next arrows and the current key and name, such as `B (Sidebar layout)`. Both arrows wrap.
- An arrow click updates the search param through the project's router, so the choice survives a reload and can be shared.
- Left and right arrow keys do the same, except while an input, textarea or editable element has focus.
- Styled to look unlike the page under test, so nobody takes it for part of the design.
- Rendered only outside production, checked with whatever the project uses for that, so a stray merge cannot put the bar in front of users.

Done when the URL with `?variant=B` opens variant B after a reload, and the bar is absent from a production build.

## After the verdict

The winner is folded into the real page on the real branch, rewritten to the project's standards: it was written without tests or error handling. The other variants and the switcher stay on the throwaway branch as the record of what was tried, and are not carried across.

## What to leave out

- Variants that restyle one layout.
- A shared layout component, which defeats the comparison.
- Real mutations behind any variant.
- Promoting prototype code as it stands.
