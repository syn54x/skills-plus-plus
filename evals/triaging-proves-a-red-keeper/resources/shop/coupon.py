def apply_coupon(subtotal, coupon, today):
    if coupon["expires"] < today:
        return subtotal
    return subtotal - subtotal * coupon["percent"] / 100
