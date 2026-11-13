import datetime

from shop.coupon import apply_coupon


def test_a_percent_coupon_takes_its_share_off():
    today = datetime.date(2026, 6, 10)
    coupon = {"percent": 10, "expires": today + datetime.timedelta(days=1)}
    assert apply_coupon(100, coupon, today) == 90
