from datetime import date

from shop.cart import cart_total


def test_an_expired_coupon_leaves_the_total_unchanged():
    items = [{"price": 12.50, "qty": 2}, {"price": 5.00, "qty": 1}]
    coupon = {"percent_off": 20, "expires": date(2026, 3, 31)}
    # 2 x 12.50 + 5.00, worked by hand; the coupon ended the day before.
    assert cart_total(items, coupon, date(2026, 4, 1)) == 30.00
