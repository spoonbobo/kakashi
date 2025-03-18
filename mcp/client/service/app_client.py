import os
import asyncio
import traceback
import socketio
import requests
from loguru import logger
from typing import Dict, Any, Optional

from schemas.mcp import MCPAccess, MCPResponse

"""
class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender: str
    text: str
    timestamp: str = Field(default_factory=lambda: str(datetime.now()))

class MCPAccess(BaseModel):
    room_id: str
    query: str
    history: List[str]

"""

class AppClient:
    """Client for connecting to chat rooms and sending messages."""
    
    def __init__(self, room_id: str, token: str):
        self.socket_url = os.getenv("SOCKET_URL", "")
        self.token = token
        self.room_id = room_id
        self.is_agent = True
        
        # Authenticate and get token
        self.auth = {
            "token": self.token,
            "roomId": self.room_id,
            "isAgent": self.is_agent,
        }

        # Initialize socket client
        self.sio = socketio.AsyncClient(logger=True, engineio_logger=True) # type: ignore
        
        # Set up event handlers
        @self.sio.event
        async def connect():
            logger.info("Socket.IO connected successfully")
            
        @self.sio.event
        async def connect_error(data):
            logger.error(f"Socket.IO connection error: {data}")
            
        @self.sio.event
        async def disconnect():
            logger.info("Socket.IO disconnected")

    async def connect(self):
        """Connect to the socket server."""
        if self.sio.connected:
            await self.sio.disconnect()

        logger.info(f"Connecting to {self.socket_url} with auth: {self.auth}")
        
        try:
            await self.sio.connect(self.socket_url, auth=self.auth, wait_timeout=10)
            logger.info(f"Connected to {self.socket_url}")
            return True
        except Exception as e:
            logger.error(f"Connection error: {str(e)}")
            logger.error(traceback.format_exc())
            return False

    async def disconnect(self):
        """Disconnect from the socket server."""
        if self.sio.connected:
            await self.sio.disconnect()
            logger.info("Disconnected from server")

    async def send_message(self, response: MCPResponse, wait_for_ack=True, timeout=10.0) -> bool:
        """
        Send a message to the current room.
        
        Args:
            message: Message object to send
            wait_for_ack: Whether to wait for message acknowledgment
            timeout: How long to wait for acknowledgment in seconds
            
        Returns:
            bool: True if message was sent successfully, False otherwise
        """
        message_data = {
            "id": response.id,
            "text": response.text,
            "sender": response.sender,
            "timestamp": response.timestamp
        }
        
        logger.info(f"Sending message to room {self.room_id}: {message_data}")
        
        try:
            ack_received = None
            
            if wait_for_ack:
                ack_received = asyncio.Event()
                
                async def message_ack(data):
                    logger.debug(f"Received ack data: {data}")
                    if data.get('id') == response.id:
                        logger.info(f"Message {response.id} acknowledged")
                        ack_received.set()
                    else:
                        logger.warning(f"Received ack for different message. Expected: {response.id}, Got: {data.get('id')}")
                
                self.sio.on('message_ack', message_ack)
            
            await self.sio.emit("message", response.model_dump(), callback=lambda: ack_received.set() if ack_received else None)
            logger.info("Message sent successfully")
            
            if wait_for_ack and ack_received:
                try:
                    await asyncio.wait_for(ack_received.wait(), timeout=timeout)
                    logger.info("Message delivery confirmed")
                    return True
                except asyncio.TimeoutError:
                    logger.warning(f"Message acknowledgment timed out after {timeout} seconds")
                    return False
                finally:
                    self.sio.handlers.pop('message_ack', None)
            
            return True
        except Exception as e:
            logger.error(f"Error sending message: {str(e)}")
            logger.error(traceback.format_exc())
            return False

    async def send_message_with_retry(self, response: MCPResponse, max_retries=3, initial_timeout=5.0) -> bool:
        """
        Send a message with automatic retries on failure.
        
        Args:
            message: Message to send
            max_retries: Maximum number of retry attempts
            initial_timeout: Initial timeout for first attempt, increases with backoff
            
        Returns:
            bool: True if message was eventually sent successfully, False otherwise
        """
        retry_count = 0
        current_timeout = initial_timeout
        
        while retry_count <= max_retries:
            result = await self.send_message(response, wait_for_ack=True, timeout=current_timeout)
            if result:
                return True
            
            retry_count += 1
            if retry_count > max_retries:
                break
                
            current_timeout *= 1.5  # Exponential backoff
            logger.info(f"Retrying message send (attempt {retry_count}/{max_retries}) with timeout {current_timeout}")
            
        logger.error(f"Failed to send message after {max_retries} attempts")
        return False
