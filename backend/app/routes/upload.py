import os
from fastapi import APIRouter, UploadFile, File, Depends
from app.generated.prisma import Prisma
from app.core.config import UPLOAD_DIR
from app.database import get_db

router = APIRouter()

os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload-contract")
async def upload_contract(file: UploadFile = File(...), db: Prisma = Depends(get_db)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as f:
        f.write(await file.read())

    contract = await db.contract.create(
        data={
            "filename": file.filename
        }
    )

    return {
        "message": "Contract uploaded successfully",
        "contract_id": contract.id,
        "filename": contract.filename
    }