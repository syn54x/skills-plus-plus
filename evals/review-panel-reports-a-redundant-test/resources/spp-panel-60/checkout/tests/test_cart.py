from shop.cart import cart_total


def test_a_coupon_over_its_minimum_takes_its_percent_off():
    coupon = {"minimum": 5000, "percent": 10}
    assert cart_total([4000, 3000], coupon) == 6300


def test_a_coupon_under_its_minimum_leaves_the_total_unchanged():
    coupon = {"minimum": 5000, "percent": 10}
    assert cart_total([2000, 1500], coupon) == 3500
