from typing import List
import uuid
from datetime import datetime

from pydantic import BaseModel, Field

class MessageHistory(BaseModel):
    sender: str
    text: str
    timestamp: str

class MCPAccess(BaseModel):
    sender: str
    room_id: str
    text: str = Field(default="Hello, user!")
    history: List[MessageHistory]
    mentioned_agent: str

class MCPResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender: str
    text: str
    summarization: str
    timestamp: str = Field(default_factory=lambda: str(datetime.now()))
    task_type: str
    tools_called: List[dict] = Field(default_factory=list)
    is_tool_call: bool = Field(default=False)
