def clamp(score):
    if score is None:
        return 0
    return max(0, min(100, round(score, 1)))


def calculate_price_score(contract_price, market_price):

    if not contract_price or not market_price:
        return 50

    percent_diff = ((contract_price - market_price) / market_price) * 100

    if percent_diff > 0:
        score = 100 - (percent_diff * 3)
    else:
        score = 100 + (abs(percent_diff) * 0.5)

    return clamp(score)


def calculate_apr_score(apr):
    if apr is None:
        return 70

    score = 100

    if apr > 10:
        score -= (apr - 10) * 15
    elif apr > 8:
        score -= (apr - 8) * 10
    elif apr > 6:
        score -= (apr - 6) * 5

    return clamp(score)


def calculate_fees_score(fees):
    if fees is None:
        return 90

    if fees > 2000:
        return 70
    elif fees > 1000:
        return 80
    else:
        return 90


def calculate_term_score(term):
    if term is None:
        return 70

    if term < 12:
        return 70
    elif term > 72:
        return 75
    elif term >= 60:
        return 90
    else:
        return 100


def calculate_fairness_score(sla, market_price, vehicle=None, dealer_price=None):

    contract_price = (
        dealer_price
        or sla.get("purchase_option")
        or sla.get("residual_value")
        or sla.get("monthly_payment")
    )

    market_avg = market_price.get("fair_market_value")

    price_score = calculate_price_score(contract_price, market_avg)
    apr_score = calculate_apr_score(sla.get("apr"))
    fees_score = calculate_fees_score(sla.get("late_fees"))
    term_score = calculate_term_score(sla.get("lease_term_months"))

    final_score = (
        price_score * 0.40 +
        apr_score * 0.25 +
        fees_score * 0.15 +
        term_score * 0.20
    )

    final_score = clamp(final_score)

    return {
        "fairness_score": final_score,
        "rating": "Excellent Deal" if final_score >= 85
        else "Good Deal" if final_score >= 70
        else "Average Deal" if final_score >= 50
        else "Poor Deal",
        "negotiation_power": "Low" if final_score >= 85
        else "Moderate" if final_score >= 70
        else "Strong",
        "score_breakdown": {
            "price_score": price_score,
            "apr_score": apr_score,
            "fees_score": fees_score,
            "term_score": term_score
        }
    }