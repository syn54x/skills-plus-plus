def apply_coupon(subtotal, coupon, today):
    """Take the coupon's percent off the subtotal, unless the coupon has expired."""
    if coupon["expires"] < today:
        return subtotal
    return subtotal - subtotal * coupon["percent"] // 100
