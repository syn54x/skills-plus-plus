from shop.cart import cart_total


def test_an_expired_coupon_leaves_the_total_unchanged():
    items = [{"price": 30, "quantity": 2}, {"price": 20, "quantity": 1}]
    coupon = {"percent": 10, "expires": "2026-01-31"}
    assert cart_total(items, coupon, "2026-02-01") == 80
