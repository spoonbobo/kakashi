import socketio
import os
from loguru import logger

class AppClient:
    """
    Access to any chatrooms.

    """
    def __init__(self):
        self.sio = socketio.AsyncClient(logger=True, engineio_logger=True)
        
        @self.sio.event
        async def connect():
            logger.info("Socket.IO connected successfully")
            
        @self.sio.event
        async def connect_error(data):
            logger.error(f"Socket.IO connection error: {data}")
            
        @self.sio.event
        async def disconnect():
            logger.info("Socket.IO disconnected")

    async def connect(
        self,
        url: str,
        auth: dict,
    ):
        if self.sio.connected:
            await self.sio.disconnect()

        logger.info(f"Connecting to {url} with auth: {auth}")
        
        try:
            await self.sio.connect(url, auth=auth, wait_timeout=10)
            logger.info(f"Connected to {url}")
        except Exception as e:
            logger.error(f"Connection error: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())

    async def disconnect(self):
        await self.sio.disconnect()

    async def send_message(self, message: str):
        await self.sio.emit("message", message)
