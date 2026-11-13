from datetime import date


def apply_coupon(subtotal: int, coupon: dict, today: date) -> int:
    """Return the subtotal after the coupon's percentage off, or unchanged when it has expired."""
    if today > coupon["expires"]:
        return subtotal
    return subtotal - subtotal * coupon["percent_off"] // 100
