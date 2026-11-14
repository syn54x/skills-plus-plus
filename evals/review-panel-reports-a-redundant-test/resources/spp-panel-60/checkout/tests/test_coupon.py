from shop.coupon import apply_coupon


def test_apply_coupon_under_the_minimum_returns_the_subtotal():
    coupon = {"minimum": 5000, "percent": 10}
    assert apply_coupon(3500, coupon) == 3500
