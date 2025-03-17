import dotenv
from contextlib import AsyncExitStack
import os

dotenv.load_dotenv()
from loguru import logger
from ollama import Client
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from schemas.message import Message
from schemas.mcp import MCPAccess
from service.bypasser import Bypasser

class MCPClientManager:
    """
    A MCP client manager that contains connections to mcp servers
    """
    def __init__(self, servers: dict):
        self.servers = servers["mcpServers"]
        self.bypasser = Bypasser(servers)
        self.exit_stack = {server: AsyncExitStack() for server in self.servers}
        self.ollama_client = Client(host=os.getenv("OLLAMA_API_BASE_URL"))
        self.ollama_model = os.getenv("OLLAMA_MODEL")


    async def connect_to_servers(self) -> None:
        logger.info(f"Connecting to servers: {self.servers}")
        for server, server_info in self.servers.items():
            server_script_path = server_info["path"]
            is_python = server_script_path.endswith('.py')
            is_js = server_script_path.endswith('.js')
            if not (is_python or is_js):
                raise ValueError("Server script must be a .py or .js file")
            command = "python" if is_python else "node"
            logger.info(f"Connecting to server {server} with command {command}")
            logger.info(f"Server script path: {server_script_path}")

            server_params = StdioServerParameters(
                command=command,
                args=[server_script_path],
                env=None
            )
            stdio_transport = await self.exit_stack[server].enter_async_context(stdio_client(server_params))
            self.stdio, self.write = stdio_transport
            self.servers[server] = await self.exit_stack[server].enter_async_context(ClientSession(self.stdio, self.write))
            
            await self.servers[server].initialize()
            logger.info(f"Connected to server {server}")

            response = await self.servers[server].list_tools()
            tools = response.tools
            logger.info(f"Connected to server {server} with tools: {tools}")

    async def respond(
        self, 
        access: MCPAccess, 
    ) -> Message:
        logger.info(f"Responding to MCP access: {access}")
        byp_mcp_server = await self.bypasser.bypass(access.text)
        logger.info(f"Bypassed MCP server: {byp_mcp_server}")
        message = Message(
            sender=access.mentioned_agent,
            text=access.text,
        )
        logger.info(f"Sending message: {message}")
        return message

    async def cleanup(self):
        for server in self.servers:
            await self.exit_stack[server].aclose()