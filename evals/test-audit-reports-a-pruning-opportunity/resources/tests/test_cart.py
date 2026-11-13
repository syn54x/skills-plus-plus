from datetime import date

from shop.cart import cart_total

ITEMS = [{"price": 1200, "quantity": 2}, {"price": 550, "quantity": 1}]


def test_a_valid_coupon_takes_its_percentage_off_the_total():
    coupon = {"percent_off": 10, "expires": date(2026, 12, 31)}
    assert cart_total(ITEMS, coupon, date(2026, 11, 1)) == 2655


def test_an_expired_coupon_leaves_the_total_unchanged():
    coupon = {"percent_off": 10, "expires": date(2026, 10, 31)}
    assert cart_total(ITEMS, coupon, date(2026, 11, 1)) == 2950
