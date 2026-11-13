import datetime

from shop.coupon import apply_coupon


def test_an_expired_coupon_leaves_the_subtotal_unchanged():
    today = datetime.date(2026, 6, 10)
    coupon = {"percent": 10, "expires": today - datetime.timedelta(days=1)}
    assert apply_coupon(100, coupon, today) == 100
