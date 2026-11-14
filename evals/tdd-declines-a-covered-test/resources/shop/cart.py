from datetime import date

from shop.coupon import apply_coupon


def cart_total(items: list[dict], coupon: dict | None, today: date) -> float:
    """What the customer pays: the items' prices times their quantities, less any coupon."""
    subtotal = sum(item["price"] * item["qty"] for item in items)
    if coupon is None:
        return subtotal
    return apply_coupon(subtotal, coupon, today)
