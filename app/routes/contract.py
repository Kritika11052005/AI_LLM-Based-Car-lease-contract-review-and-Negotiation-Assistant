from fastapi import APIRouter
from sqlalchemy import text
from app.database import SessionLocal

from app.services.market_price_service import get_market_price
from app.services.fairness_score_service import calculate_fairness_score
from app.services.dealer_price_service import extract_dealer_price

import json

router = APIRouter(prefix="/contract", tags=["Contract"])


@router.get("/")
def get_contract(contract_id: int):

    db = SessionLocal()

    try:

        result = db.execute(
            text("""
                SELECT filename, raw_text, analysis
                FROM contract_analysis
                WHERE id = :id
            """),
            {"id": contract_id}
        ).fetchone()

        if not result:
            return {}

        filename, raw_text, analysis = result

        if isinstance(analysis, str):
            analysis = json.loads(analysis)

        updated = False

        # =========================================================
        # DEALER PRICE
        # =========================================================

        dealer_price = analysis.get("dealer_price")

        if not dealer_price and raw_text:
            dealer_price = extract_dealer_price(raw_text)
            if dealer_price:
                analysis["dealer_price"] = dealer_price
                updated = True

        # =========================================================
        # MARKET PRICE
        # =========================================================

        vehicle = analysis.get("vehicle")
        market_price = analysis.get("market_price")

        if vehicle and not market_price:
            market_price = get_market_price(vehicle)
            if market_price:
                analysis["market_price"] = market_price
                updated = True

        # =========================================================
        # FAIRNESS SCORE
        # =========================================================

        sla = analysis.get("sla")
        fairness = analysis.get("fairness")

        if vehicle and sla and market_price and not fairness:
            fairness = calculate_fairness_score(
                sla=sla,
                market_price=market_price,
                vehicle=vehicle,
                dealer_price=analysis.get("dealer_price")
            )
            analysis["fairness"] = fairness
            updated = True

        # =========================================================
        # SAVE IF UPDATED
        # =========================================================

        if updated:
            db.execute(
                text("""
                    UPDATE contract_analysis
                    SET analysis = :analysis
                    WHERE id = :id
                """),
                {"analysis": json.dumps(analysis), "id": contract_id}
            )
            db.commit()

        # =========================================================
        # RETURN FROM FINAL ANALYSIS OBJECT (IMPORTANT FIX)
        # =========================================================

        return {
            "filename": filename,
            "vin": analysis.get("vin"),
            "vehicle": analysis.get("vehicle"),
            "sla": analysis.get("sla"),
            "recalls": analysis.get("recalls"),
            "dealer_price": analysis.get("dealer_price"),
            "market_price": analysis.get("market_price"),
            "fairness": analysis.get("fairness")
        }

    finally:
        db.close()