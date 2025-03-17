from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, HTTPException
from loguru import logger

from api.kakashi.routes import router as kakashi_router
from api.mcp_server.routes import router as mcp_server_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(lifespan=lifespan)
app.include_router(kakashi_router)
app.include_router(mcp_server_router)


if __name__ == "__main__":
    uvicorn.run("client:app", host="0.0.0.0", port=34430)
