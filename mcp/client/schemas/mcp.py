from typing import List, Any, Dict
import uuid
from datetime import datetime

from pydantic import BaseModel, Field

class MessageHistory(BaseModel):
    sender: str
    text: str
    timestamp: str

class MCPTool(BaseModel):
    name: str
    description: str
    input_schema: Dict[str, Any]

class MCPServer(BaseModel):
    server_name: str
    server_description: str
    server_tools: List[MCPTool]

class MCPAccess(BaseModel):
    sender: str
    room_id: str
    text: str = Field(default="Hello, user!")
    history: List[MessageHistory]
    mentioned_agent: str


class MCPToolCall(BaseModel):
    tool_name: str
    mcp_server: str
    args: Dict[str, Any]
    room_id: str

class MCPApproval(BaseModel):
    conversation: List[Dict[str, Any]]
    tools_called: List[MCPToolCall]

class MCPResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender: str
    text: str
    summarization: str = ""
    timestamp: str = Field(default_factory=lambda: str(datetime.now()))
    tools_called: List[MCPToolCall] = Field(default_factory=list)
    is_tool_call: bool = Field(default=False)
    conversation: List[Dict[str, Any]] = Field(default_factory=list)
