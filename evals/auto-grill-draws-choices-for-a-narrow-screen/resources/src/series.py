from dataclasses import dataclass


@dataclass
class Series:
    merchant: str
    account: str
    price: float


@dataclass
class Charge:
    merchant: str
    account: str
    amount: float


def belongs(charge: Charge, series: Series) -> bool:
    if (charge.merchant, charge.account) != (series.merchant, series.account):
        return False
    return abs(charge.amount - series.price) <= 0.2 * series.price


def edit_price(series: Series, price: float) -> Series:
    # ADR 0001: edit in place; members are recomputed from the new price.
    series.price = price
    return series
