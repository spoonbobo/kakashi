import socketio
import os
from loguru import logger

class AppClient:
    """
    Access to any chatrooms.

    """
    def __init__(self):
        self.sio = socketio.Client(logger=True, engineio_logger=True)
        
        # Add event handlers for debugging
        @self.sio.event
        def connect():
            logger.info("Socket.IO connected successfully")
            
        @self.sio.event
        def connect_error(data):
            logger.error(f"Socket.IO connection error: {data}")
            
        @self.sio.event
        def disconnect():
            logger.info("Socket.IO disconnected")

    def connect(
        self,
        url: str,
        auth: dict,
    ):
        if self.sio.connected:
            self.sio.disconnect()

        # Log authentication details (be careful with sensitive info)
        logger.info(f"Connecting to {url} with auth: {auth}")
        
        try:
            # Try connecting without specifying namespaces
            self.sio.connect(url, auth=auth, wait_timeout=10)
            logger.info(f"Connected to {url}")
        except Exception as e:
            logger.error(f"Connection error: {str(e)}")
            # Print more detailed error information
            import traceback
            logger.error(traceback.format_exc())

    def disconnect(self):
        self.sio.disconnect()

   