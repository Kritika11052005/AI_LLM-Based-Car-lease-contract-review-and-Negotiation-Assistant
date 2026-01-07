from app.generated.prisma import Prisma

db = Prisma()

async def get_db():
    return db