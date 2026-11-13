from shop.coupon import apply_coupon


def cart_total(items, coupon, today):
    subtotal = sum(item["price"] * item["quantity"] for item in items)
    return apply_coupon(subtotal, coupon, today)
