import datetime

from shop.cart import cart_total


def test_an_expired_coupon_leaves_the_total_unchanged():
    today = datetime.date(2026, 6, 10)
    coupon = {"percent": 10, "expires": today - datetime.timedelta(days=1)}
    assert cart_total([60, 40], coupon, today) == 100
