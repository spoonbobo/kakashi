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
    socket_io_client = AppClient()
    socket_url = os.getenv("SOCKET_URL", "")
    client_url = os.getenv("CLIENT_URL", "")

    
    logger.info(f"Getting auth tokens from {client_url}")
    response = requests.post(
        f"{client_url}/api/auth",
        json={
            "username": os.getenv("AGENTUSER"),
            "password": os.getenv("AGENTPASSWORD"),
        },
    )
    token = response.json()["token"]
    auth = {
        "token": token,
        "roomId": None,
        "isAgent": True,
    }

    await socket_io_client.connect(
        url=socket_url,
        auth=auth,
    )
    logger.info("Connected to MCP client")

    app.state.bypasser = byp
    app.state.socket_io_client = socket_io_client
    yield
    await socket_io_client.disconnect()

app = FastAPI(lifespan=lifespan)
app.include_router(mcp_router)


if __name__ == "__main__":
    uvicorn.run(
        "client:app",
        host="0.0.0.0",
        port=34430,
        reload=True,
    )
