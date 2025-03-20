import dotenv
from contextlib import AsyncExitStack
from typing import List
import os

dotenv.load_dotenv()
from loguru import logger
from ollama import Client
from mcp import ClientSession, StdioServerParameters
from mcp.types import Tool as mcp_tool
from mcp.client.stdio import stdio_client


from schemas.mcp import MCPAccess, MCPResponse, MCPToolCall
from service.bypasser import Bypasser

class MCPClientManager:
    """
    A MCP client manager that contains connections to mcp servers
    """
    def __init__(self, servers: dict, bypasser: Bypasser):
        self.servers = servers
        self.bypasser = bypasser
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
        messages = access.history
        query = access.text.replace("@agent", "")
        query = [{"role": "user", "content": query}]
        conversions = [
            {
                "role": "assistant" if msg.sender == access.mentioned_agent else "user",
                "content": msg.text,
            }
            for msg in messages
        ]

        byp_mcp_server = await self.bypasser.bypass(conversions, query[0]["content"])
        server = self.servers[byp_mcp_server]

        tools = await server.list_tools()
        tools = tools.tools
        logger.info(f"Tools: {tools}")
        ollama_tools = [self.convert_mcp_tool_desc_to_ollama_tool(tool) for tool in tools]
        descriptions = [tool["function"]["description"] for tool in ollama_tools]
        logger.info(f"Ollama tools: {ollama_tools}")


        llm_response = self.ollama_client.chat(
            model=self.ollama_model,
            messages=conversions + query,
            tools=ollama_tools,
        )
        
        tool_calls = llm_response.message.tool_calls
        if tool_calls is None:
            tool_calls = []

        tools_called = [
            {
                "tool_name": tool_call.function.name,
                "args": tool_call.function.arguments,
                "mcp_server": byp_mcp_server,
                "room_id": access.room_id,
            }
            for tool_call in tool_calls
        ]
        
        summarize_query = {
            "role": "user",
            "content": f"""
            Give a brief goal statement of how you (agent) will use the tools {tools_called} to achieve the goal of the query {query}.
            (description: {descriptions})
            
            Example response template:
            "Use... to .... "
            """
        }
        
        summarization = self.ollama_client.chat(
            model=self.ollama_model,
            messages=conversions + [summarize_query],
        )

        logger.info(f"Tools called: {tools_called}")
        response = MCPResponse(
            sender=access.mentioned_agent,
            text=",".join(descriptions),
            summarization=summarization.message.content, # type: ignore
            is_tool_call=True,
            tools_called=[MCPToolCall(**tool_call) for tool_call in tools_called]
        )
        return response

    async def call_tool(
        self, 
        approval: List[MCPToolCall]
    ) -> MCPResponse:
        results = []
        for tool_call in approval:
            session = self.servers[tool_call.mcp_server]
            tool_response = await session.call_tool(tool_call.tool_name, tool_call.args)
            results.append(tool_response.content[0].text)
        
        logger.info(f"Reuslts: {results}")

        query = {
            "role": "user",
            "content": f"Summarize this piece of text: {results}. Keep your response concise and to the point."
        }
        
        summarization = self.ollama_client.chat(
            model=self.ollama_model,
            messages=[query],
        )

        return MCPResponse(
            sender="agent",
            text=summarization.message.content, # type: ignore
            is_tool_call=False,
        )

    async def cleanup(self):
        for server in self.servers:
            await self.exit_stack[server].aclose()