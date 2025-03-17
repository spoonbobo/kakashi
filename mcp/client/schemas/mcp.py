from typing import List

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
