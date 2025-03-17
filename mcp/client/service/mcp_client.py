import dotenv
from contextlib import AsyncExitStack
import os

dotenv.load_dotenv()
from loguru import logger
from ollama import Client
from mcp import ClientSession, StdioServerParameters
from mcp.types import Tool as mcp_tool
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
        self.ollama_model = os.getenv("OLLAMA_MODEL", "")


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

    def convert_mcp_tool_desc_to_ollama_tool(self, tool: mcp_tool) -> dict:
        ollama_tool = {
            "type": "function",
            "function": {
                "name": tool.name,
                "description": tool.description,
                "parameters": 
                    {
                        "type": "object",
                        "properties": tool.inputSchema["properties"],
                        "required": tool.inputSchema["required"]
                    }
            }
        }
        return ollama_tool

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

        tools = await server.list_tools()
        tools = tools.tools
        logger.info(f"Tools: {tools}")
        ollama_tools = [self.convert_mcp_tool_desc_to_ollama_tool(tool) for tool in tools]
        logger.info(f"Ollama tools: {ollama_tools}")


        llm_response = self.ollama_client.chat(
            model=self.ollama_model,
            messages=conversions,
            tools=ollama_tools,
        )
        
        tool_calls = llm_response.message.tool_calls
        if tool_calls is None:
            tool_calls = []
        tools_called = [tool_call.function.name for tool_call in tool_calls]
        logger.info(f"Tools called: {tools_called}")
        response = MCPResponse(
            sender=access.mentioned_agent,
            text=f"<tools>{tools_called}</tools>",
        )
        return response

    async def call_tool(
        self, 
        tool_name: str, 
        tool_args: dict,
        server: str
    ):
        pass

    async def cleanup(self):
        for server in self.servers:
            await self.exit_stack[server].aclose()