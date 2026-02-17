from fastapi import APIRouter
from sqlalchemy import text
from app.database import SessionLocal
from app.services.market_price_service import get_market_price
from app.services.llm_fairness_service import calculate_llm_fairness_score
import json

router = APIRouter(prefix="/contract", tags=["Contract"])


@router.get("")
def get_contract(contract_id: int):

    db = SessionLocal()

    try:

        result = db.execute(
            text("""
                SELECT analysis
                FROM contract_analysis
                WHERE id = :id
            """),
            {"id": contract_id}
        ).fetchone()

        if not result:
            return {}

        analysis = result[0]

        if isinstance(analysis, str):
            analysis = json.loads(analysis)

        vehicle = analysis.get("vehicle")
        sla = analysis.get("sla")
        market_price = analysis.get("market_price")
        fairness = analysis.get("fairness")

        updated = False

        # Fetch market price if missing
        if vehicle and not market_price:

            print("Fetching market price")

            market_price = get_market_price(vehicle)

            if market_price:
                analysis["market_price"] = market_price
                updated = True

        # ALWAYS generate fairness if missing
        if vehicle and sla and market_price and not fairness:

            print("Generating fairness score...")

            fairness = calculate_llm_fairness_score(
                sla=sla,
                market_price=market_price,
                vehicle=vehicle
            )

            if fairness:

                analysis["fairness"] = fairness
                updated = True

                print("Fairness saved")

            else:

                print("Fairness generation returned None")

        # Save to DB
        if updated:

            db.execute(
                text("""
                    UPDATE contract_analysis
                    SET analysis = :analysis
                    WHERE id = :id
                """),
                {
                    "analysis": json.dumps(analysis),
                    "id": contract_id
                }
            )

            db.commit()

        return {
            "sla": analysis.get("sla"),
            "vehicle": analysis.get("vehicle"),
            "market_price": analysis.get("market_price"),
            "fairness": analysis.get("fairness")
        }

    finally:

        db.close()