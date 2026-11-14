# Tests beside their repairs

Each section shows a test that breaks one rule in [`SKILL.md`](SKILL.md) and a version that keeps it. The examples use `node:test` and `node:assert`; the shapes carry to any runner.

## Coupled to the implementation

This test spies on a module the project owns:

```ts
test("placeOrder calls reserveStock", async () => {
  const reserve = mock.method(stock, "reserve");
  await placeOrder({ sku: "MUG-01", qty: 2 });
  assert.equal(reserve.mock.callCount(), 1);
});
```

It stays green if the order is then lost, and goes red if reserving moves into another function. Ask what a caller can see, and assert that:

```ts
test("a placed order lowers the stock a later read reports", async () => {
  const shop = openShop({ stock: { "MUG-01": 10 } });
  await shop.placeOrder({ sku: "MUG-01", qty: 2 });
  assert.equal(await shop.stockLevel("MUG-01"), 8);
});
```

Querying the table the order was written to is the same mistake by another route: it ties the test to the storage layout instead of to what the shop promises.

## Tautological

This test copies the formula it is meant to check:

```ts
test("shipping fee", () => {
  const kg = 3;
  assert.equal(shippingFee(kg), BASE_FEE + kg * PER_KG);
});
```

If `BASE_FEE` or the formula is wrong, the test is wrong in the same way and passes. The rate card in the spec says 5.00 plus 1.50 per kilogram, so a 3 kg parcel costs 9.50, worked out by hand:

```ts
test("a 3 kg parcel costs 9.50 to ship", () => {
  assert.equal(shippingFee(3), 9.5);
});
```

## Horizontal slicing

This one shows in the history, not in a single test: a commit adding five tests and no code, or the code landing before any test exists. Write one test, make it pass, and let what that cycle taught pick the next test.

## Redundant

Here the cart's test already owns the expired-coupon case, and a second test replays it one layer down:

```ts
// cart.test.ts
test("an expired coupon leaves the total unchanged", () => {
  const items = [{ price: 12.5, qty: 2 }, { price: 5, qty: 1 }];
  const coupon = { percentOff: 20, expires: new Date("2026-03-31") };
  assert.equal(cartTotal(items, coupon, new Date("2026-04-01")), 30);
});

// coupon.test.ts
test("applyCoupon gives no discount on an expired coupon", () => {
  const coupon = { percentOff: 20, expires: new Date("2026-03-31") };
  assert.equal(applyCoupon(30, coupon, new Date("2026-04-01")), 30);
});
```

Break the expiry check in `applyCoupon` on purpose (flip `>` to `<`) and both tests go red, so the second one adds no evidence. It does add cost: it breaks when `applyCoupon` is renamed or folded into `cartTotal`, though no caller would notice. Delete it, and keep the cart test as its **Keeper**.

When the break leaves the outer test green (say it asserted only that the total is a number), the outer assertion is the problem. Sharpen it to the worked total, 30, run the break again to see it go red, and only then delete the inner test.

Keep a test of `applyCoupon` when one of the four reasons in [`SKILL.md`](SKILL.md) holds, for example when checkout also calls it, which makes it a seam with its own contract.

## Junk patterns

What an audit hunts for, one pattern per line, with how it shows in a test file:

- **Replayed case**: the same inputs and expected value appear in a test of the outer interface and again in a test of a function it calls.
- **Constant**: the assertion compares a named constant or config value with the literal it is set to.
- **Message wording**: the assertion matches the full text of an error, a log line or a label, rather than its kind or code.
- **Framework behaviour**: the test checks what a framework or library already promises (that the router routes, that a schema rejects a type it declares) with none of the project's logic in between.
- **Trivial code**: the test calls a getter, constructor or forwarding function and asserts it hands back what it was given.
- **Nothing a caller can see**: the test asserts only that a mock was called, that a call did not throw, or on a private field, so a real break leaves it green.

## Doubles at the edges

Pass an edge in as an argument rather than reaching for it inside, so a test can hand over a fixed one:

```ts
function isExpired(coupon: Coupon, now: () => Date): boolean {
  return now() > coupon.expiresAt;
}

test("a coupon is expired the day after its end date", () => {
  const coupon = { expiresAt: new Date("2026-03-31T23:59:59Z") };
  assert.equal(isExpired(coupon, () => new Date("2026-04-01T00:00:00Z")), true);
});
```

For a remote service, give each operation its own function (`getRate(sku)`, `chargeCard(amount)`) rather than one generic `request(path, options)`. A double for a named operation returns one shape and never branches on the path, and the test shows which calls it exercises. For a database, a real test instance is better than a double whenever it is cheap to start.
