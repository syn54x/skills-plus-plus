from shop.coupon import apply_coupon


def cart_total(items, coupon):
    """Sum the item prices in cents, then apply the coupon."""
    return apply_coupon(sum(items), coupon)
