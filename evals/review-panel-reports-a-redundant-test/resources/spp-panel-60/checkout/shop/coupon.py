def apply_coupon(subtotal, coupon):
    """Return the subtotal after the coupon's percent off, or unchanged under its minimum."""
    if subtotal < coupon["minimum"]:
        return subtotal
    return subtotal - subtotal * coupon["percent"] // 100
