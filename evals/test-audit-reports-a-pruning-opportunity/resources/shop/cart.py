from datetime import date

from shop.coupon import apply_coupon


def cart_total(items: list[dict], coupon: dict, today: date) -> int:
    """Sum the items' prices in cents, then apply the coupon."""
    subtotal = sum(item["price"] * item["quantity"] for item in items)
    return apply_coupon(subtotal, coupon, today)
