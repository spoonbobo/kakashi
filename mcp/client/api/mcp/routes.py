from typing import List

from pydantic import BaseModel
from fastapi import Request
from fastapi.routing import APIRouter

router = APIRouter()

class MCPAccess(BaseModel):
    room_id: str
    query: str
    history: List[str]

@router.post("/api/app/access")
async def access(request: Request, access: MCPAccess):
    byp_mcp_server = await request.app.state.bypasser.bypass(access)
    return {"byp_mcp_server": byp_mcp_server}
