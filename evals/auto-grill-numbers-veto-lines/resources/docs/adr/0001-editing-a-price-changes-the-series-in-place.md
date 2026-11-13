# Editing a price changes the Series in place

Status: accepted

When a person edits a Series' expected price, the Series row is updated with the new price. Membership is recomputed from the new price, so charges outside 20% of it leave the Series.

We chose this because it keeps one row per subscription and needs no history table.
