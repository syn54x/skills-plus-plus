# Epic: Coupons have a minimum spend

## Problem

A coupon takes its percent off any cart, however small. Shops want a coupon to apply only when the cart reaches a minimum.

## Implementation Decisions

- `cart_total(items, coupon)` in `shop/cart.py` is the interface callers use. A coupon is a mapping with `minimum` and `percent`, in cents and whole percent.
- `apply_coupon(subtotal, coupon)` in `shop/coupon.py` is called only by `cart_total`.

## Sub-issues

### 1. A coupon under its minimum changes nothing

**Acceptance criteria**

- [ ] A cart whose item total is under the coupon's minimum is charged the item total.

**Files owned**

Modify: `shop/coupon.py`
Modify: `tests/test_cart.py`

**Test scenarios**

- Under the minimum: a cart of 2000 and 1500 cents with a coupon of minimum 5000 and 10 percent gives a total of 3500
