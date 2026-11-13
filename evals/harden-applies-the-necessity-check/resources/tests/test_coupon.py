from shop.coupon import apply_coupon


def test_a_percent_coupon_takes_its_share_off():
    coupon = {"percent": 10, "expires": "2026-12-31"}
    assert apply_coupon(100, coupon, "2026-02-01") == 90
