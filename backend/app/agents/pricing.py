"""USD per 1M tokens (Gemini API paid tier, standard, as of Oct 2026). Unknown models cost 0."""

from decimal import Decimal

_PRICES: dict[str, tuple[Decimal, Decimal]] = {
    "gemini-3.8-flash": (Decimal("0.75"), Decimal("3.75")),
    "gemini-3.5-flash-lite": (Decimal("0.30"), Decimal("2.50")),
}
_MILLION = Decimal(1_000_000)


def cost_usd(model: str, input_tokens: int, output_tokens: int) -> Decimal:
    price_in, price_out = _PRICES.get(model, (Decimal(0), Decimal(0)))
    return (input_tokens * price_in + output_tokens * price_out) / _MILLION
