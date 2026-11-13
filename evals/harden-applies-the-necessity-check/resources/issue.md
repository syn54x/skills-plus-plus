# Issue 12: A coupon applies only from its minimum spend

## Parent

None. This is a One-off.

## Problem

`cart_total` takes a coupon off even when the cart is small. A coupon has a `minimum_spend`: when the items sum to less than that, `cart_total` must ignore the coupon and return the plain sum.

## Test scenarios the plan proposed

The percent cases are to be tested through `cart_total`.

1. An expired coupon leaves the total unchanged.
2. A 10 percent coupon on a cart of 100 gives 90.
3. A 25 percent coupon on a cart of 80 gives 60.
4. A 50 percent coupon on a cart of 60 gives 30.
5. A 10 percent coupon with a minimum spend of 50 on a cart of 40 gives 40.

## Verify

```bash
python -m pytest tests
```
