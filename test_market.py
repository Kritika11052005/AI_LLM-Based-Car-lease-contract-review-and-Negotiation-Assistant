from app.services.market_price_service import get_market_price

vehicle = {
    "make": "Honda",
    "model": "Civic",
    "year": 2018
}

print(get_market_price(vehicle))