import os
import requests
from dotenv import load_dotenv

load_dotenv()

MARKETCHECK_API_KEY = os.getenv("MARKETCHECK_API_KEY")

USD_TO_INR = 88.0

BASE_URL = "https://api.marketcheck.com/v2/search/car/active"


def get_market_price(vehicle: dict):
    """
    Fetch fair market price using MarketCheck API.
    Returns clean normalized pricing in INR.
    """

    print("Vehicle received for pricing:", vehicle)

    if not vehicle:
        return None

    make = vehicle.get("make")
    model = vehicle.get("model")
    year = vehicle.get("year")

    if not make or not model or not year:
        print("Missing make/model/year")
        return None

    params = {
        "api_key": MARKETCHECK_API_KEY,
        "make": make,
        "model": model,
        "year": year,
        "rows": 50,
        "stats": "price"
    }

    try:

        response = requests.get(BASE_URL, params=params, timeout=20)

        print("MarketCheck status:", response.status_code)

        if response.status_code != 200:
            print("MarketCheck error:", response.text)
            return None

        data = response.json()

        # --------------------------------
        # METHOD 1 — USE STATS (BEST METHOD)
        # --------------------------------

        stats = data.get("stats", {}).get("price", {})

        if stats:

            mean_usd = stats.get("mean")
            min_usd = stats.get("min")
            max_usd = stats.get("max")

            if mean_usd and min_usd and max_usd:

                result = {
                    "fair_market_value": int(mean_usd * USD_TO_INR),
                    "price_range_low": int(min_usd * USD_TO_INR),
                    "price_range_high": int(max_usd * USD_TO_INR),
                    "currency": "INR",
                    "listing_count": data.get("num_found", 0)
                }

                print("Market price result (stats method):", result)

                return result

        # --------------------------------
        # METHOD 2 — FALLBACK TO LISTINGS
        # --------------------------------

        listings = data.get("listings", [])

        print("Listings found:", len(listings))

        prices_usd = [
            listing.get("price")
            for listing in listings
            if listing.get("price")
        ]

        if not prices_usd:
            print("No price data available")
            return None

        avg_usd = sum(prices_usd) / len(prices_usd)

        result = {
            "fair_market_value": int(avg_usd * USD_TO_INR),
            "price_range_low": int(min(prices_usd) * USD_TO_INR),
            "price_range_high": int(max(prices_usd) * USD_TO_INR),
            "currency": "INR",
            "listing_count": len(prices_usd)
        }

        print("Market price result (listing method):", result)

        return result

    except Exception as e:

        print("MarketCheck exception:", str(e))

        return None