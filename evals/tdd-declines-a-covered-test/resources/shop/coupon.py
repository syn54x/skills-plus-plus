from datetime import date


def apply_coupon(subtotal: float, coupon: dict, today: date) -> float:
    """The subtotal after the coupon's discount. An expired coupon gives no discount."""
    if today > coupon["expires"]:
        return subtotal
    return round(subtotal * (100 - coupon["percent_off"]) / 100, 2)
