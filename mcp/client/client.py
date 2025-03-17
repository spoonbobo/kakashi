from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os
# flake8: noqa
load_dotenv()

import uvicorn
import requests
from fastapi import FastAPI
from loguru import logger

from service.app_client import AppClient
from api.mcp.routes import router as mcp_router
from service.bypasser import Bypasser

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting MCP client")
    byp = Bypasser()

    logger.info("Connected to MCP client")

    app.state.bypasser = byp
    yield

app = FastAPI(lifespan=lifespan)
app.include_router(mcp_router)


if __name__ == "__main__":
    uvicorn.run(
        "client:app",
        host="0.0.0.0",
        port=34430,
        reload=True,
    )
