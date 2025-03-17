import dotenv
from contextlib import AsyncExitStack
import os

dotenv.load_dotenv()
from loguru import logger
from ollama import Client
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from schemas.mcp import MCPAccess, MCPResponse
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

            server_params = StdioServerParameters(
                command=command,
                args=[server_script_path],
                env=None
            )
            stdio_transport = await self.exit_stack[server].enter_async_context(stdio_client(server_params))
            self.stdio, self.write = stdio_transport
            self.servers[server] = await self.exit_stack[server].enter_async_context(ClientSession(self.stdio, self.write))
            
            await self.servers[server].initialize()

            response = await self.servers[server].list_tools()
            tools = response.tools
            logger.info(f"Connected to server {server} with tools: {tools}")

    async def respond(
        self, 
        access: MCPAccess, 
    ) -> MCPResponse:
        byp_mcp_server = await self.bypasser.bypass(access.text)
        server = self.servers[byp_mcp_server]

        messages = access.history
        query = access.text.replace("@agent", "")
        conversions = [
            {
                "role": "assistant" if msg.sender == access.mentioned_agent else "user",
                "content": msg.text,
            }
            for msg in messages
        ]

        conversions.append({
            "role": "user",
            "content": query,
        })

        response = MCPResponse(
            sender=access.mentioned_agent,
            text=access.text,
        )
        return response

    async def cleanup(self):
        for server in self.servers:
            await self.exit_stack[server].aclose()