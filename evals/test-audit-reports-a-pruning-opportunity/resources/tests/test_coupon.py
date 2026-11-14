from datetime import date

from shop.coupon import apply_coupon


def test_an_expired_coupon_gives_no_discount():
    coupon = {"percent_off": 10, "expires": date(2026, 10, 31)}
    assert apply_coupon(2950, coupon, date(2026, 11, 1)) == 2950
