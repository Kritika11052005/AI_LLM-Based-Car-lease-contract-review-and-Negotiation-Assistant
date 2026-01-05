import os
from fastapi import APIRouter, UploadFile, File
from prisma import Prisma
from app.core.config import UPLOAD_DIR

router = APIRouter()
db = Prisma()

os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload-contract")
async def upload_contract(file: UploadFile = File(...)):
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
