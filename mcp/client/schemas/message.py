from datetime import datetime
import uuid

from pydantic import BaseModel, Field

class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender: str
    text: str
    timestamp: str = Field(default_factory=lambda: str(datetime.now()))
