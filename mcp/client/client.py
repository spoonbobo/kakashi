from contextlib import asynccontextmanager
from dotenv import load_dotenv
import json
import os
load_dotenv()

import uvicorn
from fastapi import FastAPI
from loguru import logger

from api.mcp.routes import router as mcp_router
from service.mcp_client import MCPClientManager
from service.bypasser import Bypasser

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting MCP client")
    mcp_servers = json.load(open(os.getenv("MCP_SERVERS_JSON", ""))) or {}
    mcp_servers = mcp_servers["mcpServers"]
    bypasser = Bypasser(mcp_servers)

    mcp_client_manager = MCPClientManager(mcp_servers, bypasser)
    await mcp_client_manager.connect_to_servers()

    # Log network information for debugging
    # hostname = socket.gethostname()
    # local_ip = socket.gethostbyname(hostname)
    # logger.info(f"Server hostname: {hostname}")
    # logger.info(f"Server local IP: {local_ip}")

    logger.info("Connected to MCP client")

    app.state.mcp_client_manager = mcp_client_manager
    yield

app = FastAPI(lifespan=lifespan)
app.include_router(mcp_router)

if __name__ == "__main__":
    # Add hostname and port info to the log
    logger.info(f"Starting server at http://0.0.0.0:34430")
    uvicorn.run(
        "client:app",
        host="0.0.0.0",
        port=34430,
        reload=True,
    )
