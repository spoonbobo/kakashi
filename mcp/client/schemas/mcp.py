from typing import List

from pydantic import BaseModel, Field

class MCPAccess(BaseModel):
    room_id: str
    query: str = Field(default="Hello, user!")
    history: List[str]
