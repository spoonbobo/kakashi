import os
import asyncio
import uuid
from datetime import datetime

from fastapi import Request
from fastapi.routing import APIRouter
from loguru import logger

from schemas.mcp import MCPAccess
from service.app_client import AppClient

router = APIRouter()

@router.post("/api/app/access")
async def access(request: Request, access: MCPAccess):
    logger.info(f"Accessing MCP server: {access}")
    agent_user = os.getenv("AGENTUSER")

    app_client = AppClient(access)
    await app_client.disconnect()
    await app_client.connect()

    mcp_response = await request.app.state.mcp_client_manager.respond(access)
    
    logger.info(mcp_response)
    
    logger.info(f"Sending test message: {mcp_response}")
    message_delivered = await app_client.send_message_with_retry(
        mcp_response, 
        max_retries=3,
        initial_timeout=5.0
    )
    
    if message_delivered:
        logger.info("Message delivery confirmed")
    else:
        logger.warning("Message delivery failed or timed out")
    
    await app_client.disconnect()
    return "ok"


