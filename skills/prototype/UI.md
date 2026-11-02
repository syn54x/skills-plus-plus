# UI prototype

UI variants put several answers to one layout question in front of a person at once, on a single route, so they can compare by switching. They suit questions about arrangement and emphasis. Behaviour questions belong in [`LOGIC.md`](LOGIC.md).

Running example: how should one Sub-issue row on the epic board arrange its state chip, its latest note and its worker?

## Put the variants in a populated page

A variant looks acceptable alone and fails among real neighbours, so mount the variants in a page that already has its navigation, data and density.

- If the screen would live inside an existing page (the board, here), render the variants there, below the page's own data loading. Only the part that differs changes per variant.
- Create a new route only when nothing could host the screen. Follow the project's routing convention and put `prototype` in the path.

Before taking the second option, name the page you considered and why it cannot hold the screen.

## Draw variants that disagree

Write the plan in one line where the variants live, for example: "Three layouts for a board row, selected with `?variant=`."

Use three variants by default and never more than five. Each one is its own component (`RowTable`, `RowTimeline`, `RowStack`) that reads the same data.

The test for "different enough": hide each variant's name and look only at how it arranges things. If two cannot be told apart, they are one idea; discard one and draw a new one that deliberately breaks the first's arrangement. For the example, a dense table, a vertical timeline of notes and a stacked card per worker are three ideas, while a table in three colour schemes is one.

Share small helpers freely and never the layout. Variants only read data. Where a variant needs something to change, wire it to a stub.

Done when the variants differ in arrangement or in what they lead with, and every one renders live data.

## Add the switcher

One shared component, mounted once on the route:

- Render it only outside production, using whatever check the project already has, so a forgotten merge cannot show it to users.
- Keep the active variant in the URL's `variant` search param, set through the project's router, so reloads and shared links land on the same variant. Default to the first.
- Show previous and next controls (both wrap) and the active variant's name, in a bar fixed at the bottom of the viewport.
- Also bind the left and right arrow keys, except while a text field or editable element has focus.
- Style the bar so it cannot be mistaken for the design under test.

Done when `?variant=<second>` survives a reload and a production build has no bar.

## After the verdict

Fold the winning variant into the real component on the real branch, rewritten to the project's standards because the draft had no tests or error handling. Losing variants and the switcher stay on the throwaway branch as the record of what was weighed. Do not copy prototype code across as it stands.
