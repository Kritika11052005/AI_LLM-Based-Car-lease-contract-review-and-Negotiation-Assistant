import os
from dotenv import load_dotenv

load_dotenv()

UPLOAD_DIR = "uploads"

# ── MarketCheck ────────────────────────────────────────────────────────────────
MARKETCHECK_API_KEY    = os.getenv("MARKETCHECK_API_KEY", "")
MARKETCHECK_API_SECRET = os.getenv("MARKETCHECK_API_SECRET", "")
MARKETCHECK_BASE_URL   = "https://api.marketcheck.com/v2"