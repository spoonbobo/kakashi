from pydantic import BaseModel
from fastapi.routing import APIRouter

router = APIRouter()

@router.get("/")
async def root():
    return {"message": "Hello World"}