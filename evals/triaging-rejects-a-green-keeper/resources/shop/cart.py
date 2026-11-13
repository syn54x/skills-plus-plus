from shop.coupon import apply_coupon


def cart_total(items, coupon, today):
    return apply_coupon(sum(items), coupon, today)
